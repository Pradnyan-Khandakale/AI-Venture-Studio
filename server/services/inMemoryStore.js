import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { agentDefinitions } from "../agents/agentDefinitions.js";

let memoryMode = false;
const users = [];
const projects = [];
const reports = [];
const boardroomSessions = [];

export function setMemoryMode(value) {
  memoryMode = value;
}

export function isMemoryMode() {
  return memoryMode;
}

export async function seedMemoryStore() {
  // TODO: Seed the demo founder account with a hashed password when the store is empty.
  if (users.length === 0) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("password123", salt);
    const demoUser = {
      _id: "demo-user-id",
      id: "demo-user-id",
      name: "Founder",
      email: "founder@example.com",
      passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    users.push(demoUser);
  }
}

export const memory = {
  users,
  projects,
  reports,
  boardroomSessions,
  findUserByEmail: (email) => {
    // TODO: Find the user with this lowercased email.
    const normalized = (email || "").toLowerCase().trim();
    return users.find((u) => (u.email || "").toLowerCase() === normalized) || null;
  },
  findUserById: (id) => {
    // TODO: Find the user with this id.
    return users.find((u) => u.id === id || u._id === id) || null;
  },
  createUser: async ({ name, email, password }) => {
    // TODO: Push a user with a generated id and a bcrypt password hash.
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const id = randomUUID();
    const newUser = {
      _id: id,
      id,
      name: name || "Founder",
      email: (email || "").toLowerCase().trim(),
      passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    users.push(newUser);
    return newUser;
  },
  createProject: (payload) => {
    // TODO: Push a draft project with one pending run per agent definition, a zeroed
    // TODO: startup score, timestamps, and a save() helper that refreshes updatedAt.
    const id = randomUUID();
    const agentRuns = agentDefinitions.map((agent) => ({
      key: agent.key,
      name: agent.name,
      outputFile: agent.outputFile,
      status: "pending",
      report: "",
      approved: false,
      runtimeMs: 0,
      tokenUsage: 0,
      error: null
    }));
    const newProject = {
      _id: id,
      id,
      ...payload,
      status: "draft",
      agentRuns,
      startupScore: {
        marketDemand: 0,
        competition: 0,
        revenuePotential: 0,
        technicalFeasibility: 0,
        executionComplexity: 0,
        overall: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      save() {
        this.updatedAt = new Date().toISOString();
        return Promise.resolve(this);
      }
    };
    projects.push(newProject);
    return newProject;
  },
  listProjects: (userId) => {
    // TODO: Return this user's projects sorted by updatedAt descending.
    return projects
      .filter((p) => String(p.user) === String(userId))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  },
  findProject: (id, userId) => {
    // TODO: Return the project with this id, optionally scoped to the owner.
    return (
      projects.find(
        (p) =>
          (p.id === id || p._id === id) &&
          (!userId || String(p.user) === String(userId))
      ) || null
    );
  },
  upsertReport: (record) => {
    // TODO: Replace the stored report for this project and agent, or append a new one.
    const index = reports.findIndex(
      (r) =>
        String(r.project) === String(record.project) &&
        r.agentKey === record.agentKey
    );
    if (index >= 0) {
      reports[index] = { ...reports[index], ...record, updatedAt: new Date().toISOString() };
    } else {
      reports.push({
        _id: randomUUID(),
        ...record,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  },
  searchReports: (userId, query) => {
    // TODO: Return up to ten of this user's reports whose content matches a query term.
    const term = (query || "").toLowerCase();
    return reports
      .filter(
        (r) =>
          String(r.user) === String(userId) &&
          (r.content || "").toLowerCase().includes(term)
      )
      .slice(0, 10);
  },
  createBoardroomSession: (payload) => {
    // TODO: Push a boardroom session with a generated id and timestamps.
    const id = randomUUID();
    const session = {
      _id: id,
      id,
      ...payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    boardroomSessions.push(session);
    return session;
  }
};
