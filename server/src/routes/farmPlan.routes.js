import { Router } from "express";
import { requireRole } from "../middleware/role.middleware.js";
import { getPlan, assignCrop, clearAssignment } from "../controllers/farmPlan.controller.js";

// Farm-level route: GET /api/farms/:farmId/plan
export const farmPlanRouter = Router();
farmPlanRouter.use(requireRole("FARMER"));
farmPlanRouter.get("/:farmId/plan", getPlan);

// Zone-level routes: PUT/DELETE /api/zones/:zoneId/assign
export const zonePlanRouter = Router();
zonePlanRouter.use(requireRole("FARMER"));
zonePlanRouter.put("/:zoneId/assign", assignCrop);
zonePlanRouter.delete("/:zoneId/assign", clearAssignment);
