import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const {
  classifyMongoError,
  connectDatabase,
  getDatabaseStatus,
  parseAndValidateMongoUri,
  resetDatabaseStateForTests,
  sanitizeMongoErrorMessage,
  scheduleDatabaseReconnect,
  stopDatabaseReconnect
} = await import("../config/database.js");

const { setMemoryMode } = await import("../services/inMemoryStore.js");
const { startServer } = await import("../src/index.js");

test("1. URI validation detects missing, whitespace, quotes, placeholders, scheme, malformed, and prod localhost", () => {
  // Missing
  const missing = parseAndValidateMongoUri("", { isProduction: true });
  assert.equal(missing.valid, false);
  assert.equal(missing.code, "URI_MISSING");

  // Internal whitespace / newline
  const ws = parseAndValidateMongoUri("mongodb+srv://user:pass@cluster0.example.mongodb.net/db\nextra", {
    isProduction: true
  });
  assert.equal(ws.valid, false);
  assert.equal(ws.code, "URI_WHITESPACE");

  // Invalid scheme
  const scheme = parseAndValidateMongoUri("https://cluster0.example.mongodb.net/db", {
    isProduction: true
  });
  assert.equal(scheme.valid, false);
  assert.equal(scheme.code, "URI_INVALID_SCHEME");

  // Unreplaced placeholders
  const placeholder = parseAndValidateMongoUri(
    "mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/ai-venture-studio",
    { isProduction: true }
  );
  assert.equal(placeholder.valid, false);
  assert.equal(placeholder.code, "URI_PLACEHOLDER");

  // Localhost rejected in production
  const localProd = parseAndValidateMongoUri("mongodb://127.0.0.1:27017/ai-venture-studio", {
    isProduction: true
  });
  assert.equal(localProd.valid, false);
  assert.equal(localProd.code, "URI_LOCALHOST_IN_PRODUCTION");

  // Trims accidental surrounding quotes + outer whitespace and exposes ONLY safe host (no credentials!)
  const quoted = parseAndValidateMongoUri(
    '  "mongodb+srv://appuser:superSecret123@cluster0.validhost.mongodb.net/ai-venture-studio?retryWrites=true"  ',
    { isProduction: true }
  );
  assert.equal(quoted.valid, true);
  assert.equal(quoted.hadQuotes, true);
  assert.equal(quoted.hadOuterWhitespace, true);
  assert.equal(quoted.host, "cluster0.validhost.mongodb.net");
  assert.equal(quoted.isSrv, true);
  assert.equal(quoted.dbName, "ai-venture-studio");
});

test("2. Error sanitizer redacts credentials and classifies querySrv ENOTFOUND accurately", () => {
  const redacted = sanitizeMongoErrorMessage(
    "Failed connecting to mongodb+srv://myuser:topSecretPass!@cluster0.bad.mongodb.net/db"
  );
  assert.ok(!redacted.includes("topSecretPass"));
  assert.ok(!redacted.includes("myuser"));
  assert.ok(redacted.includes("***:***@cluster0.bad.mongodb.net"));

  const dnsDiag = classifyMongoError(
    Object.assign(new Error("querySrv ENOTFOUND _mongodb._tcp.cluster0.k4z7vza.mongodb.net"), {
      code: "ENOTFOUND"
    }),
    "cluster0.k4z7vza.mongodb.net"
  );
  assert.equal(dnsDiag.code, "DNS_ENOTFOUND");
  assert.equal(dnsDiag.maxRetries, 2);
  assert.ok(dnsDiag.logMessage.includes("DNS resolution failed"));
  assert.ok(dnsDiag.logMessage.includes("cluster0.k4z7vza.mongodb.net"));
  assert.ok(dnsDiag.logMessage.includes("CORS and Atlas IP allowlist changes cannot resolve a DNS ENOTFOUND error"));
});

