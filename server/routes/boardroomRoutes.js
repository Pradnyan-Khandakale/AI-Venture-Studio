import { Router } from "express";
import { debate } from "../controllers/boardroomController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);
router.post("/debate", debate);

export default router;
