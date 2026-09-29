import { useEffect, useState } from 'react';
import type { AxiosError } from 'axios';
import { Thermometer, Droplets, Wind, Calendar, Sprout, FlaskConical, AlertTriangle, RefreshCw, ShoppingCart, IndianRupee, Users, BookOpen, CheckCircle2 } from 'lucide-react';
import { getRecommendationsForZone, getCropPopularity } from '../../lib/api';
import { farmService } from '../../lib/farms';
import type { CropRecommendation, CropRecommendationResponse, WeatherContext, SeasonalClimate } from '../../types/farm';
import RecipeGuideModal from './RecipeGuideModal';

interface CropRecommendationPanelProps {
  zoneId: string;
  onCropPick?: (cropId: string, cropName: string) => void;
}

interface ApiErrorResponse {
  message?: string;
}

const SEASON_ORDER = ['Kharif', 'Rabi', 'Zaid'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const getProgressClasses = (score: number) => {
  if (score > 80) return { bar: 'bg-emerald-500', badge: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
  if (score >= 50) return { bar: 'bg-amber-400', badge: 'border-amber-200 bg-amber-50 text-amber-700' };
  return { bar: 'bg-rose-400', badge: 'border-rose-200 bg-rose-50 text-rose-700' };
};

function WeatherBanner({ weather }: { weather: WeatherContext }) {
  if (!weather) return null;

  if (weather.tempC === null) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-500">
        <Thermometer size={14} />
        <span>Live weather unavailable — temperature & rainfall factors use seasonal averages</span>
      </div>
    );
  }

  const rainLabel = weather.rainfallCategory === 'wet'
    ? 'Heavy rain'
    : weather.rainfallCategory === 'dry'
    ? 'Dry / low rain'
    : 'Moderate rain';

  return (
    <div className="flex flex-wrap gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
      <span className="flex items-center gap-1.5 font-medium">
        <Thermometer size={14} />
        {weather.tempC}°C now
      </span>
      {weather.humidityPct !== null && (
        <span className="flex items-center gap-1.5">
          <Wind size={14} />
          {weather.humidityPct}% humidity
        </span>
      )}
      <span className="flex items-center gap-1.5">
        <Droplets size={14} />
        {weather.precipMmLastWeek} mm last 7 days — {rainLabel}
      </span>
      {weather.forecastRainMm !== null && (
        <span className="flex items-center gap-1.5 text-sky-600">
          <Calendar size={14} />
          {weather.forecastRainMm} mm forecast next 16d
        </span>
      )}
      <span className="ml-auto text-xs text-sky-600">Live · Open-Meteo</span>
    </div>
  );
}

function SeasonOutlookBanner({ seasonal, season }: { seasonal: SeasonalClimate | null; season: string }) {
  if (!seasonal) return null;

  const monthRange = seasonal.monthsAnalyzed?.length
    ? `${MONTHS[(seasonal.monthsAnalyzed[0] - 1)]}–${MONTHS[(seasonal.monthsAnalyzed[seasonal.monthsAnalyzed.length - 1] - 1)]}`
    : null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600">
        {season} Outlook {monthRange ? `(${monthRange}, 3-yr avg)` : ''}
      </span>
      {seasonal.seasonAvgTempC !== null && (
        <span className="flex items-center gap-1.5">
          <Thermometer size={14} />
          {seasonal.seasonAvgTempC}°C avg
        </span>
      )}
      {seasonal.seasonTotalRainfallMm !== null && (
        <span className="flex items-center gap-1.5">
          <Droplets size={14} />
          ~{seasonal.seasonTotalRainfallMm} mm total
        </span>
      )}
      {seasonal.seasonAvgHumidityPct !== null && (
        <span className="flex items-center gap-1.5">
          <Wind size={14} />
          {seasonal.seasonAvgHumidityPct}% humidity
        </span>
      )}
      {seasonal.avgDryWeeksPerSeason > 0 && (
        <span className="flex items-center gap-1.5">
          <FlaskConical size={14} />
          {seasonal.avgDryWeeksPerSeason} dry wks
        </span>
      )}
      {seasonal.avgFrostDaysPerSeason > 0 && (
        <span className="flex items-center gap-1.5 text-emerald-700">
          ❄ {seasonal.avgFrostDaysPerSeason} frost days
        </span>
      )}
    </div>
  );
}

