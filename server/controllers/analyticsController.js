import Project from "../models/Project.js";
import { isMemoryMode, memory } from "../services/inMemoryStore.js";

export async function overview(req, res) {
  // TODO: Aggregate the user's agent runs into averageRuntime, completionRate, tokenUsage,
  // TODO: mostUsedAgent, and the per-agent usage counts.
  res.status(501).json({ message: "Analytics overview is not implemented yet" });
}
