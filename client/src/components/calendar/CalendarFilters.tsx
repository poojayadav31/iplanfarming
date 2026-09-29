import { Filter } from 'lucide-react';
import type { ZoneMeta, CalendarFilters as Filters } from '../../types/calendar';
import { CATEGORY_META } from '../../types/calendar';

interface Props {
  zoneMeta: ZoneMeta[];
  filters: Filters;
  onChange: (f: Partial<Filters>) => void;
}

const ALL = '';

export default function CalendarFilters({ zoneMeta, filters, onChange }: Props) {
  const cropNames = [...new Set(zoneMeta.map((z) => z.cropName))];

  const selectCls =
    'rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-400 uppercase tracking-wider">
        <Filter className="h-3.5 w-3.5" />
        Filter
      </div>

      {/* Zone filter */}
      <select
        value={filters.zoneId}
        onChange={(e) => onChange({ zoneId: e.target.value })}
        className={selectCls}
      >
        <option value={ALL}>All Zones</option>
        {zoneMeta.map((z) => (
          <option key={z.zoneId} value={z.zoneId}>
            {z.zoneName}
          </option>
        ))}
      </select>

      {/* Crop filter */}
      <select
        value={filters.cropName}
        onChange={(e) => onChange({ cropName: e.target.value })}
        className={selectCls}
      >
        <option value={ALL}>All Crops</option>
        {cropNames.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {/* Category filter */}
      <select
        value={filters.category}
        onChange={(e) => onChange({ category: e.target.value })}
        className={selectCls}
      >
        <option value={ALL}>All Categories</option>
        {(Object.keys(CATEGORY_META) as Array<keyof typeof CATEGORY_META>).map((cat) => (
          <option key={cat} value={cat}>
            {CATEGORY_META[cat].label}
          </option>
        ))}
      </select>

      {/* Clear button — only shown when any filter is active */}
      {(filters.zoneId || filters.cropName || filters.category) && (
        <button
          onClick={() => onChange({ zoneId: ALL, cropName: ALL, category: ALL })}
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-100 transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
