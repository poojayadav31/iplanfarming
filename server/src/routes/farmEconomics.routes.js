import { Router } from "express";
import { getEconomics, getWeeklyEconomicsHandler, getFinancials, saveFinancials } from "../controllers/farmEconomics.controller.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();

router.get("/:farmId/economics",            requireRole("FARMER"), getEconomics);
router.get("/:farmId/economics/weekly",     requireRole("FARMER"), getWeeklyEconomicsHandler);
router.get("/:farmId/economics/financials", requireRole("FARMER"), getFinancials);
router.put("/:farmId/economics/financials", requireRole("FARMER"), saveFinancials);

export default router;
