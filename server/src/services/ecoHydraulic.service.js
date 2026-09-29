import prisma from "../config/prisma.js";
import { AppError } from "../utils/errors.js";
import { SQ_METERS_PER_ACRE } from "../constants/naturalFarming.js";
import { getFarmerIdFromUser } from "../utils/serviceUtils.js";
import { getWeekStart } from "../utils/dateUtils.js";

// ─── Soil Retention Multipliers ───────────────────────────────────────────────
// Derived from CG soil science: how much irrigation water each soil type needs
// relative to the crop baseline (heavier soils hold water → lower multiplier).
const SOIL_TYPE_MULTIPLIER = {
  Kanhar: 0.80, // heavy black clay — excellent water retention
  Dorsa:  1.00, // loamy/medium — balanced baseline
  Matasi: 1.20, // light sandy — fast-draining, needs more water
  Bhata:  1.30, // laterite/rocky — very poor water retention
};

const DRAINAGE_MULTIPLIER = {
  Slow:     0.85, // water lingers — less top-up needed
  Balanced: 1.00,
  Fast:     1.20, // water escapes quickly — irrigate more
};

// ─── Irrigation Method by Crop ────────────────────────────────────────────────
const IRRIGATION_METHOD = {
  Rice:         "Flood",
  Cotton:       "Drip",
  Wheat:        "Sprinkler",
  Gram:         "Sprinkler",
  Millets:      "Sprinkler",
  Groundnut:    "Drip",
  Pulses:       "Sprinkler",
  Maize:        "Sprinkler",
  Vegetables:   "Drip",
  "Tuber crops":"Drip",
};

const DEFAULT_IRRIGATION_METHOD = "Sprinkler";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const assertFarmOwnership = async (farmId, farmerId) => {
  const farm = await prisma.farm.findUnique({ where: { id: farmId } });
  if (!farm) throw new AppError("Farm not found", 404);
  if (farm.farmerId !== farmerId) throw new AppError("Access denied", 403);
  return farm;
};

/**
 * Composite Soil Retention Multiplier.
 * Combines soil-type water-holding capacity with drainage drainage behaviour.
 * Example: Matasi + Fast = 1.20 × 1.20 = 1.44 (needs 44% more water than baseline)
 *          Kanhar + Slow = 0.80 × 0.85 = 0.68 (needs 32% less water than baseline)
 */
export const computeSoilRetentionMultiplier = (soilType, drainageSpeed) => {
  const sm = SOIL_TYPE_MULTIPLIER[soilType] ?? 1.0;
  const dm = DRAINAGE_MULTIPLIER[drainageSpeed] ?? 1.0;
  return parseFloat((sm * dm).toFixed(4));
};

/**
 * Derive the recommended irrigation method for a crop.
 */
export const getIrrigationMethod = (cropName) =>
  IRRIGATION_METHOD[cropName] ?? DEFAULT_IRRIGATION_METHOD;

/**
 * Calculate water deficit for a single zone.
 * Returns the complete hydraulic breakdown including the explanation strings
 * that the frontend renders to the farmer.
 */
export const calculateZoneWaterDeficit = ({ zone, soilReport, crop }) => {
  // Zone area in acres (1 bigha ≈ 0.618 acres in CG; we use the stored areaAcres equiv)
  // The zone only stores areaSquareMeters and areaBigha; derive acres.
  const areaSquareMeters = zone.areaSquareMeters ?? 0;
  if (areaSquareMeters <= 0) {
    throw new AppError(
      `Zone "${zone.name ?? zone.id}" has an invalid area (${areaSquareMeters} m²). Please redraw the zone boundary.`,
      400
    );
  }
  const areaAcres = areaSquareMeters / SQ_METERS_PER_ACRE;

  const soilRetentionMultiplier = computeSoilRetentionMultiplier(
    soilReport.soilType,
    soilReport.drainageSpeed
  );

  const baseWaterLiters = areaAcres * crop.weeklyWaterRequirementLitersPerAcre;
  const adjustedWaterLiters = parseFloat(
    (baseWaterLiters * soilRetentionMultiplier).toFixed(2)
  );
  const irrigationMethod = getIrrigationMethod(crop.name);

  const soilMultiplierLabel =
    soilRetentionMultiplier > 1.0
      ? `${soilReport.soilType} soil drains fast (+${Math.round((soilRetentionMultiplier - 1) * 100)}% more water needed)`
      : soilRetentionMultiplier < 1.0
      ? `${soilReport.soilType} soil retains well (−${Math.round((1 - soilRetentionMultiplier) * 100)}% water saved)`
      : `${soilReport.soilType} soil is at baseline (no adjustment)`;

  return {
    areaAcres: parseFloat(areaAcres.toFixed(4)),
    soilRetentionMultiplier,
    soilMultiplierLabel,
    baseWaterLiters: parseFloat(baseWaterLiters.toFixed(2)),
    adjustedWaterLiters,
    irrigationMethod,
    explanation: `${soilReport.soilType} soil + ${crop.name} = ${Math.round(adjustedWaterLiters).toLocaleString("en-IN")} L/week via ${irrigationMethod}`,
  };
};

