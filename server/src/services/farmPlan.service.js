import prisma from "../config/prisma.js";
import { BASE_INPUT_COST_PER_ACRE, SQ_METERS_PER_ACRE } from "../constants/naturalFarming.js";
import { getFarmerIdFromUser } from "../utils/serviceUtils.js";
import { AppError } from "../utils/errors.js";

// Soil-type to preferred CropEconomics crop order (based on Chhattisgarh manual)
const SOIL_CROP_PRIORITY = {
  Kanhar: ["Haldi", "Papaya", "Leafy Vegetable", "Creepers"],
  Matasi: ["Papaya", "Haldi", "Creepers", "Leafy Vegetable"],
  Dorsa: ["Creepers", "Papaya", "Leafy Vegetable", "Haldi"],
  Bhata: ["Leafy Vegetable", "Creepers", "Haldi", "Papaya"],
};

// Fallback ranking when no soil report is available (by zone size rank)
const SIZE_RANK_CROPS = ["Haldi", "Papaya", "Creepers", "Leafy Vegetable"];

/**
 * Compute per-zone economics for a given cropEconomics record and area.
 * Papaya Year 1 special case is not applied here because the planner
 * is a planning tool (year-2+ steady state).
 */
const computeZoneEconomics = (crop, areaAcres) => {
  const grossIncomeRaw = areaAcres * crop.yieldPerAcreKg * crop.rawSalePricePerKg;
  const grossIncomeProcessed =
    areaAcres *
    crop.yieldPerAcreKg *
    (crop.processedSalePricePerKg - crop.processingCostPerKg);
  const inputCost =
    areaAcres * crop.seedCostPerAcre + areaAcres * BASE_INPUT_COST_PER_ACRE;
  return {
    grossIncomeRaw: Math.round(grossIncomeRaw),
    grossIncomeProcessed: Math.round(grossIncomeProcessed),
    inputCost: Math.round(inputCost),
    netProfitRaw: Math.round(grossIncomeRaw - inputCost),
    netProfitProcessed: Math.round(grossIncomeProcessed - inputCost),
  };
};

/**
 * Pick the best CropEconomics crop for a zone that has no manual assignment.
 * Priority: soil-type mapping → zone size ranking within unassigned zones.
 */
const autoSuggestCrop = (zone, allCropEconomics, sizeRankIndex) => {
  const byName = Object.fromEntries(allCropEconomics.map((c) => [c.cropName, c]));

  if (zone.soilReport) {
    const priority = SOIL_CROP_PRIORITY[zone.soilReport.soilType];
    if (priority) {
      for (const cropName of priority) {
        if (byName[cropName]) {
          return {
            crop: byName[cropName],
            reason: `Recommended for ${zone.soilReport.soilType} soil type`,
            isAutoSuggested: true,
          };
        }
      }
    }
  }

  // Fall back to size-based ranking
  const fallbackName = SIZE_RANK_CROPS[Math.min(sizeRankIndex, SIZE_RANK_CROPS.length - 1)];
  return {
    crop: byName[fallbackName] ?? allCropEconomics[0],
    reason: "Suggested based on zone size ranking",
    isAutoSuggested: true,
  };
};

/**
 * Build scenario comparison payloads.
 * Returns an array of 4 scenario objects.
 */
