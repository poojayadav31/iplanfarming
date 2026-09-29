import prisma from "../config/prisma.js";
import { getFarmerIdFromUser } from "../utils/serviceUtils.js";
import { getWeather, getSeasonalClimate } from "./weather.service.js";
import { AppError } from "../utils/errors.js";
import { RECIPES } from "../constants/naturalFarming.js";

// Factor weights — must sum to 100
const WEIGHTS = {
  soilType:         22,
  ph:               11,
  drainage:         11,
  water:            11,
  temperature:      11,
  season:            7,
  seasonalRainfall:  7,
  humidity:          5,
  droughtFrostRisk:  5,
  rotation:         10,
};

// Tanker water cost in Chhattisgarh (rupees per litre, approximate)
const WATER_COST_PER_LITRE = 0.5;

const MAX_RECOMMENDATIONS_PER_SEASON = 3;
const SEASON_ORDER = ["Kharif", "Rabi", "Zaid"];

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

// ─── Season months helper ─────────────────────────────────────────────────────
// Returns the months (1–12) covered by a crop's growing season.
const getSeasonMonths = (plantingStart, durationWeeks) => {
  const durationMonths = Math.ceil((durationWeeks || 17) / 4.33);
  const months = new Set();
  for (let m = 0; m < durationMonths; m++) {
    months.add(((plantingStart - 1 + m) % 12) + 1);
  }
  return [...months].sort((a, b) => a - b);
};

// ─── Factor scorers ───────────────────────────────────────────────────────────

const soilTypeScore = (crop, soilType) =>
  crop.suitableSoilTypes.includes(soilType) ? 100 : 0;

const phScore = (crop, phLevel) => {
  if (phLevel >= crop.minPh && phLevel <= crop.maxPh) return 100;
  const dist = phLevel < crop.minPh ? crop.minPh - phLevel : phLevel - crop.maxPh;
  return clamp(Math.round((1 - dist) * 100), 0, 100);
};

const DRAINAGE_COMPAT = {
  Slow:     { Slow: 100, Balanced: 60, Fast: 0   },
  Balanced: { Slow: 60,  Balanced: 100, Fast: 60 },
  Fast:     { Slow: 0,   Balanced: 60, Fast: 100 },
  Any:      { Slow: 80,  Balanced: 100, Fast: 80 },
};

const drainageScore = (crop, zoneDrainage) => {
  const pref = crop.preferredDrainage ?? "Any";
  if (pref === "Any") return 100;
  return DRAINAGE_COMPAT[zoneDrainage]?.[pref] ?? 50;
};

const waterScore = (crop, zoneAcres, totalFarmWaterLiters) => {
  if (!totalFarmWaterLiters || !zoneAcres) return 50;
  const wks = totalFarmWaterLiters / (zoneAcres * (crop.weeklyWaterRequirementLitersPerAcre || 5000));
  if (wks >= 4) return 100;
  if (wks >= 2) return 75;
  if (wks >= 1) return 50;
  return 20;
};

// Uses seasonal avg temp (70%) blended with current temp (30%)
const temperatureScore = (crop, currentTempC, seasonAvgTempC) => {
  const score = (t) => {
    if (t === null) return null;
    if (t >= crop.minTempC && t <= crop.maxTempC) return 100;
    const dist = t < crop.minTempC ? crop.minTempC - t : t - crop.maxTempC;
    return clamp(Math.round(100 - dist * 20), 0, 100);
  };
  const s1 = score(seasonAvgTempC);
  const s2 = score(currentTempC);
  if (s1 !== null && s2 !== null) return Math.round(s1 * 0.7 + s2 * 0.3);
  return s1 ?? s2 ?? 70;
};

