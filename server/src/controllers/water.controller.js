import {
  listWaterSources,
  createWaterSource,
  updateWaterSource,
  deleteWaterSource,
  generateWeeklySchedules,
  getSchedules,
  completeSchedule,
  skipSchedule,
  getWaterSummary,
} from "../services/ecoHydraulic.service.js";

export const getSources = async (req, res) => {
  const data = await listWaterSources(req.params.farmId, req.user);
  res.status(200).json({ success: true, data });
};

export const addSource = async (req, res) => {
  const data = await createWaterSource(req.params.farmId, req.body, req.user);
  res.status(201).json({ success: true, data });
};

export const editSource = async (req, res) => {
  const data = await updateWaterSource(
    req.params.farmId,
    req.params.sourceId,
    req.body,
    req.user
  );
  res.status(200).json({ success: true, data });
};

export const removeSource = async (req, res) => {
  const data = await deleteWaterSource(
    req.params.farmId,
    req.params.sourceId,
    req.user
  );
  res.status(200).json({ success: true, data });
};

export const generateSchedules = async (req, res) => {
  const data = await generateWeeklySchedules(req.params.farmId, req.user);
  res.status(201).json({ success: true, data });
};

export const listSchedules = async (req, res) => {
  const data = await getSchedules(req.params.farmId, req.user);
  res.status(200).json({ success: true, data });
};

export const markComplete = async (req, res) => {
  const data = await completeSchedule(
    req.params.farmId,
    req.params.scheduleId,
    req.body,
    req.user
  );
  res.status(200).json({ success: true, data });
};

export const markSkipped = async (req, res) => {
  const data = await skipSchedule(
    req.params.farmId,
    req.params.scheduleId,
    req.user
  );
  res.status(200).json({ success: true, data });
};

export const waterSummary = async (req, res) => {
  const data = await getWaterSummary(req.params.farmId, req.user);
  res.status(200).json({ success: true, data });
};
