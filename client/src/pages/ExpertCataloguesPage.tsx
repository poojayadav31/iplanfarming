import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, Save, X, ScrollText, Sprout, Leaf, FlaskConical, TrendingUp, BookOpen, AlertTriangle, MessageSquare, Fence, Lightbulb, Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardShell from '../components/DashboardShell';
import {
  listCatalogue, createInCatalogue, patchInCatalogue, deleteFromCatalogue,
  listFarmerQuestions, answerFarmerQuestion,
  listSymptomSuggestions, patchSymptomSuggestion,
  getEconomicsConfig, updateEconomicsConfig,
} from '../lib/api';
import type { CatalogueKind, SymptomSuggestionItem, EconomicsConfig } from '../lib/api';

interface AnyRow { id: string; [key: string]: unknown }

const TABS: Array<{ key: CatalogueKind | 'questions' | 'symptom-tips' | 'cost-config'; label: string; icon: React.ElementType }> = [
  { key: 'gov-schemes',   label: 'Govt Schemes',     icon: ScrollText },
  { key: 'crop-pairings', label: 'Companions',       icon: Sprout },
  { key: 'cover-crops',   label: 'Cover Crops',      icon: Leaf },
  { key: 'border-crops',  label: 'Border Crops',     icon: Fence },
  { key: 'varieties',     label: 'Varieties',        icon: FlaskConical },
  { key: 'mandi-prices',  label: 'Mandi Prices',     icon: TrendingUp },
  { key: 'knowledge',     label: 'Knowledge Base',   icon: BookOpen },
  { key: 'pest-alerts',   label: 'Pest Alerts',      icon: AlertTriangle },
  { key: 'questions',     label: 'Farmer Questions', icon: MessageSquare },
  { key: 'symptom-tips',  label: 'Symptom Tips',     icon: Lightbulb },
  { key: 'cost-config',   label: 'Cost Config',      icon: Settings2 },
];

// ─── Per-tab field configs ─────────────────────────────────────────────────────
type FieldDef = { key: string; label: string; type?: 'text' | 'textarea' | 'number' | 'boolean' | 'array' | 'select'; options?: string[] };

const FIELDS: Record<CatalogueKind, FieldDef[]> = {
  'gov-schemes': [
    { key: 'schemeName',       label: 'Scheme Name' },
    { key: 'category',         label: 'Category', type: 'select', options: ['income-support','insurance','market','credit'] },
    { key: 'benefitSummary',   label: 'Benefit Summary', type: 'textarea' },
    { key: 'eligibilityNotes', label: 'Eligibility', type: 'textarea' },
    { key: 'applyUrl',         label: 'Apply URL' },
    { key: 'active',           label: 'Active',  type: 'boolean' },
  ],
  'crop-pairings': [
    { key: 'primaryCrop',   label: 'Primary Crop' },
    { key: 'companionCrop', label: 'Companion Crop' },
    { key: 'benefit',       label: 'Benefit', type: 'textarea' },
    { key: 'rowRatio',      label: 'Row Ratio (e.g. 4:1)' },
    { key: 'spacingNotes',  label: 'Spacing Notes' },
  ],
  'cover-crops': [
    { key: 'name',                   label: 'Name' },
    { key: 'durationWeeks',          label: 'Duration (weeks)', type: 'number' },
    { key: 'nitrogenFixedKgPerAcre', label: 'Nitrogen fixed (kg/acre)', type: 'number' },
    { key: 'bestForSeason',          label: 'Best for season', type: 'select', options: ['pre-Kharif','post-Kharif','post-Rabi','summer-fallow'] },
    { key: 'description',            label: 'Description', type: 'textarea' },
    { key: 'preparationNotes',       label: 'Preparation Notes', type: 'textarea' },
  ],
  varieties: [
    { key: 'cropName',       label: 'Crop' },
    { key: 'varietyName',    label: 'Variety' },
    { key: 'recommendedFor', label: 'Districts (comma-separated)', type: 'array' },
    { key: 'yieldPotential', label: 'Yield potential (kg/acre)', type: 'number' },
    { key: 'durationDays',   label: 'Duration (days)', type: 'number' },
    { key: 'pestResistance', label: 'Pest Resistance' },
    { key: 'notes',          label: 'Notes', type: 'textarea' },
  ],
  'mandi-prices': [
    { key: 'cropName',        label: 'Crop' },
    { key: 'district',        label: 'District' },
    { key: 'pricePerQuintal', label: 'Price per Quintal (₹)', type: 'number' },
    { key: 'msp',             label: 'MSP (₹)', type: 'number' },
  ],
  knowledge: [
    { key: 'title',       label: 'Title' },
    { key: 'body',        label: 'Body', type: 'textarea' },
    { key: 'category',    label: 'Category', type: 'select', options: ['soil','pest','water','crop','market','general'] },
    { key: 'tags',        label: 'Tags (comma-separated)', type: 'array' },
    { key: 'isPublished', label: 'Published', type: 'boolean' },
  ],
  'pest-alerts': [
    { key: 'district',    label: 'District' },
    { key: 'cropName',    label: 'Crop (optional)' },
    { key: 'pestName',    label: 'Pest Name' },
    { key: 'reportCount', label: 'Report Count', type: 'number' },
    { key: 'isActive',    label: 'Active', type: 'boolean' },
  ],
  'border-crops': [
    { key: 'primaryCrop',    label: 'Primary Crop' },
    { key: 'borderCropName', label: 'Border Crop Name' },
    { key: 'benefit',        label: 'Benefit', type: 'textarea' },
    { key: 'rowRatio',       label: 'Row Ratio (e.g. 4:1)' },
    { key: 'notes',          label: 'Notes', type: 'textarea' },
  ],
};

