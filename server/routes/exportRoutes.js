import { Router } from "express";
import { exportProject } from "../controllers/exportController.js";

const router = Router();
router.get("/:id/:format", exportProject);

export default router;