const buildScenarios = (zones, allCropEconomics, farmAcres) => {
  // Scenario 1: Current Plan — sum of per-zone economics (manual + auto-suggested)
  const currentPlanTotals = zones.reduce(
    (acc, z) => {
      acc.grossIncomeRaw += z.economics.grossIncomeRaw;
      acc.grossIncomeProcessed += z.economics.grossIncomeProcessed;
      acc.inputCost += z.economics.inputCost;
      acc.netProfitRaw += z.economics.netProfitRaw;
      acc.netProfitProcessed += z.economics.netProfitProcessed;
      return acc;
    },
    { grossIncomeRaw: 0, grossIncomeProcessed: 0, inputCost: 0, netProfitRaw: 0, netProfitProcessed: 0 }
  );

  // Scenario 2: Full Multilayer Model — all 4 crops on same total area simultaneously
  const multilayerTotals = allCropEconomics.reduce(
    (acc, crop) => {
      const eco = computeZoneEconomics(crop, farmAcres);
      acc.grossIncomeRaw += eco.grossIncomeRaw;
      acc.grossIncomeProcessed += eco.grossIncomeProcessed;
      acc.inputCost += eco.inputCost;
      acc.netProfitRaw += eco.netProfitRaw;
      acc.netProfitProcessed += eco.netProfitProcessed;
      return acc;
    },
    { grossIncomeRaw: 0, grossIncomeProcessed: 0, inputCost: 0, netProfitRaw: 0, netProfitProcessed: 0 }
  );

  // Scenario 3 & 4: Best single crop across whole farm (raw / value-added)
  const cropScores = allCropEconomics.map((crop) => {
    const eco = computeZoneEconomics(crop, farmAcres);
    return { crop, eco };
  });

  const bestRaw = cropScores.reduce((best, c) =>
    c.eco.netProfitRaw > best.eco.netProfitRaw ? c : best
  );
  const bestProcessed = cropScores.reduce((best, c) =>
    c.eco.netProfitProcessed > best.eco.netProfitProcessed ? c : best
  );

  return [
    {
      key: "current_plan",
      name: "Your Current Plan",
      description: "Economics based on your zone assignments (auto-suggested where not set)",
      highlightColor: "emerald",
      ...currentPlanTotals,
    },
    {
      key: "full_multilayer",
      name: "Full Multilayer Model",
      description: "All 4 crops grown simultaneously on the same land (intercropping)",
      highlightColor: "blue",
      ...multilayerTotals,
    },
    {
      key: "max_raw_profit",
      name: `Max Raw Profit (${bestRaw.crop.cropName})`,
      description: `Entire farm planted with ${bestRaw.crop.cropName} — sold raw at mandi`,
      highlightColor: "amber",
      ...bestRaw.eco,
    },
    {
      key: "max_value_added",
      name: `Max Value-Added (${bestProcessed.crop.cropName})`,
      description: `Entire farm planted with ${bestProcessed.crop.cropName} — processed and sold`,
      highlightColor: "violet",
      ...bestProcessed.eco,
    },
  ];
};

// ─── Public Service Functions ──────────────────────────────────────────────

export const getFarmPlan = async (farmId, user) => {
  const farmerId = getFarmerIdFromUser(user);

  const farm = await prisma.farm.findFirst({
    where: { id: farmId, farmerId },
    include: {
      zones: {
        orderBy: { zoneNumber: "asc" },
        include: {
          soilReport: {
            select: {
              soilType: true,
              phLevel: true,
              drainageSpeed: true,
              soilHealthScore: true,
              scoreLabel: true,
            },
          },
          cropAssignment: {
            include: {
              cropEconomics: true,
            },
          },
        },
      },
    },
  });

  if (!farm) {
    throw new AppError("Farm not found", 404);
  }

  const allCropEconomics = await prisma.cropEconomics.findMany({
    orderBy: { cropName: "asc" },
  });

  if (allCropEconomics.length === 0) {
    throw new AppError("Crop economics data not seeded. Run npm run db:seed first.", 500);
  }

  const farmAcres = farm.areaSquareMeters / SQ_METERS_PER_ACRE;

  // Separate zones with and without assignments to determine size-rank index
  let sizeRankIndex = 0;
  const zonesSortedBySize = [...farm.zones].sort(
    (a, b) => b.areaSquareMeters - a.areaSquareMeters
  );
  const sizeRankMap = new Map(
    zonesSortedBySize
      .filter((z) => !z.cropAssignment)
      .map((z, idx) => [z.id, idx])
  );

  const zones = farm.zones.map((zone) => {
    const areaAcres = zone.areaSquareMeters / SQ_METERS_PER_ACRE;
    let cropForZone;
    let suggestion;

    if (zone.cropAssignment) {
      cropForZone = zone.cropAssignment.cropEconomics;
      suggestion = {
        cropName: cropForZone.cropName,
        cropEconomicsId: cropForZone.id,
        notes: zone.cropAssignment.notes,
        reason: zone.cropAssignment.notes || "Manually assigned by farmer",
        isAutoSuggested: false,
      };
    } else {
      const rankIdx = sizeRankMap.get(zone.id) ?? sizeRankIndex++;
      const auto = autoSuggestCrop(zone, allCropEconomics, rankIdx);
      cropForZone = auto.crop;
      suggestion = {
        cropName: auto.crop.cropName,
        cropEconomicsId: auto.crop.id,
        notes: null,
        reason: auto.reason,
        isAutoSuggested: true,
      };
    }

    const economics = computeZoneEconomics(cropForZone, areaAcres);

    return {
      id: zone.id,
      name: zone.name,
      zoneNumber: zone.zoneNumber,
      areaAcres: Math.round(areaAcres * 100) / 100,
      areaBigha: zone.areaBigha,
      soilReport: zone.soilReport ?? null,
      suggestion,
      economics,
    };
  });

  const scenarios = buildScenarios(zones, allCropEconomics, farmAcres);

  return {
    farmId: farm.id,
    farmName: farm.name,
    areaAcres: Math.round(farmAcres * 100) / 100,
    totalZones: farm.zones.length,
    availableCrops: allCropEconomics.map((c) => ({
      id: c.id,
      cropName: c.cropName,
      season: c.season,
      durationMonths: c.durationMonths,
      yieldPerAcreKg: c.yieldPerAcreKg,
      rawSalePricePerKg: c.rawSalePricePerKg,
      processedSalePricePerKg: c.processedSalePricePerKg,
    })),
    zones,
    scenarios,
  };
};

