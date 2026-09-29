import { useEffect, useState } from 'react';
import { browseSupplies, placeOrder } from '../../../lib/api';
import type { Supply, ProduceForm, PaymentMethod } from '../../../types/market';
import { Search, MapPin, Calendar, Scale, ShoppingCart, X } from 'lucide-react';
import toast from 'react-hot-toast';

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const GRADE_COLORS: Record<string, string> = {
  A: 'bg-green-100 text-green-700',
  B: 'bg-amber-100 text-amber-700',
  C: 'bg-rose-100 text-rose-600',
};

const CROPS = ['Haldi', 'Papaya', 'Creepers', 'Leafy Vegetable'];

interface OrderForm {
  supplyId: string;
  quantityKg: number;
  deliveryAddress: string;
  paymentMethod: PaymentMethod;
  customerNote: string;
}

export default function BrowseSupplies() {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ crop: '', district: '', form: '' as ProduceForm | '', maxPrice: '' });
  const [orderModal, setOrderModal] = useState<Supply | null>(null);
  const [orderForm, setOrderForm] = useState<Partial<OrderForm>>({});
  const [placing, setPlacing] = useState(false);

  const load = async (f = filters) => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (f.crop)     params.crop     = f.crop;
    if (f.district) params.district = f.district;
    if (f.form)     params.form     = f.form;
    if (f.maxPrice) params.maxPrice = f.maxPrice;
    try {
      const res = await browseSupplies(params);
      setSupplies(res.supplies);
      setTotal(res.total);
    } catch { toast.error('Failed to load supplies'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openOrder = (s: Supply) => {
    setOrderModal(s);
    setOrderForm({ supplyId: s.id, quantityKg: s.minOrderKg, paymentMethod: 'COD', deliveryAddress: '', customerNote: '' });
  };

  const submitOrder = async () => {
    if (!orderModal || !orderForm.quantityKg || !orderForm.deliveryAddress) {
      toast.error('Fill in quantity and delivery address');
      return;
    }
    setPlacing(true);
    try {
      await placeOrder({
        supplyId:        orderForm.supplyId!,
        quantityKg:      orderForm.quantityKg,
        paymentMethod:   orderForm.paymentMethod!,
        deliveryAddress: orderForm.deliveryAddress!,
        customerNote:    orderForm.customerNote,
      });
      toast.success('Order placed successfully!');
      setOrderModal(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to place order');
    } finally { setPlacing(false); }
  };

  return (
    <div>
      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        <select
          value={filters.crop}
          onChange={(e) => setFilters((f) => ({ ...f, crop: e.target.value }))}
          className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Crops</option>
          {CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2">
          <MapPin className="h-4 w-4 text-stone-400" />
          <input
            placeholder="District"
            value={filters.district}
            onChange={(e) => setFilters((f) => ({ ...f, district: e.target.value }))}
            className="w-32 text-sm text-stone-600 focus:outline-none"
          />
        </div>

        <select
          value={filters.form}
          onChange={(e) => setFilters((f) => ({ ...f, form: e.target.value as ProduceForm | '' }))}
          className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Raw & Processed</option>
          <option value="RAW">Raw</option>
          <option value="PROCESSED">Processed</option>
        </select>

        <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2">
          <Scale className="h-4 w-4 text-stone-400" />
          <input
            type="number" placeholder="Max ₹/kg"
            value={filters.maxPrice}
            onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value }))}
            className="w-24 text-sm text-stone-600 focus:outline-none"
          />
        </div>

        <button
          onClick={() => load(filters)}
          className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          <Search className="h-4 w-4" /> Search
        </button>

        {(filters.crop || filters.district || filters.form || filters.maxPrice) && (
          <button
            onClick={() => { const f = { crop: '', district: '', form: '' as ProduceForm | '', maxPrice: '' }; setFilters(f); load(f); }}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-500 hover:bg-stone-50"
          >
            <X className="h-4 w-4" /> Clear
          </button>
        )}
      </div>

      <p className="mb-4 text-sm text-stone-500">{total} listing{total !== 1 ? 's' : ''} available</p>

      {loading ? (
        <div className="py-12 text-center text-stone-400">Loading…</div>
      ) : !supplies.length ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-12 text-center">
          <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-stone-300" />
          <p className="font-medium text-stone-600">No supplies match your search</p>
          <p className="mt-1 text-sm text-stone-400">Try adjusting filters or post a demand — farmers will see it.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {supplies.map((s) => (
            <div key={s.id} className="flex flex-col rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
              {/* Crop header */}
              <div className="bg-green-50 px-4 pt-4 pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-stone-800">{s.cropName}</p>
                    <p className="text-xs text-stone-500">{s.farm?.name} · {s.district}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${GRADE_COLORS[s.grade]}`}>
                    Grade {s.grade}
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-stone-400">Price / kg</p>
                    <p className="font-bold text-green-700 text-base">{inr(s.pricePerKg)}</p>
                  </div>
                  <div>
                    <p className="text-stone-400">Available</p>
                    <p className="font-semibold text-stone-700">{s.availableQuantityKg.toLocaleString()} kg</p>
                  </div>
                  <div>
                    <p className="text-stone-400">Form</p>
                    <p className="font-semibold text-stone-700">{s.form}</p>
                  </div>
                  <div>
                    <p className="text-stone-400">Min Order</p>
                    <p className="font-semibold text-stone-700">{s.minOrderKg} kg</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
                  <Calendar className="h-3.5 w-3.5" />
                  Harvest: {fmt(s.predictedHarvestDate)}
                </div>

                {s.notes && <p className="text-[11px] text-stone-400 italic line-clamp-2">"{s.notes}"</p>}

                <button
                  onClick={() => openOrder(s)}
                  className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700 transition"
                >
                  <ShoppingCart className="h-4 w-4" /> Place Order
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order modal */}
      {orderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
              <h3 className="font-bold text-stone-800">Place Order — {orderModal.cropName}</h3>
              <button onClick={() => setOrderModal(null)} className="rounded-lg p-1 text-stone-400 hover:bg-stone-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-xl bg-green-50 p-3 text-sm">
                <p className="font-semibold text-stone-700">{orderModal.farm?.name} · {orderModal.district}</p>
                <p className="text-stone-500">{inr(orderModal.pricePerKg)}/kg · Grade {orderModal.grade} · {orderModal.form}</p>
              </div>

              <label className="block">
                <span className="text-xs font-medium text-stone-600">Quantity (kg) — min {orderModal.minOrderKg} kg</span>
                <input
                  type="number" min={orderModal.minOrderKg} max={orderModal.availableQuantityKg} step={1}
                  value={orderForm.quantityKg ?? ''}
                  onChange={(e) => setOrderForm((f) => ({ ...f, quantityKg: +e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                {orderForm.quantityKg && (
                  <p className="mt-1 text-[11px] text-stone-400">
                    Total: {inr(orderForm.quantityKg * orderModal.pricePerKg)}
                  </p>
                )}
              </label>

              <label className="block">
                <span className="text-xs font-medium text-stone-600">Delivery Address</span>
                <textarea
                  rows={2}
                  value={orderForm.deliveryAddress ?? ''}
                  onChange={(e) => setOrderForm((f) => ({ ...f, deliveryAddress: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-stone-600">Payment Method</span>
                <select
                  value={orderForm.paymentMethod ?? 'COD'}
                  onChange={(e) => setOrderForm((f) => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="COD">Cash on Delivery</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-stone-600">Note to Farmer (optional)</span>
                <input
                  type="text"
                  value={orderForm.customerNote ?? ''}
                  onChange={(e) => setOrderForm((f) => ({ ...f, customerNote: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </label>

              <button
                disabled={placing}
                onClick={submitOrder}
                className="w-full rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition"
              >
                {placing ? 'Placing…' : 'Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
