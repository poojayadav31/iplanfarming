import {
  getFarmCalendar,
  getTodayTasks,
  getYearOverview,
  getMissedTasks,
  updateTaskStatus,
  updateChecklistItem,
  getActivityLog,
  createCustomTask,
  updateCustomTask,
  deleteCustomTask,
} from "../services/farmCalendar.service.js";

export const getCalendar = async (req, res) => {
  const { farmId } = req.params;
  const { year, month, zoneId, category } = req.query;
  const data = await getFarmCalendar(farmId, { year, month, zoneId, category }, req.user);
  res.status(200).json({ success: true, data });
};

export const getToday = async (req, res) => {
  const { farmId } = req.params;
  const data = await getTodayTasks(farmId, req.user);
  res.status(200).json({ success: true, data });
};

export const getYear = async (req, res) => {
  const { farmId } = req.params;
  const { year } = req.query;
  const data = await getYearOverview(farmId, year, req.user);
  res.status(200).json({ success: true, data });
};

export const getMissed = async (req, res) => {
  const { farmId } = req.params;
  const data = await getMissedTasks(farmId, req.user);
  res.status(200).json({ success: true, data });
};

export const patchTask = async (req, res) => {
  const { farmId, taskId } = req.params;
  const { status, note } = req.body;
  const data = await updateTaskStatus(farmId, taskId, status, note, req.user);
  res.status(200).json({ success: true, data });
};

export const patchChecklist = async (req, res) => {
  const { farmId, taskId } = req.params;
  const { itemId, done } = req.body;
  const data = await updateChecklistItem(farmId, taskId, itemId, done, req.user);
  res.status(200).json({ success: true, data });
};

export const getActivityLogHandler = async (req, res) => {
  const { farmId } = req.params;
  const { year, month, status, zoneId } = req.query;
  const data = await getActivityLog(farmId, { year, month, status, zoneId }, req.user);
  res.status(200).json({ success: true, data });
};

export const postCustomTask = async (req, res) => {
  const { farmId } = req.params;
  const data = await createCustomTask(farmId, req.body, req.user);
  res.status(201).json({ success: true, data });
};

export const putCustomTask = async (req, res) => {
  const { farmId, taskId } = req.params;
  const data = await updateCustomTask(farmId, taskId, req.body, req.user);
  res.status(200).json({ success: true, data });
};

export const removeCustomTask = async (req, res) => {
  const { farmId, taskId } = req.params;
  const data = await deleteCustomTask(farmId, taskId, req.user);
  res.status(200).json({ success: true, data });
};