// ─── Water Source CRUD ────────────────────────────────────────────────────────

export const listWaterSources = async (farmId, user) => {
  const farmerId = getFarmerIdFromUser(user);
  await assertFarmOwnership(farmId, farmerId);

  return prisma.waterSource.findMany({
    where: { farmId },
    orderBy: { createdAt: "asc" },
  });
};

export const createWaterSource = async (farmId, body, user) => {
  const farmerId = getFarmerIdFromUser(user);
  await assertFarmOwnership(farmId, farmerId);

  const { name, sourceType, totalCapacityLiters, currentLevelLiters } = body;

  if (!name?.trim()) throw new AppError("Water source name is required", 400);
  if (!sourceType) throw new AppError("Source type is required", 400);

  const validTypes = ["POND", "BOREWELL", "CANAL", "TANK", "RIVER"];
  if (!validTypes.includes(sourceType)) {
    throw new AppError(`sourceType must be one of: ${validTypes.join(", ")}`, 400);
  }

  const capacity = Number(totalCapacityLiters);
  const current = Number(currentLevelLiters ?? totalCapacityLiters);

  if (!Number.isFinite(capacity) || capacity <= 0) {
    throw new AppError("Total capacity must be a positive number", 400);
  }
  if (!Number.isFinite(current) || current < 0) {
    throw new AppError("Current level must be a non-negative number", 400);
  }
  if (current > capacity) {
    throw new AppError("Current level cannot exceed total capacity", 400);
  }

  return prisma.waterSource.create({
    data: {
      farmId,
      name: name.trim(),
      sourceType,
      totalCapacityLiters: capacity,
      currentLevelLiters: current,
    },
  });
};

export const updateWaterSource = async (farmId, sourceId, body, user) => {
  const farmerId = getFarmerIdFromUser(user);
  await assertFarmOwnership(farmId, farmerId);

  const source = await prisma.waterSource.findFirst({
    where: { id: sourceId, farmId },
  });
  if (!source) throw new AppError("Water source not found", 404);

  const { name, sourceType, totalCapacityLiters, currentLevelLiters } = body;

  const capacity = totalCapacityLiters != null
    ? Number(totalCapacityLiters)
    : source.totalCapacityLiters;
  const current = currentLevelLiters != null
    ? Number(currentLevelLiters)
    : source.currentLevelLiters;

  if (current > capacity) {
    throw new AppError("Current level cannot exceed total capacity", 400);
  }

  return prisma.waterSource.update({
    where: { id: sourceId },
    data: {
      ...(name ? { name: name.trim() } : {}),
      ...(sourceType ? { sourceType } : {}),
      totalCapacityLiters: capacity,
      currentLevelLiters: current,
    },
  });
};

export const deleteWaterSource = async (farmId, sourceId, user) => {
  const farmerId = getFarmerIdFromUser(user);
  await assertFarmOwnership(farmId, farmerId);

  const source = await prisma.waterSource.findFirst({
    where: { id: sourceId, farmId },
  });
  if (!source) throw new AppError("Water source not found", 404);

  await prisma.waterSource.delete({ where: { id: sourceId } });
  return { deleted: true };
};

// ─── Irrigation Schedule Generator ───────────────────────────────────────────

/**
 * Generate one week of PENDING irrigation tasks for every zone on the farm
 * that has both a soil report AND a crop assigned.
 * Idempotent for the current week — skips zones that already have a PENDING
 * schedule for the same weekStartDate.
 */
