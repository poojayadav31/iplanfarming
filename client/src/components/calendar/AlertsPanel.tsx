import { TriangleAlert, Droplets, Wheat, Clock } from 'lucide-react';
import type { CalendarAlerts, CalendarEvent } from '../../types/calendar';

interface Props {
  alerts: CalendarAlerts;
  onEventClick: (event: CalendarEvent) => void;
}

function AlertRow({
  event,
  icon: Icon,
  iconColor,
  badge,
  badgeColor,
  onClick,
}: {
  event: CalendarEvent;
  icon: React.ElementType;
  iconColor: string;
  badge: string;
  badgeColor: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-xl border border-stone-100 bg-stone-50 px-4 py-3 text-left transition-colors hover:bg-white hover:border-stone-200"
    >
      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconColor}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-stone-800">{event.title}</p>
        <p className="mt-0.5 text-xs text-stone-400">
          {new Date(event.date).toLocaleDateString('en-IN', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
          })}
          {' · '}
          {event.zoneName} · {event.cropName}
        </p>
      </div>
      <span className={`shrink-0 self-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeColor}`}>
        {badge}
      </span>
    </button>
  );
}

export default function AlertsPanel({ alerts, onEventClick }: Props) {
  const total =
    alerts.deficitIrrigations.length +
    alerts.harvestsOpening.length +
    alerts.overdueTasks.length;

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-green-100 bg-green-50 px-5 py-4 text-center">
        <p className="text-sm font-medium text-green-700">All clear — no alerts this week</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <TriangleAlert className="h-4 w-4 text-amber-500" />
          <h3 className="font-semibold text-stone-800">Upcoming Alerts</h3>
        </div>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
          {total}
        </span>
      </div>

      <div className="space-y-1 p-3">

        {/* Deficit irrigations */}
        {alerts.deficitIrrigations.length > 0 && (
          <div>
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-rose-500">
              Water Deficit
            </p>
            {alerts.deficitIrrigations.map((ev) => (
              <AlertRow
                key={ev.id}
                event={ev}
                icon={Droplets}
                iconColor="bg-rose-100 text-rose-600"
                badge={`${Math.round(ev.details.irrigation?.overdraftLiters ?? 0).toLocaleString('en-IN')} L deficit`}
                badgeColor="bg-rose-100 text-rose-700"
                onClick={() => onEventClick(ev)}
              />
            ))}
          </div>
        )}

        {/* Harvest windows opening in 14 days */}
        {alerts.harvestsOpening.length > 0 && (
          <div>
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-600">
              Harvest Opening Soon
            </p>
            {alerts.harvestsOpening.map((ev) => (
              <AlertRow
                key={ev.id}
                event={ev}
                icon={Wheat}
                iconColor="bg-amber-100 text-amber-600"
                badge="≤ 14 days"
                badgeColor="bg-amber-100 text-amber-700"
                onClick={() => onEventClick(ev)}
              />
            ))}
          </div>
        )}

        {/* Overdue tasks */}
        {alerts.overdueTasks.length > 0 && (
          <div>
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
              Overdue Tasks
            </p>
            {alerts.overdueTasks.slice(0, 5).map((ev) => (
              <AlertRow
                key={ev.id}
                event={ev}
                icon={Clock}
                iconColor="bg-stone-100 text-stone-500"
                badge="Overdue"
                badgeColor="bg-stone-100 text-stone-600"
                onClick={() => onEventClick(ev)}
              />
            ))}
            {alerts.overdueTasks.length > 5 && (
              <p className="px-4 py-2 text-xs text-stone-400">
                +{alerts.overdueTasks.length - 5} more overdue tasks
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
