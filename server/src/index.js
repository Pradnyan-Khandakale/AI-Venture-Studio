import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { connectDatabase } from "../config/database.js";
import { errorHandler } from "../middleware/errorHandler.js";
import analyticsRoutes from "../routes/analyticsRoutes.js";
import authRoutes from "../routes/authRoutes.js";
import boardroomRoutes from "../routes/boardroomRoutes.js";
import exportRoutes from "../routes/exportRoutes.js";
import memoryRoutes from "../routes/memoryRoutes.js";
import projectRoutes from "../routes/projectRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/", (_req, res) => res.json({ ok: true, service: "ai-venture-studio" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "ai-venture-studio" });
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/boardroom", boardroomRoutes);
app.use("/api/exports", exportRoutes);
app.use("/api/memory", memoryRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use(errorHandler);

connectDatabase().then(() => {
  app.listen(port, () => console.log(`AI Venture Studio server running on http://localhost:${port}`));
});
