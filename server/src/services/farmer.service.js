import prisma from "../config/prisma.js";
import { AppError } from "../utils/errors.js";
import { getFarmerIdFromUser } from "../utils/serviceUtils.js";
import { RECIPES, SQ_METERS_PER_ACRE } from "../constants/naturalFarming.js";

const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay   = (d = new Date()) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const addDays    = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

// ─── Today / This Week tasks ──────────────────────────────────────────────────

export const getTodayDashboard = async (user) => {
  const farmerId = getFarmerIdFromUser(user);

  const today = startOfDay();
  const weekEnd = endOfDay(addDays(today, 6));

  const farms = await prisma.farm.findMany({
    where: { farmerId },
    select: { id: true, name: true, district: true, createdAt: true },
  });
  const farmIds = farms.map((f) => f.id);

  if (farmIds.length === 0) {
    return { hasFarm: false, todayTasks: [], weekTasks: [], activeZones: [], achievements: [] };
  }

  // Today's tasks
  const todayTasks = await prisma.calendarTask.findMany({
    where: { farmId: { in: farmIds }, scheduledDate: { gte: today, lte: endOfDay(today) } },
    include: { zone: { select: { name: true } } },
    orderBy: [{ priority: "asc" }, { scheduledDate: "asc" }],
  });

  // Next 6 days' tasks
  const weekTasks = await prisma.calendarTask.findMany({
    where: { farmId: { in: farmIds }, scheduledDate: { gt: endOfDay(today), lte: weekEnd } },
    include: { zone: { select: { name: true } } },
    orderBy: { scheduledDate: "asc" },
  });

  // Active zones with progress %
  const zones = await prisma.zone.findMany({
    where: { farm: { farmerId } },
    include: {
      cropAssignment: {
        include: { cropEconomics: { select: { cropName: true } } },
      },
      farm: { select: { name: true } },
    },
  });

  const cropMap = await prisma.crop.findMany({
    select: { name: true, seasonDurationWeeks: true, riskLevel: true, cropFamily: true, estimatedDurationMonths: true },
  });
  const cropsByName = Object.fromEntries(cropMap.map((c) => [c.name, c]));

  const activeZones = zones.filter((z) => z.cropAssignment).map((z) => {
    const cropName = z.cropAssignment.cropEconomics.cropName;
    const meta = cropsByName[cropName] ?? { seasonDurationWeeks: 17, riskLevel: "intermediate" };
    const startedAt = z.cropAssignment.createdAt;
    const weeksElapsed = Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / (7 * 24 * 60 * 60 * 1000)));
    const totalWeeks = meta.seasonDurationWeeks;
    const progressPct = Math.min(100, Math.round((weeksElapsed / totalWeeks) * 100));
    return {
      zoneId: z.id,
      zoneName: z.name,
      farmName: z.farm.name,
      cropName,
      riskLevel: meta.riskLevel,
      weeksElapsed,
      totalWeeks,
      progressPct,
      startedAt,
      areaBigha: z.areaBigha,
    };
  });

  const achievements = await prisma.achievement.findMany({
    where: { farmerId },
    orderBy: { earnedAt: "desc" },
    take: 5,
  });

  return {
    hasFarm: true,
    todayTasks: todayTasks.map(simplifyTask),
    weekTasks:  weekTasks.map(simplifyTask),
    activeZones,
    achievements,
  };
};

const simplifyTask = (t) => ({
  id: t.id,
  title: t.title,
  taskType: t.taskType,
  category: t.category,
  scheduledDate: t.scheduledDate,
  priority: t.priority,
  status: t.status,
  zoneName: t.zone?.name ?? null,
  recipeKey: t.recipeKey,
  cropName: t.cropName,
});

// ─── Recipe guides ────────────────────────────────────────────────────────────

