import { Router } from "express";
import * as designerCtrl from "../controllers/designer.controller.js";

const router = Router({ mergeParams: true });

// Farm-specific design endpoints: /api/farms/:farmId/designs
router.get("/:farmId/designs", designerCtrl.listDesigns);
router.post("/:farmId/designs", designerCtrl.createDesign);
router.get("/:farmId/designs/:designId", designerCtrl.getDesign);
router.put("/:farmId/designs/:designId", designerCtrl.updateDesign);
router.patch("/:farmId/designs/:designId", designerCtrl.updateDesign);
router.delete("/:farmId/designs/:designId", designerCtrl.deleteDesign);
router.post("/:farmId/designs/:designId/duplicate", designerCtrl.duplicateDesign);

export default router;
