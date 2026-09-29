import { Router } from "express";
import * as farmController from "../controllers/farm.controller.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();

router.use(requireRole("FARMER"));

router.post("/", farmController.createFarm);
router.get("/", farmController.getFarms);
router.get("/:id", farmController.getFarmById);
router.delete("/:id", farmController.deleteFarm);
router.post("/:id/zones", farmController.saveZones);
router.get("/:id/zones", farmController.getZones);

export default router;
