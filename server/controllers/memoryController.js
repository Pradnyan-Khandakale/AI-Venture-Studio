import { searchMemory } from "../services/memoryService.js";

export async function queryMemory(req, res) {
  // TODO: Search the stored reports for req.query.q and respond with the matches.
  res.status(501).json({ message: "Memory search is not implemented yet" });
}
