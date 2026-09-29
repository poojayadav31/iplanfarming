import { Router } from "express";
import {
  getSources,
  addSource,
  editSource,
  removeSource,
  generateSchedules,
  listSchedules,
  markComplete,
  markSkipped,
  waterSummary,
} from "../controllers/water.controller.js";

const waterRouter = Router({ mergeParams: true });

// Water source management — /api/farms/:farmId/water/sources
waterRouter.get("/sources", getSources);
waterRouter.post("/sources", addSource);
waterRouter.put("/sources/:sourceId", editSource);
waterRouter.delete("/sources/:sourceId", removeSource);

// Irrigation schedule management — /api/farms/:farmId/water/schedules
waterRouter.get("/schedules", listSchedules);
waterRouter.post("/schedules/generate", generateSchedules);
waterRouter.put("/schedules/:scheduleId/complete", markComplete);
waterRouter.put("/schedules/:scheduleId/skip", markSkipped);

// Aggregated summary — /api/farms/:farmId/water/summary
waterRouter.get("/summary", waterSummary);

export default waterRouter;
