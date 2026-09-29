import { useState } from 'react';
import { X, Sprout } from 'lucide-react';
import toast from 'react-hot-toast';
import { recordHarvest } from '../../lib/api';

export default function HarvestRecordModal({ zoneId, cropName, onClose, onSaved }: { zoneId: string; cropName: string; onClose: () => void; onSaved?: () => void }) {
  const [yieldKg, setYieldKg]       = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [totalCost, setTotalCost]   = useState('');
  const [varietyName, setVariety]   = useState('');
  const [notes, setNotes]           = useState('');
  const [saving, setSaving]         = useState(false);

  const submit = async () => {
    if (!yieldKg) return toast.error('Yield is required');
    setSaving(true);
    try {
      await recordHarvest({
        zoneId, cropName,
        yieldKg: parseFloat(yieldKg),
        pricePerKg: pricePerKg ? parseFloat(pricePerKg) : undefined,
        totalCost: totalCost ? parseFloat(totalCost) : undefined,
        varietyName: varietyName.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success('Harvest recorded! Future recommendations will use your real numbers.');
      onSaved?.();
      onClose();
    } catch { toast.error('Could not save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-[28px] bg-white sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-stone-900">Record Harvest — {cropName}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-stone-100"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3 p-5">
          <div>
            <label className="text-xs font-semibold text-stone-600">How much did you harvest? (kg) *</label>
            <input value={yieldKg} onChange={(e) => setYieldKg(e.target.value)} type="number" placeholder="e.g. 1500"
              className="mt-1 w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-600">Sale price per kg (₹) — optional</label>
            <input value={pricePerKg} onChange={(e) => setPricePerKg(e.target.value)} type="number" placeholder="e.g. 25"
              className="mt-1 w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-600">Total cost spent (₹) — optional</label>
            <input value={totalCost} onChange={(e) => setTotalCost(e.target.value)} type="number" placeholder="e.g. 12000"
              className="mt-1 w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-600">Variety planted — optional</label>
            <input value={varietyName} onChange={(e) => setVariety(e.target.value)} placeholder="e.g. HD-2967"
              className="mt-1 w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-600">Notes — optional</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="mt-1 w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm" />
          </div>

          <button onClick={submit} disabled={saving}
            className="w-full rounded-2xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save my harvest'}
          </button>
        </div>
      </div>
    </div>
  );
}
