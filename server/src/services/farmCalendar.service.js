import prisma from "../config/prisma.js";
import { AppError } from "../utils/errors.js";
import { RECIPES, SQ_METERS_PER_ACRE } from "../constants/naturalFarming.js";
import { getFarmerIdFromUser } from "../utils/serviceUtils.js";
import { toDateStr, addWeeks } from "../utils/dateUtils.js";

// ─── Season anchors ───────────────────────────────────────────────────────────

const SEASON_START = {
  Kharif:     (yr) => new Date(yr, 5,  1),  // June 1
  Rabi:       (yr) => new Date(yr, 10, 1),  // November 1
  Zaid:       (yr) => new Date(yr, 2,  1),  // March 1
  Perennial:  null,                         // anchored to farm.createdAt
};

// Duration in weeks per season (upper bound for lifecycle generation)
const SEASON_DURATION_WEEKS = {
  Kharif:    40,
  Rabi:      16,
  Zaid:      24,
  Perennial: 80, // ~18 months for Papaya
};

// ─── Crop lifecycle templates ─────────────────────────────────────────────────
// Each entry: week offset from season start, task metadata, labour rates.
// workers    : base headcount (for 1-acre zone)
// hoursPerAcre: labour hours, scales linearly with zone area

// hoursPerAcre = realistic total person-hours per acre for that task.
// CG agricultural labour: ₹400/day ÷ 8 hrs = ₹50/hr.
// These values match real-world ZBNF farm operations.
const CROP_LIFECYCLE = {
  Haldi: [
    { week:  0, type: "field_prep",   category: "crop_care", workers: 6, hoursPerAcre: 48, priority: "morning",   title: "Field Preparation & Bunding" },
    { week:  1, type: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  4, priority: "morning",   title: "Beejamrit Rhizome Treatment",         recipe: "Beejamrit" },
    { week:  2, type: "planting",     category: "crop_care", workers: 6, hoursPerAcre: 40, priority: "morning",   title: "Haldi Rhizome Planting" },
    { week:  4, type: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #1",            recipe: "Jeevamrit" },
    { week:  6, type: "thinning",     category: "crop_care", workers: 4, hoursPerAcre: 16, priority: "morning",   title: "Thinning & First Weeding" },
    { week:  8, type: "mulching",     category: "crop_care", workers: 4, hoursPerAcre: 20, priority: "afternoon", title: "Mulching with Crop Residue" },
    { week: 10, type: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #2",            recipe: "Jeevamrit" },
    { week: 12, type: "weeding",      category: "crop_care", workers: 5, hoursPerAcre: 24, priority: "morning",   title: "Weeding" },
    { week: 14, type: "pest_control", category: "inputs",    workers: 3, hoursPerAcre:  5, priority: "afternoon", title: "Agniastra Pest Control #1",           recipe: "Agniastra" },
    { week: 16, type: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #3",            recipe: "Jeevamrit" },
    { week: 20, type: "weeding",      category: "crop_care", workers: 5, hoursPerAcre: 20, priority: "morning",   title: "Weeding & Earthing Up" },
    { week: 24, type: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #4",            recipe: "Jeevamrit" },
    { week: 28, type: "pest_control", category: "inputs",    workers: 3, hoursPerAcre:  5, priority: "afternoon", title: "Agniastra Pest Control #2",           recipe: "Agniastra" },
    { week: 32, type: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #5 (Pre-harvest)", recipe: "Jeevamrit" },
    { week: 36, type: "harvest",      category: "harvest",   workers: 8, hoursPerAcre: 80, priority: "morning",   title: "Haldi Harvest — Opening Window" },
    { week: 38, type: "harvest",      category: "harvest",   workers: 8, hoursPerAcre: 80, priority: "morning",   title: "Haldi Harvest (continued)" },
  ],

  Papaya: [
    { week:  0, type: "field_prep",   category: "crop_care", workers: 5, hoursPerAcre: 40, priority: "morning",   title: "Field Preparation for Papaya" },
    { week:  1, type: "planting",     category: "crop_care", workers: 5, hoursPerAcre: 32, priority: "morning",   title: "Papaya Seedling Transplanting" },
    { week:  3, type: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #1",            recipe: "Jeevamrit" },
    { week:  6, type: "mulching",     category: "crop_care", workers: 4, hoursPerAcre: 20, priority: "afternoon", title: "Mulching" },
    { week:  8, type: "weeding",      category: "crop_care", workers: 4, hoursPerAcre: 20, priority: "morning",   title: "Weeding" },
    { week: 10, type: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #2",            recipe: "Jeevamrit" },
    { week: 12, type: "pruning",      category: "crop_care", workers: 3, hoursPerAcre: 16, priority: "morning",   title: "Pruning & Staking" },
    { week: 16, type: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #3",            recipe: "Jeevamrit" },
    { week: 18, type: "pest_control", category: "inputs",    workers: 3, hoursPerAcre:  5, priority: "afternoon", title: "Agniastra Pest Control #1",           recipe: "Agniastra" },
    { week: 20, type: "weeding",      category: "crop_care", workers: 4, hoursPerAcre: 16, priority: "morning",   title: "Weeding" },
    { week: 24, type: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #4",            recipe: "Jeevamrit" },
    { week: 25, type: "pruning",      category: "crop_care", workers: 3, hoursPerAcre: 16, priority: "morning",   title: "Pruning & Training" },
    { week: 30, type: "pest_control", category: "inputs",    workers: 3, hoursPerAcre:  5, priority: "afternoon", title: "Agniastra Pest Control #2",           recipe: "Agniastra" },
    { week: 36, type: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #5",            recipe: "Jeevamrit" },
    { week: 40, type: "harvest",      category: "harvest",   workers: 6, hoursPerAcre: 48, priority: "morning",   title: "Papaya Harvest Begins" },
    { week: 44, type: "harvest",      category: "harvest",   workers: 6, hoursPerAcre: 48, priority: "morning",   title: "Papaya Harvest (bi-weekly)" },
    { week: 48, type: "harvest",      category: "harvest",   workers: 6, hoursPerAcre: 48, priority: "morning",   title: "Papaya Harvest (bi-weekly)" },
    { week: 52, type: "harvest",      category: "harvest",   workers: 6, hoursPerAcre: 48, priority: "morning",   title: "Papaya Harvest (bi-weekly)" },
    { week: 56, type: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #6 (Year 2)",   recipe: "Jeevamrit" },
    { week: 60, type: "harvest",      category: "harvest",   workers: 6, hoursPerAcre: 48, priority: "morning",   title: "Papaya Harvest (Year 2)" },
    { week: 64, type: "harvest",      category: "harvest",   workers: 6, hoursPerAcre: 48, priority: "morning",   title: "Papaya Harvest (Year 2)" },
    { week: 68, type: "harvest",      category: "harvest",   workers: 6, hoursPerAcre: 48, priority: "morning",   title: "Papaya Harvest (Year 2)" },
    { week: 72, type: "harvest",      category: "harvest",   workers: 6, hoursPerAcre: 48, priority: "morning",   title: "Papaya Harvest (Year 2)" },
  ],

  Creepers: [
    { week:  0, type: "field_prep",   category: "crop_care", workers: 5, hoursPerAcre: 36, priority: "morning",   title: "Field Preparation for Creepers" },
    { week:  1, type: "planting",     category: "crop_care", workers: 5, hoursPerAcre: 30, priority: "morning",   title: "Creeper Seeding" },
    { week:  2, type: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  4, priority: "morning",   title: "Beejamrit Seed Treatment",            recipe: "Beejamrit" },
    { week:  3, type: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #1",            recipe: "Jeevamrit" },
    { week:  4, type: "training",     category: "crop_care", workers: 4, hoursPerAcre: 16, priority: "afternoon", title: "Trellis Setup & Vine Training" },
    { week:  6, type: "thinning",     category: "crop_care", workers: 3, hoursPerAcre: 12, priority: "morning",   title: "Thinning" },
    { week:  8, type: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #2",            recipe: "Jeevamrit" },
    { week:  9, type: "weeding",      category: "crop_care", workers: 4, hoursPerAcre: 16, priority: "morning",   title: "Weeding" },
    { week: 11, type: "pruning",      category: "crop_care", workers: 3, hoursPerAcre: 12, priority: "afternoon", title: "Vine Pruning & Training" },
    { week: 12, type: "pest_control", category: "inputs",    workers: 3, hoursPerAcre:  5, priority: "afternoon", title: "Agniastra Pest Control",              recipe: "Agniastra" },
    { week: 14, type: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #3",            recipe: "Jeevamrit" },
    { week: 16, type: "harvest",      category: "harvest",   workers: 6, hoursPerAcre: 36, priority: "morning",   title: "Creepers Harvest — Opening Window" },
    { week: 18, type: "harvest",      category: "harvest",   workers: 6, hoursPerAcre: 36, priority: "morning",   title: "Creepers Harvest (continued)" },
    { week: 20, type: "harvest",      category: "harvest",   workers: 6, hoursPerAcre: 36, priority: "morning",   title: "Creepers Final Harvest" },
    { week: 22, type: "field_prep",   category: "crop_care", workers: 3, hoursPerAcre: 16, priority: "afternoon", title: "Crop Removal & Field Cleanup" },
  ],

  "Leafy Vegetable": [
    { week:  0, type: "field_prep",   category: "crop_care", workers: 4, hoursPerAcre: 30, priority: "morning",   title: "Bed Preparation for Leafy Veg" },
    { week:  1, type: "planting",     category: "crop_care", workers: 3, hoursPerAcre: 24, priority: "morning",   title: "Seed Sowing" },
    { week:  1, type: "fertilizer",   category: "inputs",    workers: 2, hoursPerAcre:  4, priority: "morning",   title: "Jeevamrit Application #1",            recipe: "Jeevamrit" },
    { week:  2, type: "thinning",     category: "crop_care", workers: 3, hoursPerAcre: 12, priority: "morning",   title: "Thinning & Gap Filling" },
    { week:  3, type: "weeding",      category: "crop_care", workers: 3, hoursPerAcre: 16, priority: "morning",   title: "First Weeding" },
    { week:  4, type: "fertilizer",   category: "inputs",    workers: 2, hoursPerAcre:  4, priority: "morning",   title: "Jeevamrit Application #2",            recipe: "Jeevamrit" },
    { week:  5, type: "weeding",      category: "crop_care", workers: 3, hoursPerAcre: 12, priority: "morning",   title: "Second Weeding" },
    { week:  6, type: "pest_control", category: "inputs",    workers: 2, hoursPerAcre:  4, priority: "afternoon", title: "Agniastra Pest Control",              recipe: "Agniastra" },
    { week:  7, type: "fertilizer",   category: "inputs",    workers: 2, hoursPerAcre:  4, priority: "morning",   title: "Jeevamrit Application #3 (Pre-harvest)", recipe: "Jeevamrit" },
    { week:  8, type: "harvest",      category: "harvest",   workers: 5, hoursPerAcre: 25, priority: "morning",   title: "Leafy Veg Harvest Begins" },
    { week: 10, type: "harvest",      category: "harvest",   workers: 5, hoursPerAcre: 25, priority: "morning",   title: "Leafy Veg Final Harvest" },
    { week: 11, type: "field_prep",   category: "crop_care", workers: 3, hoursPerAcre: 12, priority: "afternoon", title: "Crop Removal & Composting" },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Scale a recipe's ingredient amounts by zone area in acres.
 * Recipes in naturalFarming.js are defined per acre.
 */
const scaleRecipe = (recipeName, areaAcres) => {
  const base = RECIPES[recipeName];
  if (!base) return null;

  return Object.fromEntries(
    Object.entries(base).map(([key, ing]) => [
      key,
      {
        label: ing.label,
        amount: Math.round(ing.amount * areaAcres * 10) / 10,
        unit: ing.unit,
      },
    ])
  );
};

/**
 * Labour headcount scaled by zone area.
 * Base workers assume 1 acre; each additional acre adds 0.5 workers, capped at 20.
 */
const scaleWorkers = (baseWorkers, areaAcres) =>
  Math.min(20, Math.round(baseWorkers + Math.max(0, areaAcres - 1) * 0.5));

const scaleHours = (hoursPerAcre, areaAcres) =>
  Math.round(hoursPerAcre * areaAcres);

/**
 * Determine the season start that is the best anchor for generating lifecycle
 * events visible within [windowStart, windowEnd].
 * Returns an array of Date anchors (current cycle + adjacent cycles if needed).
 */
const getSeasonAnchors = (cropSeason, durationWeeks, windowStart, windowEnd, farmCreatedAt, plantingMonth = null) => {
  if (cropSeason === "Perennial") {
    // Papaya anchors to farm creation date; also check if a +24-month cycle
    // is in window (continuous perennial farming)
    const anchors = [];
    let anchor = new Date(farmCreatedAt);
    anchor.setHours(0, 0, 0, 0);
    while (anchor <= windowEnd) {
      const cycleEnd = addWeeks(anchor, durationWeeks);
      if (cycleEnd >= windowStart) anchors.push(new Date(anchor));
      anchor = addWeeks(anchor, durationWeeks);
    }
    return anchors;
  }

  // Use DB plantingWindowStart month if provided, fall back to hardcoded SEASON_START
  const startFn = plantingMonth
    ? (yr) => new Date(yr, plantingMonth - 1, 1)
    : SEASON_START[cropSeason];
  if (!startFn) return [];

  const anchors = [];
  const seen = new Set();
  // Check every year from one before windowStart to one after windowEnd
  for (let yr = windowStart.getFullYear() - 1; yr <= windowEnd.getFullYear() + 1; yr++) {
    const s = startFn(yr);
    const key = s.getTime();
    if (seen.has(key)) continue;
    seen.add(key);
    const cycleEnd = addWeeks(s, durationWeeks);
    if (s <= windowEnd && cycleEnd >= windowStart) {
      anchors.push(s);
    }
  }
  return anchors;
};

/**
 * Build a soil advisory string from a SoilReport.
 * Shown in the event detail drawer for context.
 */
const buildSoilAdvisory = (soilReport) => {
  if (!soilReport) return null;
  const parts = [];
  if (soilReport.soilType === "Bhata" || soilReport.soilType === "Matasi") {
    parts.push("Sandy/laterite soil — increase mulching frequency to retain moisture.");
  }
  if (soilReport.drainageSpeed === "Fast") {
    parts.push("Fast drainage — apply inputs early morning before water evaporates.");
  }
  if (soilReport.drainageSpeed === "Slow") {
    parts.push("Slow drainage — avoid over-irrigation; allow soil to dry between waterings.");
  }
  if (soilReport.phLevel < 5.5) {
    parts.push(`Low pH (${soilReport.phLevel}) — consider lime application to raise pH before planting.`);
  }
  if (soilReport.phLevel > 7.5) {
    parts.push(`High pH (${soilReport.phLevel}) — apply organic matter to gradually lower pH.`);
  }
  if (soilReport.earthwormCount >= 7) {
    parts.push("Good earthworm activity — soil biology is healthy, Jeevamrit is working.");
  } else if (soilReport.earthwormCount < 3) {
    parts.push("Low earthworm count — increase Jeevamrit frequency to boost soil biology.");
  }
  return parts.length ? parts.join(" ") : null;
};

// ─── Core event generator ────────────────────────────────────────────────────

/**
 * Generate all lifecycle + irrigation events for a single zone across
 * the calendar window [windowStart, windowEnd].
 *
 * @param {object} zone       - Prisma Zone record with soilReport + cropAssignment
 * @param {object} cropRecord - Prisma Crop record (for weeklyWaterRequirementLitersPerAcre)
 * @param {object[]} dbSchedules - IrrigationSchedule records for this zone
 * @param {Date} windowStart
 * @param {Date} windowEnd
 * @param {Date} farmCreatedAt
 * @returns {object[]} CalendarEvent array
 */
// Generates only irrigation events (DB-backed + template fill-in).
// Lifecycle/observation events now come from CalendarTask DB records.
const generateIrrigationEvents = (zone, cropRecord, dbSchedules, windowStart, windowEnd, farmCreatedAt, lifecycleTemplates = []) => {
  const cropName    = zone.cropAssignment.cropEconomics.cropName;
  const areaAcres   = zone.areaSquareMeters / SQ_METERS_PER_ACRE;
  const soilReport  = zone.soilReport ?? null;
  // Use DB templates if provided, fall back to hardcoded constant
  const template    = lifecycleTemplates.length
    ? lifecycleTemplates.filter((t) => !t.isObservation)
    : (CROP_LIFECYCLE[cropName] ?? []);
  const events      = [];

  // ── Irrigation events ─────────────────────────────────────────────────────
  // Index DB schedules by week-start date string so we can detect coverage.
  const dbByWeekStart = new Map(
    dbSchedules.map((s) => [toDateStr(new Date(s.weekStartDate)), s])
  );

  // Soil retention multiplier for template irrigation calculation
  const SOIL_MULTIPLIER = { Kanhar: 0.80, Dorsa: 1.00, Matasi: 1.20, Bhata: 1.30 };
  const DRAIN_MULTIPLIER = { Slow: 0.85, Balanced: 1.00, Fast: 1.20 };
  const soilMult = soilReport
    ? (SOIL_MULTIPLIER[soilReport.soilType] ?? 1.0) *
      (DRAIN_MULTIPLIER[soilReport.drainageSpeed] ?? 1.0)
    : 1.0;

  const baseWeeklyLiters = cropRecord
    ? cropRecord.weeklyWaterRequirementLitersPerAcre * areaAcres * soilMult
    : 5000 * areaAcres;

  // Emit DB-backed irrigation events first
  for (const sched of dbSchedules) {
    const schedDate = new Date(sched.weekStartDate);
    schedDate.setDate(schedDate.getDate() + 1); // Tuesday of the week
    if (schedDate < windowStart || schedDate > windowEnd) continue;

    const isDeficit = (sched.waterOverdraftLiters ?? 0) > 0;

    events.push({
      id:           `irr-db-${sched.id}`,
      date:         toDateStr(schedDate),
      type:         "irrigation",
      category:     "irrigation",
      title:        `Irrigation — ${zone.name} (${sched.irrigationMethod})`,
      zoneId:       zone.id,
      zoneName:     zone.name,
      zoneNumber:   zone.zoneNumber,
      cropName,
      priority:     "morning",
      labourWorkers: 1,
      labourHours:   Math.ceil(areaAcres * 2),
      status:       sched.status.toLowerCase(),
      details: {
        irrigation: {
          waterLiters:           sched.adjustedWaterLiters,
          baseWaterLiters:       sched.baseWaterLiters,
          soilRetentionMultiplier: sched.soilRetentionMultiplier,
          method:                sched.irrigationMethod,
          sourceName:            sched.waterSource?.name ?? null,
          sourceType:            sched.waterSource?.sourceType ?? null,
          isDeficit,
          overdraftLiters:       sched.waterOverdraftLiters ?? 0,
          completedLiters:       sched.completedLiters ?? null,
        },
        soilAdvisory: buildSoilAdvisory(soilReport),
        notes: sched.notes ?? null,
      },
    });
  }

  // Fill template irrigation events for growing-season weeks not covered by DB
  if (template) {
    const cropSeason = zone.cropAssignment.cropEconomics.season;
    const durationWeeks = cropRecord?.seasonDurationWeeks ?? SEASON_DURATION_WEEKS[cropSeason] ?? 40;
    const anchors = getSeasonAnchors(cropSeason, durationWeeks, windowStart, windowEnd, farmCreatedAt, cropRecord?.plantingWindowStart ?? null);

    for (const seasonStart of anchors) {
      // Find planting week from the lifecycle template (first 'planting' task)
      // DB templates use weekOffset; hardcoded use week
      const plantingTask = template.find((t) => (t.taskType ?? t.type) === "planting");
      const harvestTask  = template.find((t) => (t.taskType ?? t.type) === "harvest");
      const irrigStartWeek = plantingTask ? (plantingTask.weekOffset ?? plantingTask.week ?? 2) : 2;
      const irrigEndWeek   = harvestTask  ? (harvestTask.weekOffset  ?? harvestTask.week  ?? durationWeeks) + 2 : durationWeeks;

      for (let w = irrigStartWeek; w <= irrigEndWeek; w++) {
        const weekMonday = addWeeks(seasonStart, w);
        weekMonday.setHours(0, 0, 0, 0);
        const mondayStr = toDateStr(weekMonday);

        // Skip if DB already has a schedule for this week
        if (dbByWeekStart.has(mondayStr)) continue;

        const eventDate = new Date(weekMonday);
        eventDate.setDate(weekMonday.getDate() + 1); // Tuesday
        if (eventDate < windowStart || eventDate > windowEnd) continue;

        events.push({
          id:           `irr-tpl-${zone.id}-w${w}-${seasonStart.getTime()}`,
          date:         toDateStr(eventDate),
          type:         "irrigation",
          category:     "irrigation",
          title:        `Irrigation — ${zone.name} (Planned)`,
          zoneId:       zone.id,
          zoneName:     zone.name,
          zoneNumber:   zone.zoneNumber,
          cropName,
          priority:     "morning",
          labourWorkers: 1,
          labourHours:   Math.ceil(areaAcres * 2),
          status:       "template",
          details: {
            irrigation: {
              waterLiters:           Math.round(baseWeeklyLiters),
              baseWaterLiters:       Math.round(cropRecord?.weeklyWaterRequirementLitersPerAcre * areaAcres ?? 5000 * areaAcres),
              soilRetentionMultiplier: parseFloat(soilMult.toFixed(4)),
              method:                "Scheduled",
              sourceName:            null,
              sourceType:            null,
              isDeficit:             false,
              overdraftLiters:       0,
              completedLiters:       null,
            },
            soilAdvisory: buildSoilAdvisory(soilReport),
            notes: "Template — generate weekly schedules in Water Management to lock in actual water source and quantities.",
          },
        });
      }
    }
  }

  return events;
};

// ─── Daily labour aggregation ────────────────────────────────────────────────

const aggregateDailyLabour = (events) => {
  const map = {};
  for (const ev of events) {
    const d = ev.date;
    if (!map[d]) map[d] = { workers: 0, hours: 0, taskTitles: [] };
    map[d].workers += ev.labourWorkers;
    map[d].hours   += ev.labourHours;
    map[d].taskTitles.push(ev.title);
  }
  // Cap workers per day (same crew handles multiple tasks in sequence)
  for (const d of Object.keys(map)) {
    map[d].workers = Math.min(map[d].workers, 12);
  }
  return map;
};

// ─── Alerts builder ──────────────────────────────────────────────────────────

const buildAlerts = (allEvents) => {
  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const in14Days = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

  const deficitIrrigations = allEvents.filter(
    (ev) =>
      ev.type === "irrigation" &&
      ev.details?.irrigation?.isDeficit &&
      ev.status === "completed"
  );

  const harvestsOpening = allEvents.filter((ev) => {
    if (ev.type !== "harvest") return false;
    const d = new Date(ev.date); d.setHours(0, 0, 0, 0);
    return d >= today && d <= in14Days;
  });

  const overdueTasks = allEvents.filter((ev) => {
    if (ev.type === "irrigation") return false; // irrigation has its own status
    return ev.status === "overdue";
  });

  return { deficitIrrigations, harvestsOpening, overdueTasks };
};

// ─── Public service function ──────────────────────────────────────────────────

/**
 * GET /api/farms/:farmId/calendar
 *
 * Returns calendar events for the requested month window (±1 week buffer),
 * daily labour aggregation, and farm-wide alerts.
 *
 * @param {string} farmId
 * @param {{ year: number, month: number, zoneId?: string, category?: string }} options
 * @param {object} user  - req.user from auth middleware
 */
export const getFarmCalendar = async (farmId, options, user) => {
  const farmerId = getFarmerIdFromUser(user);

  const farm = await prisma.farm.findFirst({
    where: { id: farmId, farmerId },
    select: { id: true, name: true, createdAt: true },
  });
  if (!farm) throw new AppError("Farm not found", 404);

  // ── Calendar window: full month ± 1 week buffer ──────────────────────────
  const year  = parseInt(options.year)  || new Date().getFullYear();
  const month = parseInt(options.month) || new Date().getMonth() + 1; // 1-based

  const windowStart = new Date(year, month - 1, 1);
  windowStart.setDate(windowStart.getDate() - 7);
  windowStart.setHours(0, 0, 0, 0);

  const windowEnd = new Date(year, month, 0); // last day of month
  windowEnd.setDate(windowEnd.getDate() + 7);
  windowEnd.setHours(23, 59, 59, 999);

  // ── Fetch zones with all required relations ──────────────────────────────
  const zoneWhere = { farmId };
  if (options.zoneId) zoneWhere.id = options.zoneId;

  const zones = await prisma.zone.findMany({
    where: zoneWhere,
    orderBy: { zoneNumber: "asc" },
    include: {
      soilReport: true,
      cropAssignment: {
        include: { cropEconomics: true },
      },
    },
  });

  // Fetch irrigation schedules for all zones in the window
  const schedules = await prisma.irrigationSchedule.findMany({
    where: {
      farmId,
      weekStartDate: { gte: windowStart, lte: windowEnd },
      ...(options.zoneId ? { zoneId: options.zoneId } : {}),
    },
    include: {
      waterSource: { select: { id: true, name: true, sourceType: true } },
    },
  });

  const schedulesByZone = {};
  for (const s of schedules) {
    if (!schedulesByZone[s.zoneId]) schedulesByZone[s.zoneId] = [];
    schedulesByZone[s.zoneId].push(s);
  }

  // Fetch persisted CalendarTask records for the window (lifecycle + observation tasks)
  const dbTaskWhere = {
    farmId,
    scheduledDate: { gte: windowStart, lte: windowEnd },
    ...(options.zoneId ? { zoneId: options.zoneId } : {}),
    ...(options.category ? { category: options.category } : {}),
  };
  const calendarTasks = await prisma.calendarTask.findMany({
    where: dbTaskWhere,
    include: { zone: { include: { soilReport: true } } },
    orderBy: [{ scheduledDate: "asc" }, { priority: "asc" }],
  });

  // Group CalendarTask records by zoneId for easy lookup
  const tasksByZone = {};
  for (const t of calendarTasks) {
    if (!tasksByZone[t.zoneId]) tasksByZone[t.zoneId] = [];
    tasksByZone[t.zoneId].push(t);
  }

  // ── Generate events for each zone ────────────────────────────────────────
  let allEvents = [];

  for (const zone of zones) {
    if (!zone.cropAssignment?.cropEconomics) continue;

    const cropName = zone.cropAssignment.cropEconomics.cropName;
    const areaAcres = zone.areaSquareMeters / SQ_METERS_PER_ACRE;

    // ── Lifecycle + observation events: use persisted CalendarTask records ──
    const zoneTasks = tasksByZone[zone.id] ?? [];
    for (const task of zoneTasks) {
      allEvents.push(taskToEvent(task, zone.name, zone.zoneNumber, zone.soilReport, areaAcres));
    }

    // ── Irrigation events: still generated from IrrigationSchedule + template
    const cropRecord = await prisma.crop.findFirst({
      where: { name: cropName },
      select: { weeklyWaterRequirementLitersPerAcre: true, seasonDurationWeeks: true, plantingWindowStart: true },
    });

    const zoneLifecycleTemplates = await prisma.cropLifecycleTemplate.findMany({
      where: { cropName, isObservation: false },
      orderBy: { weekOffset: "asc" },
    });

    const irrigationEvents = generateIrrigationEvents(
      zone,
      cropRecord,
      schedulesByZone[zone.id] ?? [],
      windowStart,
      windowEnd,
      farm.createdAt,
      zoneLifecycleTemplates
    );

    allEvents.push(...irrigationEvents);
  }

  // Category filter already applied to calendarTask query above;
  // also filter irrigation events if category is set
  if (options.category && options.category !== "irrigation") {
    allEvents = allEvents.filter((ev) => ev.category !== "irrigation");
  } else if (options.category === "irrigation") {
    allEvents = allEvents.filter((ev) => ev.category === "irrigation");
  }

  // Sort by date then priority
  allEvents.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const p = { morning: 0, afternoon: 1 };
    return (p[a.priority] ?? 0) - (p[b.priority] ?? 0);
  });

  const dailyLabour = aggregateDailyLabour(allEvents);
  const alerts      = buildAlerts(allEvents);

  // ── Zone metadata for filter UI ──────────────────────────────────────────
  const zoneMeta = zones
    .filter((z) => z.cropAssignment?.cropEconomics)
    .map((z) => ({
      zoneId:   z.id,
      zoneName: z.name,
      cropName: z.cropAssignment.cropEconomics.cropName,
    }));

  return {
    farmId:   farm.id,
    farmName: farm.name,
    year,
    month,
    events:      allEvents,
    dailyLabour,
    alerts,
    zoneMeta,
  };
};


// ─── Checklist items per task type ───────────────────────────────────────────
// Each task type has a fixed checklist the farmer ticks off in the drawer.
// id must be unique within a task type; keep labels concise (< 60 chars).

export const TASK_CHECKLISTS = {
  // ── Observation tasks ──────────────────────────────────────────────────────
  germination_check: [
    { id: "gc1", label: "Sprouts/shoots visible?" },
    { id: "gc2", label: "Germination ≥ 70% of planted area?" },
    { id: "gc3", label: "Gaps marked for re-sowing?" },
    { id: "gc4", label: "No damping-off (stem rot at base)?" },
  ],
  plant_stand: [
    { id: "ps1", label: "Counted live plants per row" },
    { id: "ps2", label: "Stand % recorded in notebook" },
    { id: "ps3", label: "Weak/diseased seedlings removed" },
  ],
  tiller_check: [
    { id: "tc1", label: "Tillers counted (target: 3–5 per clump)" },
    { id: "tc2", label: "No stunted or yellowing tillers" },
    { id: "tc3", label: "Soil around base firm (no waterlogging)" },
  ],
  leaf_health: [
    { id: "lh1", label: "No yellow or brown spots on leaves" },
    { id: "lh2", label: "Leaf underside inspected for pests" },
    { id: "lh3", label: "No holes or chewing damage visible" },
    { id: "lh4", label: "Leaf colour uniform and deep green" },
  ],
  underground_check: [
    { id: "ug1", label: "Dug 1–2 sample plants" },
    { id: "ug2", label: "Rhizome swelling clearly visible" },
    { id: "ug3", label: "No rot or discolouration on rhizome" },
    { id: "ug4", label: "Re-covered sample plants carefully" },
  ],
  flower_stalk_check: [
    { id: "fs1", label: "Inspected all plants for flower stalks" },
    { id: "fs2", label: "Flower stalks removed where found" },
    { id: "fs3", label: "Count of removed stalks noted" },
  ],
  pest_scout: [
    { id: "psc1", label: "Leaf underside checked for mites/thrips" },
    { id: "psc2", label: "Stem base checked for borer entry holes" },
    { id: "psc3", label: "No signs of wilt or stem discolouration" },
    { id: "psc4", label: "Pest level below action threshold?" },
  ],
  leaf_yellowing: [
    { id: "ly1", label: ">50% leaves yellow? (harvest approaching)" },
    { id: "ly2", label: "Lower leaves drying naturally (not disease)" },
    { id: "ly3", label: "Noted date — plan harvest within 2–3 weeks" },
  ],
  harvest_readiness: [
    { id: "hr1", label: "Lifted 2 sample plants to inspect" },
    { id: "hr2", label: "Rhizome firm and light yellow inside" },
    { id: "hr3", label: "Rhizome skin smooth (no soft spots)" },
    { id: "hr4", label: "Harvest date confirmed with team" },
  ],
  seedling_check: [
    { id: "sc1", label: "No wilting during afternoon heat" },
    { id: "sc2", label: "Root zone moist but not waterlogged" },
    { id: "sc3", label: "No root rot smell near base" },
    { id: "sc4", label: "All transplanted seedlings upright" },
  ],
  sex_determination: [
    { id: "sd1", label: "Flower buds visible in leaf axils" },
    { id: "sd2", label: "Male plants identified (thin bud, no bulge)" },
    { id: "sd3", label: "Female/hermaphrodite plants marked" },
    { id: "sd4", label: "Male:female ratio recorded" },
  ],
  male_thinning: [
    { id: "mt1", label: "Excess male plants removed" },
    { id: "mt2", label: "1 male kept per 10 female plants" },
    { id: "mt3", label: "Removed plants composted or used as mulch" },
  ],
  flowering_check: [
    { id: "fc1", label: "Flower buds counted per plant (target: 5+)" },
    { id: "fc2", label: "No flower drop occurring" },
    { id: "fc3", label: "Insects visiting flowers (pollination active)" },
  ],
  fruit_set: [
    { id: "fst1", label: "Tiny fruits visible at flower base" },
    { id: "fst2", label: "No fruit drop in last 3 days" },
    { id: "fst3", label: "Fruit count per plant recorded" },
  ],
  fruit_development: [
    { id: "fd1", label: "10+ fruits per plant (target met?)" },
    { id: "fd2", label: "No yellowing or premature drop" },
    { id: "fd3", label: "Fruit size progressing normally" },
    { id: "fd4", label: "No fruit fly entry holes visible" },
  ],
  maturity_check: [
    { id: "mc1", label: "Latex lines visible on fruit skin" },
    { id: "mc2", label: "Slight softening at stem end" },
    { id: "mc3", label: "Skin colour turning (green → yellow tinge)" },
    { id: "mc4", label: "1 test fruit cut to check flesh colour" },
  ],
  annual_health: [
    { id: "ah1", label: "Leaves checked for mosaic/ring-spot virus" },
    { id: "ah2", label: "Sucker count at base noted" },
    { id: "ah3", label: "Stem girth measured and recorded" },
    { id: "ah4", label: "Overall plant vigour rated (1–5)" },
  ],
  vine_check: [
    { id: "vc1", label: "Vine length measured" },
    { id: "vc2", label: "All shoots attached to trellis" },
    { id: "vc3", label: "No broken or wilting vines" },
  ],
  male_flower_check: [
    { id: "mfc1", label: "Male flowers opening (thin stalk, no bulge)" },
    { id: "mfc2", label: "Pollen visible on open flowers" },
    { id: "mfc3", label: "Bees/insects present for pollination" },
  ],
  female_flower_check: [
    { id: "ffc1", label: "Female flowers identified (bulge at base)" },
    { id: "ffc2", label: "Pollination occurring (insects active)" },
    { id: "ffc3", label: "Count of female flowers recorded" },
  ],
  fruit_sizing: [
    { id: "fsi1", label: "Fruit length measured (target per variety)" },
    { id: "fsi2", label: "Fruit fly entry holes inspected" },
    { id: "fsi3", label: "No bitter/off-colour fruits" },
    { id: "fsi4", label: "Harvest date estimated" },
  ],
  yield_tally: [
    { id: "yt1", label: "Total fruits harvested counted" },
    { id: "yt2", label: "Total weight (kg) recorded" },
    { id: "yt3", label: "Quality graded (A/B/C)" },
    { id: "yt4", label: "Revenue or disposal noted" },
  ],
  season_review: [
    { id: "sr1", label: "Total yield vs. target compared" },
    { id: "sr2", label: "Main pest/disease issues noted" },
    { id: "sr3", label: "Soil condition assessed for next crop" },
    { id: "sr4", label: "Lessons learned written down" },
  ],
  true_leaf_check: [
    { id: "tlc1", label: "True leaves (not seed leaves) visible" },
    { id: "tlc2", label: "Plant density — thinned if overcrowded" },
    { id: "tlc3", label: "No pale or spindly seedlings" },
  ],
  growth_rate: [
    { id: "gr1", label: "Plant height measured (target: 5–8 cm)" },
    { id: "gr2", label: "Soil moisture checked — not too dry" },
    { id: "gr3", label: "No signs of nutrient deficiency" },
  ],
  colour_check: [
    { id: "cc1", label: "Leaf colour deep green (not pale/yellow)" },
    { id: "cc2", label: "Pale green = possible N deficiency noted" },
    { id: "cc3", label: "Extra Jeevamrit applied if deficient" },
  ],
  quality_check: [
    { id: "qc1", label: "Leaf texture firm (not soft or wilted)" },
    { id: "qc2", label: "No bolting (flower stalks emerging)" },
    { id: "qc3", label: "Taste tested — not bitter" },
    { id: "qc4", label: "Harvest planned within 3 days" },
  ],

  // ── Action tasks ───────────────────────────────────────────────────────────
  field_prep: [
    { id: "fp1", label: "Soil ploughed / dug to 30 cm depth" },
    { id: "fp2", label: "Bunds repaired and levelled" },
    { id: "fp3", label: "Previous crop residue removed or composted" },
    { id: "fp4", label: "Field level checked (no waterlogging spots)" },
  ],
  planting: [
    { id: "pl1", label: "Seed / seedling / rhizome quantity correct" },
    { id: "pl2", label: "Spacing maintained as per plan" },
    { id: "pl3", label: "Planting depth correct (not too shallow/deep)" },
    { id: "pl4", label: "Soil firmed around each plant" },
    { id: "pl5", label: "Immediate light irrigation given" },
  ],
  fertilizer: [
    { id: "fe1", label: "Mixture prepared at correct ratio" },
    { id: "fe2", label: "Applied to all plants evenly" },
    { id: "fe3", label: "Quantity used noted in record book" },
    { id: "fe4", label: "Applied in morning (before 10 AM)" },
  ],
  weeding: [
    { id: "we1", label: "All weeds removed between rows" },
    { id: "we2", label: "Weeds removed near plant base" },
    { id: "we3", label: "Removed weeds composted or taken out" },
    { id: "we4", label: "Soil loosened lightly around plants" },
  ],
  mulching: [
    { id: "mu1", label: "Mulch material collected (straw/residue)" },
    { id: "mu2", label: "5–8 cm thick layer applied" },
    { id: "mu3", label: "Mulch kept 5 cm away from stem" },
    { id: "mu4", label: "All bare soil covered" },
  ],
  thinning: [
    { id: "th1", label: "Weak/extra plants removed" },
    { id: "th2", label: "Correct spacing maintained" },
    { id: "th3", label: "Removed plants composted" },
  ],
  pest_control: [
    { id: "pc1", label: "Spray mixture prepared correctly" },
    { id: "pc2", label: "Applied to leaf underside (main target)" },
    { id: "pc3", label: "All affected zones covered" },
    { id: "pc4", label: "Applied in evening (after 5 PM)" },
    { id: "pc5", label: "Quantity used recorded" },
  ],
  pruning: [
    { id: "pr1", label: "Dead/diseased branches removed" },
    { id: "pr2", label: "Cut surfaces clean (not torn)" },
    { id: "pr3", label: "Removed material taken out of field" },
    { id: "pr4", label: "Plant shape balanced after pruning" },
  ],
  training: [
    { id: "tr1", label: "All main vines attached to trellis" },
    { id: "tr2", label: "Clips/ties not cutting into stem" },
    { id: "tr3", label: "Trellis wires taut and secure" },
    { id: "tr4", label: "Side shoots trained or removed" },
  ],
  harvest: [
    { id: "ha1", label: "Maturity criteria met before cutting" },
    { id: "ha2", label: "Harvest done with clean tools" },
    { id: "ha3", label: "Produce graded and weighed" },
    { id: "ha4", label: "Total yield recorded in notebook" },
    { id: "ha5", label: "Damaged produce separated" },
  ],
  irrigation: [
    { id: "ir1", label: "Water source level checked before start" },
    { id: "ir2", label: "Correct amount applied per zone" },
    { id: "ir3", label: "No water wastage / runoff observed" },
    { id: "ir4", label: "Water source level noted after completion" },
  ],
};

// ─── Observation task templates per crop ──────────────────────────────────────
// Merged into the main lifecycle generation alongside CROP_LIFECYCLE tasks.
// category: "observation", type: specific observation key from TASK_CHECKLISTS

const CROP_OBSERVATIONS = {
  Haldi: [
    { week:  2, type: "germination_check",  category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Germination Check — Rhizome sprouts visible?" },
    { week:  4, type: "plant_stand",        category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Plant Stand Count — Record germination %" },
    { week:  8, type: "tiller_check",       category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Tiller Development — Count tillers per clump" },
    { week: 12, type: "leaf_health",        category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Canopy & Leaf Health Check" },
    { week: 16, type: "underground_check",  category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Underground Progress — Dig sample plant" },
    { week: 20, type: "flower_stalk_check", category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Flower Stalk Alert — Remove any flower stalks" },
    { week: 24, type: "pest_scout",         category: "observation", workers: 1, hoursPerAcre: 1, priority: "afternoon", title: "Pest & Disease Scout" },
    { week: 32, type: "leaf_yellowing",     category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Leaf Yellowing Check — Harvest window approaching" },
    { week: 35, type: "harvest_readiness",  category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Harvest Readiness — Lift sample rhizomes" },
  ],
  Papaya: [
    { week:  2, type: "seedling_check",     category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Seedling Establishment Check" },
    { week:  6, type: "leaf_health",        category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Leaf Development — Count leaves (target: 4+)" },
    { week:  8, type: "sex_determination",  category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Sex Determination — Identify male vs female plants" },
    { week: 10, type: "male_thinning",      category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Male Plant Thinning — Keep 1 male per 10 females" },
    { week: 14, type: "flowering_check",    category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "First Flowering — Count buds per plant" },
    { week: 18, type: "fruit_set",          category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Fruit Set Begins — Tiny fruits at flower base?" },
    { week: 24, type: "fruit_development",  category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Fruit Development — Count & inspect fruits" },
    { week: 32, type: "maturity_check",     category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Maturity Indicator — Latex lines & softening" },
    { week: 38, type: "harvest_readiness",  category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Pre-harvest Check — Press test for ripeness" },
    { week: 52, type: "annual_health",      category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Annual Health Audit — Virus symptoms & sucker count" },
  ],
  Creepers: [
    { week:  2, type: "germination_check",  category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Germination Check — Cotyledon leaves visible?" },
    { week:  4, type: "seedling_check",     category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Seedling Health — Damping off check" },
    { week:  5, type: "vine_check",         category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Vine Length — Attach to trellis (target: 30–40 cm)" },
    { week:  6, type: "male_flower_check",  category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "First Flowers — Male flowers opening?" },
    { week:  7, type: "female_flower_check",category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Female Flower Check — Fruit-bearing flowers visible?" },
    { week:  8, type: "fruit_set",          category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Fruit Set — Count young fruits per vine" },
    { week: 10, type: "fruit_sizing",       category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Fruit Sizing & Pest Check" },
    { week: 14, type: "yield_tally",        category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Weekly Yield Tally — Count & weigh harvest" },
    { week: 20, type: "season_review",      category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "End-of-Season Review — Total yield vs. plan" },
  ],
  "Leafy Vegetable": [
    { week:  1, type: "germination_check",  category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Germination Check — 70%+ in 5–7 days?" },
    { week:  2, type: "true_leaf_check",    category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "True Leaf Stage — Density & thinning check" },
    { week:  3, type: "growth_rate",        category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Growth Rate — Height check (target: 5–8 cm)" },
    { week:  4, type: "colour_check",       category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Colour Check — Pale green = nutrient deficiency" },
    { week:  6, type: "harvest_readiness",  category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Harvest Readiness — Outer leaves large enough?" },
    { week:  7, type: "quality_check",      category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",   title: "Quality Check — Taste, texture & bolting check" },
  ],
};


// ─── Task generation (called on crop assignment) ──────────────────────────────

/**
 * Pre-generate CalendarTask rows for a zone's assigned crop.
 * Called automatically when a crop is assigned to a zone.
 * Safe to call multiple times — uses upsert with unique(zoneId, taskType, scheduledDate).
 *
 * @param {string} zoneId
 * @param {string} farmId
 * @param {Date}   farmCreatedAt
 */
/** Build default checklist JSON for a task type — all items start as done:false */
const buildDefaultChecklist = (taskType) => {
  const items = TASK_CHECKLISTS[taskType];
  if (!items) return null;
  return items.map((item) => ({ ...item, done: false }));
};

export const generateTasksForZone = async (zoneId, farmId, farmCreatedAt) => {
  const zone = await prisma.zone.findUnique({
    where: { id: zoneId },
    include: {
      cropAssignment: { include: { cropEconomics: true } },
      farm: { select: { district: true, state: true } },
    },
  });

  if (!zone?.cropAssignment?.cropEconomics) return;

  const cropName    = zone.cropAssignment.cropEconomics.cropName;
  const cropSeason  = zone.cropAssignment.cropEconomics.season;
  const areaAcres   = zone.areaSquareMeters / SQ_METERS_PER_ACRE;

  // Load from DB first; fall back to hardcoded constant if not yet migrated
  const dbTemplates = await prisma.cropLifecycleTemplate.findMany({
    where: { cropName },
    orderBy: [{ weekOffset: "asc" }, { taskType: "asc" }],
  });

  const template     = dbTemplates.length
    ? dbTemplates.filter((t) => !t.isObservation)
    : (CROP_LIFECYCLE[cropName] ?? []);
  const observations = dbTemplates.length
    ? dbTemplates.filter((t) => t.isObservation)
    : (CROP_OBSERVATIONS[cropName] ?? []);

  if (!template.length && !observations.length) return;

  const cropRecord = await prisma.crop.findFirst({
    where: { name: cropName },
    select: { seasonDurationWeeks: true, plantingWindowStart: true },
  });
  const durationWeeks = cropRecord?.seasonDurationWeeks ?? SEASON_DURATION_WEEKS[cropSeason] ?? 40;

  const now   = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);

  // windowStart = today — never create tasks in the past for new farmers.
  // windowEnd   = 3 years ahead to cover multi-year perennial crops (Papaya).
  const windowStart = today;
  const windowEnd   = new Date(now.getFullYear() + 3, 11, 31);

  const anchors = getSeasonAnchors(
    cropSeason,
    durationWeeks,
    windowStart,
    windowEnd,
    farmCreatedAt ?? now,
    cropRecord?.plantingWindowStart ?? null
  );

  // Only plan from season starts that are on or after today.
  // A farmer registering mid-season waits for the next season anchor so that
  // every lifecycle starts properly at field-prep, not in the middle of a crop.
  const upcomingAnchors = anchors.filter((a) => a >= today);

  const tasksToUpsert = [];

  // Normalise field names: DB uses weekOffset/taskType, hardcoded uses week/type
  const normalise = (t, isObs) => ({
    week:         t.weekOffset ?? t.week ?? 0,
    type:         t.taskType   ?? t.type ?? "observation",
    category:     t.category,
    title:        t.title,
    priority:     t.priority ?? "morning",
    workers:      t.workers ?? 1,
    hoursPerAcre: t.hoursPerAcre ?? 1,
    recipe:       t.recipeKey ?? t.recipe ?? null,
    isObservation: isObs,
  });

  const allTasks = [
    ...template.map((t) => normalise(t, false)),
    ...observations.map((t) => normalise(t, true)),
  ];

  for (const seasonStart of upcomingAnchors) {
    for (const task of allTasks) {
      const eventDate = addWeeks(seasonStart, task.week);
      eventDate.setHours(0, 0, 0, 0);

      if (eventDate < windowStart || eventDate > windowEnd) continue;

      tasksToUpsert.push({
        zoneId,
        farmId,
        cropName,
        taskType:       task.type,
        category:       task.category,
        scheduledDate:  eventDate,
        title:          task.title,
        priority:       task.priority,
        labourWorkers:  task.isObservation ? 1 : scaleWorkers(task.workers, areaAcres),
        labourHours:    task.isObservation ? 1 : scaleHours(task.hoursPerAcre, areaAcres),
        recipeKey:      task.recipe ?? null,
        weekOffset:     task.week,
        checklistItems: buildDefaultChecklist(task.type),
      });
    }
  }

  // Insert all tasks — skip any that already exist (preserves completed/skipped status)
  if (tasksToUpsert.length > 0) {
    await prisma.calendarTask.createMany({
      data: tasksToUpsert,
      skipDuplicates: true,
    });
  }

  // Auto-create Supply listings for every harvest task (75-day advance notice).
  // Idempotent: calendarTaskId is unique on Supply, so duplicates are silently skipped.
  const cropEcon  = zone.cropAssignment.cropEconomics;
  const district  = zone.farm?.district ?? "";
  const state     = zone.farm?.state ?? "Chhattisgarh";
  const yieldKg   = cropEcon.yieldPerAcreKg * areaAcres;
  const harvestTasks = await prisma.calendarTask.findMany({
    where: { zoneId, farmId, taskType: "harvest" },
    select: { id: true, scheduledDate: true },
  });

  for (const ht of harvestTasks) {
    const existing = await prisma.supply.findUnique({ where: { calendarTaskId: ht.id } });
    if (existing) continue;
    await prisma.supply.create({
      data: {
        farmId,
        zoneId,
        calendarTaskId:      ht.id,
        cropName:            cropName,
        predictedHarvestDate: ht.scheduledDate,
        estimatedQuantityKg: Math.round(yieldKg),
        availableQuantityKg: Math.round(yieldKg),
        pricePerKg:          cropEcon.rawSalePricePerKg,
        district,
        state,
        status:              "UPCOMING",
        isPublished:         false,
      },
    });
  }
};

// ─── Helper: map CalendarTask status to event status ─────────────────────────

const taskStatusToEventStatus = (task) => {
  if (task.status === "COMPLETED") return "completed";
  if (task.status === "SKIPPED")   return "skipped";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d     = new Date(task.scheduledDate); d.setHours(0, 0, 0, 0);
  return d < today ? "overdue" : "scheduled";
};

// ─── Helper: build a CalendarEvent-shaped object from a CalendarTask DB row ───

const taskToEvent = (task, zoneName, zoneNumber, soilReport, areaAcres) => {
  const scaledRecipe = task.recipeKey ? scaleRecipe(task.recipeKey, areaAcres) : null;
  return {
    id:           `ct-${task.id}`,
    dbTaskId:     task.id,
    date:         toDateStr(new Date(task.scheduledDate)),
    type:         task.taskType,
    category:     task.category,
    title:        `${task.title} — ${zoneName}`,
    zoneId:       task.zoneId,
    zoneName,
    zoneNumber,
    cropName:     task.cropName,
    priority:     task.priority,
    labourWorkers: task.labourWorkers,
    labourHours:   task.labourHours,
    status:        taskStatusToEventStatus(task),
    completedAt:    task.completedAt ?? null,
    completedNote:  task.completedNote ?? null,
    checklistItems: Array.isArray(task.checklistItems) ? task.checklistItems : [],
    isCustom:       task.isCustom ?? false,
    details: {
      recipe:       scaledRecipe ? { name: task.recipeKey, ingredients: scaledRecipe } : null,
      irrigation:   null,
      soilAdvisory: task.isCustom ? null : buildSoilAdvisory(soilReport),
      notes:        task.isCustom
        ? (task.notes ?? null)
        : `${task.cropName} — ${zoneName} (${areaAcres.toFixed(2)} acres)`,
    },
  };
};

// ─── TODAY endpoint ───────────────────────────────────────────────────────────

/**
 * GET /api/farms/:farmId/calendar/today
 *
 * Returns today's lifecycle tasks (from CalendarTask) + today's irrigation
 * schedules (from IrrigationSchedule), grouped into morning/afternoon.
 * Also returns missedCount — PENDING tasks before today.
 */
export const getTodayTasks = async (farmId, user) => {
  const farmerId = getFarmerIdFromUser(user);

  const farm = await prisma.farm.findFirst({
    where: { id: farmId, farmerId },
    select: { id: true, name: true },
  });
  if (!farm) throw new AppError("Farm not found", 404);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999);

  // Fetch today's lifecycle tasks
  const lifecycleTasks = await prisma.calendarTask.findMany({
    where: { farmId, scheduledDate: { gte: today, lte: todayEnd } },
    include: {
      zone: { include: { soilReport: true } },
    },
    orderBy: [{ priority: "asc" }, { taskType: "asc" }],
  });

  // Fetch today's irrigation schedules (week containing today)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);

  const irrigationSchedules = await prisma.irrigationSchedule.findMany({
    where: {
      farmId,
      weekStartDate: { gte: weekStart, lte: weekEnd },
    },
    include: {
      zone: { include: { soilReport: true, cropAssignment: { include: { cropEconomics: true } } } },
      waterSource: { select: { name: true, sourceType: true } },
    },
  });

  // Build event objects
  const events = [];

  for (const task of lifecycleTasks) {
    const zone       = task.zone;
    const areaAcres  = zone.areaSquareMeters / SQ_METERS_PER_ACRE;
    events.push(taskToEvent(task, zone.name, zone.zoneNumber, zone.soilReport, areaAcres));
  }

  for (const sched of irrigationSchedules) {
    const zone      = sched.zone;
    const areaAcres = zone.areaSquareMeters / SQ_METERS_PER_ACRE;
    const cropName  = zone.cropAssignment?.cropEconomics?.cropName ?? "Unknown";
    const isDeficit = (sched.waterOverdraftLiters ?? 0) > 0;

    events.push({
      id:           `irr-today-${sched.id}`,
      dbTaskId:     sched.id,
      date:         toDateStr(today),
      type:         "irrigation",
      category:     "irrigation",
      title:        `Irrigation — ${zone.name} (${sched.irrigationMethod})`,
      zoneId:       zone.id,
      zoneName:     zone.name,
      zoneNumber:   zone.zoneNumber,
      cropName,
      priority:     "morning",
      labourWorkers: 1,
      labourHours:   Math.ceil(areaAcres * 2),
      status:        sched.status.toLowerCase(),
      completedAt:   sched.completedAt ?? null,
      completedNote: sched.notes ?? null,
      details: {
        recipe: null,
        irrigation: {
          waterLiters:             sched.adjustedWaterLiters,
          baseWaterLiters:         sched.baseWaterLiters,
          soilRetentionMultiplier: sched.soilRetentionMultiplier,
          method:                  sched.irrigationMethod,
          sourceName:              sched.waterSource?.name ?? null,
          sourceType:              sched.waterSource?.sourceType ?? null,
          isDeficit,
          overdraftLiters:         sched.waterOverdraftLiters ?? 0,
          completedLiters:         sched.completedLiters ?? null,
        },
        soilAdvisory: buildSoilAdvisory(zone.soilReport),
        notes:        sched.notes ?? null,
      },
    });
  }

  // Split into morning / afternoon
  const morning   = events.filter((e) => e.priority === "morning");
  const afternoon = events.filter((e) => e.priority === "afternoon");

  // Labour total for today
  const totalWorkers = Math.min(12, events.reduce((s, e) => s + e.labourWorkers, 0));
  const totalHours   = events.reduce((s, e) => s + e.labourHours, 0);

  // Missed count — PENDING lifecycle tasks before today
  const missedCount = await prisma.calendarTask.count({
    where: { farmId, status: "PENDING", scheduledDate: { lt: today } },
  });

  const completedToday = events.filter((e) => e.status === "completed").length;

  return {
    farmId: farm.id,
    date:   toDateStr(today),
    morning,
    afternoon,
    totalTasks:   events.length,
    completedToday,
    totalWorkers,
    totalHours,
    missedCount,
  };
};

// ─── YEAR OVERVIEW endpoint ───────────────────────────────────────────────────

/**
 * GET /api/farms/:farmId/calendar/year?year=2025
 *
 * Returns 12-month summary for the requested year.
 * Each month: task counts by status, category breakdown, labour totals, critical dates.
 */
export const getYearOverview = async (farmId, yearParam, user) => {
  const farmerId = getFarmerIdFromUser(user);

  const farm = await prisma.farm.findFirst({
    where: { id: farmId, farmerId },
    select: { id: true, name: true },
  });
  if (!farm) throw new AppError("Farm not found", 404);

  const year       = parseInt(yearParam) || new Date().getFullYear();
  const yearStart  = new Date(year, 0, 1);
  const yearEnd    = new Date(year, 11, 31, 23, 59, 59);

  const tasks = await prisma.calendarTask.findMany({
    where: { farmId, scheduledDate: { gte: yearStart, lte: yearEnd } },
    select: {
      id: true,
      scheduledDate: true,
      taskType: true,
      category: true,
      title: true,
      status: true,
      labourWorkers: true,
      labourHours: true,
      cropName: true,
      zoneId: true,
      zone: { select: { name: true } },
    },
    orderBy: { scheduledDate: "asc" },
  });

  // Also fetch irrigation schedules for the year
  const irrigations = await prisma.irrigationSchedule.findMany({
    where: { farmId, weekStartDate: { gte: yearStart, lte: yearEnd } },
    select: { weekStartDate: true, status: true, adjustedWaterLiters: true },
  });

  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Build month summaries
  const months = Array.from({ length: 12 }, (_, i) => {
    const monthTasks = tasks.filter((t) => new Date(t.scheduledDate).getMonth() === i);
    const monthIrr   = irrigations.filter((s) => new Date(s.weekStartDate).getMonth() === i);

    const total     = monthTasks.length + monthIrr.length;
    const completed = monthTasks.filter((t) => t.status === "COMPLETED").length +
                      monthIrr.filter((s) => s.status === "COMPLETED").length;
    const skipped   = monthTasks.filter((t) => t.status === "SKIPPED").length +
                      monthIrr.filter((s) => s.status === "SKIPPED").length;
    const missed    = monthTasks.filter((t) => {
      if (t.status !== "PENDING") return false;
      const d = new Date(t.scheduledDate); d.setHours(0, 0, 0, 0);
      return d < today;
    }).length;
    const pending   = total - completed - skipped - missed;

    // Category breakdown
    const byCategory = {};
    for (const t of monthTasks) {
      byCategory[t.category] = (byCategory[t.category] ?? 0) + 1;
    }
    if (monthIrr.length > 0) {
      byCategory.irrigation = (byCategory.irrigation ?? 0) + monthIrr.length;
    }

    // Labour
    const totalWorkers = Math.min(12, monthTasks.reduce((s, t) => s + t.labourWorkers, 0));
    const totalHours   = monthTasks.reduce((s, t) => s + t.labourHours, 0);

    // Critical dates (planting + harvest events)
    const criticalDates = monthTasks
      .filter((t) => t.taskType === "planting" || t.taskType === "harvest")
      .map((t) => ({
        date:     toDateStr(new Date(t.scheduledDate)),
        type:     t.taskType,
        title:    t.title,
        cropName: t.cropName,
        zoneName: t.zone?.name ?? "",
      }));

    return {
      month:       i + 1,
      total,
      completed,
      skipped,
      missed,
      pending,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      byCategory,
      totalWorkers,
      totalHours,
      criticalDates,
    };
  });

  return { farmId: farm.id, farmName: farm.name, year, months };
};

// ─── MISSED TASKS endpoint ────────────────────────────────────────────────────

/**
 * GET /api/farms/:farmId/calendar/missed
 *
 * Returns all PENDING CalendarTask records with scheduledDate before today,
 * sorted by date (oldest first).
 */
export const getMissedTasks = async (farmId, user) => {
  const farmerId = getFarmerIdFromUser(user);

  const farm = await prisma.farm.findFirst({
    where: { id: farmId, farmerId },
    select: { id: true },
  });
  if (!farm) throw new AppError("Farm not found", 404);

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const tasks = await prisma.calendarTask.findMany({
    where: { farmId, status: "PENDING", scheduledDate: { lt: today } },
    include: {
      zone: { include: { soilReport: true } },
    },
    orderBy: { scheduledDate: "asc" },
  });

  const events = tasks.map((task) => {
    const zone      = task.zone;
    const areaAcres = zone.areaSquareMeters / SQ_METERS_PER_ACRE;
    return taskToEvent(task, zone.name, zone.zoneNumber, zone.soilReport, areaAcres);
  });

  return { farmId, missedCount: events.length, tasks: events };
};

// ─── UPDATE TASK STATUS endpoint ──────────────────────────────────────────────

/**
 * PATCH /api/farms/:farmId/tasks/:taskId
 * Body: { status: "COMPLETED" | "SKIPPED", note?: string }
 */
export const updateTaskStatus = async (farmId, taskId, status, note, user) => {
  const farmerId = getFarmerIdFromUser(user);

  // Verify farm belongs to this farmer
  const farm = await prisma.farm.findFirst({
    where: { id: farmId, farmerId },
    select: { id: true },
  });
  if (!farm) throw new AppError("Farm not found", 404);

  const task = await prisma.calendarTask.findFirst({
    where: { id: taskId, farmId },
  });
  if (!task) throw new AppError("Task not found", 404);

  const allowed = ["COMPLETED", "SKIPPED", "PENDING"];
  if (!allowed.includes(status)) throw new AppError("Invalid status", 400);

  // When marking COMPLETED, also tick all checklist items
  const existingItems = Array.isArray(task.checklistItems) ? task.checklistItems : [];
  const updatedItems =
    status === "COMPLETED"
      ? existingItems.map((i) => ({ ...i, done: true }))
      : existingItems;

  const updated = await prisma.calendarTask.update({
    where: { id: taskId },
    data: {
      status,
      completedAt:    status === "COMPLETED" ? new Date() : null,
      completedNote:  note ?? null,
      checklistItems: updatedItems,
    },
  });

  return {
    id:             updated.id,
    status:         updated.status,
    completedAt:    updated.completedAt,
    completedNote:  updated.completedNote,
    checklistItems: updated.checklistItems,
  };
};

// ─── UPDATE CHECKLIST ITEM ────────────────────────────────────────────────────

/**
 * PATCH /api/farms/:farmId/tasks/:taskId/checklist
 * Body: { itemId: string, done: boolean }
 *
 * Toggles one checklist item. If all items become done, auto-completes the task.
 */
export const updateChecklistItem = async (farmId, taskId, itemId, done, user) => {
  const farmerId = getFarmerIdFromUser(user);

  const farm = await prisma.farm.findFirst({
    where: { id: farmId, farmerId },
    select: { id: true },
  });
  if (!farm) throw new AppError("Farm not found", 404);

  const task = await prisma.calendarTask.findFirst({
    where: { id: taskId, farmId },
  });
  if (!task) throw new AppError("Task not found", 404);

  // Parse existing checklist
  const items = Array.isArray(task.checklistItems) ? task.checklistItems : [];
  const updated = items.map((item) =>
    item.id === itemId ? { ...item, done: Boolean(done) } : item
  );

  // Auto-complete task when all items are checked
  const allDone    = updated.length > 0 && updated.every((i) => i.done);
  const anyDone    = updated.some((i) => i.done);
  const nextStatus =
    allDone  ? "COMPLETED" :
    anyDone  ? "PENDING"   :   // partial — stay PENDING
    task.status;               // unchanged

  const saved = await prisma.calendarTask.update({
    where: { id: taskId },
    data: {
      checklistItems: updated,
      status:        nextStatus,
      completedAt:   allDone ? new Date() : (nextStatus !== "COMPLETED" ? null : task.completedAt),
    },
  });

  return {
    id:             saved.id,
    checklistItems: saved.checklistItems,
    status:         saved.status,
    completedAt:    saved.completedAt,
    allDone,
  };
};

// ─── ACTIVITY LOG endpoint ────────────────────────────────────────────────────

/**
 * GET /api/farms/:farmId/calendar/activity-log
 * Query: year, month (optional), status (COMPLETED|SKIPPED|ALL), zoneId
 *
 * Returns all completed + skipped CalendarTask records for the farm,
 * filtered by the given params.
 */
export const getActivityLog = async (farmId, options, user) => {
  const farmerId = getFarmerIdFromUser(user);

  const farm = await prisma.farm.findFirst({
    where: { id: farmId, farmerId },
    select: { id: true, name: true },
  });
  if (!farm) throw new AppError("Farm not found", 404);

  const { year, month, status = "ALL", zoneId } = options;

  // Build date range filter
  const dateFilter = {};
  if (year) {
    const y = parseInt(year);
    if (month) {
      const m = parseInt(month) - 1; // 0-based
      dateFilter.gte = new Date(y, m, 1);
      dateFilter.lte = new Date(y, m + 1, 0, 23, 59, 59);
    } else {
      dateFilter.gte = new Date(y, 0, 1);
      dateFilter.lte = new Date(y, 11, 31, 23, 59, 59);
    }
  }

  // Status filter
  const statusFilter =
    status === "COMPLETED" ? ["COMPLETED"] :
    status === "SKIPPED"   ? ["SKIPPED"]   :
    ["COMPLETED", "SKIPPED"];

  const tasks = await prisma.calendarTask.findMany({
    where: {
      farmId,
      status: { in: statusFilter },
      ...(Object.keys(dateFilter).length ? { scheduledDate: dateFilter } : {}),
      ...(zoneId ? { zoneId } : {}),
    },
    include: {
      zone: { select: { name: true, zoneNumber: true } },
    },
    orderBy: [{ scheduledDate: "desc" }, { completedAt: "desc" }],
  });

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const rows = tasks.map((t) => {
    const scheduled = new Date(t.scheduledDate);
    scheduled.setHours(0, 0, 0, 0);
    const daysLate = t.completedAt
      ? Math.max(0, Math.round((new Date(t.completedAt) - scheduled) / 86400000))
      : null;

    return {
      id:            t.id,
      scheduledDate: toDateStr(scheduled),
      completedAt:   t.completedAt ? t.completedAt.toISOString() : null,
      status:        t.status,
      taskType:      t.taskType,
      category:      t.category,
      title:         t.title,
      cropName:      t.cropName,
      zoneId:        t.zoneId,
      zoneName:      t.zone.name,
      zoneNumber:    t.zone.zoneNumber,
      priority:      t.priority,
      labourWorkers: t.labourWorkers,
      labourHours:   t.labourHours,
      daysLate,
      completedNote: t.completedNote ?? null,
      checklistItems: Array.isArray(t.checklistItems) ? t.checklistItems : [],
    };
  });

  const completedCount = rows.filter((r) => r.status === "COMPLETED").length;
  const skippedCount   = rows.filter((r) => r.status === "SKIPPED").length;

  // Zone list for filter dropdown
  const zones = await prisma.zone.findMany({
    where: { farmId },
    select: { id: true, name: true, zoneNumber: true },
    orderBy: { zoneNumber: "asc" },
  });

  return {
    farmId,
    farmName:       farm.name,
    totalCount:     rows.length,
    completedCount,
    skippedCount,
    tasks:          rows,
    zones,
  };
};

// ─── CREATE CUSTOM TASK ───────────────────────────────────────────────────────

export const createCustomTask = async (farmId, body, user) => {
  const farmerId = getFarmerIdFromUser(user);

  const farm = await prisma.farm.findFirst({
    where: { id: farmId, farmerId },
    select: { id: true },
  });
  if (!farm) throw new AppError("Farm not found", 404);

  const {
    title,
    scheduledDate,
    category = "crop_care",
    priority = "morning",
    labourWorkers = 1,
    labourHours = 1,
    zoneId,
    notes,
  } = body;

  if (!title?.trim()) throw new AppError("Title is required", 400);
  if (!scheduledDate)  throw new AppError("Scheduled date is required", 400);

  // Validate zone belongs to farm if provided
  if (zoneId) {
    const zone = await prisma.zone.findFirst({ where: { id: zoneId, farmId } });
    if (!zone) throw new AppError("Zone not found", 404);
  }

  const task = await prisma.calendarTask.create({
    data: {
      farmId,
      zoneId:        zoneId || null,
      cropName:      "",
      taskType:      "custom",
      category,
      scheduledDate: new Date(scheduledDate),
      title:         title.trim(),
      priority,
      labourWorkers: parseInt(labourWorkers) || 1,
      labourHours:   parseFloat(labourHours) || 1,
      isCustom:      true,
      notes:         notes?.trim() || null,
      checklistItems: [],
    },
    include: { zone: { select: { name: true, zoneNumber: true } } },
  });

  return {
    id:            task.id,
    title:         task.title,
    scheduledDate: toDateStr(new Date(task.scheduledDate)),
    category:      task.category,
    priority:      task.priority,
    labourWorkers: task.labourWorkers,
    labourHours:   task.labourHours,
    zoneId:        task.zoneId,
    zoneName:      task.zone?.name ?? null,
    isCustom:      true,
    notes:         task.notes,
  };
};

// ─── UPDATE CUSTOM TASK ───────────────────────────────────────────────────────

export const updateCustomTask = async (farmId, taskId, body, user) => {
  const farmerId = getFarmerIdFromUser(user);

  const farm = await prisma.farm.findFirst({
    where: { id: farmId, farmerId },
    select: { id: true },
  });
  if (!farm) throw new AppError("Farm not found", 404);

  const task = await prisma.calendarTask.findFirst({
    where: { id: taskId, farmId, isCustom: true },
  });
  if (!task) throw new AppError("Custom task not found", 404);

  const {
    title,
    scheduledDate,
    category,
    priority,
    labourWorkers,
    labourHours,
    zoneId,
    notes,
  } = body;

  if (zoneId) {
    const zone = await prisma.zone.findFirst({ where: { id: zoneId, farmId } });
    if (!zone) throw new AppError("Zone not found", 404);
  }

  const updated = await prisma.calendarTask.update({
    where: { id: taskId },
    data: {
      ...(title         ? { title: title.trim() }              : {}),
      ...(scheduledDate ? { scheduledDate: new Date(scheduledDate) } : {}),
      ...(category      ? { category }                         : {}),
      ...(priority      ? { priority }                         : {}),
      ...(labourWorkers !== undefined ? { labourWorkers: parseInt(labourWorkers) || 1 } : {}),
      ...(labourHours   !== undefined ? { labourHours:   parseFloat(labourHours) || 1 } : {}),
      zoneId: zoneId !== undefined ? (zoneId || null) : task.zoneId,
      ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
    },
    include: { zone: { select: { name: true, zoneNumber: true } } },
  });

  return { id: updated.id, title: updated.title, isCustom: true };
};

// ─── DELETE CUSTOM TASK ───────────────────────────────────────────────────────

export const deleteCustomTask = async (farmId, taskId, user) => {
  const farmerId = getFarmerIdFromUser(user);

  const farm = await prisma.farm.findFirst({
    where: { id: farmId, farmerId },
    select: { id: true },
  });
  if (!farm) throw new AppError("Farm not found", 404);

  const task = await prisma.calendarTask.findFirst({
    where: { id: taskId, farmId, isCustom: true },
  });
  if (!task) throw new AppError("Custom task not found or cannot be deleted", 404);

  await prisma.calendarTask.delete({ where: { id: taskId } });
  return { deleted: true, id: taskId };
};
