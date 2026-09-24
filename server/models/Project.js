import mongoose from "mongoose";
import { agentDefinitions } from "../agents/agentDefinitions.js";

const agentRunSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    outputFile: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed"],
      default: "pending"
    },
    report: { type: String, default: "" },
    approved: { type: Boolean, default: false },
    runtimeMs: { type: Number, default: 0 },
    tokenUsage: { type: Number, default: 0 },
    error: { type: String, default: null }
  },
  { _id: false }
);

const startupScoreSchema = new mongoose.Schema(
  {
    marketDemand: { type: Number, default: 0 },
    competition: { type: Number, default: 0 },
    revenuePotential: { type: Number, default: 0 },
    technicalFeasibility: { type: Number, default: 0 },
    executionComplexity: { type: Number, default: 0 },
    overall: { type: Number, default: 0 }
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    startupName: {
      type: String,
      required: [true, "Startup name is required"],
      trim: true
    },
    idea: {
      type: String,
      required: [true, "Startup idea is required"],
      trim: true
    },
    industry: {
      type: String,
      required: [true, "Industry is required"],
      trim: true
    },
    targetUsers: {
      type: String,
      required: [true, "Target users is required"],
      trim: true
    },
    country: {
      type: String,
      default: "United States",
      trim: true
    },
    budget: {
      type: String,
      default: "",
      trim: true
    },
    timeline: {
      type: String,
      default: "",
      trim: true
    },
    status: {
      type: String,
      enum: ["draft", "running", "completed", "failed"],
      default: "draft"
    },
    agentRuns: {
      type: [agentRunSchema],
      default: () =>
        agentDefinitions.map((agent) => ({
          key: agent.key,
          name: agent.name,
          outputFile: agent.outputFile,
          status: "pending",
          report: "",
          approved: false,
          runtimeMs: 0,
          tokenUsage: 0,
          error: null
        }))
    },
    startupScore: {
      type: startupScoreSchema,
      default: () => ({
        marketDemand: 0,
        competition: 0,
        revenuePotential: 0,
        technicalFeasibility: 0,
        executionComplexity: 0,
        overall: 0
      })
    }
  },
  { timestamps: true }
);

export default mongoose.model("Project", projectSchema);