function FactorBar({ label, score, icon: Icon }: { label: string; score: number; icon: React.ElementType }) {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-400' : 'bg-rose-400';
  return (
    <div className="flex items-center gap-2">
      <Icon size={12} className="shrink-0 text-stone-400" />
      <span className="w-16 shrink-0 text-[10px] text-stone-500">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-stone-200">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="w-6 text-right text-[10px] font-medium text-stone-600">{score}</span>
    </div>
  );
}

function PlantingWindow({ start, end }: { start?: number; end?: number }) {
  if (!start || !end) return null;
  return (
    <span className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-medium text-stone-600">
      <Calendar size={10} />
      {MONTHS[(start - 1)]}–{MONTHS[(end - 1)]}
    </span>
  );
}

function PlainLanguageSummary({ rec }: { rec: CropRecommendation }) {
  const goodPoints: string[] = [];
  const warnPoints: string[] = [];
  const f = rec.factors;
  if (!f) return null;

  if (f.soilType >= 80)         goodPoints.push(`Your soil type works well for ${rec.crop.name}`);
  else if (f.soilType < 50)     warnPoints.push(`Soil type is not ideal — yields may be lower`);

  if (f.ph >= 80)               goodPoints.push(`Your soil's pH is in the right range`);

  if (f.water >= 75)            goodPoints.push(`You have enough water for the full season`);
  else if (f.water < 50)        warnPoints.push(`Water may run short — plan a backup`);

  if (f.temperature >= 80)      goodPoints.push(`The temperature here suits this crop`);

  if (f.seasonalRainfall >= 75) goodPoints.push(`Your district usually gets the right amount of rain`);
  else if (f.seasonalRainfall < 50) warnPoints.push(`Rainfall may not match this crop's needs`);

  if (f.rotation >= 90)         goodPoints.push(`Good rotation — different from last season's crop`);
  else if (f.rotation <= 25)    warnPoints.push(`You grew this last season — consider rotating`);

  if (goodPoints.length === 0 && warnPoints.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5 rounded-2xl bg-white px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Why this works (or doesn't)</p>
      {goodPoints.slice(0, 3).map((p, i) => (
        <div key={`g${i}`} className="flex items-start gap-1.5 text-[11px] leading-5 text-emerald-800">
          <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-emerald-600" />
          <span>{p}</span>
        </div>
      ))}
      {warnPoints.slice(0, 2).map((p, i) => (
        <div key={`w${i}`} className="flex items-start gap-1.5 text-[11px] leading-5 text-amber-800">
          <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-600" />
          <span>{p}</span>
        </div>
      ))}
    </div>
  );
}

function RecommendationCard({ recommendation, soilType, phLevel, onPick, popularityCount, onShowRecipe }: {
  recommendation: CropRecommendation;
  soilType: string;
  phLevel: number;
  onPick?: (cropId: string, cropName: string) => void;
  popularityCount?: number;
  onShowRecipe?: (key: string) => void;
}) {
  const progressClasses = getProgressClasses(recommendation.suitabilityScore);
  const { factors, warnings = [], naturalInputs, marketDemand, waterCostWarning } = recommendation;
  const riskLevel = recommendation.crop.riskLevel;
  const riskClasses =
    riskLevel === 'beginner'     ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
    riskLevel === 'expert'       ? 'bg-rose-100 text-rose-800 border-rose-200' :
                                   'bg-amber-100 text-amber-800 border-amber-200';

  // simple match label (beginner-friendly alternative to score%)
  const matchLabel = recommendation.suitabilityScore >= 75 ? 'Best Match'
                   : recommendation.suitabilityScore >= 55 ? 'Good Match'
                   : recommendation.suitabilityScore >= 35 ? 'Moderate Match'
                                                            : 'Risky';

  return (
    <article className="rounded-3xl border border-stone-200 bg-stone-50 p-4 shadow-sm transition hover:border-stone-300 hover:bg-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            {recommendation.crop.season}
          </p>
          <h4 className="mt-1.5 text-lg font-semibold text-stone-900">{recommendation.crop.name}</h4>
          <p className="text-xs text-stone-400 italic">{recommendation.crop.scientificName || ''}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${progressClasses.badge}`}>
            {recommendation.suitabilityScore}%
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">{matchLabel}</span>
        </div>
      </div>

      <div className="mt-3 h-2 rounded-full bg-stone-200">
        <div className={`h-2 rounded-full ${progressClasses.bar}`} style={{ width: `${recommendation.suitabilityScore}%` }} />
      </div>

      {factors && (
        <div className="mt-3 space-y-1">
          <FactorBar label="Soil" score={factors.soilType} icon={Sprout} />
          <FactorBar label="pH" score={factors.ph} icon={FlaskConical} />
          <FactorBar label="Drainage" score={factors.drainage} icon={Wind} />
          <FactorBar label="Water" score={factors.water} icon={Droplets} />
          <FactorBar label="Temp" score={factors.temperature} icon={Thermometer} />
          <FactorBar label="Season" score={factors.season} icon={Calendar} />
          <FactorBar label="Rain fit" score={factors.seasonalRainfall} icon={Droplets} />
          <FactorBar label="Humidity" score={factors.humidity} icon={Wind} />
          <FactorBar label="Dry/Frost" score={factors.droughtFrostRisk} icon={FlaskConical} />
          <FactorBar label="Rotation" score={factors.rotation} icon={RefreshCw} />
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-medium text-stone-600">
          {soilType} soil · pH {phLevel.toFixed(1)}
        </span>
        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-medium text-stone-600">
          {recommendation.crop.estimatedDurationMonths} months
        </span>
        <PlantingWindow
          start={recommendation.crop.plantingWindowStart}
          end={recommendation.crop.plantingWindowEnd}
        />
        {recommendation.crop.rainfallTolerance && (
          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-medium text-stone-600">
            {recommendation.crop.rainfallTolerance}
          </span>
        )}
        {riskLevel && (
          <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold capitalize ${riskClasses}`}>
            {riskLevel}
          </span>
        )}
        {popularityCount && popularityCount > 0 && (
          <span className="flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
            <Users size={10} />
            {popularityCount} farmer{popularityCount > 1 ? 's' : ''} nearby
          </span>
        )}
      </div>

      <PlainLanguageSummary rec={recommendation} />

      {marketDemand && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
          <ShoppingCart size={14} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">{marketDemand.buyerCount} buyer{marketDemand.buyerCount > 1 ? 's' : ''} looking for {recommendation.crop.name}</p>
            <p className="text-emerald-700">
              {marketDemand.totalQuantityKg.toLocaleString()} kg needed by {marketDemand.earliestDeadline}
              {marketDemand.avgPricePerKg ? ` · ~₹${marketDemand.avgPricePerKg}/kg` : ''}
            </p>
          </div>
        </div>
      )}

      {waterCostWarning && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          <IndianRupee size={14} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Water shortfall — supplemental water needed</p>
            <p className="text-amber-700">
              ~{waterCostWarning.deficitLitersPerWeek.toLocaleString()} L/week deficit · est. ₹{waterCostWarning.estimatedSeasonCostRupees.toLocaleString()} for the {waterCostWarning.weeksOfDeficit}-week season
            </p>
          </div>
        </div>
      )}

      {naturalInputs && naturalInputs.applicationCount > 0 && (
        <details className="mt-3 group rounded-2xl border border-stone-200 bg-white px-3 py-2 text-[11px] text-stone-600">
          <summary className="cursor-pointer font-semibold text-stone-700 list-none flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sprout size={14} className="text-emerald-600" />
              Natural inputs needed (full season)
            </span>
            <span className="text-stone-400 group-open:rotate-180 transition">▼</span>
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
            {naturalInputs.jeevamritLiters > 0 && <span><strong>Jeevamrit:</strong> {naturalInputs.jeevamritLiters} L</span>}
            {naturalInputs.beejamritLiters > 0 && <span><strong>Beejamrit:</strong> {naturalInputs.beejamritLiters} L</span>}
            {naturalInputs.agniastraLiters > 0 && <span><strong>Agniastra:</strong> {naturalInputs.agniastraLiters} L</span>}
            {naturalInputs.mulchKg > 0         && <span><strong>Mulch:</strong> {naturalInputs.mulchKg} kg</span>}
            {naturalInputs.cowDungKg > 0       && <span><strong>Cow Dung:</strong> {naturalInputs.cowDungKg} kg</span>}
            {naturalInputs.cowUrineLiters > 0  && <span><strong>Cow Urine:</strong> {naturalInputs.cowUrineLiters} L</span>}
            {naturalInputs.jaggeryKg > 0       && <span><strong>Jaggery:</strong> {naturalInputs.jaggeryKg} kg</span>}
            {naturalInputs.mustardCakeKg > 0   && <span><strong>Mustard Cake:</strong> {naturalInputs.mustardCakeKg} kg</span>}
            <span className="col-span-2 text-stone-500 mt-1">
              {naturalInputs.applicationCount} applications across the {recommendation.crop.estimatedDurationMonths}-month cycle
            </span>
          </div>
          {onShowRecipe && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {naturalInputs.jeevamritLiters > 0 && (
                <button onClick={(e) => { e.preventDefault(); onShowRecipe('Jeevamrit'); }} className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-200">
                  <BookOpen size={10} /> How to make Jeevamrit
                </button>
              )}
              {naturalInputs.beejamritLiters > 0 && (
                <button onClick={(e) => { e.preventDefault(); onShowRecipe('Beejamrit'); }} className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-200">
                  <BookOpen size={10} /> How to make Beejamrit
                </button>
              )}
              {naturalInputs.agniastraLiters > 0 && (
                <button onClick={(e) => { e.preventDefault(); onShowRecipe('Agniastra'); }} className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-200">
                  <BookOpen size={10} /> How to make Agniastra
                </button>
              )}
            </div>
          )}
        </details>
      )}

      {warnings.length > 0 && (
        <div className="mt-3 space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-2 py-1.5 text-[10px] text-amber-700">
              <AlertTriangle size={10} className="mt-0.5 shrink-0" />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs leading-5 text-stone-600">{recommendation.reason}</p>

      {onPick && (
        <button
          type="button"
          onClick={() => onPick(recommendation.crop.id, recommendation.crop.name)}
          className="mt-4 flex w-full items-center justify-center rounded-2xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 active:scale-[0.98]"
        >
          Plant this crop
        </button>
      )}
    </article>
  );
}

