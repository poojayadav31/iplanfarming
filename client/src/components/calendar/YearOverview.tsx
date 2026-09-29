import { ChevronLeft, ChevronRight, Users, Clock, Sprout, Wheat } from 'lucide-react';
import type { YearOverviewResponse, MonthSummary } from '../../types/calendar';
import { CATEGORY_META } from '../../types/calendar';

const MONTH_NAMES = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];
interface Props {
  data: YearOverviewResponse;
  year: number;
  onYearChange: (y: number) => void;
  onMonthClick: (month: number) => void;
}

function StatusBar({ completed, missed, skipped, total }: {
  completed: number; missed: number; skipped: number; total: number;
}) {
  if (total === 0) return <div className="h-1.5 rounded-full bg-stone-100" />;
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
      <div className="bg-green-500 transition-all" style={{ width: pct(completed) }} />
      <div className="bg-rose-400 transition-all" style={{ width: pct(missed) }} />
      <div className="bg-stone-300 transition-all" style={{ width: pct(skipped) }} />
    </div>
  );
}

function MonthCard({ summary, onClick, isCurrentMonth }: {
  summary: MonthSummary;
  onClick: () => void;
  isCurrentMonth: boolean;
}) {
  const isEmpty = summary.total === 0;

  return (
    <button
      onClick={onClick}
      disabled={isEmpty}
      className={`group flex flex-col rounded-2xl border p-4 text-left transition-all
        ${isCurrentMonth
          ? 'border-green-300 bg-green-50 ring-1 ring-green-200'
          : isEmpty
          ? 'border-stone-100 bg-stone-50 opacity-50 cursor-default'
          : 'border-stone-200 bg-white hover:border-green-200 hover:shadow-sm'
        }`}
    >
      {/* Month name + task count */}
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wider
            ${isCurrentMonth ? 'text-green-700' : 'text-stone-500'}`}>
            {MONTH_NAMES[summary.month - 1]}
          </p>
          {!isEmpty && (
            <p className="mt-0.5 text-xl font-bold text-stone-800">{summary.total}</p>
          )}
          {isEmpty && (
            <p className="mt-1 text-xs text-stone-400">No tasks</p>
          )}
        </div>

        {/* Completion rate badge */}
        {!isEmpty && summary.completionRate > 0 && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold
            ${summary.completionRate === 100
              ? 'bg-green-100 text-green-700'
              : summary.missed > 0
              ? 'bg-rose-100 text-rose-600'
              : 'bg-stone-100 text-stone-500'
            }`}>
            {summary.completionRate}%
          </span>
        )}
      </div>

      {/* Status bar */}
      {!isEmpty && (
        <div className="mt-3">
          <StatusBar
            completed={summary.completed}
            missed={summary.missed}
            skipped={summary.skipped}
            total={summary.total}
          />
        </div>
      )}

      {/* Category pills */}
      {!isEmpty && (
        <div className="mt-3 flex flex-wrap gap-1">
          {(Object.entries(summary.byCategory) as [string, number][])
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([cat, count]) => {
              const meta = CATEGORY_META[cat as keyof typeof CATEGORY_META];
              if (!meta) return null;
              return (
                <span
                  key={cat}
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${meta.color}`}
                >
                  {count} {meta.label}
                </span>
              );
            })}
        </div>
      )}

      {/* Labour summary */}
      {!isEmpty && (
        <div className="mt-3 flex gap-3 text-[10px] text-stone-400">
          <span className="flex items-center gap-0.5">
            <Users className="h-3 w-3" />{summary.totalWorkers}w
          </span>
          <span className="flex items-center gap-0.5">
            <Clock className="h-3 w-3" />{summary.totalHours}h
          </span>
        </div>
      )}

      {/* Critical dates */}
      {summary.criticalDates.length > 0 && (
        <div className="mt-3 space-y-1">
          {summary.criticalDates.slice(0, 2).map((cd) => (
            <div key={cd.date} className="flex items-center gap-1 text-[10px] text-stone-500">
              {cd.type === 'planting'
                ? <Sprout className="h-3 w-3 text-emerald-500" />
                : <Wheat className="h-3 w-3 text-amber-500" />
              }
              <span className="truncate">{cd.cropName} — {new Date(cd.date).getDate()}</span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

export default function YearOverview({ data, year, onYearChange, onMonthClick }: Props) {
  const currentMonth = new Date().getMonth() + 1; // 1-based
  const currentYear  = new Date().getFullYear();

  const totalTasks   = data.months.reduce((s, m) => s + m.total, 0);
  const totalDone    = data.months.reduce((s, m) => s + m.completed, 0);
  const totalMissed  = data.months.reduce((s, m) => s + m.missed, 0);
  const totalWorkers = data.months.reduce((s, m) => s + m.totalWorkers, 0);
  const totalHours   = data.months.reduce((s, m) => s + m.totalHours, 0);

  return (
    <div className="space-y-4">

      {/* ── Year nav + summary ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Full Year</p>
            <h2 className="mt-0.5 text-2xl font-bold text-stone-900">{year}</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onYearChange(year - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {year !== currentYear && (
              <button
                onClick={() => onYearChange(currentYear)}
                className="rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors"
              >
                Today
              </button>
            )}
            <button
              onClick={() => onYearChange(year + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Year-level stats */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Tasks', value: totalTasks, color: 'text-stone-800' },
            { label: 'Completed',   value: totalDone,  color: 'text-green-600' },
            { label: 'Missed',      value: totalMissed, color: totalMissed > 0 ? 'text-rose-500' : 'text-stone-400' },
            { label: 'Labour Days', value: `${Math.round(totalHours / 8)}d`, color: 'text-stone-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl bg-stone-50 px-4 py-3 text-center">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-stone-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Overall progress bar */}
        {totalTasks > 0 && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-[10px] text-stone-400">
              <span>{totalDone} of {totalTasks} tasks completed</span>
              <span>{Math.round((totalDone / totalTasks) * 100)}%</span>
            </div>
            <StatusBar
              completed={totalDone}
              missed={totalMissed}
              skipped={data.months.reduce((s, m) => s + m.skipped, 0)}
              total={totalTasks}
            />
            <div className="mt-1.5 flex gap-3 text-[10px] text-stone-400">
              <span><span className="inline-block h-2 w-2 rounded-sm bg-green-500 mr-1" />Done</span>
              <span><span className="inline-block h-2 w-2 rounded-sm bg-rose-400 mr-1" />Missed</span>
              <span><span className="inline-block h-2 w-2 rounded-sm bg-stone-300 mr-1" />Skipped</span>
            </div>
          </div>
        )}

        {/* Labour totals */}
        <div className="mt-4 flex gap-6 text-sm text-stone-500">
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-stone-400" />
            ~{totalWorkers} total worker-days
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-stone-400" />
            {totalHours}h total work
          </span>
        </div>
      </div>

      {/* ── Month grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {data.months.map((summary) => (
          <MonthCard
            key={summary.month}
            summary={summary}
            isCurrentMonth={summary.month === currentMonth && year === currentYear}
            onClick={() => onMonthClick(summary.month)}
          />
        ))}
      </div>

      {/* ── Legend ───────────────────────────────────────────────────────── */}
      <p className="text-center text-xs text-stone-400">
        Click any month to view the detailed task schedule
      </p>
    </div>
  );
}
