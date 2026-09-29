import { useEffect, useState } from 'react';
import { getDemandAlerts, getMySupplies, updateSupply } from '../../../lib/api';
import type { Demand, Supply } from '../../../types/market';
import { Bell, MapPin, Calendar, Scale, Eye, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const CROP_COLORS: Record<string, string> = {
  Haldi:             'bg-amber-100 text-amber-800',
  Papaya:            'bg-orange-100 text-orange-800',
  Creepers:          'bg-lime-100 text-lime-800',
  'Leafy Vegetable': 'bg-green-100 text-green-800',
};

export default function DemandAlerts() {
  const [demands, setDemands]         = useState<Demand[]>([]);
  const [mySupplies, setMySupplies]   = useState<Supply[]>([]);
  const [loading, setLoading]         = useState(true);
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [publishing, setPublishing]   = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getDemandAlerts(), getMySupplies()])
      .then(([d, s]) => { setDemands(d); setMySupplies(s); })
      .catch(() => toast.error('Failed to load alerts'))
      .finally(() => setLoading(false));
  }, []);

  const publishSupply = async (supply: Supply) => {
    setPublishing(supply.id);
    try {
      const updated = await updateSupply(supply.id, { isPublished: true });
      setMySupplies((prev) => prev.map((s) => s.id === supply.id ? { ...s, ...updated } : s));
      toast.success(`${supply.cropName} supply published — customers can now see it`);
    } catch { toast.error('Failed to publish supply'); }
    finally { setPublishing(null); }
  };

  // For a given demand, find my supplies that match crop + form and are not yet published
  const getMatchingSupplies = (d: Demand) =>
    mySupplies.filter(
      (s) => s.cropName === d.cropName &&
             s.form === d.form &&
             s.availableQuantityKg >= d.quantityKg &&
             (s.status === 'AVAILABLE' || s.status === 'UPCOMING')
    );

  if (loading) return <div className="py-12 text-center text-stone-400">Loading alerts…</div>;

  if (!demands.length) return (
    <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-12 text-center">
      <Bell className="mx-auto mb-3 h-10 w-10 text-stone-300" />
      <p className="font-medium text-stone-600">No open demands for your crops</p>
      <p className="mt-1 text-sm text-stone-400">When customers post buying requests matching your crops, they appear here.</p>
    </div>
  );

  const nearby  = demands.filter((d) => d.isNearby);
  const farAway = demands.filter((d) => !d.isNearby);

  const renderCard = (d: Demand) => {
    const isExp       = expandedId === d.id;
    const matching    = getMatchingSupplies(d);
    const canFulfill  = matching.length > 0;
    const unpublished = matching.filter((s) => !s.isPublished);
    const published   = matching.filter((s) => s.isPublished);

    return (
      <div key={d.id} className={`rounded-2xl border bg-white shadow-sm overflow-hidden ${d.isNearby ? 'border-green-200' : 'border-stone-200'}`}>
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-2 p-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${CROP_COLORS[d.cropName] ?? 'bg-stone-100 text-stone-700'}`}>
                {d.cropName}
              </span>
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-500">{d.form}</span>
              {d.isNearby && <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-600">Nearby</span>}
              {canFulfill && (
                <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                  <Zap className="h-3 w-3" /> You can fulfill this
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-stone-500">
              <span className="font-semibold text-stone-700">{d.quantityKg.toLocaleString()} kg needed</span>
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> By {fmt(d.neededByDate)}</span>
              {d.preferredDistrict && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{d.preferredDistrict}</span>}
              {d.maxPricePerKg && <span className="flex items-center gap-1"><Scale className="h-3.5 w-3.5" /> Max {inr(d.maxPricePerKg)}/kg</span>}
            </div>

            {d.customer && (
              <p className="mt-1.5 text-[11px] text-stone-400">
                Buyer: <span className="font-medium text-stone-600">{d.customer.user.name}</span>
              </p>
            )}
            {d.notes && <p className="mt-1 text-[11px] text-stone-400 italic">"{d.notes}"</p>}
          </div>

          {canFulfill && (
            <button
              onClick={() => setExpandedId(isExp ? null : d.id)}
              className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
            >
              {isExp ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {unpublished.length > 0 ? `${unpublished.length} supply to publish` : 'View supplies'}
            </button>
          )}
        </div>

        {/* Expanded: matching supplies */}
        {isExp && canFulfill && (
          <div className="border-t border-stone-100 bg-stone-50 px-4 py-3 space-y-2">
            {published.length > 0 && (
              <p className="text-[11px] text-green-600 font-medium">
                ✓ {published.length} supply already published and visible to this buyer
              </p>
            )}

            {unpublished.length > 0 && (
              <>
                <p className="text-xs font-semibold text-stone-600 mb-2">Publish to make your supplies visible to this buyer:</p>
                {unpublished.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-2.5 gap-3">
                    <div className="text-xs">
                      <p className="font-semibold text-stone-700">
                        {s.zone?.name ?? 'Supply'} · {s.availableQuantityKg.toLocaleString()} kg · {inr(s.pricePerKg)}/kg
                      </p>
                      <p className="text-stone-400">Harvest: {fmt(s.predictedHarvestDate)} · Grade {s.grade}</p>
                    </div>
                    <button
                      disabled={publishing === s.id}
                      onClick={() => publishSupply(s)}
                      className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 shrink-0"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {publishing === s.id ? 'Publishing…' : 'Publish'}
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {nearby.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">📍 Nearby Buyers</p>
          <div className="space-y-3">{nearby.map(renderCard)}</div>
        </div>
      )}
      {farAway.length > 0 && (
        <div>
          {nearby.length > 0 && <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">Other Districts</p>}
          <div className="space-y-3">{farAway.map(renderCard)}</div>
        </div>
      )}
    </div>
  );
}
