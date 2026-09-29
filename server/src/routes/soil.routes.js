import { Router } from "express";
import {
  getSoilReport,
  getSoilSummary,
  soilAccessGuard,
  upsertSoilReport,
} from "../controllers/soil.controller.js";

const router = Router();

router.use(...soilAccessGuard);

router.post("/:farmId/zones/:zoneId/soil", upsertSoilReport);
router.get("/:farmId/zones/:zoneId/soil", getSoilReport);
router.get("/:farmId/soil-summary", getSoilSummary);

export default router;
