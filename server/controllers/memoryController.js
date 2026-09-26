import { searchMemory } from "../services/memoryService.js";

/**
 * Handles authenticated semantic / relevance memory search.
 * Endpoint: GET /api/memory/search?q=...&projectId=...&agentKey=...&limit=...
 */
export async function queryMemory(req, res, next) {
  try {
    const query = String(req.query.q || req.query.query || "").trim();
    if (query.length < 2 || query.length > 500) {
      return res.status(400).json({
        ok: false,
        message: "Search query 'q' must be between 2 and 500 characters",
        status: 400
      });
    }

    const projectId = req.query.projectId ? String(req.query.projectId).trim() : undefined;
    const agentKey = req.query.agentKey || req.query.reportType ? String(req.query.agentKey || req.query.reportType).trim() : undefined;
    const limit = req.query.limit ? Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10)) : 10;

    const results = await searchMemory(req.user.id, query, { projectId, agentKey, limit });

    return res.json({
      ok: true,
      query,
      count: results.length,
      results
    });
  } catch (error) {
    next(error);
  }
}
