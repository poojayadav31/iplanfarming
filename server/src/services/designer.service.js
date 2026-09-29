import fs from "fs/promises";
import path from "path";
import prisma from "../config/prisma.js";
import { AppError } from "../utils/errors.js";
import { getFarmerIdFromUser } from "../utils/serviceUtils.js";

const DESIGNS_DIR = path.resolve(process.cwd(), "storage", "designs");

/**
 * Safely saves a static JSON backup of the design to the server filesystem.
 */
const persistDesignToJsonFile = async (farmId, designId, designRecord) => {
  try {
    await fs.mkdir(DESIGNS_DIR, { recursive: true });
    const fileName = `${farmId}_${designId}.json`;
    const filePath = path.join(DESIGNS_DIR, fileName);
    await fs.writeFile(filePath, JSON.stringify(designRecord, null, 2), "utf-8");
  } catch (err) {
    console.error(`[DesignerService] Failed to persist static JSON for design ${designId}:`, err);
  }
};

/**
 * Safely deletes the static JSON backup from the server filesystem.
 */
const removeDesignJsonFile = async (farmId, designId) => {
  try {
    const fileName = `${farmId}_${designId}.json`;
    const filePath = path.join(DESIGNS_DIR, fileName);
    await fs.unlink(filePath);
  } catch {
    // Ignore if file doesn't exist
  }
};

/**
 * Asserts that the authenticated user owns or has access to the farm.
 */
const assertFarmAccess = async (farmId, user) => {
  const farm = await prisma.farm.findUnique({
    where: { id: farmId },
    select: { id: true, farmerId: true, name: true, boundary: true, centroid: true, areaSquareMeters: true, areaAcres: true, areaBigha: true },
  });
  if (!farm) throw new AppError("Farm not found", 404);

  // If farmer, must be the owner. If expert or admin, allowed.
  if (user.role === "FARMER") {
    const farmerId = getFarmerIdFromUser(user);
    if (farm.farmerId !== farmerId) {
      throw new AppError("Access denied to this farm", 403);
    }
  }

  return farm;
};

// ─── Design CRUD Services ───────────────────────────────────────────────────

export const listFarmDesigns = async (farmId, user) => {
  await assertFarmAccess(farmId, user);
  return prisma.farmDesign.findMany({
    where: { farmId },
    select: {
      id: true,
      farmId: true,
      name: true,
      version: true,
      status: true,
      gridSizeMeters: true,
      previewImage: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });
};

export const getFarmDesignById = async (farmId, designId, user) => {
  const farm = await assertFarmAccess(farmId, user);
  const design = await prisma.farmDesign.findFirst({
    where: { id: designId, farmId },
  });
  if (!design) throw new AppError("Farm design not found", 404);
  return { ...design, farmMeta: { name: farm.name, boundary: farm.boundary, centroid: farm.centroid, areaAcres: farm.areaAcres, areaBigha: farm.areaBigha } };
};

export const createFarmDesign = async (farmId, user, payload) => {
  await assertFarmAccess(farmId, user);
  const { name, status, gridSizeMeters, designData, previewImage, notes } = payload;

  if (!designData) {
    throw new AppError("designData is required", 400);
  }

  const created = await prisma.farmDesign.create({
    data: {
      farmId,
      name: name?.trim() || "Untitled Farm Layout",
      version: 1,
      status: status === "FINAL" ? "FINAL" : "DRAFT",
      gridSizeMeters: parseFloat(gridSizeMeters) || 2.0,
      designData,
      previewImage: previewImage || null,
      notes: notes || null,
    },
  });

  // Save static .json backup file
  await persistDesignToJsonFile(farmId, created.id, created);

  return created;
};

export const updateFarmDesign = async (farmId, designId, user, payload) => {
  await assertFarmAccess(farmId, user);
  const existing = await prisma.farmDesign.findFirst({
    where: { id: designId, farmId },
  });
  if (!existing) throw new AppError("Farm design not found", 404);

  const { name, status, gridSizeMeters, designData, previewImage, notes, incrementVersion } = payload;

  const updated = await prisma.farmDesign.update({
    where: { id: designId },
    data: {
      name: name !== undefined ? name.trim() : existing.name,
      version: incrementVersion ? existing.version + 1 : existing.version,
      status: status !== undefined ? (status === "FINAL" ? "FINAL" : "DRAFT") : existing.status,
      gridSizeMeters: gridSizeMeters !== undefined ? parseFloat(gridSizeMeters) : existing.gridSizeMeters,
      designData: designData !== undefined ? designData : existing.designData,
      previewImage: previewImage !== undefined ? previewImage : existing.previewImage,
      notes: notes !== undefined ? notes : existing.notes,
    },
  });

  // Update static .json backup file
  await persistDesignToJsonFile(farmId, updated.id, updated);

  return updated;
};

export const deleteFarmDesign = async (farmId, designId, user) => {
  await assertFarmAccess(farmId, user);
  const existing = await prisma.farmDesign.findFirst({
    where: { id: designId, farmId },
  });
  if (!existing) throw new AppError("Farm design not found", 404);

  await prisma.farmDesign.delete({
    where: { id: designId },
  });

  // Clean up static .json backup file
  await removeDesignJsonFile(farmId, designId);

  return { success: true, message: "Design deleted successfully" };
};

export const duplicateFarmDesign = async (farmId, designId, user) => {
  await assertFarmAccess(farmId, user);
  const original = await prisma.farmDesign.findFirst({
    where: { id: designId, farmId },
  });
  if (!original) throw new AppError("Original design not found", 404);

  const duplicated = await prisma.farmDesign.create({
    data: {
      farmId,
      name: `${original.name} (Copy)`,
      version: 1,
      status: "DRAFT",
      gridSizeMeters: original.gridSizeMeters,
      designData: original.designData,
      previewImage: original.previewImage,
      notes: original.notes ? `Cloned from ${original.name}. ${original.notes}` : `Cloned from ${original.name}`,
    },
  });

  // Save static .json backup file for duplicate
  await persistDesignToJsonFile(farmId, duplicated.id, duplicated);

  return duplicated;
};

