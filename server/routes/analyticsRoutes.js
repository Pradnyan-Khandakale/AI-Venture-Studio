import { Router } from "express";
import { overview, projectAnalytics } from "../controllers/analyticsController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/overview", overview);
router.get("/projects/:projectId", projectAnalytics);

export default router;
