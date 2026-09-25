/**
 * AI Venture Studio - Gemini Provider & System Test Suite.
 * Validates:
 * 1. Health check & provider detection
 * 2. Auth flow (Register, Login, Me)
 * 3. Project creation & retrieval
 * 4. Controlled Failure Handling (Section 28)
 * 5. Controlled Rate-Limit Retry Handling (Section 29)
 * 6. Provider switching (Ollama fallback) (Section 32)
 * 7. Security invariants (Section 30)
 */
import app from "./src/index.js";
import { connectDatabase } from "./config/database.js";
import { generateText, getActiveProvider, getProviderInfo } from "./services/llmService.js";
import { projectService } from "./services/projectService.js";
import { runNextAgent } from "./workflows/agentWorkflow.js";

let serverInstance = null;
const port = 5055;
const baseUrl = `http://127.0.0.1:${port}`;

async function runTests() {
  console.log("=== STARTING AI VENTURE STUDIO TEST SUITE ===");

  await connectDatabase();

  // Start temporary test server
  serverInstance = app.listen(port);
  console.log(`[Test Server] Listening on ${baseUrl}`);

  try {
    // 1. Health check test
    console.log("\n--- TEST 1: Health Check ---");
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    console.log("Health response:", healthData);
    if (!healthData.ok || healthData.service !== "ai-venture-studio" || healthData.aiProvider !== "gemini") {
      throw new Error(`Health check failed: ${JSON.stringify(healthData)}`);
    }
    console.log("✓ Health check PASS");

    // 2. Auth Flow (Register, Login, Me)
    console.log("\n--- TEST 2: Authentication Flow ---");
    const testEmail = `founder_${Date.now()}@example.com`;
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Founder",
        email: testEmail,
        password: "Password123!"
      })
    });
    const regData = await regRes.json();
    if (!regRes.ok || !regData.token) {
      throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
    }
    const token = regData.token;
    console.log("✓ Registration PASS");

    // Auth Me
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const meData = await meRes.json();
    const userEmail = meData.user?.email || meData.email;
    if (!meRes.ok || userEmail !== testEmail) {
      throw new Error(`Auth me check failed: ${JSON.stringify(meData)}`);
    }
    console.log("✓ Auth Me verification PASS");

    // 3. Project Creation
    console.log("\n--- TEST 3: Project Management ---");
    const createRes = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        startupName: "CloudPulse AI",
        idea: "Autonomous observability and predictive incident prevention agent for multi-cloud Kubernetes clusters",
        industry: "DevOps & Cloud Infrastructure",
        targetUsers: "Site Reliability Engineers and DevOps Leads",
        country: "United States",
        budget: "$50,000",
        timeline: "6 months"
      })
    });
    const projectData = await createRes.json();
    if (!createRes.ok || !projectData.id && !projectData._id) {
      throw new Error(`Project creation failed: ${JSON.stringify(projectData)}`);
    }
    const projectId = projectData.id || projectData._id;
    console.log("✓ Project creation PASS. Project ID:", projectId);
    console.log("  Initial Agent Runs count:", projectData.agentRuns?.length);

    // 4. Rate-Limit Test (Section 29: Controlled 429 RESOURCE_EXHAUSTED simulation)
    console.log("\n--- TEST 4: Rate-Limit Simulation & Exponential Backoff (Section 29) ---");
    let rateLimitCaught = false;
    try {
      await generateText("Test prompt", {
        _simulateRateLimit: true,
        maxRetries: 2,
        baseDelayMs: 300
      });
    } catch (err) {
      rateLimitCaught = true;
      console.log("Caught expected rate-limit error:", err.message);
      if (err.status !== 429) {
        throw new Error(`Expected HTTP status 429, got ${err.status}`);
      }
      if (!err.message.includes("429") && !err.message.includes("RESOURCE_EXHAUSTED")) {
        throw new Error(`Expected rate limit message, got: ${err.message}`);
      }
    }
    if (!rateLimitCaught) {
      throw new Error("Rate limit simulation did not throw!");
    }
    console.log("✓ Rate-limit recognition & bounded retry PASS");

    // 5. Auth / Invalid API Key Test (Section 28)
    console.log("\n--- TEST 5: Auth Error Handling (Section 28) ---");
    let authErrorCaught = false;
    try {
      await generateText("Test prompt", { _simulateAuthError: true });
    } catch (err) {
      authErrorCaught = true;
      console.log("Caught expected auth error:", err.message);
      if (err.status !== 401) {
        throw new Error(`Expected HTTP status 401, got ${err.status}`);
      }
      if (!err.message.includes("Gemini API authentication failed")) {
        throw new Error(`Expected specific auth message, got: ${err.message}`);
      }
    }
    if (!authErrorCaught) {
      throw new Error("Simulated auth error did not throw!");
    }
    console.log("✓ Auth error handling PASS");

    // 6. Workflow Failure Handling & Graceful UI Error State (Section 28)
    console.log("\n--- TEST 6: Workflow Failure Recovery ---");
    // Run an agent with simulated failure to ensure project and agent mark as 'failed' gracefully without crashing server
    process.env.SIMULATE_GEMINI_RATE_LIMIT = "true";
    try {
      const runRes = await fetch(`${baseUrl}/api/projects/${projectId}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ autoMode: false })
      });
      const runData = await runRes.json();
      console.log("Project run status after rate-limit:", runData.status);
      const marketAgent = runData.agentRuns?.find((r) => r.key === "market");
      console.log("Market Agent status:", marketAgent?.status, "| error:", marketAgent?.error);

      if (marketAgent?.status !== "failed" || !marketAgent?.error?.includes("429")) {
        throw new Error(`Expected market agent to be in 'failed' status with 429 error. Got: ${JSON.stringify(marketAgent)}`);
      }
    } finally {
      delete process.env.SIMULATE_GEMINI_RATE_LIMIT;
    }
    console.log("✓ Workflow failure recovery PASS: Server remained stable and agent transitioned to 'failed' with structured diagnostic");

    // 7. Ollama Provider Fallback Test (Section 32)
    console.log("\n--- TEST 7: Provider Switching to Ollama (Section 32) ---");
    process.env.AI_PROVIDER = "ollama";
    console.log("Active Provider now:", getActiveProvider());
    if (getActiveProvider() !== "ollama") {
      throw new Error("Failed to switch AI_PROVIDER to ollama");
    }
    // Attempt generation with Ollama with short timeout
    try {
      await generateText("Test prompt", { timeoutMs: 300 });
    } catch (ollamaErr) {
      console.log("Ollama route called as expected, error message:", ollamaErr.message);
      if (!ollamaErr.message.includes("Ollama")) {
        throw new Error(`Expected Ollama-specific error, got: ${ollamaErr.message}`);
      }
    }
    process.env.AI_PROVIDER = "gemini";
    console.log("✓ Provider switching PASS");

    // 8. Security Checks (Section 30)
    console.log("\n--- TEST 8: Security Invariants (Section 30) ---");
    const testSecret = "AIzaSyTestSecretKey_NeverCommit_998877";
    process.env.GEMINI_API_KEY = testSecret;
    try {
      // Simulate auth error
      await generateText("Test prompt", { _simulateAuthError: true });
    } catch (secErr) {
      if (secErr.message.includes(testSecret)) {
        throw new Error("SECURITY VIOLATION: Secret leaked in error message!");
      }
      console.log("✓ Secret not leaked in error message");
    }
    // Check info endpoint / public metadata
    const info = getProviderInfo();
    const infoStr = JSON.stringify(info);
    if (infoStr.includes(testSecret)) {
      throw new Error("SECURITY VIOLATION: Secret leaked in provider info!");
    }
    console.log("✓ Secret not exposed in provider info");
    delete process.env.GEMINI_API_KEY;

    console.log("\n==========================================");
    console.log("ALL TEST SUITE CHECKS COMPLETED SUCCESSFULLY!");
    console.log("==========================================\n");
  } finally {
    if (serverInstance) {
      serverInstance.close();
      console.log("[Test Server] Closed.");
    }
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("TEST FAILED:", err);
    process.exit(1);
  });
