import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { approveAgent, createProject, emailProject, getProject, listProjects, regenerateAgent, runProject } from "../controllers/projectController.js";

const router = Router();
router.use(requireAuth);
router.get("/", listProjects);
router.post("/", createProject);
router.get("/:id", getProject);
router.post("/:id/run", runProject);
router.post("/:id/email", emailProject);
router.post("/:id/agents/:agentKey/approve", approveAgent);
router.post("/:id/agents/:agentKey/regenerate", regenerateAgent);

export default router;
