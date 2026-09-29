import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getExpertOverview,
  getExpertFarms,
  getExpertSoilReports,
  updateExpertSoilReport,
  getExpertCropEconomics,
  updateExpertCropEconomics,
  createExpertCropEconomics,
  getExpertCrops,
  updateExpertCrop,
  createExpertCrop,
  getExpertAdvisories,
  createExpertAdvisory,
  deleteExpertAdvisory,
  addExpertFarmTask,
  getExpertSuggestions,
  createExpertSuggestion,
  deleteExpertSuggestion,
  getExpertSoilCropRefs,
  createExpertSoilCropRef,
  deleteExpertSoilCropRef,
  updateExpertFarmFinancials,
  getExpertLifecycleTemplates,
  createExpertLifecycleTemplate,
  updateExpertLifecycleTemplate,
  deleteExpertLifecycleTemplate,
} from '../lib/api';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, MapPin, FlaskConical, BarChart3, Bell, Lightbulb, Database, CalendarDays,
  ChevronDown, ChevronUp, Pencil, Check, X, Trash2, Plus, CalendarPlus, IndianRupee,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

const TABS = [
  { key: 'overview',    label: 'Overview',        icon: LayoutDashboard },
  { key: 'farms',       label: 'All Farms',        icon: MapPin },
  { key: 'soil',        label: 'Soil Reports',     icon: FlaskConical },
  { key: 'economics',   label: 'Crop Economics',   icon: BarChart3 },
  { key: 'advisories',  label: 'Advisories',       icon: Bell },
  { key: 'suggestions', label: 'Suggestions',      icon: Lightbulb },
  { key: 'reference',   label: 'Reference Data',   icon: Database },
  { key: 'lifecycle',   label: 'Crop Lifecycle',   icon: CalendarDays },
] as const;
type Tab = typeof TABS[number]['key'];

