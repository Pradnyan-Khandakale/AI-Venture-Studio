import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { agentDefinitions } from "../agents/agentDefinitions.js";
import { agentPrompts } from "../prompts/agentPrompts.js";
import { generateText } from "../services/llmService.js";
import { storeReportMemory } from "../services/memoryService.js";
import { calculateStartupScore } from "../services/scoreService.js";
import { searchMarketSignals } from "../services/searchService.js";
import { projectService } from "../services/projectService.js";

// Concurrency guard: track active project executions
const activeRuns = new Set();

/**
 * State annotation for the LangGraph 11-agent pipeline.
 */
export const WorkflowAnnotation = Annotation.Root({
  projectId: Annotation(),
  userId: Annotation(),
  autoMode: Annotation(),
  targetAgentKey: Annotation(),
  lastRunResult: Annotation()
});

/**
 * Executes a single agent stage within a LangGraph node.
 */
async function executeAgentNode(state, agentDef) {
  const { projectId, userId, autoMode, targetAgentKey } = state;
  const project = await projectService.getProjectForUser(projectId, userId);

  if (!project) {
    return { lastRunResult: { failed: true, error: "Project not found" } };
  }

  const runs = project.agentRuns || [];
  const currentRunIndex = runs.findIndex((r) => r.key === agentDef.key);
  const currentRun = runs[currentRunIndex];

  if (!currentRun) {
    return { lastRunResult: { failed: true, error: `Agent run definition not found for ${agentDef.key}` } };
  }

  // If a specific targetAgentKey was requested (e.g., regeneration), only run that agent
  if (targetAgentKey && targetAgentKey !== agentDef.key) {
    return { lastRunResult: { skipped: true } };
  }

  // If agent is already completed and not targeted for re-run, pass through
  if (currentRun.status === "completed" && targetAgentKey !== agentDef.key) {
    return { lastRunResult: { skipped: true } };
  }

  // If previous agent in the pipeline is not approved (and not autoMode), wait for approval
  if (currentRunIndex > 0 && !autoMode && !targetAgentKey) {
    const prevRun = runs[currentRunIndex - 1];
    if (prevRun && (!prevRun.approved || prevRun.status !== "completed")) {
      return {
        lastRunResult: {
          waitingApproval: true,
          prevAgentKey: prevRun.key
        }
      };
    }
  }

  // Mark running
  const startTime = Date.now();
  currentRun.status = "running";
  currentRun.error = null;
  project.status = "running";
  await project.save();

  try {
    // 1. Gather research signals for agents that benefit from live web intelligence
    let searchSignals = "";
    if (["market", "competitor", "opportunity", "gtm"].includes(agentDef.key)) {
      const query = `${project.startupName} ${project.industry} ${agentDef.name}`;
      searchSignals = await searchMarketSignals(query);
    }

    // 2. Gather relevant prior reports context (optimized context window to reduce token usage)
    const agentDependencies = {
      market: [],
      competitor: ["market"],
      opportunity: ["market", "competitor"],
      product: ["market", "opportunity"],
      prd: ["product", "opportunity"],
      architecture: ["prd", "product"],
      revenue: ["product", "market"],
      financial: ["revenue", "architecture"],
      gtm: ["product", "market", "competitor"],
      investor: ["market", "opportunity", "revenue", "financial"],
      pitch: ["opportunity", "product", "revenue", "financial", "investor"]
    };

    const relevantKeys = agentDependencies[agentDef.key] || [];
    const priorReports = {};
    for (const key of relevantKeys) {
      const prior = runs.find((r) => r.key === key);
      if (prior?.report) {
        priorReports[prior.key] = prior.report;
      }
    }

    // 3. Formulate specialized prompt
    const promptFn = agentPrompts[agentDef.key] || agentPrompts.market;
    const prompt = promptFn(project, searchSignals, priorReports);

    // 4. Generate via unified AI provider adapter (Gemini or Ollama)
    const llmResult = await generateText(prompt, { agentKey: agentDef.key });

    const runtimeMs = Date.now() - startTime;
    currentRun.status = "completed";
    currentRun.report = llmResult.text;
    currentRun.runtimeMs = runtimeMs;
    currentRun.tokenUsage = llmResult.tokenUsage || 0;
    currentRun.approved = Boolean(autoMode);
    currentRun.error = null;

    // 5. Persist report memory and vector embeddings
    await storeReportMemory({
      user: userId,
      project: projectId,
      agentKey: agentDef.key,
      outputFile: agentDef.outputFile,
      content: llmResult.text
    });

    // 6. Recalculate startup readiness health score
    project.startupScore = calculateStartupScore(project);

    // 7. Check if all 11 agents are complete
    const allCompleted = runs.every((r) => r.status === "completed");
    if (allCompleted) {
      project.status = "completed";
    }

    await project.save();

    return {
      lastRunResult: {
        key: agentDef.key,
        completed: true,
        runtimeMs
      }
    };
  } catch (error) {
    const runtimeMs = Date.now() - startTime;
    currentRun.status = "failed";
    currentRun.error = error.message;
    currentRun.runtimeMs = runtimeMs;
    project.status = "failed";
    await project.save();

    return {
      lastRunResult: {
        key: agentDef.key,
        failed: true,
        error: error.message,
        runtimeMs
      }
    };
  }
}

/**
 * Builds and compiles the LangGraph StateGraph connecting all 11 agents in sequence.
 */
function createVentureWorkflow() {
  const workflow = new StateGraph(WorkflowAnnotation);

  // Add a node for each agent in agentDefinitions
  for (const agent of agentDefinitions) {
    workflow.addNode(agent.key, (state) => executeAgentNode(state, agent));
  }

  // Connect START to the first agent (market)
  workflow.addEdge(START, agentDefinitions[0].key);

  // Connect each agent to the next with conditional edges
  for (let i = 0; i < agentDefinitions.length; i++) {
    const currentKey = agentDefinitions[i].key;
    const nextKey = i < agentDefinitions.length - 1 ? agentDefinitions[i + 1].key : END;

    workflow.addConditionalEdges(currentKey, (state) => {
      const res = state.lastRunResult;
      // If agent failed or is waiting for human approval, stop immediately
      if (res?.failed || res?.waitingApproval) {
        return END;
      }
      // If in manual mode and an agent just completed, stop for human review
      if (!state.autoMode && res?.completed && !res?.skipped) {
        return END;
      }
      // If single agent was targeted, stop after running it
      if (state.targetAgentKey && res?.key === state.targetAgentKey) {
        return END;
      }
      return nextKey;
    });
  }

  return workflow.compile();
}

// Singleton compiled workflow
const compiledWorkflow = createVentureWorkflow();

/**
 * Orchestrates the AI Venture Engine pipeline for a project.
 * Supports manual mode (runs next pending agent) and autoMode (runs all remaining agents).
 */
export async function runNextAgent(project, user, { autoMode = false, targetAgentKey = null } = {}) {
  const projectId = String(project._id || project.id);
  const userId = String(user?.id || user?._id || user);

  if (activeRuns.has(projectId)) {
    const error = new Error("A workflow execution is already in progress for this venture");
    error.status = 409;
    throw error;
  }

  activeRuns.add(projectId);

  try {
    const initialState = {
      projectId,
      userId,
      autoMode: Boolean(autoMode),
      targetAgentKey: targetAgentKey || null,
      lastRunResult: null
    };

    await compiledWorkflow.invoke(initialState);
    return projectService.getProjectForUser(projectId, userId);
  } finally {
    activeRuns.delete(projectId);
  }
}
