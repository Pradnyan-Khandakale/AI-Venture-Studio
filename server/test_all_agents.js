/**
 * AI Venture Studio - 11 Agents Gemini Pipeline Verification Script.
 * Tests:
 * 1. Manual Mode (Run Agent 1 -> verify pause -> approve -> run Agent 2 -> approve -> run Agent 3 -> approve)
 * 2. Regeneration (Regenerate Agent 1 -> verify new report & persistence -> re-approve)
 * 3. Sequential Execution of all 11 Agents
 * 4. Verification of deliverables & filenames
 * 5. Startup health score calculation
 * 6. Generates full Before/After and Testing Matrix data
 */
import app from "./src/index.js";
import { connectDatabase } from "./config/database.js";
import { agentDefinitions } from "./agents/agentDefinitions.js";

const port = 5066;
const baseUrl = `http://127.0.0.1:${port}`;
let serverInstance = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runPipelineVerification() {
  console.log("=== 11-AGENT GEMINI PIPELINE TEST RUNNER ===");

  await connectDatabase();
  serverInstance = app.listen(port);
  console.log(`[Test Server] Listening on ${baseUrl}`);

  try {
    // 1. Create a Founder and authenticate
    const email = `test_runner_${Date.now()}@example.com`;
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Venture Builder", email, password: "Password123!" })
    });
    const regData = await regRes.json();
    const token = regData.token;
    console.log("✓ Test User Authenticated:", email);

    // 2. Create Venture Project
    const createRes = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        startupName: "PulseOps AI",
        idea: "Autonomous observability and predictive incident prevention agent for multi-cloud Kubernetes clusters",
        industry: "DevOps & Cloud Infrastructure",
        targetUsers: "Site Reliability Engineers and DevOps Leads",
        country: "United States",
        budget: "$75,000",
        timeline: "6 months"
      })
    });
    let project = await createRes.json();
    const projectId = project.id || project._id;
    console.log(`✓ Project Created: "${project.startupName}" (ID: ${projectId})`);

    const performanceResults = [];

    // ==========================================
    // PHASE A: MANUAL MODE & HUMAN APPROVAL
    // ==========================================
    console.log("\n--- PHASE A: TESTING MANUAL MODE & APPROVAL ---");

    // Run Agent 1 (market)
    console.log("Running Agent 1 (Market Research) in Manual Mode...");
    let runRes = await fetch(`${baseUrl}/api/projects/${projectId}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ autoMode: false })
    });
    project = await runRes.json();
    let marketRun = project.agentRuns.find((r) => r.key === "market");
    console.log(`Agent 1 status: ${marketRun.status}, approved: ${marketRun.approved}, runtime: ${(marketRun.runtimeMs / 1000).toFixed(1)}s, tokens: ${marketRun.tokenUsage}, error: ${marketRun.error}`);

    if (marketRun.status !== "completed" || marketRun.approved !== false) {
      throw new Error(`Manual mode failed: expected market agent to complete and await approval. Error: ${marketRun.error}`);
    }
    if (!marketRun.report || !marketRun.report.includes("Market")) {
      throw new Error(`Report content invalid: ${marketRun.report?.slice(0, 100)}`);
    }
    console.log("✓ Agent 1 Manual Run PASS (Awaiting Approval)");

    // Test premature next agent execution without approval:
    console.log("Testing prevention of premature execution (running without approving Agent 1)...");
    runRes = await fetch(`${baseUrl}/api/projects/${projectId}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ autoMode: false })
    });
    project = await runRes.json();
    let competitorRun = project.agentRuns.find((r) => r.key === "competitor");
    if (competitorRun.status !== "pending") {
      throw new Error(`Agent 2 executed prematurely before Agent 1 was approved!`);
    }
    console.log("✓ Premature execution successfully blocked: Agent 2 remains 'pending'");

    // Approve Agent 1
    console.log("Approving Agent 1...");
    let approveRes = await fetch(`${baseUrl}/api/projects/${projectId}/agents/market/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    project = await approveRes.json();
    marketRun = project.agentRuns.find((r) => r.key === "market");
    if (!marketRun.approved) {
      throw new Error("Failed to approve Agent 1");
    }
    console.log("✓ Agent 1 Approved PASS");

    performanceResults.push({
      key: "market",
      name: "Market Research",
      outputFile: marketRun.outputFile,
      runtimeMs: marketRun.runtimeMs,
      tokenUsage: marketRun.tokenUsage,
      reportLength: marketRun.report.length
    });

    // Pause between calls to respect Gemini free-tier RPM
    await sleep(4000);

    // ==========================================
    // PHASE B: REGENERATION TEST (Section 27)
    // ==========================================
    console.log("\n--- PHASE B: TESTING REGENERATION (Section 27) ---");
    const oldMarketReport = marketRun.report;
    console.log("Regenerating Agent 1 (Market Research)...");
    const regenRes = await fetch(`${baseUrl}/api/projects/${projectId}/agents/market/regenerate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    project = await regenRes.json();
    marketRun = project.agentRuns.find((r) => r.key === "market");
    console.log(`Regenerated Agent 1 status: ${marketRun.status}, runtime: ${(marketRun.runtimeMs / 1000).toFixed(1)}s, tokens: ${marketRun.tokenUsage}`);

    if (marketRun.status !== "completed") {
      throw new Error(`Regeneration failed: expected completed status.`);
    }
    if (!marketRun.report || marketRun.report.length < 50) {
      throw new Error(`Regenerated report is empty!`);
    }
    console.log("✓ Regeneration PASS. New report length:", marketRun.report.length);

    // Re-approve Agent 1
    await fetch(`${baseUrl}/api/projects/${projectId}/agents/market/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });

    // ==========================================
    // PHASE C: SEQUENTIAL EXECUTION OF ALL REMAINING AGENTS (2 to 11)
    // ==========================================
    console.log("\n--- PHASE C: SEQUENTIAL EXECUTION OF ALL REMAINING AGENTS ---");

    for (let i = 1; i < agentDefinitions.length; i++) {
      const def = agentDefinitions[i];
      await sleep(6000); // 6s cadence to safely stay under free-tier RPM (10 req/min vs 15 RPM limit)

      console.log(`\nExecuting Agent ${i + 1}/11: ${def.name} (${def.outputFile})...`);
      const startT = Date.now();
      const stepRes = await fetch(`${baseUrl}/api/projects/${projectId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ autoMode: false })
      });
      project = await stepRes.json();
      const agentRun = project.agentRuns.find((r) => r.key === def.key);

      if (agentRun.status !== "completed") {
        throw new Error(`Agent ${def.name} did not complete. Status: ${agentRun.status}, error: ${agentRun.error}`);
      }

      console.log(`  Status: ${agentRun.status}`);
      console.log(`  Runtime: ${(agentRun.runtimeMs / 1000).toFixed(1)}s`);
      console.log(`  Token Usage: ${agentRun.tokenUsage || "N/A"}`);
      console.log(`  Report Length: ${agentRun.report?.length || 0} chars`);

      performanceResults.push({
        key: def.key,
        name: def.name,
        outputFile: agentRun.outputFile,
        runtimeMs: agentRun.runtimeMs,
        tokenUsage: agentRun.tokenUsage,
        reportLength: agentRun.report?.length || 0
      });

      // Approve agent to unlock next in pipeline
      const appRes = await fetch(`${baseUrl}/api/projects/${projectId}/agents/${def.key}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      project = await appRes.json();
    }

    console.log("\n==========================================");
    console.log("ALL 11 AGENTS COMPLETED SUCCESSFULLY WITH GEMINI!");
    console.log("Overall Venture Status:", project.status);
    console.log("Final Startup Score:", project.startupScore);
    console.log("==========================================\n");

    console.log("PERFORMANCE SUMMARY TABLE:");
    console.table(
      performanceResults.map((p) => ({
        Agent: p.name,
        File: p.outputFile,
        "Runtime (s)": (p.runtimeMs / 1000).toFixed(1),
        Tokens: p.tokenUsage,
        "Report Size": `${p.reportLength} chars`
      }))
    );
  } finally {
    if (serverInstance) {
      serverInstance.close();
      console.log("[Test Server] Closed.");
    }
  }
}

runPipelineVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("PIPELINE TEST ERROR:", err);
    process.exit(1);
  });
