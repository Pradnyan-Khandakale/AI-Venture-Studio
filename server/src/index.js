import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { connectDatabase } from "../config/database.js";
import { errorHandler } from "../middleware/errorHandler.js";
import { isMemoryMode } from "../services/inMemoryStore.js";
import analyticsRoutes from "../routes/analyticsRoutes.js";
import authRoutes from "../routes/authRoutes.js";
import boardroomRoutes from "../routes/boardroomRoutes.js";
import exportRoutes from "../routes/exportRoutes.js";
import memoryRoutes from "../routes/memoryRoutes.js";
import projectRoutes from "../routes/projectRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim()) : true,
    credentials: true
  })
);

app.use(express.json({ limit: "2mb" }));

// Root and Health check endpoints
app.get("/", (_req, res) => res.json({ ok: true, service: "ai-venture-studio" }));

const healthHandler = (_req, res) => {
  res.json({
    ok: true,
    service: "ai-venture-studio",
    database: isMemoryMode() ? "memory" : "mongodb"
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


// Database connection & Server initialization
async function startServer() {
  await connectDatabase();
  app.listen(port, () => {
    console.log(`[Server] AI Venture Studio running on http://localhost:${port}`);
  });
}

startServer();

export default app;

