import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  ChevronLeft, ChevronRight, Loader2, TrendingUp, TrendingDown,
  IndianRupee, Users, Clock, Package, ChevronDown, ChevronUp,
  CalendarDays, Leaf,
} from 'lucide-react';
import { getWeeklyEconomics } from '../../../lib/api';
import type { WeeklyEconomicsResponse, WeekSummary, WeeklyActivity } from '../../../types/economics';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inr = (n: number) => '₹' + Math.abs(Math.round(n)).toLocaleString('en-IN');
const inrSigned = (n: number) => (n < 0 ? '−' : '+') + inr(n);

const fmt = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', timeZone: 'UTC',
  });

const fmtRange = (start: string, end: string) => `${fmt(start)} – ${fmt(end)}`;

const CATEGORY_COLOR: Record<string, string> = {
  crop_care:   'bg-emerald-100 text-emerald-700',
  inputs:      'bg-green-100 text-green-700',
  harvest:     'bg-yellow-100 text-yellow-700',
  irrigation:  'bg-blue-100 text-blue-700',
  observation: 'bg-violet-100 text-violet-700',
};

const TASK_ICON: Record<string, string> = {
  harvest: '🌾', fertilizer: '🧪', pest_control: '🛡️', irrigation: '💧',
  planting: '🌱', field_prep: '⛏️', weeding: '🌿', mulching: '🍂',
  pruning: '✂️', training: '🪢', observation: '🔍', custom: '📝',
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: 'green' | 'rose' | 'amber' | 'blue';
}) {
  const colorMap = {
    green: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-500', border: 'border-emerald-200' },
    rose:  { bg: 'bg-rose-50',    text: 'text-rose-700',    icon: 'text-rose-400',    border: 'border-rose-200'    },
    amber: { bg: 'bg-amber-50',   text: 'text-amber-700',   icon: 'text-amber-500',   border: 'border-amber-200'   },
    blue:  { bg: 'bg-blue-50',    text: 'text-blue-700',    icon: 'text-blue-500',    border: 'border-blue-200'    },
  }[color];

  return (
    <div className={`rounded-2xl border ${colorMap.border} ${colorMap.bg} p-4 flex flex-col gap-2`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${colorMap.icon}`} />
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${colorMap.text}`}>{value}</p>
      {sub && <p className="text-xs text-stone-400">{sub}</p>}
    </div>
  );
}

// ─── Activity card ─────────────────────────────────────────────────────────────

