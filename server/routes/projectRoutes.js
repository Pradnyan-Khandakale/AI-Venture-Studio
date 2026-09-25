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

const router = Router();
router.use(requireAuth);
router.get("/", listProjects);
router.post("/", createProject);
router.get("/:id", getProject);
router.post("/:id/run", runProject);
router.post("/:id/email", emailProject);
router.post("/:id/agents/:agentKey/approve", approveAgent);
router.post("/:id/agents/:agentKey/regenerate", regenerateAgent);
router.get("/:id/agents/:agentKey/report", getAgentReport);
router.put("/:id/agents/:agentKey/report", updateAgentReport);

export default router;