export const assignCropToZone = async (zoneId, cropEconomicsId, notes, user, cropName = null) => {
  const farmerId = getFarmerIdFromUser(user);

  // Verify zone belongs to this farmer
  const zone = await prisma.zone.findFirst({
    where: { id: zoneId, farm: { farmerId } },
    select: { id: true, name: true },
  });

  if (!zone) {
    throw new AppError("Zone not found", 404);
  }

  // Resolve cropEconomicsId from cropName if only name provided (recommendation pick flow)
  let resolvedId = cropEconomicsId;
  if (!resolvedId && cropName) {
    const found = await prisma.cropEconomics.findFirst({
      where: { cropName: { equals: cropName, mode: "insensitive" } },
      select: { id: true },
    });
    if (!found) throw new AppError(`No crop economics record found for "${cropName}"`, 404);
    resolvedId = found.id;
  }

  // Verify the crop exists
  const crop = await prisma.cropEconomics.findUnique({
    where: { id: resolvedId },
    select: { id: true, cropName: true },
  });

  if (!crop) {
    throw new AppError("Crop not found", 404);
  }
  cropEconomicsId = resolvedId;

  // If a different crop was previously assigned, archive it to ZoneCropHistory for rotation tracking
  const existing = await prisma.zoneCropAssignment.findUnique({
    where: { zoneId },
    include: { cropEconomics: { select: { cropName: true } } },
  });
  if (existing && existing.cropEconomicsId !== cropEconomicsId) {
    await prisma.zoneCropHistory.create({
      data: {
        zoneId,
        cropName:  existing.cropEconomics.cropName,
        startedAt: existing.createdAt,
        endedAt:   new Date(),
      },
    });
  }

  const assignment = await prisma.zoneCropAssignment.upsert({
    where: { zoneId },
    create: { zoneId, cropEconomicsId, notes: notes ?? null },
    update: { cropEconomicsId, notes: notes ?? null },
    include: { cropEconomics: { select: { cropName: true } } },
  });

  return {
    zoneId: assignment.zoneId,
    zoneName: zone.name,
    cropEconomicsId: assignment.cropEconomicsId,
    cropName: assignment.cropEconomics.cropName,
    notes: assignment.notes,
  };
};

export const clearZoneAssignment = async (zoneId, user) => {
  const farmerId = getFarmerIdFromUser(user);

  const zone = await prisma.zone.findFirst({
    where: { id: zoneId, farm: { farmerId } },
    select: { id: true },
  });

  if (!zone) {
    throw new AppError("Zone not found", 404);
  }

  const existing = await prisma.zoneCropAssignment.findUnique({
    where: { zoneId },
  });

  if (!existing) {
    throw new AppError("No assignment found for this zone", 404);
  }

  await prisma.zoneCropAssignment.delete({ where: { zoneId } });

  return { zoneId, cleared: true };
};
