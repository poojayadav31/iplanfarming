import prisma from "../config/prisma.js";
import { AppError } from "../utils/errors.js";
import { computeSoilScore, getImprovementTips } from "../utils/soilCalculations.js";

const VALID_SOIL_TYPES    = ["Kanhar", "Matasi", "Dorsa", "Bhata"];
const VALID_DRAINAGE      = ["Fast", "Balanced", "Slow"];
const VALID_SEASONS       = ["Kharif", "Rabi", "Zaid", "Perennial"];

// ─── Auth helper ──────────────────────────────────────────────────────────────

const requireExpert = (user) => {
  if (user?.role !== "EXPERT") throw new AppError("Experts only", 403);
  return user.expertId; // injected by auth middleware
};

// ─── Overview ─────────────────────────────────────────────────────────────────

export const getOverview = async (user) => {
  requireExpert(user);

  const [
    totalFarms,
    totalFarmers,
    totalZones,
    soilReports,
    cropAssignments,
    advisoryCount,
    pendingSuggestions,
  ] = await Promise.all([
    prisma.farm.count(),
    prisma.farmer.count(),
    prisma.zone.count(),
    prisma.soilReport.findMany({
      select: {
        soilHealthScore: true,
        soilType: true,
        farmId: true,
        zone: { select: { farm: { select: { district: true } } } },
      },
    }),
    prisma.zoneCropAssignment.findMany({
      select: { cropEconomics: { select: { cropName: true } } },
    }),
    prisma.expertAdvisory.count(),
    prisma.expertCropSuggestion.count({ where: { status: "PENDING" } }),
  ]);

  const avgSoilScore =
    soilReports.length
      ? Math.round(soilReports.reduce((s, r) => s + r.soilHealthScore, 0) / soilReports.length)
      : 0;

  const cropDist = {};
  for (const a of cropAssignments) {
    const c = a.cropEconomics.cropName;
    cropDist[c] = (cropDist[c] ?? 0) + 1;
  }

  const districtScores = {};
  for (const r of soilReports) {
    const district = r.zone?.farm?.district;
    if (!district) continue;
    if (!districtScores[district]) districtScores[district] = { total: 0, count: 0 };
    districtScores[district].total += r.soilHealthScore;
    districtScores[district].count += 1;
  }
  const avgByDistrict = Object.entries(districtScores).map(([district, v]) => ({
    district,
    avgScore: Math.round(v.total / v.count),
  }));

  return {
    totalFarms,
    totalFarmers,
    totalZones,
    soilReportCount: soilReports.length,
    avgSoilScore,
    cropDistribution: cropDist,
    avgSoilByDistrict: avgByDistrict,
    advisoryCount,
    pendingSuggestions,
  };
};

// ─── All Farms ────────────────────────────────────────────────────────────────

