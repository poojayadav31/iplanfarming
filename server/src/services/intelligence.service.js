import prisma from "../config/prisma.js";
import { AppError } from "../utils/errors.js";
import { getFarmerIdFromUser } from "../utils/serviceUtils.js";
import { getWeather } from "./weather.service.js";

// ─── 1. Yield tracking & learning loop ───────────────────────────────────────

export const recordHarvest = async (user, body) => {
  getFarmerIdFromUser(user);
  const { zoneId, cropName, varietyName, yieldKg, pricePerKg, totalCost, notes } = body;
  if (!zoneId || !cropName || !yieldKg) throw new AppError("zoneId, cropName, yieldKg required", 400);

  const zone = await prisma.zone.findUnique({ where: { id: zoneId }, select: { farmId: true } });
  if (!zone) throw new AppError("Zone not found", 404);

  const totalRevenue = pricePerKg ? Math.round(yieldKg * pricePerKg) : null;
  const netProfit    = (totalRevenue && totalCost) ? totalRevenue - totalCost : null;

  const record = await prisma.harvestRecord.create({
    data: {
      zoneId,
      farmId: zone.farmId,
      cropName,
      varietyName: varietyName ?? null,
      yieldKg: parseFloat(yieldKg),
      pricePerKg: pricePerKg ? parseFloat(pricePerKg) : null,
      totalRevenue,
      totalCost: totalCost ? parseFloat(totalCost) : null,
      netProfit,
      notes: notes ?? null,
    },
  });

  // Auto-detect goal achievement
  if (totalRevenue) {
    const farmer = await prisma.farmer.findUnique({ where: { userId: user.id } });
    if (farmer) {
      const goals = await prisma.seasonGoal.findMany({
        where: { farmerId: farmer.id, cropName: { equals: cropName, mode: "insensitive" }, achieved: false },
      });
      for (const goal of goals) {
        if (totalRevenue >= goal.targetRevenue) {
          await prisma.seasonGoal.update({ where: { id: goal.id }, data: { achieved: true } });
        }
      }
    }
  }

  return record;
};

export const getZoneHarvestHistory = async (user, zoneId) => {
  const farmerId = getFarmerIdFromUser(user);
  const zone = await prisma.zone.findFirst({ where: { id: zoneId, farm: { farmerId } } });
  if (!zone) throw new AppError("Zone not found", 404);
  return prisma.harvestRecord.findMany({ where: { zoneId }, orderBy: { harvestedAt: "desc" } });
};

// District-level yield averages — used to personalise yield projections.
export const getYieldNorms = async (cropName, district) => {
  const records = await prisma.harvestRecord.findMany({
    where: { cropName, farm: { district } },
    select: { yieldKg: true, varietyName: true },
  });
  if (records.length === 0) return null;
  const total = records.reduce((s, r) => s + r.yieldKg, 0);
  return {
    cropName,
    district,
    avgYieldKgPerAcre: Math.round(total / records.length),
    sampleCount: records.length,
  };
};

// ─── 2. Soil health trend over time ──────────────────────────────────────────

export const getSoilTrend = async (user, zoneId) => {
  const farmerId = getFarmerIdFromUser(user);
  const zone = await prisma.zone.findFirst({ where: { id: zoneId, farm: { farmerId } } });
  if (!zone) throw new AppError("Zone not found", 404);

  // Currently SoilReport is one-per-zone (unique). For a true trend, we'd need history.
  // For now, return current report + harvest yields over time as a proxy for soil health improvement.
  const current = await prisma.soilReport.findUnique({ where: { zoneId } });
  const harvests = await prisma.harvestRecord.findMany({
    where: { zoneId },
    orderBy: { harvestedAt: "asc" },
    select: { yieldKg: true, harvestedAt: true, cropName: true },
  });
  return {
    currentSoilReport: current,
    harvestTimeline: harvests,
    note: "Future: enable per-season soil re-tests to graph pH, organic matter, earthworm count over time.",
  };
};

