import { useState, useCallback, useEffect } from 'react';
import { X, MapPin, Leaf, Users, Clock, Droplets, FlaskConical, TriangleAlert, Info, CheckCircle2, Circle, CheckSquare, PartyPopper, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { CalendarEvent, ChecklistItem } from '../../types/calendar';
import { EVENT_META } from '../../types/calendar';
import { updateChecklistItem, updateCalendarTask, deleteCalendarTask } from '../../lib/api';

interface Props {
  event: CalendarEvent | null;
  farmId: string;
  onClose: () => void;
  onTaskUpdated: () => void;
  onEditCustomTask?: (event: CalendarEvent) => void;
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-stone-400" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400">{title}</h4>
      </div>
      {children}
    </div>
  );
}

const fmtL = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}K L` : `${Math.round(n)} L`;

// ── Checklist section ─────────────────────────────────────────────────────────

function ChecklistSection({
  items,
  farmId,
  taskId,
  onUpdate,
}: {
  items: ChecklistItem[];
  farmId: string;
  taskId: string;
  onUpdate: (newItems: ChecklistItem[]) => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  const doneCount = items.filter((i) => i.done).length;
  const allDone   = doneCount === items.length;

  const handleToggle = useCallback(async (item: ChecklistItem) => {
    setLoading(item.id);
    const newDone = !item.done;
    const updated = items.map((i) => i.id === item.id ? { ...i, done: newDone } : i);
    onUpdate(updated);
    try {
      await updateChecklistItem(farmId, taskId, { itemId: item.id, done: newDone });
    } catch {
      onUpdate(items);
      toast.error('Could not update checklist');
    } finally {
      setLoading(null);
    }
  }, [items, farmId, taskId, onUpdate]);

  const handleMarkAll = useCallback(async () => {
    const allChecked = items.map((i) => ({ ...i, done: true }));
    onUpdate(allChecked);
    setLoading('all');
    try {
      await Promise.all(
        items
          .filter((i) => !i.done)
          .map((i) => updateChecklistItem(farmId, taskId, { itemId: i.id, done: true }))
      );
    } catch {
      onUpdate(items);
      toast.error('Could not update checklist');
    } finally {
      setLoading(null);
    }
  }, [items, farmId, taskId, onUpdate]);

  return (
    <div>
      {/* Header with progress */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CheckSquare className="h-3.5 w-3.5 text-stone-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Checklist</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${allDone ? 'text-green-600' : 'text-stone-500'}`}>
            {doneCount}/{items.length}
          </span>
          {!allDone && (
            <button
              onClick={handleMarkAll}
              disabled={loading === 'all'}
              className="rounded-lg border border-stone-200 px-2 py-0.5 text-[10px] font-semibold text-stone-500 hover:bg-stone-50 transition-colors"
            >
              Mark all done
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
        <div
          className="h-1.5 rounded-full bg-green-500 transition-all duration-500"
          style={{ width: `${items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0}%` }}
        />
      </div>

      {/* All done celebration */}
      {allDone && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          <PartyPopper className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium">All steps completed!</span>
        </div>
      )}

      {/* Checklist items */}
      <div className="space-y-1.5">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleToggle(item)}
            disabled={loading === item.id || loading === 'all'}
            className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all active:scale-[0.99]
              ${item.done
                ? 'border-green-100 bg-green-50'
                : 'border-stone-100 bg-white hover:border-stone-200 hover:bg-stone-50'
              }`}
          >
            {item.done
              ? <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-green-600" />
              : <Circle className="h-4.5 w-4.5 shrink-0 text-stone-300 group-hover:text-stone-400" />
            }
            <span className={`text-sm leading-snug ${item.done ? 'text-stone-400 line-through' : 'text-stone-700'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main drawer ───────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  overdue:   'bg-rose-100 text-rose-700',
  pending:   'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  skipped:   'bg-stone-100 text-stone-500',
  template:  'bg-stone-100 text-stone-400',
};

