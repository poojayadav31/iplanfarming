import {
  X,
  BarChart3,
  Layers,
  Droplets,
  TreePine,
  Sprout,
  HeartHandshake,
} from 'lucide-react';
import type { FarmBed, PlacedTree, PlacedElement } from '../../types/designer';
import { calculateBedSynergy, CROP_LIBRARY } from '../../lib/designerCropsData';

interface DesignerAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmName: string;
  farmAreaAcres: number;
  farmAreaBigha: number;
  beds: FarmBed[];
  trees: PlacedTree[];
  elements: PlacedElement[];
}

export default function DesignerAnalyticsModal({
  isOpen,
  onClose,
  farmName,
  farmAreaAcres,
  farmAreaBigha,
  beds,
  trees,
  elements,
}: DesignerAnalyticsModalProps) {
  if (!isOpen) return null;

  // 1. Bed Area Calculations
  const totalBedAreaSqM = beds.reduce((acc, b) => acc + b.areaSqM, 0);
  const totalFarmAreaSqM = farmAreaAcres * 4046.86;
  const bedCoveragePct = totalFarmAreaSqM > 0 ? ((totalBedAreaSqM / totalFarmAreaSqM) * 100).toFixed(1) : '0';

  // 2. Crop Counts by Category
  const allPlantedCrops = beds.flatMap((b) => b.crops);
  const totalPlantsCount = allPlantedCrops.reduce((acc, c) => acc + c.quantity, 0);

  const cropCategoryBreakdown: Record<string, number> = {};
  allPlantedCrops.forEach((c) => {
    cropCategoryBreakdown[c.category] = (cropCategoryBreakdown[c.category] || 0) + c.quantity;
  });

  // 3. Tree Canopy Coverage
  const totalTreeCanopySqM = trees.reduce(
    (acc, t) => acc + Math.PI * Math.pow(t.canopyDiameterM / 2, 2),
    0
  );

  // 4. Water Estimate (Liters/week based on planted crop library norms)
  let estimatedWeeklyLiters = 0;
  beds.forEach((b) => {
    b.crops.forEach((c) => {
      const def = CROP_LIBRARY.find((item) => item.name.toLowerCase() === c.cropName.toLowerCase());
      const multiplier = def?.waterNeed === 'High' ? 12 : def?.waterNeed === 'Low' ? 4 : 7;
      estimatedWeeklyLiters += c.quantity * multiplier;
    });
  });
  trees.forEach((t) => {
    estimatedWeeklyLiters += t.canopyDiameterM * 25;
  });

  // 5. Global Synergy Score across all multi-crop beds
  const bedsWithMultiCrops = beds.filter((b) => b.crops.length > 1);
  const avgSynergyScore =
    bedsWithMultiCrops.length > 0
      ? Math.round(
          bedsWithMultiCrops.reduce((acc, b) => acc + calculateBedSynergy(b.crops).score, 0) /
            bedsWithMultiCrops.length
        )
      : 100;

  // 6. Biodiversity Index (Species richness)
  const uniqueSpecies = new Set([
    ...allPlantedCrops.map((c) => c.cropName.toLowerCase()),
    ...trees.map((t) => t.treeName.toLowerCase()),
  ]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 bg-linear-to-r from-green-800 to-emerald-700 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Farm Plan Analytics &amp; Synergy Audit</h2>
              <p className="text-xs text-green-100">{farmName} • {farmAreaBigha.toFixed(2)} Bigha ({farmAreaAcres.toFixed(2)} Acres)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 p-1.5 text-white hover:bg-white/20 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-center">
              <Layers className="mx-auto h-5 w-5 text-amber-600" />
              <p className="mt-2 text-2xl font-bold text-stone-900">{beds.length}</p>
              <p className="text-xs font-semibold text-stone-500">Planned Beds</p>
              <p className="mt-0.5 text-[10px] text-stone-400">{totalBedAreaSqM.toFixed(1)} m² ({bedCoveragePct}% farm)</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-center">
              <TreePine className="mx-auto h-5 w-5 text-green-700" />
              <p className="mt-2 text-2xl font-bold text-stone-900">{trees.length}</p>
              <p className="text-xs font-semibold text-stone-500">Trees &amp; Palms</p>
              <p className="mt-0.5 text-[10px] text-stone-400">{totalTreeCanopySqM.toFixed(1)} m² canopy</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-center">
              <Sprout className="mx-auto h-5 w-5 text-emerald-600" />
              <p className="mt-2 text-2xl font-bold text-stone-900">{totalPlantsCount}</p>
              <p className="text-xs font-semibold text-stone-500">Total Plant Population</p>
              <p className="mt-0.5 text-[10px] text-stone-400">{uniqueSpecies.size} unique species</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-center">
              <Droplets className="mx-auto h-5 w-5 text-sky-600" />
              <p className="mt-2 text-2xl font-bold text-stone-900">~{Math.round(estimatedWeeklyLiters)} L</p>
              <p className="text-xs font-semibold text-stone-500">Weekly Irrigation</p>
              <p className="mt-0.5 text-[10px] text-stone-400">Natural farming baseline</p>
            </div>
          </div>

          {/* Biodiversity & Companion Health */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartHandshake className="h-5 w-5 text-emerald-700" />
                <h3 className="text-sm font-bold text-emerald-950">Polyculture &amp; Companion Health</h3>
              </div>
              <span className="rounded-full bg-emerald-200/80 px-2.5 py-1 text-xs font-bold text-emerald-900">
                {avgSynergyScore}% Ecosystem Synergy
              </span>
            </div>
            <p className="mt-1.5 text-xs text-emerald-800">
              Your design includes <strong>{uniqueSpecies.size} diverse plant species</strong> across {beds.length} beds. 
              Polycultures deter insect infestations by 60% compared to monocultures while naturally feeding the soil microbiology.
            </p>
          </div>

          {/* Plant Population Breakdown */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">Crop Population Breakdown</h4>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {Object.entries(cropCategoryBreakdown).map(([category, count]) => (
                <div
                  key={category}
                  className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3"
                >
                  <span className="text-xs font-semibold text-stone-800">{category}</span>
                  <span className="rounded-lg bg-green-50 px-2 py-0.5 text-xs font-bold text-green-800">
                    {count} plants
                  </span>
                </div>
              ))}
              {trees.length > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3">
                  <span className="text-xs font-semibold text-stone-800">Trees &amp; Perennials</span>
                  <span className="rounded-lg bg-green-50 px-2 py-0.5 text-xs font-bold text-green-800">
                    {trees.length} trees
                  </span>
                </div>
              )}
              {elements.length > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3">
                  <span className="text-xs font-semibold text-stone-800">Water &amp; Infrastructure Elements</span>
                  <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-800">
                    {elements.length} structures
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bed by Bed Audit */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">Bed Planning Summary</h4>
            <div className="mt-3 divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
              {beds.length === 0 ? (
                <p className="p-4 text-center text-xs text-stone-400">No beds created yet</p>
              ) : (
                beds.map((bed) => {
                  const bSynergy = calculateBedSynergy(bed.crops);
                  return (
                    <div key={bed.id} className="p-3.5 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: bed.color || '#d97706' }} />
                          <p className="text-xs font-bold text-stone-900">{bed.name}</p>
                          <span className="rounded bg-stone-100 px-1.5 py-0.2 text-[9px] font-medium text-stone-600">
                            {bed.type}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-stone-500">
                          {bed.crops.length > 0
                            ? bed.crops.map((c) => `${c.cropName} (${c.quantity})`).join(', ')
                            : 'Empty bed'}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-bold text-stone-800">{bed.areaSqM.toFixed(1)} m²</p>
                        {bed.crops.length > 1 && (
                          <span className="text-[10px] font-bold text-emerald-700">
                            {bSynergy.score}% synergy
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-stone-100 bg-stone-50 px-6 py-3 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-stone-900 px-5 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition"
          >
            Close Analytics
          </button>
        </div>
      </div>
    </div>
  );
}
