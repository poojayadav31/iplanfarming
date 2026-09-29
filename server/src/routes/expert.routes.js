import { Router } from "express";
import * as adminCtrl from "../controllers/expert.controller.js";
import {
  overview,
  allFarms,
  allSoilReports,
  cropEconomics,
  patchCropEconomics,
  crops,
  patchCrop,
  addCrop,
  addCropEconomics,
  patchSoilReport,
  soilCropRefs,
  addSoilCropRef,
  removeSoilCropRef,
  patchFarmFinancials,
  advisories,
  postAdvisory,
  removeAdvisory,
  addFarmTask,
  suggestions,
  postSuggestion,
  removeSuggestion,
  farmerAdvisories,
  farmerSuggestions,
  respondSuggestion,
  lifecycleTemplates,
  addLifecycleTemplate,
  patchLifecycleTemplate,
  removeLifecycleTemplate,
} from "../controllers/expert.controller.js";

const router = Router();

// ─── Expert-only routes ───────────────────────────────────────────────────────
router.get("/overview",                      overview);
router.get("/farms",                         allFarms);
router.get("/soil-reports",                  allSoilReports);
router.get("/crop-economics",                cropEconomics);
router.post("/crop-economics",               addCropEconomics);
router.patch("/crop-economics/:id",          patchCropEconomics);
router.get("/crops",                         crops);
router.post("/crops",                        addCrop);
router.patch("/crops/:id",                   patchCrop);
router.patch("/soil-reports/:id",            patchSoilReport);
router.get("/soil-crop-reference",           soilCropRefs);
router.post("/soil-crop-reference",          addSoilCropRef);
router.delete("/soil-crop-reference/:id",    removeSoilCropRef);
router.patch("/farms/:farmId/financials",    patchFarmFinancials);
router.get("/advisories",                    advisories);
router.post("/advisories",                   postAdvisory);
router.delete("/advisories/:id",             removeAdvisory);
router.post("/farms/:farmId/tasks",          addFarmTask);
router.get("/suggestions",                   suggestions);
router.post("/suggestions",                  postSuggestion);
router.delete("/suggestions/:id",            removeSuggestion);

// ─── Lifecycle templates ──────────────────────────────────────────────────────
router.get("/lifecycle-templates",           lifecycleTemplates);
router.post("/lifecycle-templates",          addLifecycleTemplate);
router.patch("/lifecycle-templates/:id",     patchLifecycleTemplate);
router.delete("/lifecycle-templates/:id",    removeLifecycleTemplate);

// ─── Farmer-facing routes ─────────────────────────────────────────────────────
router.get("/farms/:farmId/advisories",      farmerAdvisories);
router.get("/farms/:farmId/suggestions",     farmerSuggestions);
router.patch("/suggestions/:id/respond",     respondSuggestion);

// ─── Catalogue management (expert CRUD on reference data) ────────────────────
router.get   ("/catalogues/gov-schemes",         adminCtrl.govSchemesAdmin);
router.post  ("/catalogues/gov-schemes",         adminCtrl.addGovScheme);
router.patch ("/catalogues/gov-schemes/:id",     adminCtrl.patchGovScheme);
router.delete("/catalogues/gov-schemes/:id",     adminCtrl.removeGovScheme);

router.get   ("/catalogues/crop-pairings",       adminCtrl.cropPairings);
router.post  ("/catalogues/crop-pairings",       adminCtrl.addCropPairing);
router.patch ("/catalogues/crop-pairings/:id",   adminCtrl.patchCropPairing);
router.delete("/catalogues/crop-pairings/:id",   adminCtrl.removeCropPairing);

router.get   ("/catalogues/cover-crops",         adminCtrl.coverCropsAdmin);
router.post  ("/catalogues/cover-crops",         adminCtrl.addCoverCrop);
router.patch ("/catalogues/cover-crops/:id",     adminCtrl.patchCoverCrop);
router.delete("/catalogues/cover-crops/:id",     adminCtrl.removeCoverCrop);

router.get   ("/catalogues/varieties",           adminCtrl.cropVarieties);
router.post  ("/catalogues/varieties",           adminCtrl.addCropVariety);
router.patch ("/catalogues/varieties/:id",       adminCtrl.patchCropVariety);
router.delete("/catalogues/varieties/:id",       adminCtrl.removeCropVariety);

router.get   ("/catalogues/mandi-prices",        adminCtrl.mandiPricesAdmin);
router.post  ("/catalogues/mandi-prices",        adminCtrl.addMandiPrice);
router.delete("/catalogues/mandi-prices/:id",    adminCtrl.removeMandiPrice);

router.get   ("/catalogues/knowledge",           adminCtrl.knowledgeAdmin);
router.post  ("/catalogues/knowledge",           adminCtrl.addKnowledgeArticle);
router.patch ("/catalogues/knowledge/:id",       adminCtrl.patchKnowledgeArticle);
router.delete("/catalogues/knowledge/:id",       adminCtrl.removeKnowledgeArticle);

router.get   ("/catalogues/pest-alerts",         adminCtrl.pestAlertsAdmin);
router.post  ("/catalogues/pest-alerts",         adminCtrl.addPestAlert);
router.patch ("/catalogues/pest-alerts/:id",     adminCtrl.patchPestAlert);
router.delete("/catalogues/pest-alerts/:id",     adminCtrl.removePestAlert);

router.get   ("/farmer-questions",               adminCtrl.allFarmerQuestions);
router.patch ("/farmer-questions/:id/answer",    adminCtrl.answerQuestion);

// ─── Border crops catalogue ───────────────────────────────────────────────────
router.get   ("/catalogues/border-crops",        adminCtrl.borderCropsAdmin);
router.post  ("/catalogues/border-crops",        adminCtrl.addBorderCrop);
router.patch ("/catalogues/border-crops/:id",    adminCtrl.patchBorderCrop);
router.delete("/catalogues/border-crops/:id",    adminCtrl.removeBorderCrop);

// ─── Symptom suggestions (expert editable, public read) ──────────────────────
router.get   ("/symptom-suggestions",                    adminCtrl.listSymptomSuggestions);
router.patch ("/symptom-suggestions/:symptom",           adminCtrl.patchSymptomSuggestion);

// ─── Global economics cost config ─────────────────────────────────────────────
router.get   ("/economics-config",                       adminCtrl.getEconomicsConfigHandler);
router.patch ("/economics-config",                       adminCtrl.patchEconomicsConfigHandler);

export default router;
