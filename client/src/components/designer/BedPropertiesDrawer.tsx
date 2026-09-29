import { useState } from 'react';
import {
  X,
  Trash2,
  Copy,
  Plus,
  AlertTriangle,
  HeartHandshake,
  Sprout,
  Check,
} from 'lucide-react';
import { BED_TYPES_CATALOGUE, CROP_LIBRARY, calculateBedSynergy } from '../../lib/designerCropsData';
import DesignerIcon from './DesignerIcon';
import type { FarmBed, BedType, BedCropItem } from '../../types/designer';

interface BedPropertiesDrawerProps {
  bed: FarmBed | null;
  onUpdateBed: (updated: FarmBed) => void;
  onDeleteBed: (bedId: string) => void;
  onDuplicateBed: (bedId: string) => void;
  onClose: () => void;
}

const BED_COLORS = [
  '#d97706', // Raised amber
  '#0284c7', // Sunken sky
  '#ea580c', // Hot orange
  '#0d9488', // Wicking teal
  '#65a30d', // Hugel lime
  '#84cc16', // Keyhole lime
  '#78716c', // Terrace stone
  '#16a34a', // Polyculture green
  '#15803d', // Food forest dark green
  '#c084fc', // Nursery purple
  '#713f12', // Rich loam brown
  '#4d7c0f', // Forest green
];

