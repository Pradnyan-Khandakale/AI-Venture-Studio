import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { errorHandler } from "../middleware/errorHandler.js";
import { isMemoryMode } from "../services/inMemoryStore.js";
import analyticsRoutes from "../routes/analyticsRoutes.js";
import authRoutes from "../routes/authRoutes.js";
import boardroomRoutes from "../routes/boardroomRoutes.js";
import exportRoutes from "../routes/exportRoutes.js";
import memoryRoutes from "../routes/memoryRoutes.js";
import projectRoutes from "../routes/projectRoutes.js";

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const port = process.env.PORT || 5000;

// CORS configuration: Support CLIENT_URL (Vercel) and CORS_ORIGIN with development fallbacks
const configuredOrigins = [
  ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",") : []),
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : [])
]
  .map((s) => s.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const devOrigins = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, server-to-server, Render health checks)
      if (!origin) return callback(null, true);

      const isDev = process.env.NODE_ENV !== "production";
      const normalizedOrigin = origin.replace(/\/+$/, "");

      if (configuredOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      if (isDev && devOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // In development without explicit config, permit origin
      if (isDev && configuredOrigins.length === 0) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json({ limit: "2mb" }));

// Root and Health check endpoints
app.get("/", (_req, res) => res.json({ ok: true, service: "ai-venture-studio" }));

const healthHandler = (_req, res) => {
  const isMongoConnected = !isMemoryMode() && mongoose.connection.readyState === 1;
  res.json({
    ok: true,
    service: "ai-venture-studio",
    database: isMongoConnected ? "mongodb" : "memory",
    aiProvider: (process.env.AI_PROVIDER || "gemini").toLowerCase().trim()
  });
};

app.get(["/api/health", "/health"], healthHandler);

// Mount API routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/boardroom", boardroomRoutes);
app.use("/api/exports", exportRoutes);
app.use("/api/memory", memoryRoutes);
app.use("/api/analytics", analyticsRoutes);

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
  await connectDatabase();
  const host = "0.0.0.0";
  return app.listen(port, host, () => {
    console.log(`[Server] AI Venture Studio running on http://${host}:${port} (NODE_ENV: ${process.env.NODE_ENV || "development"})`);
  });
}

const isMain =
  process.argv[1] &&
  (fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) ||
    fileURLToPath(import.meta.url).toLowerCase() === path.resolve(process.argv[1]).toLowerCase());
if (isMain) {
  startServer();
}

export default app;

