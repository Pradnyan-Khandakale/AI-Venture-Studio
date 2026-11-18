import mongoose from "mongoose";
import { isMemoryMode, seedMemoryStore, setMemoryMode } from "../services/inMemoryStore.js";
import { seedDemoUser } from "../utils/seed.js";

const MONGOOSE_STATE_LABELS = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting"
};

const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;
const DNS_MAX_RECONNECT_ATTEMPTS = 2;
const INITIAL_RECONNECT_DELAY_MS = 10000;
const MAX_RECONNECT_DELAY_MS = 60000;

let listenersAttached = false;
let lastDatabaseError = null;
let lastErrorCode = null;
let lastPublicMessage = null;
let lastHost = null;
let lastMaxRetries = DEFAULT_MAX_RECONNECT_ATTEMPTS;
let connectPromise = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
let reconnectExhausted = false;

/**
 * Strips any credentials from error messages in case an upstream driver includes a URI.
 */
export function sanitizeMongoErrorMessage(message) {
  return String(message || "Unknown database error").replace(
    /(mongodb(?:\+srv)?:\/\/)([^@\s/]+)@/gi,
    "$1***:***@"
  );
}

/**
 * Parses and validates MONGODB_URI safely without exposing credentials.
 */
export function parseAndValidateMongoUri(rawUri, { isProduction = false } = {}) {
  const original = typeof rawUri === "string" ? rawUri : "";
  const trimmed = original.trim();
  const hadOuterWhitespace = original !== trimmed;
  const hadQuotes =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  const cleaned = hadQuotes ? trimmed.slice(1, -1).trim() : trimmed;

  if (!cleaned) {
    return {
      valid: false,
      code: "URI_MISSING",
      host: null,
      message: "MONGODB_URI is not set. Configure MONGODB_URI in Render Environment Variables.",
      publicMessage: "Database configuration is missing on the server."
    };
  }

  if (/\s/.test(cleaned)) {
    return {
      valid: false,
      code: "URI_WHITESPACE",
      host: null,
      message:
        "MONGODB_URI contains unexpected internal whitespace or line breaks. Re-paste a clean connection string in Render Environment Variables.",
      publicMessage: "Database connection string is malformed."
    };
  }

  if (!/^mongodb(\+srv)?:\/\//i.test(cleaned)) {
    return {
      valid: false,
      code: "URI_INVALID_SCHEME",
      host: null,
      message:
        "MONGODB_URI must begin with mongodb:// or mongodb+srv://. Verify the value set in Render Environment Variables.",
      publicMessage: "Database connection string has an invalid scheme."
    };
  }

  if (/<username>|<password>|<cluster/i.test(cleaned)) {
    return {
      valid: false,
      code: "URI_PLACEHOLDER",
      host: null,
      message:
        "MONGODB_URI still contains placeholder tokens (<username>, <password>, or <cluster>). Replace them with real values in Render Environment Variables.",
      publicMessage: "Database connection string contains unreplaced placeholders."
    };
  }

  let parsed;
  try {
    parsed = new URL(cleaned);
  } catch {
    return {
      valid: false,
      code: "URI_MALFORMED",
      host: null,
      message:
        "MONGODB_URI could not be parsed as a valid URL. If your database password contains special characters (@, :, /, ?, #, %), URL-encode them in Render Environment Variables.",
      publicMessage: "Database connection string is malformed."
    };
  }

  const host = parsed.hostname || "";
  if (!host) {
    return {
      valid: false,
      code: "URI_MISSING_HOST",
      host: null,
      message: "MONGODB_URI is missing a database cluster hostname.",
      publicMessage: "Database connection string is missing a hostname."
    };
  }

  const isLocalHost =
    host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1";
  if (isProduction && isLocalHost) {
    return {
      valid: false,
      code: "URI_LOCALHOST_IN_PRODUCTION",
      host,
      message:
        "MONGODB_URI points to localhost in production. Configure a valid MongoDB Atlas connection string in Render Environment Variables.",
      publicMessage: "Production database cannot target localhost."
    };
  }

  return {
    valid: true,
    uri: cleaned,
    host,
    protocol: parsed.protocol,
    isSrv: parsed.protocol === "mongodb+srv:",
    dbName: parsed.pathname.replace(/^\//, "") || "(default)",
    hadOuterWhitespace,
    hadQuotes
  };
}

/**
 * Classifies MongoDB connection errors into actionable diagnostics without leaking secrets.
 */
export function classifyMongoError(error, host = null) {
  const safeMsg = sanitizeMongoErrorMessage(error?.message || "Failed to connect to MongoDB");
  const lower = safeMsg.toLowerCase();
  const errCode = String(error?.code || "").toUpperCase();
  const hostLabel = host || "configured MongoDB host";

  if (
    errCode === "ENOTFOUND" ||
    errCode === "EAI_AGAIN" ||
    lower.includes("querysrv enotfound") ||
    lower.includes("enotfound") ||
    lower.includes("getaddrinfo")
  ) {
    return {
      code: "DNS_ENOTFOUND",
      retryable: true,
      maxRetries: DNS_MAX_RECONNECT_ATTEMPTS,
      logMessage: `DNS resolution failed (${safeMsg}) for host "${hostLabel}". The MongoDB Atlas cluster hostname does not resolve in DNS (stale/deleted cluster or typo in MONGODB_URI). Update MONGODB_URI in Render Environment Variables with the current Atlas connection string — note that CORS and Atlas IP allowlist changes cannot resolve a DNS ENOTFOUND error.`,
      publicMessage: "Database cluster hostname could not be resolved. Please try again shortly."
    };
  }

  if (
    error?.code === 8000 ||
    error?.code === 18 ||
    lower.includes("authentication failed") ||
    lower.includes("bad auth") ||
    lower.includes("auth failed")
  ) {
    return {
      code: "AUTH_FAILED",
      retryable: false,
      maxRetries: 0,
      logMessage: `MongoDB authentication failed for host "${hostLabel}" (${safeMsg}). Verify database username/password in Render MONGODB_URI and ensure special characters in the password are URL-encoded.`,
      publicMessage: "Database authentication failed. Please contact the administrator."
    };
  }

  if (
    lower.includes("timed out") ||
    lower.includes("server selection") ||
    errCode === "ETIMEDOUT" ||
    errCode === "ECONNREFUSED" ||
    errCode === "ECONNRESET"
  ) {
    return {
      code: "CONNECTION_TIMEOUT",
      retryable: true,
      maxRetries: DEFAULT_MAX_RECONNECT_ATTEMPTS,
      logMessage: `Could not reach MongoDB host "${hostLabel}" (${safeMsg}). Verify the Atlas cluster is active (not paused) and MongoDB Atlas Network Access allows outbound Render connections (0.0.0.0/0).`,
      publicMessage: "Database is temporarily unreachable. Please try again shortly."
    };
  }

  return {
    code: "CONNECTION_FAILED",
    retryable: true,
    maxRetries: DEFAULT_MAX_RECONNECT_ATTEMPTS,
    logMessage: `Failed to connect to MongoDB host "${hostLabel}" (${safeMsg}).`,
    publicMessage: "The database is temporarily unavailable. Please try again in a moment."
  };
}

function attachConnectionListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on("connected", () => {
    lastDatabaseError = null;
    lastErrorCode = null;
    lastPublicMessage = null;
    reconnectAttempts = 0;
    reconnectExhausted = false;
    stopDatabaseReconnect();
    console.log(`[Database] MongoDB connection established${lastHost ? ` (host=${lastHost})` : ""}.`);
  });

  mongoose.connection.on("reconnected", () => {
    lastDatabaseError = null;
    lastErrorCode = null;
    lastPublicMessage = null;
    reconnectAttempts = 0;
    reconnectExhausted = false;
    stopDatabaseReconnect();
    console.log(`[Database] MongoDB connection re-established${lastHost ? ` (host=${lastHost})` : ""}.`);
  });

  mongoose.connection.on("error", (err) => {
    const safeMsg = sanitizeMongoErrorMessage(err?.message || "MongoDB connection error");
    lastDatabaseError = safeMsg;
    console.error("[Database] MongoDB connection error:", safeMsg);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[Database] MongoDB connection disconnected.");
  });
}

