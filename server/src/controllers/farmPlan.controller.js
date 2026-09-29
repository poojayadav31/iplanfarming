import {
  getFarmPlan,
  assignCropToZone,
  clearZoneAssignment,
} from "../services/farmPlan.service.js";
import { generateTasksForZone } from "../services/farmCalendar.service.js";
import prisma from "../config/prisma.js";

export const getPlan = async (req, res) => {
  const data = await getFarmPlan(req.params.farmId, req.user);
  res.status(200).json({ success: true, data });
};

export const assignCrop = async (req, res) => {
  const { cropEconomicsId, cropName, notes } = req.body;
  const data = await assignCropToZone(
    req.params.zoneId,
    cropEconomicsId,
    notes,
    req.user,
    cropName
  );

  // Fire-and-forget: generate CalendarTask rows for this zone's new crop.
  // Done after response to avoid blocking the UI.
  const zone = await prisma.zone.findUnique({
    where: { id: req.params.zoneId },
    include: { farm: { select: { id: true, createdAt: true } } },
  });
  if (zone?.farm) {
    generateTasksForZone(zone.id, zone.farm.id, zone.farm.createdAt).catch(
      (err) => console.error("[CalendarTask] generation failed:", err.message)
    );
  }

  res.status(200).json({ success: true, data });
};

export const clearAssignment = async (req, res) => {
  const data = await clearZoneAssignment(req.params.zoneId, req.user);
  res.status(200).json({ success: true, data });
};
