import { Router } from "express";
import { getZoneRecommendations } from "../controllers/crop.controller.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();

router.use(requireRole("FARMER"));
router.get("/:zoneId/recommendations", getZoneRecommendations);

export default router;
