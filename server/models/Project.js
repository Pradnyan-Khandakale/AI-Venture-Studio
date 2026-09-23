import mongoose from "mongoose";
import { agentDefinitions } from "../agents/agentDefinitions.js";

// TODO: Define the agent run fields: key, name, outputFile, status ("pending" | "running" |
// TODO: "completed" | "failed"), report, approved, runtimeMs, tokenUsage, error.
const agentRunSchema = new mongoose.Schema({}, { _id: false });

// TODO: Define the score fields: marketDemand, competition, revenuePotential,
// TODO: technicalFeasibility, executionComplexity, overall.
const startupScoreSchema = new mongoose.Schema({}, { _id: false });

// TODO: Define the fields: user, startupName, idea, industry, targetUsers, country, budget,
// TODO: timeline, status ("draft" | "running" | "completed" | "failed"), agentRuns
// TODO: (defaulting to one pending run per agentDefinitions entry), and startupScore.
const projectSchema = new mongoose.Schema({}, { timestamps: true });

export default mongoose.model("Project", projectSchema);
