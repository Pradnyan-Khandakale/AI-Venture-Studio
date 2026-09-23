import { agentDefinitions } from "../agents/agentDefinitions.js";
import { buildFallbackReport, generateWithOllama } from "../services/llmService.js";
import { storeReportMemory } from "../services/memoryService.js";
import { calculateStartupScore } from "../services/scoreService.js";
import { searchMarketSignals } from "../services/searchService.js";

function buildPrompt(project, agent, signals) {
  // TODO: Build the agent prompt from the startup context, the agent responsibilities, and
  // TODO: the market signals, asking for an investor-ready Markdown report.
  return "";
}

export async function runNextAgent(project, user, { autoMode = false } = {}) {
  // TODO: Walk the pending agent runs: stop when the previous run is not approved (unless
  // TODO: autoMode), fetch market signals for the market and competitor agents, generate
  // TODO: the report (falling back to the offline generator), record runtime and token
  // TODO: usage, store the report in memory, recalculate the startup score, and mark the
  // TODO: project completed or failed.
  throw new Error("Agent workflow is not implemented yet");
}
