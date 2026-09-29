import prisma from "../config/prisma.js";
import { AppError } from "../utils/errors.js";
import { RECIPES, SQ_METERS_PER_ACRE } from "../constants/naturalFarming.js";
import { getFarmerIdFromUser } from "../utils/serviceUtils.js";
import { getMonday, toDateStr } from "../utils/dateUtils.js";

// ─── Reference constants ──────────────────────────────────────────────────────

// Typical annual NPK chemical fertilizer cost per acre in Chhattisgarh.
// Used only to quantify the "Natural Farming Savings" differential.
const CHEMICAL_FERTILIZER_COST_PER_ACRE = 8000;

// If Jeevamrit is NOT home-made, this is the per-acre market cost.
const JEEVAMRIT_MARKET_COST_PER_ACRE = 5000;

// Hardcoded fallback used only when EconomicsConfig row is missing from DB.
const HARDCODED_DEFAULTS = {
  landLayoutCostPerAcre:     12500,
  dripIrrigationCostPerAcre: 40000,
  solarDryerCostFlat:        13500,
  annualLabourCost:          576000,
  labourRatePerHour:         100,
  jeevamritHomemade:         true,
};

// Load global config from DB, merge with per-farm overrides.
// Per-farm non-null values always win over global defaults.
const loadEffectiveFinancials = async (farmFinancials) => {
  const global = await prisma.economicsConfig.findUnique({ where: { id: "global" } }) ?? HARDCODED_DEFAULTS;
  return {
    landLayoutCost:     farmFinancials?.landLayoutCost     ?? global.landLayoutCostPerAcre,
    dripIrrigationCost: farmFinancials?.dripIrrigationCost ?? global.dripIrrigationCostPerAcre,
    solarDryerCost:     farmFinancials?.solarDryerCost     ?? global.solarDryerCostFlat,
    annualLabourCost:   farmFinancials?.annualLabourCost   ?? global.annualLabourCost,
    labourRatePerHour:  farmFinancials?.labourRatePerHour  ?? global.labourRatePerHour,
    jeevamritHomemade:  farmFinancials?.jeevamritHomemade  ?? global.jeevamritHomemade,
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const round = (n) => Math.round(n);

/**
 * Build year-specific revenue for a single crop.
 *
 * Papaya is a special case: it has a 24-month establishment period.
 * Production in Year 1 is 0 kg; full yield only kicks in from Year 2.
 *
 * Revenue formula:
 *   raw        = yieldKg × areaAcres × rawPrice
 *   valueAdded = yieldKg × areaAcres × (processedPrice − processingCost)
 *                ↑ Net price after deducting post-harvest processing costs
 */
const buildCropRevenue = (crop, areaAcres, isYear2) => {
  const isPapayaYear1 = crop.cropName === "Papaya" && !isYear2;
  const effectiveYield = isPapayaYear1 ? 0 : crop.yieldPerAcreKg;
  const totalYield = effectiveYield * areaAcres;

  return {
    raw: round(totalYield * crop.rawSalePricePerKg),
    valueAdded: round(
      totalYield * (crop.processedSalePricePerKg - crop.processingCostPerKg)
    ),
  };
};

// ─── Main service export ──────────────────────────────────────────────────────

export const getFarmEconomics = async (farmId, user) => {
  const farmerId = getFarmerIdFromUser(user);

  // Ownership check: farm must belong to this farmer.
  const farm = await prisma.farm.findFirst({
    where: { id: farmId, farmerId },
    select: {
      id: true,
      name: true,
      areaAcres: true,
      farmFinancials: true, // null if not yet customised
    },
  });

  if (!farm) throw new AppError("Farm not found", 404);

  const areaAcres = farm.areaAcres;
  const fin = await loadEffectiveFinancials(farm.farmFinancials);

  // Fetch all four multilayer crops in a consistent order.
  const crops = await prisma.cropEconomics.findMany({
    orderBy: { cropName: "asc" },
  });

  if (!crops.length) {
    throw new AppError(
      "Crop economics data not seeded. Run: npm run seed",
      500
    );
  }

  // ── Capital Expenditures (Year 1 only) ───────────────────────────────────
  //   Layout + Bunds : scale per acre  (first-time land preparation)
  //   Drip Irrigation: scale per acre  (infrastructure installed once)
  //   Solar Dryer    : FLAT per farm   (one unit regardless of area)
  const capex = {
    landLayout:    round(fin.landLayoutCost     * areaAcres),
    dripIrrigation:round(fin.dripIrrigationCost * areaAcres),
    solarDryer:    round(fin.solarDryerCost),               // flat
  };
  capex.total = capex.landLayout + capex.dripIrrigation + capex.solarDryer;

  // ── Annual Operational Expenditures ──────────────────────────────────────
  //   Seeds        : every crop purchased/exchanged each season
  //   Labour       : flat per farm (2 workers, independent of area)
  //   Natural inputs: ₹0 if Jeevamrit is home-prepared; ₹5k/acre otherwise
  const annualSeedCost = round(
    crops.reduce((sum, c) => sum + c.seedCostPerAcre, 0) * areaAcres
  );
  const labourCost     = round(fin.annualLabourCost);
  const naturalInputs  = fin.jeevamritHomemade
    ? 0
    : round(JEEVAMRIT_MARKET_COST_PER_ACRE * areaAcres);

  const opexTotal = annualSeedCost + labourCost + naturalInputs;

  // OpEx is the same in Year 1 and Year 2+ — seeds and labour recur annually.
  const opex = {
    year1: { seeds: annualSeedCost, labour: labourCost, naturalInputs, total: opexTotal },
    year2: { seeds: annualSeedCost, labour: labourCost, naturalInputs, total: opexTotal },
  };

  // ── Per-crop revenue breakdown ────────────────────────────────────────────
  const cropBreakdown = crops.map((crop) => ({
    cropName:               crop.cropName,
    season:                 crop.season,
    durationMonths:         crop.durationMonths,
    seedCost:               round(crop.seedCostPerAcre * areaAcres),
    rawSalePricePerKg:      crop.rawSalePricePerKg,
    processedSalePricePerKg:crop.processedSalePricePerKg,
    year1Revenue:           buildCropRevenue(crop, areaAcres, false),
    year2Revenue:           buildCropRevenue(crop, areaAcres, true),
  }));

  // ── Aggregate revenue ─────────────────────────────────────────────────────
  const revenue = {
    year1: {
      raw:        cropBreakdown.reduce((s, c) => s + c.year1Revenue.raw,        0),
      valueAdded: cropBreakdown.reduce((s, c) => s + c.year1Revenue.valueAdded, 0),
    },
    year2: {
      raw:        cropBreakdown.reduce((s, c) => s + c.year2Revenue.raw,        0),
      valueAdded: cropBreakdown.reduce((s, c) => s + c.year2Revenue.valueAdded, 0),
    },
  };

  // ── Profit / Loss ──────────────────────────────────────────────────────────
  //   Year 1: Revenue − CapEx − OpEx_Y1   (high CapEx drag → often a net loss)
  //   Year 2: Revenue − OpEx_Y2           (CapEx is a sunk cost, profit surges)
  const profitLoss = {
    year1: {
      raw:        revenue.year1.raw        - capex.total - opex.year1.total,
      valueAdded: revenue.year1.valueAdded - capex.total - opex.year1.total,
    },
    year2: {
      raw:        revenue.year2.raw        - opex.year2.total,
      valueAdded: revenue.year2.valueAdded - opex.year2.total,
    },
  };

  // ── Natural Farming Savings ────────────────────────────────────────────────
  //   Compare: hypothetical chemical fertilizer spend vs actual natural input spend.
  //   Savings = chemicalCost − naturalCost
  const chemicalCost = round(CHEMICAL_FERTILIZER_COST_PER_ACRE * areaAcres);
  const naturalFarmingSavings = {
    chemicalCost,
    naturalCost: naturalInputs,
    savings: chemicalCost - naturalInputs,
    jeevamritHomemade: fin.jeevamritHomemade,
  };

  // ── Chart payloads ─────────────────────────────────────────────────────────

  // Donut chart: Year 1 total spend broken down by category.
  const totalYear1Cost = capex.total + opex.year1.total;
  const expenseDistribution = [
    { category: "Drip Irrigation", amount: capex.dripIrrigation },
    { category: "Land Layout",     amount: capex.landLayout      },
    { category: "Solar Dryer",     amount: capex.solarDryer      },
    { category: "Labour",          amount: opex.year1.labour     },
    { category: "Seeds",           amount: opex.year1.seeds      },
    { category: "Natural Inputs",  amount: opex.year1.naturalInputs },
  ]
    .filter((item) => item.amount > 0)
    .map((item) => ({
      ...item,
      percentage: Math.round((item.amount / totalYear1Cost) * 100),
    }));

  // Bar chart: Year-over-Year cash flow comparison.
  const cashFlowChart = [
    {
      year:               "Year 1",
      totalCost:          capex.total + opex.year1.total,
      rawRevenue:         revenue.year1.raw,
      valueAddedRevenue:  revenue.year1.valueAdded,
      rawProfit:          profitLoss.year1.raw,
      valueAddedProfit:   profitLoss.year1.valueAdded,
    },
    {
      year:               "Year 2",
      totalCost:          opex.year2.total,
      rawRevenue:         revenue.year2.raw,
      valueAddedRevenue:  revenue.year2.valueAdded,
      rawProfit:          profitLoss.year2.raw,
      valueAddedProfit:   profitLoss.year2.valueAdded,
    },
  ];

  return {
    farmId:    farm.id,
    farmName:  farm.name,
    areaAcres: Math.round(areaAcres * 100) / 100,
    capex,
    opex,
    revenue,
    profitLoss,
    naturalFarmingSavings,
    cropBreakdown,
    expenseDistribution,
    cashFlowChart,
  };
};

// ─── Weekly Economics ─────────────────────────────────────────────────────────

export const getWeeklyEconomics = async (farmId, { startDate }, user) => {
  const farmerId = getFarmerIdFromUser(user);

  const farm = await prisma.farm.findFirst({
    where: { id: farmId, farmerId },
    select: { id: true, name: true, farmFinancials: true },
  });
  if (!farm) throw new AppError("Farm not found", 404);

  const fin = await loadEffectiveFinancials(farm.farmFinancials);
  const LABOUR_RATE = fin.labourRatePerHour;

  // Crop revenue per acre (raw sale)
  const cropEconomics = await prisma.cropEconomics.findMany();
  const cropRevPerAcre = {};
  for (const c of cropEconomics) {
    cropRevPerAcre[c.cropName] = round(c.yieldPerAcreKg * c.rawSalePricePerKg);
  }

  // Zone area index
  const zones = await prisma.zone.findMany({
    where: { farmId },
    select: { id: true, name: true, zoneNumber: true, areaSquareMeters: true },
  });
  const zoneMap = {};
  for (const z of zones) {
    zoneMap[z.id] = { ...z, areaAcres: z.areaSquareMeters / SQ_METERS_PER_ACRE };
  }

  // Harvest count per zone-crop — used to divide annual revenue across harvest events
  const harvestGroups = await prisma.calendarTask.groupBy({
    by: ['zoneId', 'cropName'],
    where: { farmId, taskType: 'harvest' },
    _count: { id: true },
  });
  const harvestCountMap = {};
  for (const row of harvestGroups) {
    if (row.zoneId) harvestCountMap[`${row.zoneId}::${row.cropName}`] = row._count.id;
  }

  // Determine the 12-week window — if no startDate provided, auto-detect
  // the Monday of the week containing the nearest upcoming task (or today).
  let monday;
  if (startDate) {
    monday = getMonday(new Date(startDate));
  } else {
    const today = new Date();
    // Find the nearest future task, or the latest past task if all are past
    const nearestTask = await prisma.calendarTask.findFirst({
      where: { farmId, scheduledDate: { gte: today }, status: { not: 'SKIPPED' } },
      orderBy: { scheduledDate: 'asc' },
      select: { scheduledDate: true },
    });
    monday = getMonday(nearestTask ? new Date(nearestTask.scheduledDate) : today);
  }

  const windowEnd = new Date(monday);
  windowEnd.setUTCDate(monday.getUTCDate() + 12 * 7 - 1);

  // Single query for the entire 12-week window
  const allTasks = await prisma.calendarTask.findMany({
    where: {
      farmId,
      scheduledDate: { gte: monday, lte: windowEnd },
      status: { not: 'SKIPPED' },
    },
    select: {
      id: true, title: true, taskType: true, category: true,
      scheduledDate: true, priority: true,
      labourWorkers: true, labourHours: true,
      recipeKey: true, zoneId: true, cropName: true,
      isCustom: true, notes: true,
    },
    orderBy: { scheduledDate: 'asc' },
  });

  // Group tasks by week index (0–11)
  const tasksByWeek = Array.from({ length: 12 }, () => []);
  for (const task of allTasks) {
    const taskDate = new Date(task.scheduledDate);
    const diffDays = Math.floor((taskDate - monday) / 86400000);
    const weekIdx  = Math.floor(diffDays / 7);
    if (weekIdx >= 0 && weekIdx < 12) tasksByWeek[weekIdx].push(task);
  }

  // Build week objects
  const weeks = tasksByWeek.map((tasks, idx) => {
    const weekStart = new Date(monday);
    weekStart.setUTCDate(monday.getUTCDate() + idx * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

    let labourCost = 0;
    let inputCost  = 0;
    let revenue    = 0;
    const activities = [];

    for (const task of tasks) {
      const zone      = task.zoneId ? zoneMap[task.zoneId] : null;
      const areaAcres = zone?.areaAcres ?? 1;

      // labourHours = total team-hours (hoursPerAcre × area); labourWorkers = team size.
      // Cost = total hours × rate (not workers × hours × rate — that double-counts)
      const tLabour = round(task.labourHours * LABOUR_RATE);
      labourCost += tLabour;

      // Input cost: all natural inputs are homemade → ₹0, but list ingredients
      let tInput = 0;
      let ingredients = [];
      if (task.recipeKey && RECIPES[task.recipeKey]) {
        ingredients = Object.values(RECIPES[task.recipeKey]).map((ing) => ({
          label:  ing.label,
          amount: Math.ceil(ing.amount * areaAcres * 10) / 10,
          unit:   ing.unit,
        }));
      }
      inputCost += tInput;

      // Revenue only on harvest tasks — divided equally across all harvest events for that zone-crop
      let tRevenue = 0;
      if (task.taskType === 'harvest' && task.zoneId && task.cropName) {
        const annualRevPerAcre = cropRevPerAcre[task.cropName] ?? 0;
        const annualRev        = round(annualRevPerAcre * areaAcres);
        const harvestCount     = harvestCountMap[`${task.zoneId}::${task.cropName}`] ?? 1;
        tRevenue = round(annualRev / harvestCount);
        revenue += tRevenue;
      }

      activities.push({
        id:           task.id,
        title:        task.title,
        taskType:     task.taskType,
        category:     task.category,
        scheduledDate: toDateStr(new Date(task.scheduledDate)),
        priority:     task.priority,
        labourWorkers: task.labourWorkers,
        labourHours:   task.labourHours,
        labourCost:    tLabour,
        recipeKey:     task.recipeKey ?? null,
        ingredients,
        inputCost:     tInput,
        revenue:       tRevenue,
        zoneId:        task.zoneId ?? null,
        zoneName:      zone?.name ?? 'Whole Farm',
        zoneNumber:    zone?.zoneNumber ?? null,
        cropName:      task.cropName,
        isCustom:      task.isCustom,
      });
    }

    return {
      weekIndex:  idx,
      weekStart:  toDateStr(weekStart),
      weekEnd:    toDateStr(weekEnd),
      totalCost:  labourCost + inputCost,
      labourCost,
      inputCost,
      revenue,
      netProfit:  revenue - labourCost - inputCost,
      taskCount:  tasks.length,
      activities,
    };
  });

  return {
    farmId:      farm.id,
    farmName:    farm.name,
    currentWeek: toDateStr(monday),
    weeks,
  };
};

// ─── Global Economics Config (Expert) ────────────────────────────────────────

export const getEconomicsConfig = async () => {
  return prisma.economicsConfig.findUnique({ where: { id: "global" } }) ?? HARDCODED_DEFAULTS;
};

export const updateEconomicsConfig = async (user, body) => {
  if (!["ADMIN", "EXPERT"].includes(user.role)) throw new AppError("Expert access required", 403);
  const allowed = ["landLayoutCostPerAcre", "dripIrrigationCostPerAcre", "solarDryerCostFlat", "annualLabourCost", "labourRatePerHour", "jeevamritHomemade"];
  const data = {};
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  return prisma.economicsConfig.upsert({
    where: { id: "global" },
    create: { id: "global", ...data },
    update: data,
  });
};

// ─── Per-Farm Financials Override (Farmer) ───────────────────────────────────

export const getFarmFinancials = async (farmId, user) => {
  const farmerId = getFarmerIdFromUser(user);
  const farm = await prisma.farm.findFirst({ where: { id: farmId, farmerId }, select: { id: true, farmFinancials: true } });
  if (!farm) throw new AppError("Farm not found", 404);
  const globalConfig = await prisma.economicsConfig.findUnique({ where: { id: "global" } }) ?? HARDCODED_DEFAULTS;
  return { farmFinancials: farm.farmFinancials, globalConfig };
};

export const saveFarmFinancials = async (farmId, user, body) => {
  const farmerId = getFarmerIdFromUser(user);
  const farm = await prisma.farm.findFirst({ where: { id: farmId, farmerId }, select: { id: true } });
  if (!farm) throw new AppError("Farm not found", 404);
  const allowed = ["landLayoutCost", "dripIrrigationCost", "solarDryerCost", "annualLabourCost", "labourRatePerHour", "jeevamritHomemade"];
  const data = {};
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key] === "" ? null : body[key];
  }
  return prisma.farmFinancials.upsert({
    where: { farmId },
    create: { farmId, ...data },
    update: data,
  });
};
