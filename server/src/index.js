import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import {
  connectDatabase,
  getDatabaseStatus,
  scheduleDatabaseReconnect
} from "../config/database.js";
import { requireDatabaseReady } from "../middleware/databaseReady.js";
import { errorHandler } from "../middleware/errorHandler.js";
import analyticsRoutes from "../routes/analyticsRoutes.js";
import authRoutes from "../routes/authRoutes.js";
import boardroomRoutes from "../routes/boardroomRoutes.js";
import exportRoutes from "../routes/exportRoutes.js";
import memoryRoutes from "../routes/memoryRoutes.js";
import projectRoutes from "../routes/projectRoutes.js";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const port = Number(process.env.PORT) || 5000;

// Render runs behind a reverse proxy; trust the first proxy hop for accurate client IPs
app.set("trust proxy", 1);

function normalizeOrigin(origin) {
  return String(origin || "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\/+$/, "");
}

function getAllowedOrigins() {
  const raw = [
    ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",") : []),
    ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : []),
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : [])
  ];
  return Array.from(new Set(raw.map(normalizeOrigin).filter(Boolean)));
}

const devOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, server-to-server, Render health checks)
    if (!origin) return callback(null, true);

    const isDev = process.env.NODE_ENV !== "production";
    const normalizedOrigin = normalizeOrigin(origin);
    const configuredOrigins = getAllowedOrigins();

    if (configuredOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    if (isDev && devOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    // In local development without explicit config, permit origin
    if (isDev && configuredOrigins.length === 0) {
      return callback(null, true);
    }

    console.warn(
      `[CORS] Blocked origin "${normalizedOrigin}". Configured origins: [${configuredOrigins.join(", ") || "none"}]`
    );
    const corsError = new Error(`Origin ${origin} not allowed by CORS policy`);
    corsError.status = 403;
    return callback(corsError);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  exposedHeaders: ["Content-Disposition"],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json({ limit: "2mb" }));

// Root and lightweight liveness / readiness endpoints (no DB queries or AI calls)
app.get("/", (_req, res) => res.json({ ok: true, service: "ai-venture-studio" }));

const healthHandler = (req, res) => {
  const db = getDatabaseStatus();
  res.setHeader("Cache-Control", "no-store");
  console.log(`[Health] ${req.method} ${req.originalUrl} -> 200 (ready=${db.ready}, database=${db.mode}, state=${db.state})`);
  res.json({
    ok: true,
    ready: db.ready,
    service: "ai-venture-studio",
    database: db.mode,
    databaseState: db.state,
    aiProvider: (process.env.AI_PROVIDER || "gemini").toLowerCase().trim(),
    uptimeSeconds: Math.floor(process.uptime())
  });
};

const readyHandler = (req, res) => {
  const db = getDatabaseStatus();
  res.setHeader("Cache-Control", "no-store");
  if (!db.ready) {
    console.warn(`[Ready] ${req.method} ${req.originalUrl} -> 503 (database=${db.mode}, state=${db.state})`);
    scheduleDatabaseReconnect();
    return res.status(503).json({
      ok: false,
      ready: false,
      service: "ai-venture-studio",
      database: db.mode,
      state: db.state,
      message: "Backend is online, but the database is not yet ready."
    });
  }

  console.log(`[Ready] ${req.method} ${req.originalUrl} -> 200 (database=${db.mode})`);
  return res.json({
    ok: true,
    ready: true,
    service: "ai-venture-studio",
    database: db.mode,
    aiProvider: (process.env.AI_PROVIDER || "gemini").toLowerCase().trim(),
    uptimeSeconds: Math.floor(process.uptime())
  });
};

app.get(["/api/health", "/health"], healthHandler);
app.get(["/api/ready", "/ready"], readyHandler);

// Mount DB-backed API routes behind database readiness guard
app.use("/api/auth", requireDatabaseReady, authRoutes);
app.use("/api/projects", requireDatabaseReady, projectRoutes);
app.use("/api/boardroom", requireDatabaseReady, boardroomRoutes);
app.use("/api/exports", requireDatabaseReady, exportRoutes);
app.use("/api/memory", requireDatabaseReady, memoryRoutes);
app.use("/api/analytics", requireDatabaseReady, analyticsRoutes);

// 404 handler for unmatched routes
app.use((req, _res, next) => {
  const error = new Error(`Cannot ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
});

// Centralized error handling
app.use(errorHandler);

process.on("unhandledRejection", (reason) => {
  console.error("[Server UnhandledRejection]", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[Server UncaughtException]", error);
});

// Database connection & Server initialization
export async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";
  const configuredOrigins = getAllowedOrigins();

  if (isProduction && configuredOrigins.length === 0) {
    console.warn(
      "[CORS] WARNING: CLIENT_URL is not configured in production. Cross-origin browser requests from Vercel will be rejected until CLIENT_URL is set."
    );
  }

  const host = "0.0.0.0";
  const listenPort = Number(process.env.PORT) || port;

  // Bind HTTP port immediately so Render liveness checks (/api/health) never hang waiting on MongoDB
  const server = await new Promise((resolve, reject) => {
    const srv = app.listen(listenPort, host, () => {
      const db = getDatabaseStatus();
      console.log(
        `[Server] AI Venture Studio listening on http://${host}:${listenPort} (NODE_ENV: ${process.env.NODE_ENV || "development"}, database: ${db.mode}, ready: ${db.ready})`
      );
      resolve(srv);
    });
    srv.on("error", reject);
  });

  // Connect to MongoDB: non-blocking in production so Express responds immediately while DB connects;
  // awaited in development/tests so local callers have DB initialized when startServer() resolves.
  const dbConnectTask = connectDatabase().catch((error) => {
    console.error("[Server] Initial database connection failed:", error?.message || error);
    scheduleDatabaseReconnect();
  });

  if (!isProduction) {
    await dbConnectTask;
  }

  return server;
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    const currentFile = fs.realpathSync(fileURLToPath(import.meta.url));
    const entryFile = fs.realpathSync(path.resolve(process.argv[1]));
    return currentFile === entryFile || currentFile.toLowerCase() === entryFile.toLowerCase();
  } catch {
    const currentFile = fileURLToPath(import.meta.url);
    const entryFile = path.resolve(process.argv[1]);
    return currentFile === entryFile || currentFile.toLowerCase() === entryFile.toLowerCase();
  }
}

if (isMainModule()) {
  startServer().catch((err) => {
    console.error("[Server] Fatal startup error:", err);
    process.exit(1);
  });
}

export default app;

