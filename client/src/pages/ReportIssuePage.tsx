import { useEffect, useState } from 'react';
import { AlertCircle, Camera, Send, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardShell from '../components/DashboardShell';
import { reportIssue } from '../lib/api';
import { farmService } from '../lib/farms';
import type { Farm } from '../types/farm';

const SYMPTOMS = [
  { key: 'yellowing_leaves', label: 'Yellow leaves', emoji: '🟡' },
  { key: 'wilting',          label: 'Wilting',        emoji: '😢' },
  { key: 'insect_damage',    label: 'Insect damage',  emoji: '🐛' },
  { key: 'fungal_spots',     label: 'Fungal spots',   emoji: '🍂' },
  { key: 'stunted_growth',   label: 'Slow growth',    emoji: '📉' },
  { key: 'discolouration',   label: 'Other',          emoji: '❓' },
];

export default function ReportIssuePage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmId, setFarmId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [symptom, setSymptom] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [suggestion, setSuggestion] = useState('');

  useEffect(() => {
    farmService.getFarms().then((res) => {
      setFarms(res);
      if (res[0]) setFarmId(res[0].id);
    }).catch(() => {});
  }, []);

  const submit = async () => {
    if (!farmId) return toast.error('Select a farm');
    if (!title.trim() || !description.trim()) return toast.error('Title and description required');
    setSaving(true);
    try {
      const res = await reportIssue({ farmId, title, description, symptom: symptom || undefined, photoUrl: photoUrl || undefined });
      setSuggestion(res.suggestion);
      toast.success('Issue reported. See suggestion below.');
      setTitle(''); setDescription(''); setSymptom(''); setPhotoUrl('');
    } catch {
      toast.error('Could not submit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell title="Report a problem" subtitle="Tell us what's wrong — we'll suggest a natural solution and notify an expert">
      <div className="space-y-5">

        <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="text-sm font-bold text-rose-800">Don't panic — most problems have natural fixes</p>
              <p className="mt-1 text-xs text-rose-700">Fill in what you see. We'll suggest a solution from natural farming, and an expert will review your report within 24 hours.</p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">

          <label className="text-xs font-semibold text-stone-600">Which farm?</label>
          <select value={farmId} onChange={(e) => setFarmId(e.target.value)} className="mt-1 w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm">
            {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>

          <label className="mt-4 block text-xs font-semibold text-stone-600">What do you see? (Pick one)</label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {SYMPTOMS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSymptom(s.key)}
                className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-xs font-semibold ${symptom === s.key ? 'border-rose-500 bg-rose-50' : 'border-stone-200 hover:border-stone-300'}`}
              >
                <span className="text-2xl">{s.emoji}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          <label className="mt-4 block text-xs font-semibold text-stone-600">Short title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Yellow patches on Wheat leaves"
            className="mt-1 w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm" />

          <label className="mt-4 block text-xs font-semibold text-stone-600">Describe what you see</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
            placeholder="When did you notice it? Which part of the plant? How many plants?"
            className="mt-1 w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm" />

          <label className="mt-4 flex items-center gap-2 text-xs font-semibold text-stone-600">
            <Camera className="h-4 w-4" />
            Photo URL (optional)
          </label>
          <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="Paste image URL or upload to Imgur first"
            className="mt-1 w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm" />

          <button onClick={submit} disabled={saving}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50">
            <Send className="h-4 w-4" />
            {saving ? 'Submitting…' : 'Submit & Get Suggestion'}
          </button>
        </div>

        {suggestion && (
          <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-bold text-emerald-900">Suggested solution</p>
                <p className="mt-1 text-sm leading-6 text-emerald-800">{suggestion}</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardShell>
  );
}
