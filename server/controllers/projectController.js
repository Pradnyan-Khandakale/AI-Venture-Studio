import Project from "../models/Project.js";
import { sendProjectEmail } from "../services/emailService.js";
import { isMemoryMode, memory } from "../services/inMemoryStore.js";
import { runNextAgent } from "../workflows/agentWorkflow.js";

export async function listProjects(req, res) {
  // TODO: Respond with the user's projects sorted by updatedAt descending.
  res.status(501).json({ message: "List projects is not implemented yet" });
}

export async function createProject(req, res) {
  // TODO: Create the project for req.user and respond with 201.
  res.status(501).json({ message: "Create project is not implemented yet" });
}

export async function getProject(req, res) {
  // TODO: Respond with the owned project for req.params.id, or 404.
  res.status(501).json({ message: "Get project is not implemented yet" });
}

export async function runProject(req, res) {
  // TODO: Load the owned project and run the next agent, honouring req.body.autoMode.
  res.status(501).json({ message: "Run project is not implemented yet" });
}

export async function approveAgent(req, res) {
  // TODO: Mark the completed agent run as approved so the next agent can start.
  res.status(501).json({ message: "Approve agent is not implemented yet" });
}

export async function regenerateAgent(req, res) {
  // TODO: Reset the agent run to pending, clear its report and approval, and run it again.
  res.status(501).json({ message: "Regenerate agent is not implemented yet" });
}

export async function emailProject(req, res) {
  // TODO: Email the venture blueprint to req.body.email or the signed-in user.
  res.status(501).json({ message: "Email project is not implemented yet" });
}