const seasonCalendarScore = (crop, currentMonth) => {
  const { plantingWindowStart: start, plantingWindowEnd: end } = crop;
  if (currentMonth >= start && currentMonth <= end) return 100;
  const monthsAfterEnd   = (currentMonth - end   + 12) % 12;
  const monthsBeforeStart = (start - currentMonth + 12) % 12;
  const dist = Math.min(monthsAfterEnd, monthsBeforeStart);
  if (dist === 1) return 60;
  if (dist === 2) return 30;
  return 0;
};

// Seasonal rainfall fit — how well the location's historical season rain matches crop needs
const seasonalRainfallScore = (crop, seasonTotalRainfallMm) => {
  if (seasonTotalRainfallMm === null) return 60; // no data → neutral
  const mm = seasonTotalRainfallMm;
  const tol = crop.rainfallTolerance ?? "moderate";
  if (tol === "water-loving") {
    if (mm >= 800 && mm <= 1500) return 100;
    if (mm >= 500)               return 70;
    if (mm >= 300)               return 40;
    return 20;
  }
  if (tol === "drought-tolerant") {
    if (mm <= 500)               return 100;
    if (mm <= 700)               return 70;
    if (mm <= 900)               return 45;
    return 20;
  }
  // moderate
  if (mm >= 400 && mm <= 900)   return 100;
  if (mm >= 200 && mm < 400)    return 70;
  if (mm > 900 && mm <= 1200)   return 70;
  if (mm > 1200)                return 40;
  return 30;
};

// Humidity suitability — persistent high humidity risks fungal disease for some crops
const humidityScore = (crop, seasonAvgHumidityPct) => {
  if (seasonAvgHumidityPct === null) return 65;
  const h = seasonAvgHumidityPct;
  const tol = crop.rainfallTolerance ?? "moderate";
  if (tol === "water-loving") {
    // Rice etc. love humid conditions
    if (h >= 65) return 100;
    if (h >= 50) return 75;
    return 45;
  }
  if (tol === "drought-tolerant") {
    // Gram, Millets — prefer dry air
    if (h <= 55) return 100;
    if (h <= 70) return 65;
    return 30;
  }
  // moderate
  if (h >= 50 && h <= 75) return 100;
  if (h > 75)             return 65;
  return 70;
};

// Drought & frost risk — penalises crops that struggle with this location's season patterns
const droughtFrostRiskScore = (crop, avgDryWeeksPerSeason, avgFrostDaysPerSeason) => {
  let score = 100;
  const tol = crop.rainfallTolerance ?? "moderate";

  // Drought stress
  if (avgDryWeeksPerSeason > 6) {
    if (tol === "water-loving")     score -= 40;
    else if (tol === "moderate")    score -= 20;
    else                            score += 10; // drought-tolerant loves it
  } else if (avgDryWeeksPerSeason > 3) {
    if (tol === "water-loving")     score -= 20;
    else if (tol === "drought-tolerant") score += 5;
  }

  // Frost risk — mainly for Rabi crops
  if (avgFrostDaysPerSeason > 10) {
    if (tol !== "drought-tolerant") score -= 25; // tender crops hate frost
  } else if (avgFrostDaysPerSeason > 3) {
    if (tol === "water-loving")     score -= 15;
  }

  return clamp(score, 0, 100);
};

// ─── Bonuses / penalties (post-weighted) ─────────────────────────────────────

const rainfallBonus = (crop, rainfallCategory) => {
  if (!rainfallCategory) return 0;
  const tol = crop.rainfallTolerance ?? "moderate";
  if (tol === "water-loving"    && rainfallCategory === "wet")  return 5;
  if (tol === "drought-tolerant"&& rainfallCategory === "dry")  return 5;
  if (tol === "water-loving"    && rainfallCategory === "dry")  return -5;
  if (tol === "drought-tolerant"&& rainfallCategory === "wet")  return -5;
  return 0;
};

const soilHealthPenalty = (crop, soilHealthScore) => {
  if (soilHealthScore >= (crop.minSoilHealthScore ?? 0)) return 0;
  const deficit = (crop.minSoilHealthScore ?? 0) - soilHealthScore;
  return -clamp(deficit / 10, 0, 10);
};

