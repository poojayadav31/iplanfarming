import { useEffect, useState } from 'react';
import { getMyDemands, createDemand, updateDemand, placeOrder } from '../../../lib/api';
import type { Demand, ProduceForm, CreateDemandPayload, PaymentMethod, Supply } from '../../../types/market';
import {
  PlusCircle, Calendar, Scale, X, ChevronDown, ChevronUp,
  Leaf, Edit2, Check, ShoppingCart,
} from 'lucide-react';
import toast from 'react-hot-toast';

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const STATUS_COLORS: Record<string, string> = {
  OPEN:                'bg-green-100 text-green-700',
  PARTIALLY_FULFILLED: 'bg-amber-100 text-amber-700',
  FULFILLED:           'bg-stone-100 text-stone-500',
  CANCELLED:           'bg-rose-100 text-rose-600',
};

const CROPS = ['Haldi', 'Papaya', 'Creepers', 'Leafy Vegetable'];
const CG_DISTRICTS = ['Raipur', 'Bilaspur', 'Durg', 'Rajnandgaon', 'Korba', 'Bemetara', 'Baloda Bazar', 'Janjgir', 'Raigarh', 'Kabirdham'];

const inputCls = 'mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500';

export default function MyDemands() {
  const [demands, setDemands]       = useState<Demand[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState<Partial<CreateDemandPayload>>({ form: 'RAW' });
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editId, setEditId]         = useState<string | null>(null);
  const [editForm, setEditForm]     = useState<Partial<CreateDemandPayload>>({});
  const [saving, setSaving]         = useState(false);
  const [orderModal, setOrderModal] = useState<{ supply: Supply; demand: Demand } | null>(null);
  const [orderForm, setOrderForm]   = useState<{ quantityKg: number; deliveryAddress: string; paymentMethod: PaymentMethod; customerNote: string }>({
    quantityKg: 0, deliveryAddress: '', paymentMethod: 'COD', customerNote: '',
  });
  const [placing, setPlacing] = useState(false);

  const load = () => {
    setLoading(true);
    getMyDemands()
      .then(setDemands)
      .catch(() => toast.error('Failed to load demands'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.cropName || !form.quantityKg || !form.neededByDate) {
      toast.error('Crop, quantity, and needed-by date are required');
      return;
    }
    setSubmitting(true);
    try {
      await createDemand(form as CreateDemandPayload);
      toast.success('Demand posted — farmers will be notified');
      setShowForm(false);
      setForm({ form: 'RAW' });
      load();
    } catch { toast.error('Failed to post demand'); }
    finally { setSubmitting(false); }
  };

  const startEdit = (d: Demand) => {
    setEditId(d.id);
    setExpandedId(d.id);
    setEditForm({
      cropName: d.cropName,
      quantityKg: d.quantityKg,
      maxPricePerKg: d.maxPricePerKg ?? undefined,
      neededByDate: d.neededByDate.slice(0, 10),
      preferredDistrict: d.preferredDistrict ?? undefined,
      form: d.form,
      notes: d.notes ?? '',
    });
  };

  const saveEdit = async (demandId: string) => {
    setSaving(true);
    try {
      const updated = await updateDemand(demandId, {
        quantityKg: editForm.quantityKg,
        maxPricePerKg: editForm.maxPricePerKg,
        neededByDate: editForm.neededByDate,
        notes: editForm.notes,
      });
      setDemands((prev) => prev.map((d) => (d.id === demandId ? { ...d, ...updated } : d)));
      setEditId(null);
      toast.success('Demand updated');
    } catch { toast.error('Failed to update demand'); }
    finally { setSaving(false); }
  };

  const cancel = async (demandId: string) => {
    if (!confirm('Cancel this demand? This cannot be undone.')) return;
    try {
      await updateDemand(demandId, { status: 'CANCELLED' });
      setDemands((prev) => prev.map((d) => d.id === demandId ? { ...d, status: 'CANCELLED' } : d));
      toast.success('Demand cancelled');
    } catch { toast.error('Failed to cancel demand'); }
  };

  const openOrderModal = (supply: Supply, demand: Demand) => {
    setOrderModal({ supply, demand });
    setOrderForm({ quantityKg: Math.min(demand.quantityKg, supply.availableQuantityKg), deliveryAddress: '', paymentMethod: 'COD', customerNote: '' });
  };

  const submitOrder = async () => {
    if (!orderModal || !orderForm.quantityKg || !orderForm.deliveryAddress) {
      toast.error('Fill in quantity and delivery address');
      return;
    }
    setPlacing(true);
    try {
      await placeOrder({
        supplyId:        orderModal.supply.id,
        quantityKg:      orderForm.quantityKg,
        paymentMethod:   orderForm.paymentMethod,
        deliveryAddress: orderForm.deliveryAddress,
        demandId:        orderModal.demand.id,
        customerNote:    orderForm.customerNote,
      });
      toast.success('Order placed!');
      setOrderModal(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to place order');
    } finally { setPlacing(false); }
  };

  if (loading) return <div className="py-12 text-center text-stone-400">Loading…</div>;

  return (
    <div>
      {/* Post Demand button */}
      <div className="mb-5">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          <PlusCircle className="h-4 w-4" />
          {showForm ? 'Cancel' : 'Post a Demand'}
        </button>
      </div>

      {/* New demand form */}
      {showForm && (
        <div className="mb-6 rounded-2xl border border-green-200 bg-white shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-stone-800">What are you looking to buy?</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-stone-600">Crop *</span>
              <select value={form.cropName ?? ''} onChange={(e) => setForm((f) => ({ ...f, cropName: e.target.value }))} className={inputCls}>
                <option value="">Select crop</option>
                {CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-stone-600">Quantity (kg) *</span>
              <input type="number" min={1} value={form.quantityKg ?? ''} onChange={(e) => setForm((f) => ({ ...f, quantityKg: +e.target.value }))} className={inputCls} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-stone-600">Needed by *</span>
              <input type="date" value={form.neededByDate ?? ''} onChange={(e) => setForm((f) => ({ ...f, neededByDate: e.target.value }))} className={inputCls} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-stone-600">Max Price / kg (₹, optional)</span>
              <input type="number" min={1} step={0.5} value={form.maxPricePerKg ?? ''} onChange={(e) => setForm((f) => ({ ...f, maxPricePerKg: +e.target.value || undefined }))} className={inputCls} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-stone-600">Preferred District</span>
              <select value={form.preferredDistrict ?? ''} onChange={(e) => setForm((f) => ({ ...f, preferredDistrict: e.target.value || undefined }))} className={inputCls}>
                <option value="">Any district</option>
                {CG_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-stone-600">Form</span>
              <select value={form.form ?? 'RAW'} onChange={(e) => setForm((f) => ({ ...f, form: e.target.value as ProduceForm }))} className={inputCls}>
                <option value="RAW">Raw</option>
                <option value="PROCESSED">Processed</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-medium text-stone-600">Notes (optional)</span>
            <textarea rows={2} value={form.notes ?? ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={`${inputCls} resize-none`} placeholder="Any specific quality requirements, packaging, etc." />
          </label>
          <button disabled={submitting} onClick={submit} className="rounded-xl bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
            {submitting ? 'Posting…' : 'Post Demand'}
          </button>
        </div>
      )}

      {/* Demands list */}
      {!demands.length ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-12 text-center">
          <Leaf className="mx-auto mb-3 h-10 w-10 text-stone-300" />
          <p className="font-medium text-stone-600">No demands posted yet</p>
          <p className="mt-1 text-sm text-stone-400">Post a buying request and farmers with matching crops will be alerted.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {demands.map((d) => {
            const isExp     = expandedId === d.id;
            const isEditing = editId === d.id;
            const matches   = d.demandMatches ?? [];
            const isOpen    = d.status === 'OPEN';
            const isPast    = new Date(d.neededByDate) < new Date();

            return (
              <div key={d.id} className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
                {/* Card header */}
                <div className="flex items-start justify-between p-4 gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[d.status]}`}>{d.status.replace('_', ' ')}</span>
                      <span className="text-sm font-semibold text-stone-700">{d.cropName} · {d.quantityKg} kg</span>
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-500">{d.form}</span>
                      {isPast && isOpen && (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-500">Date passed</span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-stone-400">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> By {fmt(d.neededByDate)}</span>
                      {d.maxPricePerKg && <span className="flex items-center gap-1"><Scale className="h-3 w-3" /> Max {inr(d.maxPricePerKg)}/kg</span>}
                      {d.preferredDistrict && <span>{d.preferredDistrict}</span>}
                    </div>
                  </div>

                  {/* Action buttons — always visible */}
                  <div className="flex items-center gap-2 shrink-0">
                    {matches.length > 0 && (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-600">
                        {matches.length} match{matches.length > 1 ? 'es' : ''}
                      </span>
                    )}
                    {isOpen && (
                      <>
                        <button
                          onClick={() => (isEditing ? setEditId(null) : startEdit(d))}
                          className="flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100"
                        >
                          <Edit2 className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => cancel(d.id)}
                          className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                        >
                          <X className="h-3.5 w-3.5" /> Cancel
                        </button>
                      </>
                    )}
                    {(matches.length > 0 || d.notes) && (
                      <button onClick={() => setExpandedId(isExp ? null : d.id)} className="rounded-lg border border-stone-200 p-1.5 text-stone-400 hover:bg-stone-50">
                        {isExp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline edit form */}
                {isEditing && (
                  <div className="border-t border-stone-100 bg-stone-50 px-4 py-4 space-y-3">
                    <p className="text-xs font-semibold text-stone-600">Edit Demand</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <label className="block">
                        <span className="text-[11px] font-medium text-stone-500">Quantity (kg)</span>
                        <input type="number" min={1} value={editForm.quantityKg ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, quantityKg: +e.target.value }))} className={inputCls} />
                      </label>
                      <label className="block">
                        <span className="text-[11px] font-medium text-stone-500">Needed by</span>
                        <input type="date" value={editForm.neededByDate ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, neededByDate: e.target.value }))} className={inputCls} />
                      </label>
                      <label className="block">
                        <span className="text-[11px] font-medium text-stone-500">Max Price / kg (₹)</span>
                        <input type="number" min={1} step={0.5} value={editForm.maxPricePerKg ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, maxPricePerKg: +e.target.value || undefined }))} className={inputCls} />
                      </label>
                    </div>
                    <label className="block">
                      <span className="text-[11px] font-medium text-stone-500">Notes</span>
                      <textarea rows={2} value={editForm.notes ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} className={`${inputCls} resize-none`} />
                    </label>
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(d.id)} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                        <Check className="h-3.5 w-3.5" /> Save
                      </button>
                      <button onClick={() => setEditId(null)} className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-4 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100">
                        <X className="h-3.5 w-3.5" /> Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded: notes + matched supplies */}
                {isExp && !isEditing && (
                  <div className="border-t border-stone-100 bg-stone-50 px-4 py-3 space-y-3">
                    {d.notes && <p className="text-xs text-stone-500 italic">"{d.notes}"</p>}

                    {matches.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold text-stone-600">Matched Supplies — Place an Order</p>
                        <div className="space-y-2">
                          {matches.map((m) => (
                            <div key={m.id} className="flex items-center justify-between rounded-xl border border-green-100 bg-white p-3 gap-3">
                              <div className="text-xs">
                                <p className="font-semibold text-stone-700">{m.supply.farm?.name ?? 'Farm'} · {m.supply.district}</p>
                                <p className="text-stone-500">{inr(m.supply.pricePerKg)}/kg · {m.supply.availableQuantityKg} kg available · Harvest {fmt(m.supply.predictedHarvestDate)}</p>
                              </div>
                              {isOpen && (
                                <button
                                  onClick={() => openOrderModal(m.supply, d)}
                                  className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 shrink-0"
                                >
                                  <ShoppingCart className="h-3.5 w-3.5" /> Order
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Order modal */}
      {orderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
              <h3 className="font-bold text-stone-800">Place Order — {orderModal.supply.cropName}</h3>
              <button onClick={() => setOrderModal(null)} className="rounded-lg p-1 text-stone-400 hover:bg-stone-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-5">
              <div className="rounded-xl bg-green-50 p-3 text-sm">
                <p className="font-semibold text-stone-700">{orderModal.supply.farm?.name} · {orderModal.supply.district}</p>
                <p className="text-stone-500">{inr(orderModal.supply.pricePerKg)}/kg · Grade {orderModal.supply.grade} · {orderModal.supply.form}</p>
                <p className="text-xs text-stone-400 mt-1">Linked to your demand for {orderModal.demand.cropName}</p>
              </div>
              <label className="block">
                <span className="text-xs font-medium text-stone-600">Quantity (kg) — min {orderModal.supply.minOrderKg} kg, max {orderModal.supply.availableQuantityKg} kg</span>
                <input type="number" min={orderModal.supply.minOrderKg} max={orderModal.supply.availableQuantityKg}
                  value={orderForm.quantityKg}
                  onChange={(e) => setOrderForm((f) => ({ ...f, quantityKg: +e.target.value }))}
                  className={inputCls} />
                {orderForm.quantityKg > 0 && (
                  <p className="mt-1 text-[11px] text-stone-400">Total: {inr(orderForm.quantityKg * orderModal.supply.pricePerKg)}</p>
                )}
              </label>
              <label className="block">
                <span className="text-xs font-medium text-stone-600">Delivery Address</span>
                <textarea rows={2} value={orderForm.deliveryAddress} onChange={(e) => setOrderForm((f) => ({ ...f, deliveryAddress: e.target.value }))} className={`${inputCls} resize-none`} />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-stone-600">Payment Method</span>
                <select value={orderForm.paymentMethod} onChange={(e) => setOrderForm((f) => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))} className={inputCls}>
                  <option value="COD">Cash on Delivery</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-stone-600">Note to Farmer (optional)</span>
                <input type="text" value={orderForm.customerNote} onChange={(e) => setOrderForm((f) => ({ ...f, customerNote: e.target.value }))} className={inputCls} />
              </label>
              <button disabled={placing} onClick={submitOrder} className="w-full rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                {placing ? 'Placing…' : 'Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
