import { projectService } from "../services/projectService.js";

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

export async function getProject(req, res, next) {
  try {
    const { id } = req.params;
    const project = await projectService.getProjectForUser(id, req.user.id);
    if (!project) {
      return res.status(404).json({ ok: false, message: "Project not found", status: 404 });
    }
    return res.json(project);
  } catch (error) {
    next(error);
  }
}

export async function runProject(_req, res) {
  res.status(501).json({ message: "Run project is not implemented yet" });
}

export async function approveAgent(_req, res) {
  res.status(501).json({ message: "Approve agent is not implemented yet" });
}

export async function regenerateAgent(_req, res) {
  res.status(501).json({ message: "Regenerate agent is not implemented yet" });
}

export async function emailProject(_req, res) {
  res.status(501).json({ message: "Email project is not implemented yet" });
}