export function isDatabaseReady() {
  if (isMemoryMode()) {
    return true;
  }
  return mongoose.connection.readyState === 1;
}

export function getDatabaseStatus() {
  if (isMemoryMode()) {
    return {
      ready: true,
      mode: "memory",
      state: "connected",
      errorCode: null,
      publicMessage: null,
      lastError: null,
      reconnectAttempts: 0,
      reconnectExhausted: false
    };
  }

  const readyState = mongoose.connection.readyState;
  const ready = readyState === 1;

  return {
    ready,
    mode: ready ? "mongodb" : "unavailable",
    state: MONGOOSE_STATE_LABELS[readyState] || "unknown",
    errorCode: ready ? null : lastErrorCode,
    publicMessage: ready
      ? null
      : lastPublicMessage || "The database is temporarily unavailable. Please try again in a moment.",
    lastError: ready ? null : lastDatabaseError,
    reconnectAttempts,
    reconnectExhausted
  };
}

export function stopDatabaseReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

/**
 * Schedules a bounded, single-flight background reconnection attempt in production.
 * - Never creates duplicate timers or concurrent loops.
 * - Does not retry non-retryable configuration/auth errors.
 * - Stops cleanly after maxRetries so logs/DNS are not flooded indefinitely.
 */
export function scheduleDatabaseReconnect({
  delayMs = INITIAL_RECONNECT_DELAY_MS,
  maxRetries = lastMaxRetries
} = {}) {
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction) return false;
  if (isDatabaseReady() || reconnectTimer || connectPromise || reconnectExhausted) {
    return false;
  }

  if (maxRetries <= 0 || reconnectAttempts >= maxRetries) {
    if (!reconnectExhausted) {
      reconnectExhausted = true;
      console.error(
        `[Database] Automatic reconnection stopped after ${reconnectAttempts} attempt(s) (code=${lastErrorCode || "UNKNOWN"}). Update MONGODB_URI in Render Environment Variables and redeploy.`
      );
    }
    return false;
  }

  const nextAttempt = reconnectAttempts + 1;
  const boundedDelay = Math.min(Math.max(1000, delayMs), MAX_RECONNECT_DELAY_MS);
  console.warn(
    `[Database] Scheduling bounded MongoDB Atlas reconnect attempt ${nextAttempt}/${maxRetries} in ${Math.round(boundedDelay / 1000)}s...`
  );

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    if (isDatabaseReady() || connectPromise) return;

    reconnectAttempts += 1;
    console.log(
      `[Database] Executing scheduled MongoDB Atlas reconnect attempt ${reconnectAttempts}/${maxRetries}...`
    );

    try {
      await connectDatabase();
    } catch {
      if (reconnectAttempts >= lastMaxRetries) {
        reconnectExhausted = true;
        console.error(
          `[Database] Bounded reconnection exhausted (${reconnectAttempts}/${lastMaxRetries}, code=${lastErrorCode || "UNKNOWN"}). Express remains online for /api/health while DB routes return 503 until MONGODB_URI/Atlas is restored.`
        );
      } else {
        scheduleDatabaseReconnect({
          delayMs: Math.min(Math.round(boundedDelay * 1.5), MAX_RECONNECT_DELAY_MS),
          maxRetries: lastMaxRetries
        });
      }
    }
  }, boundedDelay);

  if (typeof reconnectTimer.unref === "function") {
    reconnectTimer.unref();
  }

  return true;
}

