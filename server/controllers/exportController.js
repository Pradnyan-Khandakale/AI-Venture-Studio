import { getAggregatedVentureReport } from "../services/reportAggregator.js";
import { projectJson, projectMarkdown, sanitizeFilename, writeProjectPdf } from "../services/exportService.js";

const VALID_FORMATS = new Set(["pdf", "markdown", "md", "json"]);

/**
 * Handles project blueprint exports for PDF, Markdown, and JSON.
 * Enforces authentication, project ownership, input validation, and proper headers.
 */
export async function exportProject(req, res, next) {
  try {
    const { id, format } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ ok: false, message: "Valid project identifier is required", status: 400 });
    }

    const normalizedFormat = (format || "").toLowerCase().trim();
    if (!VALID_FORMATS.has(normalizedFormat)) {
      return res.status(400).json({
        ok: false,
        message: `Unsupported export format '${format}'. Supported formats are: pdf, markdown (md), json.`,
        status: 400
      });
    }

    // Retrieve aggregated report with strict ownership check
    const report = await getAggregatedVentureReport(id, req.user.id);
    const startupName = report.project.startupName;

    if (normalizedFormat === "pdf") {
      const filename = sanitizeFilename(startupName, "pdf");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      await writeProjectPdf(report, res);
      return;
    }

    if (normalizedFormat === "markdown" || normalizedFormat === "md") {
      const filename = sanitizeFilename(startupName, "md");
      const mdContent = projectMarkdown(report);
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(mdContent);
    }

    if (normalizedFormat === "json") {
      const filename = sanitizeFilename(startupName, "json");
      const jsonData = projectJson(report);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.json(jsonData);
    }
  } catch (error) {
    if (error.status === 404 || error.message?.includes("not found")) {
      return res.status(404).json({ ok: false, message: "Project not found or unauthorized", status: 404 });
    }
    next(error);
  }
}

export default { exportProject };
