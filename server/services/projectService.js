import mongoose from "mongoose";
import Project from "../models/Project.js";
import { isMemoryMode, memory } from "./inMemoryStore.js";

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

    if (isMemoryMode()) {
      return memory.createProject(data);
    }
    return Project.create(data);
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