export async function connectDatabase({ uriOverride, timeoutMsOverride } = {}) {
  if (mongoose.connection.readyState === 1) {
    setMemoryMode(false);
    lastDatabaseError = null;
    lastErrorCode = null;
    lastPublicMessage = null;
    return mongoose.connection;
  }

  if (connectPromise) {
    return connectPromise;
  }

  attachConnectionListeners();

  const isProduction = process.env.NODE_ENV === "production";
  const allowMemoryProd = process.env.ALLOW_IN_MEMORY_PRODUCTION === "true";
  const rawUri =
    uriOverride !== undefined
      ? uriOverride
      : process.env.MONGODB_URI || (isProduction ? "" : "mongodb://127.0.0.1:27017/ai-venture-studio");

  const validation = parseAndValidateMongoUri(rawUri, { isProduction });

  if (!validation.valid) {
    lastHost = validation.host || null;
    lastDatabaseError = validation.message;
    lastErrorCode = validation.code;
    lastPublicMessage = validation.publicMessage;
    lastMaxRetries = 0;
    reconnectExhausted = true;

    console.error(`[Database] CRITICAL (${validation.code}): ${validation.message}`);

    if (isProduction && !allowMemoryProd) {
      const err = new Error(validation.message);
      err.code = validation.code;
      throw err;
    }

    setMemoryMode(true);
    lastDatabaseError = null;
    lastErrorCode = null;
    lastPublicMessage = null;
    await mongoose.disconnect().catch(() => {});
    console.warn("[Database] Invalid local MongoDB URI. Activating in-memory development fallback.");
    await seedMemoryStore();
    return null;
  }

  if (validation.hadQuotes || validation.hadOuterWhitespace) {
    console.warn(
      "[Database] Notice: Trimmed surrounding whitespace/quotes from MONGODB_URI. Consider cleaning the value in Render Environment Variables."
    );
  }

  lastHost = validation.host;
  const timeoutMs = timeoutMsOverride ?? (isProduction ? 10000 : 3000);

  connectPromise = (async () => {
    console.log(
      `[Database] Connecting to MongoDB (${isProduction ? "Production/Atlas" : "Local"}, host=${validation.host}, srv=${validation.isSrv}, db=${validation.dbName}, timeout=${timeoutMs}ms)...`
    );

    try {
      await mongoose.connect(validation.uri, {
        serverSelectionTimeoutMS: timeoutMs,
        connectTimeoutMS: timeoutMs,
        socketTimeoutMS: 30000,
        maxPoolSize: 10
      });

      setMemoryMode(false);
      lastDatabaseError = null;
      lastErrorCode = null;
      lastPublicMessage = null;
      reconnectAttempts = 0;
      reconnectExhausted = false;
      stopDatabaseReconnect();

      console.log(
        `[Database] Connected to MongoDB successfully. Mode: mongodb (host=${validation.host}, env=${isProduction ? "Production/Atlas" : "Local"})`
      );

      // Seed demo user without blocking readiness
      seedDemoUser().catch((seedErr) => {
        console.warn("[Database] Demo user seed skipped:", sanitizeMongoErrorMessage(seedErr?.message));
      });

      return mongoose.connection;
    } catch (error) {
      const diagnosis = classifyMongoError(error, validation.host);
      lastDatabaseError = sanitizeMongoErrorMessage(error?.message || diagnosis.logMessage);
      lastErrorCode = diagnosis.code;
      lastPublicMessage = diagnosis.publicMessage;
      lastMaxRetries = diagnosis.retryable ? diagnosis.maxRetries : 0;

      if (!diagnosis.retryable) {
        reconnectExhausted = true;
      }

      if (isProduction && !allowMemoryProd) {
        console.error(`[Database] CRITICAL (${diagnosis.code}): ${diagnosis.logMessage}`);
        const wrapped = new Error(diagnosis.logMessage);
        wrapped.code = diagnosis.code;
        throw wrapped;
      }

      setMemoryMode(true);
      lastDatabaseError = null;
      lastErrorCode = null;
      lastPublicMessage = null;
      await mongoose.disconnect().catch(() => {});
      console.warn(
        `[Database] Local MongoDB connection failed (${diagnosis.code}: ${sanitizeMongoErrorMessage(error?.message)}). Activating in-memory development mode fallback.`
      );
      await seedMemoryStore();
      return null;
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
}

export function resetDatabaseStateForTests() {
  stopDatabaseReconnect();
  lastDatabaseError = null;
  lastErrorCode = null;
  lastPublicMessage = null;
  lastHost = null;
  lastMaxRetries = DEFAULT_MAX_RECONNECT_ATTEMPTS;
  connectPromise = null;
  reconnectAttempts = 0;
  reconnectExhausted = false;
}
