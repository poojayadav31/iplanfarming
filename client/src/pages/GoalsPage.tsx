import { useEffect, useState } from 'react';
import { Target, Plus, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardShell from '../components/DashboardShell';
import { listSeasonGoals, setSeasonGoal } from '../lib/api';
import type { SeasonGoalItem } from '../lib/api';

export default function GoalsPage() {
  const [goals, setGoals] = useState<SeasonGoalItem[]>([]);
  const [adding, setAdding] = useState(false);
  const [season, setSeason] = useState('Kharif');
  const [cropName, setCropName] = useState('');
  const [revenue, setRevenue] = useState('');
  const [yieldKg, setYieldKg] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => listSeasonGoals().then(setGoals).catch(() => {});

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!cropName.trim() || !revenue) return toast.error('Crop and target revenue required');
    setSaving(true);
    try {
      await setSeasonGoal({
        season,
        cropName: cropName.trim(),
        targetRevenue: parseFloat(revenue),
        targetYieldKg: yieldKg ? parseFloat(yieldKg) : undefined,
      });
      toast.success('Goal set');
      setAdding(false); setCropName(''); setRevenue(''); setYieldKg('');
      await load();
    } catch { toast.error('Could not save goal'); }
    finally { setSaving(false); }
  };

  return (
    <DashboardShell title="Season Goals" subtitle="Set what you want to achieve this season — we'll check feasibility based on your farm">
      <div className="space-y-4">
        <button onClick={() => setAdding(!adding)} className="flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700">
          <Plus className="h-4 w-4" /> Add new goal
        </button>

        {adding && (
          <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm space-y-3">
            <select value={season} onChange={(e) => setSeason(e.target.value)} className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm">
              <option>Kharif</option><option>Rabi</option><option>Zaid</option>
            </select>
            <input value={cropName} onChange={(e) => setCropName(e.target.value)} placeholder="Crop name (e.g. Wheat)" className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm" />
            <input value={revenue} onChange={(e) => setRevenue(e.target.value)} placeholder="Target revenue (₹)" type="number" className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm" />
            <input value={yieldKg} onChange={(e) => setYieldKg(e.target.value)} placeholder="Target yield (kg) — optional" type="number" className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm" />
            <button onClick={submit} disabled={saving} className="w-full rounded-2xl bg-green-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {saving ? 'Saving…' : 'Save goal'}
            </button>
          </div>
        )}

        {goals.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
            <Target className="mx-auto h-10 w-10 text-stone-300" />
            <p className="mt-3 text-sm text-stone-600">No goals yet. Set one above to track your season.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {goals.map((g) => (
              <li key={g.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-base font-bold text-stone-900">{g.season} {g.cropName}</p>
                    <p className="text-sm text-stone-700">Target ₹{g.targetRevenue.toLocaleString()} {g.targetYieldKg ? `· ${g.targetYieldKg} kg` : ''}</p>
                  </div>
                  {g.feasibilityScore !== null && (
                    <div className={`rounded-full px-3 py-1 text-xs font-bold ${g.feasibilityScore >= 80 ? 'bg-emerald-100 text-emerald-800' : g.feasibilityScore >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                      {g.feasibilityScore}% feasible
                    </div>
                  )}
                </div>
                {g.feasibilityNotes && <p className="mt-2 text-xs text-stone-600">{g.feasibilityNotes}</p>}
                {g.achieved && <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800"><CheckCircle2 className="h-3 w-3" /> Achieved</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardShell>
  );
}
