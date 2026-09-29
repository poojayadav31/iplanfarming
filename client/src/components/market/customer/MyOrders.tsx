import { useEffect, useState } from 'react';
import { getMyOrders, cancelMyOrder } from '../../../lib/api';
import type { Order } from '../../../types/market';
import { ClipboardList, ChevronDown, ChevronUp, X } from 'lucide-react';
import toast from 'react-hot-toast';

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const STATUS_META: Record<string, { label: string; color: string; step: number }> = {
  PENDING:    { label: 'Order Placed',  color: 'bg-amber-100 text-amber-700',   step: 1 },
  CONFIRMED:  { label: 'Confirmed',     color: 'bg-blue-100 text-blue-700',     step: 2 },
  PACKED:     { label: 'Packed',        color: 'bg-purple-100 text-purple-700', step: 3 },
  DISPATCHED: { label: 'On the Way',    color: 'bg-indigo-100 text-indigo-700', step: 4 },
  DELIVERED:  { label: 'Delivered',     color: 'bg-green-100 text-green-700',   step: 5 },
  CANCELLED:  { label: 'Cancelled',     color: 'bg-rose-100 text-rose-600',     step: 0 },
};

const STEPS = ['PENDING', 'CONFIRMED', 'PACKED', 'DISPATCHED', 'DELIVERED'];

export default function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getMyOrders()
      .then(setOrders)
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const cancel = async (orderId: string) => {
    if (!confirm('Cancel this order?')) return;
    setCancellingId(orderId);
    try {
      await cancelMyOrder(orderId);
      toast.success('Order cancelled');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Cannot cancel this order');
    } finally { setCancellingId(null); }
  };

  if (loading) return <div className="py-12 text-center text-stone-400">Loading orders…</div>;

  if (!orders.length) return (
    <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-12 text-center">
      <ClipboardList className="mx-auto mb-3 h-10 w-10 text-stone-300" />
      <p className="font-medium text-stone-600">No orders yet</p>
      <p className="mt-1 text-sm text-stone-400">Browse available supplies and place your first order.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {orders.map((o) => {
        const meta   = STATUS_META[o.status];
        const isExp  = expandedId === o.id;
        const curStep = meta.step;
        const canCancel = ['PENDING', 'CONFIRMED'].includes(o.status);

        return (
          <div key={o.id} className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between p-4 gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.color}`}>{meta.label}</span>
                  <span className="text-sm font-semibold text-stone-700">
                    {o.supply?.cropName ?? '—'} · {o.quantityKg} kg
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-stone-400">
                  {o.supply?.farm?.name ?? '—'} · Ordered {fmt(o.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-stone-700">{inr(o.totalAmount)}</span>
                <button onClick={() => setExpandedId(isExp ? null : o.id)} className="rounded-lg border border-stone-200 p-1.5 text-stone-400 hover:bg-stone-50">
                  {isExp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Progress tracker (not for cancelled) */}
            {o.status !== 'CANCELLED' && (
              <div className="px-4 pb-3">
                <div className="flex items-center gap-0">
                  {STEPS.map((step, i) => {
                    const stepNum  = i + 1;
                    const done     = stepNum <= curStep;
                    const current  = stepNum === curStep;
                    return (
                      <div key={step} className="flex flex-1 items-center">
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition ${
                          done ? 'bg-green-600 text-white' : 'bg-stone-100 text-stone-400'
                        } ${current ? 'ring-2 ring-green-400 ring-offset-1' : ''}`}>
                          {stepNum}
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className={`h-0.5 flex-1 ${stepNum < curStep ? 'bg-green-400' : 'bg-stone-100'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-1 flex justify-between">
                  {STEPS.map((step) => (
                    <span key={step} className="text-[9px] text-stone-400 text-center" style={{ width: '20%' }}>
                      {STATUS_META[step].label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Expanded details */}
            {isExp && (
              <div className="border-t border-stone-100 bg-stone-50 px-4 py-3 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs text-stone-500 sm:grid-cols-3">
                  <span><b>Price/kg:</b> {inr(o.pricePerKg)}</span>
                  <span><b>Payment:</b> {o.paymentMethod}</span>
                  <span><b>Payment status:</b> {o.paymentStatus}</span>
                  <span className="col-span-2 sm:col-span-3"><b>Delivery:</b> {o.deliveryAddress}</span>
                </div>
                {o.farmerNote && (
                  <p className="text-xs text-stone-500 italic">Farmer note: "{o.farmerNote}"</p>
                )}
                {canCancel && (
                  <button
                    disabled={cancellingId === o.id}
                    onClick={() => cancel(o.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" /> Cancel Order
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
