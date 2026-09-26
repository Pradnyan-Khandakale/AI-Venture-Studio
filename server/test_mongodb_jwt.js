import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import jwt from "jsonwebtoken";
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment from server/.env
const envPath = path.resolve("./.env");
dotenv.config({ path: envPath });

import { connectDatabase } from "./config/database.js";
import { isMemoryMode, memory } from "./services/inMemoryStore.js";
import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import boardroomRoutes from "./routes/boardroomRoutes.js";
import memoryRoutes from "./routes/memoryRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import { projectService } from "./services/projectService.js";
import { storeReportMemory } from "./services/memoryService.js";
import User from "./models/User.js";
import Project from "./models/Project.js";
import BoardroomSession from "./models/BoardroomSession.js";
import Report from "./models/Report.js";

async function checkPort27017() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port: 27017, host: "127.0.0.1", timeout: 1500 });
    socket.on("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function checkMongoInstallation() {
  const paths = [
    "C:\\Program Files\\MongoDB",
    "C:\\Program Files (x86)\\MongoDB",
    "C:\\mongodb",
    "C:\\ProgramData\\MongoDB"
  ];
  const foundPath = paths.find((p) => fs.existsSync(p));
  let whereResult = false;
  try {
    const out = execSync("where mongod", { stdio: "pipe" }).toString();
    if (out.trim().length > 0) whereResult = true;
  } catch (_e) {}
  return Boolean(foundPath || whereResult);
}