const blankForm = (fields: FieldDef[]) =>
  Object.fromEntries(fields.map((f) => [f.key, f.type === 'boolean' ? true : f.type === 'array' ? [] : '']));

export default function ExpertCataloguesPage() {
  const [tab, setTab] = useState<CatalogueKind | 'questions' | 'symptom-tips' | 'cost-config'>('gov-schemes');

  return (
    <DashboardShell title="Expert Catalogues" subtitle="Manage all reference data shown to farmers — government schemes, companion plantings, varieties, prices, knowledge base">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1 rounded-2xl bg-stone-100 p-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                tab === key ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </div>

        {tab === 'questions'    ? <FarmerQuestionsTab />
        : tab === 'symptom-tips' ? <SymptomTipsTab />
        : tab === 'cost-config'  ? <CostConfigTab />
        : <CatalogueTab key={tab} kind={tab as CatalogueKind} />}
      </div>
    </DashboardShell>
  );
}

// ─── Generic catalogue CRUD tab ───────────────────────────────────────────────

function CatalogueTab({ kind }: { kind: CatalogueKind }) {
  const fields = FIELDS[kind];
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(blankForm(fields));
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    listCatalogue<AnyRow>(kind).then(setRows).catch(() => toast.error('Could not load')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [kind]);

  const startEdit = (row: AnyRow) => {
    setEditingId(row.id);
    setAdding(false);
    const f: Record<string, unknown> = {};
    for (const fd of fields) f[fd.key] = row[fd.key] ?? (fd.type === 'array' ? [] : fd.type === 'boolean' ? false : '');
    setForm(f);
  };

  const startAdd = () => {
    setEditingId(null);
    setAdding(true);
    setForm(blankForm(fields));
  };

  const cancel = () => { setEditingId(null); setAdding(false); setForm(blankForm(fields)); };

  const save = async () => {
    setSaving(true);
    try {
      if (editingId) await patchInCatalogue(kind, editingId, form);
      else           await createInCatalogue(kind, form);
      toast.success('Saved');
      cancel();
      load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Save failed';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    try { await deleteFromCatalogue(kind, id); toast.success('Deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-600">{rows.length} {rows.length === 1 ? 'entry' : 'entries'}</p>
        <button onClick={startAdd} className="flex items-center gap-2 rounded-2xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700">
          <Plus className="h-4 w-4" /> Add new
        </button>
      </div>

      {(adding || editingId) && (
        <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5">
          <h3 className="mb-3 text-base font-bold text-emerald-900">
            {editingId ? 'Edit entry' : 'Add new entry'}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => <FieldInput key={f.key} field={f} value={form[f.key]} onChange={(v) => setForm({ ...form, [f.key]: v })} />)}
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={save} disabled={saving} className="flex items-center gap-1 rounded-2xl bg-green-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={cancel} className="flex items-center gap-1 rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700">
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? <p className="text-sm text-stone-500">Loading…</p>
      : rows.length === 0 ? <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-sm text-stone-500">No entries yet</p>
      : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  {fields.slice(0, 3).map((f) => {
                    const v = row[f.key];
                    if (v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) return null;
                    return (
                      <p key={f.key} className="text-sm">
                        <span className="font-bold text-stone-900">{f.label}: </span>
                        <span className="text-stone-700">{Array.isArray(v) ? v.join(', ') : String(v)}</span>
                      </p>
                    );
                  })}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => startEdit(row)} className="rounded-xl bg-blue-50 p-2 text-blue-600 hover:bg-blue-100"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => remove(row.id)} className="rounded-xl bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const cls = "w-full rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-sm";

  if (field.type === 'textarea') {
    return (
      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className="text-xs font-semibold text-stone-600">{field.label}</span>
        <textarea value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} rows={3} className={cls} />
      </label>
    );
  }
  if (field.type === 'select') {
    return (
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-stone-600">{field.label}</span>
        <select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} className={cls}>
          <option value="">—</option>
          {field.options?.map((o) => <option key={o}>{o}</option>)}
        </select>
      </label>
    );
  }
  if (field.type === 'boolean') {
    return (
      <label className="flex items-center gap-2 sm:col-span-2">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
        <span className="text-sm font-semibold text-stone-700">{field.label}</span>
      </label>
    );
  }
  if (field.type === 'array') {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    return (
      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className="text-xs font-semibold text-stone-600">{field.label}</span>
        <input value={arr.join(', ')} onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} className={cls} />
      </label>
    );
  }
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-stone-600">{field.label}</span>
      <input type={field.type === 'number' ? 'number' : 'text'} value={(value as string | number) ?? ''} onChange={(e) => onChange(field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)} className={cls} />
    </label>
  );
}