test("3. Failed DNS resolution in production: does NOT fall back to memory, fails fast, exposes clear status, bounded reconnect", async () => {
  const prevEnv = process.env.NODE_ENV;
  const prevUri = process.env.MONGODB_URI;
  const prevAllow = process.env.ALLOW_IN_MEMORY_PRODUCTION;

  await mongoose.disconnect().catch(() => {});
  setMemoryMode(false);
  resetDatabaseStateForTests();

  process.env.NODE_ENV = "production";
  process.env.ALLOW_IN_MEMORY_PRODUCTION = "false";
  process.env.MONGODB_URI =
    "mongodb+srv://dummyuser:dummypass@cluster0.k4z7vza.mongodb.net/ai-venture-studio?retryWrites=true&w=majority";

  try {
    let caught = null;
    try {
      await connectDatabase({ timeoutMsOverride: 3000 });
    } catch (err) {
      caught = err;
    }

    assert.ok(caught, "Production DNS ENOTFOUND must reject (not silently fall back to memory)");
    assert.equal(caught.code, "DNS_ENOTFOUND");
    assert.ok(!caught.message.includes("dummypass"), "Credentials must never appear in error message");

    const status = getDatabaseStatus();
    assert.equal(status.ready, false);
    assert.equal(status.mode, "unavailable", "Production must NEVER switch to in-memory mode");
    assert.equal(status.errorCode, "DNS_ENOTFOUND");

    // Verify bounded reconnection and deduplication (no duplicate timers)
    const firstScheduled = scheduleDatabaseReconnect({ delayMs: 60000, maxRetries: 2 });
    const duplicateScheduled = scheduleDatabaseReconnect({ delayMs: 60000, maxRetries: 2 });
    assert.equal(firstScheduled, true);
    assert.equal(duplicateScheduled, false, "Duplicate reconnect timer must be prevented");
    stopDatabaseReconnect();
  } finally {
    stopDatabaseReconnect();
    process.env.NODE_ENV = prevEnv;
    if (prevUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = prevUri;
    if (prevAllow === undefined) delete process.env.ALLOW_IN_MEMORY_PRODUCTION;
    else process.env.ALLOW_IN_MEMORY_PRODUCTION = prevAllow;
  }
});

test("4. Production Express starts independently when DNS fails: /api/health=200, /api/ready=503, /api/auth/me & /api/projects=503 fast", async () => {
  const prevEnv = process.env.NODE_ENV;
  const prevUri = process.env.MONGODB_URI;
  const prevPort = process.env.PORT;
  const prevClient = process.env.CLIENT_URL;

  await mongoose.disconnect().catch(() => {});
  setMemoryMode(false);
  resetDatabaseStateForTests();

  process.env.NODE_ENV = "production";
  process.env.PORT = "5096";
  process.env.CLIENT_URL = "https://ai-venture-studio-pink.vercel.app";
  process.env.MONGODB_URI =
    "mongodb+srv://dummyuser:dummypass@cluster0.k4z7vza.mongodb.net/ai-venture-studio";

  const server = await startServer();
  const baseUrl = "http://127.0.0.1:5096";

  try {
    // Allow background DNS lookup to settle quickly
    await new Promise((r) => setTimeout(r, 600));

    // /api/health MUST respond 200 quickly even while MongoDB is unavailable
    const t0 = Date.now();
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    assert.ok(Date.now() - t0 < 1000, "Health endpoint must respond immediately");
    const health = await healthRes.json();
    assert.equal(health.ok, true);
    assert.equal(health.ready, false);
    assert.equal(health.database, "unavailable");

    // /api/ready MUST return 503
    const readyRes = await fetch(`${baseUrl}/api/ready`);
    assert.equal(readyRes.status, 503);
    const ready = await readyRes.json();
    assert.equal(ready.ready, false);

    // /api/auth/me MUST return 503 fast (never hang, never 401)
    const token = jwt.sign({ id: "000000000000000000000001" }, process.env.JWT_SECRET || "replace-me", {
      expiresIn: "1h"
    });
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(meRes.status, 503);
    assert.equal((await meRes.json()).code, "DATABASE_UNAVAILABLE");

    // /api/projects MUST return 503 fast (never hang)
    const projRes = await fetch(`${baseUrl}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(projRes.status, 503);
    assert.equal((await projRes.json()).code, "DATABASE_UNAVAILABLE");
  } finally {
    stopDatabaseReconnect();
    await new Promise((resolve) => server.close(resolve));
    process.env.NODE_ENV = prevEnv;
    if (prevUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = prevUri;
    if (prevPort === undefined) delete process.env.PORT;
    else process.env.PORT = prevPort;
    if (prevClient === undefined) delete process.env.CLIENT_URL;
    else process.env.CLIENT_URL = prevClient;
  }
});

test("5. Successful MongoDB connection restores ready:true and /api/ready=200", async () => {
  await mongoose.disconnect().catch(() => {});
  setMemoryMode(false);
  resetDatabaseStateForTests();

  const conn = await connectDatabase({
    uriOverride: "mongodb://127.0.0.1:27017/ai-venture-studio",
    timeoutMsOverride: 3000
  });
  const status = getDatabaseStatus();
  assert.equal(status.ready, true);
  assert.equal(status.mode, conn ? "mongodb" : "memory");
  assert.equal(status.errorCode, null);

  await mongoose.disconnect().catch(() => {});
});
