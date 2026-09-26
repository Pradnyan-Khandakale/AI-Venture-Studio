import { getOverviewAnalytics, getProjectAnalytics } from "../services/analyticsService.js";

/**
 * Returns overall workspace analytics for the authenticated user.
 * Endpoint: GET /api/analytics/overview
 */
export async function overview(req, res, next) {
  try {
    const data = await getOverviewAnalytics(req.user.id);
    return res.json(data);
  } catch (error) {
    next(error);
  }
}

/**
 * Returns project-specific analytics scoped to the authenticated owner.
 * Endpoint: GET /api/analytics/projects/:projectId (or GET /api/projects/:id/analytics)
 */
export async function projectAnalytics(req, res, next) {
  try {
    const projectId = req.params.projectId || req.params.id;
    if (!projectId) {
      return res.status(400).json({ ok: false, message: "Project ID is required", status: 400 });
    }

    const data = await getProjectAnalytics(projectId, req.user.id);
    if (!data) {
      return res.status(404).json({ ok: false, message: "Project not found", status: 404 });
    }

    return res.json(data);
  } catch (error) {
    next(error);
  }
}
