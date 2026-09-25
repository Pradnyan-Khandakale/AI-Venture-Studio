import { Router } from "express";
import { debate, getSession, listSessions } from "../controllers/boardroomController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.post("/debate", debate);
router.get("/", listSessions);
router.get("/:id", getSession);

export default router;
