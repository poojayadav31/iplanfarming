import { useState, useCallback } from 'react';
import { CheckCircle2, SkipForward, Filter, Users, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import type { ActivityLogResponse, ActivityLogTask, ActivityLogZone } from '../../types/calendar';
import { EVENT_META, CATEGORY_META } from '../../types/calendar';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2];

interface Filters {
  year: number | '';
  month: number | '';
  status: 'ALL' | 'COMPLETED' | 'SKIPPED';
  zoneId: string;
}

interface Props {
  farmId: string;
  data: ActivityLogResponse;
  onFiltersChange: (f: Partial<Filters>) => void;
  filters: Filters;
  onRowClick: (task: ActivityLogTask) => void;
}

// ── Summary cards ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-xl bg-stone-50 border border-stone-100 px-4 py-3 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-stone-400">{label}</p>
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────

function FilterBar({
  filters,
  zones,
  onChange,
}: {
  filters: Filters;
  zones: ActivityLogZone[];
  onChange: (f: Partial<Filters>) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Filter className="h-4 w-4 text-stone-400 shrink-0" />

      {/* Year */}
      <select
        value={filters.year}
        onChange={(e) => onChange({ year: e.target.value ? Number(e.target.value) : '' })}
        className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        <option value="">All Years</option>
        {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>

      {/* Month */}
      <select
        value={filters.month}
        onChange={(e) => onChange({ month: e.target.value ? Number(e.target.value) : '' })}
        className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        <option value="">All Months</option>
        {MONTH_NAMES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
      </select>

      {/* Status */}
      <div className="flex rounded-xl border border-stone-200 overflow-hidden text-sm font-medium">
        {(['ALL', 'COMPLETED', 'SKIPPED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => onChange({ status: s })}
            className={`px-3 py-2 transition-colors
              ${filters.status === s
                ? s === 'COMPLETED' ? 'bg-green-600 text-white'
                  : s === 'SKIPPED' ? 'bg-stone-500 text-white'
                  : 'bg-stone-800 text-white'
                : 'bg-white text-stone-500 hover:bg-stone-50'
              }`}
          >
            {s === 'ALL' ? 'All' : s === 'COMPLETED' ? '✓ Done' : '⊘ Skipped'}
          </button>
        ))}
      </div>

      {/* Zone */}
      <select
        value={filters.zoneId}
        onChange={(e) => onChange({ zoneId: e.target.value })}
        className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        <option value="">All Zones</option>
        {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
      </select>
    </div>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────

function LogRow({ task, onClick }: { task: ActivityLogTask; onClick: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const meta     = EVENT_META[task.taskType] ?? EVENT_META['field_prep'];
  const catMeta  = CATEGORY_META[task.category];
  const isDone   = task.status === 'COMPLETED';
  const checkedCount = task.checklistItems.filter((i) => i.done).length;
  const totalCount   = task.checklistItems.length;

  const scheduledFmt = new Date(task.scheduledDate).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const completedFmt = task.completedAt
    ? new Date(task.completedAt).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—';

  return (
    <div
      className={`rounded-2xl border transition-all ${
        isDone ? 'border-green-100 bg-green-50/50' : 'border-stone-100 bg-stone-50/50'
      }`}
    >
      {/* Main row */}
      <div
        className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-white/60 transition-colors rounded-2xl"
        onClick={onClick}
      >
        {/* Status icon */}
        <div className={`mt-0.5 shrink-0 flex h-7 w-7 items-center justify-center rounded-full
          ${isDone ? 'bg-green-100' : 'bg-stone-100'}`}>
          {isDone
            ? <CheckCircle2 className="h-4 w-4 text-green-600" />
            : <SkipForward className="h-4 w-4 text-stone-400" />
          }
        </div>

        {/* Task info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm">{meta.icon}</span>
            <span className="text-sm font-semibold text-stone-800 truncate">{task.title}</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${catMeta?.color ?? 'bg-stone-100 text-stone-500'}`}>
              {catMeta?.label ?? task.category}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-stone-400">
            <span>{task.zoneName} · {task.cropName}</span>
            <span className="flex items-center gap-0.5">
              <Users className="h-3 w-3" />{task.labourWorkers}w
            </span>
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />{task.labourHours}h
            </span>
          </div>
        </div>

        {/* Dates + checklist progress */}
        <div className="shrink-0 text-right space-y-0.5">
          <div className="text-xs text-stone-400">
            <span className="text-stone-500 font-medium">Scheduled:</span> {scheduledFmt}
          </div>
          <div className={`text-xs font-medium ${isDone ? 'text-green-600' : 'text-stone-400'}`}>
            {isDone ? `Done: ${completedFmt}` : `Skipped: ${completedFmt}`}
          </div>
          {task.daysLate !== null && task.daysLate > 0 && isDone && (
            <div className="text-[10px] text-amber-600 font-medium">{task.daysLate}d late</div>
          )}
          {totalCount > 0 && (
            <div className={`text-[10px] font-semibold ${checkedCount === totalCount ? 'text-green-600' : 'text-stone-400'}`}>
              {checkedCount}/{totalCount} steps ✓
            </div>
          )}
        </div>

        {/* Expand checklist toggle */}
        {totalCount > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            className="shrink-0 mt-1 rounded-lg p-1 text-stone-400 hover:bg-stone-100 transition-colors"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {/* Expandable checklist preview */}
      {expanded && totalCount > 0 && (
        <div className="px-4 pb-3 space-y-1">
          <div className="border-t border-stone-100 pt-2">
            {task.checklistItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 py-1">
                {item.done
                  ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                  : <div className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-stone-300" />
                }
                <span className={`text-xs ${item.done ? 'text-stone-400 line-through' : 'text-stone-600'}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function ActivityLogPanel({ farmId: _farmId, data, filters, onFiltersChange, onRowClick }: Props) {
  const handleRowClick = useCallback((task: ActivityLogTask) => {
    // Convert ActivityLogTask to a CalendarEvent shape for the drawer
    onRowClick(task);
  }, [onRowClick]);

  return (
    <div className="space-y-4">

      {/* Summary */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Activity Log</p>
          <h2 className="mt-0.5 text-2xl font-bold text-stone-900">{data.farmName}</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard label="Total"     value={data.totalCount}     color="text-stone-800" />
          <SummaryCard label="Completed" value={data.completedCount} color="text-green-600" />
          <SummaryCard label="Skipped"   value={data.skippedCount}   color="text-stone-400" />
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <FilterBar filters={filters} zones={data.zones} onChange={onFiltersChange} />
      </div>

      {/* Task list */}
      {data.tasks.length === 0 ? (
        <div className="rounded-2xl border border-stone-100 bg-stone-50 px-5 py-12 text-center">
          <p className="text-sm font-medium text-stone-500">No activity found for the selected filters</p>
          <p className="mt-1 text-xs text-stone-400">Try changing the year, month, or status filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.tasks.map((task) => (
            <LogRow
              key={task.id}
              task={task}
              onClick={() => handleRowClick(task)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