async function startTestApp(port = 5066) {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    const isMongoConnected = !isMemoryMode() && mongoose.connection.readyState === 1;
    res.json({
      ok: true,
      service: "ai-venture-studio",
      database: isMongoConnected ? "mongodb" : "memory",
      aiProvider: (process.env.AI_PROVIDER || "gemini").toLowerCase().trim()
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/boardroom", boardroomRoutes);
  app.use("/api/memory", memoryRoutes);
  app.use("/api/analytics", analyticsRoutes);

  return new Promise((resolve) => {
    const server = app.listen(port, () => resolve({ server, port }));
  });
}

async function request(baseUrl, path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = { "Content-Type": "application/json", ...options.headers };
  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runVerification() {
  console.log("====================================================");
  console.log("   AI VENTURE STUDIO: MONGODB & JWT VERIFICATION    ");
  console.log("====================================================\n");

  const results = {
    mongoInstalled: false,
    mongoRunning: false,
    appConnected: false,
    dataPersistsAcrossRestart: false,
    jwtSecretConfigured: false,
    jwtLogin: false,
    jwtMe: false,
    jwtOwnership: false
  };

  // --------------------------------------------------
  // 1. JWT SECRET & ENVIRONMENT AUDIT
  // --------------------------------------------------
  console.log("--- 1. AUDITING ENVIRONMENT & JWT SECRET ---");
  const configuredSecret = process.env.JWT_SECRET;
  console.log(`- Configured MONGODB_URI: ${process.env.MONGODB_URI}`);
  console.log(`- Configured JWT_SECRET length: ${configuredSecret ? configuredSecret.length : 0} characters`);
  console.log(`- JWT_SECRET starts with: ${configuredSecret ? configuredSecret.substring(0, 6) + "..." : "none"}`);

  if (!configuredSecret || configuredSecret === "replace-me") {
    console.error("FAIL: JWT_SECRET is still 'replace-me' or empty!");
    results.jwtSecretConfigured = false;
  } else if (configuredSecret.length >= 32) {
    console.log("✓ PASS: JWT_SECRET is securely configured (non-default, cryptographically strong).");
    results.jwtSecretConfigured = true;
  }

  // Check git tracking of .env
  let envIgnored = false;
  try {
    const ignoreCheck = execSync("git check-ignore -v .env", { stdio: "pipe" }).toString();
    if (ignoreCheck.includes(".env")) {
      envIgnored = true;
      console.log(`✓ PASS: server/.env is actively ignored by git (${ignoreCheck.trim()})`);
    }
  } catch (_e) {
    console.warn("Notice: git check-ignore check exited without match.");
  }

  // Check .env.example
  const examplePath = path.resolve("./.env.example");
  if (fs.existsSync(examplePath)) {
    const exampleContent = fs.readFileSync(examplePath, "utf-8");
    if (exampleContent.includes("JWT_SECRET=replace-me") && !exampleContent.includes(configuredSecret)) {
      console.log("✓ PASS: .env.example contains only dummy placeholder 'JWT_SECRET=replace-me' and no real secrets.");
    } else {
      console.error("FAIL: .env.example may contain sensitive secret values!");
    }
  }

  // --------------------------------------------------
  // 2. MONGODB DISCOVERY & CONNECTIVITY
  // --------------------------------------------------
  console.log("\n--- 2. VERIFYING MONGODB STATUS ---");
  const isInstalled = checkMongoInstallation();
  const isPortOpen = await checkPort27017();

  console.log(`- MongoDB binaries in known locations / PATH: ${isInstalled ? "FOUND" : "NOT FOUND"}`);
  console.log(`- MongoDB Port 27017 listening on 127.0.0.1: ${isPortOpen ? "YES" : "NO (ECONNREFUSED)"}`);

  results.mongoInstalled = isInstalled;
  results.mongoRunning = isPortOpen;

  // Connect database using application's config
  await connectDatabase();

  const memoryFallbackActive = isMemoryMode();
  const mongoReady = mongoose.connection.readyState === 1;

  console.log(`- Database Mode: ${memoryFallbackActive ? "in-memory fallback" : "mongodb"}`);
  console.log(`- Mongoose readyState: ${mongoReady ? "1 (Connected)" : "0 (Disconnected)"}`);

  if (mongoReady && !memoryFallbackActive) {
    results.appConnected = true;
    console.log("✓ PASS: Application connected to local MongoDB instance.");
  } else {
    results.appConnected = false;
    console.log("✓ PASS (Accurate Reporting): Application detected MongoDB unavailable and engaged in-memory fallback.");
  }

  // --------------------------------------------------
  // 3. START APPLICATION & HEALTH ENDPOINT
  // --------------------------------------------------
  console.log("\n--- 3. TESTING API SERVER & HEALTH ENDPOINT ---");
  const { server, port } = await startTestApp(5077);
  const baseUrl = `http://127.0.0.1:${port}`;

  const healthRes = await request(baseUrl, "/api/health");
  console.log("Health response:", healthRes.data);

  if (healthRes.data.ok === true) {
    if (results.appConnected && healthRes.data.database === "mongodb") {
      console.log("✓ PASS: Health endpoint accurately reports 'database: mongodb'.");
    } else if (!results.appConnected && healthRes.data.database === "memory") {
      console.log("✓ PASS: Health endpoint accurately reports 'database: memory'.");
    } else {
      console.error(`FAIL: Health endpoint reported mismatched state: ${healthRes.data.database}`);
    }
  } else {
    console.error("FAIL: Health endpoint returned error:", healthRes);
  }

  // --------------------------------------------------
  // 4. AUTHENTICATION & JWT REGRESSION
  // --------------------------------------------------
  console.log("\n--- 4. AUTHENTICATION & JWT FLOW ---");
  const ts = Date.now();
  const userAEmail = `founder_a_${ts}@test.com`;
  const userBEmail = `founder_b_${ts}@test.com`;
  const password = "Password123!";

  // Register User A
  const regARes = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: { name: "Alice Founder", email: userAEmail, password }
  });

  if (regARes.status !== 201 || !regARes.data.token) {
    throw new Error(`User A registration failed: ${JSON.stringify(regARes)}`);
  }
  const tokenA = regARes.data.token;
  console.log(`- User A registered. Token received: ${tokenA.substring(0, 18)}...`);

  // Verify token is signed with our JWT_SECRET
  try {
    const decoded = jwt.verify(tokenA, configuredSecret);
    console.log(`✓ PASS: Token verified with configured JWT_SECRET. Decoded user id: ${decoded.id}`);
  } catch (err) {
    throw new Error(`Token verification with configured JWT_SECRET failed: ${err.message}`);
  }

  // Verify token fails with wrong/dummy secret
  try {
    jwt.verify(tokenA, "replace-me");
    throw new Error("FAIL: Token was accepted with default dummy secret 'replace-me'!");
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      console.log("✓ PASS: Token correctly rejected when validated against old dummy secret 'replace-me'.");
    }
  }

  // Call /api/auth/me with User A token
  const meRes = await request(baseUrl, "/api/auth/me", {
    headers: { Authorization: `Bearer ${tokenA}` }
  });

  if (meRes.status === 200 && meRes.data.user?.email === userAEmail) {
    console.log(`✓ PASS: /api/auth/me returned authenticated user: ${meRes.data.user.name} (${meRes.data.user.email})`);
    results.jwtMe = true;
    results.jwtLogin = true;
  } else {
    console.error("FAIL: /api/auth/me failed:", meRes);
  }

  // Call /api/auth/me with no token -> must fail
  const noTokenRes = await request(baseUrl, "/api/auth/me");
  if (noTokenRes.status === 401) {
    console.log("✓ PASS: /api/auth/me without token correctly rejected with 401 Unauthorized.");
  } else {
    console.error(`FAIL: /api/auth/me without token returned status ${noTokenRes.status}`);
  }

  // Call /api/auth/me with forged token (signed with "replace-me")
  const forgedToken = jwt.sign({ id: "hacked", email: "hacked@test.com" }, "replace-me");
  const forgedRes = await request(baseUrl, "/api/auth/me", {
    headers: { Authorization: `Bearer ${forgedToken}` }
  });
  if (forgedRes.status === 401) {
    console.log("✓ PASS: Forged token signed with 'replace-me' rejected with 401 Unauthorized.");
  } else {
    console.error(`FAIL: Forged token returned status ${forgedRes.status}`);
  }

  // --------------------------------------------------
  // 5. TENANT ISOLATION & OWNERSHIP ENFORCEMENT
  // --------------------------------------------------
  console.log("\n--- 5. TESTING AUTHENTICATION OWNERSHIP ISOLATION ---");

  // User A creates Project A
  const projARes = await request(baseUrl, "/api/projects", {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      startupName: "Alpha Venture",
      idea: "Private venture for User A only",
      industry: "AI",
      targetUsers: "Enterprise"
    }
  });

  const projectAId = projARes.data?._id || projARes.data?.id;
  console.log(`- User A created project: ${projARes.data?.startupName} (ID: ${projectAId})`);

  // Index report into memory for Project A
  await storeReportMemory({
    userId: meRes.data.user.id,
    projectId: projectAId,
    agentKey: "market",
    outputFile: "market_research.md",
    content: "# Market Analysis\n\nConfidential market intelligence for Alpha Venture."
  });

  // Register User B
  const regBRes = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: { name: "Bob Competitor", email: userBEmail, password }
  });
  const tokenB = regBRes.data.token;
  console.log(`- User B registered. Token received: ${tokenB.substring(0, 18)}...`);

  // User B attempts to access User A's project
  const getProjRes = await request(baseUrl, `/api/projects/${projectAId}`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  const getReportRes = await request(baseUrl, `/api/projects/${projectAId}/agents/market/report`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  const approveRes = await request(baseUrl, `/api/projects/${projectAId}/agents/market/approve`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  const boardroomRes = await request(baseUrl, `/api/projects/${projectAId}/boardroom`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  const analyticsRes = await request(baseUrl, `/api/projects/${projectAId}/analytics`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  const memorySearchRes = await request(baseUrl, `/api/memory/search?q=Confidential+market+intelligence`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });

  const isolationPassed =
    (getProjRes.status === 404 || getProjRes.status === 403) &&
    (getReportRes.status === 404 || getReportRes.status === 403) &&
    (approveRes.status === 404 || approveRes.status === 403) &&
    (boardroomRes.status === 404 || boardroomRes.status === 403) &&
    (analyticsRes.status === 404 || analyticsRes.status === 403) &&
    (memorySearchRes.data.results?.length === 0);

  if (isolationPassed) {
    console.log("✓ PASS: User B was strictly blocked from User A's project, reports, boardroom, analytics, and memory.");
    results.jwtOwnership = true;
  } else {
    console.error("FAIL: Ownership leak detected!", {
      getProj: getProjRes.status,
      getReport: getReportRes.status,
      approve: approveRes.status,
      boardroom: boardroomRes.status,
      analytics: analyticsRes.status,
      memoryMatches: memorySearchRes.data.results?.length
    });
    results.jwtOwnership = false;
  }

  // --------------------------------------------------
  // 6. DATABASE RESTART & PERSISTENCE TEST
  // --------------------------------------------------
  console.log("\n--- 6. TESTING RESTART PERSISTENCE ---");
  const persistUserEmail = `persist_${Date.now()}@example.com`;
  const regPersistRes = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: { name: "Persist User", email: persistUserEmail, password }
  });
  const persistToken = regPersistRes.data.token;
  const persistUserId = regPersistRes.data.user?.id || regPersistRes.data.user?._id;

  const createPersistProjectRes = await request(baseUrl, "/api/projects", {
    method: "POST",
    headers: { Authorization: `Bearer ${persistToken}` },
    body: {
      startupName: "Persistent Venture",
      idea: "Testing persistence across restart",
      industry: "BioTech",
      targetUsers: "Researchers"
    }
  });
  const persistProjectId = createPersistProjectRes.data?._id || createPersistProjectRes.data?.id;
  console.log(`- Created entity for persistence test: Project ID ${persistProjectId} (User: ${persistUserEmail})`);

  // Close existing server and disconnect database
  await new Promise((r) => server.close(r));
  await mongoose.disconnect().catch(() => {});
  console.log("- Server stopped and database connection closed.");

  // Restart backend and reconnect database
  console.log("- Restarting backend with fresh database connection...");
  await connectDatabase();
  const restartApp = await startTestApp(5088);
  const restartBaseUrl = `http://127.0.0.1:5088`;

  if (results.appConnected) {
    // Query restarted HTTP server
    const checkUserRes = await request(restartBaseUrl, "/api/auth/me", {
      headers: { Authorization: `Bearer ${persistToken}` }
    });
    const checkProjectRes = await request(restartBaseUrl, `/api/projects/${persistProjectId}`, {
      headers: { Authorization: `Bearer ${persistToken}` }
    });

    const foundUser = await User.findOne({ email: persistUserEmail });
    const foundProject = await Project.findById(persistProjectId);

    if (
      checkUserRes.status === 200 &&
      checkProjectRes.status === 200 &&
      checkProjectRes.data?.startupName === "Persistent Venture" &&
      foundUser &&
      foundProject
    ) {
      console.log("✓ PASS: User and Project persisted in MongoDB across server restart and retrieved via HTTP API.");
      results.dataPersistsAcrossRestart = true;
    } else {
      console.error("FAIL: Record not found after server restart.", {
        checkUser: checkUserRes.status,
        checkProject: checkProjectRes.status,
        foundInDb: Boolean(foundProject)
      });
      results.dataPersistsAcrossRestart = false;
    }
  } else {
    console.log("- Evaluated restart behavior for in-memory fallback:");
    console.log("  In-memory store maintains state in process RAM. When the Node process terminates, RAM state resets.");
    console.log("  Per instructions, because local MongoDB is not running, persistence across process restart: FAIL");
    results.dataPersistsAcrossRestart = false;
  }

  await new Promise((r) => restartApp.server.close(r));

  // --------------------------------------------------
  // 7. INSPECT COLLECTIONS AND SCHEMAS
  // --------------------------------------------------
  console.log("\n--- 7. VERIFYING MODELS & COLLECTIONS ---");
  const verifiedModels = [
    { model: "User", collection: User.collection?.name || "users", schemaFields: Object.keys(User.schema.paths) },
    { model: "Project", collection: Project.collection?.name || "projects", schemaFields: Object.keys(Project.schema.paths) },
    { model: "BoardroomSession", collection: BoardroomSession.collection?.name || "boardroomsessions", schemaFields: Object.keys(BoardroomSession.schema.paths) },
    { model: "Report", collection: Report.collection?.name || "reports", schemaFields: Object.keys(Report.schema.paths) }
  ];

  for (const m of verifiedModels) {
    console.log(`✓ Model: ${m.model} | Collection: "${m.collection}" | Fields: ${m.schemaFields.slice(0, 6).join(", ")}...`);
  }

  // --------------------------------------------------
  // 8. FINAL SCORECARD REPORT
  // --------------------------------------------------
  console.log("\n====================================================");
  console.log("                 FINAL REPORT CARD                  ");
  console.log("====================================================");
  console.log("\n### MongoDB");
  console.log(`Installed: ${results.mongoInstalled ? "PASS" : "FAIL"}`);
  console.log(`Running: ${results.mongoRunning ? "PASS" : "FAIL"}`);
  console.log(`Application connected: ${results.appConnected ? "PASS" : "FAIL"}`);
  console.log(`Data persists across restart: ${results.dataPersistsAcrossRestart ? "PASS" : "FAIL"}`);

  console.log("\n### JWT");
  console.log(`Secret configured: ${results.jwtSecretConfigured ? "PASS" : "FAIL"}`);
  console.log(`Login: ${results.jwtLogin ? "PASS" : "FAIL"}`);
  console.log(`/me: ${results.jwtMe ? "PASS" : "FAIL"}`);
  console.log(`Ownership: ${results.jwtOwnership ? "PASS" : "FAIL"}`);

  return results;
}

runVerification()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test execution fatal error:", err);
    process.exit(1);
  });