// ─── Cost Config tab ──────────────────────────────────────────────────────────

const COST_FIELDS: Array<{ key: keyof EconomicsConfig; label: string; unit: string; type: 'number' | 'boolean'; hint: string }> = [
  { key: 'landLayoutCostPerAcre',     label: 'Land Bunding & Layout',  unit: '₹ / acre',    type: 'number',  hint: 'One-time CapEx for land preparation and bunding' },
  { key: 'dripIrrigationCostPerAcre', label: 'Drip Irrigation Setup',  unit: '₹ / acre',    type: 'number',  hint: 'One-time CapEx for drip/sprinkler installation' },
  { key: 'solarDryerCostFlat',        label: 'Solar Dryer',            unit: '₹ flat/farm', type: 'number',  hint: 'One-time CapEx — one unit per farm regardless of area' },
  { key: 'annualLabourCost',           label: 'Annual Labour Cost',     unit: '₹ / year',    type: 'number',  hint: 'Recurring OpEx — total annual wage bill for the farm' },
  { key: 'labourRatePerHour',          label: 'Labour Rate',            unit: '₹ / hour',    type: 'number',  hint: 'Used in weekly plan cost calculations per task' },
  { key: 'jeevamritHomemade',          label: 'Jeevamrit Homemade',     unit: '',             type: 'boolean', hint: 'When ON, natural input cost = ₹0 (farmer prepares at home)' },
];

