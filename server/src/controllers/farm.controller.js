import prisma from "../config/prisma.js";
import { AppError } from "../utils/errors.js";
import { SQ_METERS_PER_ACRE } from "../constants/naturalFarming.js";
import {
  BIGHA_IN_SQUARE_METERS,
  assertPolygon,
  calculateFarmMetrics,
  calculateZoneMetrics,
} from "../utils/farm-spatial.js";

const getFarmerIdFromRequest = (req) => {
  if (req.user?.role !== "FARMER") {
    throw new AppError("Only farmers can access this resource", 403);
  }

  if (!req.user.farmerId) {
    throw new AppError("Farmer profile not found for authenticated user", 403);
  }

  return req.user.farmerId;
};

const getOwnedFarm = async (farmId, farmerId) => {
  const farm = await prisma.farm.findUnique({
    where: { id: farmId },
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

  if (farm.farmerId !== farmerId) {
    throw new AppError("You do not have access to this farm", 403);
  }

  return farm;
};

export const createFarm = async (req, res) => {
  const farmerId = getFarmerIdFromRequest(req);
  const { name, district, address, boundary, actualAreaBigha } = req.body;

  if (!name?.trim()) {
    throw new AppError("Farm name is required", 400);
  }

  if (!district?.trim()) {
    throw new AppError("District is required", 400);
  }

  const polygon = assertPolygon(boundary);
  const existingFarm = await prisma.farm.findFirst({
    where: { farmerId },
  });

  if (existingFarm) {
    throw new AppError("You already have an active farm", 409);
  }

  const metrics = calculateFarmMetrics(polygon);
  let resolvedAreaBigha = metrics.areaBigha;

  if (
    actualAreaBigha !== undefined &&
    actualAreaBigha !== null &&
    actualAreaBigha !== ""
  ) {
    const parsedActualArea = Number(actualAreaBigha);

    if (!Number.isFinite(parsedActualArea) || parsedActualArea <= 0) {
      throw new AppError("Actual farm area must be greater than 0", 400);
    }

    resolvedAreaBigha = parsedActualArea;
  }

  const resolvedAreaSquareMeters = resolvedAreaBigha * BIGHA_IN_SQUARE_METERS;
  const farm = await prisma.farm.create({
    data: {
      farmerId,
      name: name.trim(),
      district: district.trim(),
      address: address?.trim() || null,
      boundary: polygon,
      centroid: metrics.centroid,
      areaSquareMeters: resolvedAreaSquareMeters,
      areaBigha: resolvedAreaBigha,
      areaAcres: resolvedAreaSquareMeters / SQ_METERS_PER_ACRE,
      areaHectares: resolvedAreaSquareMeters / 10000,
      perimeter: metrics.perimeter,
      convexityScore: metrics.convexityScore,
    },
    include: {
      zones: {
        orderBy: {
          zoneNumber: "asc",
        },
      },
    },
  });

  res.status(201).json({
    success: true,
    data: { farm },
  });
};

export const getFarms = async (req, res) => {
  const farmerId = getFarmerIdFromRequest(req);

  const farms = await prisma.farm.findMany({
    where: { farmerId },
    include: {
      zones: {
        orderBy: {
          zoneNumber: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  res.status(200).json({
    success: true,
    data: { farms },
  });
};

export const getFarmById = async (req, res) => {
  const farmerId = getFarmerIdFromRequest(req);
  const farm = await getOwnedFarm(req.params.id, farmerId);

  res.status(200).json({
    success: true,
    data: { farm },
  });
};

export const deleteFarm = async (req, res) => {
  const farmerId = getFarmerIdFromRequest(req);
  const farm = await getOwnedFarm(req.params.id, farmerId);

  await prisma.farm.delete({
    where: { id: farm.id },
  });

  res.status(200).json({
    success: true,
    message: "Farm deleted successfully",
  });
};

export const saveZones = async (req, res) => {
  const farmerId = getFarmerIdFromRequest(req);
  const farm = await getOwnedFarm(req.params.id, farmerId);
  const { zones } = req.body;

  if (!Array.isArray(zones) || zones.length === 0) {
    throw new AppError("At least one zone is required", 400);
  }

  const farmGeometryMetrics = calculateFarmMetrics(farm.boundary);
  const areaScaleFactor =
    farmGeometryMetrics.areaSquareMeters > 0
      ? farm.areaSquareMeters / farmGeometryMetrics.areaSquareMeters
      : 1;

  const savedZones = await prisma.$transaction(async (tx) => {
    await tx.zone.deleteMany({
      where: { farmId: farm.id },
    });

    const zoneRecords = zones.map((zone, index) => {
      const polygon = assertPolygon(zone.boundary, `zones[${index}].boundary`);
      const metrics = calculateZoneMetrics(polygon);
      const adjustedAreaSquareMeters = metrics.areaSquareMeters * areaScaleFactor;

      return {
        farmId: farm.id,
        name: zone.name?.trim() || `Zone ${zone.zoneNumber ?? index + 1}`,
        zoneNumber: Number(zone.zoneNumber ?? index + 1),
        boundary: polygon,
        centroid: metrics.centroid,
        areaSquareMeters: adjustedAreaSquareMeters,
        areaBigha: adjustedAreaSquareMeters / BIGHA_IN_SQUARE_METERS,
      };
    });

    await tx.zone.createMany({
      data: zoneRecords,
    });

    return tx.zone.findMany({
      where: { farmId: farm.id },
      orderBy: {
        zoneNumber: "asc",
      },
    });
  });

  res.status(201).json({
    success: true,
    data: { zones: savedZones },
  });
};

export const getZones = async (req, res) => {
  const farmerId = getFarmerIdFromRequest(req);
  const farm = await getOwnedFarm(req.params.id, farmerId);

  res.status(200).json({
    success: true,
    data: { zones: farm.zones },
  });
};
