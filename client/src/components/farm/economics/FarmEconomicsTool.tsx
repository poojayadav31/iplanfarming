import { useEffect, useState } from 'react';
import type { AxiosError } from 'axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { ArrowLeft, TrendingUp, TrendingDown, Leaf, CalendarDays, BarChart2, Settings2, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getFarmEconomics, getFarmFinancials, saveFarmFinancials } from '../../../lib/api';
import type { FarmEconomicsResponse, CashFlowDataPoint } from '../../../types/economics';
import type { EconomicsConfig, FarmFinancials } from '../../../lib/api';
import WeeklyEconomicsView from './WeeklyEconomicsView';
import toast from 'react-hot-toast';

// ─── Palette ──────────────────────────────────────────────────────────────────

const DONUT_COLORS = ['#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444', '#10b981', '#64748b'];

const BAR_COLORS = {
  cost:         '#f87171',
  rawRevenue:   '#6ee7b7',
  vaRevenue:    '#059669',
  rawProfit:    '#34d399',
  vaProfit:     '#047857',
};

// ─── Formatting helpers ────────────────────────────────────────────────────────

const inr = (n: number) =>
  '₹' + Math.abs(Math.round(n)).toLocaleString('en-IN');

const inrSigned = (n: number) =>
  (n < 0 ? '−' : '+') + inr(n);

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Skeleton = () => (
  <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="h-3 w-32 animate-pulse rounded-full bg-stone-200" />
          <div className="mt-4 h-9 w-40 animate-pulse rounded-full bg-stone-200" />
          <div className="mt-3 h-3 w-24 animate-pulse rounded-full bg-stone-200" />
        </div>
      ))}
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      {[1, 2].map((i) => (
        <div key={i} className="h-72 animate-pulse rounded-[28px] bg-stone-100" />
      ))}
    </div>
  </div>
);

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  accent: 'rose' | 'emerald' | 'green' | 'amber';
  icon: React.ReactNode;
}

const ACCENT_CLASSES: Record<KpiCardProps['accent'], string> = {
  rose:    'text-rose-600',
  emerald: 'text-emerald-600',
  green:   'text-green-700 font-bold',
  amber:   'text-amber-600',
};

function KpiCard({ label, value, sub, accent, icon }: KpiCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-stone-400">{icon}</span>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">{label}</p>
      </div>
      <p className={`text-3xl ${ACCENT_CLASSES[accent]}`}>{value}</p>
      {sub && <p className="text-xs text-stone-400">{sub}</p>}
    </div>
  );
}

// ─── Custom donut tooltip ─────────────────────────────────────────────────────

const DonutTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { percentage: number } }[] }) => {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-2 shadow-lg text-sm">
      <p className="font-semibold text-stone-800">{name}</p>
      <p className="text-stone-500">{inr(value)} <span className="text-stone-400">({p.percentage}%)</span></p>
    </div>
  );
};

// ─── Custom bar tooltip ───────────────────────────────────────────────────────

const BarTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-lg text-sm min-w-[180px]">
      <p className="mb-2 font-bold text-stone-800">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-stone-500">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
            {entry.name}
          </span>
          <span className={`font-semibold ${entry.value < 0 ? 'text-rose-600' : 'text-stone-800'}`}>
            {inrSigned(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Crop breakdown table ─────────────────────────────────────────────────────

function CropBreakdownTable({ data, valueAdded }: { data: FarmEconomicsResponse; valueAdded: boolean }) {
  return (
    <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
        Crop-by-Crop Breakdown
      </p>
      <h3 className="mt-2 text-xl font-semibold text-stone-900">
        Multilayer Revenue Detail
      </h3>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 text-left text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              <th className="pb-3 pr-4">Crop</th>
              <th className="pb-3 pr-4">Season</th>
              <th className="pb-3 pr-4">Duration</th>
              <th className="pb-3 pr-4">Seed Cost</th>
              <th className="pb-3 pr-4">Year 1 Revenue</th>
              <th className="pb-3">Year 2 Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {data.cropBreakdown.map((crop) => {
              const y1Rev = valueAdded ? crop.year1Revenue.valueAdded : crop.year1Revenue.raw;
              const y2Rev = valueAdded ? crop.year2Revenue.valueAdded : crop.year2Revenue.raw;
              const isPapaya = crop.cropName === 'Papaya';

              return (
                <tr key={crop.cropName} className="text-stone-700">
                  <td className="py-3 pr-4 font-semibold text-stone-900">{crop.cropName}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                      {crop.season}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-stone-500">{crop.durationMonths} mo</td>
                  <td className="py-3 pr-4 text-rose-600">{inr(crop.seedCost)}</td>
                  <td className="py-3 pr-4">
                    {isPapaya ? (
                      <span className="text-stone-400 text-xs">Nil (est. yr 2)</span>
                    ) : (
                      <span className="font-semibold text-emerald-700">{inr(y1Rev)}</span>
                    )}
                  </td>
                  <td className="py-3 font-semibold text-emerald-700">{inr(y2Rev)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface FarmEconomicsToolProps {
  farmId: string;
}

export default function FarmEconomicsTool({ farmId }: FarmEconomicsToolProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'yearly' | 'weekly'>('yearly');
  const [data, setData] = useState<FarmEconomicsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [valueAdded, setValueAdded] = useState(false);
  const [showCostPanel, setShowCostPanel] = useState(false);
  const [globalConfig, setGlobalConfig] = useState<EconomicsConfig | null>(null);
  const [farmFin, setFarmFin] = useState<FarmFinancials | null>(null);
  const [costForm, setCostForm] = useState<Partial<FarmFinancials>>({});
  const [savingCost, setSavingCost] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const response = await getFarmEconomics(farmId);
        if (isMounted) setData(response);
      } catch (err) {
        if (!isMounted) return;
        const apiError = err as AxiosError<{ message?: string }>;
        setErrorMessage(apiError.response?.data?.message || 'Could not load economics data.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();
    return () => { isMounted = false; };
  }, [farmId]);

  const loadCostPanel = async () => {
    try {
      const { farmFinancials, globalConfig: gc } = await getFarmFinancials(farmId);
      setGlobalConfig(gc);
      setFarmFin(farmFinancials);
      setCostForm({
        landLayoutCost:     farmFinancials?.landLayoutCost     ?? null,
        dripIrrigationCost: farmFinancials?.dripIrrigationCost ?? null,
        solarDryerCost:     farmFinancials?.solarDryerCost     ?? null,
        annualLabourCost:   farmFinancials?.annualLabourCost   ?? null,
        labourRatePerHour:  farmFinancials?.labourRatePerHour  ?? null,
        jeevamritHomemade:  farmFinancials?.jeevamritHomemade  ?? gc.jeevamritHomemade,
      });
    } catch { toast.error('Could not load cost settings'); }
  };

  const saveCosts = async () => {
    setSavingCost(true);
    try {
      const saved = await saveFarmFinancials(farmId, costForm);
      setFarmFin(saved);
      toast.success('Farm costs saved — reload the page to see updated projections');
      setShowCostPanel(false);
    } catch { toast.error('Save failed'); }
    finally { setSavingCost(false); }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex min-h-14 items-center gap-3">
          <div className="h-10 w-32 animate-pulse rounded-2xl bg-stone-200" />
        </div>
        <Skeleton />
      </div>
    );
  }

  if (errorMessage || !data) {
    return (
      <div className="rounded-[28px] border border-stone-200 bg-white p-8 text-center">
        <p className="text-base font-semibold text-rose-700">Failed to load</p>
        <p className="mt-2 text-sm text-stone-600">{errorMessage}</p>
        <button
          type="button"
          onClick={() => navigate(`/dashboard/farm/${farmId}`)}
          className="mt-5 flex min-h-11 items-center gap-2 rounded-2xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 mx-auto"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Farm
        </button>
      </div>
    );
  }

  // ── KPI values (switch between raw & value-added modes) ─────────────────
  const netProfitY2 = valueAdded ? data.profitLoss.year2.valueAdded : data.profitLoss.year2.raw;
  const year1TotalCost = data.capex.total + data.opex.year1.total;

  // ── Cash flow chart data (swap revenue/profit bars on toggle) ────────────
  const chartData: CashFlowDataPoint[] = data.cashFlowChart;

  const revenueKey   = valueAdded ? 'valueAddedRevenue' : 'rawRevenue';
  const profitKey    = valueAdded ? 'valueAddedProfit'  : 'rawProfit';
  const revenueName  = valueAdded ? 'Value-Added Revenue' : 'Raw Revenue';
  const profitName   = valueAdded ? 'Net Profit (Processed)' : 'Net Profit (Raw)';

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/dashboard/farm/${farmId}`)}
            className="flex min-h-10 items-center gap-2 rounded-2xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-stone-900">{data.farmName}</h1>
            <p className="text-sm text-stone-500">
              {data.areaAcres.toFixed(2)} acres · Multilayer Natural Farming Model
            </p>
          </div>
        </div>

        {/* Value-Addition toggle — only shown in yearly view */}
        {activeTab === 'yearly' && (
          <label className="flex cursor-pointer items-center gap-3 rounded-[28px] border border-stone-200 bg-white px-4 py-3 shadow-sm transition hover:border-emerald-300">
            <div className="relative">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={valueAdded}
                onChange={(e) => setValueAdded(e.target.checked)}
              />
              <div className="h-6 w-11 rounded-full bg-stone-200 transition peer-checked:bg-emerald-500" />
              <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-900">Simulate Value Addition</p>
              <p className="text-xs text-stone-500">
                {valueAdded ? 'Showing processed goods revenue' : 'Showing raw produce revenue'}
              </p>
            </div>
          </label>
        )}
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex gap-2 rounded-[28px] border border-stone-200 bg-white p-1.5 shadow-sm w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('yearly')}
          className={`flex items-center gap-2 rounded-[22px] px-5 py-2.5 text-sm font-semibold transition ${
            activeTab === 'yearly'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-stone-600 hover:bg-stone-50'
          }`}
        >
          <BarChart2 className="h-4 w-4" />
          Yearly Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('weekly')}
          className={`flex items-center gap-2 rounded-[22px] px-5 py-2.5 text-sm font-semibold transition ${
            activeTab === 'weekly'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-stone-600 hover:bg-stone-50'
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          Weekly Plan
        </button>
      </div>

      {/* ── Weekly View ── */}
      {activeTab === 'weekly' && <WeeklyEconomicsView farmId={farmId} />}

      {/* ── Yearly View ── */}
      {activeTab !== 'yearly' ? null : (<>

      {/* ── KPI Cards ── */}
      <section className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label="Total Year 1 Cost"
          value={inr(year1TotalCost)}
          sub={`CapEx ${inr(data.capex.total)} + OpEx ${inr(data.opex.year1.total)}`}
          accent="rose"
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <KpiCard
          label={`Projected Net Profit · Year 2`}
          value={inrSigned(netProfitY2)}
          sub={valueAdded ? 'After processing & packaging costs' : 'Selling raw at farm gate'}
          accent={netProfitY2 >= 0 ? 'green' : 'rose'}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KpiCard
          label="Savings via Natural Farming"
          value={inr(data.naturalFarmingSavings.savings)}
          sub={
            data.naturalFarmingSavings.jeevamritHomemade
              ? 'vs chemical fertilizer (Jeevamrit home-made = ₹0)'
              : `vs chemical fertilizer · natural cost ${inr(data.naturalFarmingSavings.naturalCost)}`
          }
          accent="amber"
          icon={<Leaf className="h-4 w-4" />}
        />
      </section>

      {/* ── Charts row ── */}
      <section className="grid gap-6 lg:grid-cols-2">

        {/* Donut: Expense Distribution */}
        <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Expense Breakdown
          </p>
          <h3 className="mt-2 text-lg font-semibold text-stone-900">Year 1 Cost Distribution</h3>

          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data.expenseDistribution}
                dataKey="amount"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={68}
                outerRadius={100}
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.expenseDistribution.map((entry, index) => (
                  <Cell key={entry.category} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<DonutTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend detail */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            {data.expenseDistribution.map((item, i) => (
              <div key={item.category} className="flex items-center gap-2 text-xs text-stone-600">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                />
                <span className="truncate">{item.category}</span>
                <span className="ml-auto font-semibold text-stone-800">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar: Multi-Year Cash Flow */}
        <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Multi-Year Cash Flow
          </p>
          <h3 className="mt-2 text-lg font-semibold text-stone-900">
            Year 1 vs Year 2 Comparison
          </h3>
          <p className="mt-1 text-xs text-stone-400">
            Year 1 carries CapEx burden. From Year 2 only OpEx remains — profit surges.
          </p>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={chartData}
              margin={{ top: 16, right: 0, left: 0, bottom: 0 }}
              barCategoryGap="30%"
              barGap={2}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip content={<BarTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
              />
              <Bar dataKey="totalCost"  name="Total Cost"  fill={BAR_COLORS.cost}       radius={[4, 4, 0, 0]} />
              <Bar dataKey={revenueKey} name={revenueName} fill={valueAdded ? BAR_COLORS.vaRevenue : BAR_COLORS.rawRevenue} radius={[4, 4, 0, 0]} />
              <Bar dataKey={profitKey}  name={profitName}  fill={valueAdded ? BAR_COLORS.vaProfit  : BAR_COLORS.rawProfit}  radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── Cost breakdown cards ── */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-700">Capital Expenditure</p>
          <p className="mt-1 text-xs text-stone-400">One-time Year 1 setup costs</p>
          <div className="mt-4 space-y-2">
            {[
              { label: 'Land Layout + Bunds',  value: data.capex.landLayout      },
              { label: 'Drip Irrigation Setup', value: data.capex.dripIrrigation },
              { label: 'Solar Dryer',           value: data.capex.solarDryer     },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between rounded-2xl bg-rose-50/60 px-4 py-2.5 text-sm">
                <span className="text-stone-700">{label}</span>
                <span className="font-semibold text-rose-700">{inr(value)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-2xl bg-rose-100 px-4 py-2.5 text-sm font-bold">
              <span className="text-stone-800">Total CapEx</span>
              <span className="text-rose-800">{inr(data.capex.total)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">Operational Expenditure</p>
          <p className="mt-1 text-xs text-stone-400">Annual recurring costs (same Year 1 &amp; 2)</p>
          <div className="mt-4 space-y-2">
            {[
              { label: 'Seeds & Planting Material', value: data.opex.year1.seeds         },
              { label: 'Labour (2 workers, annual)', value: data.opex.year1.labour        },
              { label: 'Natural Inputs (Jeevamrit)', value: data.opex.year1.naturalInputs },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between rounded-2xl bg-amber-50/60 px-4 py-2.5 text-sm">
                <span className="text-stone-700">{label}</span>
                <span className="font-semibold text-amber-700">
                  {value === 0 ? <span className="text-emerald-600">₹0 (home-made)</span> : inr(value)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-2xl bg-amber-100 px-4 py-2.5 text-sm font-bold">
              <span className="text-stone-800">Total OpEx / year</span>
              <span className="text-amber-800">{inr(data.opex.year1.total)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Natural Farming Savings banner ── */}
      <section className="rounded-[28px] border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Natural Farming Advantage
            </p>
            <h3 className="mt-2 text-xl font-semibold text-stone-900">
              You save {inr(data.naturalFarmingSavings.savings)} by avoiding chemical fertilizers
            </h3>
            <p className="mt-1 text-sm text-stone-600">
              Equivalent chemical fertilizer spend would be{' '}
              <span className="font-semibold text-rose-600">
                {inr(data.naturalFarmingSavings.chemicalCost)} / year
              </span>
              . Your actual natural input cost:{' '}
              <span className="font-semibold text-emerald-700">
                {data.naturalFarmingSavings.jeevamritHomemade
                  ? '₹0 (Jeevamrit home-prepared)'
                  : inr(data.naturalFarmingSavings.naturalCost)}
              </span>
            </p>
          </div>
          <div className="shrink-0 rounded-3xl bg-emerald-100 px-5 py-4 text-center">
            <p className="text-3xl font-bold text-emerald-800">{inr(data.naturalFarmingSavings.savings)}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">Annual Savings</p>
          </div>
        </div>
      </section>

      {/* ── Crop breakdown table ── */}
      <CropBreakdownTable data={data} valueAdded={valueAdded} />

      {/* ── Year 2 profit summary ── */}
      <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
          2-Year Summary
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Year 1 Revenue',     value: valueAdded ? data.revenue.year1.valueAdded : data.revenue.year1.raw,         color: 'text-emerald-600' },
            { label: 'Year 1 Net P&L',     value: valueAdded ? data.profitLoss.year1.valueAdded : data.profitLoss.year1.raw,   color: data.profitLoss.year1.raw < 0 ? 'text-rose-600' : 'text-emerald-600' },
            { label: 'Year 2 Revenue',     value: valueAdded ? data.revenue.year2.valueAdded : data.revenue.year2.raw,         color: 'text-emerald-600' },
            { label: 'Year 2 Net Profit',  value: valueAdded ? data.profitLoss.year2.valueAdded : data.profitLoss.year2.raw,   color: 'text-green-700 font-bold' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-3xl border border-stone-100 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">{label}</p>
              <p className={`mt-3 text-2xl ${color}`}>{inrSigned(value)}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-stone-400">
          Estimates use the multilayer farming model from the agricultural manual.
          Actual results depend on weather, market prices, and farm management.
        </p>
      </section>

      </>)}

      {/* ── Customise Your Costs ── */}
      <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
        <button
          onClick={() => { setShowCostPanel((p) => !p); if (!showCostPanel && !globalConfig) loadCostPanel(); }}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-stone-500" />
            <span className="text-sm font-bold text-stone-900">Customise your costs</span>
            {farmFin && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Custom</span>}
          </div>
          {showCostPanel ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
        </button>
        <p className="mt-1 text-xs text-stone-500">Override the default costs for this farm — e.g. if you got a drip irrigation subsidy.</p>

        {showCostPanel && globalConfig && (
          <div className="mt-4 space-y-3">
            {([
              { key: 'landLayoutCost',     label: 'Land Bunding & Layout',  unit: '₹/acre',  global: globalConfig.landLayoutCostPerAcre },
              { key: 'dripIrrigationCost', label: 'Drip Irrigation Setup',  unit: '₹/acre',  global: globalConfig.dripIrrigationCostPerAcre },
              { key: 'solarDryerCost',     label: 'Solar Dryer',            unit: '₹ flat',  global: globalConfig.solarDryerCostFlat },
              { key: 'annualLabourCost',   label: 'Annual Labour Cost',     unit: '₹/year',  global: globalConfig.annualLabourCost },
              { key: 'labourRatePerHour',  label: 'Labour Rate',            unit: '₹/hour',  global: globalConfig.labourRatePerHour },
            ] as Array<{ key: keyof FarmFinancials; label: string; unit: string; global: number }>).map((f) => (
              <div key={f.key} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-stone-700">{f.label} <span className="text-stone-400">({f.unit})</span></p>
                  <p className="text-[10px] text-stone-400">Default: ₹{f.global.toLocaleString('en-IN')}</p>
                </div>
                <input
                  type="number"
                  placeholder={`${f.global} (default)`}
                  value={(costForm[f.key] as number | null) ?? ''}
                  onChange={(e) => setCostForm({ ...costForm, [f.key]: e.target.value === '' ? null : Number(e.target.value) })}
                  className="w-36 rounded-2xl border border-stone-200 px-3 py-2 text-right text-sm"
                />
              </div>
            ))}

            <label className="flex items-center gap-3 pt-1">
              <input
                type="checkbox"
                checked={!!costForm.jeevamritHomemade}
                onChange={(e) => setCostForm({ ...costForm, jeevamritHomemade: e.target.checked })}
                className="h-4 w-4 accent-green-600"
              />
              <div>
                <p className="text-xs font-semibold text-stone-700">Jeevamrit Homemade</p>
                <p className="text-[10px] text-stone-400">ON = natural input cost ₹0</p>
              </div>
            </label>

            <p className="text-[10px] text-stone-400">Leave a field blank to use the platform default set by your expert.</p>

            <button onClick={saveCosts} disabled={savingCost}
              className="flex items-center gap-2 rounded-2xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50">
              <Save className="h-4 w-4" /> {savingCost ? 'Saving…' : 'Save my costs'}
            </button>
          </div>
        )}
      </section>

    </div>
  );
}
