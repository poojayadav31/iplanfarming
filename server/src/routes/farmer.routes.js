import { Router } from "express";
import * as ctrl from "../controllers/farmer.controller.js";

const router = Router();

router.get("/today",                         ctrl.today);
router.get("/recipe-guide/:recipeKey",       ctrl.recipeGuide);
router.get("/crop-popularity/:district",     ctrl.cropPopularity);
router.get("/district-defaults/:district",   ctrl.districtSoilDefaults);
router.get("/onboarding-status",             ctrl.onboardingStatus);
router.post("/onboarding-complete",          ctrl.completeOnboarding);

// Issues / failure recovery
router.post("/issues",                       ctrl.reportIssue);
router.get("/issues",                        ctrl.listIssues);

// Questions to expert
router.post("/questions",                    ctrl.askQuestion);
router.get("/questions",                     ctrl.myQuestions);

// Photo journal
router.post("/photos",                       ctrl.addPhoto);
router.get("/zones/:zoneId/photos",          ctrl.zonePhotos);

// Achievements
router.get("/achievements",                  ctrl.myAchievements);

export default router;
