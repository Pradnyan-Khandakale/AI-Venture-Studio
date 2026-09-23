import { Router } from "express";
import { overview } from "../controllers/analyticsController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);
router.get("/", overview);

export default router;
