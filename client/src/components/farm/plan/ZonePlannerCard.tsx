import { useState } from 'react';
import { Loader2, Wand2, User, CheckCircle2, X, ChevronDown } from 'lucide-react';
import type { PlanZone, AvailableCrop } from '../../../types/plan';
import { assignCropToZone, clearZoneAssignment } from '../../../lib/api';
import type { AxiosError } from 'axios';
import toast from 'react-hot-toast';

interface Props {
  zone: PlanZone;
  availableCrops: AvailableCrop[];
  onUpdated: () => void;
}

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

const SEASON_COLORS: Record<string, string> = {
  Kharif: 'bg-green-100 text-green-800',
  Rabi: 'bg-blue-100 text-blue-800',
  Zaid: 'bg-amber-100 text-amber-800',
  Perennial: 'bg-violet-100 text-violet-800',
};

export default function ZonePlannerCard({ zone, availableCrops, onUpdated }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCropId, setSelectedCropId] = useState(zone.suggestion.cropEconomicsId);
  const [notes, setNotes] = useState(zone.suggestion.notes ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const currentCrop = availableCrops.find((c) => c.id === zone.suggestion.cropEconomicsId);
  const selectedCrop = availableCrops.find((c) => c.id === selectedCropId);

  const handleSave = async () => {
    if (!selectedCropId) return;
    setIsSaving(true);
    try {
      await assignCropToZone(zone.id, selectedCropId, notes || undefined);
      toast.success(`${zone.name} assigned to ${selectedCrop?.cropName}`);
      setIsEditing(false);
      onUpdated();
    } catch (err) {
      const e = err as AxiosError<{ message?: string }>;
      toast.error(e.response?.data?.message || 'Failed to save assignment');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsClearing(true);
    try {
      await clearZoneAssignment(zone.id);
      toast.success(`${zone.name} reset to auto-suggestion`);
      setIsEditing(false);
      onUpdated();
    } catch (err) {
      const e = err as AxiosError<{ message?: string }>;
      toast.error(e.response?.data?.message || 'Failed to clear assignment');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="rounded-[24px] border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Zone header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
              {zone.zoneNumber}
            </span>
            <h3 className="font-semibold text-stone-900">{zone.name}</h3>
            {zone.suggestion.isAutoSuggested ? (
              <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                <Wand2 className="h-3 w-3" /> Auto
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <User className="h-3 w-3" /> Set
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-stone-500">
            {zone.areaAcres.toFixed(2)} acres · {zone.areaBigha.toFixed(2)} bigha
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedCropId(zone.suggestion.cropEconomicsId);
            setNotes(zone.suggestion.notes ?? '');
            setIsEditing((v) => !v);
          }}
          className="shrink-0 rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50"
        >
          {isEditing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {/* Soil info */}
      {zone.soilReport && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-lg bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
            {zone.soilReport.soilType}
          </span>
          <span className="rounded-lg bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
            pH {zone.soilReport.phLevel}
          </span>
          <span className="rounded-lg bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
            {zone.soilReport.scoreLabel}
          </span>
        </div>
      )}
      {!zone.soilReport && (
        <p className="mt-2 text-xs italic text-stone-400">No soil report — using size-based suggestion</p>
      )}

      {/* Current assignment */}
      {!isEditing && currentCrop && (
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
          <div>
            <p className="font-semibold text-stone-900">{currentCrop.cropName}</p>
            <p className="mt-0.5 text-xs text-stone-500">{zone.suggestion.reason}</p>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              SEASON_COLORS[currentCrop.season] ?? 'bg-stone-100 text-stone-700'
            }`}
          >
            {currentCrop.season}
          </span>
        </div>
      )}

      {/* Edit form */}
      {isEditing && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Select Crop</label>
            <div className="relative">
              <select
                value={selectedCropId}
                onChange={(e) => setSelectedCropId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-stone-200 bg-white px-3 py-2.5 pr-8 text-sm font-medium text-stone-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                {availableCrops.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.cropName} ({c.season}, {c.durationMonths} mo)
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">
              Notes <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Trying haldi this season"
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Save
            </button>
            {!zone.suggestion.isAutoSuggested && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isClearing}
                title="Reset to auto-suggestion"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
              >
                {isClearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* Economics summary */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-stone-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Gross (Raw)</p>
          <p className="mt-0.5 text-sm font-bold text-emerald-700">
            {inr(zone.economics.grossIncomeRaw)}
          </p>
        </div>
        <div className="rounded-xl bg-stone-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Gross (Processed)</p>
          <p className="mt-0.5 text-sm font-bold text-blue-700">
            {inr(zone.economics.grossIncomeProcessed)}
          </p>
        </div>
        <div className="rounded-xl bg-stone-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Input Cost</p>
          <p className="mt-0.5 text-sm font-bold text-rose-600">
            {inr(zone.economics.inputCost)}
          </p>
        </div>
        <div className="rounded-xl bg-emerald-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Net Profit</p>
          <p className="mt-0.5 text-sm font-bold text-emerald-700">
            {inr(zone.economics.netProfitRaw)}
          </p>
        </div>
      </div>
    </div>
  );
}