// ─── Reason & warnings ───────────────────────────────────────────────────────

const buildReason = ({ crop, soilType, phLevel, ds, currentTempC, seasonAvgTempC, weeksCovered, seasonScore, seasonTotalRainfallMm }) => {
  const parts = [];

  parts.push(
    crop.suitableSoilTypes.includes(soilType)
      ? `Ideal for ${soilType} soil`
      : `Soil type ${soilType} is not ideal`
  );

  const phNum = Number(phLevel).toFixed(1);
  parts.push(
    phLevel >= crop.minPh && phLevel <= crop.maxPh
      ? `pH ${phNum} is in range`
      : `pH ${phNum} outside ideal ${crop.minPh}–${crop.maxPh}`
  );

  if (ds === 100) parts.push("drainage matches perfectly");
  else if (ds < 50) parts.push("drainage is a concern");

  const refTempC = seasonAvgTempC ?? currentTempC;
  if (refTempC !== null) {
    parts.push(
      refTempC >= crop.minTempC && refTempC <= crop.maxTempC
        ? `season avg ${refTempC}°C is ideal`
        : `season avg ${refTempC}°C is outside ${crop.minTempC}–${crop.maxTempC}°C range`
    );
  }

  if (weeksCovered !== null) {
    if (weeksCovered >= 4) parts.push("water supply is sufficient");
    else if (weeksCovered < 1) parts.push("water supply may be insufficient");
  }

  if (seasonTotalRainfallMm !== null) {
    parts.push(`location gets ~${seasonTotalRainfallMm} mm rain this season historically`);
  }

  if (seasonScore < 60) parts.push("planting window has passed or not yet open");

  return parts.join("; ") + ".";
};

const buildWarnings = ({ crop, ds, weeksCovered, seasonScore, currentTempC, seasonAvgTempC, soilType, seasonTotalRainfallMm, avgDryWeeksPerSeason, avgFrostDaysPerSeason, seasonAvgHumidityPct, lastCropName, lastCropFamily }) => {
  const warnings = [];

  if (lastCropName === crop.name)
    warnings.push({ factor: "rotation", message: `You grew ${crop.name} on this zone last season — consider rotating to a different crop family for soil health` });
  else if (lastCropFamily && lastCropFamily === (crop.cropFamily ?? "Other") && lastCropFamily !== "Other")
    warnings.push({ factor: "rotation", message: `Last crop on this zone was also a ${lastCropFamily} — rotating families improves natural farming outcomes` });

  if (!crop.suitableSoilTypes.includes(soilType))
    warnings.push({ factor: "soil", message: `Not suited for ${soilType} soil` });

  if (ds < 50)
    warnings.push({ factor: "drainage", message: `Crop prefers ${crop.preferredDrainage} drainage` });

  if (weeksCovered !== null && weeksCovered < 1)
    warnings.push({ factor: "water", message: "Less than 1 week of water available" });

  if (seasonScore === 0)
    warnings.push({ factor: "season", message: `Planting window is month ${crop.plantingWindowStart}–${crop.plantingWindowEnd}` });

  const refTemp = seasonAvgTempC ?? currentTempC;
  if (refTemp !== null && (refTemp < crop.minTempC || refTemp > crop.maxTempC))
    warnings.push({ factor: "temperature", message: `Season avg ${refTemp}°C outside ideal ${crop.minTempC}–${crop.maxTempC}°C` });

  if (seasonTotalRainfallMm !== null) {
    const tol = crop.rainfallTolerance ?? "moderate";
    if (tol === "water-loving" && seasonTotalRainfallMm < 400)
      warnings.push({ factor: "rainfall", message: `Only ~${seasonTotalRainfallMm} mm seasonal rain — this crop needs 800+ mm` });
    if (tol === "drought-tolerant" && seasonTotalRainfallMm > 800)
      warnings.push({ factor: "rainfall", message: `~${seasonTotalRainfallMm} mm seasonal rain may be too wet for this crop` });
  }

  if (avgDryWeeksPerSeason > 6 && (crop.rainfallTolerance ?? "moderate") === "water-loving")
    warnings.push({ factor: "drought", message: `Location averages ${avgDryWeeksPerSeason} dry weeks per season — risky for this crop` });

  if (avgFrostDaysPerSeason > 10)
    warnings.push({ factor: "frost", message: `Location has ~${avgFrostDaysPerSeason} frost days per season — check frost tolerance` });

  if (seasonAvgHumidityPct !== null && seasonAvgHumidityPct > 80 && (crop.rainfallTolerance ?? "moderate") === "drought-tolerant")
    warnings.push({ factor: "humidity", message: `Season avg humidity ${seasonAvgHumidityPct}% — high fungal risk for this crop` });

  return warnings;
};

