import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Leaf, FlaskConical, BarChart3, CheckCircle2, Circle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import SoilInputForm from './SoilInputForm';
import SoilReportCard from './SoilReportCard';
import { soilService } from '../../lib/soil';
import CropRecommendationPanel from '../farm/CropRecommendationPanel';
import NaturalInputCalculator from '../farm/NaturalInputCalculator';
import FinancialEstimator from '../farm/FinancialEstimator';
import PhotoJournal from '../farm/PhotoJournal';
import CompanionSuggestions from '../farm/CompanionSuggestions';
import HarvestRecordModal from '../farm/HarvestRecordModal';
import {
  SoilTrendChart, YearComparisonChart, CoverCropSuggestions,
  BorderCropSuggestions, VarietyPicker, DroughtBanner,
  DailyCheckInWidget, SeedRateBadge, SuccessiveSowingPlanner,
} from '../farm/IntelligenceWidgets';
import { Sprout as SproutIcon, TrendingUp, FlaskConical as FlaskIcon, Camera } from 'lucide-react';
import { assignCropToZoneByName, saveVarietyToAssignment } from '../../lib/api';

const SECTION_TABS = [
  { key: 'soil',    label: 'Soil Report',        icon: FlaskConical },
  { key: 'crops',   label: 'Crop Recommendations', icon: Leaf },
  { key: 'tools',   label: 'Inputs & Financials', icon: BarChart3 },
];

const getScoreColor = (score) => {
  if (score >= 75) return 'text-green-700 border-green-300 bg-green-50';
  if (score >= 50) return 'text-yellow-700 border-yellow-300 bg-yellow-50';
  if (score >= 25) return 'text-orange-700 border-orange-300 bg-orange-50';
  return 'text-red-700 border-red-300 bg-red-50';
};

