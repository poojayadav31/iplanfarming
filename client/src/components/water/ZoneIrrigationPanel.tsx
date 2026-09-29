import { useState } from 'react';
import { CheckCircle2, SkipForward, Droplets, FlaskConical, Sprout, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import type { ZoneHydraulics, IrrigationSchedule } from '../../types/water';
import { completeIrrigationSchedule, skipIrrigationSchedule } from '../../lib/api';

interface Props {
  farmId: string;
  zone: ZoneHydraulics;
  onExecuted: () => void;
}

const METHOD_ICON: Record<string, string> = {
  Drip: '💧',
  Sprinkler: '🌀',
  Flood: '🌊',
};

const METHOD_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  Drip:      { bg: 'bg-cyan-50',   text: 'text-cyan-700',   border: 'border-cyan-200' },
  Sprinkler: { bg: 'bg-sky-50',    text: 'text-sky-700',    border: 'border-sky-200' },
  Flood:     { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
};

const STATUS_STYLE: Record<string, { label: string; bg: string; text: string }> = {
  PENDING:   { label: 'Pending',   bg: 'bg-amber-100',  text: 'text-amber-700' },
  COMPLETED: { label: 'Completed', bg: 'bg-green-100',  text: 'text-green-700' },
  SKIPPED:   { label: 'Skipped',   bg: 'bg-stone-100',  text: 'text-stone-500' },
};

function MultiplierBar({ value }: { value: number }) {
  // Visual bar: 0.6 → 1.56 range mapped to 0–100%
  const pct = Math.min(100, Math.max(0, ((value - 0.6) / (1.56 - 0.6)) * 100));
  const color =
    value > 1.1 ? 'bg-amber-400' : value < 0.9 ? 'bg-cyan-400' : 'bg-green-400';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono font-semibold text-stone-600">
        ×{value.toFixed(2)}
      </span>
    </div>
  );
}

export default function ZoneIrrigationPanel({ farmId, zone, onExecuted }: Props) {
  const [acting, setActing] = useState<'complete' | 'skip' | null>(null);

  const schedule = zone.thisWeekSchedule as IrrigationSchedule | null | undefined;
  const methodStyle = METHOD_COLOR[zone.irrigationMethod ?? ''] ?? METHOD_COLOR.Sprinkler;

  const handleComplete = async () => {
    if (!schedule) return;
    setActing('complete');
    try {
      await completeIrrigationSchedule(farmId, schedule.id);
      toast.success(`Zone ${zone.zoneName} — irrigation marked complete`);
      onExecuted();
    } catch (err) {
      const e = err as AxiosError<{ message?: string }>;
      toast.error(e.response?.data?.message ?? 'Failed to complete schedule');
    } finally {
      setActing(null);
    }
  };

  const handleSkip = async () => {
    if (!schedule) return;
    setActing('skip');
    try {
      await skipIrrigationSchedule(farmId, schedule.id);
      toast.success(`Zone ${zone.zoneName} — irrigation skipped this week`);
      onExecuted();
    } catch (err) {
      const e = err as AxiosError<{ message?: string }>;
      toast.error(e.response?.data?.message ?? 'Failed to skip schedule');
    } finally {
      setActing(null);
    }
  };

  // ── Zone not ready (missing data) ──────────────────────────────────────────
  if (!zone.ready) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-stone-700">
              Zone {zone.zoneNumber} — {zone.zoneName}
            </p>
            <p className="mt-0.5 text-xs text-stone-400">
              Missing {zone.missingData} — add it to enable irrigation planning.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = schedule
    ? STATUS_STYLE[schedule.status]
    : null;

  return (
    <div className={`rounded-2xl border ${methodStyle.border} bg-white overflow-hidden shadow-sm`}>
      {/* Header strip */}
      <div className={`${methodStyle.bg} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${methodStyle.bg} border ${methodStyle.border} text-base`}>
            {METHOD_ICON[zone.irrigationMethod!] ?? '💧'}
          </div>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wide ${methodStyle.text}`}>
              {zone.irrigationMethod}
            </p>
            <p className="text-[10px] text-stone-400">Recommended method</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-stone-500">Zone {zone.zoneNumber}</p>
          <p className="text-sm font-semibold text-stone-800 truncate max-w-[120px]">{zone.zoneName}</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Crop & soil */}
        <div className="flex gap-3">
          <div className="flex items-center gap-1.5 rounded-lg bg-green-50 border border-green-100 px-2.5 py-1.5">
            <Sprout className="h-3.5 w-3.5 text-green-600" />
            <span className="text-xs font-medium text-green-700">{zone.cropName}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-stone-50 border border-stone-100 px-2.5 py-1.5">
            <FlaskConical className="h-3.5 w-3.5 text-stone-500" />
            <span className="text-xs font-medium text-stone-600">
              {zone.soilType} · {zone.drainageSpeed}
            </span>
          </div>
        </div>

        {/* Hydraulic breakdown */}
        <div className="rounded-xl bg-stone-50 p-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
            Eco-Hydraulic Calculation
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-stone-500">Area</span>
            <span className="font-mono font-semibold text-stone-700 text-right">
              {zone.areaAcres!.toFixed(2)} acres
            </span>
            <span className="text-stone-500">Crop base need</span>
            <span className="font-mono font-semibold text-stone-700 text-right">
              {Math.round(zone.baseWaterLiters! / zone.areaAcres!).toLocaleString('en-IN')} L/acre/wk
            </span>
            <span className="text-stone-500">Soil retention multiplier</span>
            <span className="col-span-1">
              <MultiplierBar value={zone.soilRetentionMultiplier!} />
            </span>
          </div>
          <p className="text-[10px] text-stone-400 italic">{zone.soilMultiplierLabel}</p>
        </div>

        {/* Water requirement result */}
        <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5">
          <Droplets className="h-5 w-5 text-blue-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-blue-600 font-medium truncate">{zone.explanation}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-blue-700 tabular-nums leading-none">
              {Math.round(zone.adjustedWaterLiters!).toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] text-blue-500">L / week</p>
          </div>
        </div>

        {/* This week's schedule */}
        {schedule ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-stone-500">This week's task</p>
              {statusInfo && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusInfo.bg} ${statusInfo.text}`}>
                  {statusInfo.label}
                </span>
              )}
            </div>

            {schedule.status === 'PENDING' && (
              <div className="flex gap-2">
                <button
                  onClick={handleComplete}
                  disabled={acting !== null}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-600 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {acting === 'complete' ? 'Saving…' : 'Mark Complete'}
                </button>
                <button
                  onClick={handleSkip}
                  disabled={acting !== null}
                  className="flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-500 hover:bg-stone-50 disabled:opacity-60 transition-colors"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  Skip
                </button>
              </div>
            )}

            {schedule.status === 'COMPLETED' && (
              <div className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-xs text-green-700">
                  {schedule.completedLiters
                    ? `${Math.round(schedule.completedLiters).toLocaleString('en-IN')} L irrigated`
                    : 'Irrigation complete'}
                  {schedule.completedAt &&
                    ` · ${new Date(schedule.completedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`}
                </span>
              </div>
            )}

            {schedule.status === 'SKIPPED' && (
              <div className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2 text-xs text-stone-400 flex items-center gap-2">
                <SkipForward className="h-4 w-4" />
                Skipped this week
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-stone-400 text-center py-1">
            No schedule generated for this week yet — click "Generate This Week" above.
          </p>
        )}
      </div>
    </div>
  );
}