// ─── 3. Companion planting ───────────────────────────────────────────────────

export const getCompanionsForCrop = async (cropName) => {
  return prisma.cropPairing.findMany({ where: { primaryCrop: cropName } });
};

// ─── 4. Cover crops ──────────────────────────────────────────────────────────

export const getCoverCropSuggestions = async (afterSeason) => {
  // afterSeason: "Kharif" | "Rabi" | "Zaid"
  const seasonToCoverKey = {
    Kharif: "post-Kharif",
    Rabi:   "post-Rabi",
    Zaid:   "summer-fallow",
  };
  const key = seasonToCoverKey[afterSeason] ?? "pre-Kharif";
  return prisma.coverCrop.findMany({ where: { bestForSeason: key } });
};

// ─── 5. Variety tracking ─────────────────────────────────────────────────────

export const getVarietiesForCrop = async (cropName, district) => {
  const all = await prisma.cropVariety.findMany({ where: { cropName } });
  if (!district) return all;
  // sort: district-specific first, then "all"
  return all.sort((a, b) => {
    const aFit = a.recommendedFor.includes(district) ? 0 : a.recommendedFor.includes("all") ? 1 : 2;
    const bFit = b.recommendedFor.includes(district) ? 0 : b.recommendedFor.includes("all") ? 1 : 2;
    return aFit - bFit;
  });
};

// ─── 6. Weather alerts ───────────────────────────────────────────────────────

export const getWeatherAlerts = async (user) => {
  const farmerId = getFarmerIdFromUser(user);
  const farms = await prisma.farm.findMany({
    where: { farmerId },
    select: { id: true, name: true, centroid: true, district: true },
  });

  const alerts = [];
  for (const farm of farms) {
    const coords = farm.centroid?.geometry?.coordinates ?? farm.centroid?.coordinates ?? null;
    if (!coords) continue;
    const [lon, lat] = coords;
    try {
      const weather = await getWeather(lat, lon);
      if (weather.tempC !== null && weather.tempC > 38) {
        alerts.push({ farmId: farm.id, farmName: farm.name, severity: "warning", title: "Heatwave", message: `${weather.tempC}°C — mulch young plants and irrigate in evening only.` });
      }
      if (weather.tempC !== null && weather.tempC < 5) {
        alerts.push({ farmId: farm.id, farmName: farm.name, severity: "critical", title: "Frost risk", message: `Temperature ${weather.tempC}°C — irrigate this evening; wet soil retains heat overnight.` });
      }
      if (weather.forecastRainMm !== null && weather.forecastRainMm > 100) {
        alerts.push({ farmId: farm.id, farmName: farm.name, severity: "warning", title: "Heavy rain ahead", message: `~${weather.forecastRainMm}mm rain forecast next 16 days. Open drainage furrows now.` });
      }
      if (weather.precipMmLastWeek !== null && weather.precipMmLastWeek < 2 && weather.forecastRainMm !== null && weather.forecastRainMm < 5) {
        alerts.push({ farmId: farm.id, farmName: farm.name, severity: "info", title: "Dry spell continuing", message: "No significant rain in past or forecast week — plan supplemental irrigation." });
      }
    } catch { /* non-fatal */ }
  }
  return alerts;
};

// ─── 7. Pest outbreak network ────────────────────────────────────────────────

export const getPestAlertsForFarmer = async (user) => {
  const farmerId = getFarmerIdFromUser(user);
  const farms = await prisma.farm.findMany({ where: { farmerId }, select: { district: true } });
  const districts = [...new Set(farms.map((f) => f.district).filter(Boolean))];
  if (districts.length === 0) return [];

  return prisma.pestAlert.findMany({
    where: { district: { in: districts }, isActive: true },
    orderBy: { lastReportedAt: "desc" },
  });
};

