import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { exportRateLimiter } from "../middleware/rateLimiter.js";
import { exportProject } from "../controllers/exportController.js";

const router = Router();

// Phase 8: Authenticated & rate-limited export endpoints
router.use(requireAuth);
router.get("/:id/:format", exportRateLimiter, exportProject);

export default router;
