import { useEffect, useState } from 'react';
import { ListChecks, Plus, CheckCircle2, Circle } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardShell from '../components/DashboardShell';
import { listChecklist, generateChecklist, toggleChecklist } from '../lib/api';
import type { PreSeasonTaskItem } from '../lib/api';

export default function ChecklistPage() {
  const [items, setItems] = useState<PreSeasonTaskItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [cropName, setCropName] = useState('Wheat');
  const [plantingDate, setPlantingDate] = useState('');

  const load = () => listChecklist().then(setItems).catch(() => {});

  useEffect(() => { load(); }, []);

  const onGenerate = async () => {
    if (!plantingDate) return toast.error('Pick a planting date');
    setGenerating(true);
    try {
      await generateChecklist({ cropName, plantingDate });
      toast.success('Checklist generated');
      await load();
    } catch { toast.error('Could not generate'); }
    finally { setGenerating(false); }
  };

  const onToggle = async (id: string, isDone: boolean) => {
    await toggleChecklist(id, !isDone);
    await load();
  };

  const grouped = items.reduce((acc, it) => {
    if (!acc[it.cropName]) acc[it.cropName] = [];
    acc[it.cropName].push(it);
    return acc;
  }, {} as Record<string, PreSeasonTaskItem[]>);

  return (
    <DashboardShell title="Pre-Season Checklist" subtitle="Auto-generate everything you need to do 4 weeks before sowing">
      <div className="space-y-4">

        <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-stone-900">Generate a new checklist</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <select value={cropName} onChange={(e) => setCropName(e.target.value)} className="rounded-2xl border border-stone-200 px-3 py-2.5 text-sm">
              {['Wheat','Rice','Cotton','Gram','Maize','Millets','Groundnut','Pulses','Vegetables','Tuber crops'].map((c) => <option key={c}>{c}</option>)}
            </select>
            <input type="date" value={plantingDate} onChange={(e) => setPlantingDate(e.target.value)} className="rounded-2xl border border-stone-200 px-3 py-2.5 text-sm" />
            <button onClick={onGenerate} disabled={generating} className="flex items-center justify-center gap-2 rounded-2xl bg-green-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              <Plus className="h-4 w-4" />
              {generating ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </div>

        {Object.keys(grouped).length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
            <ListChecks className="mx-auto h-10 w-10 text-stone-300" />
            <p className="mt-3 text-sm text-stone-600">No checklists yet. Generate one above.</p>
          </div>
        ) : Object.entries(grouped).map(([crop, list]) => (
          <section key={crop} className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-stone-900">{crop}</h2>
            <ul className="mt-3 space-y-2">
              {list.map((t) => (
                <li key={t.id} onClick={() => onToggle(t.id, t.isDone)}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 ${t.isDone ? 'border-emerald-200 bg-emerald-50' : 'border-stone-200 bg-stone-50 hover:bg-stone-100'}`}>
                  {t.isDone ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className="h-5 w-5 text-stone-300" />}
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${t.isDone ? 'line-through text-stone-400' : 'text-stone-900'}`}>{t.title}</p>
                    <p className="text-xs text-stone-500">Due {new Date(t.dueDate).toLocaleDateString()} · {t.category}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </DashboardShell>
  );
}
