import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Droplets } from 'lucide-react';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import type { WaterSource, WaterSourceType, WaterSourcePayload } from '../../types/water';
import {
  addWaterSource,
  updateWaterSource,
  deleteWaterSource,
} from '../../lib/api';
import WaterCapacityGauge from './WaterCapacityGauge';

interface Props {
  farmId: string;
  sources: WaterSource[];
  onChanged: () => void;
}

const SOURCE_TYPES: WaterSourceType[] = ['POND', 'BOREWELL', 'CANAL', 'TANK', 'RIVER'];

const SOURCE_LABELS: Record<WaterSourceType, string> = {
  POND: 'Farm Pond',
  BOREWELL: 'Borewell',
  CANAL: 'Canal',
  TANK: 'Tank / Reservoir',
  RIVER: 'River / Stream',
};

const EMPTY_FORM: WaterSourcePayload = {
  name: '',
  sourceType: 'POND',
  totalCapacityLiters: 0,
  currentLevelLiters: undefined,
};

function WaterSourceForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: WaterSourcePayload;
  onSave: (payload: WaterSourcePayload) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<WaterSourcePayload>(initial);

  const set = (key: keyof WaterSourcePayload, value: string | number) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Source Name</label>
          <input
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. North Pond"
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Source Type</label>
          <select
            value={form.sourceType}
            onChange={(e) => set('sourceType', e.target.value as WaterSourceType)}
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-blue-400 focus:outline-none"
          >
            {SOURCE_TYPES.map((t) => (
              <option key={t} value={t}>{SOURCE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Total Capacity (Liters)</label>
          <input
            required
            type="number"
            min="1"
            step="100"
            value={form.totalCapacityLiters || ''}
            onChange={(e) => set('totalCapacityLiters', Number(e.target.value))}
            placeholder="e.g. 500000"
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">
            Current Level (Liters)
            <span className="ml-1 text-stone-400 font-normal">optional — defaults to full</span>
          </label>
          <input
            type="number"
            min="0"
            step="100"
            value={form.currentLevelLiters ?? ''}
            onChange={(e) =>
              set('currentLevelLiters', e.target.value === '' ? (undefined as unknown as number) : Number(e.target.value))
            }
            placeholder={form.totalCapacityLiters ? String(form.totalCapacityLiters) : '—'}
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:border-blue-400 focus:outline-none"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <Check className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save Source'}
        </button>
      </div>
    </form>
  );
}

export default function WaterSourceManager({ farmId, sources, onChanged }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async (payload: WaterSourcePayload) => {
    setSaving(true);
    try {
      await addWaterSource(farmId, payload);
      toast.success('Water source added');
      setShowAdd(false);
      onChanged();
    } catch (err) {
      const e = err as AxiosError<{ message?: string }>;
      toast.error(e.response?.data?.message ?? 'Failed to add water source');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (sourceId: string, payload: WaterSourcePayload) => {
    setSaving(true);
    try {
      await updateWaterSource(farmId, sourceId, payload);
      toast.success('Water source updated');
      setEditingId(null);
      onChanged();
    } catch (err) {
      const e = err as AxiosError<{ message?: string }>;
      toast.error(e.response?.data?.message ?? 'Failed to update water source');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sourceId: string) => {
    setDeletingId(sourceId);
    try {
      await deleteWaterSource(farmId, sourceId);
      toast.success('Water source removed');
      onChanged();
    } catch (err) {
      const e = err as AxiosError<{ message?: string }>;
      toast.error(e.response?.data?.message ?? 'Failed to remove water source');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-stone-800">Water Sources</h3>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            {sources.length}
          </span>
        </div>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Source
          </button>
        )}
      </div>

      {showAdd && (
        <WaterSourceForm
          initial={EMPTY_FORM}
          onSave={handleAdd}
          onCancel={() => setShowAdd(false)}
          saving={saving}
        />
      )}

      {sources.length === 0 && !showAdd && (
        <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 py-8 text-center">
          <Droplets className="mx-auto mb-2 h-8 w-8 text-blue-300" />
          <p className="text-sm font-medium text-stone-500">No water sources recorded yet</p>
          <p className="mt-1 text-xs text-stone-400">
            Add ponds, borewells, or canals to track your farm's water assets
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sources.map((src) =>
          editingId === src.id ? (
            <div key={src.id} className="col-span-full">
              <WaterSourceForm
                initial={{
                  name: src.name,
                  sourceType: src.sourceType,
                  totalCapacityLiters: src.totalCapacityLiters,
                  currentLevelLiters: src.currentLevelLiters,
                }}
                onSave={(p) => handleEdit(src.id, p)}
                onCancel={() => setEditingId(null)}
                saving={saving}
              />
            </div>
          ) : (
            <div key={src.id} className="relative group">
              <WaterCapacityGauge
                label={src.name}
                currentLiters={src.currentLevelLiters}
                totalLiters={src.totalCapacityLiters}
                sourceType={src.sourceType}
              />
              {/* Action overlay */}
              <div className="absolute right-3 top-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditingId(src.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-stone-200 text-stone-400 hover:text-blue-600 hover:border-blue-200 shadow-sm"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(src.id)}
                  disabled={deletingId === src.id}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-stone-200 text-stone-400 hover:text-red-600 hover:border-red-200 shadow-sm disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
