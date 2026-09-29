import { ChevronLeft, ChevronRight, Users, Clock, CheckCircle2, Plus } from 'lucide-react';
import type { CalendarEvent, DailyLabour } from '../../types/calendar';
import { EVENT_META } from '../../types/calendar';

interface Props {
  year: number;
  month: number;                                  // 1-based
  events: CalendarEvent[];
  dailyLabour: Record<string, DailyLabour>;
  onPrev: () => void;
  onNext: () => void;
  onEventClick: (event: CalendarEvent) => void;
  onAddTask: (date: string) => void;
}

const DAYS   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

/** Return events keyed by YYYY-MM-DD for fast lookup */
function groupByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const map: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    if (!map[ev.date]) map[ev.date] = [];
    map[ev.date].push(ev);
  }
  return map;
}

/** Pad a number to 2 digits */
const pad = (n: number) => String(n).padStart(2, '0');

/** ISO date string YYYY-MM-DD */
const isoDate = (y: number, m: number, d: number) =>
  `${y}-${pad(m)}-${pad(d)}`;

export default function CalendarGrid({
  year, month, events, dailyLabour, onPrev, onNext, onEventClick, onAddTask,
}: Props) {
  const byDate   = groupByDate(events);
  const todayStr = isoDate(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    new Date().getDate()
  );

  // First day of month (0=Sun … 6=Sat). Convert to Mon-first (0=Mon … 6=Sun).
  const firstDay = new Date(year, month - 1, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month, 0).getDate();

  // Build cell array: nulls for leading blanks, then day numbers
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">

      {/* ── Month navigation ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
        <h2 className="text-base font-bold text-stone-800">
          {MONTHS[month - 1]} {year}
        </h2>
        <div className="flex gap-1">
          <button
            onClick={onPrev}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={onNext}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Day-of-week header ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 border-b border-stone-100 bg-stone-50">
        {DAYS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-stone-400"
          >
            {d}
          </div>
        ))}
      </div>

      {/* ── Day cells ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 divide-x divide-y divide-stone-100">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`blank-${idx}`} className="min-h-[90px] bg-stone-50/40" />;
          }

          const dateStr     = isoDate(year, month, day);
          const dayEvents   = byDate[dateStr] ?? [];
          const labour      = dailyLabour[dateStr];
          const isToday     = dateStr === todayStr;
          const hasOverdue  = dayEvents.some((e) => e.status === 'overdue');
          const hasHarvest  = dayEvents.some((e) => e.type === 'harvest');
          const completedCount = dayEvents.filter((e) => e.status === 'completed').length;
          const allDone     = dayEvents.length > 0 && completedCount === dayEvents.length;
          const CHIP_LIMIT  = 3;
          const visibleEvs  = dayEvents.slice(0, CHIP_LIMIT);
          const overflow    = dayEvents.length - CHIP_LIMIT;

          return (
            <div
              key={dateStr}
              className={`group min-h-22.5 p-1.5 ${isToday ? 'bg-green-50' : allDone ? 'bg-green-50/40' : ''}`}
            >
              {/* Date number + add button */}
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold
                    ${isToday
                      ? 'bg-green-700 text-white'
                      : hasOverdue
                      ? 'text-rose-600'
                      : hasHarvest
                      ? 'text-amber-700'
                      : 'text-stone-600'
                    }`}
                >
                  {day}
                </span>

                <div className="flex items-center gap-0.5">
                  {/* + Add task button — visible on hover */}
                  <button
                    onClick={() => onAddTask(dateStr)}
                    title="Add custom activity"
                    className="hidden group-hover:flex h-4.5 w-4.5 items-center justify-center rounded bg-green-600 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-700"
                  >
                    <Plus className="h-3 w-3" />
                  </button>

                  {/* Completion badge or labour badge */}
                  {allDone ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  ) : completedCount > 0 && dayEvents.length > 0 ? (
                    <span className="rounded-md bg-green-100 px-1 py-0.5 text-[9px] font-semibold text-green-600">
                      {completedCount}/{dayEvents.length}
                    </span>
                  ) : labour ? (
                    <div className="flex items-center gap-0.5 rounded-md bg-stone-100 px-1 py-0.5 text-[9px] text-stone-500">
                      <Users className="h-2.5 w-2.5" />
                      {labour.workers}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Event chips */}
              <div className="space-y-0.5">
                {visibleEvs.map((ev) => {
                  const meta = EVENT_META[ev.type];
                  const isOverdue = ev.status === 'overdue';
                  const isTemplate = ev.status === 'template';
                  return (
                    <button
                      key={ev.id}
                      onClick={() => onEventClick(ev)}
                      title={ev.title}
                      className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium leading-tight transition-opacity hover:opacity-80
                        ${ev.status === 'completed'
                          ? 'bg-green-100 text-green-600 line-through opacity-70'
                          : ev.status === 'skipped'
                          ? 'bg-stone-100 text-stone-400 line-through'
                          : isOverdue
                          ? 'bg-rose-100 text-rose-700 line-through'
                          : isTemplate
                          ? `${meta.bg} ${meta.color} opacity-60 border border-dashed ${meta.border}`
                          : `${meta.bg} ${meta.color}`
                        }`}
                    >
                      {meta.icon} {ev.title.split(' — ')[0]}
                    </button>
                  );
                })}

                {overflow > 0 && (
                  <p className="pl-1.5 text-[10px] font-medium text-stone-400">
                    +{overflow} more
                  </p>
                )}
              </div>

              {/* Labour hours hint */}
              {labour && labour.hours > 0 && (
                <div className="mt-1 flex items-center gap-0.5 text-[9px] text-stone-300">
                  <Clock className="h-2 w-2" />
                  {labour.hours}h
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Legend ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 border-t border-stone-100 px-4 py-3">
        {(Object.keys(EVENT_META) as Array<keyof typeof EVENT_META>)
          .reduce<{ type: string; label: string; bg: string }[]>((acc, type) => {
            const m = EVENT_META[type];
            if (!acc.some((e) => e.label === m.label)) acc.push({ type, label: m.label, bg: m.bg });
            return acc;
          }, [])
          .map(({ type, label, bg }) => (
            <div key={type} className="flex items-center gap-1 text-[10px] text-stone-500">
              <span className={`inline-block h-2 w-2 rounded-sm ${bg}`} />
              {label}
            </div>
          ))}
      </div>
    </div>
  );
}
