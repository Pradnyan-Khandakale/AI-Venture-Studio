import Report from "../models/Report.js";
import { isMemoryMode, memory } from "./inMemoryStore.js";

export async function storeReportMemory({ user, project, agentRun }) {
  // TODO: Upsert the agent report (with its chroma embeddingRef) into the memory store
  // TODO: or the Report collection.
}

export async function searchMemory(userId, query) {
  // TODO: Return up to ten of the user's reports matching the query terms, newest first.
  return [];
}
