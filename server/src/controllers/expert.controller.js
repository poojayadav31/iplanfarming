import * as svc from "../services/expert.service.js";
import { getEconomicsConfig, updateEconomicsConfig } from "../services/farmEconomics.service.js";

// ─── Overview ─────────────────────────────────────────────────────────────────
export const overview = async (req, res) => {
  const data = await svc.getOverview(req.user);
  res.json({ success: true, data });
};

// ─── Farms ────────────────────────────────────────────────────────────────────
export const allFarms = async (req, res) => {
  const data = await svc.getAllFarms(req.user);
  res.json({ success: true, data });
};

// ─── Soil Reports ─────────────────────────────────────────────────────────────
export const allSoilReports = async (req, res) => {
  const data = await svc.getAllSoilReports(req.user, req.query);
  res.json({ success: true, data });
};

// ─── Crop Economics ───────────────────────────────────────────────────────────
export const cropEconomics = async (req, res) => {
  const data = await svc.getCropEconomics(req.user);
  res.json({ success: true, data });
};

export const patchCropEconomics = async (req, res) => {
  const data = await svc.updateCropEconomics(req.user, req.params.id, req.body);
  res.json({ success: true, data });
};

// ─── Crops (water requirements) ───────────────────────────────────────────────
export const crops = async (req, res) => {
  const data = await svc.getCrops(req.user);
  res.json({ success: true, data });
};

export const patchCrop = async (req, res) => {
  const data = await svc.updateCrop(req.user, req.params.id, req.body);
  res.json({ success: true, data });
};

// ─── Advisories ───────────────────────────────────────────────────────────────
export const advisories = async (req, res) => {
  const data = await svc.getAdvisories(req.user);
  res.json({ success: true, data });
};

export const postAdvisory = async (req, res) => {
  const data = await svc.createAdvisory(req.user, req.body);
  res.status(201).json({ success: true, data });
};

export const removeAdvisory = async (req, res) => {
  const data = await svc.deleteAdvisory(req.user, req.params.id);
  res.json({ success: true, data });
};

// ─── Calendar task on any farm ────────────────────────────────────────────────
export const addFarmTask = async (req, res) => {
  const data = await svc.addTaskToFarm(req.user, req.params.farmId, req.body);
  res.status(201).json({ success: true, data });
};

// ─── Crop Suggestions ─────────────────────────────────────────────────────────
export const suggestions = async (req, res) => {
  const data = await svc.getSuggestions(req.user);
  res.json({ success: true, data });
};

export const postSuggestion = async (req, res) => {
  const data = await svc.createSuggestion(req.user, req.body);
  res.status(201).json({ success: true, data });
};

export const removeSuggestion = async (req, res) => {
  const data = await svc.deleteSuggestion(req.user, req.params.id);
  res.json({ success: true, data });
};

// ─── Add Crop + CropEconomics ─────────────────────────────────────────────────
export const addCrop = async (req, res) => {
  const data = await svc.createCrop(req.user, req.body);
  res.status(201).json({ success: true, data });
};

export const addCropEconomics = async (req, res) => {
  const data = await svc.createCropEconomics(req.user, req.body);
  res.status(201).json({ success: true, data });
};

// ─── Edit Soil Report ─────────────────────────────────────────────────────────
export const patchSoilReport = async (req, res) => {
  const data = await svc.updateSoilReport(req.user, req.params.id, req.body);
  res.json({ success: true, data });
};

// ─── Soil-Crop Reference ──────────────────────────────────────────────────────
export const soilCropRefs = async (req, res) => {
  const data = await svc.getSoilCropRefs(req.user);
  res.json({ success: true, data });
};

export const addSoilCropRef = async (req, res) => {
  const data = await svc.createSoilCropRef(req.user, req.body);
  res.status(201).json({ success: true, data });
};

export const removeSoilCropRef = async (req, res) => {
  const data = await svc.deleteSoilCropRef(req.user, req.params.id);
  res.json({ success: true, data });
};

// ─── Farm Financials ──────────────────────────────────────────────────────────
export const patchFarmFinancials = async (req, res) => {
  const data = await svc.updateFarmFinancials(req.user, req.params.farmId, req.body);
  res.json({ success: true, data });
};

// ─── Farmer-facing ────────────────────────────────────────────────────────────
export const farmerAdvisories = async (req, res) => {
  const data = await svc.getFarmerAdvisories(req.params.farmId, req.user);
  res.json({ success: true, data });
};

export const farmerSuggestions = async (req, res) => {
  const data = await svc.getFarmerSuggestions(req.params.farmId, req.user);
  res.json({ success: true, data });
};

export const respondSuggestion = async (req, res) => {
  const { status, farmerNote } = req.body;
  const data = await svc.respondToSuggestion(req.params.id, status, farmerNote, req.user);
  res.json({ success: true, data });
};