function CostConfigTab() {
  const [config, setConfig] = useState<EconomicsConfig | null>(null);
  const [form, setForm] = useState<Partial<EconomicsConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    getEconomicsConfig()
      .then((c) => { setConfig(c); setForm(c); })
      .catch(() => toast.error('Could not load config'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateEconomicsConfig(form);
      setConfig(updated);
      setForm(updated);
      toast.success('Global cost defaults updated — all farms without overrides will use these rates');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <p className="text-sm text-stone-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <p className="font-semibold">These are platform-wide default cost rates.</p>
        <p className="mt-1 text-xs">They apply to all farms that have not set their own custom costs. Farmers can override individual values per farm on the Economics page.</p>
      </div>

      <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm space-y-4">
        {COST_FIELDS.map((f) => (
          <div key={f.key} className="flex items-start gap-4 border-b border-stone-100 pb-4 last:border-0 last:pb-0">
            <div className="flex-1">
              <p className="text-sm font-bold text-stone-900">{f.label}
                {f.unit && <span className="ml-2 text-xs font-normal text-stone-500">({f.unit})</span>}
              </p>
              <p className="mt-0.5 text-xs text-stone-500">{f.hint}</p>
              {config && (
                <p className="mt-0.5 text-[10px] text-stone-400">
                  Current: <span className="font-semibold">{f.type === 'boolean' ? (config[f.key] ? 'Yes' : 'No') : `₹${Number(config[f.key]).toLocaleString('en-IN')}`}</span>
                </p>
              )}
            </div>
            <div className="shrink-0 w-40">
              {f.type === 'boolean' ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
                    className="h-5 w-5 rounded accent-green-600"
                  />
                  <span className="text-sm text-stone-700">{form[f.key] ? 'Yes' : 'No'}</span>
                </label>
              ) : (
                <input
                  type="number"
                  value={(form[f.key] as number) ?? ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className="w-full rounded-2xl border border-stone-200 px-3 py-2 text-sm text-right"
                />
              )}
            </div>
          </div>
        ))}

        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 rounded-2xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save global defaults'}
        </button>
      </div>
    </div>
  );
}

// ─── Symptom Tips tab ─────────────────────────────────────────────────────────

function SymptomTipsTab() {
  const [rows, setRows] = useState<SymptomSuggestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSymptom, setEditingSymptom] = useState<string | null>(null);
  const [draft, setDraft] = useState({ label: '', suggestion: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    listSymptomSuggestions().then(setRows).catch(() => toast.error('Could not load')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const startEdit = (row: SymptomSuggestionItem) => {
    setEditingSymptom(row.symptom);
    setDraft({ label: row.label, suggestion: row.suggestion });
  };

  const save = async () => {
    if (!editingSymptom || !draft.suggestion.trim()) return;
    setSaving(true);
    try {
      await patchSymptomSuggestion(editingSymptom, { suggestion: draft.suggestion.trim(), label: draft.label.trim() || undefined });
      toast.success('Suggestion updated — farmers will see this immediately');
      setEditingSymptom(null);
      load();
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <p className="text-sm text-stone-500">Loading…</p>;

  return (
    <div className="space-y-4">
      {/* <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold">These suggestions appear instantly when a farmer reports a problem.</p>
        <p className="mt-1 text-xs">Edit the advice text for each symptom below. Changes are live immediately — no code deploy needed.</p>
      </div> */}

      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.symptom} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            {editingSymptom === row.symptom ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-500">Display label (farmer sees this)</label>
                  <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                    className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-500">Suggestion text</label>
                  <textarea value={draft.suggestion} onChange={(e) => setDraft({ ...draft, suggestion: e.target.value })}
                    rows={4} className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm leading-6" />
                </div>
                <div className="flex gap-2">
                  <button onClick={save} disabled={saving}
                    className="flex items-center gap-1 rounded-2xl bg-green-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50 hover:bg-green-700">
                    <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setEditingSymptom(null)}
                    className="flex items-center gap-1 rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700">
                    <X className="h-4 w-4" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-bold text-stone-900">{row.label}</p>
                  <p className="mt-1 text-xs text-stone-400 font-mono">{row.symptom}</p>
                  <p className="mt-2 text-sm leading-6 text-stone-700">{row.suggestion}</p>
                  <p className="mt-2 text-[10px] text-stone-400">Last updated: {new Date(row.updatedAt).toLocaleDateString()}</p>
                </div>
                <button onClick={() => startEdit(row)}
                  className="shrink-0 rounded-xl bg-blue-50 p-2 text-blue-600 hover:bg-blue-100">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Farmer questions tab (special: answer flow) ─────────────────────────────

interface QuestionRow {
  id: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  category: string;
  createdAt: string;
  farmer: { user: { name: string } };
}

function FarmerQuestionsTab() {
  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [answering, setAnswering] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const load = () => {
    setLoading(true);
    listFarmerQuestions().then((d) => setRows(d as QuestionRow[])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const submit = async (id: string) => {
    if (!draft.trim()) return toast.error('Answer required');
    try {
      await answerFarmerQuestion(id, draft.trim());
      toast.success('Answer sent');
      setAnswering(null); setDraft('');
      load();
    } catch { toast.error('Failed'); }
  };

  if (loading) return <p className="text-sm text-stone-500">Loading…</p>;
  if (rows.length === 0) return <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-sm text-stone-500">No farmer questions yet</p>;

  return (
    <ul className="space-y-3">
      {rows.map((q) => (
        <li key={q.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-stone-900">{q.question}</p>
              <p className="text-xs text-stone-500">By {q.farmer.user.name} · {new Date(q.createdAt).toLocaleDateString()}</p>
            </div>
            <span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] font-bold uppercase text-stone-600">{q.category}</span>
          </div>

          {q.answer ? (
            <div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">
              <p className="text-[10px] font-bold uppercase text-emerald-600">Answered</p>
              <p className="mt-1 leading-6">{q.answer}</p>
            </div>
          ) : answering === q.id ? (
            <div className="mt-3 space-y-2">
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4}
                placeholder="Write your answer..." className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm" />
              <div className="flex gap-2">
                <button onClick={() => submit(q.id)} className="rounded-2xl bg-green-600 px-4 py-2 text-sm font-bold text-white">Send answer</button>
                <button onClick={() => { setAnswering(null); setDraft(''); }} className="rounded-2xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => { setAnswering(q.id); setDraft(''); }}
              className="mt-3 rounded-2xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700">
              Answer this
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
