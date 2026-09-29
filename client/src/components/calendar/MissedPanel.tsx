import { useState, useCallback } from 'react';
import { TriangleAlert, CheckCircle2, SkipForward, Loader2, CalendarX } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateCalendarTask } from '../../lib/api';
import { EVENT_META } from '../../types/calendar';
import type { MissedTasksResponse, CalendarEvent } from '../../types/calendar';

interface Props {
  farmId: string;
  data: MissedTasksResponse;
  onTaskUpdated: () => void;
  onEventClick: (event: CalendarEvent) => void;
}

function MissedRow({
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
  const meta     = EVENT_META[event.type];
  const dbTaskId = (event as CalendarEvent & { dbTaskId?: string }).dbTaskId;

  const act = useCallback(async (status: 'COMPLETED' | 'SKIPPED') => {
    if (!dbTaskId) return;
    setLoading(true);
    try {
      await updateCalendarTask(farmId, dbTaskId, { status });
      toast.success(status === 'COMPLETED' ? 'Marked as done (late)' : 'Task skipped');
      onUpdate();
    } catch {
      toast.error('Could not update task');
    } finally {
      setLoading(false);
    }
  }, [dbTaskId, farmId, onUpdate]);

  const dateObj   = new Date(event.date);
  const daysAgo   = Math.round((Date.now() - dateObj.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="group flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50/50 px-4 py-3 transition-all hover:border-rose-200 hover:bg-white">

      {/* Icon */}
      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
        <span className="text-sm">{meta.icon}</span>
      </div>

      {/* Task info */}
      <button onClick={onClick} className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium text-stone-800">
            {event.title.split(' — ')[0]}
          </span>
          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${meta.bg} ${meta.color}`}>
            {meta.label}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-stone-500">
          {dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          {' · '}{event.zoneName} · {event.cropName}
        </p>
        <p className={`mt-0.5 text-[10px] font-semibold ${daysAgo <= 3 ? 'text-amber-600' : 'text-rose-500'}`}>
          {daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`}
        </p>
      </button>

      {/* Action buttons */}
      <div className="flex shrink-0 gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => act('COMPLETED')}
          disabled={loading}
          title="Mark as done (late)"
          className="flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-700 hover:bg-green-100 transition-colors"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
          Done
        </button>
        <button
          onClick={() => act('SKIPPED')}
          disabled={loading}
          title="Skip this task"
          className="flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-[10px] font-semibold text-stone-500 hover:bg-stone-100 transition-colors"
        >
          <SkipForward className="h-3 w-3" />
          Skip
        </button>
      </div>
    </div>
  );
}

export default function MissedPanel({ farmId, data, onTaskUpdated, onEventClick }: Props) {
  const [expanded, setExpanded] = useState(true);
  const SHOW_LIMIT = 10;
  const [showAll, setShowAll] = useState(false);

  if (data.missedCount === 0) {
    return (
      <div className="rounded-2xl border border-green-100 bg-green-50 px-5 py-4">
        <p className="text-sm font-medium text-green-700">No missed tasks — you are all caught up!</p>
      </div>
    );
  }

  const visible = showAll ? data.tasks : data.tasks.slice(0, SHOW_LIMIT);

  return (
    <div className="rounded-2xl border border-rose-200 bg-white shadow-sm overflow-hidden">

      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between border-b border-rose-100 px-5 py-4 text-left hover:bg-rose-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CalendarX className="h-4 w-4 text-rose-500" />
          <h3 className="font-semibold text-stone-800">Missed Tasks</h3>
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-600">
            {data.missedCount}
          </span>
        </div>
        <TriangleAlert className={`h-4 w-4 transition-transform ${expanded ? '' : 'rotate-180'} text-rose-400`} />
      </button>

      {expanded && (
        <div className="space-y-2 p-3">
          {visible.map((ev) => (
            <MissedRow
              key={ev.id}
              event={ev}
              farmId={farmId}
              onUpdate={onTaskUpdated}
              onClick={() => onEventClick(ev)}
            />
          ))}

          {data.tasks.length > SHOW_LIMIT && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full rounded-xl border border-stone-200 py-2.5 text-xs font-medium text-stone-500 hover:bg-stone-50 transition-colors"
            >
              Show {data.tasks.length - SHOW_LIMIT} more missed tasks
            </button>
          )}

          <p className="pt-1 text-center text-[10px] text-stone-400">
            Hover a task to mark it done (late) or skip it permanently
          </p>
        </div>
      )}
    </div>
  );
}