const RECIPE_GUIDES = {
  Jeevamrit: {
    purpose: "A natural fertiliser that boosts soil microbes. Use every 2 weeks during the growing season.",
    prepTimeHours: 48,
    steps: [
      "Take a 200-litre drum and fill with 180 L clean water",
      "Add 15 kg fresh cow dung and stir until dissolved",
      "Add 15 L cow urine and mix well",
      "Add 2 kg jaggery — break into small pieces first",
      "Add 1 kg mustard cake (or any pulse flour)",
      "Add a handful of soil from a healthy field (introduces beneficial microbes)",
      "Cover with a cotton cloth and stir twice a day for 48 hours",
      "Filter through a cloth — apply diluted 1:10 with irrigation water",
    ],
    tips: [
      "Use within 7 days — fresh is best",
      "Apply early morning or evening, never in hot sun",
      "Smell should be earthy, not foul — if it smells bad, do not use",
    ],
  },
  Beejamrit: {
    purpose: "A seed treatment that protects from soil-borne diseases. Apply once before sowing.",
    prepTimeHours: 12,
    steps: [
      "Take 20 L water in a clean drum",
      "Add 5 L cow urine and mix",
      "Add 5 kg cow dung — wrap in cloth and tie inside the drum",
      "Add 50 g lime (chuna) dissolved in 1 L water separately",
      "Mix everything well, leave overnight",
      "Next morning, dip seeds in this solution for 10 minutes",
      "Spread seeds in shade to dry before sowing",
    ],
    tips: [
      "Treats up to 100 kg of seeds",
      "Do NOT apply in direct sunlight",
      "Sow within 24 hours of treatment for best germination",
    ],
  },
  Agniastra: {
    purpose: "A natural pest spray made from neem, garlic, and chilli. Use when you spot pests.",
    prepTimeHours: 48,
    steps: [
      "Take 20 L cow urine in a metal/clay pot",
      "Crush 5 kg neem leaves and add",
      "Crush 500 g green chilli and add",
      "Crush 500 g garlic and add",
      "Bring to a boil 4 times — let it cool between each boil",
      "Cover and let stand for 48 hours",
      "Filter — store in a closed container",
      "Dilute 1 part Agniastra in 10 parts water before spraying",
    ],
    tips: [
      "Spray in evening to avoid leaf burn",
      "Keeps up to 6 months in a cool dark place",
      "Effective against caterpillars, aphids, and leaf-eating insects",
    ],
  },
};

export const getRecipeGuide = (recipeKey, zoneAcres = 1) => {
  const recipe = RECIPES[recipeKey];
  const guide  = RECIPE_GUIDES[recipeKey];
  if (!recipe || !guide) throw new AppError(`Recipe "${recipeKey}" not found`, 404);

  const scaledIngredients = Object.entries(recipe).map(([key, info]) => ({
    key,
    label:  info.label,
    amount: Math.round(info.amount * zoneAcres * 10) / 10,
    unit:   info.unit,
  }));

  return {
    recipeKey,
    purpose:        guide.purpose,
    prepTimeHours:  guide.prepTimeHours,
    ingredients:    scaledIngredients,
    steps:          guide.steps,
    tips:           guide.tips,
    scaledForAcres: zoneAcres,
  };
};

// ─── Other farmers nearby (social proof) ──────────────────────────────────────

