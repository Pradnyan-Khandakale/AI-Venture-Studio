import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  approveAgent,
  createProject,
  emailProject,
  getAgentReport,
  getProject,
  listProjects,
  regenerateAgent,
  runProject,
  updateAgentReport
} from "../controllers/projectController.js";
import { exportProject } from "../controllers/exportController.js";
import { debate, getSession, listSessions } from "../controllers/boardroomController.js";
import { projectAnalytics } from "../controllers/analyticsController.js";
import { aiRunRateLimiter, emailRateLimiter, exportRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();
router.use(requireAuth);

router.get("/", listProjects);
router.post("/", createProject);
router.get("/:id", getProject);

// AI execution with rate limiting & duplicate trigger protection
router.post("/:id/run", aiRunRateLimiter, runProject);

// Phase 8: Export & Delivery Routes
router.get("/:id/export/:format", exportRateLimiter, exportProject);
router.post("/:id/email", emailRateLimiter, emailProject);

// Human Approval and Regeneration Routes
router.post("/:id/agents/:agentKey/approve", approveAgent);
router.post("/:id/agents/:agentKey/regenerate", regenerateAgent);
router.get("/:id/agents/:agentKey/report", getAgentReport);
router.put("/:id/agents/:agentKey/report", updateAgentReport);

// Phase 7: Project Analytics Route
router.get("/:id/analytics", projectAnalytics);

// Phase 6: Boardroom Executive Council Routes
router.post("/:id/boardroom", debate);
router.get("/:id/boardroom", listSessions);
router.get("/:id/boardroom/:sessionId", getSession);

export default router;
