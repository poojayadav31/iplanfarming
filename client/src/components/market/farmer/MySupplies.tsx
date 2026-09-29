import { useEffect, useState, useMemo } from 'react';
import { getMySupplies, updateSupply } from '../../../lib/api';
import type { Supply, ProduceGrade, UpdateSupplyPayload } from '../../../types/market';
import {
  Package, Eye, EyeOff, Edit2, Check, X,
  ChevronDown, ChevronUp, Filter, TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  UPCOMING:       'bg-stone-100 text-stone-500',
  AVAILABLE:      'bg-green-100 text-green-700',
  PARTIALLY_SOLD: 'bg-amber-100 text-amber-700',
  SOLD_OUT:       'bg-rose-100 text-rose-600',
  EXPIRED:        'bg-stone-200 text-stone-500',
};

export const GRADE_COLORS: Record<ProduceGrade, string> = {
  A: 'bg-green-100 text-green-700',
  B: 'bg-amber-100 text-amber-700',
  C: 'bg-rose-100 text-rose-600',
};

const STATUS_LABELS: Record<string, string> = {
  UPCOMING: 'Upcoming',
  AVAILABLE: 'Available',
  PARTIALLY_SOLD: 'Partial',
  SOLD_OUT: 'Sold Out',
  EXPIRED: 'Expired',
};

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function MySupplies() {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UpdateSupplyPayload>({});
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [collapsedCrops, setCollapsedCrops] = useState<Set<string>>(new Set());

  // Filters
  const [filterCrop, setFilterCrop]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const load = async () => {
    setLoading(true);
    try { setSupplies(await getMySupplies()); }
    catch { toast.error('Failed to load supplies'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const startEdit = (s: Supply) => {
    setEditId(s.id);
    setEditForm({
      pricePerKg: s.pricePerKg,
      availableQuantityKg: s.availableQuantityKg,
      minOrderKg: s.minOrderKg,
      grade: s.grade,
      form: s.form,
      notes: s.notes ?? '',
    });
  };

  const saveEdit = async (supplyId: string) => {
    setSaving(true);
    try {
      const updated = await updateSupply(supplyId, editForm);
      setSupplies((prev) => prev.map((s) => (s.id === supplyId ? { ...s, ...updated } : s)));
      setEditId(null);
      toast.success('Supply updated');
    } catch { toast.error('Failed to update supply'); }
    finally { setSaving(false); }
  };

  const togglePublish = async (s: Supply, forceTo?: boolean) => {
    const next = forceTo !== undefined ? forceTo : !s.isPublished;
    if (s.isPublished === next) return; // already at desired state
    try {
      const updated = await updateSupply(s.id, { isPublished: next });
      setSupplies((prev) => prev.map((x) => (x.id === s.id ? { ...x, ...updated } : x)));
      if (forceTo === undefined) {
        toast.success(updated.isPublished ? 'Published — customers can now see it' : 'Supply hidden');
      }
    } catch { toast.error('Failed to update supply'); }
  };

  const toggleCrop = (crop: string) => {
    setCollapsedCrops((prev) => {
      const next = new Set(prev);
      next.has(crop) ? next.delete(crop) : next.add(crop);
      return next;
    });
  };

  // Derived: unique crops for filter dropdown
  const cropNames = useMemo(
    () => Array.from(new Set(supplies.map((s) => s.cropName))).sort(),
    [supplies],
  );

  // Filtered + grouped
  const filtered = useMemo(() => {
    return supplies.filter((s) => {
      if (filterCrop   && s.cropName !== filterCrop)   return false;
      if (filterStatus && s.status   !== filterStatus) return false;
      return true;
    });
  }, [supplies, filterCrop, filterStatus]);

  const byCrop = useMemo(() => {
    const map: Record<string, Supply[]> = {};
    for (const s of filtered) {
      if (!map[s.cropName]) map[s.cropName] = [];
      map[s.cropName].push(s);
    }
    // Sort each group: AVAILABLE first, then by harvest date
    const ORDER = { AVAILABLE: 0, PARTIALLY_SOLD: 1, UPCOMING: 2, SOLD_OUT: 3, EXPIRED: 4 };
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => {
        const sd = (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9);
        if (sd !== 0) return sd;
        return new Date(a.predictedHarvestDate).getTime() - new Date(b.predictedHarvestDate).getTime();
      });
    }
    return map;
  }, [filtered]);

  // Summary stats
  const totalAvailableKg  = supplies.filter((s) => s.status === 'AVAILABLE' || s.status === 'PARTIALLY_SOLD').reduce((a, s) => a + s.availableQuantityKg, 0);
  const totalRevenueSoFar = supplies.reduce((a, s) => a + (s.totalRevenue ?? 0), 0);
  const publishedCount    = supplies.filter((s) => s.isPublished).length;

  if (loading) return <div className="py-12 text-center text-stone-400">Loading supplies…</div>;

  if (!supplies.length) return (
    <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-12 text-center">
      <Package className="mx-auto mb-3 h-10 w-10 text-stone-300" />
      <p className="font-medium text-stone-600">No supply listings yet</p>
      <p className="mt-1 text-sm text-stone-400">
        Supplies are auto-created when harvest tasks are generated in the calendar.
      </p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ── Summary KPIs ─────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Available Stock" value={`${totalAvailableKg.toLocaleString()} kg`} sub="ready to sell" color="green" />
        <KpiCard label="Revenue Earned" value={inr(totalRevenueSoFar)} sub="from orders" color="amber" />
        <KpiCard label="Published" value={`${publishedCount} / ${supplies.length}`} sub="listings visible" color="stone" />
      </div>

      {/* ── Filters ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
        <Filter className="h-4 w-4 text-stone-400" />
        <select
          value={filterCrop}
          onChange={(e) => setFilterCrop(e.target.value)}
          className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Crops</option>
          {cropNames.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="UPCOMING">Upcoming</option>
          <option value="PARTIALLY_SOLD">Partially Sold</option>
          <option value="SOLD_OUT">Sold Out</option>
          <option value="EXPIRED">Expired</option>
        </select>

        {(filterCrop || filterStatus) && (
          <button
            onClick={() => { setFilterCrop(''); setFilterStatus(''); }}
            className="flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-500 hover:bg-stone-50"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}

        <span className="ml-auto text-xs text-stone-400">{filtered.length} listings</span>
      </div>

      {/* ── Crop groups ───────────────────────────────────────── */}
      {!filtered.length ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-10 text-center text-sm text-stone-400">
          No supplies match the selected filters.
        </div>
      ) : (
        Object.entries(byCrop).map(([crop, list]) => {
          const isCollapsed  = collapsedCrops.has(crop);
          const availableKg  = list.filter((s) => s.status === 'AVAILABLE' || s.status === 'PARTIALLY_SOLD').reduce((a, s) => a + s.availableQuantityKg, 0);
          const revenue      = list.reduce((a, s) => a + (s.totalRevenue ?? 0), 0);
          const publishedQty = list.filter((s) => s.isPublished).length;

          return (
            <div key={crop} className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
              {/* Crop header */}
              <div className="flex items-center gap-3 border-b border-stone-100 px-5 py-3">
                <button onClick={() => toggleCrop(crop)} className="flex flex-1 items-center gap-3 text-left">
                  <span className="text-base font-bold text-stone-800">{crop}</span>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">{list.length} batches</span>
                  {availableKg > 0 && (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700 font-medium">
                      {availableKg.toLocaleString()} kg ready
                    </span>
                  )}
                  {revenue > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 font-medium">
                      <TrendingUp className="h-3 w-3" />{inr(revenue)} earned
                    </span>
                  )}
                  <span className="text-xs text-stone-400">{publishedQty} published</span>
                </button>

                {/* Bulk publish / hide all for this crop */}
                <button
                  onClick={async () => {
                    const allPublished = list.every((s) => s.isPublished);
                    await Promise.all(list.map((s) => togglePublish(s, !allPublished)));
                  }}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    publishedQty === list.length
                      ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                      : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  {publishedQty === list.length ? (
                    <><EyeOff className="h-3.5 w-3.5" /> Hide All</>
                  ) : (
                    <><Eye className="h-3.5 w-3.5" /> Publish All</>
                  )}
                </button>

                <button onClick={() => toggleCrop(crop)} className="text-stone-400">
                  {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
              </div>

              {!isCollapsed && (
                <div className="divide-y divide-stone-50">
                  {/* Column headers */}
                  <div className="grid grid-cols-12 gap-2 px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400 bg-stone-50">
                    <div className="col-span-2">Status</div>
                    <div className="col-span-1">Zone</div>
                    <div className="col-span-2">Harvest Date</div>
                    <div className="col-span-2">Available</div>
                    <div className="col-span-1">Price/kg</div>
                    <div className="col-span-1">Min Qty</div>
                    <div className="col-span-3 text-right">Actions</div>
                  </div>

                  {list.map((s) => {
                    const isEditing  = editId === s.id;
                    const isExpanded = expandedId === s.id;
                    const soldPct    = s.estimatedQuantityKg > 0
                      ? Math.round(((s.estimatedQuantityKg - s.availableQuantityKg) / s.estimatedQuantityKg) * 100)
                      : 0;

                    return (
                      <div key={s.id} className={`px-5 py-3 transition ${isEditing ? 'bg-stone-50' : 'hover:bg-stone-50/50'}`}>
                        {/* Main row */}
                        <div className="grid grid-cols-12 items-center gap-2">
                          <div className="col-span-2">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[s.status]}`}>
                              {STATUS_LABELS[s.status]}
                            </span>
                          </div>
                          <div className="col-span-1 text-[11px] text-stone-400 truncate" title={s.zone?.name ?? s.zoneId ?? undefined}>
                            {s.zone?.name ?? '—'}
                          </div>
                          <div className="col-span-2 text-sm font-medium text-stone-700">{fmt(s.predictedHarvestDate)}</div>
                          <div className="col-span-2">
                            <span className="text-sm font-semibold text-stone-700">{s.availableQuantityKg.toLocaleString()} kg</span>
                            {soldPct > 0 && (
                              <div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-stone-100">
                                <div className="h-full rounded-full bg-green-500" style={{ width: `${soldPct}%` }} />
                              </div>
                            )}
                          </div>
                          <div className="col-span-1 text-sm font-semibold text-green-700">{inr(s.pricePerKg)}</div>
                          <div className="col-span-1 text-sm text-stone-600">{s.minOrderKg} kg</div>
                          <div className="col-span-3 flex items-center justify-end gap-2">
                            <button
                              onClick={() => togglePublish(s)}
                              title={s.isPublished ? 'Hide' : 'Publish'}
                              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                                s.isPublished
                                  ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                                  : 'border-stone-200 bg-stone-50 text-stone-500 hover:bg-stone-100'
                              }`}
                            >
                              {s.isPublished ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                              {s.isPublished ? 'Live' : 'Hidden'}
                            </button>
                            <button
                              onClick={() => (isEditing ? setEditId(null) : startEdit(s))}
                              className="flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-100 transition"
                            >
                              <Edit2 className="h-3 w-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : s.id)}
                              className="rounded-lg border border-stone-200 p-1 text-stone-400 hover:bg-stone-50"
                            >
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="mt-3 grid grid-cols-3 gap-3 rounded-xl bg-stone-100 p-3 text-xs">
                            <Stat label="Pending Orders" value={String(s.pendingOrders ?? 0)} />
                            <Stat label="Total Revenue"  value={inr(s.totalRevenue ?? 0)} />
                            <Stat label="Farm"           value={s.farm?.name ?? '—'} />
                            <Stat label="Form"           value={s.form} />
                            <Stat label="Estimated Total" value={`${s.estimatedQuantityKg.toLocaleString()} kg`} />
                            {soldPct > 0 && <Stat label="Sold" value={`${soldPct}%`} />}
                            {s.notes && (
                              <div className="col-span-3 text-stone-500">
                                <span className="font-medium">Notes: </span>{s.notes}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Inline edit form */}
                        {isEditing && (
                          <div className="mt-3 rounded-xl border border-stone-200 bg-white p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                              <Field label="Price / kg (₹)">
                                <input type="number" min={1} step={0.5} value={editForm.pricePerKg ?? ''}
                                  onChange={(e) => setEditForm((f) => ({ ...f, pricePerKg: +e.target.value }))}
                                  className={inputCls} />
                              </Field>
                              <Field label="Available Qty (kg)">
                                <input type="number" min={0} value={editForm.availableQuantityKg ?? ''}
                                  onChange={(e) => setEditForm((f) => ({ ...f, availableQuantityKg: +e.target.value }))}
                                  className={inputCls} />
                              </Field>
                              <Field label="Min Order (kg)">
                                <input type="number" min={1} value={editForm.minOrderKg ?? ''}
                                  onChange={(e) => setEditForm((f) => ({ ...f, minOrderKg: +e.target.value }))}
                                  className={inputCls} />
                              </Field>
                              <Field label="Grade">
                                <select value={editForm.grade}
                                  onChange={(e) => setEditForm((f) => ({ ...f, grade: e.target.value as ProduceGrade }))}
                                  className={inputCls}>
                                  <option value="A">Grade A</option>
                                  <option value="B">Grade B</option>
                                  <option value="C">Grade C</option>
                                </select>
                              </Field>
                              <Field label="Form">
                                <select value={editForm.form}
                                  onChange={(e) => setEditForm((f) => ({ ...f, form: e.target.value as 'RAW' | 'PROCESSED' }))}
                                  className={inputCls}>
                                  <option value="RAW">Raw</option>
                                  <option value="PROCESSED">Processed</option>
                                </select>
                              </Field>
                            </div>
                            <Field label="Notes">
                              <textarea rows={2} value={editForm.notes ?? ''}
                                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                                className={`${inputCls} resize-none`} />
                            </Field>
                            <div className="flex gap-2">
                              <button onClick={() => saveEdit(s.id)} disabled={saving}
                                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                                <Check className="h-3.5 w-3.5" /> Save
                              </button>
                              <button onClick={() => setEditId(null)}
                                className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-4 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100">
                                <X className="h-3.5 w-3.5" /> Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

const inputCls = 'mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-stone-500">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-stone-700">{value}</p>
    </div>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const bg = color === 'green' ? 'bg-green-50 border-green-100' : color === 'amber' ? 'bg-amber-50 border-amber-100' : 'bg-stone-50 border-stone-200';
  const val = color === 'green' ? 'text-green-700' : color === 'amber' ? 'text-amber-700' : 'text-stone-700';
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${val}`}>{value}</p>
      <p className="text-[11px] text-stone-400">{sub}</p>
    </div>
  );
}