// Aggregate FarmIssue records into PestAlert (called periodically, or on every report).
export const aggregatePestAlerts = async () => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
  const issues = await prisma.farmIssue.findMany({
    where: { createdAt: { gte: since }, status: "OPEN" },
    include: { farmer: { include: { farms: { select: { district: true } } } } },
  });

  const grouped = {};
  for (const issue of issues) {
    const district = issue.farmer.farms[0]?.district;
    if (!district) continue;
    const sym = issue.symptom ?? "general";
    const key = `${district}::${sym}`;
    if (!grouped[key]) grouped[key] = { district, pestName: sym, count: 0, last: new Date(0) };
    grouped[key].count++;
    if (issue.createdAt > grouped[key].last) grouped[key].last = issue.createdAt;
  }

  // Only create alerts when 3+ reports in same district
  for (const { district, pestName, count, last } of Object.values(grouped)) {
    if (count < 3) continue;
    const existing = await prisma.pestAlert.findFirst({ where: { district, pestName, isActive: true } });
    if (existing) {
      await prisma.pestAlert.update({ where: { id: existing.id }, data: { reportCount: count, lastReportedAt: last } });
    } else {
      await prisma.pestAlert.create({ data: { district, pestName, reportCount: count, lastReportedAt: last } });
    }
  }
  return Object.keys(grouped).length;
};

// ─── 8. Pre-season checklist ─────────────────────────────────────────────────

const buildChecklistTemplate = (cropName, plantingDate) => {
  const wks = (n) => { const d = new Date(plantingDate); d.setDate(d.getDate() - n * 7); return d; };
  return [
    { title: `Buy seeds for ${cropName}`,                 category: "seed",      dueDate: wks(4) },
    { title: `Source cow dung & cow urine for Beejamrit`, category: "input",     dueDate: wks(3) },
    { title: `Source mustard cake & jaggery for Jeevamrit`,category: "input",     dueDate: wks(3) },
    { title: `Sharpen & test ploughshare`,                category: "equipment", dueDate: wks(2) },
    { title: `Field preparation — bunding & ploughing`,   category: "land-prep", dueDate: wks(1) },
    { title: `Prepare Beejamrit batch (12hr ahead)`,      category: "input",     dueDate: wks(0) },
  ];
};

export const generatePreSeasonChecklist = async (user, body) => {
  const farmerId = getFarmerIdFromUser(user);
  const { zoneId, cropName, plantingDate } = body;
  if (!cropName || !plantingDate) throw new AppError("cropName and plantingDate required", 400);

  const tasks = buildChecklistTemplate(cropName, new Date(plantingDate));
  const created = [];
  for (const t of tasks) {
    const row = await prisma.preSeasonTask.create({
      data: { farmerId, zoneId: zoneId ?? null, cropName, ...t },
    });
    created.push(row);
  }
  return created;
};

export const listPreSeasonTasks = async (user) => {
  const farmerId = getFarmerIdFromUser(user);
  return prisma.preSeasonTask.findMany({
    where: { farmerId },
    orderBy: { dueDate: "asc" },
  });
};

export const togglePreSeasonTask = async (user, id, isDone) => {
  const farmerId = getFarmerIdFromUser(user);
  const t = await prisma.preSeasonTask.findFirst({ where: { id, farmerId } });
  if (!t) throw new AppError("Task not found", 404);
  return prisma.preSeasonTask.update({ where: { id }, data: { isDone: !!isDone } });
};

// ─── 9. Mandi prices ─────────────────────────────────────────────────────────

export const getMandiPrices = async (cropName, district) => {
  const where = {};
  if (cropName) where.cropName = cropName;
  if (district) where.district = district;
  // Last 30 days
  where.recordedAt = { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };

  const prices = await prisma.mandiPrice.findMany({ where, orderBy: { recordedAt: "desc" }, take: 50 });
  return prices;
};