export const getCropPopularityForDistrict = async (district) => {
  if (!district) return [];

  // Count both active assignments and historical ones for the district
  const farms = await prisma.farm.findMany({ where: { district }, select: { id: true } });
  const farmIds = farms.map((f) => f.id);
  if (farmIds.length === 0) return [];

  const assignments = await prisma.zoneCropAssignment.findMany({
    where: { zone: { farmId: { in: farmIds } } },
    select: { cropEconomics: { select: { cropName: true } } },
  });

  const counts = {};
  for (const a of assignments) {
    const name = a.cropEconomics.cropName;
    counts[name] = (counts[name] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([cropName, count]) => ({ cropName, farmerCount: count }))
    .sort((a, b) => b.farmerCount - a.farmerCount);
};

// ─── District soil averages (smart defaults) ─────────────────────────────────

export const getDistrictSoilDefaults = async (district) => {
  if (!district) return null;
  const reports = await prisma.soilReport.findMany({
    where: { zone: { farm: { district } } },
    select: { soilType: true, drainageSpeed: true, phLevel: true, earthwormCount: true, soilHealthScore: true },
  });
  if (reports.length === 0) return null;

  const counts = (key) => reports.reduce((acc, r) => { acc[r[key]] = (acc[r[key]] ?? 0) + 1; return acc; }, {});
  const mode = (key) => Object.entries(counts(key)).sort((a, b) => b[1] - a[1])[0]?.[0];
  const avg  = (key) => reports.reduce((s, r) => s + r[key], 0) / reports.length;

  return {
    soilType:        mode("soilType"),
    drainageSpeed:   mode("drainageSpeed"),
    phLevel:         Math.round(avg("phLevel") * 10) / 10,
    earthwormCount:  Math.round(avg("earthwormCount")),
    sampleSize:      reports.length,
    note:            `Based on ${reports.length} farm${reports.length > 1 ? 's' : ''} in your district`,
  };
};

// ─── Onboarding ───────────────────────────────────────────────────────────────

export const getOnboardingStatus = async (user) => {
  const farmerId = getFarmerIdFromUser(user);
  const farmer = await prisma.farmer.findUnique({
    where: { id: farmerId },
    include: { farms: { select: { id: true } } },
  });
  return {
    needsOnboarding: !farmer.onboardingCompletedAt,
    hasFarm: farmer.farms.length > 0,
    experienceLevel: farmer.experienceLevel,
  };
};

export const completeOnboarding = async (user, body) => {
  const farmerId = getFarmerIdFromUser(user);
  const { experienceLevel } = body;
  return prisma.farmer.update({
    where: { id: farmerId },
    data: {
      onboardingCompletedAt: new Date(),
      experienceLevel: experienceLevel ?? "New",
    },
  });
};

// ─── Failure recovery (issues) ────────────────────────────────────────────────

export const reportIssue = async (user, body) => {
  const farmerId = getFarmerIdFromUser(user);
  const { farmId, zoneId, title, description, symptom, photoUrl } = body;
  if (!title?.trim() || !description?.trim()) throw new AppError("Title and description required", 400);

  const [issue, suggestionRow] = await Promise.all([
    prisma.farmIssue.create({
      data: {
        farmerId,
        farmId,
        zoneId: zoneId ?? null,
        title:  title.trim(),
        description: description.trim(),
        symptom: symptom ?? null,
        photoUrl: photoUrl ?? null,
      },
    }),
    symptom
      ? prisma.symptomSuggestion.findUnique({ where: { symptom } })
      : prisma.symptomSuggestion.findUnique({ where: { symptom: "other" } }),
  ]);

  const suggestion = suggestionRow?.suggestion ?? "Post a clear photo to the Expert Panel — they can usually diagnose visually within 24 hours.";
  return { issue, suggestion };
};

export const listIssues = async (user) => {
  const farmerId = getFarmerIdFromUser(user);
  return prisma.farmIssue.findMany({
    where: { farmerId },
    orderBy: { createdAt: "desc" },
  });
};

// ─── Farmer questions to expert ───────────────────────────────────────────────

export const askExpertQuestion = async (user, body) => {
  const farmerId = getFarmerIdFromUser(user);
  const { question, category } = body;
  if (!question?.trim()) throw new AppError("Question required", 400);
  return prisma.farmerQuestion.create({
    data: { farmerId, question: question.trim(), category: category ?? "general" },
  });
};

export const listMyQuestions = async (user) => {
  const farmerId = getFarmerIdFromUser(user);
  return prisma.farmerQuestion.findMany({
    where: { farmerId },
    orderBy: { createdAt: "desc" },
  });
};

// ─── Photo journal ────────────────────────────────────────────────────────────

export const addPhotoToZone = async (user, body) => {
  const farmerId = getFarmerIdFromUser(user);
  const { zoneId, photoUrl, caption } = body;
  if (!photoUrl?.trim()) throw new AppError("photoUrl required", 400);

  // Verify zone ownership and compute weekIntoSeason
  const zone = await prisma.zone.findFirst({
    where: { id: zoneId, farm: { farmerId } },
    include: { cropAssignment: { select: { createdAt: true } } },
  });
  if (!zone) throw new AppError("Zone not found", 404);

  const weekIntoSeason = zone.cropAssignment
    ? Math.floor((Date.now() - zone.cropAssignment.createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000))
    : null;

  return prisma.farmPhoto.create({
    data: {
      zoneId,
      farmId: zone.farmId,
      photoUrl: photoUrl.trim(),
      caption: caption ?? null,
      weekIntoSeason,
    },
  });
};

export const listZonePhotos = async (user, zoneId) => {
  const farmerId = getFarmerIdFromUser(user);
  const zone = await prisma.zone.findFirst({ where: { id: zoneId, farm: { farmerId } } });
  if (!zone) throw new AppError("Zone not found", 404);
  return prisma.farmPhoto.findMany({
    where: { zoneId },
    orderBy: { createdAt: "desc" },
  });
};

// ─── Achievements ─────────────────────────────────────────────────────────────

const ACHIEVEMENTS = {
  first_farm:       { title: "Welcome, Farmer!",    description: "You created your first farm" },
  first_soil:       { title: "Soil Scientist",      description: "You filled your first soil report" },
  first_crop:       { title: "First Seed",          description: "You assigned your first crop" },
  three_zones:      { title: "Multi-Zone Master",   description: "You're managing 3 or more zones" },
  first_harvest:    { title: "First Harvest",       description: "You completed your first harvest task" },
  first_jeevamrit:  { title: "Natural Farmer",      description: "You completed your first Jeevamrit application" },
  full_season:      { title: "Full Cycle",          description: "You completed a full crop season" },
  weekly_streak:    { title: "Steady Hand",         description: "You completed tasks 7 days in a row" },
};

export const checkAndAwardAchievements = async (farmerId) => {
  const awarded = [];
  const grant = async (key) => {
    const meta = ACHIEVEMENTS[key];
    if (!meta) return;
    const existing = await prisma.achievement.findUnique({ where: { farmerId_badgeKey: { farmerId, badgeKey: key } } });
    if (existing) return;
    await prisma.achievement.create({ data: { farmerId, badgeKey: key, title: meta.title, description: meta.description } });
    awarded.push(key);
  };

  const farms = await prisma.farm.findMany({ where: { farmerId }, include: { zones: { include: { soilReport: true, cropAssignment: true } } } });
  if (farms.length > 0) await grant("first_farm");

  const allZones = farms.flatMap((f) => f.zones);
  if (allZones.some((z) => z.soilReport)) await grant("first_soil");
  if (allZones.some((z) => z.cropAssignment)) await grant("first_crop");
  if (allZones.length >= 3) await grant("three_zones");

  const completedHarvest = await prisma.calendarTask.findFirst({
    where: { farm: { farmerId }, taskType: "harvest", status: "COMPLETED" },
  });
  if (completedHarvest) await grant("first_harvest");

  const completedJeevamrit = await prisma.calendarTask.findFirst({
    where: { farm: { farmerId }, recipeKey: "Jeevamrit", status: "COMPLETED" },
  });
  if (completedJeevamrit) await grant("first_jeevamrit");

  return awarded;
};

export const getMyAchievements = async (user) => {
  const farmerId = getFarmerIdFromUser(user);
  await checkAndAwardAchievements(farmerId);
  return prisma.achievement.findMany({ where: { farmerId }, orderBy: { earnedAt: "desc" } });
};
