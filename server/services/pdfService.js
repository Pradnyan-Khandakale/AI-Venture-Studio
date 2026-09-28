import PDFDocument from "pdfkit";

/**
 * Strips raw markdown syntax characters for clean PDF typography.
 */
function cleanMarkdownText(text) {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // Bold **text** -> text
    .replace(/\*(.*?)\*/g, "$1")     // Italic *text* -> text
    .replace(/__(.*?)__/g, "$1")     // Underline/bold __text__ -> text
    .replace(/`([^`]+)`/g, "$1")     // Inline code `text` -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Links [text](url) -> text
    .replace(/^#+\s+/gm, "")         // Leading # headings
    .trim();
}

/**
 * Builds a structured, investor-grade PDF document using PDFKit.
 * Supports both streaming to HTTP responses and buffering for email delivery.
 *
 * @param {Object} report - Normalized venture report from reportAggregator
 * @param {NodeJS.WritableStream|null} stream - Optional writable stream (e.g., Express res)
 * @returns {Promise<Buffer>} Resolves to PDF Buffer when complete
 */
export function buildVenturePdf(report, stream = null) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 54, bottom: 54, left: 54, right: 54 },
        bufferPages: true,
        info: {
          Title: `${report.project.startupName} — Venture Blueprint`,
          Author: "AI Venture Studio",
          Subject: "Investor-Ready Business Blueprint and Multi-Agent Strategic Analysis",
          Keywords: "startup, venture, business plan, investment, market research, AI"
        }
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => {
        const fullBuffer = Buffer.concat(chunks);
        resolve(fullBuffer);
      });
      doc.on("error", (err) => reject(err));

      if (stream) {
        doc.pipe(stream);
      }

      const { project, startupScore, executiveSummary, sections, boardroom } = report;
      const contentWidth = doc.page.width - 108; // 595.28 - 108 = 487.28

      // ==========================================
      // 1. COVER PAGE
      // ==========================================
      doc.save();

      // Top Decorative Accent Bar
      doc.rect(54, 54, contentWidth, 5).fill("#0f766e"); // Teal accent

      doc.moveDown(3);
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#0f766e")
        .text("AI VENTURE STUDIO  |  INVESTOR-READY BLUEPRINT", { characterSpacing: 1.5 });

      doc.moveDown(1.5);
      doc
        .font("Helvetica-Bold")
        .fontSize(28)
        .fillColor("#0f172a") // Slate 900
        .text(project.startupName, { lineGap: 4 });

      doc.moveDown(0.8);
      doc
        .font("Helvetica")
        .fontSize(12)
        .fillColor("#475569") // Slate 600
        .text(project.idea, { lineGap: 3, width: contentWidth });

      doc.moveDown(2);

      // Metadata Card
      const metaTop = doc.y;
      doc
        .roundedRect(54, metaTop, contentWidth, 100, 6)
        .fillAndStroke("#f8fafc", "#e2e8f0");

      doc.fillColor("#0f172a");
      const colW = (contentWidth - 40) / 3;

      const printMetaItem = (label, value, x, y) => {
        doc.font("Helvetica-Bold").fontSize(8).fillColor("#64748b").text(label.toUpperCase(), x, y);
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a").text(value, x, y + 13, { width: colW - 10, lineBreak: false });
      };

      printMetaItem("Industry", project.industry || "General Tech", 74, metaTop + 16);
      printMetaItem("Target Users", project.targetUsers || "General", 74 + colW, metaTop + 16);
      printMetaItem("Geography", project.country || "Global", 74 + colW * 2, metaTop + 16);

      printMetaItem("Target Budget", project.budget || "Stage-appropriate", 74, metaTop + 56);
      printMetaItem("Launch Timeline", project.timeline || "Milestone-driven", 74 + colW, metaTop + 56);
      printMetaItem("Generated On", new Date(report.metadata.generatedAt).toLocaleDateString(), 74 + colW * 2, metaTop + 56);

      doc.y = metaTop + 120;

      // Startup Health Score Overview Card
      const scoreTop = doc.y;
      doc
        .roundedRect(54, scoreTop, contentWidth, 130, 6)
        .fillAndStroke("#f0fdfa", "#99f6e4"); // Teal tinted card

      doc.font("Helvetica-Bold").fontSize(11).fillColor("#0f766e").text("VENTURE HEALTH SCORECARD", 74, scoreTop + 16);

      // Large Score Callout
      doc.font("Helvetica-Bold").fontSize(34).fillColor("#0f766e").text(`${startupScore.overall}`, 74, scoreTop + 36);
      doc.font("Helvetica").fontSize(10).fillColor("#64748b").text("/ 100 Overall Score", 74, scoreTop + 78);

      // Score Category Breakdown Table
      const metricsX = 220;
      const metrics = [
        { label: "Market Demand", val: startupScore.marketDemand },
        { label: "Competition Index", val: startupScore.competition },
        { label: "Revenue Potential", val: startupScore.revenuePotential },
        { label: "Technical Feasibility", val: startupScore.technicalFeasibility },
        { label: "Execution Complexity", val: startupScore.executionComplexity }
      ];

      metrics.forEach((m, idx) => {
        const itemY = scoreTop + 18 + idx * 20;
        doc.font("Helvetica").fontSize(9).fillColor("#334155").text(m.label, metricsX, itemY);
        // Progress bar track
        doc.roundedRect(metricsX + 130, itemY + 2, 100, 7, 3).fill("#e2e8f0");
        // Filled bar
        const fillW = Math.max(0, Math.min(100, m.val));
        doc.roundedRect(metricsX + 130, itemY + 2, fillW, 7, 3).fill("#0f766e");
        // Score number
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a").text(`${m.val}`, metricsX + 240, itemY);
      });

      doc.y = scoreTop + 150;
      doc.restore();

      // ==========================================
      // 2. EXECUTIVE SUMMARY & TABLE OF CONTENTS
      // ==========================================
      doc.addPage();
      doc.font("Helvetica-Bold").fontSize(18).fillColor("#0f172a").text("Executive Summary");
      doc.moveDown(0.5);
      doc.rect(54, doc.y, contentWidth, 1).fill("#cbd5e1");
      doc.moveDown(1);

      doc.font("Helvetica-Bold").fontSize(11).fillColor("#0f766e").text("Core Proposition & Strategic Context");
      doc.moveDown(0.4);
      doc.font("Helvetica").fontSize(10).fillColor("#334155").text(executiveSummary.concept, { lineGap: 4, width: contentWidth });
      doc.moveDown(1);

      doc.font("Helvetica-Bold").fontSize(11).fillColor("#0f766e").text("Target Market & User Ecosystem");
      doc.moveDown(0.4);
      doc.font("Helvetica").fontSize(10).fillColor("#334155").text(executiveSummary.targetMarket, { lineGap: 4, width: contentWidth });
      doc.moveDown(1);

      doc.font("Helvetica-Bold").fontSize(11).fillColor("#0f766e").text("Venture Readiness Rating");
      doc.moveDown(0.4);
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#0f172a").text(executiveSummary.readinessRating);
      doc.font("Helvetica").fontSize(9).fillColor("#64748b").text(`Status: ${project.status.toUpperCase()} | Pipeline: ${executiveSummary.pipelineProgress}`);

      doc.moveDown(2);
      doc.font("Helvetica-Bold").fontSize(14).fillColor("#0f172a").text("Table of Deliverable Reports");
      doc.moveDown(0.5);
      doc.rect(54, doc.y, contentWidth, 1).fill("#cbd5e1");
      doc.moveDown(0.8);

      sections.forEach((sec, idx) => {
        const itemY = doc.y;
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#1e293b").text(`${idx + 1}. ${sec.name}`, 54, itemY);
        doc.font("Helvetica").fontSize(9).fillColor("#64748b").text(`(${sec.outputFile})`, 280, itemY);

        const statusLabel = sec.available ? (sec.approved ? "[Approved]" : "[Ready for Review]") : "[Pending Run]";
        const statusColor = sec.available ? (sec.approved ? "#059669" : "#d97706") : "#94a3b8";
        doc.font("Helvetica-Bold").fontSize(9).fillColor(statusColor).text(statusLabel, contentWidth - 40, itemY, { align: "right" });
        doc.moveDown(0.6);
      });

      // ==========================================
      // 3. AGENT DELIVERABLE REPORT SECTIONS
      // ==========================================
      sections.forEach((sec, idx) => {
        doc.addPage();

        // Section Header Block
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f766e").text(`SECTION ${idx + 1} OF ${sections.length}  |  ${sec.outputFile.toUpperCase()}`, { characterSpacing: 1 });
        doc.moveDown(0.3);
        doc.font("Helvetica-Bold").fontSize(18).fillColor("#0f172a").text(sec.name);
        doc.moveDown(0.3);

        const statusText = sec.available
          ? sec.approved
            ? "Status: Approved Deliverable"
            : "Status: Completed (Awaiting Founder Review)"
          : "Status: Pending Generation";
        doc.font("Helvetica-Bold").fontSize(9).fillColor(sec.available ? (sec.approved ? "#059669" : "#d97706") : "#94a3b8").text(statusText);

        doc.moveDown(0.5);
        doc.rect(54, doc.y, contentWidth, 1).fill("#e2e8f0");
        doc.moveDown(1);

        if (!sec.available) {
          doc
            .roundedRect(54, doc.y, contentWidth, 60, 4)
            .fillAndStroke("#f8fafc", "#e2e8f0");
          doc.fillColor("#64748b").font("Helvetica-Oblique").fontSize(10).text(
            `Deliverable ${sec.outputFile} is currently unavailable. This agent has not completed execution in the AI Venture Studio workflow pipeline.`,
            70,
            doc.y - 45,
            { width: contentWidth - 32, lineGap: 3 }
          );
          doc.moveDown(4);
          return;
        }

        // Render clean parsed report content line by line
        const lines = (sec.content || "").split("\n");
        let inCodeBlock = false;

        for (const rawLine of lines) {
          const line = rawLine.trimEnd();

          // Code block toggles
          if (line.trim().startsWith("```")) {
            inCodeBlock = !inCodeBlock;
            continue;
          }

          if (inCodeBlock) {
            doc.font("Courier").fontSize(8.5).fillColor("#0f172a").text(line, { indent: 10, lineGap: 1 });
            continue;
          }

          if (!line.trim()) {
            doc.moveDown(0.5);
            continue;
          }

          // Markdown H1 / H2 / H3
          if (line.startsWith("# ")) {
            doc.moveDown(0.8);
            doc.font("Helvetica-Bold").fontSize(14).fillColor("#0f172a").text(cleanMarkdownText(line));
            doc.moveDown(0.3);
          } else if (line.startsWith("## ")) {
            doc.moveDown(0.6);
            doc.font("Helvetica-Bold").fontSize(12).fillColor("#1e293b").text(cleanMarkdownText(line));
            doc.moveDown(0.3);
          } else if (line.startsWith("### ")) {
            doc.moveDown(0.4);
            doc.font("Helvetica-Bold").fontSize(10).fillColor("#334155").text(cleanMarkdownText(line));
            doc.moveDown(0.2);
          } else if (/^[-*+]\s+/.test(line.trim())) {
            // Bullet list item
            const cleanBullet = cleanMarkdownText(line.replace(/^[-*+]\s+/, ""));
            doc.font("Helvetica").fontSize(9.5).fillColor("#334155").text(`•  ${cleanBullet}`, {
              indent: 12,
              lineGap: 2.5,
              width: contentWidth - 12
            });
          } else if (/^\d+\.\s+/.test(line.trim())) {
            // Numbered list item
            const cleanNum = cleanMarkdownText(line);
            doc.font("Helvetica").fontSize(9.5).fillColor("#334155").text(cleanNum, {
              indent: 12,
              lineGap: 2.5,
              width: contentWidth - 12
            });
          } else if (line.trim().startsWith("|")) {
            // Table row: render formatted monospace
            doc.font("Courier").fontSize(8).fillColor("#1e293b").text(line.trim(), { indent: 5 });
          } else {
            // Standard paragraph
            doc.font("Helvetica").fontSize(9.5).fillColor("#334155").text(cleanMarkdownText(line), {
              lineGap: 3,
              width: contentWidth
            });
          }
        }
      });

      // ==========================================
      // 4. BOARDROOM STRATEGIC SYNTHESIS
      // ==========================================
      if (boardroom && boardroom.length > 0) {
        doc.addPage();
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f766e").text("EXECUTIVE BOARDROOM  |  STRATEGIC COUNCIL", { characterSpacing: 1 });
        doc.moveDown(0.3);
        doc.font("Helvetica-Bold").fontSize(18).fillColor("#0f172a").text("Boardroom Debates & Consensus");
        doc.moveDown(0.5);
        doc.rect(54, doc.y, contentWidth, 1).fill("#cbd5e1");
        doc.moveDown(1);

        boardroom.forEach((session, sIdx) => {
          doc.font("Helvetica-Bold").fontSize(12).fillColor("#1e293b").text(`Session ${sIdx + 1}: ${session.title || "Strategic Debate"}`);
          doc.moveDown(0.3);

          doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#475569").text(`Strategic Question: "${session.question}"`);
          doc.moveDown(0.5);

          if (session.consensus) {
            const consensusBoxY = doc.y;
            doc.roundedRect(54, consensusBoxY, contentWidth, 50, 4).fillAndStroke("#ecfdf5", "#a7f3d0");
            doc.font("Helvetica-Bold").fontSize(9).fillColor("#065f46").text("EXECUTIVE CONSENSUS", 66, consensusBoxY + 8);
            doc.font("Helvetica").fontSize(8.5).fillColor("#047857").text(cleanMarkdownText(session.consensus), 66, consensusBoxY + 22, {
              width: contentWidth - 24,
              lineGap: 2
            });
            doc.y = consensusBoxY + 60;
          }

          doc.moveDown(1);
        });
      }

      // ==========================================
      // 5. TWO-PASS HEADERS & FOOTERS (PAGE NUMBERS)
      // ==========================================
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

        // Omit headers and footers on cover page
        if (i === 0) continue;

        // Running Header
        doc.font("Helvetica").fontSize(7.5).fillColor("#94a3b8").text(
          `AI Venture Studio  |  ${project.startupName} — Blueprint`,
          54,
          30,
          { width: contentWidth, align: "left" }
        );
        doc.rect(54, 42, contentWidth, 0.5).fill("#e2e8f0");

        // Running Footer
        doc.rect(54, doc.page.height - 40, contentWidth, 0.5).fill("#e2e8f0");
        doc.font("Helvetica").fontSize(7.5).fillColor("#94a3b8").text(
          "CONFIDENTIAL  —  PREPARED FOR FOUNDER & INVESTORS",
          54,
          doc.page.height - 30,
          { width: contentWidth / 2, align: "left" }
        );
        doc.font("Helvetica-Bold").fontSize(8).fillColor("#64748b").text(
          `Page ${i + 1} of ${range.count}`,
          54 + contentWidth / 2,
          doc.page.height - 30,
          { width: contentWidth / 2, align: "right" }
        );
      }

      // Finalize document stream
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export default { buildVenturePdf };
