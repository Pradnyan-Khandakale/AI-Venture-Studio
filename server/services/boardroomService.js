import BoardroomSession from "../models/BoardroomSession.js";
import { isMemoryMode, memory } from "./inMemoryStore.js";
import { generateText } from "./llmService.js";
import { boardroomPrompts } from "../prompts/boardroomPrompts.js";
import { projectService } from "./projectService.js";

const EXECUTIVE_ROLES = [
  { key: "ceo", role: "CEO", title: "Chief Executive Officer" },
  { key: "cto", role: "CTO", title: "Chief Technology Officer" },
  { key: "cfo", role: "CFO", title: "Chief Financial Officer" },
  { key: "cmo", role: "CMO", title: "Chief Marketing Officer" },
  { key: "vc", role: "VC", title: "Lead Venture Capitalist" }
];

function getApprovedReports(project) {
  const approved = {};
  for (const run of project?.agentRuns || []) {
    if (run.status === "completed" && run.approved) {
      const content = run.report || run.reportContent;
      if (content) approved[run.key] = content;
    }
  }
  return approved;
}

export const boardroomService = {
  /**
   * Executes a sequential executive council debate for a startup venture.
   */
  async runExecutiveDebate(options) {
    let { user, project, question, title, userId: optUserId, projectId: optProjectId } = options || {};
    const userId = String(user?.id || user?._id || (typeof user === "string" ? user : "") || optUserId || "");
    let projectId = String(project?._id || project?.id || (typeof project === "string" ? project : "") || optProjectId || "");
    const startTime = Date.now();

    if (!question || typeof question !== "string" || question.trim().length < 5) {
      const error = new Error("Question must be at least 5 characters long");
      error.status = 400;
      throw error;
    }
    if (question.trim().length > 2500) {
      const error = new Error("Question exceeds maximum length of 2500 characters");
      error.status = 400;
      throw error;
    }
    question = question.trim();

    // If project was passed as an ID or lacks agentRuns, try to fetch the full project
    if (typeof project === "string" || !project?.startupName) {
      project = await projectService.getProjectForUser(projectId, userId);
      if (!project) {
        const error = new Error("Project not found");
        error.status = 404;
        throw error;
      }
    }

    const approvedReports = getApprovedReports(project);
    const roleResponses = {};
    const messages = [];
    let totalTokens = 0;

    // Add initial founder message
    messages.push({
      role: "Founder",
      content: question,
      timestamp: new Date()
    });

    // 1. Sequentially consult each of the 5 executive roles
    for (const exec of EXECUTIVE_ROLES) {
      try {
        console.log(`[BoardroomService] Consulting executive role: ${exec.role}...`);
        const roleStart = Date.now();
        const promptFn = boardroomPrompts[exec.key];
        const prompt = promptFn(project, question, approvedReports);

        const llmResult = await generateText(prompt, { role: exec.role });
        const text = llmResult.text?.trim() || "";
        roleResponses[exec.role] = text;
        totalTokens += llmResult.tokenUsage || 0;

        console.log(`[BoardroomService] Role ${exec.role} completed in ${Date.now() - roleStart}ms (${llmResult.tokenUsage || 0} tokens)`);

        messages.push({
          role: exec.role,
          content: text,
          timestamp: new Date()
        });
      } catch (error) {
        // Structured partial failure handling
        console.error(`[BoardroomService] Failed generating perspective for ${exec.role}:`, error.message);
        const partialError = new Error(`Boardroom consultation failed at ${exec.role}: ${error.message}`);
        partialError.status = error.status || 500;
        partialError.partialRole = exec.role;
        partialError.messages = messages;
        throw partialError;
      }
    }

    // 2. Synthesize consolidated Boardroom Consensus
    let consensusText = "";
    try {
      console.log("[BoardroomService] Synthesizing executive consensus...");
      const consensusStart = Date.now();
      const consensusPrompt = boardroomPrompts.consensus(project, question, roleResponses);
      const consensusResult = await generateText(consensusPrompt, { role: "Consensus" });
      consensusText = consensusResult.text?.trim() || "";
      totalTokens += consensusResult.tokenUsage || 0;
      console.log(`[BoardroomService] Consensus completed in ${Date.now() - consensusStart}ms`);

      messages.push({
        role: "Consensus",
        content: consensusText,
        timestamp: new Date()
      });
    } catch (consensusError) {
      console.warn("[BoardroomService] Consensus generation failed:", consensusError.message);
      consensusText = "Consensus synthesis was unavailable due to a transient model error.";
    }

    const runtimeMs = Date.now() - startTime;
    const sessionTitle = title || question.slice(0, 60).trim() + (question.length > 60 ? "..." : "");

    // 3. Persist session
    const sessionPayload = {
      user: userId,
      project: projectId,
      title: sessionTitle,
      question,
      messages,
      consensus: consensusText,
      tokenUsage: totalTokens,
      runtimeMs
    };

    if (isMemoryMode()) {
      return memory.createBoardroomSession(sessionPayload);
    }

    const session = await BoardroomSession.create(sessionPayload);
    return session;
  },

  async listSessions(projectId, userId) {
    const pid = typeof projectId === "object" ? projectId.projectId : projectId;
    const uid = typeof projectId === "object" ? projectId.userId : userId;
    const project = await projectService.getProjectForUser(pid, uid);
    if (!project) {
      const error = new Error("Project not found");
      error.status = 404;
      throw error;
    }
    return isMemoryMode()
      ? memory.listBoardroomSessions(pid, uid)
      : BoardroomSession.find({ project: pid, user: uid }).sort({ createdAt: -1 });
  },

  async getSession(sessionId, projectId, userId) {
    const sid = typeof sessionId === "object" ? sessionId.sessionId : sessionId;
    const pid = typeof sessionId === "object" ? sessionId.projectId : projectId;
    const uid = typeof sessionId === "object" ? sessionId.userId : userId;

    if (pid && uid) {
      const project = await projectService.getProjectForUser(pid, uid);
      if (!project) {
        const error = new Error("Project not found");
        error.status = 404;
        throw error;
      }
    }

    if (isMemoryMode()) return memory.findBoardroomSession(sid, pid, uid);
    const query = { _id: sid, user: uid };
    if (pid) query.project = pid;
    return BoardroomSession.findOne(query);
  }
};

export default boardroomService;

