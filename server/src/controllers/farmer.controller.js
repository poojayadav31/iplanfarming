import * as farmerService from "../services/farmer.service.js";

export const today = async (req, res) => {
  const data = await farmerService.getTodayDashboard(req.user);
  res.json({ success: true, data });
};

export const recipeGuide = async (req, res) => {
  const acres = req.query.acres ? parseFloat(req.query.acres) : 1;
  const data = farmerService.getRecipeGuide(req.params.recipeKey, acres);
  res.json({ success: true, data });
};

export const cropPopularity = async (req, res) => {
  const data = await farmerService.getCropPopularityForDistrict(req.params.district);
  res.json({ success: true, data });
};

export const districtSoilDefaults = async (req, res) => {
  const data = await farmerService.getDistrictSoilDefaults(req.params.district);
  res.json({ success: true, data });
};

export const onboardingStatus = async (req, res) => {
  const data = await farmerService.getOnboardingStatus(req.user);
  res.json({ success: true, data });
};

export const completeOnboarding = async (req, res) => {
  const data = await farmerService.completeOnboarding(req.user, req.body);
  res.json({ success: true, data });
};

export const reportIssue = async (req, res) => {
  const data = await farmerService.reportIssue(req.user, req.body);
  res.json({ success: true, data });
};

export const listIssues = async (req, res) => {
  const data = await farmerService.listIssues(req.user);
  res.json({ success: true, data });
};

export const askQuestion = async (req, res) => {
  const data = await farmerService.askExpertQuestion(req.user, req.body);
  res.json({ success: true, data });
};

export const myQuestions = async (req, res) => {
  const data = await farmerService.listMyQuestions(req.user);
  res.json({ success: true, data });
};

export const addPhoto = async (req, res) => {
  const data = await farmerService.addPhotoToZone(req.user, req.body);
  res.json({ success: true, data });
};

export const zonePhotos = async (req, res) => {
  const data = await farmerService.listZonePhotos(req.user, req.params.zoneId);
  res.json({ success: true, data });
};

export const myAchievements = async (req, res) => {
  const data = await farmerService.getMyAchievements(req.user);
  res.json({ success: true, data });
};
