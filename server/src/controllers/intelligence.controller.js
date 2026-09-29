import * as svc from "../services/intelligence.service.js";

const wrap = (fn) => async (req, res, next) => {
  try { res.json({ success: true, data: await fn(req) }); } catch (e) { next(e); }
};

export const recordHarvest        = wrap((r) => svc.recordHarvest(r.user, r.body));
export const zoneHarvests         = wrap((r) => svc.getZoneHarvestHistory(r.user, r.params.zoneId));
export const yieldNorms           = wrap((r) => svc.getYieldNorms(r.params.cropName, r.query.district));
export const soilTrend            = wrap((r) => svc.getSoilTrend(r.user, r.params.zoneId));
export const companions           = wrap((r) => svc.getCompanionsForCrop(r.params.cropName));
export const coverCrops           = wrap((r) => svc.getCoverCropSuggestions(r.query.afterSeason));
export const varieties            = wrap((r) => svc.getVarietiesForCrop(r.params.cropName, r.query.district));
export const weatherAlerts        = wrap((r) => svc.getWeatherAlerts(r.user));
export const pestAlerts           = wrap((r) => svc.getPestAlertsForFarmer(r.user));
export const aggregatePestAlerts  = wrap(()  => svc.aggregatePestAlerts());
export const generateChecklist    = wrap((r) => svc.generatePreSeasonChecklist(r.user, r.body));
export const listChecklist        = wrap((r) => svc.listPreSeasonTasks(r.user));
export const toggleChecklist      = wrap((r) => svc.togglePreSeasonTask(r.user, r.params.id, r.body.isDone));
export const mandiPrices          = wrap((r) => svc.getMandiPrices(r.query.cropName, r.query.district));
export const upsertMandiPrice     = wrap((r) => svc.upsertMandiPrice(r.body));
export const govSchemes           = wrap((r) => svc.listGovSchemes(r.query.category));
export const dailyCheckIn         = wrap((r) => svc.recordDailyCheckIn(r.user, r.body));
export const zoneCheckIns         = wrap((r) => svc.listZoneCheckIns(r.user, r.params.zoneId));
export const yearComparison       = wrap((r) => svc.getYearComparison(r.user, r.params.zoneId));
export const seasonReport         = wrap((r) => svc.getSeasonReport(r.user, r.params.zoneId));
export const setGoal              = wrap((r) => svc.setSeasonGoal(r.user, r.body));
export const listGoals            = wrap((r) => svc.listSeasonGoals(r.user));
export const knowledge            = wrap((r) => svc.listKnowledgeArticles(r.query.category, r.query.q));
export const publishArticle       = wrap((r) => svc.publishQuestionAsArticle(r.user, r.params.questionId));
export const createBuyGroup       = wrap((r) => svc.createBuyGroup(r.user, r.body));
export const listBuyGroups        = wrap((r) => svc.listBuyGroupsByDistrict(r.user));
export const createEquipment      = wrap((r) => svc.createEquipmentListing(r.user, r.body));
export const listEquipment        = wrap((r) => svc.listEquipmentByDistrict(r.user));
export const compliance           = wrap((r) => svc.getComplianceScore(r.user));
export const droughtContingency   = wrap((r) => svc.getDroughtContingency(r.user, r.params.farmId));

export const soilHistory       = wrap((r) => svc.getSoilHistory(r.user, r.params.zoneId));
export const cropMetadata      = wrap((r) => svc.getCropMetadata(r.params.cropName));
export const borderCrops       = wrap((r) => svc.getBorderCropsForCrop(r.params.cropName));
export const createBatches     = wrap((r) => svc.createSowingBatches(r.user, r.body));
export const listBatches       = wrap((r) => svc.listSowingBatches(r.user, r.params.zoneId));
export const updateBatch       = wrap((r) => svc.updateSowingBatch(r.user, r.params.id, r.body));
export const saveVariety       = wrap((r) => svc.saveVarietyToAssignment(r.user, r.params.zoneId, r.body.varietyName));
