import mongoose from "mongoose";
import { isMemoryMode, seedMemoryStore, setMemoryMode } from "../services/inMemoryStore.js";
import { seedDemoUser } from "../utils/seed.js";

const MONGOOSE_STATE_LABELS = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting"
};

let listenersAttached = false;
let lastDatabaseError = null;
let connectPromise = null;
let reconnectTimer = null;

function attachConnectionListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on("connected", () => {
    lastDatabaseError = null;
    console.log("[Database] MongoDB connection established.");
  });

  mongoose.connection.on("reconnected", () => {
    lastDatabaseError = null;
    console.log("[Database] MongoDB connection re-established.");
  });

  mongoose.connection.on("error", (err) => {
    lastDatabaseError = err?.message || "MongoDB connection error";
    console.error("[Database] MongoDB connection error:", lastDatabaseError);
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
      lastError: null
    };
  }

  const readyState = mongoose.connection.readyState;
  const ready = readyState === 1;

  return {
    ready,
    mode: ready ? "mongodb" : "unavailable",
    state: MONGOOSE_STATE_LABELS[readyState] || "unknown",
    lastError: ready ? null : lastDatabaseError
  };
}

export function scheduleDatabaseReconnect(delayMs = 10000) {
  if (reconnectTimer || isDatabaseReady()) return;
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction) return;

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    if (isDatabaseReady()) return;
    console.log("[Database] Attempting scheduled MongoDB Atlas reconnection...");
    try {
      await connectDatabase();
    } catch (_err) {
      scheduleDatabaseReconnect(Math.min(delayMs * 1.5, 60000));
    }
  }, delayMs);

  // Do not keep Node process alive solely because of a reconnect timer
  if (typeof reconnectTimer.unref === "function") {
    reconnectTimer.unref();
  }
}

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    setMemoryMode(false);
    lastDatabaseError = null;
    return mongoose.connection;
  }

  if (connectPromise) {
    return connectPromise;
  }

  attachConnectionListeners();

  const isProduction = process.env.NODE_ENV === "production";
  const allowMemoryProd = process.env.ALLOW_IN_MEMORY_PRODUCTION === "true";
  const uri = (process.env.MONGODB_URI || (isProduction ? "" : "mongodb://127.0.0.1:27017/ai-venture-studio")).trim();

  if (isProduction && (!uri || uri.includes("127.0.0.1") || uri.includes("localhost"))) {
    const errorMsg =
      "[Database] CRITICAL: MONGODB_URI must be set to a valid remote MongoDB Atlas connection string in production.";
    lastDatabaseError = errorMsg;
    console.error(errorMsg);
    if (!allowMemoryProd) {
      throw new Error(errorMsg);
    }
  }

  const timeoutMs = isProduction ? 10000 : 3000;

  connectPromise = (async () => {
    try {
      await mongoose.connect(uri || "mongodb://127.0.0.1:27017/ai-venture-studio", {
        serverSelectionTimeoutMS: timeoutMs,
        connectTimeoutMS: timeoutMs,
        socketTimeoutMS: 45000,
        maxPoolSize: 10
      });
      setMemoryMode(false);
      lastDatabaseError = null;
      console.log(
        `[Database] Connected to MongoDB successfully. Mode: mongodb (${isProduction ? "Production/Atlas" : "Local"})`
      );
      await seedDemoUser();
      return mongoose.connection;
    } catch (error) {
      lastDatabaseError = error?.message || "Failed to connect to MongoDB";

      if (isProduction && !allowMemoryProd) {
        console.error(`[Database] CRITICAL: Failed to connect to MongoDB Atlas (${lastDatabaseError}).`);
        console.error(
          "[Database] Ensure MONGODB_URI is valid and MongoDB Atlas Network Access allows 0.0.0.0/0 for Render."
        );
        throw error;
      }

      setMemoryMode(true);
      lastDatabaseError = null;
      await mongoose.disconnect().catch(() => {});
      console.warn(
        `[Database] MongoDB connection failed (${error.message}). Activating in-memory development mode fallback.`
      );
      console.log("[Database] Mode: in-memory fallback (development mode)");
      await seedMemoryStore();
      return null;
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
}


