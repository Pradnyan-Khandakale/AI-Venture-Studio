import app from "./src/index.js";
import { connectDatabase } from "./config/database.js";

const port = 5077;
const baseUrl = `http://127.0.0.1:${port}`;

async function testAutoMode() {
  console.log("=== TESTING AUTO MODE PIPELINE ===");
  await connectDatabase();
  const server = app.listen(port);

  try {
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Auto Mode Founder", email: `auto_${Date.now()}@example.com`, password: "Password123!" })
    });
    const { token } = await regRes.json();

    const createRes = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        startupName: "FinPulse AI",
        idea: "AI autonomous treasury and cash-flow optimization engine for SaaS startups",
        industry: "Fintech",
        targetUsers: "CFOs and startup founders",
        country: "United States",
        budget: "$100,000",
        timeline: "4 months"
      })
    });
    const project = await createRes.json();
    const projectId = project.id || project._id;
    console.log(`Created project: ${project.startupName} (${projectId})`);

    console.log("Triggering Auto Mode run...");
    const runRes = await fetch(`${baseUrl}/api/projects/${projectId}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ autoMode: true })
    });
    const updated = await runRes.json();

    const runs = updated.agentRuns || [];
    const completedRuns = runs.filter((r) => r.status === "completed");
    console.log(`Auto Mode executed ${completedRuns.length} agents in sequence!`);
    for (const r of completedRuns) {
      console.log(`✓ Agent ${r.name} (${r.outputFile}): status=${r.status}, approved=${r.approved}, runtime=${(r.runtimeMs / 1000).toFixed(1)}s, tokens=${r.tokenUsage}`);
    }
    if (completedRuns.length < 2) {
      throw new Error("Auto Mode did not automatically advance across multiple agents!");
    }
    console.log("✓ Auto Mode Verification SUCCESSFUL");
  } finally {
    server.close();
  }
}

testAutoMode().catch((err) => {
  console.error("Auto Mode test failed:", err);
  process.exit(1);
});
