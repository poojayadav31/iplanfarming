import { Sunrise, Sunset, CalendarDays } from 'lucide-react';
import type { CalendarEvent } from '../../types/calendar';
import { EVENT_META } from '../../types/calendar';

interface Props {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function WeekAgendaStrip({ events, onEventClick }: Props) {
  // Build 7-day window starting today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  // Group events by date
  const byDate: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    if (!byDate[ev.date]) byDate[ev.date] = [];
    byDate[ev.date].push(ev);
  }

  const totalEvents = days.reduce(
    (sum, d) => sum + (byDate[isoDate(d)]?.length ?? 0),
    0
  );

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-4">
        <CalendarDays className="h-4 w-4 text-green-700" />
        <h3 className="font-semibold text-stone-800">7-Day Lookahead</h3>
        {totalEvents > 0 && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            {totalEvents} tasks
          </span>
        )}
      </div>

      <div className="grid grid-cols-7 divide-x divide-stone-100">
        {days.map((d) => {
          const dateStr    = isoDate(d);
          const dayEvents  = byDate[dateStr] ?? [];
          const morning    = dayEvents.filter((e) => e.priority === 'morning');
          const afternoon  = dayEvents.filter((e) => e.priority === 'afternoon');
          const isToday    = d.getTime() === today.getTime();
          const isWeekend  = d.getDay() === 0 || d.getDay() === 6;

          return (
            <div
              key={dateStr}
              className={`min-h-[160px] flex flex-col ${isToday ? 'bg-green-50' : isWeekend ? 'bg-stone-50/50' : ''}`}
            >
              {/* Day header */}
              <div className={`border-b px-2 py-1.5 text-center ${isToday ? 'border-green-200' : 'border-stone-100'}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                  {d.toLocaleDateString('en-IN', { weekday: 'short' })}
                </p>
                <p className={`text-sm font-bold ${isToday ? 'text-green-700' : 'text-stone-700'}`}>
                  {d.getDate()}
                </p>
              </div>

              {dayEvents.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                  <span className="text-[9px] text-stone-300">—</span>
                </div>
              ) : (
                <div className="flex flex-1 flex-col gap-1 p-1.5 text-[9px]">
                  {/* Morning tasks */}
                  {morning.length > 0 && (
                    <div>
                      <div className="mb-0.5 flex items-center gap-0.5 text-amber-500">
                        <Sunrise className="h-2.5 w-2.5" />
                        <span className="font-semibold uppercase tracking-wide">AM</span>
                      </div>
                      <div className="space-y-0.5">
                        {morning.map((ev) => {
                          const meta = EVENT_META[ev.type];
                          return (
                            <button
                              key={ev.id}
                              onClick={() => onEventClick(ev)}
                              title={ev.title}
                              className={`block w-full truncate rounded px-1 py-0.5 text-left font-medium transition-opacity hover:opacity-75
                                ${ev.status === 'overdue'
                                  ? 'bg-rose-100 text-rose-700 line-through'
                                  : ev.status === 'template'
                                  ? `${meta.bg} ${meta.color} opacity-60`
                                  : `${meta.bg} ${meta.color}`
                                }`}
                            >
                              {meta.icon} {ev.title.split(' — ')[0]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Afternoon tasks */}
                  {afternoon.length > 0 && (
                    <div>
                      <div className="mb-0.5 flex items-center gap-0.5 text-orange-400">
                        <Sunset className="h-2.5 w-2.5" />
                        <span className="font-semibold uppercase tracking-wide">PM</span>
                      </div>
                      <div className="space-y-0.5">
                        {afternoon.map((ev) => {
                          const meta = EVENT_META[ev.type];
                          return (
                            <button
                              key={ev.id}
                              onClick={() => onEventClick(ev)}
                              title={ev.title}
                              className={`block w-full truncate rounded px-1 py-0.5 text-left font-medium transition-opacity hover:opacity-75
                                ${ev.status === 'overdue'
                                  ? 'bg-rose-100 text-rose-700 line-through'
                                  : ev.status === 'template'
                                  ? `${meta.bg} ${meta.color} opacity-60`
                                  : `${meta.bg} ${meta.color}`
                                }`}
                            >
                              {meta.icon} {ev.title.split(' — ')[0]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