export default function SoilDashboard({ farmId }) {
  const navigate = useNavigate();
  const [summary, setSummary]         = useState(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState('');
  const [activeZoneId, setActiveZoneId] = useState(null);
  const [sectionTab, setSectionTab]   = useState('soil');
  const [editingZoneId, setEditingZoneId] = useState(null);
  const [harvestZone, setHarvestZone] = useState(null);

  const loadSummary = async () => {
    setIsLoading(true);
    setError('');
    try {
      const next = await soilService.getSoilSummary(farmId);
      setSummary(next);
      // Auto-select first zone
      if (next?.zones?.length && !activeZoneId) {
        setActiveZoneId(next.zones[0].zoneId);
      }
    } catch (err) {
      setError('Could not load soil data. Please try again.');
      toast.error(err.response?.data?.message || 'Could not load soil data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadSummary(); }, [farmId]);

  const handleSaved = async () => {
    setEditingZoneId(null);
    await loadSummary();
    setSectionTab('crops');
  };

  const handleCropPick = async (zoneId, _cropId, cropName) => {
    try {
      await assignCropToZoneByName(zoneId, cropName);
      toast.success(`${cropName} assigned! Opening Farm Planner…`);
      navigate(`/dashboard/farm/${farmId}/plan`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not assign crop.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-[28px] border border-stone-200 bg-white text-stone-600">
        <Loader2 className="h-8 w-8 animate-spin text-green-700" />
        <p className="mt-3 text-sm font-medium">Loading zone data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[28px] border border-stone-200 bg-white p-8 text-center">
        <p className="text-base text-stone-700">{error}</p>
        <button type="button" onClick={loadSummary}
          className="mt-4 mx-auto flex min-h-12 w-full max-w-56 items-center justify-center rounded-2xl bg-green-600 px-4 text-base font-semibold text-white">
          Retry
        </button>
      </div>
    );
  }

  if (!summary) return null;

  const activeZone = summary.zones.find((z) => z.zoneId === activeZoneId) ?? summary.zones[0];

  return (
    <div className="space-y-4">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => navigate(`/dashboard/farm/${farmId}`)}
          className="flex min-h-10 items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm hover:bg-stone-50">
          <ArrowLeft className="h-4 w-4" />
          Back to Farm
        </button>

        {/* Farm-level score pill */}
        {summary.filledCount > 0 && summary.overallScore !== null && (
          <div className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${getScoreColor(summary.overallScore)}`}>
            Farm Soil Score: {summary.overallScore.toFixed(0)}
            <span className="text-xs font-normal opacity-70">({summary.filledCount}/{summary.totalZones} zones)</span>
          </div>
        )}
      </div>

      {/* ── Zone pill tabs ── */}
      <div className="rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Select Zone</p>
        <div className="flex flex-wrap gap-2">
          {summary.zones.map((zone, idx) => {
            const isActive = zone.zoneId === activeZone?.zoneId;
            const hasReport = !!zone.soilReport;
            return (
              <button
                key={zone.zoneId}
                type="button"
                onClick={() => { setActiveZoneId(zone.zoneId); setEditingZoneId(null); setSectionTab('soil'); }}
                className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? 'border-green-600 bg-green-600 text-white shadow'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                {hasReport
                  ? <CheckCircle2 className={`h-4 w-4 ${isActive ? 'text-green-200' : 'text-green-500'}`} />
                  : <Circle className={`h-4 w-4 ${isActive ? 'text-green-200' : 'text-stone-400'}`} />
                }
                Zone {idx + 1}
                <span className={`text-xs ${isActive ? 'text-green-200' : 'text-stone-400'}`}>
                  {zone.zoneAreaBigha.toFixed(1)} B
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeZone && (
        <>
          {/* ── Zone header ── */}
          <div className="rounded-[28px] border border-stone-200 bg-white px-5 py-4 shadow-sm sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-stone-900">{activeZone.zoneName}</h2>
                <p className="text-sm text-stone-500">{activeZone.zoneAreaBigha.toFixed(2)} Bigha · {(activeZone.zoneAreaBigha * 0.333).toFixed(2)} Acres</p>
              </div>
              {activeZone.soilReport && (
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 text-lg font-bold ${getScoreColor(activeZone.soilReport.soilHealthScore)}`}>
                  {Math.round(activeZone.soilReport.soilHealthScore)}
                </div>
              )}
            </div>

            {/* Section tabs */}
            <div className="mt-4 flex gap-1 rounded-2xl bg-stone-100 p-1">
              {SECTION_TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setSectionTab(key); setEditingZoneId(null); }}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                    sectionTab === key
                      ? 'bg-white text-green-700 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Section: Soil Report ── */}
          {sectionTab === 'soil' && (
            <div className="space-y-4">
              {activeZone.soilReport ? (
                <>
                  <SoilReportCard
                    report={activeZone.soilReport}
                    zoneName={activeZone.zoneName}
                    onEdit={() => setEditingZoneId(editingZoneId === activeZone.zoneId ? null : activeZone.zoneId)}
                  />
                  {editingZoneId === activeZone.zoneId && (
                    <SoilInputForm
                      zoneId={activeZone.zoneId}
                      farmId={farmId}
                      zoneName={activeZone.zoneName}
                      zoneAreaBigha={activeZone.zoneAreaBigha}
                      existingReport={activeZone.soilReport}
                      onSaved={handleSaved}
                    />
                  )}
                  <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
                    <p className="font-semibold">Soil report saved ✓</p>
                    <p className="mt-1 text-emerald-700">Switch to <strong>Crop Recommendations</strong> to see AI-ranked crops for this zone based on soil, weather, temperature, drainage, and water availability.</p>
                    <button type="button" onClick={() => setSectionTab('crops')}
                      className="mt-3 flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                      <Leaf className="h-4 w-4" />
                      View Crop Recommendations
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-[28px] border border-dashed border-stone-300 bg-white p-6 text-center">
                    <FlaskConical className="mx-auto h-10 w-10 text-stone-300" />
                    <h3 className="mt-3 text-lg font-semibold text-stone-800">No soil report yet</h3>
                    <p className="mt-1 text-sm text-stone-500">Fill in the soil details to unlock 6-factor crop recommendations for this zone.</p>
                  </div>
                  <SoilInputForm
                    zoneId={activeZone.zoneId}
                    farmId={farmId}
                    zoneName={activeZone.zoneName}
                    zoneAreaBigha={activeZone.zoneAreaBigha}
                    existingReport={null}
                    onSaved={handleSaved}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Section: Crop Recommendations ── */}
          {sectionTab === 'crops' && (
            <CropRecommendationPanel
              zoneId={activeZone.zoneId}
              onCropPick={(cropId, cropName) => handleCropPick(activeZone.zoneId, cropId, cropName)}
            />
          )}

          {/* ── Section: Tools ── */}
          {sectionTab === 'tools' && (
            <ToolsSection zone={activeZone} onHarvestOpen={(c) => setHarvestZone({ zoneId: activeZone.zoneId, cropName: c })} />
          )}
        </>
      )}

      {harvestZone && (
        <HarvestRecordModal
          zoneId={harvestZone.zoneId}
          cropName={harvestZone.cropName}
          onClose={() => setHarvestZone(null)}
          onSaved={loadSummary}
        />
      )}
    </div>
  );
}

const CROPS = [
  'Rice','Wheat','Cotton','Gram','Maize','Millets',
  'Groundnut','Pulses','Vegetables','Tuber crops',
  'Moong','Soybean','Tur/Arhar','Urad',
];

const TOOLS_TABS = [
  { key: 'crop',      label: 'Crop Setup',     icon: SproutIcon },
  { key: 'analytics', label: 'Analytics',      icon: TrendingUp },
  { key: 'inputs',    label: 'Inputs & Cost',  icon: FlaskIcon  },
  { key: 'photos',    label: 'Photo Journal',  icon: Camera     },
];

function ToolsSection({ zone, onHarvestOpen }) {
  const [crop, setCrop]               = useState('');
  const [pickedVariety, setPickedVariety] = useState('');
  const [toolsTab, setToolsTab]       = useState('crop');

  const handlePickVariety = async (varietyName) => {
    try {
      await saveVarietyToAssignment(zone.zoneId, varietyName);
      setPickedVariety(varietyName);
      toast.success(`Variety "${varietyName}" saved to this zone`);
    } catch {
      toast.error('Could not save variety');
    }
  };

  return (
    <div className="space-y-4">

      {/* ── Sub-tab bar ── */}
      <div className="flex gap-1 rounded-2xl bg-stone-100 p-1">
        {TOOLS_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setToolsTab(key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition sm:text-sm ${
              toolsTab === key
                ? 'bg-white text-green-700 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* ── Crop Setup tab ── */}
      {toolsTab === 'crop' && (
        <div className="space-y-4">
          {/* Crop selector card */}
          <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Step 1 — Choose crop</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <select
                value={crop}
                onChange={(e) => { setCrop(e.target.value); setPickedVariety(''); }}
                className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select crop for this zone…</option>
                {CROPS.map((c) => <option key={c}>{c}</option>)}
              </select>
              {crop && (
                <button
                  onClick={() => onHarvestOpen(crop)}
                  className="flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-600"
                >
                  🌾 Record harvest
                </button>
              )}
            </div>
            {pickedVariety && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                ✓ Saved variety: {pickedVariety}
              </div>
            )}
          </div>

          {/* Crop-dependent info */}
          {crop ? (
            <div className="space-y-4">
              <SeedRateBadgeWrapper crop={crop} zone={zone} />

              {/* Companion + border in a 2-col grid on wider screens */}
              <div className="grid gap-4 lg:grid-cols-2">
                <CompanionSuggestions cropName={crop} />
                <BorderCropSuggestions cropName={crop} />
              </div>

              <VarietyPicker cropName={crop} onPick={handlePickVariety} />
              <CoverCropSuggestions afterSeason={inferSeason(crop)} />
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
              <SproutIcon className="mx-auto h-10 w-10 text-stone-300" />
              <p className="mt-3 text-sm font-semibold text-stone-500">Select a crop above</p>
              <p className="mt-1 text-xs text-stone-400">
                You'll see companion planting, border crops, recommended varieties, and cover crop suggestions.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Analytics tab ── */}
      {toolsTab === 'analytics' && (
        <div className="space-y-4">
          <SoilTrendChart zoneId={zone.zoneId} />
          <YearComparisonChart zoneId={zone.zoneId} />
          <DailyCheckInWidget zoneId={zone.zoneId} />
          <SuccessiveSowingPlanner zoneId={zone.zoneId} />
        </div>
      )}

      {/* ── Inputs & Cost tab ── */}
      {toolsTab === 'inputs' && (
        <div className="space-y-4">
          <NaturalInputCalculator zoneId={zone.zoneId} />
          <FinancialEstimator zoneId={zone.zoneId} />
        </div>
      )}

      {/* ── Photo Journal tab ── */}
      {toolsTab === 'photos' && (
        <PhotoJournal zoneId={zone.zoneId} />
      )}

    </div>
  );
}

function inferSeason(crop) {
  const map = {
    Rice: 'Kharif', Cotton: 'Kharif', Maize: 'Kharif', Millets: 'Kharif',
    Groundnut: 'Kharif', Moong: 'Kharif', Soybean: 'Kharif', 'Tur/Arhar': 'Kharif', Urad: 'Kharif',
    Wheat: 'Rabi', Gram: 'Rabi', Pulses: 'Rabi', 'Tuber crops': 'Rabi',
    Vegetables: 'Zaid',
  };
  return map[crop] ?? 'Kharif';
}

function SeedRateBadgeWrapper({ crop, zone }) {
  const [meta, setMeta] = useState(null);
  useEffect(() => {
    import('../../lib/api').then(({ getCropMetadata }) => {
      getCropMetadata(crop).then(setMeta).catch(() => {});
    });
  }, [crop]);
  if (!meta) return null;
  const acres = zone.zoneAreaBigha * 0.333;
  return <SeedRateBadge seedKgPerAcre={meta.seedKgPerAcre} spacingNotes={meta.spacingNotes} zoneAcres={acres} />;
}
