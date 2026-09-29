import { Router } from "express";
import { getRecipe, getFinancial } from "../controllers/farmCalculations.controller.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();

router.use(requireRole("FARMER"));
router.get("/:zoneId/calculations/recipe", getRecipe);
router.get("/:zoneId/calculations/financial", getFinancial);

export default router;