export const upsertMandiPrice = async (body) => {
  const { cropName, district, pricePerQuintal, msp, source } = body;
  if (!cropName || !district || !pricePerQuintal) throw new AppError("cropName, district, pricePerQuintal required", 400);
  return prisma.mandiPrice.create({
    data: { cropName, district, pricePerQuintal: parseFloat(pricePerQuintal), msp: msp ? parseFloat(msp) : null, source: source ?? "manual" },
  });
};

// ─── 10. Government schemes ──────────────────────────────────────────────────

export const listGovSchemes = async (category) => {
  const where = { active: true };
  if (category) where.category = category;
  return prisma.govScheme.findMany({ where, orderBy: { schemeName: "asc" } });
};

// ─── 11. Daily check-in ──────────────────────────────────────────────────────

export const recordDailyCheckIn = async (user, body) => {
  const farmerId = getFarmerIdFromUser(user);
  const { zoneId, pestSeen, leavesHealthy, soilMoist, notes, photoUrl } = body;
  if (!zoneId) throw new AppError("zoneId required", 400);
  return prisma.dailyCheckIn.create({
    data: { zoneId, farmerId, pestSeen: !!pestSeen, leavesHealthy: leavesHealthy !== false, soilMoist: soilMoist !== false, notes: notes ?? null, photoUrl: photoUrl ?? null },
  });
};

