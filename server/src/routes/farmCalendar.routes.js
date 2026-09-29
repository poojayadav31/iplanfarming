import { Router } from "express";
import {
  getCalendar,
  getToday,
  getYear,
  getMissed,
  patchTask,
  patchChecklist,
  getActivityLogHandler,
  postCustomTask,
  putCustomTask,
  removeCustomTask,
} from "../controllers/farmCalendar.controller.js";

const calendarRouter = Router();

calendarRouter.get("/:farmId/calendar",              getCalendar);
calendarRouter.get("/:farmId/calendar/today",        getToday);
calendarRouter.get("/:farmId/calendar/year",         getYear);
calendarRouter.get("/:farmId/calendar/missed",       getMissed);
calendarRouter.get("/:farmId/calendar/activity-log", getActivityLogHandler);

calendarRouter.post("/:farmId/tasks",                postCustomTask);
calendarRouter.put("/:farmId/tasks/:taskId/custom",  putCustomTask);
calendarRouter.delete("/:farmId/tasks/:taskId",      removeCustomTask);

calendarRouter.patch("/:farmId/tasks/:taskId",           patchTask);
calendarRouter.patch("/:farmId/tasks/:taskId/checklist", patchChecklist);

export default calendarRouter;
