const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const cache = new Map();

const todayStr = () => new Date().toISOString().split("T")[0];
const daysAgo = (n) => {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};

/**
 * Current conditions + 16-day forecast from Open-Meteo forecast API.
 * Returns tempC, humidityPct, precipMmLastWeek, forecastRainMm, rainfallCategory.
 */
export const getWeather = async (lat, lon) => {
  const key = `cur_${lat.toFixed(2)}_${lon.toFixed(2)}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) return hit.data;

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m` +
    `&daily=precipitation_sum` +
    `&past_days=7&forecast_days=16&timezone=Asia%2FKolkata`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo forecast error: ${res.status}`);
  const json = await res.json();

  const tempC        = json.current?.temperature_2m ?? null;
  const humidityPct  = json.current?.relative_humidity_2m ?? null;

  const allRain  = json.daily?.precipitation_sum ?? [];
  const allDates = json.daily?.time ?? [];
  const today    = todayStr();
  const pivot    = allDates.findIndex((d) => d === today);

  const past7     = pivot >= 0 ? allRain.slice(0, pivot + 1).slice(-7) : allRain.slice(0, 7);
  const future16  = pivot >= 0 ? allRain.slice(pivot + 1) : allRain.slice(7);

  const precipMmLastWeek = Math.round(past7.reduce((s, v) => s + (v ?? 0), 0) * 10) / 10;
  const forecastRainMm   = Math.round(future16.reduce((s, v) => s + (v ?? 0), 0) * 10) / 10;

  const rainfallCategory = precipMmLastWeek > 30 ? "wet" : precipMmLastWeek >= 5 ? "moderate" : "dry";

  const data = { tempC, humidityPct, precipMmLastWeek, forecastRainMm, rainfallCategory };
  cache.set(key, { data, expiresAt: now + CACHE_TTL_MS });
  return data;
};

/**
 * ERA5 historical seasonal climate for specific months of year.
 * Fetches past 3 years of daily data, filters to target months, averages.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {number[]} months  e.g. [6,7,8,9,10] for Kharif
 * @returns {{ seasonAvgTempC, seasonTotalRainfallMm, seasonAvgHumidityPct,
 *             avgDryWeeksPerSeason, avgFrostDaysPerSeason, monthsAnalyzed }}
 */
export const getSeasonalClimate = async (lat, lon, months) => {
  if (!months || months.length === 0) return null;

  const monthsKey = [...months].sort((a, b) => a - b).join(",");
  const key = `sea_${lat.toFixed(2)}_${lon.toFixed(2)}_${monthsKey}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) return hit.data;

  const currentYear = new Date().getFullYear();
  const startDate   = `${currentYear - 3}-01-01`;
  const endDate     = daysAgo(6); // ERA5 lags ~5 days

  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
    `&start_date=${startDate}&end_date=${endDate}` +
    `&daily=temperature_2m_mean,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean` +
    `&timezone=Asia%2FKolkata`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ERA5 error: ${res.status}`);
  const json = await res.json();

  const dates     = json.daily?.time ?? [];
  const meanTemps = json.daily?.temperature_2m_mean ?? [];
  const minTemps  = json.daily?.temperature_2m_min ?? [];
  const rains     = json.daily?.precipitation_sum ?? [];
  const humids    = json.daily?.relative_humidity_2m_mean ?? [];

  const monthSet = new Set(months);
  let tempSum = 0, tempCount = 0;
  let rainSum = 0;
  let humidSum = 0, humidCount = 0;
  let frostDays = 0;
  let weekRainBuf = 0, weekDayCnt = 0, dryWeeks = 0;
  let totalDays = 0;

  for (let i = 0; i < dates.length; i++) {
    const month = parseInt(dates[i].split("-")[1], 10);
    if (!monthSet.has(month)) continue;
    totalDays++;

    if (meanTemps[i] != null) { tempSum += meanTemps[i]; tempCount++; }
    if (rains[i] != null)     { rainSum += rains[i]; weekRainBuf += rains[i]; }
    if (minTemps[i] != null && minTemps[i] < 5) frostDays++;
    if (humids[i] != null)    { humidSum += humids[i]; humidCount++; }

    weekDayCnt++;
    if (weekDayCnt === 7) {
      if (weekRainBuf < 5) dryWeeks++;
      weekRainBuf = 0;
      weekDayCnt  = 0;
    }
  }

  const YEARS = 3;
  const data = {
    seasonAvgTempC:        tempCount  > 0 ? Math.round((tempSum / tempCount) * 10) / 10 : null,
    seasonTotalRainfallMm: totalDays  > 0 ? Math.round(rainSum / YEARS)               : null,
    seasonAvgHumidityPct:  humidCount > 0 ? Math.round(humidSum / humidCount)          : null,
    avgDryWeeksPerSeason:  totalDays  > 0 ? Math.round((dryWeeks / YEARS) * 10) / 10  : 0,
    avgFrostDaysPerSeason: totalDays  > 0 ? Math.round(frostDays / YEARS)              : 0,
    monthsAnalyzed: months,
  };

  cache.set(key, { data, expiresAt: now + CACHE_TTL_MS });
  return data;
};