export const listZoneCheckIns = async (user, zoneId) => {
  const farmerId = getFarmerIdFromUser(user);
  return prisma.dailyCheckIn.findMany({
    where: { zoneId, farmerId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
};

// ─── 12. Year-on-year comparison ─────────────────────────────────────────────

export const getYearComparison = async (user, zoneId) => {
  const farmerId = getFarmerIdFromUser(user);
  const zone = await prisma.zone.findFirst({ where: { id: zoneId, farm: { farmerId } } });
  if (!zone) throw new AppError("Zone not found", 404);
  const harvests = await prisma.harvestRecord.findMany({
    where: { zoneId },
    orderBy: { harvestedAt: "asc" },
  });
  // group by year
  const byYear = {};
  for (const h of harvests) {
    const yr = h.harvestedAt.getFullYear();
    if (!byYear[yr]) byYear[yr] = { year: yr, totalYieldKg: 0, totalRevenue: 0, totalProfit: 0, harvests: 0 };
    byYear[yr].totalYieldKg += h.yieldKg;
    byYear[yr].totalRevenue += h.totalRevenue ?? 0;
    byYear[yr].totalProfit  += h.netProfit ?? 0;
    byYear[yr].harvests++;
  }
  return Object.values(byYear).sort((a, b) => a.year - b.year);
};

// ─── 13. End-of-season report ────────────────────────────────────────────────

export const getSeasonReport = async (user, zoneId) => {
  const farmerId = getFarmerIdFromUser(user);
  const zone = await prisma.zone.findFirst({
    where: { id: zoneId, farm: { farmerId } },
    include: { farm: { select: { name: true, district: true } }, soilReport: true, cropAssignment: { include: { cropEconomics: true } } },
  });
  if (!zone) throw new AppError("Zone not found", 404);

  const harvest = await prisma.harvestRecord.findFirst({ where: { zoneId }, orderBy: { harvestedAt: "desc" } });
  const tasks   = await prisma.calendarTask.findMany({ where: { zoneId }, select: { status: true } });
  const issues  = await prisma.farmIssue.findMany({ where: { zoneId } });
  const photos  = await prisma.farmPhoto.findMany({ where: { zoneId }, take: 10, orderBy: { createdAt: "desc" } });

  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
  const compliance = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return {
    farm: zone.farm,
    zone: { id: zone.id, name: zone.name, areaBigha: zone.areaBigha },
    soilReport: zone.soilReport,
    crop: zone.cropAssignment?.cropEconomics ?? null,
    harvest,
    compliance,
    tasksTotal: tasks.length,
    tasksCompleted: completedTasks,
    issuesCount: issues.length,
    photos,
    generatedAt: new Date(),
  };
};

// ─── 14. Goal setting ────────────────────────────────────────────────────────

export const setSeasonGoal = async (user, body) => {
  const farmerId = getFarmerIdFromUser(user);
  const { season, cropName, targetRevenue, targetYieldKg } = body;
  if (!season || !cropName || !targetRevenue) throw new AppError("season, cropName, targetRevenue required", 400);

  // Feasibility check
  const econ = await prisma.cropEconomics.findFirst({ where: { cropName: { equals: cropName, mode: "insensitive" } } });
  const farms = await prisma.farm.findMany({ where: { farmerId }, select: { areaAcres: true } });
  const totalAcres = farms.reduce((s, f) => s + f.areaAcres, 0);
  let feasibilityScore = 50;
  let feasibilityNotes = "Goal set without baseline data";
  if (econ && totalAcres > 0) {
    const projectedRevenue = econ.yieldPerAcreKg * econ.rawSalePricePerKg * totalAcres;
    const ratio = projectedRevenue / parseFloat(targetRevenue);
    feasibilityScore = Math.round(Math.min(100, ratio * 100));
    feasibilityNotes = ratio >= 1
      ? `Achievable — projected revenue ₹${Math.round(projectedRevenue).toLocaleString()}.`
      : `Stretch goal — projected revenue ₹${Math.round(projectedRevenue).toLocaleString()}. Consider intercropping or processed sale.`;
  }

  return prisma.seasonGoal.create({
    data: { farmerId, season, cropName, targetRevenue: parseFloat(targetRevenue), targetYieldKg: targetYieldKg ? parseFloat(targetYieldKg) : null, feasibilityScore, feasibilityNotes },
  });
};

export const listSeasonGoals = async (user) => {
  const farmerId = getFarmerIdFromUser(user);
  return prisma.seasonGoal.findMany({ where: { farmerId }, orderBy: { createdAt: "desc" } });
};

// ─── 15. Knowledge base (public Q&A) ────────────────────────────────────────

export const listKnowledgeArticles = async (category, query) => {
  const where = { isPublished: true };
  if (category) where.category = category;
  if (query)    where.OR = [{ title: { contains: query, mode: "insensitive" } }, { body: { contains: query, mode: "insensitive" } }];
  return prisma.knowledgeArticle.findMany({ where, orderBy: { createdAt: "desc" } });
};

export const publishQuestionAsArticle = async (user, questionId) => {
  // Future: only experts. For now, allow if Q has answer.
  const q = await prisma.farmerQuestion.findUnique({ where: { id: questionId } });
  if (!q || !q.answer) throw new AppError("Question not found or unanswered", 404);
  return prisma.knowledgeArticle.create({
    data: {
      title: q.question.slice(0, 100),
      body: q.answer,
      category: q.category,
      tags: [],
      sourceQuestionId: questionId,
    },
  });
};

// ─── 16. Bulk-buy & co-op selling ───────────────────────────────────────────

export const createBuyGroup = async (user, body) => {
  const farmerId = getFarmerIdFromUser(user);
  const { district, itemName, totalQuantity, unit, pricePerUnit, contactPhone, closesAt } = body;
  if (!district || !itemName || !totalQuantity || !unit) throw new AppError("district, itemName, totalQuantity, unit required", 400);
  return prisma.buyGroup.create({
    data: { district, itemName, totalQuantity: parseFloat(totalQuantity), unit, pricePerUnit: pricePerUnit ? parseFloat(pricePerUnit) : null, contactPhone: contactPhone ?? null, organiserFarmerId: farmerId, closesAt: closesAt ? new Date(closesAt) : null },
  });
};

export const listBuyGroupsByDistrict = async (user) => {
  const farmerId = getFarmerIdFromUser(user);
  const farms = await prisma.farm.findMany({ where: { farmerId }, select: { district: true } });
  const districts = [...new Set(farms.map((f) => f.district).filter(Boolean))];
  if (districts.length === 0) return [];
  const groups = await prisma.buyGroup.findMany({
    where: { district: { in: districts }, status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: { organiser: { include: { user: { select: { name: true } } } } },
  });
  return groups.map((g) => ({ ...g, organiserName: g.organiser?.user?.name ?? null }));
};

// ─── 17. Equipment listings ─────────────────────────────────────────────────

export const createEquipmentListing = async (user, body) => {
  const farmerId = getFarmerIdFromUser(user);
  const { equipmentType, district, hourlyRate, dailyRate, contactPhone, notes } = body;
  if (!equipmentType || !district) throw new AppError("equipmentType, district required", 400);
  return prisma.equipmentListing.create({
    data: { ownerFarmerId: farmerId, equipmentType, district, hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null, dailyRate: dailyRate ? parseFloat(dailyRate) : null, contactPhone: contactPhone ?? null, notes: notes ?? null },
  });
};

export const listEquipmentByDistrict = async (user) => {
  const farmerId = getFarmerIdFromUser(user);
  const farms = await prisma.farm.findMany({ where: { farmerId }, select: { district: true } });
  const districts = [...new Set(farms.map((f) => f.district).filter(Boolean))];
  if (districts.length === 0) return [];
  return prisma.equipmentListing.findMany({ where: { district: { in: districts }, isAvailable: true }, orderBy: { createdAt: "desc" } });
};

// ─── 18. Task compliance score ──────────────────────────────────────────────

export const getComplianceScore = async (user) => {
  const farmerId = getFarmerIdFromUser(user);
  const tasks = await prisma.calendarTask.findMany({
    where: { farm: { farmerId }, scheduledDate: { lt: new Date() } },
    select: { status: true, scheduledDate: true },
  });
  if (tasks.length === 0) return { score: null, totalDue: 0, completed: 0 };
  const completed = tasks.filter((t) => t.status === "COMPLETED").length;
  return {
    score: Math.round((completed / tasks.length) * 100),
    totalDue: tasks.length,
    completed,
  };
};

// ─── 19. Drought contingency ────────────────────────────────────────────────

export const getDroughtContingency = async (user, farmId) => {
  const farmerId = getFarmerIdFromUser(user);
  const farm = await prisma.farm.findFirst({
    where: { id: farmId, farmerId },
    include: { waterSources: true, zones: { include: { cropAssignment: { include: { cropEconomics: true } } } } },
  });
  if (!farm) throw new AppError("Farm not found", 404);

  const totalWater = farm.waterSources.reduce((s, w) => s + w.currentLevelLiters, 0);
  const activeZones = farm.zones.filter((z) => z.cropAssignment);

  // Estimate weekly need
  const cropsByName = await prisma.crop.findMany({ select: { name: true, weeklyWaterRequirementLitersPerAcre: true, seasonDurationWeeks: true } });
  const map = Object.fromEntries(cropsByName.map((c) => [c.name, c]));
  let weeklyNeed = 0;
  let weeksRemaining = 17;
  for (const z of activeZones) {
    const c = map[z.cropAssignment.cropEconomics.cropName];
    if (!c) continue;
    const acres = z.areaSquareMeters / 4046.86;
    weeklyNeed += (c.weeklyWaterRequirementLitersPerAcre || 5000) * acres;
    weeksRemaining = Math.min(weeksRemaining, c.seasonDurationWeeks ?? 17);
  }

  if (weeklyNeed === 0) return { hasShortfall: false };

  const weeksOfWater = Math.floor(totalWater / weeklyNeed);
  if (weeksOfWater >= weeksRemaining) return { hasShortfall: false };

  const deficitWeeks = weeksRemaining - weeksOfWater;
  return {
    hasShortfall:    true,
    weeksOfWater,
    weeksRemaining,
    deficitWeeks,
    suggestions: [
      `Switch one zone to a drought-tolerant crop (Millets, Gram) to reduce demand by ~30%`,
      `Open zone irrigation furrows + mulch heavily to retain moisture`,
      `Estimate tanker cost: ₹${Math.round(weeklyNeed * deficitWeeks * 0.5).toLocaleString()} for the shortfall`,
    ],
  };
};

// ─── 20. Soil trend (historical) ─────────────────────────────────────────────

export const getSoilHistory = async (user, zoneId) => {
  const farmerId = getFarmerIdFromUser(user);
  const zone = await prisma.zone.findFirst({ where: { id: zoneId, farm: { farmerId } } });
  if (!zone) throw new AppError("Zone not found", 404);
  return prisma.soilReportSnapshot.findMany({
    where: { zoneId },
    orderBy: { recordedAt: "asc" },
  });
};

// Snapshot helper — call after each SoilReport save
export const snapshotSoilReport = async (zoneId) => {
  const r = await prisma.soilReport.findUnique({ where: { zoneId } });
  if (!r) return null;
  return prisma.soilReportSnapshot.create({
    data: {
      zoneId, soilType: r.soilType, drainageSpeed: r.drainageSpeed,
      phLevel: r.phLevel, earthwormCount: r.earthwormCount, soilHealthScore: r.soilHealthScore,
    },
  });
};

// ─── 21. Border crops ────────────────────────────────────────────────────────

export const getCropMetadata = async (cropName) => {
  return prisma.crop.findFirst({
    where: { name: { equals: cropName, mode: "insensitive" } },
    select: {
      name: true, scientificName: true, season: true, estimatedDurationMonths: true,
      seedKgPerAcre: true, spacingNotes: true, riskLevel: true, cropFamily: true,
      plantingWindowStart: true, plantingWindowEnd: true,
    },
  });
};

export const getBorderCropsForCrop = async (cropName) => {
  const list = await prisma.borderCrop.findMany({
    where: { OR: [{ primaryCrop: cropName }, { primaryCrop: "all" }] },
  });
  return list;
};

// ─── 22. Successive sowing batches ──────────────────────────────────────────

export const createSowingBatches = async (user, body) => {
  getFarmerIdFromUser(user);
  const { zoneId, cropName, batchCount, intervalWeeks, firstSowDate } = body;
  if (!zoneId || !cropName || !batchCount || !firstSowDate)
    throw new AppError("zoneId, cropName, batchCount, firstSowDate required", 400);

  const start = new Date(firstSowDate);
  const created = [];
  for (let i = 0; i < parseInt(batchCount); i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i * (parseInt(intervalWeeks ?? 2) * 7));
    const row = await prisma.sowingBatch.create({
      data: { zoneId, batchNumber: i + 1, cropName, plannedSowDate: date },
    });
    created.push(row);
  }
  return created;
};

export const listSowingBatches = async (user, zoneId) => {
  getFarmerIdFromUser(user);
  return prisma.sowingBatch.findMany({ where: { zoneId }, orderBy: { batchNumber: "asc" } });
};

export const updateSowingBatch = async (user, id, body) => {
  getFarmerIdFromUser(user);
  const data = {};
  if (body.actualSowDate !== undefined) data.actualSowDate = body.actualSowDate ? new Date(body.actualSowDate) : null;
  if (body.notes !== undefined) data.notes = body.notes;
  return prisma.sowingBatch.update({ where: { id }, data });
};

// ─── Save variety choice to active crop assignment ────────────────────────────

export const saveVarietyToAssignment = async (user, zoneId, varietyName) => {
  const farmerId = getFarmerIdFromUser(user);
  const zone = await prisma.zone.findFirst({ where: { id: zoneId, farm: { farmerId } } });
  if (!zone) throw new AppError("Zone not found", 404);
  const assignment = await prisma.zoneCropAssignment.findUnique({ where: { zoneId } });
  if (!assignment) throw new AppError("No crop assigned to this zone yet", 400);
  return prisma.zoneCropAssignment.update({ where: { zoneId }, data: { varietyName } });
};
