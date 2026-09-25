import { projectService } from "../services/projectService.js";
import { runNextAgent } from "../workflows/agentWorkflow.js";
import { storeReportMemory } from "../services/memoryService.js";

export async function listProjects(req, res, next) {
  try {
    const projects = await projectService.listProjectsForUser(req.user.id);
    return res.json(projects);
  } catch (error) {
    next(error);
  }
}

export async function createProject(req, res, next) {
  try {
    const body = req.body || {};
    const required = ["startupName", "idea", "industry", "targetUsers"];
    for (const field of required) {
      if (!body[field] || typeof body[field] !== "string" || !body[field].trim()) {
        return res.status(400).json({ ok: false, message: `${field} is required`, status: 400 });
      }
    }

    const project = await projectService.createProject(req.user.id, {
      startupName: body.startupName.trim(),
      idea: body.idea.trim(),
      industry: body.industry.trim(),
      targetUsers: body.targetUsers.trim(),
      country: body.country?.trim() || "United States",
      budget: body.budget?.trim() || "",
      timeline: body.timeline?.trim() || ""
    });

    return res.status(201).json(project);
  } catch (error) {
    next(error);
  }
}

async function findProjectOr404(id, userId, res) {
  const project = await projectService.getProjectForUser(id, userId);
  if (!project) res.status(404).json({ ok: false, message: "Project not found", status: 404 });
  return project;
}

export async function getProject(req, res, next) {
  try {
    const project = await findProjectOr404(req.params.id, req.user.id, res);
    if (project) return res.json(project);
  } catch (error) {
    next(error);
  }
}

export async function runProject(req, res, next) {
  try {
    const project = await findProjectOr404(req.params.id, req.user.id, res);
    if (!project) return;
    const autoMode = Boolean(req.body?.autoMode);
    const updated = await runNextAgent(project, req.user, { autoMode });
    return res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function approveAgent(req, res, next) {
  try {
    const { id, agentKey } = req.params;
    const project = await findProjectOr404(id, req.user.id, res);
    if (!project) return;

    const agentRun = (project.agentRuns || []).find((r) => r.key === agentKey);
    if (!agentRun) {
      return res.status(404).json({ ok: false, message: `Agent run not found for ${agentKey}`, status: 404 });
    }
    if (agentRun.status !== "completed") {
      return res.status(400).json({ ok: false, message: "Agent run must be completed before approval", status: 400 });
    }

    agentRun.approved = true;
    await project.save();
    return res.json(project);
  } catch (error) {
    next(error);
  }
}

export async function regenerateAgent(req, res, next) {
  try {
    const { id, agentKey } = req.params;
    const project = await findProjectOr404(id, req.user.id, res);
    if (!project) return;

    const agentRun = (project.agentRuns || []).find((r) => r.key === agentKey);
    if (!agentRun) {
      return res.status(404).json({ ok: false, message: `Agent run not found for ${agentKey}`, status: 404 });
    }

    agentRun.status = "pending";
    agentRun.report = "";
    agentRun.approved = false;
    agentRun.error = null;
    await project.save();

    const updated = await runNextAgent(project, req.user, { autoMode: false, targetAgentKey: agentKey });
    return res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function getAgentReport(req, res, next) {
  try {
    const { id, agentKey } = req.params;
    const project = await findProjectOr404(id, req.user.id, res);
    if (!project) return;

    const agentRun = (project.agentRuns || []).find((r) => r.key === agentKey);
    if (!agentRun) {
      return res.status(404).json({ ok: false, message: `Agent run not found for ${agentKey}`, status: 404 });
    }

    return res.json({
      ok: true,
      agentKey,
      outputFile: agentRun.outputFile,
      report: agentRun.report || ""
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAgentReport(req, res, next) {
  try {
    const { id, agentKey } = req.params;
    const { content } = req.body || {};

    if (typeof content !== "string") {
      return res.status(400).json({ ok: false, message: "Report content must be a string", status: 400 });
    }

    const project = await findProjectOr404(id, req.user.id, res);
    if (!project) return;

    const agentRun = (project.agentRuns || []).find((r) => r.key === agentKey);
    if (!agentRun) {
      return res.status(404).json({ ok: false, message: `Agent run not found for ${agentKey}`, status: 404 });
    }

    agentRun.report = content;
    await project.save();

    await storeReportMemory({
      user: req.user.id,
      project: project._id || project.id,
      agentKey,
      outputFile: agentRun.outputFile,
      content
    });

    return res.json(project);
  } catch (error) {
    next(error);
  }
}

export const emailProject = (_req, res) => res.status(501).json({ message: "Email project is not implemented yet" });