// ─── Crop rotation scorer ─────────────────────────────────────────────────────
// History is an array of { cropName, endedAt }, ordered most-recent-first.
// Penalises growing same crop or same family back-to-back; rewards legume-after-non-legume.
const rotationScore = (crop, zoneHistory, cropFamilyByName) => {
  if (!zoneHistory || zoneHistory.length === 0) return 100; // no history = no penalty
  const last = zoneHistory[0];
  if (!last) return 100;

  const lastFamily    = cropFamilyByName[last.cropName] ?? "Other";
  const currentFamily = crop.cropFamily ?? "Other";

  // Same exact crop last season — strong rotation violation
  if (last.cropName === crop.name) return 20;

  // Same family — moderate rotation issue
  if (lastFamily === currentFamily) return 55;

  // Legume following non-legume — bonus (nitrogen fixation)
  if (currentFamily === "Pulse" && lastFamily !== "Pulse") return 100;

  // Different family — healthy rotation
  return 90;
};

// ─── Natural input calculator ─────────────────────────────────────────────────
// Aggregates total Jeevamrit / Beejamrit / Agniastra / mulch quantities for a crop's
// full lifecycle, scaled to the zone's acreage.
const calculateNaturalInputs = (lifecycleTemplates, zoneAcres) => {
  const inputs = {
    jeevamritLiters:  0,  // 200 L per acre per application
    beejamritLiters:  0,  // 25 L per acre per application
    agniastraLiters:  0,  // 25 L per acre per application
    mulchKg:          0,  // ~1500 kg per acre when mulching
    cowDungKg:        0,
    cowUrineLiters:   0,
    jaggeryKg:        0,
    mustardCakeKg:    0,
    applicationCount: 0,
  };

  for (const t of lifecycleTemplates) {
    const recipe = (t.recipeKey ?? t.recipe ?? "").toString();
    const taskType = (t.taskType ?? t.type ?? "").toString();

    if (recipe === "Jeevamrit") {
      inputs.jeevamritLiters += 200 * zoneAcres;
      inputs.cowDungKg       += RECIPES.Jeevamrit.cowDung.amount     * zoneAcres;
      inputs.cowUrineLiters  += RECIPES.Jeevamrit.cowUrine.amount    * zoneAcres;
      inputs.jaggeryKg       += RECIPES.Jeevamrit.jaggery.amount     * zoneAcres;
      inputs.mustardCakeKg   += RECIPES.Jeevamrit.mustardCake.amount * zoneAcres;
      inputs.applicationCount++;
    } else if (recipe === "Beejamrit") {
      inputs.beejamritLiters += 25 * zoneAcres;
      inputs.cowDungKg       += RECIPES.Beejamrit.cowDung.amount  * zoneAcres;
      inputs.cowUrineLiters  += RECIPES.Beejamrit.cowUrine.amount * zoneAcres;
      inputs.applicationCount++;
    } else if (recipe === "Agniastra") {
      inputs.agniastraLiters += 25 * zoneAcres;
      inputs.cowUrineLiters  += RECIPES.Agniastra.cowUrine.amount * zoneAcres;
      inputs.applicationCount++;
    }
    if (taskType === "mulching") {
      inputs.mulchKg += 1500 * zoneAcres;
    }
  }

  // Round all numbers
  for (const k of Object.keys(inputs)) inputs[k] = Math.round(inputs[k] * 10) / 10;
  return inputs;
};

