import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, TrendingUp, Leaf, BarChart3, Info } from 'lucide-react';
import type { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { getFarmPlan } from '../../../lib/api';
import type { FarmPlanResponse, PlanScenario } from '../../../types/plan';
import ZonePlannerCard from './ZonePlannerCard';

interface Props {
  farmId: string;
}

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

const SCENARIO_STYLES: Record<string, { border: string; bg: string; accent: string; badge: string }> = {
  emerald: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    accent: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  blue: {
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    accent: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-800',
  },
  amber: {
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    accent: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-800',
  },
  violet: {
    border: 'border-violet-200',
    bg: 'bg-violet-50',
    accent: 'text-violet-700',
    badge: 'bg-violet-100 text-violet-800',
  },
};

function ScenarioCard({ scenario, valueAdded }: { scenario: PlanScenario; valueAdded: boolean }) {
  const s = SCENARIO_STYLES[scenario.highlightColor];
  const netProfit = valueAdded ? scenario.netProfitProcessed : scenario.netProfitRaw;
  const grossIncome = valueAdded ? scenario.grossIncomeProcessed : scenario.grossIncomeRaw;
  const isProfit = netProfit >= 0;

  return (
    <div className={`rounded-[20px] border ${s.border} ${s.bg} p-5`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wider ${s.accent}`}>
            {scenario.name}
          </p>
          <p className="mt-1 text-xs text-stone-500">{scenario.description}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-stone-600">Gross Income</span>
          <span className={`font-semibold ${s.accent}`}>{inr(grossIncome)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-stone-600">Input Cost</span>
          <span className="font-semibold text-rose-600">{inr(scenario.inputCost)}</span>
        </div>
        <div className="flex justify-between border-t border-stone-200 pt-2 text-sm">
          <span className="font-medium text-stone-800">Net Profit</span>
          <span className={`text-base font-bold ${isProfit ? 'text-emerald-700' : 'text-rose-600'}`}>
            {isProfit ? '' : '−'}{inr(Math.abs(netProfit))}
          </span>
        </div>
      </div>
    </div>
  );
}

function CropReferenceTable({ plan }: { plan: FarmPlanResponse }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-stone-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-stone-50 text-left">
            <th className="px-4 py-3 font-semibold text-stone-700">Crop</th>
            <th className="px-4 py-3 font-semibold text-stone-700">Season</th>
            <th className="px-4 py-3 font-semibold text-stone-700">Duration</th>
            <th className="px-4 py-3 font-semibold text-stone-700">Yield/Acre</th>
            <th className="px-4 py-3 font-semibold text-stone-700">Raw Price</th>
            <th className="px-4 py-3 font-semibold text-stone-700">Processed Price</th>
          </tr>
        </thead>
        <tbody>
          {plan.availableCrops.map((crop, i) => (
            <tr
              key={crop.id}
              className={i % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}
            >
              <td className="px-4 py-3 font-medium text-stone-900">{crop.cropName}</td>
              <td className="px-4 py-3 text-stone-600">{crop.season}</td>
              <td className="px-4 py-3 text-stone-600">{crop.durationMonths} mo</td>
              <td className="px-4 py-3 text-stone-600">{crop.yieldPerAcreKg.toLocaleString('en-IN')} kg</td>
              <td className="px-4 py-3 text-stone-600">₹{crop.rawSalePricePerKg}/kg</td>
              <td className="px-4 py-3 text-stone-600">₹{crop.processedSalePricePerKg}/kg</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FarmPlannerTool({ farmId }: Props) {
  const [plan, setPlan] = useState<FarmPlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [valueAdded, setValueAdded] = useState(false);

  const loadPlan = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getFarmPlan(farmId);
      setPlan(data);
    } catch (err) {
      const e = err as AxiosError<{ message?: string }>;
      toast.error(e.response?.data?.message || 'Could not load farm plan');
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-[28px] border border-stone-200 bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="rounded-[28px] border border-stone-200 bg-white p-8 text-center text-stone-600">
        Farm plan is not available right now.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Farm Planner
          </p>
          <h2 className="mt-1 text-2xl font-bold text-stone-900">{plan.farmName}</h2>
          <p className="mt-1 text-sm text-stone-500">
            {plan.totalZones} zones · {plan.areaAcres.toFixed(2)} acres total
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Value-addition toggle */}
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
            <span className="text-xs font-medium text-stone-600">Value Added</span>
            <div className="relative">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={valueAdded}
                onChange={(e) => setValueAdded(e.target.checked)}
              />
              <div className="h-5 w-9 rounded-full bg-stone-300 transition peer-checked:bg-emerald-500" />
              <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
            </div>
          </label>
          <button
            type="button"
            onClick={loadPlan}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-600 transition hover:bg-stone-100"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Auto-suggestion notice */}
      <div className="flex items-start gap-3 rounded-[20px] border border-amber-200 bg-amber-50 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-sm text-amber-800">
          Crops marked <strong>Auto</strong> are suggested based on your soil reports or zone size. Click{' '}
          <strong>Edit</strong> on any zone card to manually assign a crop and override the suggestion.
        </p>
      </div>

      {/* Zone Cards */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Leaf className="h-4 w-4 text-emerald-600" />
          <h3 className="font-semibold text-stone-900">Zone Assignments</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plan.zones.map((zone) => (
            <ZonePlannerCard
              key={zone.id}
              zone={zone}
              availableCrops={plan.availableCrops}
              onUpdated={loadPlan}
            />
          ))}
        </div>
      </section>

      {/* Scenario Comparison */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          <h3 className="font-semibold text-stone-900">Scenario Comparison</h3>
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
            {valueAdded ? 'Value-added pricing' : 'Raw market pricing'}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {plan.scenarios.map((scenario) => (
            <ScenarioCard key={scenario.key} scenario={scenario} valueAdded={valueAdded} />
          ))}
        </div>
      </section>

      {/* Crop Reference */}
      <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-stone-500" />
          <h3 className="font-semibold text-stone-900">Crop Economics Reference</h3>
        </div>
        <CropReferenceTable plan={plan} />
        <p className="mt-3 text-xs text-stone-400">
          * Input cost includes seed cost + natural farming inputs (Jeevamrit) at ₹15,000/acre.
          Processed price assumes value-addition through SHG / rural processing unit.
        </p>
      </section>
    </div>
  );
}