export default function EventDetailDrawer({ event, farmId, onClose, onTaskUpdated, onEditCustomTask }: Props) {
  // All hooks must be called unconditionally — before any early return
  const [localItems,     setLocalItems]     = useState<ChecklistItem[] | null>(null);
  const [statusOverride, setStatusOverride] = useState<string | null>(null);
  const [actionLoading,  setActionLoading]  = useState(false);
  const [deleteConfirm,  setDeleteConfirm]  = useState(false);

  // Reset local state whenever a different event is opened
  useEffect(() => {
    if (event) {
      setLocalItems(event.checklistItems ?? null);
      setStatusOverride(null);
    }
  }, [event?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChecklistUpdate = useCallback((newItems: ChecklistItem[]) => {
    setLocalItems(newItems);
    if (newItems.every((i) => i.done)) {
      setStatusOverride('completed');
    }
    onTaskUpdated();
  }, [onTaskUpdated]);

  const handleMarkComplete = useCallback(async () => {
    if (!event?.dbTaskId || event.type === 'irrigation') return;
    setActionLoading(true);
    const currentStatus = statusOverride ?? event.status;
    const next = currentStatus === 'completed' ? 'PENDING' : 'COMPLETED';

    // Optimistically tick all checklist items when marking done
    const currentItems = localItems ?? event.checklistItems ?? [];
    if (next === 'COMPLETED' && currentItems.length > 0) {
      setLocalItems(currentItems.map((i) => ({ ...i, done: true })));
      setStatusOverride('completed');
    } else if (next === 'PENDING') {
      setStatusOverride('pending');
    }

    try {
      await updateCalendarTask(farmId, event.dbTaskId, { status: next });
      toast.success(next === 'COMPLETED' ? 'Task completed!' : 'Task marked pending');
      onTaskUpdated();
    } catch {
      // Revert optimistic updates
      setLocalItems(currentItems);
      setStatusOverride(null);
      toast.error('Could not update task');
    } finally {
      setActionLoading(false);
    }
  }, [event, farmId, statusOverride, onTaskUpdated]);

  const handleSkip = useCallback(async () => {
    if (!event?.dbTaskId || event.type === 'irrigation') return;
    setActionLoading(true);
    const currentStatus = statusOverride ?? event.status;
    try {
      const next = currentStatus === 'skipped' ? 'PENDING' : 'SKIPPED';
      await updateCalendarTask(farmId, event.dbTaskId, { status: next });
      setStatusOverride(next.toLowerCase());
      toast.success(next === 'SKIPPED' ? 'Task skipped' : 'Task restored');
      onTaskUpdated();
    } catch {
      toast.error('Could not update task');
    } finally {
      setActionLoading(false);
    }
  }, [event, farmId, statusOverride, onTaskUpdated]);

  const handleDelete = useCallback(async () => {
    if (!event?.dbTaskId) return;
    setActionLoading(true);
    try {
      await deleteCalendarTask(farmId, event.dbTaskId);
      toast.success('Activity deleted');
      onTaskUpdated();
      onClose();
    } catch {
      toast.error('Could not delete activity');
    } finally {
      setActionLoading(false);
      setDeleteConfirm(false);
    }
  }, [event, farmId, onTaskUpdated, onClose]);

  // Early return AFTER all hooks
  if (!event) return null;

  const meta          = EVENT_META[event.type] ?? EVENT_META['custom'];
  const irr           = event.details.irrigation;
  const recipe        = event.details.recipe;
  const advisory      = event.details.soilAdvisory;
  const dbTaskId      = event.dbTaskId;
  const currentStatus = statusOverride ?? event.status;
  const items         = localItems ?? event.checklistItems ?? [];
  const isCustom      = event.isCustom ?? false;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl">

        {/* Header */}
        <div className={`flex items-start gap-3 border-b border-stone-100 px-5 py-5 ${meta.bg}`}>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${meta.border} bg-white text-xl`}>
            {meta.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${meta.color}`}>
              {meta.label}
            </p>
            <h3 className="mt-0.5 text-sm font-bold text-stone-800 leading-snug">
              {event.title}
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              {new Date(event.date).toLocaleDateString('en-IN', {
                weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
              })}
              {' · '}
              {event.priority === 'morning' ? '☀️ Morning' : '🌅 Afternoon'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-400 hover:text-stone-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Status + action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {isCustom && (
              <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-semibold text-pink-700">
                📝 Custom
              </span>
            )}
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE[currentStatus] ?? STATUS_BADGE.scheduled}`}>
              {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
            </span>
            {dbTaskId && event.type !== 'irrigation' && (
              <>
                <button
                  onClick={handleMarkComplete}
                  disabled={actionLoading}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors
                    ${currentStatus === 'completed'
                      ? 'border border-stone-200 bg-white text-stone-500 hover:bg-stone-50'
                      : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {currentStatus === 'completed' ? 'Undo' : 'Mark done'}
                </button>
                {currentStatus !== 'completed' && (
                  <button
                    onClick={handleSkip}
                    disabled={actionLoading}
                    className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-500 hover:bg-stone-50 transition-colors"
                  >
                    {currentStatus === 'skipped' ? 'Restore' : 'Skip'}
                  </button>
                )}
              </>
            )}
            {currentStatus === 'template' && (
              <p className="text-xs text-stone-400">
                Planned — generate schedules in Water Management to activate
              </p>
            )}
          </div>

          {/* Edit / Delete — custom tasks only */}
          {isCustom && dbTaskId && (
            <div className="flex gap-2">
              <button
                onClick={() => { onEditCustomTask?.(event); onClose(); }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-stone-200 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit Activity
              </button>
              {!deleteConfirm ? (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-200 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              ) : (
                <div className="flex flex-1 gap-1">
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="flex-1 rounded-xl border border-stone-200 py-2 text-xs font-semibold text-stone-500 hover:bg-stone-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={actionLoading}
                    className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60 transition-colors"
                  >
                    Confirm Delete
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Zone & Crop */}
          <Section title="Location & Crop" icon={MapPin}>
            <div className="rounded-xl border border-stone-100 bg-stone-50 px-4 py-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">Zone</span>
                <span className="font-medium text-stone-800">{event.zoneName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Crop</span>
                <span className="flex items-center gap-1 font-medium text-stone-800">
                  <Leaf className="h-3 w-3 text-green-600" />
                  {event.cropName}
                </span>
              </div>
            </div>
          </Section>

          {/* Labour */}
          <Section title="Labour Required" icon={Users}>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-stone-100 bg-stone-50 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-stone-800">{event.labourWorkers}</p>
                <p className="text-xs text-stone-400">Workers</p>
              </div>
              <div className="rounded-xl border border-stone-100 bg-stone-50 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-stone-800">{event.labourHours}</p>
                <p className="text-xs text-stone-400">Hours</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-stone-400">
              <Clock className="inline h-3 w-3 mr-0.5" />
              Estimated {event.labourWorkers} × {event.labourHours}h ={' '}
              {event.labourWorkers * event.labourHours} person-hours total
            </p>
          </Section>

          {/* Checklist */}
          {items.length > 0 && dbTaskId && (
            <ChecklistSection
              items={items}
              farmId={farmId}
              taskId={dbTaskId}
              onUpdate={handleChecklistUpdate}
            />
          )}

          {/* Irrigation details */}
          {irr && (
            <Section title="Water Details" icon={Droplets}>
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-500">Required</span>
                  <span className="font-semibold text-blue-700">{fmtL(irr.waterLiters)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Base (crop)</span>
                  <span className="text-stone-600">{fmtL(irr.baseWaterLiters)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Soil multiplier</span>
                  <span className="text-stone-600">{irr.soilRetentionMultiplier}×</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Method</span>
                  <span className="font-medium text-stone-700">{irr.method}</span>
                </div>
                {irr.sourceName && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Source</span>
                    <span className="font-medium text-stone-700">
                      {irr.sourceName} ({irr.sourceType})
                    </span>
                  </div>
                )}
                {irr.completedLiters != null && (
                  <div className="flex justify-between border-t border-blue-100 pt-2">
                    <span className="text-stone-500">Completed</span>
                    <span className="font-semibold text-green-700">{fmtL(irr.completedLiters)}</span>
                  </div>
                )}
              </div>

              {irr.isDeficit && irr.overdraftLiters > 0 && (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Water deficit of {fmtL(irr.overdraftLiters)} — source ran out mid-task.
                    Refill source or reduce area irrigated.
                  </span>
                </div>
              )}
            </Section>
          )}

          {/* Recipe */}
          {recipe && (
            <Section title={`${recipe.name} Recipe (Scaled)`} icon={FlaskConical}>
              <div className="rounded-xl border border-green-100 bg-green-50 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-green-100 text-xs font-semibold uppercase tracking-wider text-green-600">
                      <th className="px-4 py-2 text-left">Ingredient</th>
                      <th className="px-4 py-2 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-green-50">
                    {Object.values(recipe.ingredients).map((ing) => (
                      <tr key={ing.label}>
                        <td className="px-4 py-2 text-stone-700">{ing.label}</td>
                        <td className="px-4 py-2 text-right font-semibold text-green-700">
                          {ing.amount} {ing.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="px-4 py-2 text-[10px] text-stone-400 border-t border-green-100">
                  Quantities scaled to zone area
                </p>
              </div>
            </Section>
          )}

          {/* Soil advisory */}
          {advisory && (
            <Section title="Soil Advisory" icon={Info}>
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                {advisory}
              </div>
            </Section>
          )}

          {/* Notes */}
          {event.details.notes && (
            <Section title="Notes" icon={Info}>
              <p className="text-sm text-stone-600">{event.details.notes}</p>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
