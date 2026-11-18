import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

process.env.PORT = "5097";
process.env.CLIENT_URL = "https://ai-venture-studio-pink.vercel.app/";

const { startServer } = await import("../src/index.js");
const { setMemoryMode } = await import("../services/inMemoryStore.js");
const { agentDefinitions } = await import("../agents/agentDefinitions.js");

let server;
const baseUrl = "http://127.0.0.1:5097";

test.before(async () => {
  server = await startServer();
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect().catch(() => {});
});

test("Health and Readiness endpoints respond quickly with structured payloads", async () => {
  const t0 = Date.now();
  const hRes = await fetch(`${baseUrl}/api/health`);
  const elapsed = Date.now() - t0;
  assert.equal(hRes.status, 200);
  assert.ok(elapsed < 1000, `Expected fast health response, got ${elapsed}ms`);
  const h = await hRes.json();
  assert.equal(h.ok, true);
  assert.equal(h.ready, true);
  assert.ok(["mongodb", "memory"].includes(h.database));

  const rRes = await fetch(`${baseUrl}/api/ready`);
  assert.equal(rRes.status, 200);
  const r = await rRes.json();
  assert.equal(r.ok, true);
  assert.equal(r.ready, true);
});

test("CORS allows exact Vercel origin and blocks untrusted origins in production", async () => {
  const preflight = await fetch(`${baseUrl}/api/auth/me`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://ai-venture-studio-pink.vercel.app",
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "Authorization, Content-Type"
    }
  });
  assert.equal(preflight.status, 204);
  assert.equal(
    preflight.headers.get("access-control-allow-origin"),
    "https://ai-venture-studio-pink.vercel.app"
  );

  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const blocked = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: "https://untrusted.example.com" }
    });
    assert.equal(blocked.status, 403);
  } finally {
    process.env.NODE_ENV = prevEnv;
  }
});

test("Auth lifecycle + Projects + Boardroom + Memory + Analytics + Exports + Email regression", async () => {
  const email = `startup_test_${Date.now()}@example.com`;

  // Register
  const reg = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Startup Tester", email, password: "password123" })
  });
  assert.equal(reg.status, 201);
  const regData = await reg.json();
  assert.ok(regData.token);

  // Login
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "password123" })
  });
  assert.equal(login.status, 200);
  const { token, user } = await login.json();

  // /auth/me valid
  const me = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).user.email, email);

  // /auth/me invalid -> 401
  const badMe = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: "Bearer bad.token.value" }
  });
  assert.equal(badMe.status, 401);

  // /auth/me expired -> 401 TOKEN_EXPIRED
  const expiredToken = jwt.sign({ id: user.id, email }, process.env.JWT_SECRET || "replace-me", {
    expiresIn: -5
  });
  const expMe = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${expiredToken}` }
  });
  assert.equal(expMe.status, 401);
  assert.equal((await expMe.json()).code, "TOKEN_EXPIRED");

  // 11 agents intact
  assert.equal(agentDefinitions.length, 11);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };

  // Create & fetch project
  const createRes = await fetch(`${baseUrl}/api/projects`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      startupName: "Reliability Labs",
      idea: "Automated startup diagnostics and cloud observability for seed-stage teams.",
      industry: "DevOps SaaS",
      targetUsers: "Founding engineers",
      country: "United States",
      budget: "$40,000",
      timeline: "4 months"
    })
  });
  assert.equal(createRes.status, 201);
  const project = await createRes.json();
  const projectId = project._id || project.id;
  assert.equal(project.agentRuns.length, 11);

  // List projects (lightweight) & detail (full)
  const listRes = await fetch(`${baseUrl}/api/projects`, { headers: authHeaders });
  assert.equal(listRes.status, 200);
  const list = await listRes.json();
  assert.ok(list.some((p) => String(p._id || p.id) === String(projectId)));

  const detailRes = await fetch(`${baseUrl}/api/projects/${projectId}`, { headers: authHeaders });
  assert.equal(detailRes.status, 200);

  // Update report + memory search + boardroom list + analytics + exports + email
  const putReport = await fetch(`${baseUrl}/api/projects/${projectId}/agents/market/report`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({ content: "# Market Report\n\nCloud observability demand for founding engineers." })
  });
  assert.equal(putReport.status, 200);

  const memRes = await fetch(`${baseUrl}/api/memory/search?q=cloud+observability`, {
    headers: authHeaders
  });
  assert.equal(memRes.status, 200);
  assert.ok((await memRes.json()).count >= 1);

  const brRes = await fetch(`${baseUrl}/api/projects/${projectId}/boardroom`, { headers: authHeaders });
  assert.equal(brRes.status, 200);

  const anOvRes = await fetch(`${baseUrl}/api/analytics/overview`, { headers: authHeaders });
  assert.equal(anOvRes.status, 200);

  const anProjRes = await fetch(`${baseUrl}/api/analytics/projects/${projectId}`, {
    headers: authHeaders
  });
  assert.equal(anProjRes.status, 200);

  const pdfRes = await fetch(`${baseUrl}/api/projects/${projectId}/export/pdf`, { headers: authHeaders });
  assert.equal(pdfRes.status, 200);
  assert.equal(Buffer.from(await pdfRes.arrayBuffer()).subarray(0, 4).toString("utf8"), "%PDF");

  const mdRes = await fetch(`${baseUrl}/api/projects/${projectId}/export/markdown`, { headers: authHeaders });
  assert.equal(mdRes.status, 200);

  const jsonRes = await fetch(`${baseUrl}/api/projects/${projectId}/export/json`, { headers: authHeaders });
  assert.equal(jsonRes.status, 200);

  const emailRes = await fetch(`${baseUrl}/api/projects/${projectId}/email`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ email: "founder@example.com" })
  });
  assert.ok([200, 503].includes(emailRes.status));
});

test("MongoDB unavailable: /api/health returns 200 ready:false, /api/ready and /api/auth/me return 503 (never 401)", async () => {
  await mongoose.disconnect().catch(() => {});
  setMemoryMode(false);

  const healthRes = await fetch(`${baseUrl}/api/health`);
  assert.equal(healthRes.status, 200);
  const health = await healthRes.json();
  assert.equal(health.ok, true);
  assert.equal(health.ready, false);
  assert.equal(health.database, "unavailable");

  const readyRes = await fetch(`${baseUrl}/api/ready`);
  assert.equal(readyRes.status, 503);
  const ready = await readyRes.json();
  assert.equal(ready.ready, false);

  const token = jwt.sign({ id: "000000000000000000000001" }, process.env.JWT_SECRET || "replace-me", {
    expiresIn: "1h"
  });
  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(meRes.status, 503, "Database outage must return 503, never 401");
  assert.equal((await meRes.json()).code, "DATABASE_UNAVAILABLE");
});