export const generateWeeklySchedules = async (farmId, user) => {
  const farmerId = getFarmerIdFromUser(user);
  await assertFarmOwnership(farmId, farmerId);

  // Week window: Monday → Sunday containing today
  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // Fetch all zones with soil reports and crop assignments
  const zones = await prisma.zone.findMany({
    where: { farmId },
    include: {
      soilReport: true,
      cropAssignment: {
        include: {
          cropEconomics: { select: { cropName: true } },
        },
      },
    },
  });

  // Best water source for the farm (highest current level)
  const waterSource = await prisma.waterSource.findFirst({
    where: { farmId, currentLevelLiters: { gt: 0 } },
    orderBy: { currentLevelLiters: "desc" },
  });

  const created = [];
  const skipped = [];

  for (const zone of zones) {
    if (!zone.soilReport || !zone.cropAssignment) {
      skipped.push({ zoneId: zone.id, reason: "missing soil report or crop assignment" });
      continue;
    }

    if (!zone.cropAssignment.cropEconomics) {
      skipped.push({ zoneId: zone.id, reason: "crop economics data missing for assignment" });
      continue;
    }

    // Idempotency check
    const existing = await prisma.irrigationSchedule.findFirst({
      where: { zoneId: zone.id, weekStartDate: weekStart, status: "PENDING" },
    });
    if (existing) {
      skipped.push({ zoneId: zone.id, reason: "schedule already exists for this week" });
      continue;
    }

    // Find the crop record (matched by name from CropEconomics)
    const crop = await prisma.crop.findFirst({
      where: { name: zone.cropAssignment.cropEconomics.cropName },
    });
    if (!crop) {
      skipped.push({ zoneId: zone.id, reason: "crop not found in Crop table" });
      continue;
    }

    const hydraulics = calculateZoneWaterDeficit({
      zone,
      soilReport: zone.soilReport,
      crop,
    });

    const schedule = await prisma.irrigationSchedule.create({
      data: {
        zoneId: zone.id,
        farmId,
        cropId: crop.id,
        waterSourceId: waterSource?.id ?? null,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        areaAcres: hydraulics.areaAcres,
        soilRetentionMultiplier: hydraulics.soilRetentionMultiplier,
        baseWaterLiters: hydraulics.baseWaterLiters,
        adjustedWaterLiters: hydraulics.adjustedWaterLiters,
        irrigationMethod: hydraulics.irrigationMethod,
        status: "PENDING",
      },
    });
    created.push(schedule);
  }

  return { created, skipped, weekStart, weekEnd };
};

// ─── Schedule Execution ───────────────────────────────────────────────────────

export const completeSchedule = async (farmId, scheduleId, body, user) => {
  const farmerId = getFarmerIdFromUser(user);
  await assertFarmOwnership(farmId, farmerId);

  const schedule = await prisma.irrigationSchedule.findFirst({
    where: { id: scheduleId, farmId },
  });
  if (!schedule) throw new AppError("Irrigation schedule not found", 404);
  if (schedule.status !== "PENDING") {
    throw new AppError(`Schedule is already ${schedule.status.toLowerCase()}`, 400);
  }

  const completedLiters = body.completedLiters != null
    ? Number(body.completedLiters)
    : schedule.adjustedWaterLiters;

  if (!Number.isFinite(completedLiters) || completedLiters < 0) {
    throw new AppError("completedLiters must be a non-negative number", 400);
  }

  // Deduct from water source if linked.
  // Track overdraft: if completedLiters exceeds source level the source goes to 0
  // and the deficit is returned to the caller so the UI can warn the farmer.
  let waterOverdraftLiters = 0;
  if (schedule.waterSourceId) {
    const source = await prisma.waterSource.findUnique({
      where: { id: schedule.waterSourceId },
    });
    if (source) {
      waterOverdraftLiters = Math.max(0, completedLiters - source.currentLevelLiters);
      const newLevel = Math.max(0, source.currentLevelLiters - completedLiters);
      await prisma.waterSource.update({
        where: { id: source.id },
        data: { currentLevelLiters: newLevel },
      });
    }
  }

  const updated = await prisma.irrigationSchedule.update({
    where: { id: scheduleId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      completedLiters,
      notes: body.notes ?? schedule.notes,
    },
    include: {
      zone: { select: { id: true, name: true } },
      crop: { select: { id: true, name: true } },
      waterSource: { select: { id: true, name: true, currentLevelLiters: true } },
    },
  });

  return { ...updated, waterOverdraftLiters };
};

export const skipSchedule = async (farmId, scheduleId, user) => {
  const farmerId = getFarmerIdFromUser(user);
  await assertFarmOwnership(farmId, farmerId);

  const schedule = await prisma.irrigationSchedule.findFirst({
    where: { id: scheduleId, farmId },
  });
  if (!schedule) throw new AppError("Irrigation schedule not found", 404);
  if (schedule.status !== "PENDING") {
    throw new AppError(`Schedule is already ${schedule.status.toLowerCase()}`, 400);
  }

  return prisma.irrigationSchedule.update({
    where: { id: scheduleId },
    data: { status: "SKIPPED" },
  });
};

