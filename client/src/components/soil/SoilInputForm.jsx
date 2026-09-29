import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Minus, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { soilService } from '../../lib/soil';

const SOIL_OPTIONS = [
  {
    value: 'Kanhar',
    label: 'Kanhar',
    description: 'Black Soil',
    waterHolding: 'Very High',
    circleClassName: 'bg-gray-900',
  },
  {
    value: 'Matasi',
    label: 'Matasi',
    description: 'Red & Yellow Soil',
    waterHolding: 'Low',
    circleClassName: 'bg-yellow-300',
  },
  {
    value: 'Dorsa',
    label: 'Dorsa',
    description: 'Medium Brown Soil',
    waterHolding: 'Moderate',
    circleClassName: 'bg-amber-700',
  },
  {
    value: 'Bhata',
    label: 'Bhata',
    description: 'Laterite Soil',
    waterHolding: 'Poor',
    circleClassName: 'bg-red-600',
  },
];

const DRAINAGE_OPTIONS = [
  {
    value: 'Fast',
    title: 'Fast',
    subtitle: 'Drains in 1-2 min',
    detail: 'sandy soil',
  },
  {
    value: 'Balanced',
    title: 'Balanced',
    subtitle: 'Drains in 3-5 min',
    detail: 'loamy soil',
  },
  {
    value: 'Slow',
    title: 'Slow',
    subtitle: 'Takes 10+ min',
    detail: 'clay soil',
  },
];

const getPhMessage = (phLevel) => {
  if (phLevel < 5.5) {
    return 'Acidic - crops may struggle';
  }

  if (phLevel < 6) {
    return 'Slightly acidic';
  }

  if (phLevel <= 7) {
    return 'Ideal - best for most crops';
  }

  if (phLevel <= 7.5) {
    return 'Slightly alkaline';
  }

  return 'Alkaline - needs treatment';
};

const getEarthwormMessage = (earthwormCount) => {
  if (earthwormCount <= 0) {
    return 'Poor biological health';
  }

  if (earthwormCount <= 3) {
    return 'Fair - typical for most farms';
  }

  if (earthwormCount <= 7) {
    return 'Good - healthy soil biology';
  }

  return 'Excellent - very healthy soil';
};