const RecommendationSkeleton = () => (
  <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="h-4 w-40 animate-pulse rounded-full bg-stone-200" />
    <div className="mt-5 grid gap-4 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
          <div className="h-4 w-24 animate-pulse rounded-full bg-stone-200" />
          <div className="mt-4 h-6 w-32 animate-pulse rounded-full bg-stone-200" />
          <div className="mt-4 h-2 w-full animate-pulse rounded-full bg-stone-200" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 10 }).map((_, j) => (
              <div key={j} className="h-2 w-full animate-pulse rounded-full bg-stone-200" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function CropRecommendationPanel({ zoneId, onCropPick }: CropRecommendationPanelProps) {
  const [data, setData] = useState<CropRecommendationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [emptyMessage, setEmptyMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [popularity, setPopularity] = useState<Record<string, number>>({});
  const [recipeModal, setRecipeModal] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage('');
      setEmptyMessage('');
      try {
        const res = await getRecommendationsForZone(zoneId);
        if (mounted) setData(res);
      } catch (error) {
        if (!mounted) return;
        const apiError = error as AxiosError<ApiErrorResponse>;
        const status = apiError.response?.status;
        const message = apiError.response?.data?.message;
        if (status === 400) {
          setEmptyMessage(message || 'Add a Soil Report to unlock Crop Recommendations');
          setData(null);
        } else {
          setErrorMessage(message || 'Could not load crop recommendations right now.');
          setData(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [zoneId]);

  // Fetch district crop popularity for social proof
  useEffect(() => {
    if (!data?.zone?.farmId) return;
    let alive = true;
    (async () => {
      try {
        const farms = await farmService.getFarms();
        const farm  = farms.find((f) => f.id === data.zone.farmId);
        if (!farm?.district) return;
        const popList = await getCropPopularity(farm.district);
        if (alive) {
          const map: Record<string, number> = {};
          for (const p of popList) map[p.cropName] = p.farmerCount;
          setPopularity(map);
        }
      } catch { /* non-fatal */ }
    })();
    return () => { alive = false; };
  }, [data?.zone?.farmId]);

  if (isLoading) return <RecommendationSkeleton />;

  if (emptyMessage) {
    return (
      <section className="rounded-[28px] border border-dashed border-emerald-300 bg-emerald-50/60 p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Crop Recommendations</p>
        <h3 className="mt-3 text-xl font-semibold text-stone-900">Add a Soil Report to unlock Crop Recommendations</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{emptyMessage}</p>
      </section>
    );
  }

  if (errorMessage || !data) {
    return (
      <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-700">Crop Recommendations</p>
        <p className="mt-3 text-sm text-stone-600">{errorMessage || 'Could not load crop recommendations right now.'}</p>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Crop Recommendations</p>
          <h3 className="mt-2 text-2xl font-semibold text-stone-900">Best-fit crops for {data.zone.name}</h3>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            Ranked using 10 factors including 3-year historical climate, crop rotation, market demand, and natural-input planning — fully chemical-free.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm font-medium text-stone-600">
          <span className="rounded-full bg-stone-100 px-3 py-2">Soil: {data.soilReport.soilType}</span>
          <span className="rounded-full bg-stone-100 px-3 py-2">pH: {data.soilReport.phLevel.toFixed(1)}</span>
          <span className="rounded-full bg-stone-100 px-3 py-2">Health: {data.soilReport.soilHealthScore}/100</span>
        </div>
      </div>

      {data.weather && (
        <div className="mt-4">
          <WeatherBanner weather={data.weather} />
        </div>
      )}

      <div className="mt-6 space-y-6">
        {SEASON_ORDER.map((season) => {
          const seasonRecs = data.recommendationsBySeason[season] ?? [];
          const seasonal = data.seasonalClimate?.[season] ?? null;
          return (
            <div key={season}>
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-lg font-semibold text-stone-900">{season}</h4>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                  {seasonRecs.length} options
                </span>
              </div>

              <SeasonOutlookBanner seasonal={seasonal} season={season} />

              {seasonRecs.length ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  {seasonRecs.map((rec) => (
                    <RecommendationCard
                      key={`${season}-${rec.crop.id}`}
                      recommendation={rec}
                      soilType={data.soilReport.soilType}
                      phLevel={data.soilReport.phLevel}
                      onPick={onCropPick}
                      popularityCount={popularity[rec.crop.name]}
                      onShowRecipe={(key) => setRecipeModal(key)}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-3xl border border-dashed border-stone-200 bg-stone-50 p-4 text-sm text-stone-500">
                  No strong {season} crop matches found for the current soil profile.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {recipeModal && (
        <RecipeGuideModal recipeKey={recipeModal} acres={1} onClose={() => setRecipeModal(null)} />
      )}
    </section>
  );
}
