import { Router } from "express";
import { queryMemory } from "../controllers/memoryController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);
router.get("/search", queryMemory);

export default router;