export default function SoilInputForm({
  zoneId,
  farmId,
  zoneName,
  zoneAreaBigha,
  existingReport,
  onSaved,
}) {
  const [soilType, setSoilType] = useState(existingReport?.soilType ?? '');
  const [drainageSpeed, setDrainageSpeed] = useState(existingReport?.drainageSpeed ?? '');
  const [phLevel, setPhLevel] = useState(existingReport?.phLevel ?? 6.5);
  const [earthwormCount, setEarthwormCount] = useState(existingReport?.earthwormCount ?? 3);
  const [showOptional, setShowOptional] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [districtDefaults, setDistrictDefaults] = useState(null);

  // Fetch district averages for smart defaults
  useEffect(() => {
    if (existingReport) return;
    (async () => {
      try {
        const { farmService } = await import('../../lib/farms');
        const farm = await farmService.getFarmById(farmId);
        if (!farm?.district) return;
        const api = (await import('../../lib/api')).default;
        const res = await api.get(`/farmer/district-defaults/${encodeURIComponent(farm.district)}`);
        if (res.data?.data) setDistrictDefaults(res.data.data);
      } catch { /* non-fatal */ }
    })();
  }, [farmId, existingReport]);

  const applyDistrictDefaults = () => {
    if (!districtDefaults) return;
    setSoilType(districtDefaults.soilType ?? soilType);
    setDrainageSpeed(districtDefaults.drainageSpeed ?? drainageSpeed);
    setPhLevel(districtDefaults.phLevel ?? phLevel);
    setEarthwormCount(districtDefaults.earthwormCount ?? earthwormCount);
  };

  useEffect(() => {
    setSoilType(existingReport?.soilType ?? '');
    setDrainageSpeed(existingReport?.drainageSpeed ?? '');
    setPhLevel(existingReport?.phLevel ?? 6.5);
    setEarthwormCount(existingReport?.earthwormCount ?? 3);
    setShowOptional(false);
  }, [existingReport, zoneId]);

  const isSubmitDisabled = !soilType || !drainageSpeed || isSaving;
  const submitLabel = existingReport ? 'Update Soil Report' : 'Save Soil Report';

  const payload = useMemo(
    () => ({
      soilType,
      drainageSpeed,
      phLevel,
      earthwormCount,
    }),
    [drainageSpeed, earthwormCount, phLevel, soilType]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!soilType || !drainageSpeed) {
      return;
    }

    setIsSaving(true);
    try {
      await soilService.saveSoilReport(farmId, zoneId, payload);
      toast.success('Soil report saved successfully.');
      onSaved?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save the soil report.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 overflow-hidden rounded-[28px] border border-emerald-200 bg-white shadow-sm"
    >
      <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-4 sm:px-6">
        <h3 className="text-xl font-bold text-stone-900">{zoneName}</h3>
        <p className="mt-1 text-sm text-stone-600">
          {zoneAreaBigha.toFixed(2)} Bigha zone
        </p>
      </div>

      <div className="max-h-[80vh] space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
        {districtDefaults && !existingReport && (
          <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <span className="text-2xl">💡</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-900">Don't know your soil values?</p>
              <p className="mt-0.5 text-xs text-blue-700">{districtDefaults.note}. Use these as a starting point.</p>
              <button
                type="button"
                onClick={applyDistrictDefaults}
                className="mt-2 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                Use district averages
              </button>
            </div>
          </div>
        )}
        <section className="space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Soil Information
            </p>
            <h4 className="mt-2 text-xl font-bold text-stone-900">
              Fill these 2 fields to get crop recommendations
            </h4>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-base font-semibold text-stone-900">
                What type of soil does this zone have?
              </label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SOIL_OPTIONS.map((option) => {
                const isSelected = soilType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSoilType(option.value)}
                    className={`min-h-[110px] rounded-3xl px-4 py-4 text-left transition ${
                      isSelected
                        ? 'ring-2 ring-green-500 bg-green-50'
                        : 'border border-gray-200 bg-white'
                    }`}
                  >
                    <div className={`h-[60px] w-[60px] rounded-full ${option.circleClassName}`} />
                    <p className="mt-3 text-lg font-bold text-stone-900">{option.label}</p>
                    <p className="text-sm text-stone-600">{option.description}</p>
                    <span className="mt-3 inline-flex rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                      Water holding: {option.waterHolding}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-base font-semibold text-stone-900">
                How fast does water drain from this zone&apos;s soil?
              </label>
              <p className="mt-1 text-sm text-stone-500">Pour water on soil and observe</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {DRAINAGE_OPTIONS.map((option) => {
                const isSelected = drainageSpeed === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDrainageSpeed(option.value)}
                    className={`min-h-16 rounded-2xl px-4 py-3 text-left transition ${
                      isSelected
                        ? 'border-2 border-green-500 bg-green-100 text-green-800'
                        : 'border border-gray-300 bg-white text-stone-700'
                    }`}
                  >
                    <p className="text-base font-semibold">{option.title}</p>
                    <p className="text-sm">{option.subtitle}</p>
                    <p className="text-xs opacity-80">{option.detail}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
          <button
            type="button"
            onClick={() => setShowOptional((current) => !current)}
            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-left text-base font-semibold text-stone-900"
          >
            <span>Add more details (optional)</span>
            {showOptional ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          <p className="mt-3 text-sm text-stone-500">
            Even without these, you&apos;ll get good crop recommendations. Fill these later for more
            accurate results.
          </p>

          {showOptional ? (
            <div className="mt-5 space-y-6">
              <div>
                <label className="text-base font-semibold text-stone-900">Soil pH Level</label>
                <p className="mt-1 text-sm text-stone-500">Use a pH test strip if available</p>
                <div className="mt-4 rounded-3xl bg-white p-4">
                  <input
                    type="range"
                    min="0"
                    max="14"
                    step="0.5"
                    value={phLevel}
                    onChange={(event) => setPhLevel(Number(event.target.value))}
                    className="h-12 w-full accent-green-600"
                  />
                  <div
                    className="mt-3 h-3 w-full rounded-full"
                    style={{
                      background:
                        'linear-gradient(90deg, #dc2626 0%, #f97316 35%, #22c55e 46%, #22c55e 54%, #3b82f6 70%, #7e22ce 100%)',
                    }}
                  />
                  <p className="mt-3 text-base font-semibold text-stone-900">
                    pH {phLevel.toFixed(1)} - {getPhMessage(phLevel)}
                  </p>
                  <p className="mt-2 text-sm text-stone-500">
                    No pH strip? Leave at 6.5 - it&apos;s the best estimate for most CG soil
                  </p>
                </div>
              </div>

              <div>
                <label className="text-base font-semibold text-stone-900">Earthworm count</label>
                <p className="mt-1 text-sm text-stone-500">
                  Dig a 1 ft x 1 ft patch and count worms
                </p>
                <div className="mt-4 rounded-3xl bg-white p-4">
                  <div className="flex items-center justify-center gap-4">
                    <button
                      type="button"
                      onClick={() => setEarthwormCount((count) => Math.max(0, count - 1))}
                      className="flex min-h-12 min-w-12 items-center justify-center rounded-2xl border border-stone-300 bg-stone-50 text-stone-900"
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                    <div className="min-w-24 text-center">
                      <p className="text-3xl font-bold text-stone-900">{earthwormCount}</p>
                      <p className="text-sm text-stone-500">worms</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEarthwormCount((count) => Math.min(20, count + 1))}
                      className="flex min-h-12 min-w-12 items-center justify-center rounded-2xl border border-stone-300 bg-stone-50 text-stone-900"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="mt-3 text-center text-sm font-medium text-stone-700">
                    {getEarthwormMessage(earthwormCount)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <div className="border-t border-stone-100 px-5 py-4 sm:px-6">
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className={`flex min-h-[52px] w-full items-center justify-center rounded-2xl px-4 text-base font-semibold text-white transition ${
            isSubmitDisabled ? 'bg-stone-300' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : submitLabel}
        </button>
      </div>
    </form>
  );
}