export default function BedPropertiesDrawer({
  bed,
  onUpdateBed,
  onDeleteBed,
  onDuplicateBed,
  onClose,
}: BedPropertiesDrawerProps) {
  const [showAddCropModal, setShowAddCropModal] = useState(false);
  const [cropSearch, setCropSearch] = useState('');

  if (!bed) return null;

  const currentBedType = BED_TYPES_CATALOGUE.find((b) => b.type === bed.type) ?? BED_TYPES_CATALOGUE[0];
  const synergy = calculateBedSynergy(bed.crops);

  const handleTypeChange = (newType: BedType) => {
    const typeDef = BED_TYPES_CATALOGUE.find((b) => b.type === newType);
    if (!typeDef) return;
    onUpdateBed({
      ...bed,
      type: newType,
      heightMm: typeDef.defaultHeightMm,
      color: typeDef.defaultColor,
    });
  };

  const handleAddCrop = (cropName: string) => {
    const cropDef = CROP_LIBRARY.find((c) => c.name.toLowerCase() === cropName.toLowerCase());
    if (!cropDef) return;

    // Calculate default plants based on bed area and crop spacing
    const areaSqCm = bed.areaSqM * 10000;
    const plantFootprintSqCm = Math.pow(cropDef.spacingCm, 2);
    const estimatedPlants = Math.max(1, Math.floor((areaSqCm * 0.7) / plantFootprintSqCm));

    const newCropItem: BedCropItem = {
      id: `crop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      cropName: cropDef.name,
      category: cropDef.category as any,
      quantity: estimatedPlants,
      spacingCm: cropDef.spacingCm,
      color: cropDef.color,
      icon: cropDef.icon,
    };

    onUpdateBed({
      ...bed,
      crops: [...bed.crops, newCropItem],
    });
    setShowAddCropModal(false);
  };

  const handleRemoveCrop = (cropId: string) => {
    onUpdateBed({
      ...bed,
      crops: bed.crops.filter((c) => c.id !== cropId),
    });
  };

  const handleUpdateQuantity = (cropId: string, quantity: number) => {
    onUpdateBed({
      ...bed,
      crops: bed.crops.map((c) => (c.id === cropId ? { ...c, quantity: Math.max(1, quantity) } : c)),
    });
  };

  return (
    <aside className="fixed right-0 top-14 bottom-0 z-40 flex w-96 flex-col border-l border-stone-200 bg-white/95 shadow-xl backdrop-blur transition-all">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-stone-100 p-4">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl shadow-2xs"
            style={{ backgroundColor: bed.color || currentBedType.defaultColor }}
          >
            <DesignerIcon name={bed.type} category="bed_types" className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900 line-clamp-1">{bed.name}</h3>
            <p className="text-[11px] text-stone-500">
              {bed.type} • {bed.width.toFixed(1)}m × {bed.height.toFixed(1)}m ({bed.areaSqM.toFixed(1)} m²)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onDuplicateBed(bed.id)}
            title="Duplicate Bed"
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteBed(bed.id)}
            title="Delete Bed"
            className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Bed Name Input */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Bed Name</label>
          <input
            type="text"
            value={bed.name}
            onChange={(e) => onUpdateBed({ ...bed, name: e.target.value })}
            className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-900 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>

        {/* Bed Type Selector */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Bed Type &amp; Profile</label>
          <select
            value={bed.type}
            onChange={(e) => handleTypeChange(e.target.value as BedType)}
            className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-900 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            {BED_TYPES_CATALOGUE.map((b) => (
              <option key={b.type} value={b.type}>
                {b.icon} {b.name} ({b.defaultHeightMm > 0 ? `+${b.defaultHeightMm}mm` : `${b.defaultHeightMm}mm`})
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-stone-500">{currentBedType.description}</p>
        </div>

        {/* Metric Dimensions (Width & Height) */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-800">Bed Surface Dimensions</span>
            <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-stone-200">
              {bed.areaSqM.toFixed(1)} m²
            </span>
          </div>

          {/* Width */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-stone-600 font-semibold mb-1">
              <span>Width (X):</span>
              <span className="font-mono font-bold text-stone-900">{bed.width.toFixed(1)} m</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={30.0}
              step={0.5}
              value={bed.width}
              onChange={(e) => {
                const w = Math.max(0.5, parseFloat(e.target.value));
                onUpdateBed({ ...bed, width: w, areaSqM: w * bed.height });
              }}
              className="w-full accent-green-600"
            />
          </div>

          {/* Height / Length */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-stone-600 font-semibold mb-1">
              <span>Length (Y):</span>
              <span className="font-mono font-bold text-stone-900">{bed.height.toFixed(1)} m</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={50.0}
              step={0.5}
              value={bed.height}
              onChange={(e) => {
                const h = Math.max(0.5, parseFloat(e.target.value));
                onUpdateBed({ ...bed, height: h, areaSqM: bed.width * h });
              }}
              className="w-full accent-green-600"
            />
          </div>
        </div>

        {/* Elevation & Rotation */}
        <div className="grid grid-cols-2 gap-3">
          {/* Elevation */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Elevation (mm)
            </label>
            <div className="mt-1 flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5">
              <input
                type="number"
                step="50"
                value={bed.heightMm ?? currentBedType.defaultHeightMm}
                onChange={(e) => onUpdateBed({ ...bed, heightMm: parseInt(e.target.value) || 0 })}
                className="w-full bg-transparent text-xs font-semibold text-stone-900 focus:outline-none"
              />
              <span className="text-[10px] text-stone-400 font-bold">mm</span>
            </div>
          </div>

          {/* Rotation */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Rotation
            </label>
            <div className="mt-1 flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5">
              <input
                type="number"
                step="15"
                min="0"
                max="360"
                value={bed.rotation ?? 0}
                onChange={(e) => onUpdateBed({ ...bed, rotation: (parseFloat(e.target.value) || 0) % 360 })}
                className="w-full bg-transparent text-xs font-semibold text-stone-900 focus:outline-none"
              />
              <span className="text-[10px] text-stone-400 font-bold">°</span>
            </div>
          </div>
        </div>

        {/* Bed Color Presets */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Bed Soil &amp; Frame Color
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {BED_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onUpdateBed({ ...bed, color })}
                className={`h-6 w-6 rounded-full border-2 transition ${
                  bed.color === color ? 'border-stone-900 scale-110 shadow-xs' : 'border-white hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* ── Multi-Crop Companion Roster ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                Multi-Crop Roster ({bed.crops.length})
              </span>
              <p className="text-[10px] text-stone-400">Intercropped species in this bed</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddCropModal(true)}
              className="flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-green-700 transition shadow-2xs"
            >
              <Plus className="h-3 w-3" /> Add Plant
            </button>
          </div>

          {/* Planted Items List */}
          {bed.crops.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 p-4 text-center">
              <Sprout className="mx-auto h-6 w-6 text-stone-300" />
              <p className="mt-1 text-xs font-semibold text-stone-600">No crops assigned</p>
              <p className="text-[11px] text-stone-400">Add plants to calculate companion synergy &amp; harvest</p>
              <button
                type="button"
                onClick={() => setShowAddCropModal(true)}
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-green-700 hover:text-green-800"
              >
                <Plus className="h-3.5 w-3.5" /> Assign First Crop
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {bed.crops.map((crop) => {
                return (
                  <div
                    key={crop.id}
                    className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-2.5 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-lg shadow-2xs shrink-0"
                        style={{ backgroundColor: crop.color ? `${crop.color}25` : '#16a34a25' }}
                      >
                        <DesignerIcon name={crop.cropName} category={crop.category} className="h-4 w-4" style={{ color: crop.color || '#16a34a' }} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-stone-900">{crop.cropName}</p>
                        <p className="text-[10px] text-stone-500">{crop.spacingCm}cm spacing • {crop.category}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          value={crop.quantity}
                          onChange={(e) => handleUpdateQuantity(crop.id, parseInt(e.target.value) || 1)}
                          className="w-14 rounded-lg border border-stone-200 py-0.5 px-1.5 text-center text-xs font-semibold text-stone-800"
                        />
                        <span className="text-[10px] text-stone-400">plants</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveCrop(crop.id)}
                        className="rounded-lg p-1 text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Companion Synergy & Polyculture Index ── */}
        {bed.crops.length > 1 && (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <HeartHandshake className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-stone-900">Companion Synergy</span>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                synergy.score >= 80 ? 'bg-emerald-100 text-emerald-800' : synergy.score >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
              }`}>
                {synergy.score}% Compatibility
              </span>
            </div>

            {synergy.synergies.length > 0 && (
              <div className="space-y-1 pt-1">
                {synergy.synergies.map((s, idx) => (
                  <p key={idx} className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                    <Check className="h-3 w-3 shrink-0" /> {s}
                  </p>
                ))}
              </div>
            )}

            {synergy.conflicts.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-stone-200">
                {synergy.conflicts.map((c, idx) => (
                  <p key={idx} className="flex items-center gap-1.5 text-[11px] font-medium text-rose-700">
                    <AlertTriangle className="h-3 w-3 shrink-0" /> {c}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes Field */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Bed Notes &amp; Preparation</label>
          <textarea
            rows={3}
            value={bed.notes || ''}
            onChange={(e) => onUpdateBed({ ...bed, notes: e.target.value })}
            placeholder="e.g. Added 50kg Ghanjeevamrit, mulched with rice straw..."
            className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>
      </div>

      {/* ── Add Crop Modal Overlay ── */}
      {showAddCropModal && (
        <div className="absolute inset-0 z-50 flex flex-col bg-white p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900">Add Plant to Bed</h4>
            <button
              type="button"
              onClick={() => setShowAddCropModal(false)}
              className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <input
            type="text"
            value={cropSearch}
            onChange={(e) => setCropSearch(e.target.value)}
            placeholder="Search plant name..."
            className="mt-3 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-green-500"
          />

          <div className="mt-3 flex-1 overflow-y-auto space-y-1.5">
            {CROP_LIBRARY.filter((c) => c.category !== 'Trees' && c.name.toLowerCase().includes(cropSearch.toLowerCase())).map((crop) => (
              <div
                key={crop.id}
                onClick={() => handleAddCrop(crop.name)}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-stone-100 p-2 hover:border-green-300 hover:bg-green-50/50 transition"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg shadow-2xs shrink-0"
                    style={{ backgroundColor: crop.bgRgb, border: `1px solid ${crop.color}40` }}
                  >
                    <DesignerIcon name={crop.id} category={crop.category} className="h-4 w-4" style={{ color: crop.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-stone-900">{crop.name}</p>
                    <p className="text-[10px] text-stone-500">{crop.category} • {crop.spacingCm}cm spacing</p>
                  </div>
                </div>
                <Plus className="h-4 w-4 text-green-700" />
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
