import { useEffect, useState } from 'react';
import { Sprout, Info } from 'lucide-react';
import { getCompanions } from '../../lib/api';
import type { CropPairing } from '../../lib/api';

export default function CompanionSuggestions({ cropName }: { cropName: string }) {
  const [pairs, setPairs] = useState<CropPairing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCompanions(cropName).then(setPairs).catch(() => setPairs([])).finally(() => setLoading(false));
  }, [cropName]);

  if (loading) return null;
  if (pairs.length === 0) return null;

  return (
    <section className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Sprout className="h-5 w-5 text-emerald-700" />
        <h3 className="text-base font-bold text-emerald-900">Plant these alongside {cropName}</h3>
      </div>
      <p className="mt-1 text-xs text-emerald-700">Companion planting boosts yield 15–30% naturally — no chemicals needed.</p>
      <ul className="mt-3 space-y-2">
        {pairs.map((p) => (
          <li key={p.id} className="rounded-2xl bg-white p-3">
            <p className="text-sm font-bold text-stone-900">+ {p.companionCrop}</p>
            <p className="mt-1 text-xs text-stone-600">{p.benefit}</p>
            {(p.rowRatio || p.spacingNotes) && (
              <p className="mt-1 flex items-center gap-1 text-[10px] text-stone-500">
                <Info className="h-3 w-3" />
                {p.rowRatio ? `Ratio: ${p.rowRatio}` : ''} {p.spacingNotes ? `· ${p.spacingNotes}` : ''}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
