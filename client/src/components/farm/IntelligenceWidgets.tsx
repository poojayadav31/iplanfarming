import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Droplets, Leaf, Shield, TrendingUp, Calendar as CalIcon, Sun, Plus, CheckCircle2, Circle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getSoilHistory, getYearComparison, getCoverCrops, getBorderCrops, getVarieties,
  getDroughtContingency, recordCheckIn, listSowingBatches, createSowingBatches, updateSowingBatch,
} from '../../lib/api';
import type { SoilSnapshot, YearStat, CoverCrop, BorderCropItem, CropVariety, DroughtContingency, SowingBatchItem } from '../../lib/api';

// ─── Soil Trend Chart ─────────────────────────────────────────────────────────

export function SoilTrendChart({ zoneId }: { zoneId: string }) {
  const [data, setData] = useState<SoilSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSoilHistory(zoneId).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [zoneId]);

  if (loading) return null;
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    date: new Date(d.recordedAt).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
    score: Math.round(d.soilHealthScore),
    pH: d.phLevel,
    earthworms: d.earthwormCount,
  }));

  return (
    <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-emerald-600" />
        <h3 className="text-base font-bold text-stone-900">Soil health trend</h3>
        <span className="ml-auto text-xs text-stone-500">{data.length} snapshot{data.length !== 1 ? 's' : ''}</span>
      </div>
      {data.length === 1 ? (
        <p className="mt-3 text-xs text-stone-500">Save your soil report next season to see how natural farming improves your soil.</p>
      ) : (
        <div className="mt-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="score" stroke="#10b981" name="Soil score" strokeWidth={2} />
              <Line type="monotone" dataKey="earthworms" stroke="#f59e0b" name="Earthworms" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

// ─── Year-on-year comparison chart ───────────────────────────────────────────

export function YearComparisonChart({ zoneId }: { zoneId: string }) {
  const [data, setData] = useState<YearStat[]>([]);

  useEffect(() => {
    getYearComparison(zoneId).then(setData).catch(() => {});
  }, [zoneId]);

  if (data.length === 0) return null;

  return (
    <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-blue-600" />
        <h3 className="text-base font-bold text-stone-900">Year-on-year comparison</h3>
      </div>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="totalYieldKg" fill="#10b981" name="Yield (kg)" />
            <Bar dataKey="totalProfit"  fill="#6366f1" name="Profit (₹)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

// ─── Cover crop suggestions (post-harvest) ──────────────────────────────────

export function CoverCropSuggestions({ afterSeason }: { afterSeason: string }) {
  const [list, setList] = useState<CoverCrop[]>([]);

  useEffect(() => {
    getCoverCrops(afterSeason).then(setList).catch(() => {});
  }, [afterSeason]);

  if (list.length === 0) return null;

  return (
    <section className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Leaf className="h-5 w-5 text-emerald-700" />
        <h3 className="text-base font-bold text-emerald-900">Plant a cover crop next</h3>
      </div>
      <p className="mt-1 text-xs text-emerald-700">Don't leave the soil bare. These N-fixers rebuild fertility for free.</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {list.map((c) => (
          <li key={c.id} className="rounded-2xl bg-white p-3">
            <p className="text-sm font-bold text-stone-900">{c.name}</p>
            <p className="text-xs text-stone-600">{c.durationWeeks} weeks · adds ~{c.nitrogenFixedKgPerAcre} kg N/acre</p>
            <p className="mt-1 text-[11px] text-stone-500">{c.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── Border / trap crop suggestions ─────────────────────────────────────────

export function BorderCropSuggestions({ cropName }: { cropName: string }) {
  const [list, setList] = useState<BorderCropItem[]>([]);

  useEffect(() => {
    getBorderCrops(cropName).then(setList).catch(() => {});
  }, [cropName]);

  if (list.length === 0) return null;

  return (
    <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-amber-700" />
        <h3 className="text-base font-bold text-amber-900">Plant on the borders</h3>
      </div>
      <p className="mt-1 text-xs text-amber-700">Border / trap crops protect your main crop from pests and wind — naturally.</p>
      <ul className="mt-3 space-y-2">
        {list.map((b) => (
          <li key={b.id} className="rounded-2xl bg-white p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-stone-900">+ {b.borderCrop}</p>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">{b.purpose.replace('-', ' ')}</span>
            </div>
            {b.notes && <p className="mt-1 text-xs text-stone-600">{b.notes}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── Variety picker (district-aware) ────────────────────────────────────────

export function VarietyPicker({ cropName, district, onPick }: { cropName: string; district?: string; onPick?: (variety: string) => void }) {
  const [list, setList] = useState<CropVariety[]>([]);

  useEffect(() => {
    getVarieties(cropName, district).then(setList).catch(() => {});
  }, [cropName, district]);

  if (list.length === 0) return null;

  return (
    <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Leaf className="h-5 w-5 text-emerald-600" />
        <h3 className="text-base font-bold text-stone-900">Recommended varieties for {cropName}</h3>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {list.map((v) => {
          const isLocal = district && v.recommendedFor.includes(district);
          return (
            <li key={v.id} className={`rounded-2xl border p-3 ${isLocal ? 'border-emerald-300 bg-emerald-50' : 'border-stone-200 bg-stone-50'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-stone-900">{v.varietyName}</p>
                  <p className="text-[10px] text-stone-500">{v.yieldPotential ? `~${v.yieldPotential} kg/acre` : ''} {v.durationDays ? `· ${v.durationDays} days` : ''}</p>
                </div>
                {isLocal && <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[9px] font-bold text-emerald-800">LOCAL</span>}
              </div>
              {v.pestResistance && <p className="mt-1 text-[11px] text-stone-600">🛡 {v.pestResistance}</p>}
              {v.notes && <p className="mt-1 text-[11px] text-stone-500">{v.notes}</p>}
              {onPick && (
                <button onClick={() => onPick(v.varietyName)} className="mt-2 w-full rounded-xl bg-emerald-600 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700">
                  Use this variety
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ─── Drought contingency banner ─────────────────────────────────────────────

export function DroughtBanner({ farmId }: { farmId: string }) {
  const [data, setData] = useState<DroughtContingency | null>(null);

  useEffect(() => {
    getDroughtContingency(farmId).then(setData).catch(() => {});
  }, [farmId]);

  if (!data || !data.hasShortfall) return null;

  return (
    <section className="rounded-[28px] border border-rose-300 bg-rose-50 p-5">
      <div className="flex items-start gap-3">
        <Droplets className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />
        <div className="flex-1">
          <p className="text-base font-bold text-rose-900">Water shortfall warning</p>
          <p className="mt-0.5 text-sm text-rose-800">
            Your water sources will last {data.weeksOfWater} weeks but you need {data.weeksRemaining} weeks for the season — a {data.deficitWeeks}-week shortfall.
          </p>
          {data.suggestions && (
            <ul className="mt-3 space-y-1">
              {data.suggestions.map((s, i) => (
                <li key={i} className="text-xs text-rose-800">• {s}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Daily check-in widget ──────────────────────────────────────────────────

export function DailyCheckInWidget({ zoneId }: { zoneId: string }) {
  const [open, setOpen] = useState(false);
  const [pestSeen, setPestSeen] = useState(false);
  const [leavesHealthy, setLeavesHealthy] = useState(true);
  const [soilMoist, setSoilMoist] = useState(true);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await recordCheckIn({ zoneId, pestSeen, leavesHealthy, soilMoist, notes: notes || undefined });
      toast.success('Check-in saved');
      setOpen(false);
      setPestSeen(false); setLeavesHealthy(true); setSoilMoist(true); setNotes('');
    } catch {
      toast.error('Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sun className="h-5 w-5 text-amber-500" />
          <h3 className="text-base font-bold text-stone-900">30-second daily check</h3>
        </div>
        <button onClick={() => setOpen(!open)} className="rounded-2xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700">
          {open ? 'Cancel' : '+ Quick check'}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <Toggle label="Did you see any pests today?" value={pestSeen} onChange={setPestSeen} dangerWhenTrue />
          <Toggle label="Are leaves the right colour?" value={leavesHealthy} onChange={setLeavesHealthy} />
          <Toggle label="Is the soil moist enough?" value={soilMoist} onChange={setSoilMoist} />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else? (optional)" rows={2}
            className="w-full rounded-2xl border border-stone-200 px-3 py-2 text-sm" />
          <button onClick={submit} disabled={saving} className="w-full rounded-2xl bg-green-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {saving ? 'Saving…' : 'Save check-in'}
          </button>
        </div>
      )}
    </section>
  );
}

function Toggle({ label, value, onChange, dangerWhenTrue }: { label: string; value: boolean; onChange: (v: boolean) => void; dangerWhenTrue?: boolean }) {
  const isAlertState = (dangerWhenTrue ? value : !value);
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border-2 p-3 text-left transition ${isAlertState ? 'border-rose-300 bg-rose-50' : 'border-emerald-300 bg-emerald-50'}`}>
      <span className="text-sm font-semibold text-stone-800">{label}</span>
      <span className={`rounded-full px-3 py-1 text-xs font-bold ${value ? 'bg-emerald-600 text-white' : 'bg-stone-300 text-stone-700'}`}>
        {value ? 'YES' : 'NO'}
      </span>
    </button>
  );
}

// ─── Seed rate calculator ───────────────────────────────────────────────────

export function SeedRateBadge({ seedKgPerAcre, spacingNotes, zoneAcres }: { seedKgPerAcre?: number; spacingNotes?: string | null; zoneAcres: number }) {
  if (!seedKgPerAcre) return null;
  const total = Math.round(seedKgPerAcre * zoneAcres * 10) / 10;
  return (
    <div className="rounded-2xl bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
      <p className="font-bold">🌱 Seed needed: <span className="text-base">{total} kg</span> for {zoneAcres.toFixed(2)} acres</p>
      {spacingNotes && <p className="mt-0.5 text-[10px] text-amber-700">Spacing: {spacingNotes}</p>}
    </div>
  );
}

// ─── Successive sowing planner ──────────────────────────────────────────────

export function SuccessiveSowingPlanner({ zoneId }: { zoneId: string }) {
  const [batches, setBatches] = useState<SowingBatchItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [cropName, setCropName] = useState('Vegetables');
  const [batchCount, setBatchCount] = useState(3);
  const [intervalWeeks, setIntervalWeeks] = useState(2);
  const [firstSowDate, setFirstSowDate] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => listSowingBatches(zoneId).then(setBatches).catch(() => {});

  useEffect(() => { load(); }, [zoneId]);

  const create = async () => {
    if (!firstSowDate) return toast.error('Pick a first sowing date');
    setSaving(true);
    try {
      await createSowingBatches({ zoneId, cropName, batchCount, intervalWeeks, firstSowDate });
      toast.success('Batches created');
      setShowForm(false);
      load();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const markSown = async (id: string, alreadyDone: boolean) => {
    await updateSowingBatch(id, { actualSowDate: alreadyDone ? null : new Date().toISOString() });
    load();
  };

  return (
    <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalIcon className="h-5 w-5 text-violet-600" />
          <h3 className="text-base font-bold text-stone-900">Successive sowing</h3>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="rounded-2xl bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700">
          <Plus className="inline h-3 w-3" /> Plan batches
        </button>
      </div>
      <p className="mt-1 text-xs text-stone-500">Stagger sowing 2 weeks apart — get continuous harvest instead of one big glut.</p>

      {showForm && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 rounded-2xl bg-stone-50 p-3">
          <select value={cropName} onChange={(e) => setCropName(e.target.value)} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm">
            {['Vegetables','Tuber crops','Pulses','Maize','Wheat','Rice','Cotton','Gram','Millets','Groundnut'].map((c) => <option key={c}>{c}</option>)}
          </select>
          <input type="date" value={firstSowDate} onChange={(e) => setFirstSowDate(e.target.value)} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" />
          <input type="number" min={2} max={6} value={batchCount} onChange={(e) => setBatchCount(parseInt(e.target.value) || 3)} placeholder="Batches" className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" />
          <input type="number" min={1} max={6} value={intervalWeeks} onChange={(e) => setIntervalWeeks(parseInt(e.target.value) || 2)} placeholder="Weeks apart" className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" />
          <button onClick={create} disabled={saving} className="sm:col-span-2 rounded-xl bg-green-600 py-2 text-sm font-bold text-white disabled:opacity-50">
            {saving ? 'Creating…' : `Create ${batchCount} batches`}
          </button>
        </div>
      )}

      {batches.length > 0 && (
        <ul className="mt-3 space-y-2">
          {batches.map((b) => {
            const isDone = !!b.actualSowDate;
            return (
              <li key={b.id} onClick={() => markSown(b.id, isDone)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-2 ${isDone ? 'border-emerald-200 bg-emerald-50' : 'border-stone-200 bg-stone-50 hover:bg-stone-100'}`}>
                {isDone ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-stone-300" />}
                <div className="flex-1 text-xs">
                  <p className={`font-semibold ${isDone ? 'line-through text-stone-400' : 'text-stone-900'}`}>Batch {b.batchNumber}: {b.cropName}</p>
                  <p className="text-stone-500">Plan: {new Date(b.plannedSowDate).toLocaleDateString()}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
