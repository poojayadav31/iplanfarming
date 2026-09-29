import { useEffect, useState } from 'react';
import { Users, Wrench, Plus, Phone, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardShell from '../components/DashboardShell';
import { listBuyGroups, listEquipment, createBuyGroup, createEquipment } from '../lib/api';
import { farmService } from '../lib/farms';
import type { BuyGroupItem, EquipmentItem } from '../lib/api';

export default function CommunityPage() {
  const [groups, setGroups]     = useState<BuyGroupItem[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [tab, setTab]           = useState<'buy' | 'rent'>('buy');

  const [showBuyForm, setShowBuyForm] = useState(false);
  const [buyForm, setBuyForm] = useState({ itemName: '', totalQuantity: '', unit: 'kg', pricePerUnit: '', contactPhone: '', district: '' });

  const [showEqForm, setShowEqForm] = useState(false);
  const [eqForm, setEqForm] = useState({ equipmentType: 'Tractor', dailyRate: '', contactPhone: '', notes: '', district: '' });

  const load = async () => {
    const [g, e] = await Promise.all([listBuyGroups(), listEquipment()]);
    setGroups(g); setEquipment(e);
  };

  useEffect(() => {
    load().catch(() => {});
    farmService.getFarms().then((farms) => {
      const unique = [...new Set(farms.map((f) => f.district).filter(Boolean))];
      setDistricts(unique);
      if (unique.length > 0) {
        setBuyForm((p) => ({ ...p, district: unique[0] }));
        setEqForm((p) => ({ ...p, district: unique[0] }));
      }
    }).catch(() => {});
  }, []);

  const submitBuy = async () => {
    if (!buyForm.itemName.trim() || !buyForm.totalQuantity || !buyForm.district) return toast.error('Fill all required fields');
    try {
      await createBuyGroup({
        district: buyForm.district,
        itemName: buyForm.itemName,
        totalQuantity: parseFloat(buyForm.totalQuantity),
        unit: buyForm.unit,
        pricePerUnit: buyForm.pricePerUnit ? parseFloat(buyForm.pricePerUnit) : undefined,
        contactPhone: buyForm.contactPhone || undefined,
      });
      toast.success('Group created');
      setShowBuyForm(false);
      setBuyForm((p) => ({ itemName: '', totalQuantity: '', unit: 'kg', pricePerUnit: '', contactPhone: '', district: p.district }));
      await load();
    } catch { toast.error('Failed to create group'); }
  };

  const submitEq = async () => {
    if (!eqForm.equipmentType || !eqForm.district) return toast.error('District required');
    try {
      await createEquipment({
        equipmentType: eqForm.equipmentType,
        district: eqForm.district,
        dailyRate: eqForm.dailyRate ? parseFloat(eqForm.dailyRate) : undefined,
        contactPhone: eqForm.contactPhone || undefined,
        notes: eqForm.notes || undefined,
      });
      toast.success('Listing created');
      setShowEqForm(false);
      setEqForm((p) => ({ equipmentType: 'Tractor', dailyRate: '', contactPhone: '', notes: '', district: p.district }));
      await load();
    } catch { toast.error('Failed to create listing'); }
  };

  return (
    <DashboardShell title="Community" subtitle="Save money by buying together. Rent equipment from neighbours.">
      <div className="space-y-4">

        <div className="flex gap-1 rounded-2xl bg-stone-100 p-1">
          <button onClick={() => setTab('buy')} className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${tab === 'buy' ? 'bg-white shadow-sm text-emerald-700' : 'text-stone-600'}`}>
            <Users className="mr-1 inline h-4 w-4" /> Bulk-buy
          </button>
          <button onClick={() => setTab('rent')} className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${tab === 'rent' ? 'bg-white shadow-sm text-blue-700' : 'text-stone-600'}`}>
            <Wrench className="mr-1 inline h-4 w-4" /> Equipment Rent
          </button>
        </div>

        {/* ── Bulk-buy tab ── */}
        {tab === 'buy' && (
          <>
            <button onClick={() => setShowBuyForm(!showBuyForm)} className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
              <Plus className="h-4 w-4" /> Start a buy-group
            </button>

            {showBuyForm && (
              <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm space-y-3">
                <p className="text-sm font-bold text-stone-700">New bulk-buy group</p>

                {/* District picker */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-500">District</label>
                  {districts.length > 1 ? (
                    <select value={buyForm.district} onChange={(e) => setBuyForm({ ...buyForm, district: e.target.value })} className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm">
                      {districts.map((d) => <option key={d}>{d}</option>)}
                    </select>
                  ) : (
                    <p className="rounded-2xl bg-stone-50 border border-stone-200 px-3 py-2.5 text-sm text-stone-700 flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-stone-400" />{buyForm.district || 'No district on farm'}
                    </p>
                  )}
                </div>

                <input value={buyForm.itemName} onChange={(e) => setBuyForm({ ...buyForm, itemName: e.target.value })} placeholder="Item (e.g. Neem Cake, Cow Urine)" className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm" />

                <div className="grid grid-cols-2 gap-2">
                  <input value={buyForm.totalQuantity} onChange={(e) => setBuyForm({ ...buyForm, totalQuantity: e.target.value })} placeholder="Total quantity" type="number" className="rounded-2xl border border-stone-200 px-3 py-2.5 text-sm" />
                  <select value={buyForm.unit} onChange={(e) => setBuyForm({ ...buyForm, unit: e.target.value })} className="rounded-2xl border border-stone-200 px-3 py-2.5 text-sm">
                    {['kg', 'L', 'bag', 'quintal'].map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>

                <input value={buyForm.pricePerUnit} onChange={(e) => setBuyForm({ ...buyForm, pricePerUnit: e.target.value })} placeholder="Target price per unit ₹ (optional)" type="number" className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm" />

                <input value={buyForm.contactPhone} onChange={(e) => setBuyForm({ ...buyForm, contactPhone: e.target.value })} placeholder="Your contact phone (so others can reach you)" className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm" />

                <button onClick={submitBuy} className="w-full rounded-2xl bg-green-600 py-2.5 text-sm font-bold text-white hover:bg-green-700">Create group</button>
              </div>
            )}

            {groups.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-sm text-stone-500">
                No buy-groups in your district yet. Start one!
              </p>
            ) : (
              <ul className="space-y-3">
                {groups.map((g) => (
                  <li key={g.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-stone-900">{g.itemName}</p>
                        <p className="mt-0.5 text-xs text-stone-500">
                          {g.totalQuantity} {g.unit}
                          {g.pricePerUnit ? ` · ₹${g.pricePerUnit}/${g.unit}` : ' · Open price'}
                          {' · '}{g.district}
                        </p>
                        {g.organiserName && (
                          <p className="mt-1 text-xs text-stone-500">Organised by <span className="font-semibold text-stone-700">{g.organiserName}</span></p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{g.status}</span>
                    </div>
                    {g.contactPhone && (
                      <a href={`tel:${g.contactPhone}`} className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100">
                        <Phone className="h-3.5 w-3.5" /> Call {g.contactPhone}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {/* ── Equipment Rent tab ── */}
        {tab === 'rent' && (
          <>
            <button onClick={() => setShowEqForm(!showEqForm)} className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
              <Plus className="h-4 w-4" /> List your equipment
            </button>

            {showEqForm && (
              <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm space-y-3">
                <p className="text-sm font-bold text-stone-700">List equipment for rent</p>

                {/* District picker */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-500">District</label>
                  {districts.length > 1 ? (
                    <select value={eqForm.district} onChange={(e) => setEqForm({ ...eqForm, district: e.target.value })} className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm">
                      {districts.map((d) => <option key={d}>{d}</option>)}
                    </select>
                  ) : (
                    <p className="rounded-2xl bg-stone-50 border border-stone-200 px-3 py-2.5 text-sm text-stone-700 flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-stone-400" />{eqForm.district || 'No district on farm'}
                    </p>
                  )}
                </div>

                <select value={eqForm.equipmentType} onChange={(e) => setEqForm({ ...eqForm, equipmentType: e.target.value })} className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm">
                  {['Tractor', 'Sprayer', 'Harvester', 'Cultivator', 'Trolley', 'Pump', 'Rotavator', 'Thresher'].map((t) => <option key={t}>{t}</option>)}
                </select>

                <input value={eqForm.dailyRate} onChange={(e) => setEqForm({ ...eqForm, dailyRate: e.target.value })} placeholder="Daily rate ₹" type="number" className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm" />
                <input value={eqForm.contactPhone} onChange={(e) => setEqForm({ ...eqForm, contactPhone: e.target.value })} placeholder="Contact phone (required)" className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm" />
                <input value={eqForm.notes} onChange={(e) => setEqForm({ ...eqForm, notes: e.target.value })} placeholder="Notes (e.g. includes driver, fuel extra)" className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm" />

                <button onClick={submitEq} className="w-full rounded-2xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700">List equipment</button>
              </div>
            )}

            {equipment.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-sm text-stone-500">
                No equipment listed in your district yet. Be the first!
              </p>
            ) : (
              <ul className="space-y-3">
                {equipment.map((e) => (
                  <li key={e.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-stone-900">{e.equipmentType}</p>
                        <p className="mt-0.5 text-xs text-stone-500">
                          {e.district}
                          {e.dailyRate ? ` · ₹${e.dailyRate}/day` : ''}
                        </p>
                        {e.notes && <p className="mt-1 text-xs text-stone-500">{e.notes}</p>}
                      </div>
                      <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Available</span>
                    </div>
                    {e.contactPhone && (
                      <a href={`tel:${e.contactPhone}`} className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100">
                        <Phone className="h-3.5 w-3.5" /> Call {e.contactPhone}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

      </div>
    </DashboardShell>
  );
}
