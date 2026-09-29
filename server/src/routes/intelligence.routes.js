import { Router } from "express";
import * as c from "../controllers/intelligence.controller.js";

const router = Router();

// ─── Harvests / yield ──────────────────────────────────────────────────────
router.post("/harvests",                     c.recordHarvest);
router.get("/zones/:zoneId/harvests",        c.zoneHarvests);
router.get("/yield-norms/:cropName",         c.yieldNorms);

// ─── Soil trend / year comparison / season report ────────────────────────
router.get("/zones/:zoneId/soil-trend",      c.soilTrend);
router.get("/zones/:zoneId/year-comparison", c.yearComparison);
router.get("/zones/:zoneId/season-report",   c.seasonReport);

// ─── Crop intelligence ────────────────────────────────────────────────────
router.get("/companions/:cropName",          c.companions);
router.get("/cover-crops",                   c.coverCrops);
router.get("/varieties/:cropName",           c.varieties);

// ─── Alerts ───────────────────────────────────────────────────────────────
router.get("/weather-alerts",                c.weatherAlerts);
router.get("/pest-alerts",                   c.pestAlerts);
router.post("/pest-alerts/aggregate",        c.aggregatePestAlerts);

// ─── Pre-season checklist ─────────────────────────────────────────────────
router.post("/checklist/generate",           c.generateChecklist);
router.get("/checklist",                     c.listChecklist);
router.patch("/checklist/:id",               c.toggleChecklist);

// ─── Mandi prices ─────────────────────────────────────────────────────────
router.get("/mandi-prices",                  c.mandiPrices);
router.post("/mandi-prices",                 c.upsertMandiPrice);

// ─── Government schemes ──────────────────────────────────────────────────
router.get("/gov-schemes",                   c.govSchemes);

// ─── Daily check-in ───────────────────────────────────────────────────────
router.post("/check-in",                     c.dailyCheckIn);
router.get("/zones/:zoneId/check-ins",       c.zoneCheckIns);

// ─── Goals ────────────────────────────────────────────────────────────────
router.post("/goals",                        c.setGoal);
router.get("/goals",                         c.listGoals);

// ─── Knowledge base ───────────────────────────────────────────────────────
router.get("/knowledge",                     c.knowledge);
router.post("/knowledge/publish/:questionId",c.publishArticle);

// ─── Bulk-buy ─────────────────────────────────────────────────────────────
router.post("/buy-groups",                   c.createBuyGroup);
router.get("/buy-groups",                    c.listBuyGroups);

// ─── Equipment sharing ────────────────────────────────────────────────────
router.post("/equipment",                    c.createEquipment);
router.get("/equipment",                     c.listEquipment);

// ─── Compliance / drought ────────────────────────────────────────────────
router.get("/compliance",                    c.compliance);
router.get("/farms/:farmId/drought",         c.droughtContingency);

// ─── Soil history, border crops, sowing batches ──────────────────────────
router.get("/zones/:zoneId/soil-history",   c.soilHistory);
router.get("/border-crops/:cropName",       c.borderCrops);
router.get("/crop/:cropName",               c.cropMetadata);
router.post("/sowing-batches",              c.createBatches);
router.get("/zones/:zoneId/sowing-batches", c.listBatches);
router.patch("/sowing-batches/:id",         c.updateBatch);

// ─── Variety save to active assignment ───────────────────────────────────
router.patch("/zones/:zoneId/variety",      c.saveVariety);

export default router;
