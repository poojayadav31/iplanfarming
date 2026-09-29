import { useState, useCallback } from 'react';
import {
  CheckCircle2,
  Circle,
  SkipForward,
  Users,
  Clock,
  Sunrise,
  Sunset,
  PartyPopper,
  TriangleAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { updateCalendarTask } from '../../lib/api';
import { EVENT_META } from '../../types/calendar';
import type { TodayResponse, CalendarEvent } from '../../types/calendar';

interface Props {
  farmId: string;
  data: TodayResponse;
  onTaskUpdated: () => void;
  onEventClick: (event: CalendarEvent) => void;
}

// ── Task row with checkbox ────────────────────────────────────────────────────

function TaskRow({
  event,
  farmId,
  onUpdate,
  onClick,
}: {
  event: CalendarEvent;
  farmId: string;
  onUpdate: () => void;
  onClick: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const meta      = EVENT_META[event.type];
  const isDone    = event.status === 'completed';
  const isSkipped = event.status === 'skipped';
  const dbTaskId  = (event as CalendarEvent & { dbTaskId?: string }).dbTaskId;

  const handleToggle = useCallback(async () => {
    if (!dbTaskId || event.type === 'irrigation') return; // irrigation uses water management flow
    setLoading(true);
    try {
      const nextStatus = isDone ? 'PENDING' : 'COMPLETED';
      await updateCalendarTask(farmId, dbTaskId, { status: nextStatus });
      toast.success(isDone ? 'Task marked pending' : 'Task completed!');
      onUpdate();
    } catch {
      toast.error('Could not update task');
    } finally {
      setLoading(false);
    }
  }, [dbTaskId, farmId, isDone, onUpdate, event.type]);

  const handleSkip = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!dbTaskId || event.type === 'irrigation') return;
    setLoading(true);
    try {
      const nextStatus = isSkipped ? 'PENDING' : 'SKIPPED';
      await updateCalendarTask(farmId, dbTaskId, { status: nextStatus });
      toast.success(isSkipped ? 'Task restored' : 'Task skipped');
      onUpdate();
    } catch {
      toast.error('Could not update task');
    } finally {
      setLoading(false);
    }
  }, [dbTaskId, farmId, isSkipped, onUpdate, event.type]);

  return (
    <div
      className={`group flex items-start gap-3 rounded-2xl border px-4 py-3 transition-all
        ${isDone
          ? 'border-green-100 bg-green-50'
          : isSkipped
          ? 'border-stone-100 bg-stone-50 opacity-60'
          : 'border-stone-100 bg-white hover:border-stone-200 hover:shadow-sm'
        }`}
    >
      {/* Checkbox — disabled for irrigation events (managed in Water section) */}
      <button
        onClick={handleToggle}
        disabled={loading || event.type === 'irrigation'}
        className={`mt-0.5 shrink-0 transition-transform active:scale-90
          ${event.type === 'irrigation' ? 'cursor-default opacity-40' : 'cursor-pointer'}`}
        aria-label={isDone ? 'Mark as pending' : 'Mark as done'}
      >
        {isDone
          ? <CheckCircle2 className="h-5 w-5 text-green-600" />
          : <Circle className={`h-5 w-5 ${isSkipped ? 'text-stone-300' : 'text-stone-300 group-hover:text-stone-400'}`} />
        }
      </button>

      {/* Task details — clickable for drawer */}
      <button
        onClick={onClick}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{meta.icon}</span>
          <span
            className={`text-sm font-medium leading-snug
              ${isDone ? 'text-stone-400 line-through' : isSkipped ? 'text-stone-400 line-through' : 'text-stone-800'}`}
          >
            {event.title.split(' — ')[0]}
          </span>
          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${meta.bg} ${meta.color}`}>
            {meta.label}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-stone-400">
          {event.zoneName} · {event.cropName}
          {' · '}{event.labourWorkers} workers · {event.labourHours}h
          {event.checklistItems && event.checklistItems.length > 0 && (
            <span className={`ml-1.5 font-medium ${
              event.checklistItems.every((i) => i.done) ? 'text-green-600' : 'text-stone-500'
            }`}>
              · {event.checklistItems.filter((i) => i.done).length}/{event.checklistItems.length} ✓
            </span>
          )}
        </p>
      </button>

      {/* Skip button (lifecycle tasks only) */}
      {event.type !== 'irrigation' && !isDone && (
        <button
          onClick={handleSkip}
          disabled={loading}
          title={isSkipped ? 'Restore task' : 'Skip task'}
          className="shrink-0 rounded-lg p-1 text-stone-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-stone-100 hover:text-stone-500"
        >
          <SkipForward className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ── Main TodayPanel component ─────────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export default function TodayPanel({ farmId, data, onTaskUpdated, onEventClick }: Props) {
  const [showMissedInline, setShowMissedInline] = useState(false);

  const dateObj     = new Date();
  const dayName     = DAY_NAMES[dateObj.getDay()];
  const dateDisplay = `${dateObj.getDate()} ${MONTH_NAMES[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

  const allDone = data.totalTasks > 0 && data.completedToday === data.totalTasks;

  return (
    <div className="space-y-4">

      {/* ── Header card ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">{dayName}</p>
            <h2 className="mt-0.5 text-2xl font-bold text-stone-900">{dateDisplay}</h2>
          </div>

          {/* Progress ring summary */}
          <div className="text-right">
            <p className="text-3xl font-bold text-stone-900">
              {data.completedToday}
              <span className="text-lg font-normal text-stone-400">/{data.totalTasks}</span>
            </p>
            <p className="text-xs text-stone-400">tasks done</p>
          </div>
        </div>

        {/* Progress bar */}
        {data.totalTasks > 0 && (
          <div className="mt-4 h-2 w-full rounded-full bg-stone-100">
            <div
              className="h-2 rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${Math.round((data.completedToday / data.totalTasks) * 100)}%` }}
            />
          </div>
        )}

        {/* Labour summary */}
        <div className="mt-4 flex gap-4 text-sm text-stone-600">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-stone-400" />
            <span><span className="font-semibold text-stone-800">{data.totalWorkers}</span> workers needed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-stone-400" />
            <span><span className="font-semibold text-stone-800">{data.totalHours}</span>h total work</span>
          </div>
        </div>

        {/* Missed tasks badge */}
        {data.missedCount > 0 && (
          <button
            onClick={() => setShowMissedInline((v) => !v)}
            className="mt-3 flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-100"
          >
            <TriangleAlert className="h-3.5 w-3.5" />
            {data.missedCount} missed task{data.missedCount > 1 ? 's' : ''} from previous days
            {showMissedInline ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
          </button>
        )}
      </div>

      {/* ── All done celebration ──────────────────────────────────────────── */}
      {allDone && (
        <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
          <PartyPopper className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">All tasks done for today!</p>
            <p className="text-xs text-green-600">Great work. Come back tomorrow for the next schedule.</p>
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {data.totalTasks === 0 && (
        <div className="rounded-2xl border border-stone-100 bg-stone-50 px-5 py-10 text-center">
          <p className="text-sm font-medium text-stone-500">No tasks scheduled for today</p>
          <p className="mt-1 text-xs text-stone-400">Assign crops to your zones to generate a full schedule.</p>
        </div>
      )}

      {/* ── Morning tasks ─────────────────────────────────────────────────── */}
      {data.morning.length > 0 && (
        <section className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-3">
            <Sunrise className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-stone-700">Morning Tasks</h3>
            <span className="ml-auto rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
              {data.morning.filter((e) => e.status === 'completed').length}/{data.morning.length}
            </span>
          </div>
          <div className="space-y-2 p-3">
            {data.morning.map((ev) => (
              <TaskRow
                key={ev.id}
                event={ev}
                farmId={farmId}
                onUpdate={onTaskUpdated}
                onClick={() => onEventClick(ev)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Afternoon tasks ───────────────────────────────────────────────── */}
      {data.afternoon.length > 0 && (
        <section className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-3">
            <Sunset className="h-4 w-4 text-orange-400" />
            <h3 className="text-sm font-semibold text-stone-700">Afternoon Tasks</h3>
            <span className="ml-auto rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">
              {data.afternoon.filter((e) => e.status === 'completed').length}/{data.afternoon.length}
            </span>
          </div>
          <div className="space-y-2 p-3">
            {data.afternoon.map((ev) => (
              <TaskRow
                key={ev.id}
                event={ev}
                farmId={farmId}
                onUpdate={onTaskUpdated}
                onClick={() => onEventClick(ev)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