// ─── Market demand lookup ─────────────────────────────────────────────────────
const getMarketDemandForCrop = async (cropName, district) => {
  const demands = await prisma.demand.findMany({
    where: {
      cropName,
      status: "OPEN",
      neededByDate: { gte: new Date() },
      OR: [
        { preferredDistrict: null },
        { preferredDistrict: { equals: district, mode: "insensitive" } },
      ],
    },
    select: { quantityKg: true, maxPricePerKg: true, neededByDate: true },
  });

  if (demands.length === 0) return null;

  const totalQuantityKg  = demands.reduce((s, d) => s + d.quantityKg, 0);
  const earliestDeadline = demands.reduce((min, d) => (d.neededByDate < min ? d.neededByDate : min), demands[0].neededByDate);
  const pricedDemands    = demands.filter((d) => d.maxPricePerKg);
  const avgPricePerKg    = pricedDemands.length > 0
    ? Math.round(pricedDemands.reduce((s, d) => s + d.maxPricePerKg, 0) / pricedDemands.length)
    : null;

  return {
    buyerCount:       demands.length,
    totalQuantityKg:  Math.round(totalQuantityKg),
    earliestDeadline: earliestDeadline.toISOString().split("T")[0],
    avgPricePerKg,
  };
};

// ─── Water cost warning ───────────────────────────────────────────────────────
const calculateWaterCost = (crop, zoneAcres, totalFarmWaterLiters) => {
  if (!zoneAcres) return null;
  const weeklyL  = (crop.weeklyWaterRequirementLitersPerAcre || 5000) * zoneAcres;
  const seasonWeeks = crop.seasonDurationWeeks ?? 17;
  const seasonNeed  = weeklyL * seasonWeeks;
  if (totalFarmWaterLiters >= seasonNeed) return null; // no shortfall

  const deficitTotalLiters     = seasonNeed - totalFarmWaterLiters;
  const deficitLitersPerWeek   = Math.round(deficitTotalLiters / seasonWeeks);
  const estimatedSeasonCostRupees = Math.round(deficitTotalLiters * WATER_COST_PER_LITRE);

  return {
    deficitLitersPerWeek,
    estimatedSeasonCostRupees,
    weeksOfDeficit: seasonWeeks,
  };
};

// ─── Main export ──────────────────────────────────────────────────────────────