export const getAllFarms = async (user) => {
  requireExpert(user);

  return prisma.farm.findMany({
    include: {
      farmer: { include: { user: { select: { name: true, email: true } } } },
      zones: {
        include: {
          soilReport: true,
          cropAssignment: { include: { cropEconomics: true } },
        },
        orderBy: { zoneNumber: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

// ─── All Soil Reports ─────────────────────────────────────────────────────────

export const getAllSoilReports = async (user, query) => {
  requireExpert(user);
  const { district, soilType, minScore, maxScore } = query;

  const where = {};
  if (district) where.zone = { farm: { district: { contains: district, mode: "insensitive" } } };
  if (soilType) where.soilType = soilType;
  if (minScore) where.soilHealthScore = { ...(where.soilHealthScore ?? {}), gte: parseFloat(minScore) };
  if (maxScore) where.soilHealthScore = { ...(where.soilHealthScore ?? {}), lte: parseFloat(maxScore) };

  return prisma.soilReport.findMany({
    where,
    include: {
      zone: {
        select: {
          name: true,
          zoneNumber: true,
          areaSquareMeters: true,
          farmId: true,
          cropAssignment: { include: { cropEconomics: { select: { cropName: true } } } },
          farm: {
            select: {
              name: true,
              district: true,
              farmer: { include: { user: { select: { name: true } } } },
            },
          },
        },
      },
    },
    orderBy: { soilHealthScore: "asc" },
  });
};

// ─── Crop Economics ───────────────────────────────────────────────────────────

export const getCropEconomics = async (user) => {
  requireExpert(user);
  return prisma.cropEconomics.findMany({ orderBy: { cropName: "asc" } });
};

export const updateCropEconomics = async (user, id, body) => {
  requireExpert(user);

  const record = await prisma.cropEconomics.findUnique({ where: { id } });
  if (!record) throw new AppError("CropEconomics record not found", 404);

  const {
    yieldPerAcreKg,
    rawSalePricePerKg,
    processedSalePricePerKg,
    processingCostPerKg,
    seedCostPerAcre,
    durationMonths,
  } = body;

  const data = {};
  if (yieldPerAcreKg          !== undefined) data.yieldPerAcreKg          = parseFloat(yieldPerAcreKg);
  if (rawSalePricePerKg       !== undefined) data.rawSalePricePerKg       = parseFloat(rawSalePricePerKg);
  if (processedSalePricePerKg !== undefined) data.processedSalePricePerKg = parseFloat(processedSalePricePerKg);
  if (processingCostPerKg     !== undefined) data.processingCostPerKg     = parseFloat(processingCostPerKg);
  if (seedCostPerAcre         !== undefined) data.seedCostPerAcre         = parseFloat(seedCostPerAcre);
  if (durationMonths          !== undefined) data.durationMonths          = parseInt(durationMonths);

  return prisma.cropEconomics.update({ where: { id }, data });
};

// ─── Also update Crop water requirements ─────────────────────────────────────

export const getCrops = async (user) => {
  requireExpert(user);
  return prisma.crop.findMany({ orderBy: { name: "asc" } });
};

export const updateCrop = async (user, id, body) => {
  requireExpert(user);
  const {
    weeklyWaterRequirementLitersPerAcre, preferredDrainage,
    plantingWindowStart, plantingWindowEnd,
    minTempC, maxTempC, rainfallTolerance, minSoilHealthScore,
    minPh, maxPh, season, estimatedDurationMonths, scientificName, suitableSoilTypes,
    seasonDurationWeeks, cropFamily, riskLevel,
    seedKgPerAcre, spacingNotes,
  } = body;

  const data = {};
  if (weeklyWaterRequirementLitersPerAcre !== undefined)
    data.weeklyWaterRequirementLitersPerAcre = parseFloat(weeklyWaterRequirementLitersPerAcre);
  if (preferredDrainage !== undefined)   data.preferredDrainage   = preferredDrainage;
  if (plantingWindowStart !== undefined) data.plantingWindowStart = parseInt(plantingWindowStart);
  if (plantingWindowEnd !== undefined)   data.plantingWindowEnd   = parseInt(plantingWindowEnd);
  if (minTempC !== undefined)            data.minTempC            = parseFloat(minTempC);
  if (maxTempC !== undefined)            data.maxTempC            = parseFloat(maxTempC);
  if (rainfallTolerance !== undefined)   data.rainfallTolerance   = rainfallTolerance;
  if (minSoilHealthScore !== undefined)  data.minSoilHealthScore  = parseInt(minSoilHealthScore);
  if (minPh !== undefined)               data.minPh               = parseFloat(minPh);
  if (maxPh !== undefined)               data.maxPh               = parseFloat(maxPh);
  if (season !== undefined)              data.season              = season;
  if (estimatedDurationMonths !== undefined)
    data.estimatedDurationMonths = parseInt(estimatedDurationMonths);
  if (scientificName !== undefined)      data.scientificName      = scientificName?.trim() || null;
  if (Array.isArray(suitableSoilTypes))  data.suitableSoilTypes   = suitableSoilTypes;
  if (seasonDurationWeeks !== undefined) data.seasonDurationWeeks  = parseInt(seasonDurationWeeks);
  if (cropFamily !== undefined)          data.cropFamily            = cropFamily;
  if (riskLevel !== undefined)           data.riskLevel             = riskLevel;
  if (seedKgPerAcre !== undefined)       data.seedKgPerAcre         = parseFloat(seedKgPerAcre);
  if (spacingNotes !== undefined)        data.spacingNotes          = spacingNotes;

  return prisma.crop.update({ where: { id }, data });
};

// ─── Advisories ───────────────────────────────────────────────────────────────

export const getAdvisories = async (user) => {
  requireExpert(user);
  return prisma.expertAdvisory.findMany({
    include: {
      expert: { include: { user: { select: { name: true } } } },
      farm:   { select: { name: true, district: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const createAdvisory = async (user, body) => {
  const expertId = requireExpert(user);
  const { title, body: text, category, season, priority, isGlobal, farmId } = body;

  if (!title?.trim()) throw new AppError("Title is required", 400);
  if (!text?.trim())  throw new AppError("Body is required", 400);
  if (!category)      throw new AppError("Category is required", 400);

  if (farmId) {
    const farm = await prisma.farm.findUnique({ where: { id: farmId } });
    if (!farm) throw new AppError("Farm not found", 404);
  }

  return prisma.expertAdvisory.create({
    data: {
      expertId,
      farmId:   farmId ?? null,
      title:    title.trim(),
      body:     text.trim(),
      category,
      season:   season ?? null,
      priority: priority ?? "normal",
      isGlobal: isGlobal ?? !farmId,
    },
    include: {
      expert: { include: { user: { select: { name: true } } } },
      farm:   { select: { name: true, district: true } },
    },
  });
};

export const deleteAdvisory = async (user, id) => {
  const expertId = requireExpert(user);
  const advisory = await prisma.expertAdvisory.findFirst({ where: { id, expertId } });
  if (!advisory) throw new AppError("Advisory not found", 404);
  await prisma.expertAdvisory.delete({ where: { id } });
  return { deleted: true };
};

// ─── Farmer-facing: get advisories relevant to their farm ────────────────────

export const getFarmerAdvisories = async (farmId, user) => {
  const farm = await prisma.farm.findFirst({
    where: { id: farmId, farmer: { userId: user.id } },
    select: { id: true },
  });
  if (!farm) throw new AppError("Farm not found", 404);

  return prisma.expertAdvisory.findMany({
    where: { OR: [{ isGlobal: true }, { farmId }] },
    include: { expert: { include: { user: { select: { name: true } } } } },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 20,
  });
};

// ─── Expert: add calendar task to any farm ───────────────────────────────────

export const addTaskToFarm = async (user, farmId, body) => {
  requireExpert(user);

  const farm = await prisma.farm.findUnique({ where: { id: farmId } });
  if (!farm) throw new AppError("Farm not found", 404);

  const { title, scheduledDate, category, priority, labourWorkers, labourHours, zoneId, notes } = body;
  if (!title?.trim())  throw new AppError("Title is required", 400);
  if (!scheduledDate)  throw new AppError("Date is required", 400);

  if (zoneId) {
    const zone = await prisma.zone.findFirst({ where: { id: zoneId, farmId } });
    if (!zone) throw new AppError("Zone not found", 404);
  }

  return prisma.calendarTask.create({
    data: {
      farmId,
      zoneId:        zoneId ?? null,
      cropName:      "",
      taskType:      "custom",
      category:      category ?? "crop_care",
      scheduledDate: new Date(scheduledDate),
      title:         `[Expert] ${title.trim()}`,
      priority:      priority ?? "morning",
      labourWorkers: parseInt(labourWorkers) || 1,
      labourHours:   parseFloat(labourHours) || 1,
      isCustom:      true,
      notes:         notes?.trim() || null,
      checklistItems: [],
    },
  });
};

// ─── Crop Suggestions ─────────────────────────────────────────────────────────

export const getSuggestions = async (user) => {
  requireExpert(user);
  return prisma.expertCropSuggestion.findMany({
    include: {
      expert: { include: { user: { select: { name: true } } } },
      zone:   { select: { name: true, zoneNumber: true } },
      farm:   { select: { name: true, district: true, farmer: { include: { user: { select: { name: true } } } } } },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const createSuggestion = async (user, body) => {
  const expertId = requireExpert(user);
  const { zoneId, cropName, reason, season } = body;

  if (!zoneId || !cropName || !reason || !season)
    throw new AppError("zoneId, cropName, reason and season are required", 400);

  const zone = await prisma.zone.findUnique({ where: { id: zoneId }, select: { id: true, farmId: true } });
  if (!zone) throw new AppError("Zone not found", 404);

  return prisma.expertCropSuggestion.create({
    data: { expertId, zoneId, farmId: zone.farmId, cropName, reason, season, status: "PENDING" },
    include: {
      zone: { select: { name: true, zoneNumber: true } },
      farm: { select: { name: true, district: true } },
    },
  });
};

export const deleteSuggestion = async (user, id) => {
  const expertId = requireExpert(user);
  const s = await prisma.expertCropSuggestion.findFirst({ where: { id, expertId } });
  if (!s) throw new AppError("Suggestion not found", 404);
  await prisma.expertCropSuggestion.delete({ where: { id } });
  return { deleted: true };
};

// ─── Farmer: get suggestions for their farm ───────────────────────────────────

export const getFarmerSuggestions = async (farmId, user) => {
  const farm = await prisma.farm.findFirst({
    where: { id: farmId, farmer: { userId: user.id } },
    select: { id: true },
  });
  if (!farm) throw new AppError("Farm not found", 404);

  return prisma.expertCropSuggestion.findMany({
    where: { farmId, status: "PENDING" },
    include: {
      expert: { include: { user: { select: { name: true } } } },
      zone:   { select: { name: true, zoneNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const respondToSuggestion = async (suggestionId, status, farmerNote, user) => {
  const farm = await prisma.expertCropSuggestion.findUnique({
    where: { id: suggestionId },
    select: { farmId: true },
  });
  if (!farm) throw new AppError("Suggestion not found", 404);

  const owned = await prisma.farm.findFirst({
    where: { id: farm.farmId, farmer: { userId: user.id } },
  });
  if (!owned) throw new AppError("Not your farm", 403);

  if (!["ACCEPTED", "REJECTED"].includes(status))
    throw new AppError("Status must be ACCEPTED or REJECTED", 400);

  return prisma.expertCropSuggestion.update({
    where: { id: suggestionId },
    data: { status, farmerNote: farmerNote ?? null },
  });
};

// ─── Add new Crop ─────────────────────────────────────────────────────────────

export const createCrop = async (user, body) => {
  requireExpert(user);
  const {
    name, scientificName, season, minPh, maxPh,
    estimatedDurationMonths, weeklyWaterRequirementLitersPerAcre, suitableSoilTypes,
  } = body;

  if (!name?.trim())  throw new AppError("Crop name is required", 400);
  if (!season)        throw new AppError("Season is required", 400);
  if (minPh == null || maxPh == null) throw new AppError("pH range is required", 400);
  if (!estimatedDurationMonths) throw new AppError("Duration is required", 400);

  const existing = await prisma.crop.findUnique({ where: { name: name.trim() } });
  if (existing) throw new AppError(`Crop "${name.trim()}" already exists`, 409);

  const {
    preferredDrainage, plantingWindowStart, plantingWindowEnd,
    minTempC, maxTempC, rainfallTolerance, minSoilHealthScore,
  } = body;

  return prisma.crop.create({
    data: {
      name:                                name.trim(),
      scientificName:                      scientificName?.trim() || null,
      season,
      minPh:                               parseFloat(minPh),
      maxPh:                               parseFloat(maxPh),
      estimatedDurationMonths:             parseInt(estimatedDurationMonths),
      weeklyWaterRequirementLitersPerAcre: parseFloat(weeklyWaterRequirementLitersPerAcre) || 5000,
      suitableSoilTypes:                   Array.isArray(suitableSoilTypes) ? suitableSoilTypes : [],
      preferredDrainage:                   preferredDrainage ?? "Any",
      plantingWindowStart:                 parseInt(plantingWindowStart) || 1,
      plantingWindowEnd:                   parseInt(plantingWindowEnd) || 12,
      minTempC:                            parseFloat(minTempC) || 10,
      maxTempC:                            parseFloat(maxTempC) || 45,
      rainfallTolerance:                   rainfallTolerance ?? "moderate",
      minSoilHealthScore:                  parseInt(minSoilHealthScore) || 0,
    },
  });
};

// ─── Add new CropEconomics ────────────────────────────────────────────────────

export const createCropEconomics = async (user, body) => {
  requireExpert(user);
  const {
    cropName, season, durationMonths,
    yieldPerAcreKg, rawSalePricePerKg, processedSalePricePerKg,
    processingCostPerKg, seedCostPerAcre,
  } = body;

  if (!cropName?.trim()) throw new AppError("cropName is required", 400);
  if (!season)           throw new AppError("season is required", 400);
  if (!durationMonths)   throw new AppError("durationMonths is required", 400);

  const existing = await prisma.cropEconomics.findUnique({ where: { cropName: cropName.trim() } });
  if (existing) throw new AppError(`CropEconomics for "${cropName.trim()}" already exists`, 409);

  return prisma.cropEconomics.create({
    data: {
      cropName:               cropName.trim(),
      season,
      durationMonths:         parseInt(durationMonths),
      yieldPerAcreKg:         parseFloat(yieldPerAcreKg)          || 0,
      rawSalePricePerKg:      parseFloat(rawSalePricePerKg)       || 0,
      processedSalePricePerKg: parseFloat(processedSalePricePerKg) || 0,
      processingCostPerKg:    parseFloat(processingCostPerKg)     || 0,
      seedCostPerAcre:        parseFloat(seedCostPerAcre)         || 0,
    },
  });
};

// ─── Edit Soil Report ─────────────────────────────────────────────────────────

export const updateSoilReport = async (user, id, body) => {
  requireExpert(user);

  const report = await prisma.soilReport.findUnique({ where: { id } });
  if (!report) throw new AppError("Soil report not found", 404);

  const soilType      = body.soilType      ?? report.soilType;
  const drainageSpeed = body.drainageSpeed ?? report.drainageSpeed;
  const phLevel       = body.phLevel       !== undefined ? parseFloat(body.phLevel)       : report.phLevel;
  const earthwormCount = body.earthwormCount !== undefined ? parseInt(body.earthwormCount) : report.earthwormCount;

  if (!VALID_SOIL_TYPES.includes(soilType))
    throw new AppError(`soilType must be one of: ${VALID_SOIL_TYPES.join(", ")}`, 400);
  if (!VALID_DRAINAGE.includes(drainageSpeed))
    throw new AppError(`drainageSpeed must be one of: ${VALID_DRAINAGE.join(", ")}`, 400);

  const scores        = computeSoilScore({ soilType, phLevel, drainageSpeed, earthwormCount });
  const improvementTips = getImprovementTips({ soilType, phLevel, drainageSpeed });

  return prisma.soilReport.update({
    where: { id },
    data: {
      soilType, drainageSpeed, phLevel, earthwormCount,
      ...scores,
      improvementTips,
    },
    include: {
      zone: {
        select: {
          name: true, zoneNumber: true, areaSquareMeters: true, farmId: true,
          farm: { select: { name: true, district: true, farmer: { include: { user: { select: { name: true } } } } } },
        },
      },
    },
  });
};

// ─── Soil-Crop Reference ──────────────────────────────────────────────────────

export const getSoilCropRefs = async (user) => {
  requireExpert(user);
  return prisma.soilCropReference.findMany({
    orderBy: [{ soilType: "asc" }, { season: "asc" }, { cropName: "asc" }],
  });
};

export const createSoilCropRef = async (user, body) => {
  requireExpert(user);
  const { soilType, cropName, season, phMin, phMax, soilFitNotes } = body;

  if (!soilType || !cropName || !season || phMin == null || phMax == null)
    throw new AppError("soilType, cropName, season, phMin, phMax are required", 400);
  if (!VALID_SOIL_TYPES.includes(soilType))
    throw new AppError(`soilType must be one of: ${VALID_SOIL_TYPES.join(", ")}`, 400);
  if (!VALID_SEASONS.includes(season))
    throw new AppError(`season must be one of: ${VALID_SEASONS.join(", ")}`, 400);

  return prisma.soilCropReference.create({
    data: {
      soilType, cropName, season,
      phMin: parseFloat(phMin),
      phMax: parseFloat(phMax),
      soilFitNotes: soilFitNotes?.trim() || null,
    },
  });
};

export const deleteSoilCropRef = async (user, id) => {
  requireExpert(user);
  const ref = await prisma.soilCropReference.findUnique({ where: { id } });
  if (!ref) throw new AppError("Reference not found", 404);
  await prisma.soilCropReference.delete({ where: { id } });
  return { deleted: true };
};

// ─── Farm Financials ──────────────────────────────────────────────────────────

export const updateFarmFinancials = async (user, farmId, body) => {
  requireExpert(user);

  const farm = await prisma.farm.findUnique({ where: { id: farmId } });
  if (!farm) throw new AppError("Farm not found", 404);

  const {
    landLayoutCost, dripIrrigationCost, solarDryerCost,
    annualLabourCost, jeevamritHomemade,
  } = body;

  const data = {};
  if (landLayoutCost     !== undefined) data.landLayoutCost     = parseFloat(landLayoutCost);
  if (dripIrrigationCost !== undefined) data.dripIrrigationCost = parseFloat(dripIrrigationCost);
  if (solarDryerCost     !== undefined) data.solarDryerCost     = parseFloat(solarDryerCost);
  if (annualLabourCost   !== undefined) data.annualLabourCost   = parseFloat(annualLabourCost);
  if (jeevamritHomemade  !== undefined) data.jeevamritHomemade  = Boolean(jeevamritHomemade);

  return prisma.farmFinancials.upsert({
    where:  { farmId },
    update: data,
    create: { farmId, ...data },
  });
};

// ─── Crop Lifecycle Templates ─────────────────────────────────────────────────

export const getLifecycleTemplates = async (user) => {
  requireExpert(user);
  return prisma.cropLifecycleTemplate.findMany({
    orderBy: [{ cropName: "asc" }, { weekOffset: "asc" }, { taskType: "asc" }],
  });
};

export const createLifecycleTemplate = async (user, body) => {
  requireExpert(user);
  const {
    cropName, weekOffset, taskType, category, title,
    priority, workers, hoursPerAcre, recipeKey, isObservation,
  } = body;

  if (!cropName?.trim()) throw new AppError("cropName is required", 400);
  if (weekOffset == null)  throw new AppError("weekOffset is required", 400);
  if (!taskType?.trim())   throw new AppError("taskType is required", 400);
  if (!category?.trim())   throw new AppError("category is required", 400);
  if (!title?.trim())      throw new AppError("title is required", 400);

  return prisma.cropLifecycleTemplate.create({
    data: {
      cropName:     cropName.trim(),
      weekOffset:   parseInt(weekOffset),
      taskType:     taskType.trim(),
      category:     category.trim(),
      title:        title.trim(),
      priority:     priority ?? "morning",
      workers:      parseInt(workers) || 2,
      hoursPerAcre: parseFloat(hoursPerAcre) || 8,
      recipeKey:    recipeKey || null,
      isObservation: Boolean(isObservation),
    },
  });
};

export const updateLifecycleTemplate = async (user, id, body) => {
  requireExpert(user);
  const record = await prisma.cropLifecycleTemplate.findUnique({ where: { id } });
  if (!record) throw new AppError("Template not found", 404);

  const {
    weekOffset, taskType, category, title,
    priority, workers, hoursPerAcre, recipeKey, isObservation,
  } = body;

  const data = {};
  if (weekOffset    !== undefined) data.weekOffset    = parseInt(weekOffset);
  if (taskType      !== undefined) data.taskType      = taskType.trim();
  if (category      !== undefined) data.category      = category.trim();
  if (title         !== undefined) data.title         = title.trim();
  if (priority      !== undefined) data.priority      = priority;
  if (workers       !== undefined) data.workers       = parseInt(workers);
  if (hoursPerAcre  !== undefined) data.hoursPerAcre  = parseFloat(hoursPerAcre);
  if (recipeKey     !== undefined) data.recipeKey     = recipeKey || null;
  if (isObservation !== undefined) data.isObservation = Boolean(isObservation);

  return prisma.cropLifecycleTemplate.update({ where: { id }, data });
};

export const deleteLifecycleTemplate = async (user, id) => {
  requireExpert(user);
  const record = await prisma.cropLifecycleTemplate.findUnique({ where: { id } });
  if (!record) throw new AppError("Template not found", 404);
  await prisma.cropLifecycleTemplate.delete({ where: { id } });
  return { deleted: true };
};

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOGUE MANAGEMENT — expert-editable reference data
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Government Schemes ──────────────────────────────────────────────────────
export const listGovSchemesAdmin = async (user) => {
  requireExpert(user);
  return prisma.govScheme.findMany({ orderBy: { schemeName: "asc" } });
};
export const createGovScheme = async (user, body) => {
  requireExpert(user);
  const { schemeName, category, benefitSummary, eligibilityNotes, applyUrl, active } = body;
  if (!schemeName?.trim()) throw new AppError("schemeName required", 400);
  return prisma.govScheme.create({
    data: {
      schemeName: schemeName.trim(),
      category: category ?? "income-support",
      benefitSummary: benefitSummary ?? "",
      eligibilityNotes: eligibilityNotes ?? "",
      applyUrl: applyUrl ?? null,
      active: active ?? true,
    },
  });
};
export const updateGovScheme = async (user, id, body) => {
  requireExpert(user);
  const data = {};
  for (const k of ["schemeName", "category", "benefitSummary", "eligibilityNotes", "applyUrl", "active"]) {
    if (body[k] !== undefined) data[k] = body[k];
  }
  return prisma.govScheme.update({ where: { id }, data });
};
export const deleteGovScheme = async (user, id) => {
  requireExpert(user);
  await prisma.govScheme.delete({ where: { id } });
  return { deleted: true };
};

// ─── Crop Pairings (companions) ──────────────────────────────────────────────
export const listCropPairings = async (user) => {
  requireExpert(user);
  return prisma.cropPairing.findMany({ orderBy: [{ primaryCrop: "asc" }, { companionCrop: "asc" }] });
};
export const createCropPairing = async (user, body) => {
  requireExpert(user);
  const { primaryCrop, companionCrop, benefit, rowRatio, spacingNotes } = body;
  if (!primaryCrop?.trim() || !companionCrop?.trim() || !benefit?.trim())
    throw new AppError("primaryCrop, companionCrop, benefit required", 400);
  return prisma.cropPairing.create({
    data: {
      primaryCrop: primaryCrop.trim(),
      companionCrop: companionCrop.trim(),
      benefit: benefit.trim(),
      rowRatio: rowRatio ?? null,
      spacingNotes: spacingNotes ?? null,
    },
  });
};
export const updateCropPairing = async (user, id, body) => {
  requireExpert(user);
  const data = {};
  for (const k of ["primaryCrop", "companionCrop", "benefit", "rowRatio", "spacingNotes"]) {
    if (body[k] !== undefined) data[k] = body[k];
  }
  return prisma.cropPairing.update({ where: { id }, data });
};
export const deleteCropPairing = async (user, id) => {
  requireExpert(user);
  await prisma.cropPairing.delete({ where: { id } });
  return { deleted: true };
};

// ─── Cover Crops ─────────────────────────────────────────────────────────────
export const listCoverCrops = async (user) => {
  requireExpert(user);
  return prisma.coverCrop.findMany({ orderBy: { name: "asc" } });
};
export const createCoverCrop = async (user, body) => {
  requireExpert(user);
  const { name, durationWeeks, nitrogenFixedKgPerAcre, bestForSeason, description, preparationNotes } = body;
  if (!name?.trim()) throw new AppError("name required", 400);
  return prisma.coverCrop.create({
    data: {
      name: name.trim(),
      durationWeeks: parseInt(durationWeeks ?? 8),
      nitrogenFixedKgPerAcre: parseFloat(nitrogenFixedKgPerAcre ?? 0),
      bestForSeason: bestForSeason ?? "pre-Kharif",
      description: description ?? "",
      preparationNotes: preparationNotes ?? null,
    },
  });
};
export const updateCoverCrop = async (user, id, body) => {
  requireExpert(user);
  const data = {};
  if (body.name !== undefined)                  data.name = body.name;
  if (body.durationWeeks !== undefined)         data.durationWeeks = parseInt(body.durationWeeks);
  if (body.nitrogenFixedKgPerAcre !== undefined)data.nitrogenFixedKgPerAcre = parseFloat(body.nitrogenFixedKgPerAcre);
  if (body.bestForSeason !== undefined)         data.bestForSeason = body.bestForSeason;
  if (body.description !== undefined)           data.description = body.description;
  if (body.preparationNotes !== undefined)      data.preparationNotes = body.preparationNotes;
  return prisma.coverCrop.update({ where: { id }, data });
};
export const deleteCoverCrop = async (user, id) => {
  requireExpert(user);
  await prisma.coverCrop.delete({ where: { id } });
  return { deleted: true };
};

// ─── Crop Varieties ──────────────────────────────────────────────────────────
export const listCropVarieties = async (user) => {
  requireExpert(user);
  return prisma.cropVariety.findMany({ orderBy: [{ cropName: "asc" }, { varietyName: "asc" }] });
};
export const createCropVariety = async (user, body) => {
  requireExpert(user);
  const { cropName, varietyName, recommendedFor, yieldPotential, durationDays, pestResistance, notes } = body;
  if (!cropName?.trim() || !varietyName?.trim()) throw new AppError("cropName and varietyName required", 400);
  return prisma.cropVariety.create({
    data: {
      cropName: cropName.trim(),
      varietyName: varietyName.trim(),
      recommendedFor: Array.isArray(recommendedFor) ? recommendedFor : [],
      yieldPotential: yieldPotential ? parseFloat(yieldPotential) : null,
      durationDays: durationDays ? parseInt(durationDays) : null,
      pestResistance: pestResistance ?? null,
      notes: notes ?? null,
    },
  });
};
export const updateCropVariety = async (user, id, body) => {
  requireExpert(user);
  const data = {};
  if (body.cropName !== undefined)        data.cropName = body.cropName;
  if (body.varietyName !== undefined)     data.varietyName = body.varietyName;
  if (Array.isArray(body.recommendedFor)) data.recommendedFor = body.recommendedFor;
  if (body.yieldPotential !== undefined)  data.yieldPotential = body.yieldPotential ? parseFloat(body.yieldPotential) : null;
  if (body.durationDays !== undefined)    data.durationDays = body.durationDays ? parseInt(body.durationDays) : null;
  if (body.pestResistance !== undefined)  data.pestResistance = body.pestResistance;
  if (body.notes !== undefined)           data.notes = body.notes;
  return prisma.cropVariety.update({ where: { id }, data });
};
export const deleteCropVariety = async (user, id) => {
  requireExpert(user);
  await prisma.cropVariety.delete({ where: { id } });
  return { deleted: true };
};

// ─── Mandi Prices ────────────────────────────────────────────────────────────
export const listMandiPricesAdmin = async (user) => {
  requireExpert(user);
  return prisma.mandiPrice.findMany({ orderBy: { recordedAt: "desc" }, take: 200 });
};
export const createMandiPrice = async (user, body) => {
  requireExpert(user);
  const { cropName, district, pricePerQuintal, msp, source } = body;
  if (!cropName?.trim() || !district?.trim() || !pricePerQuintal)
    throw new AppError("cropName, district, pricePerQuintal required", 400);
  return prisma.mandiPrice.create({
    data: {
      cropName: cropName.trim(),
      district: district.trim(),
      pricePerQuintal: parseFloat(pricePerQuintal),
      msp: msp ? parseFloat(msp) : null,
      source: source ?? "expert",
    },
  });
};
export const deleteMandiPrice = async (user, id) => {
  requireExpert(user);
  await prisma.mandiPrice.delete({ where: { id } });
  return { deleted: true };
};

// ─── Knowledge Articles ──────────────────────────────────────────────────────
export const listKnowledgeArticlesAdmin = async (user) => {
  requireExpert(user);
  return prisma.knowledgeArticle.findMany({ orderBy: { createdAt: "desc" } });
};
export const createKnowledgeArticle = async (user, body) => {
  requireExpert(user);
  const { title, body: text, category, tags, isPublished } = body;
  if (!title?.trim() || !text?.trim()) throw new AppError("title and body required", 400);
  return prisma.knowledgeArticle.create({
    data: {
      title: title.trim(),
      body: text.trim(),
      category: category ?? "general",
      tags: Array.isArray(tags) ? tags : [],
      isPublished: isPublished ?? true,
    },
  });
};
export const updateKnowledgeArticle = async (user, id, body) => {
  requireExpert(user);
  const data = {};
  for (const k of ["title", "category", "isPublished"]) if (body[k] !== undefined) data[k] = body[k];
  if (body.body !== undefined)         data.body = body.body;
  if (Array.isArray(body.tags))        data.tags = body.tags;
  return prisma.knowledgeArticle.update({ where: { id }, data });
};
export const deleteKnowledgeArticle = async (user, id) => {
  requireExpert(user);
  await prisma.knowledgeArticle.delete({ where: { id } });
  return { deleted: true };
};

// ─── Pest Alerts (manual creation) ───────────────────────────────────────────
export const listPestAlertsAdmin = async (user) => {
  requireExpert(user);
  return prisma.pestAlert.findMany({ orderBy: { lastReportedAt: "desc" } });
};
export const createPestAlert = async (user, body) => {
  requireExpert(user);
  const { district, cropName, pestName, reportCount, isActive } = body;
  if (!district?.trim() || !pestName?.trim()) throw new AppError("district and pestName required", 400);
  return prisma.pestAlert.create({
    data: {
      district: district.trim(),
      cropName: cropName ?? null,
      pestName: pestName.trim(),
      reportCount: reportCount ? parseInt(reportCount) : 1,
      lastReportedAt: new Date(),
      isActive: isActive ?? true,
    },
  });
};
export const updatePestAlert = async (user, id, body) => {
  requireExpert(user);
  const data = {};
  for (const k of ["district", "cropName", "pestName", "isActive"]) if (body[k] !== undefined) data[k] = body[k];
  if (body.reportCount !== undefined) data.reportCount = parseInt(body.reportCount);
  return prisma.pestAlert.update({ where: { id }, data });
};
export const deletePestAlert = async (user, id) => {
  requireExpert(user);
  await prisma.pestAlert.delete({ where: { id } });
  return { deleted: true };
};

// ─── Border Crops (CRUD) ──────────────────────────────────────────────────────

export const listBorderCropsAdmin = async (user) => {
  requireExpert(user);
  return prisma.borderCrop.findMany({ orderBy: { primaryCrop: "asc" } });
};
export const createBorderCrop = async (user, body) => {
  requireExpert(user);
  const { primaryCrop, borderCropName, benefit, rowRatio, notes } = body;
  if (!primaryCrop || !borderCropName) throw new AppError("primaryCrop and borderCropName required", 400);
  return prisma.borderCrop.create({ data: { primaryCrop: primaryCrop.trim(), borderCropName: borderCropName.trim(), benefit: benefit ?? null, rowRatio: rowRatio ?? null, notes: notes ?? null } });
};
export const updateBorderCrop = async (user, id, body) => {
  requireExpert(user);
  const data = {};
  for (const k of ["primaryCrop", "borderCropName", "benefit", "rowRatio", "notes"]) if (body[k] !== undefined) data[k] = body[k];
  return prisma.borderCrop.update({ where: { id }, data });
};
export const deleteBorderCrop = async (user, id) => {
  requireExpert(user);
  await prisma.borderCrop.delete({ where: { id } });
  return { deleted: true };
};

// ─── Farmer Questions (Expert answers) ───────────────────────────────────────
export const listAllFarmerQuestions = async (user) => {
  requireExpert(user);
  return prisma.farmerQuestion.findMany({
    include: { farmer: { include: { user: { select: { name: true } } } } },
    orderBy: [{ answeredAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
  });
};
export const answerFarmerQuestion = async (user, id, body) => {
  const expertId = requireExpert(user);
  const { answer } = body;
  if (!answer?.trim()) throw new AppError("answer required", 400);
  return prisma.farmerQuestion.update({
    where: { id },
    data: { answer: answer.trim(), answeredAt: new Date(), answeredBy: expertId },
  });
};

// ─── Symptom Suggestions (Expert editable) ───────────────────────────────────
export const listSymptomSuggestions = async () => {
  return prisma.symptomSuggestion.findMany({ orderBy: { symptom: "asc" } });
};

export const updateSymptomSuggestion = async (user, symptom, body) => {
  requireExpert(user);
  const { suggestion, label } = body;
  if (!suggestion?.trim()) throw new AppError("suggestion text required", 400);
  return prisma.symptomSuggestion.upsert({
    where: { symptom },
    create: { symptom, label: label ?? symptom, suggestion: suggestion.trim() },
    update: { suggestion: suggestion.trim(), ...(label ? { label } : {}) },
  });
};
