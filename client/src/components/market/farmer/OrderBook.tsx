import { useEffect, useState } from 'react';
import { getOrderBook, getIncomingOrders, updateOrderStatus } from '../../../lib/api';
import type { OrderBook as OB, Order } from '../../../types/market';
import { TrendingUp, Package, Clock, CheckCircle2, Truck, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING:    { label: 'Pending',    color: 'bg-amber-100 text-amber-700' },
  CONFIRMED:  { label: 'Confirmed',  color: 'bg-blue-100 text-blue-700' },
  PACKED:     { label: 'Packed',     color: 'bg-purple-100 text-purple-700' },
  DISPATCHED: { label: 'Dispatched', color: 'bg-indigo-100 text-indigo-700' },
  DELIVERED:  { label: 'Delivered',  color: 'bg-green-100 text-green-700' },
  CANCELLED:  { label: 'Cancelled',  color: 'bg-rose-100 text-rose-600' },
};

const NEXT_STATUS: Record<string, string> = {
  PENDING:    'CONFIRMED',
  CONFIRMED:  'PACKED',
  PACKED:     'DISPATCHED',
  DISPATCHED: 'DELIVERED',
};

export default function OrderBook() {
  const [book, setBook] = useState<OB | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [b, o] = await Promise.all([getOrderBook(), getIncomingOrders()]);
      setBook(b);
      setOrders(o);
    } catch { toast.error('Failed to load order book'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const advance = async (order: Order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setUpdatingId(order.id);
    try {
      const updated = await updateOrderStatus(order.id, next);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...updated } : o)));
      toast.success(`Order marked as ${next.toLowerCase()}`);
      load(); // refresh book totals
    } catch { toast.error('Failed to update order'); }
    finally { setUpdatingId(null); }
  };

  const cancel = async (order: Order) => {
    setUpdatingId(order.id);
    try {
      const updated = await updateOrderStatus(order.id, 'CANCELLED');
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...updated } : o)));
      toast.success('Order cancelled');
      load();
    } catch { toast.error('Failed to cancel order'); }
    finally { setUpdatingId(null); }
  };

  if (loading) return <div className="py-12 text-center text-stone-400">Loading order book…</div>;

  return (
    <div className="space-y-6">
      {/* KPI summary */}
      {book && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard icon={TrendingUp}    color="green"  label="Total Revenue"   value={inr(book.summary.totalRevenue)} />
          <KpiCard icon={Package}       color="amber"  label="Qty Sold (kg)"   value={book.summary.totalQuantitySoldKg.toLocaleString()} />
          <KpiCard icon={Clock}         color="blue"   label="Pending Orders"  value={String(book.summary.pendingOrderCount)} />
          <KpiCard icon={CheckCircle2}  color="stone"  label="Delivered"       value={String(book.summary.deliveredOrderCount)} />
        </div>
      )}

      {/* Per-crop breakdown */}
      {book && book.byCrop.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-stone-100 px-5 py-3">
            <h3 className="font-semibold text-stone-700">Revenue by Crop</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-[11px] uppercase tracking-wider text-stone-400">
              <tr>
                <th className="px-5 py-2 text-left">Crop</th>
                <th className="px-5 py-2 text-right">Qty Sold (kg)</th>
                <th className="px-5 py-2 text-right">Orders</th>
                <th className="px-5 py-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {book.byCrop.map((c) => (
                <tr key={c.cropName} className="hover:bg-stone-50">
                  <td className="px-5 py-3 font-medium text-stone-700">{c.cropName}</td>
                  <td className="px-5 py-3 text-right text-stone-600">{c.quantitySoldKg.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right text-stone-600">{c.orderCount}</td>
                  <td className="px-5 py-3 text-right font-semibold text-green-700">{inr(c.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Orders list */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-stone-100 px-5 py-3">
          <h3 className="font-semibold text-stone-700">All Orders</h3>
        </div>

        {!orders.length ? (
          <div className="py-10 text-center text-stone-400">No orders yet</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {orders.map((o) => {
              const meta    = STATUS_META[o.status];
              const isExp   = expandedId === o.id;
              const nextSt  = NEXT_STATUS[o.status];
              const isBusy  = updatingId === o.id;

              return (
                <div key={o.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.color}`}>{meta.label}</span>
                        <span className="text-sm font-semibold text-stone-700">
                          {o.supply?.cropName ?? '—'} · {o.quantityKg} kg
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-stone-400">{fmt(o.createdAt)} · {o.customer?.user.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-stone-700">{inr(o.totalAmount)}</span>
                      <button onClick={() => setExpandedId(isExp ? null : o.id)} className="rounded-lg border border-stone-200 p-1.5 text-stone-400 hover:bg-stone-50">
                        {isExp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {isExp && (
                    <div className="mt-3 rounded-xl bg-stone-50 p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs text-stone-500 sm:grid-cols-3">
                        <span><b>Payment:</b> {o.paymentMethod}</span>
                        <span><b>Payment status:</b> {o.paymentStatus}</span>
                        <span><b>Price/kg:</b> {inr(o.pricePerKg)}</span>
                        <span className="col-span-2 sm:col-span-3"><b>Delivery:</b> {o.deliveryAddress}</span>
                      </div>
                      {o.customerNote && <p className="text-xs text-stone-400 italic">Customer note: "{o.customerNote}"</p>}

                      {/* Action buttons */}
                      {!['DELIVERED', 'CANCELLED'].includes(o.status) && (
                        <div className="flex gap-2 pt-1">
                          {nextSt && (
                            <button
                              disabled={isBusy}
                              onClick={() => advance(o)}
                              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              <Truck className="h-3.5 w-3.5" />
                              Mark as {nextSt.toLowerCase()}
                            </button>
                          )}
                          {['PENDING', 'CONFIRMED'].includes(o.status) && (
                            <button
                              disabled={isBusy}
                              onClick={() => cancel(o)}
                              className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, color, label, value }: { icon: React.ElementType; color: string; label: string; value: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    blue:  'bg-blue-50 text-blue-700',
    stone: 'bg-stone-50 text-stone-600',
  };
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${colors[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-stone-800">{value}</p>
    </div>
  );
}