export const getCropRecommendationsForZone = async ({ zoneId, user }) => {
  const farmerId = getFarmerIdFromUser(user);

  const zone = await prisma.zone.findFirst({
    where: { id: zoneId, farm: { farmerId } },
    include: {
      soilReport: true,
      farm: {
        select: {
          id: true,
          name: true,
          centroid: true,
          areaAcres: true,
          district: true,
          waterSources: { select: { currentLevelLiters: true } },
        },
      },
    },
  });

  if (!zone) throw new AppError("Zone not found", 404);
  if (!zone.soilReport)
    throw new AppError("Add a soil report to this zone before requesting crop recommendations.", 400);

  // Coordinates
  const centroid = zone.farm.centroid;
  const coords   = centroid?.geometry?.coordinates ?? centroid?.coordinates ?? null;
  const [lon, lat] = coords ?? [null, null];

  const totalFarmWaterLiters = zone.farm.waterSources.reduce((s, ws) => s + ws.currentLevelLiters, 0);
  const zoneAcres    = zone.areaSquareMeters / 4046.86;
  const currentMonth = new Date().getMonth() + 1;

  // Current weather
  let weather = { tempC: null, humidityPct: null, precipMmLastWeek: null, forecastRainMm: null, rainfallCategory: null };
  if (lat !== null) {
    try { weather = await getWeather(lat, lon); } catch { /* non-fatal */ }
  }

  // Seasonal climate per unique month set (cached)
  const seasonalClimateByKey = {};
  const fetchSeasonClimate = async (months) => {
    const key = [...months].sort((a, b) => a - b).join(",");
    if (!seasonalClimateByKey[key]) {
      seasonalClimateByKey[key] = lat !== null
        ? await getSeasonalClimate(lat, lon, months).catch(() => null)
        : null;
    }
    return seasonalClimateByKey[key];
  };

  const crops = await prisma.crop.findMany({
    orderBy: [{ season: "asc" }, { name: "asc" }],
  });

  // Build cropName → cropFamily map for rotation lookup
  const cropFamilyByName = Object.fromEntries(crops.map((c) => [c.name, c.cropFamily ?? "Other"]));

  // Fetch this zone's recent crop history (most recent first)
  const zoneHistory = await prisma.zoneCropHistory.findMany({
    where: { zoneId },
    orderBy: { endedAt: "desc" },
    take: 3,
  });

  // Pre-fetch lifecycle templates for all crops (one batch query)
  const allLifecycleTemplates = await prisma.cropLifecycleTemplate.findMany({});
  const templatesByCropName = allLifecycleTemplates.reduce((acc, t) => {
    if (!acc[t.cropName]) acc[t.cropName] = [];
    acc[t.cropName].push(t);
    return acc;
  }, {});

  // Pre-fetch seasonal climate for each unique season's months
  const seasonMonthsMap = {};
  for (const crop of crops) {
    const months = getSeasonMonths(crop.plantingWindowStart ?? 6, crop.seasonDurationWeeks ?? 17);
    const key = [...months].sort((a, b) => a - b).join(",");
    if (!seasonMonthsMap[crop.season]) {
      seasonMonthsMap[crop.season] = { months, key };
    }
  }
  for (const { months } of Object.values(seasonMonthsMap)) {
    await fetchSeasonClimate(months);
  }

  const rankedRecommendations = await Promise.all(crops.map(async (crop) => {
    const months = getSeasonMonths(crop.plantingWindowStart ?? 6, crop.seasonDurationWeeks ?? 17);
    const sc     = await fetchSeasonClimate(months);

    const weeksCovered = totalFarmWaterLiters && zoneAcres
      ? totalFarmWaterLiters / (zoneAcres * (crop.weeklyWaterRequirementLitersPerAcre || 5000))
      : null;

    const factors = {
      soilType:         soilTypeScore(crop, zone.soilReport.soilType),
      ph:               phScore(crop, zone.soilReport.phLevel),
      drainage:         drainageScore(crop, zone.soilReport.drainageSpeed),
      water:            waterScore(crop, zoneAcres, totalFarmWaterLiters),
      temperature:      temperatureScore(crop, weather.tempC, sc?.seasonAvgTempC ?? null),
      season:           seasonCalendarScore(crop, currentMonth),
      seasonalRainfall: seasonalRainfallScore(crop, sc?.seasonTotalRainfallMm ?? null),
      humidity:         humidityScore(crop, sc?.seasonAvgHumidityPct ?? null),
      droughtFrostRisk: droughtFrostRiskScore(crop, sc?.avgDryWeeksPerSeason ?? 0, sc?.avgFrostDaysPerSeason ?? 0),
      rotation:         rotationScore(crop, zoneHistory, cropFamilyByName),
    };

    // Natural inputs needed for full lifecycle (scaled to zone area)
    const lifecycleTemplates = templatesByCropName[crop.name] ?? [];
    const naturalInputs      = calculateNaturalInputs(lifecycleTemplates, zoneAcres);

    // Market demand for this crop in this district
    const marketDemand = await getMarketDemandForCrop(crop.name, zone.farm.district).catch(() => null);

    // Water cost warning if there's a shortfall
    const waterCostWarning = calculateWaterCost(crop, zoneAcres, totalFarmWaterLiters);

    const weightedScore = Object.entries(WEIGHTS).reduce((s, [k, w]) => s + factors[k] * (w / 100), 0);
    const bonus = rainfallBonus(crop, weather.rainfallCategory)
                + soilHealthPenalty(crop, zone.soilReport.soilHealthScore);
    const suitabilityScore = clamp(Math.round(weightedScore + bonus), 0, 100);

    return {
      crop: {
        id:                     crop.id,
        name:                   crop.name,
        scientificName:         crop.scientificName,
        suitableSoilTypes:      crop.suitableSoilTypes,
        minPh:                  crop.minPh,
        maxPh:                  crop.maxPh,
        season:                 crop.season,
        estimatedDurationMonths: crop.estimatedDurationMonths,
        preferredDrainage:      crop.preferredDrainage,
        weeklyWaterRequirementLitersPerAcre: crop.weeklyWaterRequirementLitersPerAcre,
        minTempC:               crop.minTempC,
        maxTempC:               crop.maxTempC,
        rainfallTolerance:      crop.rainfallTolerance,
        plantingWindowStart:    crop.plantingWindowStart,
        plantingWindowEnd:      crop.plantingWindowEnd,
        cropFamily:             crop.cropFamily,
        riskLevel:              crop.riskLevel,
      },
      suitabilityScore,
      factors,
      naturalInputs,
      marketDemand,
      waterCostWarning,
      warnings: buildWarnings({
        crop,
        ds:                   factors.drainage,
        weeksCovered,
        seasonScore:          factors.season,
        currentTempC:         weather.tempC,
        seasonAvgTempC:       sc?.seasonAvgTempC ?? null,
        soilType:             zone.soilReport.soilType,
        seasonTotalRainfallMm: sc?.seasonTotalRainfallMm ?? null,
        avgDryWeeksPerSeason:  sc?.avgDryWeeksPerSeason ?? 0,
        avgFrostDaysPerSeason: sc?.avgFrostDaysPerSeason ?? 0,
        seasonAvgHumidityPct:  sc?.seasonAvgHumidityPct ?? null,
        lastCropName:          zoneHistory[0]?.cropName ?? null,
        lastCropFamily:        zoneHistory[0] ? (cropFamilyByName[zoneHistory[0].cropName] ?? "Other") : null,
      }),
      reason: buildReason({
        crop,
        soilType:              zone.soilReport.soilType,
        phLevel:               zone.soilReport.phLevel,
        ds:                    factors.drainage,
        currentTempC:          weather.tempC,
        seasonAvgTempC:        sc?.seasonAvgTempC ?? null,
        weeksCovered,
        seasonScore:           factors.season,
        suitabilityScore,
        seasonTotalRainfallMm: sc?.seasonTotalRainfallMm ?? null,
      }),
    };
  }));

  // Group by season, attach per-season climate, top 3
  const seasonalClimate = {};
  for (const [seasonName, { months }] of Object.entries(seasonMonthsMap)) {
    const key = [...months].sort((a, b) => a - b).join(",");
    seasonalClimate[seasonName] = seasonalClimateByKey[key] ?? null;
  }

  const recommendationsBySeason = SEASON_ORDER.reduce((acc, s) => {
    acc[s] = rankedRecommendations
      .filter((r) => r.crop.season === s)
      .sort((a, b) => b.suitabilityScore - a.suitabilityScore)
      .slice(0, MAX_RECOMMENDATIONS_PER_SEASON);
    return acc;
  }, {});

  return {
    zone:      { id: zone.id, name: zone.name, farmId: zone.farmId, farmName: zone.farm.name },
    soilReport: {
      soilType:       zone.soilReport.soilType,
      phLevel:        zone.soilReport.phLevel,
      drainageSpeed:  zone.soilReport.drainageSpeed,
      soilHealthScore: zone.soilReport.soilHealthScore,
    },
    weather,
    seasonalClimate,
    recommendationsBySeason,
  };
};
