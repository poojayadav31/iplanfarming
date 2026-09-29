import prisma from "../config/prisma.js";
import { requireRole } from "../middleware/role.middleware.js";
import { AppError } from "../utils/errors.js";
import {
  computeSoilScore,
  getCurrentSeason,
  getImprovementTips,
} from "../utils/soilCalculations.js";

const VALID_SOIL_TYPES = new Set(["Kanhar", "Matasi", "Dorsa", "Bhata"]);
const VALID_DRAINAGE_SPEEDS = new Set(["Fast", "Balanced", "Slow"]);

const getFarmerIdFromRequest = (req) => {
  if (req.user?.role !== "FARMER" || !req.user.farmerId) {
    throw new AppError("Only farmers can access this resource", 403);
  }

  return req.user.farmerId;
};

const getOwnedFarmZone = async ({ farmId, zoneId, farmerId }) => {
  const zone = await prisma.zone.findFirst({
    where: {
      id: zoneId,
      farmId,
      farm: {
        farmerId,
      },
    },
    include: {
      farm: true,
    },
  });

  if (!zone) {
    throw new AppError("Zone not found for this farm", 404);
  }

  return zone;
};

const getOwnedFarmWithZones = async ({ farmId, farmerId }) => {
  const farm = await prisma.farm.findFirst({
    where: {
      id: farmId,
      farmerId,
    },
    include: {
      zones: {
        orderBy: {
          zoneNumber: "asc",
        },
      },
    },
  });

  if (!farm) {
    throw new AppError("Farm not found", 404);
  }

  return farm;
};

const getSoilReportMap = async (farmId, zoneIds) => {
  if (!zoneIds.length) {
    return new Map();
  }

  const soilReports = await prisma.soilReport.findMany({
    where: {
      farmId,
      zoneId: {
        in: zoneIds,
      },
    },
  });

  return new Map(soilReports.map((soilReport) => [soilReport.zoneId, soilReport]));
};

const getSoilFit = (soilHealthScore) => {
  if (soilHealthScore >= 70) {
    return "High";
  }

  if (soilHealthScore >= 40) {
    return "Medium";
  }

  return "Low";
};

export const soilAccessGuard = [requireRole("FARMER")];

export const upsertSoilReport = async (req, res) => {
  const farmerId = getFarmerIdFromRequest(req);
  const { farmId, zoneId } = req.params;
  const { soilType, drainageSpeed } = req.body;

  if (!VALID_SOIL_TYPES.has(soilType)) {
    throw new AppError("Valid soilType is required", 400);
  }

  if (!VALID_DRAINAGE_SPEEDS.has(drainageSpeed)) {
    throw new AppError("Valid drainageSpeed is required", 400);
  }

  const parsedPhLevel =
    req.body.phLevel !== undefined && req.body.phLevel !== null
      ? Number(req.body.phLevel)
      : 6.5;
  const parsedEarthwormCount =
    req.body.earthwormCount !== undefined && req.body.earthwormCount !== null
      ? Number(req.body.earthwormCount)
      : 3;

  if (!Number.isFinite(parsedPhLevel) || parsedPhLevel < 0 || parsedPhLevel > 14) {
    throw new AppError("pH level must be between 0 and 14", 400);
  }

  if (
    !Number.isInteger(parsedEarthwormCount) ||
    parsedEarthwormCount < 0 ||
    parsedEarthwormCount > 20
  ) {
    throw new AppError("Earthworm count must be an integer between 0 and 20", 400);
  }

  const zone = await getOwnedFarmZone({ farmId, zoneId, farmerId });
  const season = getCurrentSeason();
  const scoreResult = computeSoilScore({
    soilType,
    phLevel: parsedPhLevel,
    drainageSpeed,
    earthwormCount: parsedEarthwormCount,
  });

  const cropReferences = await prisma.soilCropReference.findMany({
    where: {
      soilType,
      season,
      phMin: {
        lte: parsedPhLevel,
      },
      phMax: {
        gte: parsedPhLevel,
      },
    },
    orderBy: {
      cropName: "asc",
    },
    take: 5,
  });

  const soilFit = getSoilFit(scoreResult.soilHealthScore);
  const recommendations = cropReferences.map((crop) => ({
    cropName: crop.cropName,
    season: crop.season,
    soilFit,
    whyRecommended: `Suits ${soilType} soil in ${crop.season} season`,
  }));

  const improvementTips = getImprovementTips({
    soilType,
    phLevel: parsedPhLevel,
    drainageSpeed,
  });

  const soilReport = await prisma.soilReport.upsert({
    where: {
      zoneId: zone.id,
    },
    update: {
      farmId: zone.farmId,
      soilType,
      drainageSpeed,
      phLevel: parsedPhLevel,
      earthwormCount: parsedEarthwormCount,
      ...scoreResult,
      recommendations,
      improvementTips,
    },
    create: {
      zoneId: zone.id,
      farmId: zone.farmId,
      soilType,
      drainageSpeed,
      phLevel: parsedPhLevel,
      earthwormCount: parsedEarthwormCount,
      ...scoreResult,
      recommendations,
      improvementTips,
    },
  });

  // Snapshot for soil-trend chart (non-fatal)
  try {
    await prisma.soilReportSnapshot.create({
      data: {
        zoneId: zone.id,
        soilType: soilReport.soilType,
        drainageSpeed: soilReport.drainageSpeed,
        phLevel: soilReport.phLevel,
        earthwormCount: soilReport.earthwormCount,
        soilHealthScore: soilReport.soilHealthScore,
      },
    });
  } catch { /* non-fatal */ }

  res.status(200).json({
    success: true,
    data: { soilReport },
  });
};

export const getSoilReport = async (req, res) => {
  const farmerId = getFarmerIdFromRequest(req);
  const { farmId, zoneId } = req.params;
  const zone = await getOwnedFarmZone({ farmId, zoneId, farmerId });
  const soilReport = await prisma.soilReport.findUnique({
    where: {
      zoneId: zone.id,
    },
  });

  if (!soilReport) {
    return res.status(404).json({ message: "No soil report yet" });
  }

  return res.status(200).json({
    success: true,
    data: {
      soilReport,
    },
  });
};

export const getSoilSummary = async (req, res) => {
  const farmerId = getFarmerIdFromRequest(req);
  const farm = await getOwnedFarmWithZones({
    farmId: req.params.farmId,
    farmerId,
  });
  const soilReportMap = await getSoilReportMap(
    farm.id,
    farm.zones.map((zone) => zone.id)
  );

  const filledReports = farm.zones
    .map((zone) => soilReportMap.get(zone.id))
    .filter(Boolean);

  const overallScore = filledReports.length
    ? Number(
        (
          filledReports.reduce(
            (total, report) => total + report.soilHealthScore,
            0
          ) / filledReports.length
        ).toFixed(2)
      )
    : null;

  res.status(200).json({
    success: true,
    data: {
      zones: farm.zones.map((zone) => ({
        zoneId: zone.id,
        zoneName: zone.name,
        zoneAreaBigha: zone.areaBigha,
        soilReport: soilReportMap.get(zone.id) ?? null,
      })),
      overallScore,
      filledCount: filledReports.length,
      totalZones: farm.zones.length,
    },
  });
};