// ─── Farm Water Summary ───────────────────────────────────────────────────────

export const getWaterSummary = async (farmId, user) => {
  const farmerId = getFarmerIdFromUser(user);
  await assertFarmOwnership(farmId, farmerId);

  const [sources, schedules, zones] = await Promise.all([
    prisma.waterSource.findMany({ where: { farmId } }),
    prisma.irrigationSchedule.findMany({
      where: { farmId },
      include: {
        zone: { select: { id: true, name: true, areaSquareMeters: true } },
        crop: { select: { id: true, name: true, weeklyWaterRequirementLitersPerAcre: true } },
        waterSource: { select: { id: true, name: true } },
      },
      orderBy: { weekStartDate: "desc" },
    }),
    prisma.zone.findMany({
      where: { farmId },
      include: {
        soilReport: true,
        cropAssignment: {
          include: { cropEconomics: { select: { cropName: true } } },
        },
      },
    }),
  ]);

  const totalCapacity = sources.reduce((sum, s) => sum + s.totalCapacityLiters, 0);
  const totalCurrent = sources.reduce((sum, s) => sum + s.currentLevelLiters, 0);
  const fillPercentage = totalCapacity > 0
    ? Math.round((totalCurrent / totalCapacity) * 100)
    : 0;

  const pendingSchedules = schedules.filter((s) => s.status === "PENDING");
  const totalPendingLiters = pendingSchedules.reduce(
    (sum, s) => sum + s.adjustedWaterLiters,
    0
  );

  // Zone-level hydraulic preview (live calculation for zones that have data)
  const zoneHydraulics = await Promise.all(
    zones.map(async (zone) => {
      if (!zone.soilReport || !zone.cropAssignment || !zone.cropAssignment.cropEconomics) {
        const missingData = !zone.soilReport
          ? "soil report"
          : !zone.cropAssignment
          ? "crop assignment"
          : "crop economics data";
        return {
          zoneId: zone.id,
          zoneName: zone.name,
          zoneNumber: zone.zoneNumber,
          ready: false,
          missingData,
        };
      }

      const crop = await prisma.crop.findFirst({
        where: { name: zone.cropAssignment.cropEconomics.cropName },
      });

      if (!crop) {
        return {
          zoneId: zone.id,
          zoneName: zone.name,
          zoneNumber: zone.zoneNumber,
          ready: false,
          missingData: "crop water data",
        };
      }

      const hydraulics = calculateZoneWaterDeficit({
        zone,
        soilReport: zone.soilReport,
        crop,
      });

      // Find zone's pending schedule for this week
      const weekStart = getWeekStart();

      const thisWeekSchedule = schedules.find(
        (s) =>
          s.zoneId === zone.id &&
          new Date(s.weekStartDate).getTime() === weekStart.getTime()
      );

      return {
        zoneId: zone.id,
        zoneName: zone.name,
        zoneNumber: zone.zoneNumber,
        cropName: crop.name,
        soilType: zone.soilReport.soilType,
        drainageSpeed: zone.soilReport.drainageSpeed,
        ready: true,
        ...hydraulics,
        thisWeekSchedule: thisWeekSchedule ?? null,
      };
    })
  );

  return {
    waterSources: sources,
    totalCapacityLiters: totalCapacity,
    totalCurrentLiters: totalCurrent,
    fillPercentage,
    totalPendingLiters: parseFloat(totalPendingLiters.toFixed(2)),
    pendingScheduleCount: pendingSchedules.length,
    schedules,
    zoneHydraulics,
  };
};

export const getSchedules = async (farmId, user) => {
  const farmerId = getFarmerIdFromUser(user);
  await assertFarmOwnership(farmId, farmerId);

  return prisma.irrigationSchedule.findMany({
    where: { farmId },
    include: {
      zone: { select: { id: true, name: true, zoneNumber: true } },
      crop: {
        select: {
          id: true,
          name: true,
          season: true,
          weeklyWaterRequirementLitersPerAcre: true,
        },
      },
      waterSource: { select: { id: true, name: true, sourceType: true, currentLevelLiters: true } },
    },
    orderBy: [{ weekStartDate: "desc" }, { createdAt: "desc" }],
  });
};