const inr = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;
const score = (s: number) => {
  if (s >= 80) return 'text-green-600';
  if (s >= 50) return 'text-amber-600';
  return 'text-red-500';
};

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const [data, setData] = useState<AnyObj | null>(null);

  useEffect(() => {
    getExpertOverview().then(setData).catch(() => toast.error('Failed to load overview'));
  }, []);

  if (!data) return <Spinner />;

  const stats = [
    { label: 'Total Farms',        value: data.totalFarms },
    { label: 'Total Farmers',      value: data.totalFarmers },
    { label: 'Total Zones',        value: data.totalZones },
    { label: 'Soil Reports',       value: data.soilReportCount },
    { label: 'Avg Soil Score',     value: `${data.avgSoilScore}/100` },
    { label: 'Advisories Posted',  value: data.advisoryCount },
    { label: 'Pending Suggestions',value: data.pendingSuggestions },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white border border-stone-200 p-4 shadow-sm">
            <p className="text-xs text-stone-500 uppercase tracking-wide">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-stone-800">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white border border-stone-200 p-4 shadow-sm">
          <p className="mb-3 font-semibold text-stone-700">Crop Distribution</p>
          {Object.entries(data.cropDistribution as Record<string, number>).map(([crop, count]) => (
            <div key={crop} className="flex items-center justify-between text-sm py-1 border-b border-stone-50 last:border-0">
              <span className="text-stone-600">{crop}</span>
              <span className="font-semibold text-stone-800">{count} zones</span>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-white border border-stone-200 p-4 shadow-sm">
          <p className="mb-3 font-semibold text-stone-700">Avg Soil Score by District</p>
          {(data.avgSoilByDistrict as AnyObj[]).map((d) => (
            <div key={d.district} className="flex items-center justify-between text-sm py-1 border-b border-stone-50 last:border-0">
              <span className="text-stone-600">{d.district}</span>
              <span className={`font-bold ${score(d.avgScore)}`}>{d.avgScore}/100</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── All Farms tab ────────────────────────────────────────────────────────────

function FarmsTab() {
  const [farms, setFarms]             = useState<AnyObj[]>([]);
  const [expanded, setExpanded]       = useState<string | null>(null);
  const [taskFarmId, setTaskFarmId]   = useState<string | null>(null);
  const [finFarmId, setFinFarmId]     = useState<string | null>(null);
  const [finVals, setFinVals]         = useState<AnyObj>({});
  const [savingFin, setSavingFin]     = useState(false);

  useEffect(() => {
    getExpertFarms().then((d) => setFarms(d as AnyObj[])).catch(() => toast.error('Failed to load farms'));
  }, []);

  const openFinancials = (e: React.MouseEvent, farm: AnyObj) => {
    e.stopPropagation();
    setFinFarmId(farm.id);
    const f = farm.farmFinancials;
    setFinVals({
      landLayoutCost:     f?.landLayoutCost     ?? 12500,
      dripIrrigationCost: f?.dripIrrigationCost ?? 40000,
      solarDryerCost:     f?.solarDryerCost     ?? 13500,
      annualLabourCost:   f?.annualLabourCost   ?? 576000,
      jeevamritHomemade:  f?.jeevamritHomemade  ?? true,
    });
  };

  const saveFin = async () => {
    if (!finFarmId) return;
    setSavingFin(true);
    try {
      const updated = await updateExpertFarmFinancials(finFarmId, finVals) as AnyObj;
      setFarms((prev) => prev.map((f) => f.id === finFarmId ? { ...f, farmFinancials: updated } : f));
      setFinFarmId(null);
      toast.success('Farm financials updated');
    } catch { toast.error('Failed to save'); }
    finally { setSavingFin(false); }
  };

  return (
    <div className="space-y-3">
      {farms.map((farm) => (
        <div key={farm.id} className="rounded-2xl bg-white border border-stone-200 shadow-sm overflow-hidden">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-stone-50"
            onClick={() => setExpanded(expanded === farm.id ? null : farm.id)}
          >
            <div>
              <p className="font-semibold text-stone-800">{farm.name}</p>
              <p className="text-xs text-stone-500">{farm.district} · {farm.areaAcres?.toFixed(2)} acres · Farmer: {farm.farmer?.user?.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => openFinancials(e, farm)}
                className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
              >
                <IndianRupee className="h-3.5 w-3.5" /> Financials
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setTaskFarmId(farm.id); }}
                className="flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
              >
                <CalendarPlus className="h-3.5 w-3.5" /> Add Task
              </button>
              {expanded === farm.id ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
            </div>
          </div>

          {expanded === farm.id && (
            <div className="border-t border-stone-100 px-4 py-3">
              {(farm.zones as AnyObj[]).map((z: AnyObj) => (
                <div key={z.id} className="mb-2 rounded-xl border border-stone-100 bg-stone-50 p-3">
                  <p className="text-xs font-semibold text-stone-700">Zone {z.zoneNumber}: {z.name} ({z.areaBigha?.toFixed(2)} bigha)</p>
                  {z.soilReport && (
                    <p className="text-xs text-stone-500">
                      Soil: {z.soilReport.soilType} · Score: <span className={`font-bold ${score(z.soilReport.soilHealthScore)}`}>{z.soilReport.soilHealthScore}/100</span>
                    </p>
                  )}
                  {z.cropAssignment && (
                    <p className="text-xs text-stone-500">Crop: {z.cropAssignment.cropEconomics?.cropName}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {taskFarmId && (
        <AddTaskModal farmId={taskFarmId} farms={farms} onClose={() => setTaskFarmId(null)} />
      )}

      {finFarmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-stone-800">Edit Farm Financials</h3>
              <button onClick={() => setFinFarmId(null)}><X className="h-5 w-5 text-stone-400" /></button>
            </div>
            <p className="mb-4 text-xs text-stone-500">These cost assumptions are used for farm-level profit calculations.</p>
            <div className="space-y-3">
              <Input label="Land Layout Cost (₹/acre)" type="number" value={String(finVals.landLayoutCost)} onChange={(v) => setFinVals({ ...finVals, landLayoutCost: v })} />
              <Input label="Drip Irrigation Cost (₹/acre)" type="number" value={String(finVals.dripIrrigationCost)} onChange={(v) => setFinVals({ ...finVals, dripIrrigationCost: v })} />
              <Input label="Solar Dryer Cost (₹ flat)" type="number" value={String(finVals.solarDryerCost)} onChange={(v) => setFinVals({ ...finVals, solarDryerCost: v })} />
              <Input label="Annual Labour Cost (₹/year)" type="number" value={String(finVals.annualLabourCost)} onChange={(v) => setFinVals({ ...finVals, annualLabourCost: v })} />
              <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
                <input type="checkbox" checked={finVals.jeevamritHomemade} onChange={(e) => setFinVals({ ...finVals, jeevamritHomemade: e.target.checked })} />
                Jeevamrit is homemade (cost = ₹0)
              </label>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => setFinFarmId(null)} className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600">Cancel</button>
              <button disabled={savingFin} onClick={saveFin} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                {savingFin ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddTaskModal({ farmId, farms, onClose }: { farmId: string; farms: AnyObj[]; onClose: () => void }) {
  const farm = farms.find((f) => f.id === farmId);
  const [form, setForm] = useState({
    title: '', scheduledDate: '', category: 'crop_care', priority: 'morning',
    labourWorkers: 1, labourHours: 1, zoneId: '', notes: '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.title.trim() || !form.scheduledDate) return toast.error('Title and date are required');
    setSaving(true);
    try {
      await addExpertFarmTask(farmId, {
        ...form,
        labourWorkers: Number(form.labourWorkers),
        labourHours: Number(form.labourHours),
        zoneId: form.zoneId || undefined,
      });
      toast.success('Task added to farm calendar');
      onClose();
    } catch { toast.error('Failed to add task'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-stone-800">Add Task — {farm?.name}</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-stone-400" /></button>
        </div>

        <div className="space-y-3">
          <Input label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <Input label="Date" type="date" value={form.scheduledDate} onChange={(v) => setForm({ ...form, scheduledDate: v })} />

          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })}
              options={[
                { value: 'crop_care', label: 'Crop Care' },
                { value: 'soil_health', label: 'Soil Health' },
                { value: 'irrigation', label: 'Irrigation' },
                { value: 'harvest', label: 'Harvest' },
                { value: 'general', label: 'General' },
              ]}
            />
            <Select label="Priority" value={form.priority} onChange={(v) => setForm({ ...form, priority: v })}
              options={[{ value: 'morning', label: 'Morning' }, { value: 'afternoon', label: 'Afternoon' }]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Workers" type="number" value={String(form.labourWorkers)} onChange={(v) => setForm({ ...form, labourWorkers: Number(v) })} />
            <Input label="Hours" type="number" value={String(form.labourHours)} onChange={(v) => setForm({ ...form, labourHours: Number(v) })} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Zone (optional)</label>
            <select
              value={form.zoneId}
              onChange={(e) => setForm({ ...form, zoneId: e.target.value })}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">— Farm-level task —</option>
              {(farm?.zones as AnyObj[] ?? []).map((z: AnyObj) => (
                <option key={z.id} value={z.id}>Zone {z.zoneNumber}: {z.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2 justify-end">
          <button onClick={onClose} className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50">Cancel</button>
          <button
            disabled={saving}
            onClick={save}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Add Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Soil Reports tab ─────────────────────────────────────────────────────────

const SOIL_TYPES_LIST    = ['Kanhar', 'Matasi', 'Dorsa', 'Bhata'];
const DRAINAGE_LIST      = ['Fast', 'Balanced', 'Slow'];

function SoilTab() {
  const [reports, setReports]   = useState<AnyObj[]>([]);
  const [filters, setFilters]   = useState({ district: '', soilType: '', minScore: '', maxScore: '' });
  const [editing, setEditing]   = useState<string | null>(null);
  const [editVals, setEditVals] = useState<AnyObj>({});
  const [saving, setSaving]     = useState(false);

  const load = () => {
    const params: Record<string, string> = {};
    if (filters.district) params.district = filters.district;
    if (filters.soilType) params.soilType = filters.soilType;
    if (filters.minScore) params.minScore = filters.minScore;
    if (filters.maxScore) params.maxScore = filters.maxScore;
    getExpertSoilReports(params).then((d) => setReports(d as AnyObj[])).catch(() => toast.error('Failed to load'));
  };

  useEffect(() => { load(); }, []);

  const startEdit = (r: AnyObj) => {
    setEditing(r.id);
    setEditVals({ soilType: r.soilType, drainageSpeed: r.drainageSpeed, phLevel: r.phLevel, earthwormCount: r.earthwormCount });
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      const updated = await updateExpertSoilReport(id, editVals) as AnyObj;
      setReports((prev) => prev.map((r) => r.id === id ? { ...r, ...updated } : r));
      setEditing(null);
      toast.success('Soil report updated — scores recalculated');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Input label="District" value={filters.district} onChange={(v) => setFilters({ ...filters, district: v })} placeholder="Search…" />
          <Select label="Soil Type" value={filters.soilType} onChange={(v) => setFilters({ ...filters, soilType: v })}
            options={[{ value: '', label: 'All Types' }, ...SOIL_TYPES_LIST.map((t) => ({ value: t, label: t }))]}
          />
          <Input label="Min Score" type="number" value={filters.minScore} onChange={(v) => setFilters({ ...filters, minScore: v })} placeholder="0" />
          <Input label="Max Score" type="number" value={filters.maxScore} onChange={(v) => setFilters({ ...filters, maxScore: v })} placeholder="100" />
        </div>
        <button onClick={load} className="mt-3 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
          Apply Filters
        </button>
      </div>

      <div className="space-y-2">
        {reports.map((r) => (
          <div key={r.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-semibold text-stone-800">
                  {r.zone?.farm?.name} — Zone {r.zone?.zoneNumber}: {r.zone?.name}
                </p>
                <p className="text-xs text-stone-400">Farmer: {r.zone?.farm?.farmer?.user?.name} · {r.zone?.farm?.district}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className={`text-xl font-bold ${score(r.soilHealthScore)}`}>{r.soilHealthScore}/100</p>
                  <p className="text-[11px] text-stone-400">{r.scoreLabel}</p>
                </div>
                {editing === r.id ? (
                  <>
                    <button disabled={saving} onClick={() => saveEdit(r.id)} className="rounded-lg bg-green-600 p-1.5 text-white hover:bg-green-700 disabled:opacity-50"><Check className="h-4 w-4" /></button>
                    <button onClick={() => setEditing(null)} className="rounded-lg border border-stone-200 p-1.5 text-stone-500"><X className="h-4 w-4" /></button>
                  </>
                ) : (
                  <button onClick={() => startEdit(r)} className="rounded-lg border border-stone-200 p-1.5 text-stone-500 hover:bg-stone-50"><Pencil className="h-4 w-4" /></button>
                )}
              </div>
            </div>

            {editing === r.id ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 pt-2 border-t border-stone-100">
                <Select label="Soil Type" value={editVals.soilType} onChange={(v) => setEditVals({ ...editVals, soilType: v })}
                  options={SOIL_TYPES_LIST.map((t) => ({ value: t, label: t }))}
                />
                <Select label="Drainage" value={editVals.drainageSpeed} onChange={(v) => setEditVals({ ...editVals, drainageSpeed: v })}
                  options={DRAINAGE_LIST.map((d) => ({ value: d, label: d }))}
                />
                <Input label="pH Level" type="number" value={String(editVals.phLevel ?? '')} onChange={(v) => setEditVals({ ...editVals, phLevel: v })} />
                <Input label="Earthworms (0-20)" type="number" value={String(editVals.earthwormCount ?? '')} onChange={(v) => setEditVals({ ...editVals, earthwormCount: v })} />
              </div>
            ) : (
              <p className="text-xs text-stone-500">
                {r.soilType} · pH {r.phLevel} · Drainage: {r.drainageSpeed} · Earthworms: {r.earthwormCount}
              </p>
            )}
          </div>
        ))}
        {reports.length === 0 && <p className="text-center text-stone-400 py-8">No soil reports match the filters.</p>}
      </div>
    </div>
  );
}

// ─── Crop Economics tab ───────────────────────────────────────────────────────

function EconomicsTab() {
  const [records, setRecords]         = useState<AnyObj[]>([]);
  const [editing, setEditing]         = useState<string | null>(null);
  const [editVals, setEditVals]       = useState<AnyObj>({});
  const [crops, setCrops]             = useState<AnyObj[]>([]);
  const [editingCrop, setEditingCrop] = useState<string | null>(null);
  const [cropVals, setCropVals]       = useState<AnyObj>({});
  const [showNewCrop, setShowNewCrop] = useState(false);
  const [newCrop, setNewCrop] = useState({
    name: '', scientificName: '', season: 'Kharif', minPh: '5.5', maxPh: '7.5',
    estimatedDurationMonths: '4', weeklyWaterRequirementLitersPerAcre: '5000',
    preferredDrainage: 'Balanced', plantingWindowStart: '6', plantingWindowEnd: '10',
    minTempC: '15', maxTempC: '35', rainfallTolerance: 'moderate', minSoilHealthScore: '20',
    seasonDurationWeeks: '17',
    suitableSoilTypes: [] as string[],
  });
  const [newEcon, setNewEcon] = useState({
    cropName: '', season: 'Kharif', durationMonths: '4',
    yieldPerAcreKg: '', rawSalePricePerKg: '', processedSalePricePerKg: '',
    processingCostPerKg: '', seedCostPerAcre: '',
  });
  const [savingNew, setSavingNew] = useState(false);

  useEffect(() => {
    getExpertCropEconomics().then((d) => setRecords(d as AnyObj[])).catch(() => toast.error('Failed to load'));
    getExpertCrops().then((d) => setCrops(d as AnyObj[])).catch(() => {});
  }, []);

  const toggleSoilType = (t: string) => {
    setNewCrop((prev) => ({
      ...prev,
      suitableSoilTypes: prev.suitableSoilTypes.includes(t)
        ? prev.suitableSoilTypes.filter((x) => x !== t)
        : [...prev.suitableSoilTypes, t],
    }));
  };

  const saveNewCrop = async () => {
    if (!newCrop.name.trim()) return toast.error('Crop name is required');
    setSavingNew(true);
    try {
      const crop = await createExpertCrop({ ...newCrop }) as AnyObj;
      setCrops((prev) => [...prev, crop]);
      // auto-fill the economics cropName
      setNewEcon((prev) => ({ ...prev, cropName: newCrop.name.trim(), season: newCrop.season, durationMonths: newCrop.estimatedDurationMonths }));
      toast.success(`Crop "${crop.name}" created`);
      setNewCrop({ name: '', scientificName: '', season: 'Kharif', minPh: '5.5', maxPh: '7.5', estimatedDurationMonths: '4', weeklyWaterRequirementLitersPerAcre: '5000', preferredDrainage: 'Balanced', plantingWindowStart: '6', plantingWindowEnd: '10', minTempC: '15', maxTempC: '35', rainfallTolerance: 'moderate', minSoilHealthScore: '20', seasonDurationWeeks: '17', suitableSoilTypes: [] });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to create crop');
    } finally { setSavingNew(false); }
  };

  const saveNewEcon = async () => {
    if (!newEcon.cropName.trim()) return toast.error('Crop name is required');
    setSavingNew(true);
    try {
      const econ = await createExpertCropEconomics({ ...newEcon }) as AnyObj;
      setRecords((prev) => [...prev, econ]);
      setShowNewCrop(false);
      setNewEcon({ cropName: '', season: 'Kharif', durationMonths: '4', yieldPerAcreKg: '', rawSalePricePerKg: '', processedSalePricePerKg: '', processingCostPerKg: '', seedCostPerAcre: '' });
      toast.success('Crop economics entry created');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to create economics entry');
    } finally { setSavingNew(false); }
  };

  const startEdit = (r: AnyObj) => {
    setEditing(r.id);
    setEditVals({
      yieldPerAcreKg: r.yieldPerAcreKg,
      rawSalePricePerKg: r.rawSalePricePerKg,
      processedSalePricePerKg: r.processedSalePricePerKg,
      processingCostPerKg: r.processingCostPerKg,
      seedCostPerAcre: r.seedCostPerAcre,
      durationMonths: r.durationMonths,
    });
  };

  const saveEdit = async (id: string) => {
    try {
      const updated = await updateExpertCropEconomics(id, editVals) as AnyObj;
      setRecords((prev) => prev.map((r) => r.id === id ? { ...r, ...updated } : r));
      setEditing(null);
      toast.success('Updated');
    } catch { toast.error('Failed to save'); }
  };

  const startCropEdit = (c: AnyObj) => {
    setEditingCrop(c.id);
    setCropVals({
      weeklyWaterRequirementLitersPerAcre: c.weeklyWaterRequirementLitersPerAcre,
      preferredDrainage: c.preferredDrainage ?? 'Balanced',
      plantingWindowStart: c.plantingWindowStart ?? 6,
      plantingWindowEnd: c.plantingWindowEnd ?? 10,
      minTempC: c.minTempC ?? 15,
      maxTempC: c.maxTempC ?? 35,
      rainfallTolerance: c.rainfallTolerance ?? 'moderate',
      minSoilHealthScore: c.minSoilHealthScore ?? 0,
      seasonDurationWeeks: c.seasonDurationWeeks ?? 17,
      cropFamily: c.cropFamily ?? 'Other',
      riskLevel: c.riskLevel ?? 'intermediate',
      seedKgPerAcre: c.seedKgPerAcre ?? 20,
      spacingNotes: c.spacingNotes ?? '',
    });
  };

  const saveCropEdit = async (id: string) => {
    try {
      const updated = await updateExpertCrop(id, cropVals) as AnyObj;
      setCrops((prev) => prev.map((c) => c.id === id ? { ...c, ...updated } : c));
      setEditingCrop(null);
      toast.success('Updated');
    } catch { toast.error('Failed to save'); }
  };

  return (
    <div className="space-y-6">

      {/* ── Add New Crop Button ── */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowNewCrop(!showNewCrop)}
          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          <Plus className="h-4 w-4" /> Add New Crop
        </button>
      </div>

      {/* ── New Crop Modal ── */}
      {showNewCrop && (
        <div className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm space-y-5">
          <p className="font-semibold text-stone-800">Step 1 — Create Crop</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Input label="Crop Name *" value={newCrop.name} onChange={(v) => setNewCrop({ ...newCrop, name: v })} />
            <Input label="Scientific Name" value={newCrop.scientificName} onChange={(v) => setNewCrop({ ...newCrop, scientificName: v })} />
            <Select label="Season *" value={newCrop.season} onChange={(v) => setNewCrop({ ...newCrop, season: v })}
              options={['Kharif','Rabi','Zaid','Perennial'].map((s) => ({ value: s, label: s }))}
            />
            <Input label="Min pH *" type="number" value={newCrop.minPh} onChange={(v) => setNewCrop({ ...newCrop, minPh: v })} />
            <Input label="Max pH *" type="number" value={newCrop.maxPh} onChange={(v) => setNewCrop({ ...newCrop, maxPh: v })} />
            <Input label="Duration (months) *" type="number" value={newCrop.estimatedDurationMonths} onChange={(v) => setNewCrop({ ...newCrop, estimatedDurationMonths: v })} />
            <Input label="Water Req (L/acre/wk)" type="number" value={newCrop.weeklyWaterRequirementLitersPerAcre} onChange={(v) => setNewCrop({ ...newCrop, weeklyWaterRequirementLitersPerAcre: v })} />
            <Select label="Preferred Drainage" value={newCrop.preferredDrainage} onChange={(v) => setNewCrop({ ...newCrop, preferredDrainage: v })}
              options={['Fast','Balanced','Slow','Any'].map((d) => ({ value: d, label: d }))}
            />
            <Input label="Planting Window Start (month)" type="number" value={newCrop.plantingWindowStart} onChange={(v) => setNewCrop({ ...newCrop, plantingWindowStart: v })} />
            <Input label="Planting Window End (month)" type="number" value={newCrop.plantingWindowEnd} onChange={(v) => setNewCrop({ ...newCrop, plantingWindowEnd: v })} />
            <Input label="Min Temp (°C)" type="number" value={newCrop.minTempC} onChange={(v) => setNewCrop({ ...newCrop, minTempC: v })} />
            <Input label="Max Temp (°C)" type="number" value={newCrop.maxTempC} onChange={(v) => setNewCrop({ ...newCrop, maxTempC: v })} />
            <Select label="Rainfall Tolerance" value={newCrop.rainfallTolerance} onChange={(v) => setNewCrop({ ...newCrop, rainfallTolerance: v })}
              options={['drought-tolerant','moderate','water-loving'].map((r) => ({ value: r, label: r }))}
            />
            <Input label="Min Soil Health Score (0-100)" type="number" value={newCrop.minSoilHealthScore} onChange={(v) => setNewCrop({ ...newCrop, minSoilHealthScore: v })} />
            <Input label="Season Duration (weeks)" type="number" value={newCrop.seasonDurationWeeks} onChange={(v) => setNewCrop({ ...newCrop, seasonDurationWeeks: v })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Suitable Soil Types</label>
            <div className="flex gap-2 flex-wrap">
              {SOIL_TYPES_LIST.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleSoilType(t)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${newCrop.suitableSoilTypes.includes(t) ? 'bg-green-600 text-white border-green-600' : 'border-stone-200 text-stone-600 hover:border-stone-400'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <button disabled={savingNew} onClick={saveNewCrop}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
            {savingNew ? 'Creating…' : 'Create Crop'}
          </button>

          <div className="border-t border-stone-100 pt-4">
            <p className="mb-3 font-semibold text-stone-800">Step 2 — Add Financial Data</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Input label="Crop Name *" value={newEcon.cropName} onChange={(v) => setNewEcon({ ...newEcon, cropName: v })} />
              <Select label="Season *" value={newEcon.season} onChange={(v) => setNewEcon({ ...newEcon, season: v })}
                options={['Kharif','Rabi','Zaid','Perennial'].map((s) => ({ value: s, label: s }))}
              />
              <Input label="Duration (months)" type="number" value={newEcon.durationMonths} onChange={(v) => setNewEcon({ ...newEcon, durationMonths: v })} />
              <Input label="Yield (kg/acre)" type="number" value={newEcon.yieldPerAcreKg} onChange={(v) => setNewEcon({ ...newEcon, yieldPerAcreKg: v })} />
              <Input label="Raw Price (₹/kg)" type="number" value={newEcon.rawSalePricePerKg} onChange={(v) => setNewEcon({ ...newEcon, rawSalePricePerKg: v })} />
              <Input label="Processed Price (₹/kg)" type="number" value={newEcon.processedSalePricePerKg} onChange={(v) => setNewEcon({ ...newEcon, processedSalePricePerKg: v })} />
              <Input label="Processing Cost (₹/kg)" type="number" value={newEcon.processingCostPerKg} onChange={(v) => setNewEcon({ ...newEcon, processingCostPerKg: v })} />
              <Input label="Seed Cost (₹/acre)" type="number" value={newEcon.seedCostPerAcre} onChange={(v) => setNewEcon({ ...newEcon, seedCostPerAcre: v })} />
            </div>
            <div className="mt-3 flex gap-2">
              <button disabled={savingNew} onClick={saveNewEcon}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                {savingNew ? 'Saving…' : 'Save Financial Data'}
              </button>
              <button onClick={() => setShowNewCrop(false)} className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div>
        <p className="mb-3 text-sm font-semibold text-stone-700">Crop Financial Data</p>
        <div className="space-y-2">
          {records.map((r) => (
            <div key={r.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-stone-800">{r.cropName}</p>
                  <p className="text-xs text-stone-500">{r.season} · {r.durationMonths} months</p>
                </div>
                {editing === r.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => saveEdit(r.id)} className="rounded-lg bg-green-600 p-1.5 text-white hover:bg-green-700"><Check className="h-4 w-4" /></button>
                    <button onClick={() => setEditing(null)} className="rounded-lg border border-stone-200 p-1.5 text-stone-500 hover:bg-stone-50"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => startEdit(r)} className="rounded-lg border border-stone-200 p-1.5 text-stone-500 hover:bg-stone-50"><Pencil className="h-4 w-4" /></button>
                )}
              </div>

              {editing === r.id ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    ['Yield (kg/acre)', 'yieldPerAcreKg'],
                    ['Raw Price (₹/kg)', 'rawSalePricePerKg'],
                    ['Processed Price (₹/kg)', 'processedSalePricePerKg'],
                    ['Processing Cost (₹/kg)', 'processingCostPerKg'],
                    ['Seed Cost (₹/acre)', 'seedCostPerAcre'],
                    ['Duration (months)', 'durationMonths'],
                  ].map(([label, key]) => (
                    <Input key={key} label={label} type="number" value={String(editVals[key] ?? '')}
                      onChange={(v) => setEditVals({ ...editVals, [key]: v })} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <Kv label="Yield" value={`${r.yieldPerAcreKg} kg/acre`} />
                  <Kv label="Raw Price" value={inr(r.rawSalePricePerKg) + '/kg'} />
                  <Kv label="Processed" value={inr(r.processedSalePricePerKg) + '/kg'} />
                  <Kv label="Processing Cost" value={inr(r.processingCostPerKg) + '/kg'} />
                  <Kv label="Seed Cost" value={inr(r.seedCostPerAcre) + '/acre'} />
                  <Kv label="Duration" value={`${r.durationMonths} months`} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-stone-700">Crop Agronomic Parameters</p>
        <div className="space-y-2">
          {crops.map((c) => (
            <div key={c.id} className="rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-stone-800">{c.name}</p>
                  <p className="text-xs text-stone-500">{c.season} · pH {c.minPh}–{c.maxPh}</p>
                </div>
                {editingCrop === c.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => saveCropEdit(c.id)} className="rounded-lg bg-green-600 p-1.5 text-white"><Check className="h-4 w-4" /></button>
                    <button onClick={() => setEditingCrop(null)} className="rounded-lg border p-1.5 text-stone-400"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => startCropEdit(c)} className="rounded-lg border border-stone-200 p-1.5 text-stone-500 hover:bg-stone-50"><Pencil className="h-3.5 w-3.5" /></button>
                )}
              </div>

              {editingCrop === c.id ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  <Input label="Water (L/acre/wk)" type="number" value={String(cropVals.weeklyWaterRequirementLitersPerAcre ?? '')}
                    onChange={(v) => setCropVals({ ...cropVals, weeklyWaterRequirementLitersPerAcre: v })} />
                  <Select label="Drainage" value={String(cropVals.preferredDrainage ?? 'Balanced')}
                    onChange={(v) => setCropVals({ ...cropVals, preferredDrainage: v })}
                    options={['Fast','Balanced','Slow','Any'].map((d) => ({ value: d, label: d }))}
                  />
                  <Input label="Plant Window Start" type="number" value={String(cropVals.plantingWindowStart ?? '')}
                    onChange={(v) => setCropVals({ ...cropVals, plantingWindowStart: v })} />
                  <Input label="Plant Window End" type="number" value={String(cropVals.plantingWindowEnd ?? '')}
                    onChange={(v) => setCropVals({ ...cropVals, plantingWindowEnd: v })} />
                  <Input label="Min Temp (°C)" type="number" value={String(cropVals.minTempC ?? '')}
                    onChange={(v) => setCropVals({ ...cropVals, minTempC: v })} />
                  <Input label="Max Temp (°C)" type="number" value={String(cropVals.maxTempC ?? '')}
                    onChange={(v) => setCropVals({ ...cropVals, maxTempC: v })} />
                  <Select label="Rainfall Tolerance" value={String(cropVals.rainfallTolerance ?? 'moderate')}
                    onChange={(v) => setCropVals({ ...cropVals, rainfallTolerance: v })}
                    options={['drought-tolerant','moderate','water-loving'].map((r) => ({ value: r, label: r }))}
                  />
                  <Input label="Min Soil Score" type="number" value={String(cropVals.minSoilHealthScore ?? '')}
                    onChange={(v) => setCropVals({ ...cropVals, minSoilHealthScore: v })} />
                  <Input label="Season Duration (weeks)" type="number" value={String(cropVals.seasonDurationWeeks ?? '')}
                    onChange={(v) => setCropVals({ ...cropVals, seasonDurationWeeks: v })} />
                  <Select label="Crop Family" value={String(cropVals.cropFamily ?? 'Other')}
                    onChange={(v) => setCropVals({ ...cropVals, cropFamily: v })}
                    options={['Cereal','Pulse','Cotton','Tuber','Vegetable','Spice','Fruit','Other'].map((f) => ({ value: f, label: f }))} />
                  <Select label="Risk Level" value={String(cropVals.riskLevel ?? 'intermediate')}
                    onChange={(v) => setCropVals({ ...cropVals, riskLevel: v })}
                    options={['beginner','intermediate','expert'].map((r) => ({ value: r, label: r }))} />
                  <Input label="Seed Rate (kg/acre)" type="number" value={String(cropVals.seedKgPerAcre ?? '')}
                    onChange={(v) => setCropVals({ ...cropVals, seedKgPerAcre: v })} />
                  <Input label="Spacing Notes" value={String(cropVals.spacingNotes ?? '')}
                    onChange={(v) => setCropVals({ ...cropVals, spacingNotes: v })} />
                </div>
              ) : (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                  <span>Water: {c.weeklyWaterRequirementLitersPerAcre?.toLocaleString()} L/wk</span>
                  <span>Drainage: {c.preferredDrainage}</span>
                  <span>Planting: month {c.plantingWindowStart}–{c.plantingWindowEnd}</span>
                  <span>Temp: {c.minTempC}–{c.maxTempC}°C</span>
                  <span>Rainfall: {c.rainfallTolerance}</span>
                  <span>Min soil: {c.minSoilHealthScore}</span>
                  <span>Season: {c.seasonDurationWeeks ?? 20} weeks</span>
                  <span>Family: {c.cropFamily ?? 'Other'}</span>
                  <span>Risk: {c.riskLevel ?? 'intermediate'}</span>
                  {c.seedKgPerAcre && <span>Seed: {c.seedKgPerAcre} kg/acre</span>}
                  {c.spacingNotes && <span>Spacing: {c.spacingNotes}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Advisories tab ───────────────────────────────────────────────────────────

function AdvisoriesTab() {
  const [advisories, setAdvisories] = useState<AnyObj[]>([]);
  const [farms, setFarms]           = useState<AnyObj[]>([]);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm] = useState({
    title: '', body: '', category: 'general', season: '', priority: 'normal', isGlobal: true, farmId: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getExpertAdvisories().then((d) => setAdvisories(d as AnyObj[])).catch(() => toast.error('Failed to load advisories'));
    getExpertFarms().then((d) => setFarms(d as AnyObj[])).catch(() => {});
  }, []);

  const submit = async () => {
    if (!form.title.trim() || !form.body.trim() || !form.category) return toast.error('Fill required fields');
    setSaving(true);
    try {
      const a = await createExpertAdvisory({
        ...form,
        farmId: form.isGlobal ? undefined : form.farmId || undefined,
      }) as AnyObj;
      setAdvisories((prev) => [a, ...prev]);
      setShowForm(false);
      setForm({ title: '', body: '', category: 'general', season: '', priority: 'normal', isGlobal: true, farmId: '' });
      toast.success('Advisory posted');
    } catch { toast.error('Failed to post advisory'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    try {
      await deleteExpertAdvisory(id);
      setAdvisories((prev) => prev.filter((a) => a.id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const PRIORITY_COLOR: Record<string, string> = {
    low: 'bg-stone-100 text-stone-600',
    normal: 'bg-blue-50 text-blue-700',
    high: 'bg-amber-50 text-amber-700',
    urgent: 'bg-red-50 text-red-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          <Plus className="h-4 w-4" /> New Advisory
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm space-y-3">
          <Input label="Title *" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />

          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Body *</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Select label="Category *" value={form.category} onChange={(v) => setForm({ ...form, category: v })}
              options={['soil','weather','market','pest','crop','general'].map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
            />
            <Select label="Season" value={form.season} onChange={(v) => setForm({ ...form, season: v })}
              options={[
                { value: '', label: 'All Seasons' },
                { value: 'Kharif', label: 'Kharif' },
                { value: 'Rabi', label: 'Rabi' },
                { value: 'Zaid', label: 'Zaid' },
              ]}
            />
            <Select label="Priority" value={form.priority} onChange={(v) => setForm({ ...form, priority: v })}
              options={['low','normal','high','urgent'].map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
              <input type="checkbox" checked={form.isGlobal} onChange={(e) => setForm({ ...form, isGlobal: e.target.checked, farmId: '' })} />
              Global (all farmers)
            </label>
            {!form.isGlobal && (
              <select
                value={form.farmId}
                onChange={(e) => setForm({ ...form, farmId: e.target.value })}
                className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">— Select Farm —</option>
                {farms.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.farmer?.user?.name})</option>)}
              </select>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600">Cancel</button>
            <button
              disabled={saving}
              onClick={submit}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Posting…' : 'Post Advisory'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {advisories.map((a) => (
          <div key={a.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 mb-1">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_COLOR[a.priority] ?? PRIORITY_COLOR.normal}`}>
                    {a.priority}
                  </span>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">{a.category}</span>
                  {a.isGlobal && <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] text-green-700 font-medium">Global</span>}
                  {a.season && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">{a.season}</span>}
                  {a.farm && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700">{a.farm.name}</span>}
                </div>
                <p className="font-semibold text-stone-800">{a.title}</p>
                <p className="mt-1 text-sm text-stone-600 whitespace-pre-wrap">{a.body}</p>
                <p className="mt-1 text-[11px] text-stone-400">By {a.expert?.user?.name} · {new Date(a.createdAt).toLocaleDateString('en-IN')}</p>
              </div>
              <button onClick={() => remove(a.id)} className="rounded-lg border border-red-100 p-1.5 text-red-400 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {advisories.length === 0 && !showForm && (
          <p className="text-center text-stone-400 py-8">No advisories yet. Post one to help farmers.</p>
        )}
      </div>
    </div>
  );
}

// ─── Suggestions tab ──────────────────────────────────────────────────────────

function SuggestionsTab() {
  const [suggestions, setSuggestions] = useState<AnyObj[]>([]);
  const [farms, setFarms]             = useState<AnyObj[]>([]);
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm] = useState({ zoneId: '', cropName: '', reason: '', season: '' });
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    getExpertSuggestions().then((d) => setSuggestions(d as AnyObj[])).catch(() => toast.error('Failed to load'));
    getExpertFarms().then((d) => setFarms(d as AnyObj[])).catch(() => {});
  }, []);

  const allZones: Array<{ id: string; name: string; zoneNumber: number; farmName: string; farmerName: string }> = farms.flatMap((f) =>
    (f.zones as AnyObj[]).map((z: AnyObj) => ({ id: z.id, name: z.name, zoneNumber: z.zoneNumber, farmName: f.name, farmerName: f.farmer?.user?.name ?? '' }))
  );

  const submit = async () => {
    if (!form.zoneId || !form.cropName || !form.reason || !form.season)
      return toast.error('All fields are required');
    setSaving(true);
    try {
      const s = await createExpertSuggestion(form) as AnyObj;
      setSuggestions((prev) => [s, ...prev]);
      setShowForm(false);
      setForm({ zoneId: '', cropName: '', reason: '', season: '' });
      toast.success('Suggestion sent to farmer');
    } catch { toast.error('Failed to create suggestion'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    try {
      await deleteExpertSuggestion(id);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const STATUS_COLOR: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700',
    ACCEPTED: 'bg-green-50 text-green-700',
    REJECTED: 'bg-red-50 text-red-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          <Plus className="h-4 w-4" /> Suggest Crop
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Zone *</label>
            <select
              value={form.zoneId}
              onChange={(e) => setForm({ ...form, zoneId: e.target.value })}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">— Select Zone —</option>
              {allZones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.farmName} → Zone {z.zoneNumber}: {z.name} ({z.farmerName})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select label="Crop *" value={form.cropName} onChange={(v) => setForm({ ...form, cropName: v })}
              options={[
                { value: '', label: '— Select Crop —' },
                ...['Haldi', 'Papaya', 'Creepers', 'Leafy Vegetable'].map((c) => ({ value: c, label: c })),
              ]}
            />
            <Select label="Season *" value={form.season} onChange={(v) => setForm({ ...form, season: v })}
              options={[
                { value: '', label: '— Season —' },
                ...['Kharif', 'Rabi', 'Zaid', 'Perennial'].map((s) => ({ value: s, label: s })),
              ]}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Reason / Justification *</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              rows={2}
              placeholder="Explain why this crop is suitable for this zone…"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600">Cancel</button>
            <button
              disabled={saving}
              onClick={submit}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Sending…' : 'Send Suggestion'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {suggestions.map((s) => (
          <div key={s.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 mb-1">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[s.status] ?? STATUS_COLOR.PENDING}`}>
                    {s.status}
                  </span>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">{s.season}</span>
                </div>
                <p className="font-semibold text-stone-800">{s.cropName}</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  {s.farm?.name} → Zone {s.zone?.zoneNumber}: {s.zone?.name} · Farmer: {s.farm?.farmer?.user?.name}
                </p>
                <p className="mt-1 text-sm text-stone-600">{s.reason}</p>
                {s.farmerNote && (
                  <p className="mt-1 text-xs text-stone-400 italic">Farmer note: "{s.farmerNote}"</p>
                )}
                <p className="mt-1 text-[11px] text-stone-400">{new Date(s.createdAt).toLocaleDateString('en-IN')}</p>
              </div>
              {s.status === 'PENDING' && (
                <button onClick={() => remove(s.id)} className="rounded-lg border border-red-100 p-1.5 text-red-400 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        {suggestions.length === 0 && !showForm && (
          <p className="text-center text-stone-400 py-8">No suggestions yet.</p>
        )}
      </div>
    </div>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

// ─── Reference Data tab ───────────────────────────────────────────────────────

function ReferenceTab() {
  const [refs, setRefs]       = useState<AnyObj[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ soilType: 'Kanhar', cropName: '', season: 'Kharif', phMin: '5.5', phMax: '7.5', soilFitNotes: '' });
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    getExpertSoilCropRefs().then((d) => setRefs(d as AnyObj[])).catch(() => toast.error('Failed to load'));
  }, []);

  const add = async () => {
    if (!form.cropName.trim()) return toast.error('Crop name is required');
    setSaving(true);
    try {
      const r = await createExpertSoilCropRef({ ...form }) as AnyObj;
      setRefs((prev) => [...prev, r]);
      setShowForm(false);
      setForm({ soilType: 'Kanhar', cropName: '', season: 'Kharif', phMin: '5.5', phMax: '7.5', soilFitNotes: '' });
      toast.success('Reference entry added');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to add');
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    try {
      await deleteExpertSoilCropRef(id);
      setRefs((prev) => prev.filter((r) => r.id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  // Group by soil type
  const grouped: Record<string, AnyObj[]> = {};
  for (const r of refs) {
    if (!grouped[r.soilType]) grouped[r.soilType] = [];
    grouped[r.soilType].push(r);
  }

  const SEASON_COLOR: Record<string, string> = {
    Kharif: 'bg-green-50 text-green-700',
    Rabi:   'bg-blue-50 text-blue-700',
    Zaid:   'bg-amber-50 text-amber-700',
    Perennial: 'bg-purple-50 text-purple-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">Soil-crop suitability table used by the crop recommendation engine.</p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          <Plus className="h-4 w-4" /> Add Entry
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Select label="Soil Type *" value={form.soilType} onChange={(v) => setForm({ ...form, soilType: v })}
              options={SOIL_TYPES_LIST.map((t) => ({ value: t, label: t }))}
            />
            <Input label="Crop Name *" value={form.cropName} onChange={(v) => setForm({ ...form, cropName: v })} />
            <Select label="Season *" value={form.season} onChange={(v) => setForm({ ...form, season: v })}
              options={['Kharif','Rabi','Zaid','Perennial'].map((s) => ({ value: s, label: s }))}
            />
            <Input label="Min pH *" type="number" value={form.phMin} onChange={(v) => setForm({ ...form, phMin: v })} />
            <Input label="Max pH *" type="number" value={form.phMax} onChange={(v) => setForm({ ...form, phMax: v })} />
            <Input label="Soil Fit Notes" value={form.soilFitNotes} onChange={(v) => setForm({ ...form, soilFitNotes: v })} placeholder="Optional" />
          </div>
          <div className="flex gap-2">
            <button disabled={saving} onClick={add} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
              {saving ? 'Adding…' : 'Add Entry'}
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(grouped).map(([soilType, entries]) => (
          <div key={soilType} className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-stone-50 px-4 py-2 border-b border-stone-100">
              <p className="font-semibold text-stone-700 text-sm">{soilType} Soil</p>
            </div>
            <div className="divide-y divide-stone-50">
              {entries.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-stone-50">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${SEASON_COLOR[r.season] ?? 'bg-stone-100 text-stone-600'}`}>
                      {r.season}
                    </span>
                    <span className="text-sm font-medium text-stone-800">{r.cropName}</span>
                    <span className="text-xs text-stone-400">pH {r.phMin}–{r.phMax}</span>
                    {r.soilFitNotes && <span className="text-xs text-stone-400 italic">{r.soilFitNotes}</span>}
                  </div>
                  <button onClick={() => remove(r.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {refs.length === 0 && !showForm && (
          <p className="text-center text-stone-400 py-8">No reference entries yet.</p>
        )}
      </div>
    </div>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Spinner() {
  return <div className="py-12 text-center text-stone-400 animate-pulse">Loading…</div>;
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-stone-400">{label}</p>
      <p className="font-semibold text-stone-700">{value}</p>
    </div>
  );
}

function Input({
  label, value, onChange, type = 'text', placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-stone-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </div>
  );
}

function Select({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-stone-600">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── Lifecycle Templates tab ──────────────────────────────────────────────────

const RECIPE_OPTIONS = [
  { value: '', label: '— None —' },
  { value: 'Jeevamrit', label: 'Jeevamrit' },
  { value: 'Beejamrit', label: 'Beejamrit' },
  { value: 'Agniastra', label: 'Agniastra' },
];

const TASK_TYPE_OPTIONS = [
  'field_prep','planting','fertilizer','weeding','mulching',
  'pest_control','thinning','training','pruning','harvest','observation',
].map((v) => ({ value: v, label: v }));

const CATEGORY_OPTIONS = ['crop_care','inputs','harvest','observation'].map((v) => ({ value: v, label: v }));

const LIFECYCLE_CROP_NAMES = ['Haldi', 'Papaya', 'Creepers', 'Leafy Vegetable'];

function LifecycleTab() {
  const [rows, setRows]         = useState<AnyObj[]>([]);
  const [editing, setEditing]   = useState<string | null>(null);
  const [editVals, setEditVals] = useState<AnyObj>({});
  const [showAdd, setShowAdd]   = useState(false);
  const [newRow, setNewRow]     = useState<AnyObj>({
    cropName: 'Haldi', weekOffset: '', taskType: 'fertilizer', category: 'inputs',
    title: '', priority: 'morning', workers: '2', hoursPerAcre: '8', recipeKey: '', isObservation: false,
  });
  const [saving, setSaving] = useState(false);
  const [cropFilter, setCropFilter] = useState<string>('Haldi');

  useEffect(() => {
    getExpertLifecycleTemplates()
      .then((d) => setRows(d as AnyObj[]))
      .catch(() => toast.error('Failed to load lifecycle templates'));
  }, []);

  const startEdit = (r: AnyObj) => {
    setEditing(r.id);
    setEditVals({ ...r });
  };

  const saveEdit = async (id: string) => {
    try {
      const updated = await updateExpertLifecycleTemplate(id, editVals) as AnyObj;
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, ...updated } : r));
      setEditing(null);
      toast.success('Saved');
    } catch { toast.error('Failed to save'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template task?')) return;
    try {
      await deleteExpertLifecycleTemplate(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const saveNew = async () => {
    if (!newRow.title?.trim()) return toast.error('Title is required');
    if (newRow.weekOffset === '') return toast.error('Week offset is required');
    setSaving(true);
    try {
      const created = await createExpertLifecycleTemplate({ ...newRow }) as AnyObj;
      setRows((prev) => [...prev, created].sort((a, b) =>
        a.cropName.localeCompare(b.cropName) || a.weekOffset - b.weekOffset
      ));
      setShowAdd(false);
      setNewRow({ cropName: 'Haldi', weekOffset: '', taskType: 'fertilizer', category: 'inputs', title: '', priority: 'morning', workers: '2', hoursPerAcre: '8', recipeKey: '', isObservation: false });
      toast.success('Task added');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to create');
    } finally { setSaving(false); }
  };

  const filtered = rows.filter((r) => r.cropName === cropFilter);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {LIFECYCLE_CROP_NAMES.map((name) => (
            <button key={name}
              onClick={() => setCropFilter(name)}
              className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${cropFilter === name ? 'bg-green-600 text-white' : 'border border-stone-200 text-stone-600 hover:bg-stone-50'}`}
            >
              {name} ({rows.filter((r) => r.cropName === name).length})
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
          <Plus className="h-4 w-4" /> Add Task
        </button>
      </div>

      {showAdd && (
        <div className="rounded-2xl border border-green-200 bg-white p-4 shadow-sm space-y-3">
          <p className="font-semibold text-stone-800 text-sm">New Lifecycle Task</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Select label="Crop" value={String(newRow.cropName)} onChange={(v) => setNewRow({ ...newRow, cropName: v })}
              options={LIFECYCLE_CROP_NAMES.map((c) => ({ value: c, label: c }))} />
            <Input label="Week Offset" type="number" value={String(newRow.weekOffset)} onChange={(v) => setNewRow({ ...newRow, weekOffset: v })} />
            <Select label="Task Type" value={String(newRow.taskType)} onChange={(v) => setNewRow({ ...newRow, taskType: v })} options={TASK_TYPE_OPTIONS} />
            <Select label="Category" value={String(newRow.category)} onChange={(v) => setNewRow({ ...newRow, category: v })} options={CATEGORY_OPTIONS} />
            <Input label="Title *" value={String(newRow.title)} onChange={(v) => setNewRow({ ...newRow, title: v })} />
            <Select label="Priority" value={String(newRow.priority)} onChange={(v) => setNewRow({ ...newRow, priority: v })}
              options={[{ value: 'morning', label: 'Morning' }, { value: 'afternoon', label: 'Afternoon' }]} />
            <Input label="Workers" type="number" value={String(newRow.workers)} onChange={(v) => setNewRow({ ...newRow, workers: v })} />
            <Input label="Hours/Acre" type="number" value={String(newRow.hoursPerAcre)} onChange={(v) => setNewRow({ ...newRow, hoursPerAcre: v })} />
            <Select label="Recipe" value={String(newRow.recipeKey)} onChange={(v) => setNewRow({ ...newRow, recipeKey: v })} options={RECIPE_OPTIONS} />
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
            <input type="checkbox" checked={Boolean(newRow.isObservation)}
              onChange={(e) => setNewRow({ ...newRow, isObservation: e.target.checked })}
              className="h-4 w-4 rounded border-stone-300" />
            Observation task (no labour scaling)
          </label>
          <div className="flex gap-2">
            <button disabled={saving} onClick={saveNew}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Add Task'}
            </button>
            <button onClick={() => setShowAdd(false)} className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600">Cancel</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-100 bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-3 py-2 text-left">Week</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Workers</th>
              <th className="px-3 py-2 text-left">Hours/Acre</th>
              <th className="px-3 py-2 text-left">Recipe</th>
              <th className="px-3 py-2 text-left">Time</th>
              <th className="px-3 py-2 text-left">Obs?</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-6 text-center text-stone-400 text-sm">No tasks for {cropFilter}</td></tr>
            )}
            {filtered.map((r) => editing === r.id ? (
              <tr key={r.id} className="bg-green-50">
                <td className="px-2 py-1"><input type="number" value={editVals.weekOffset ?? ''} onChange={(e) => setEditVals({ ...editVals, weekOffset: e.target.value })} className="w-14 rounded border border-stone-300 px-1 py-0.5 text-xs" /></td>
                <td className="px-2 py-1">
                  <select value={editVals.taskType ?? ''} onChange={(e) => setEditVals({ ...editVals, taskType: e.target.value })} className="rounded border border-stone-300 px-1 py-0.5 text-xs">
                    {TASK_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1"><input value={editVals.title ?? ''} onChange={(e) => setEditVals({ ...editVals, title: e.target.value })} className="w-full rounded border border-stone-300 px-1 py-0.5 text-xs" /></td>
                <td className="px-2 py-1">
                  <select value={editVals.category ?? ''} onChange={(e) => setEditVals({ ...editVals, category: e.target.value })} className="rounded border border-stone-300 px-1 py-0.5 text-xs">
                    {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1"><input type="number" value={editVals.workers ?? ''} onChange={(e) => setEditVals({ ...editVals, workers: e.target.value })} className="w-14 rounded border border-stone-300 px-1 py-0.5 text-xs" /></td>
                <td className="px-2 py-1"><input type="number" value={editVals.hoursPerAcre ?? ''} onChange={(e) => setEditVals({ ...editVals, hoursPerAcre: e.target.value })} className="w-16 rounded border border-stone-300 px-1 py-0.5 text-xs" /></td>
                <td className="px-2 py-1">
                  <select value={editVals.recipeKey ?? ''} onChange={(e) => setEditVals({ ...editVals, recipeKey: e.target.value })} className="rounded border border-stone-300 px-1 py-0.5 text-xs">
                    {RECIPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <select value={editVals.priority ?? 'morning'} onChange={(e) => setEditVals({ ...editVals, priority: e.target.value })} className="rounded border border-stone-300 px-1 py-0.5 text-xs">
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                  </select>
                </td>
                <td className="px-2 py-1 text-center">
                  <input type="checkbox" checked={Boolean(editVals.isObservation)} onChange={(e) => setEditVals({ ...editVals, isObservation: e.target.checked })} />
                </td>
                <td className="px-2 py-1">
                  <div className="flex gap-1">
                    <button onClick={() => saveEdit(r.id)} className="rounded bg-green-600 p-1 text-white"><Check className="h-3 w-3" /></button>
                    <button onClick={() => setEditing(null)} className="rounded border p-1 text-stone-400"><X className="h-3 w-3" /></button>
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={r.id} className="hover:bg-stone-50">
                <td className="px-3 py-2 font-mono text-xs text-stone-600">{r.weekOffset}</td>
                <td className="px-3 py-2 text-xs text-stone-500">{r.taskType}</td>
                <td className="px-3 py-2 font-medium text-stone-800">{r.title}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.category === 'harvest' ? 'bg-amber-50 text-amber-700' : r.category === 'inputs' ? 'bg-blue-50 text-blue-700' : r.category === 'observation' ? 'bg-purple-50 text-purple-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {r.category}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-stone-600">{r.workers}</td>
                <td className="px-3 py-2 text-xs text-stone-600">{r.hoursPerAcre}</td>
                <td className="px-3 py-2 text-xs text-stone-500">{r.recipeKey || '—'}</td>
                <td className="px-3 py-2 text-xs text-stone-500 capitalize">{r.priority}</td>
                <td className="px-3 py-2 text-center text-xs">{r.isObservation ? '✓' : ''}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(r)} className="rounded border border-stone-200 p-1 text-stone-400 hover:bg-stone-50"><Pencil className="h-3 w-3" /></button>
                    <button onClick={() => handleDelete(r.id)} className="rounded border border-rose-100 p-1 text-rose-400 hover:bg-rose-50"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-stone-400">Changes take effect for new crop assignments. Existing calendar tasks are not retroactively updated.</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExpertPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');

  if (user?.role !== 'EXPERT') return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">Expert Panel</h1>
            <p className="text-sm text-stone-500">Full database access — manage farm data, post advisories, suggest crops</p>
          </div>
          <a href="/expert/catalogues"
             className="flex items-center gap-2 rounded-2xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700">
            <Database className="h-4 w-4" />
            Manage Catalogues
          </a>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-1 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-sm">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors
                ${tab === key ? 'bg-green-600 text-white shadow-sm' : 'text-stone-600 hover:bg-stone-100'}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'overview'    && <OverviewTab />}
        {tab === 'farms'       && <FarmsTab />}
        {tab === 'soil'        && <SoilTab />}
        {tab === 'economics'   && <EconomicsTab />}
        {tab === 'advisories'  && <AdvisoriesTab />}
        {tab === 'suggestions' && <SuggestionsTab />}
        {tab === 'reference'   && <ReferenceTab />}
        {tab === 'lifecycle'   && <LifecycleTab />}
      </div>
    </div>
  );
}