// ─── Lifecycle Templates ──────────────────────────────────────────────────────
export const lifecycleTemplates = async (req, res) => {
  const data = await svc.getLifecycleTemplates(req.user);
  res.json({ success: true, data });
};

export const addLifecycleTemplate = async (req, res) => {
  const data = await svc.createLifecycleTemplate(req.user, req.body);
  res.status(201).json({ success: true, data });
};

export const patchLifecycleTemplate = async (req, res) => {
  const data = await svc.updateLifecycleTemplate(req.user, req.params.id, req.body);
  res.json({ success: true, data });
};

export const removeLifecycleTemplate = async (req, res) => {
  const data = await svc.deleteLifecycleTemplate(req.user, req.params.id);
  res.json({ success: true, data });
};

// ── Catalogue management — wrapped style ────────────────────────────────────
const wrap = (fn) => async (req, res, next) => {
  try { res.json({ success: true, data: await fn(req) }); } catch (e) { next(e); }
};

export const govSchemesAdmin     = wrap((r) => svc.listGovSchemesAdmin(r.user));
export const addGovScheme        = wrap((r) => svc.createGovScheme(r.user, r.body));
export const patchGovScheme      = wrap((r) => svc.updateGovScheme(r.user, r.params.id, r.body));
export const removeGovScheme     = wrap((r) => svc.deleteGovScheme(r.user, r.params.id));

export const cropPairings        = wrap((r) => svc.listCropPairings(r.user));
export const addCropPairing      = wrap((r) => svc.createCropPairing(r.user, r.body));
export const patchCropPairing    = wrap((r) => svc.updateCropPairing(r.user, r.params.id, r.body));
export const removeCropPairing   = wrap((r) => svc.deleteCropPairing(r.user, r.params.id));

export const coverCropsAdmin     = wrap((r) => svc.listCoverCrops(r.user));
export const addCoverCrop        = wrap((r) => svc.createCoverCrop(r.user, r.body));
export const patchCoverCrop      = wrap((r) => svc.updateCoverCrop(r.user, r.params.id, r.body));
export const removeCoverCrop     = wrap((r) => svc.deleteCoverCrop(r.user, r.params.id));

export const cropVarieties       = wrap((r) => svc.listCropVarieties(r.user));
export const addCropVariety      = wrap((r) => svc.createCropVariety(r.user, r.body));
export const patchCropVariety    = wrap((r) => svc.updateCropVariety(r.user, r.params.id, r.body));
export const removeCropVariety   = wrap((r) => svc.deleteCropVariety(r.user, r.params.id));

export const mandiPricesAdmin    = wrap((r) => svc.listMandiPricesAdmin(r.user));
export const addMandiPrice       = wrap((r) => svc.createMandiPrice(r.user, r.body));
export const removeMandiPrice    = wrap((r) => svc.deleteMandiPrice(r.user, r.params.id));

export const knowledgeAdmin      = wrap((r) => svc.listKnowledgeArticlesAdmin(r.user));
export const addKnowledgeArticle = wrap((r) => svc.createKnowledgeArticle(r.user, r.body));
export const patchKnowledgeArticle = wrap((r) => svc.updateKnowledgeArticle(r.user, r.params.id, r.body));
export const removeKnowledgeArticle = wrap((r) => svc.deleteKnowledgeArticle(r.user, r.params.id));

export const pestAlertsAdmin     = wrap((r) => svc.listPestAlertsAdmin(r.user));
export const addPestAlert        = wrap((r) => svc.createPestAlert(r.user, r.body));
export const patchPestAlert      = wrap((r) => svc.updatePestAlert(r.user, r.params.id, r.body));
export const removePestAlert     = wrap((r) => svc.deletePestAlert(r.user, r.params.id));

export const allFarmerQuestions  = wrap((r) => svc.listAllFarmerQuestions(r.user));
export const answerQuestion      = wrap((r) => svc.answerFarmerQuestion(r.user, r.params.id, r.body));

export const borderCropsAdmin    = wrap((r) => svc.listBorderCropsAdmin(r.user));
export const addBorderCrop       = wrap((r) => svc.createBorderCrop(r.user, r.body));
export const patchBorderCrop     = wrap((r) => svc.updateBorderCrop(r.user, r.params.id, r.body));
export const removeBorderCrop    = wrap((r) => svc.deleteBorderCrop(r.user, r.params.id));

export const listSymptomSuggestions  = wrap((_r) => svc.listSymptomSuggestions());
export const patchSymptomSuggestion  = wrap((r) => svc.updateSymptomSuggestion(r.user, r.params.symptom, r.body));

export const getEconomicsConfigHandler   = wrap((_r) => getEconomicsConfig());
export const patchEconomicsConfigHandler = wrap((r) => updateEconomicsConfig(r.user, r.body));
