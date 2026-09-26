import mongoose from "mongoose";
import Project from "../models/Project.js";
import { isMemoryMode, memory } from "./inMemoryStore.js";
import { indexProjectMemory } from "./memoryService.js";

export const projectService = {
  async createProject(userId, payload) {
    const data = {
      startupName: payload.startupName,
      idea: payload.idea,
      industry: payload.industry,
      targetUsers: payload.targetUsers,
      country: payload.country || "United States",
      budget: payload.budget || "",
      timeline: payload.timeline || "",
      user: userId
    };

    const project = isMemoryMode() ? memory.createProject(data) : await Project.create(data);
    try {
      await indexProjectMemory(project, userId);
    } catch (_err) {
      // Non-blocking memory indexing
    }
    return project;
  },

  async listProjectsForUser(userId) {
    if (isMemoryMode()) {
      return memory.listProjects(userId);
    }
    return Project.find({ user: userId }).sort({ updatedAt: -1 });
  },

  async getProjectForUser(id, userId) {
    if (isMemoryMode()) {
      return memory.findProject(id, userId);
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return Project.findOne({ _id: id, user: userId });
  }
};
