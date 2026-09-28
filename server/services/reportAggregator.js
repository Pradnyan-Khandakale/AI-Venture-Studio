import { agentDefinitions } from "../agents/agentDefinitions.js";
import { projectService } from "./projectService.js";
import { boardroomService } from "./boardroomService.js";
import Report from "../models/Report.js";
import { isMemoryMode, memory } from "./inMemoryStore.js";

/**
 * Aggregates all project data, 11 agent reports, startup scores, and boardroom summaries
 * into a single normalized report representation consumed by PDF, Markdown, JSON, and Email.
 *
 * @param {string} projectId - Project identifier
 * @param {string} userId - Authenticated user identifier (for ownership verification)
 * @returns {Promise<Object>} Normalized venture report object
 */
export async function getAggregatedVentureReport(projectId, userId) {
  const project = await projectService.getProjectForUser(projectId, userId);
  if (!project) {
    const error = new Error("Project not found or unauthorized");
    error.status = 404;
    throw error;
  }

  // Retrieve any standalone reports persisted in DB or memory
  let storedReports = [];
  try {
    if (isMemoryMode()) {
      storedReports = (memory.reports || []).filter(
        (r) => String(r.project) === String(projectId) && String(r.user) === String(userId)
      );
    } else {
      storedReports = await Report.find({ project: projectId, user: userId }).lean();
    }
  } catch (_err) {
    storedReports = [];
  }

  // Retrieve Boardroom sessions for strategic context
  let boardroomSessions = [];
  try {
    boardroomSessions = await boardroomService.listSessions(projectId, userId);
  } catch (_err) {
    boardroomSessions = [];
  }

  const agentRuns = project.agentRuns || [];
  let completedCount = 0;

  // Build normalized sections across the canonical 11 agents
  const sections = agentDefinitions.map((agentDef) => {
    const run = agentRuns.find((r) => r.key === agentDef.key);
    const standalone = storedReports.find((r) => r.agentKey === agentDef.key);

    const reportContent = (run?.report || standalone?.content || "").trim();
    const isCompleted = run?.status === "completed" && Boolean(reportContent);
    if (isCompleted) {
      completedCount++;
    }

    return {
      key: agentDef.key,
      name: agentDef.name,
      outputFile: agentDef.outputFile,
      responsibilities: agentDef.responsibilities || [],
      status: run?.status || "pending",
      approved: Boolean(run?.approved),
      available: isCompleted,
      content: isCompleted
        ? reportContent
        : `*Section deliverable (${agentDef.outputFile}) is not available yet. This agent has not completed execution.*`,
      runtimeMs: run?.runtimeMs || 0,
      tokenUsage: run?.tokenUsage || 0,
      error: run?.error || null
    };
  });

  const rawScore = project.startupScore || {};
  const startupScore = {
    marketDemand: Number(rawScore.marketDemand || 0),
    competition: Number(rawScore.competition || 0),
    revenuePotential: Number(rawScore.revenuePotential || 0),
    technicalFeasibility: Number(rawScore.technicalFeasibility || 0),
    executionComplexity: Number(rawScore.executionComplexity || 0),
    overall: Number(rawScore.overall || 0)
  };

  const isComplete = completedCount === agentDefinitions.length;

  // Synthesize clean Executive Summary
  const executiveSummary = {
    concept: project.idea,
    targetMarket: `${project.industry} (Target Users: ${project.targetUsers})`,
    readinessRating:
      startupScore.overall >= 80
        ? "Investor Ready (High Conviction)"
        : startupScore.overall >= 60
        ? "Promising Concept (Refinement Recommended)"
        : "Early Stage (Exploratory / Incomplete)",
    pipelineProgress: `${completedCount} of ${agentDefinitions.length} deliverables completed (${Math.round(
      (completedCount / agentDefinitions.length) * 100
    )}%)`,
    status: project.status || "draft"
  };

  // Sanitize boardroom sessions: include questions, consensus, and dialogue
  const sanitizedBoardroom = (boardroomSessions || []).map((session) => ({
    title: session.title || "Executive Board Session",
    question: session.question || "",
    consensus: session.consensus || "Consensus pending deliberation.",
    messages: (session.messages || []).map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp
    })),
    createdAt: session.createdAt
  }));

  return {
    project: {
      id: project._id ? String(project._id) : String(project.id),
      startupName: project.startupName,
      idea: project.idea,
      industry: project.industry,
      targetUsers: project.targetUsers,
      country: project.country || "United States",
      budget: project.budget || "Unspecified",
      timeline: project.timeline || "Unspecified",
      status: project.status || "draft",
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      completedDeliverables: completedCount,
      totalDeliverables: agentDefinitions.length,
      isComplete
    },
    executiveSummary,
    startupScore,
    sections,
    boardroom: sanitizedBoardroom
  };
}

export default { getAggregatedVentureReport };