function ActivityCard({ act }: { act: WeeklyActivity }) {
  const [open, setOpen] = useState(false);
  const catCls = CATEGORY_COLOR[act.category] ?? 'bg-stone-100 text-stone-600';
  const icon   = TASK_ICON[act.taskType] ?? '📋';
  const hasIngredients = act.ingredients.length > 0;

  return (
    <div className="rounded-2xl border border-stone-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <span className="text-xl mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${catCls}`}>
              {act.category.replace('_', ' ')}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${act.priority === 'morning' ? 'bg-amber-100 text-amber-700' : 'bg-orange-100 text-orange-700'}`}>
              {act.priority === 'morning' ? '☀️ AM' : '🌅 PM'}
            </span>
            {act.isCustom && (
              <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-semibold text-pink-700">Custom</span>
            )}
          </div>
          <p className="font-semibold text-stone-900 text-sm leading-tight">{act.title}</p>
          <p className="text-xs text-stone-500 mt-0.5">
            {act.zoneName}{act.cropName ? ` · ${act.cropName}` : ''}
          </p>

          <div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-500">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" /> {act.labourWorkers} workers
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {act.labourHours}h
            </span>
            <span className="flex items-center gap-1 font-semibold text-rose-600">
              <IndianRupee className="h-3 w-3" /> Labour: {inr(act.labourCost)}
            </span>
            {act.revenue > 0 && (
              <span className="flex items-center gap-1 font-semibold text-emerald-700">
                <TrendingUp className="h-3 w-3" /> Revenue: {inr(act.revenue)}
              </span>
            )}
          </div>
        </div>

        {hasIngredients && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1 rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 shrink-0"
          >
            <Package className="h-3 w-3" />
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
      </div>

      {open && hasIngredients && (
        <div className="border-t border-stone-100 bg-green-50/60 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-green-700 mb-2 flex items-center gap-1">
            <Leaf className="h-3 w-3" /> Ingredients needed
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {act.ingredients.map((ing) => (
              <div key={ing.label} className="flex items-center justify-between rounded-xl bg-white border border-green-100 px-3 py-1.5">
                <span className="text-xs text-stone-600">{ing.label}</span>
                <span className="text-xs font-semibold text-green-700 ml-2 shrink-0">{ing.amount} {ing.unit}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-green-600">All natural inputs are homemade — ₹0 cost</p>
        </div>
      )}
    </div>
  );
}

// ─── 12-week chart tooltip ─────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: {name: string; value: number; fill: string}[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-lg text-xs min-w-[160px]">
      <p className="mb-2 font-bold text-stone-800">{label}</p>
      {payload.map((e) => (
        <div key={e.name} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-stone-500">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: e.fill }} />
            {e.name}
          </span>
          <span className={`font-semibold ${e.value < 0 ? 'text-rose-600' : 'text-stone-800'}`}>
            {inrSigned(e.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

export default function WeeklyEconomicsView({ farmId }: { farmId: string }) {
  const [data,        setData]        = useState<WeeklyEconomicsResponse | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [weekIndex,   setWeekIndex]   = useState(0);
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWeeklyEconomics(farmId);
      setData(res);
      setWeekIndex(0);
    } catch {
      // handled in parent
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-green-700" />
      </div>
    );
  }
  const totalTasks = data?.weeks.reduce((s, w) => s + w.taskCount, 0) ?? 0;
  if (!data || totalTasks === 0) {
    return (
      <div className="rounded-[28px] border border-stone-200 bg-white p-10 text-center space-y-3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">
          <CalendarDays className="h-7 w-7 text-stone-400" />
        </div>
        <p className="text-base font-semibold text-stone-800">No calendar tasks yet</p>
        <p className="text-sm text-stone-500 max-w-sm mx-auto">
          Your farm calendar hasn't been generated yet. Assign crops to your zones and open the Calendar tab to generate your activity schedule.
        </p>
        <a
          href={`/dashboard/farm/${farmId}/calendar`}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition mt-2"
        >
          <CalendarDays className="h-4 w-4" />
          Go to Farm Calendar
        </a>
      </div>
    );
  }

  const week: WeekSummary = data.weeks[weekIndex];

  // Group activities by zone
  const byZone = week.activities.reduce<Record<string, WeeklyActivity[]>>((acc, a) => {
    const key = a.zoneName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  // Chart data: all 12 weeks
  const chartData = data.weeks.map((w, i) => ({
    label: `W${i + 1}`,
    dateRange: fmtRange(w.weekStart, w.weekEnd),
    Revenue:   w.revenue,
    Cost:      w.totalCost,
    Net:       w.netProfit,
    isCurrent: i === weekIndex,
  }));

  const toggleZone = (z: string) =>
    setExpandedZones((prev) => {
      const n = new Set(prev);
      n.has(z) ? n.delete(z) : n.add(z);
      return n;
    });

  return (
    <div className="space-y-6">

      {/* ── Week navigator ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
        <button
          type="button"
          onClick={() => setWeekIndex((i) => Math.max(0, i - 1))}
          disabled={weekIndex === 0}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-50 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
            Week {weekIndex + 1} of 12
          </p>
          <p className="mt-0.5 text-base font-bold text-stone-900 flex items-center gap-2 justify-center">
            <CalendarDays className="h-4 w-4 text-green-600" />
            {fmtRange(week.weekStart, week.weekEnd)}
          </p>
          {(() => {
            const today = new Date().toISOString().slice(0, 10);
            const isThisWeek = week.weekStart <= today && today <= week.weekEnd;
            return isThisWeek ? (
              <span className="inline-block mt-1 rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-bold text-green-700 uppercase tracking-wider">
                Current Week
              </span>
            ) : week.weekStart > today ? (
              <span className="inline-block mt-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold text-sky-700 uppercase tracking-wider">
                Upcoming
              </span>
            ) : null;
          })()}
        </div>

        <button
          type="button"
          onClick={() => setWeekIndex((i) => Math.min(data.weeks.length - 1, i + 1))}
          disabled={weekIndex === data.weeks.length - 1}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-50 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Expected Revenue"
          value={inr(week.revenue)}
          sub={week.revenue > 0 ? 'From harvest this week' : 'No harvest this week'}
          icon={TrendingUp}
          color="green"
        />
        <KpiCard
          label="Labour Cost"
          value={inr(week.labourCost)}
          sub={`${(week.activities.reduce((s, a) => s + a.labourHours, 0) / 8).toFixed(1)} mandays this week`}
          icon={Users}
          color="rose"
        />
        <KpiCard
          label="Input Cost"
          value={inr(week.inputCost)}
          sub="Natural inputs (homemade = ₹0)"
          icon={Leaf}
          color="amber"
        />
        <KpiCard
          label="Net This Week"
          value={inrSigned(week.netProfit)}
          sub={week.netProfit >= 0 ? 'Profitable week' : 'High-activity week'}
          icon={week.netProfit >= 0 ? TrendingUp : TrendingDown}
          color={week.netProfit >= 0 ? 'green' : 'rose'}
        />
      </div>

      {/* ── Activities ─────────────────────────────────────────────────────── */}
      <section className="rounded-[28px] border border-stone-200 bg-stone-50 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">This Week's Work</p>
            <h3 className="mt-1 text-lg font-bold text-stone-900">
              {week.taskCount} {week.taskCount === 1 ? 'Activity' : 'Activities'} Scheduled
            </h3>
          </div>
        </div>

        {week.taskCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white py-10 text-center">
            <p className="text-stone-400 text-sm">No activities scheduled this week.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(byZone).map(([zoneName, acts]) => {
              const isOpen = expandedZones.has(zoneName);
              const zoneRevenue = acts.reduce((s, a) => s + a.revenue, 0);
              const zoneCost    = acts.reduce((s, a) => s + a.labourCost + a.inputCost, 0);
              return (
                <div key={zoneName} className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
                  {/* Zone header */}
                  <button
                    type="button"
                    onClick={() => toggleZone(zoneName)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-stone-800 text-sm">{zoneName}</span>
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
                        {acts.length} task{acts.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {zoneRevenue > 0 && (
                        <span className="text-xs font-semibold text-emerald-700">{inr(zoneRevenue)} revenue</span>
                      )}
                      <span className="text-xs font-semibold text-rose-600">{inr(zoneCost)} cost</span>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
                    </div>
                  </button>
                  {/* Zone tasks */}
                  {isOpen && (
                    <div className="border-t border-stone-100 p-3 space-y-2.5 bg-stone-50/50">
                      {acts.map((a) => <ActivityCard key={a.id} act={a} />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 12-week rolling chart ───────────────────────────────────────────── */}
      <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">12-Week Outlook</p>
        <h3 className="mt-1 text-lg font-bold text-stone-900">Revenue vs Cost Rolling Chart</h3>
        <p className="mt-0.5 text-xs text-stone-400">
          Click a bar to jump to that week. Highlighted bar = selected week.
        </p>

        <ResponsiveContainer width="100%" height={260} className="mt-4">
          <BarChart data={chartData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }} barGap={2} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false} tickLine={false} width={44}
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="Revenue" name="Revenue" radius={[3, 3, 0, 0]}>
              {chartData.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.isCurrent ? '#059669' : '#6ee7b7'}
                  cursor="pointer"
                  onClick={() => setWeekIndex(i)}
                />
              ))}
            </Bar>
            <Bar dataKey="Cost" name="Labour Cost" radius={[3, 3, 0, 0]}>
              {chartData.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.isCurrent ? '#dc2626' : '#fca5a5'}
                  cursor="pointer"
                  onClick={() => setWeekIndex(i)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Week table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone-100 text-left text-stone-400 font-semibold uppercase tracking-wider">
                <th className="pb-2 pr-4">Week</th>
                <th className="pb-2 pr-4">Dates</th>
                <th className="pb-2 pr-4 text-right">Tasks</th>
                <th className="pb-2 pr-4 text-right">Revenue</th>
                <th className="pb-2 pr-4 text-right">Cost</th>
                <th className="pb-2 text-right">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {data.weeks.map((w, i) => (
                <tr
                  key={i}
                  onClick={() => setWeekIndex(i)}
                  className={`cursor-pointer transition-colors ${i === weekIndex ? 'bg-green-50' : 'hover:bg-stone-50'}`}
                >
                  <td className="py-2 pr-4 font-semibold text-stone-700">
                    W{i + 1} {i === 0 && <span className="ml-1 rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-700">NOW</span>}
                  </td>
                  <td className="py-2 pr-4 text-stone-500">{fmtRange(w.weekStart, w.weekEnd)}</td>
                  <td className="py-2 pr-4 text-right text-stone-600">{w.taskCount}</td>
                  <td className="py-2 pr-4 text-right font-semibold text-emerald-700">{w.revenue > 0 ? inr(w.revenue) : '—'}</td>
                  <td className="py-2 pr-4 text-right font-semibold text-rose-600">{inr(w.totalCost)}</td>
                  <td className={`py-2 text-right font-bold ${w.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {inrSigned(w.netProfit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
