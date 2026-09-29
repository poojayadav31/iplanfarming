import { useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  RefreshCw,
  Zap,
  Droplets,
  CalendarCheck,
  TriangleAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import {
  getWaterSummary,
  generateIrrigationSchedules,
} from '../../lib/api';
import type { WaterSummary } from '../../types/water';
import WaterCapacityGauge from './WaterCapacityGauge';
import WaterSourceManager from './WaterSourceManager';
import ZoneIrrigationPanel from './ZoneIrrigationPanel';

interface Props {
  farmId: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${color}`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-medium text-stone-500">{label}</p>
          <p className="text-lg font-bold text-stone-800 leading-tight">{value}</p>
          {sub && <p className="text-[10px] text-stone-400">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

const fmt = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(2)} ML`
    : n >= 1000
    ? `${(n / 1000).toFixed(1)}K L`
    : `${Math.round(n)} L`;

export default function WaterDashboard({ farmId }: Props) {
  const [summary, setSummary] = useState<WaterSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWaterSummary(farmId);
      setSummary(data);
    } catch (err) {
      const e = err as AxiosError<{ message?: string }>;
      toast.error(e.response?.data?.message ?? 'Failed to load water data');
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateIrrigationSchedules(farmId);
      if (result.created.length > 0) {
        toast.success(
          `Generated ${result.created.length} irrigation task${result.created.length > 1 ? 's' : ''} for this week`
        );
      } else {
        toast(`All zones already have tasks for this week`, { icon: 'ℹ️' });
      }
      await load();
    } catch (err) {
      const e = err as AxiosError<{ message?: string }>;
      toast.error(e.response?.data?.message ?? 'Failed to generate schedules');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!summary) return null;

  const readyZones = summary.zoneHydraulics.filter((z) => z.ready);
  const unreadyZones = summary.zoneHydraulics.filter((z) => !z.ready);

  // Weekly irrigation date range label
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekLabel = `${monday.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${sunday.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;

  return (
    <div className="space-y-6">

      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Smart Water Management</h2>
          <p className="text-sm text-stone-500">Eco-Hydraulic Engine · Week of {weekLabel}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || readyZones.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            <Zap className="h-4 w-4" />
            {generating ? 'Generating…' : 'Generate This Week'}
          </button>
        </div>
      </div>

      {/* ── Overview stat cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={Droplets}
          label="Total Water Available"
          value={fmt(summary.totalCurrentLiters)}
          sub={`of ${fmt(summary.totalCapacityLiters)} total`}
          color="border-blue-100 text-blue-600"
        />
        <StatCard
          icon={CalendarCheck}
          label="Pending Tasks"
          value={String(summary.pendingScheduleCount)}
          sub="this week"
          color="border-amber-100 text-amber-600"
        />
        <StatCard
          icon={Droplets}
          label="Water Needed"
          value={fmt(summary.totalPendingLiters)}
          sub="pending irrigation"
          color="border-cyan-100 text-cyan-600"
        />
        <StatCard
          icon={TriangleAlert}
          label="Zones Incomplete"
          value={String(unreadyZones.length)}
          sub="missing data"
          color="border-rose-100 text-rose-500"
        />
      </div>

      {/* ── Farm-wide water level ────────────────────────────────────────────── */}
      {summary.waterSources.length > 0 && (
        <div className="rounded-[24px] border border-blue-100 bg-gradient-to-br from-blue-950 to-blue-800 p-5 text-white shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">
                Farm Water Reserve
              </p>
              <p className="mt-0.5 text-3xl font-bold tabular-nums">
                {summary.fillPercentage}%
              </p>
            </div>
            <div className="text-right text-sm text-blue-200">
              <p className="font-semibold text-lg text-white">
                {fmt(summary.totalCurrentLiters)}
              </p>
              <p className="text-xs text-blue-300">of {fmt(summary.totalCapacityLiters)}</p>
            </div>
          </div>

          {/* Macro gauge */}
          <div className="relative h-5 w-full rounded-full bg-blue-900/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 transition-all duration-1000 relative"
              style={{ width: `${summary.fillPercentage}%` }}
            >
              <div className="absolute inset-0 bg-white/10 animate-pulse rounded-full" />
            </div>
            {[25, 50, 75].map((m) => (
              <div
                key={m}
                className="absolute top-0 bottom-0 w-px bg-blue-700/50"
                style={{ left: `${m}%` }}
              />
            ))}
          </div>

          {/* Per-source compact gauges */}
          {summary.waterSources.length > 1 && (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {summary.waterSources.map((src) => (
                <WaterCapacityGauge
                  key={src.id}
                  label={src.name}
                  currentLiters={src.currentLevelLiters}
                  totalLiters={src.totalCapacityLiters}
                  sourceType={src.sourceType}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Water Source Manager ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <WaterSourceManager
          farmId={farmId}
          sources={summary.waterSources}
          onChanged={load}
        />
      </div>

      {/* ── Zone Irrigation Panels ───────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <h3 className="font-semibold text-stone-800">Zone Irrigation Plans</h3>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            {readyZones.length} ready
          </span>
          {unreadyZones.length > 0 && (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">
              {unreadyZones.length} incomplete
            </span>
          )}
        </div>

        {summary.zoneHydraulics.length === 0 && (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 py-12 text-center">
            <Droplets className="mx-auto mb-2 h-8 w-8 text-stone-300" />
            <p className="text-sm font-medium text-stone-400">No zones found</p>
            <p className="mt-1 text-xs text-stone-400">
              Draw and save farm zones first to enable irrigation planning.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {summary.zoneHydraulics.map((zone) => (
            <ZoneIrrigationPanel
              key={zone.zoneId}
              farmId={farmId}
              zone={zone}
              onExecuted={load}
            />
          ))}
        </div>
      </div>

      {/* ── Schedule History ─────────────────────────────────────────────────── */}
      {summary.schedules.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm">
          <div className="border-b border-stone-100 px-5 py-4">
            <h3 className="font-semibold text-stone-800">Irrigation History</h3>
            <p className="text-xs text-stone-400 mt-0.5">All generated schedules across weeks</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50 text-xs font-semibold uppercase tracking-wider text-stone-400">
                  <th className="px-4 py-3 text-left">Zone</th>
                  <th className="px-4 py-3 text-left">Crop</th>
                  <th className="px-4 py-3 text-left">Method</th>
                  <th className="px-4 py-3 text-right">Adjusted Liters</th>
                  <th className="px-4 py-3 text-left">Week</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {summary.schedules.slice(0, 20).map((sched) => {
                  const statusS = sched.status === 'COMPLETED'
                    ? 'bg-green-100 text-green-700'
                    : sched.status === 'SKIPPED'
                    ? 'bg-stone-100 text-stone-500'
                    : 'bg-amber-100 text-amber-700';

                  return (
                    <tr key={sched.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-stone-700">
                        {sched.zone?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-stone-500">{sched.crop?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-stone-500">{sched.irrigationMethod}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-blue-700">
                        {Math.round(sched.adjustedWaterLiters).toLocaleString('en-IN')} L
                      </td>
                      <td className="px-4 py-3 text-stone-400 text-xs">
                        {new Date(sched.weekStartDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusS}`}>
                          {sched.status.charAt(0) + sched.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
