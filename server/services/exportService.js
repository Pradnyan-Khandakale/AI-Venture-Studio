import { buildVenturePdf } from "./pdfService.js";

/**
 * Sanitizes a startup name into a safe, readable download filename.
 * E.g. "FinTech Co, Inc." -> "fintech-co-inc-venture-report.pdf"
 */
export function sanitizeFilename(startupName, extension) {
  const base = (startupName || "venture")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "venture";
  const ext = extension.startsWith(".") ? extension : `.${extension}`;
  return `${base}-venture-report${ext}`;
}

/**
 * Generates an investor-ready Markdown document from the aggregated report.
 *
 * @param {Object} report - Normalized report from reportAggregator
 * @returns {string} Clean Markdown representation
 */
export function projectMarkdown(report) {
  const { project, startupScore, executiveSummary, sections, boardroom, metadata } = report;

  const lines = [];

  // Header & Title
  lines.push(`# ${project.startupName} — Venture Blueprint`);
  lines.push("");
  lines.push(`**Prepared by AI Venture Studio** | Generated: ${new Date(metadata.generatedAt).toLocaleDateString()}`);
  lines.push(`*Status: ${project.status.toUpperCase()}* | *Pipeline Progress: ${metadata.completedDeliverables}/${metadata.totalDeliverables} Deliverables Complete*`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Venture Profile Metadata
  lines.push("## Venture Profile");
  lines.push(`- **Concept:** ${project.idea}`);
  lines.push(`- **Industry:** ${project.industry}`);
  lines.push(`- **Target Users:** ${project.targetUsers}`);
  lines.push(`- **Target Market Geography:** ${project.country || "Global"}`);
  lines.push(`- **Target Budget:** ${project.budget || "Stage-appropriate"}`);
  lines.push(`- **Target Timeline:** ${project.timeline || "Milestone-driven"}`);
  lines.push("");

  // Executive Summary
  lines.push("## Executive Summary");
  lines.push("");
  lines.push("### Core Proposition & Strategic Context");
  lines.push(executiveSummary.concept);
  lines.push("");
  lines.push("### Market & User Ecosystem");
  lines.push(executiveSummary.targetMarket);
  lines.push("");
  lines.push("### Venture Readiness Rating");
  lines.push(`**${executiveSummary.readinessRating}**`);
  lines.push(`- Overall Readiness Score: **${startupScore.overall} / 100**`);
  lines.push(`- Pipeline Completion: ${executiveSummary.pipelineProgress}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Startup Health Score Breakdown Table
  lines.push(`## Venture Health Scorecard (Overall: ${startupScore.overall}/100)`);
  lines.push("");
  lines.push("| Evaluation Dimension | Score (0-100) | Status |");
  lines.push("| :--- | :---: | :--- |");
  lines.push(`| Market Demand | ${startupScore.marketDemand} | ${startupScore.marketDemand >= 70 ? "Strong Signal" : "Moderate Signal"} |`);
  lines.push(`| Competition Index | ${startupScore.competition} | ${startupScore.competition >= 70 ? "Manageable Moat" : "Intense Competition"} |`);
  lines.push(`| Revenue Potential | ${startupScore.revenuePotential} | ${startupScore.revenuePotential >= 70 ? "High Unit Economics" : "Moderate Monetization"} |`);
  lines.push(`| Technical Feasibility | ${startupScore.technicalFeasibility} | ${startupScore.technicalFeasibility >= 70 ? "High Architecture Feasibility" : "Complex Technical Risk"} |`);
  lines.push(`| Execution Complexity | ${startupScore.executionComplexity} | ${startupScore.executionComplexity >= 70 ? "Agile Milestone Plan" : "High Overhead Risk"} |`);
  lines.push(`| **Overall Venture Score** | **${startupScore.overall}** | **${executiveSummary.readinessRating}** |`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // 11 Agent Deliverables
  lines.push("## Deliverable Reports & Analysis");
  lines.push("");

  sections.forEach((sec, idx) => {
    const statusBadge = sec.available
      ? sec.approved
        ? "APPROVED"
        : "COMPLETED (Awaiting Review)"
      : "PENDING GENERATION";

    lines.push(`### ${idx + 1}. ${sec.name} (\`${sec.outputFile}\`)`);
    lines.push(`*Deliverable Status: [${statusBadge}]*`);
    lines.push("");

    if (sec.available && sec.content) {
      lines.push(sec.content);
    } else {
      lines.push(`> *Deliverable \`${sec.outputFile}\` is currently unavailable because this agent has not completed execution.*`);
    }

    lines.push("");
    lines.push("---");
    lines.push("");
  });

  // Boardroom Strategic Synthesis
  if (boardroom && boardroom.length > 0) {
    lines.push("## Executive Boardroom Deliberation");
    lines.push("");
    boardroom.forEach((session, sIdx) => {
      lines.push(`### Boardroom Session ${sIdx + 1}: ${session.title || "Strategic Debate"}`);
      lines.push(`**Strategic Question:** *"${session.question}"*`);
      lines.push("");
      if (session.consensus) {
        lines.push(`**Executive Consensus:**\n\n${session.consensus}`);
        lines.push("");
      }
      if (session.messages && session.messages.length > 0) {
        lines.push("<details>");
        lines.push("<summary>View Executive Council Debate Log</summary>");
        lines.push("");
        session.messages.forEach((m) => {
          lines.push(`**${m.role}:** ${m.content}`);
          lines.push("");
        });
        lines.push("</details>");
        lines.push("");
      }
    });
    lines.push("---");
    lines.push("");
  }

  lines.push("*Document generated by AI Venture Studio. Confidential.*");
  return lines.join("\n");
}

/**
 * Builds a structured, sanitized JSON representation of the project report.
 * Explicitly strips sensitive credentials, tokens, and internal database connection artifacts.
 *
 * @param {Object} report - Normalized report from reportAggregator
 * @returns {Object} Clean JSON object
 */
export function projectJson(report) {
  const { project, startupScore, sections, boardroom, metadata } = report;

  // Build clean dictionary of reports
  const reportsDict = {};
  sections.forEach((sec) => {
    reportsDict[sec.key] = {
      title: sec.name,
      outputFile: sec.outputFile,
      status: sec.status,
      available: sec.available,
      approved: sec.approved,
      content: sec.content,
      runtimeMs: sec.runtimeMs,
      tokenUsage: sec.tokenUsage
    };
  });

  // Clean agent runs array
  const agentRunsClean = sections.map((sec) => ({
    key: sec.key,
    name: sec.name,
    outputFile: sec.outputFile,
    status: sec.status,
    approved: sec.approved,
    runtimeMs: sec.runtimeMs,
    tokenUsage: sec.tokenUsage,
    error: sec.error
  }));

  // Clean boardroom sessions
  const boardroomClean = (boardroom || []).map((session) => ({
    title: session.title,
    question: session.question,
    consensus: session.consensus,
    messagesCount: session.messages ? session.messages.length : 0,
    messages: session.messages,
    createdAt: session.createdAt
  }));

  return {
    project: {
      id: project.id,
      startupName: project.startupName,
      idea: project.idea,
      industry: project.industry,
      targetUsers: project.targetUsers,
      country: project.country,
      budget: project.budget,
      timeline: project.timeline,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    },
    metadata: {
      generatedAt: metadata.generatedAt,
      completedDeliverables: metadata.completedDeliverables,
      totalDeliverables: metadata.totalDeliverables,
      isComplete: metadata.isComplete,
      format: "ai-venture-blueprint-v1"
    },
    startupScore,
    reports: reportsDict,
    agentRuns: agentRunsClean,
    boardroom: boardroomClean
  };
}

/**
 * Writes the venture report PDF to a writable stream (such as Express res).
 *
 * @param {Object} report - Normalized report
 * @param {NodeJS.WritableStream} stream - Destination stream
 * @returns {Promise<void>}
 */
export async function writeProjectPdf(report, stream) {
  return buildVenturePdf(report, stream);
}

export default {
  sanitizeFilename,
  projectMarkdown,
  projectJson,
  writeProjectPdf
};
