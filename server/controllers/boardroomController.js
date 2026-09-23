import BoardroomSession from "../models/BoardroomSession.js";
import mongoose from "mongoose";
import Project from "../models/Project.js";
import { isMemoryMode, memory } from "../services/inMemoryStore.js";
import { generateWithOllama } from "../services/llmService.js";

// TODO: Define the debate panel: CEO, CTO, CFO, CMO, and VC agents with the lens each one
// TODO: should argue from.
const boardRoles = [];

export async function debate(req, res) {
  // TODO: Require a question, validate the optional project id, load the project context,
  // TODO: ask every board role in turn (with a local fallback answer), summarize the thread
  // TODO: into a consensus report, persist the session, and respond with 201.
  res.status(501).json({ message: "Boardroom debate is not implemented yet" });
}
