import { projectService } from "../services/projectService.js";
import { boardroomService } from "../services/boardroomService.js";

/**
 * Validates founder debate request and dispatches executive debate orchestration.
 */
export async function debate(req, res, next) {
  try {
    const projectId = req.params.id || req.body?.projectId;
    if (!projectId || typeof projectId !== "string" || !projectId.trim()) {
      return res.status(400).json({ ok: false, message: "Project ID is required", status: 400 });
    }

    const question = req.body?.question;
    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ ok: false, message: "A question is required for the Boardroom", status: 400 });
    }

    const trimmedQuestion = question.trim();
    if (trimmedQuestion.length < 5) {
      return res.status(400).json({ ok: false, message: "Question must be at least 5 characters long", status: 400 });
    }
    if (trimmedQuestion.length > 2500) {
      return res.status(400).json({ ok: false, message: "Question exceeds maximum length of 2500 characters", status: 400 });
    }

    // Verify venture ownership
    const project = await projectService.getProjectForUser(projectId.trim(), req.user.id);
    if (!project) {
      return res.status(404).json({ ok: false, message: "Project not found", status: 404 });
    }

    const session = await boardroomService.runExecutiveDebate({
      user: req.user,
      project,
      question: trimmedQuestion,
      title: req.body?.title
    });

    return res.status(201).json(session);
  } catch (error) {
    next(error);
  }
}

/**
 * Lists all boardroom sessions for a project.
 */
export async function listSessions(req, res, next) {
  try {
    const projectId = req.params.id || req.query?.projectId;
    if (!projectId) {
      return res.status(400).json({ ok: false, message: "Project ID is required", status: 400 });
    }

    const sessions = await boardroomService.listSessions(projectId, req.user.id);
    return res.json(sessions);
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves a specific boardroom session with ownership verification.
 */
export async function getSession(req, res, next) {
  try {
    const sessionId = req.params.sessionId || req.params.id;
    const projectId = req.params.id !== sessionId ? req.params.id : req.query?.projectId;

    const session = await boardroomService.getSession(sessionId, projectId, req.user.id);
    if (!session) {
      return res.status(404).json({ ok: false, message: "Boardroom session not found", status: 404 });
    }

    return res.json(session);
  } catch (error) {
    next(error);
  }
}
