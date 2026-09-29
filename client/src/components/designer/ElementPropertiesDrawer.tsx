import {
  X,
  Trash2,
  Copy,
  Sparkles,
} from 'lucide-react';
import type { PlacedElement, ElementType } from '../../types/designer';
import { FARM_ELEMENTS_CATALOGUE } from '../../lib/designerCropsData';
import DesignerIcon from './DesignerIcon';

interface ElementPropertiesDrawerProps {
  element: PlacedElement | null;
  onUpdateElement: (updated: PlacedElement) => void;
  onDeleteElement: (elementId: string) => void;
  onDuplicateElement: (elementId: string) => void;
  onClose: () => void;
}

const COLOR_PRESETS = [
  '#0284c7', // Sky blue (Water)
  '#0369a1', // Deep blue (Tank)
  '#0891b2', // Cyan (Swale)
  '#2563eb', // Blue (Irrigation)
  '#a8a29e', // Stone (Pathway)
  '#78716c', // Stone dark (Fence)
  '#57534e', // Gate
  '#b45309', // Amber (Shed)
  '#38bdf8', // Light blue (Greenhouse)
  '#854d0e', // Earth brown (Compost)
  '#92400e', // Cow shed
  '#c2410c', // Poultry coop
  '#a16207', // Goat shelter
  '#15803d', // Green hedge
];

export default function ElementPropertiesDrawer({
  element,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onClose,
}: ElementPropertiesDrawerProps) {
  if (!element) return null;

  const catalogDef = FARM_ELEMENTS_CATALOGUE.find((e) => e.type === element.type);

  const handleTypeChange = (newType: ElementType) => {
    const def = FARM_ELEMENTS_CATALOGUE.find((e) => e.type === newType);
    if (!def) return;
    onUpdateElement({
      ...element,
      type: newType,
      category: def.category,
      name: element.name === catalogDef?.name ? def.name : element.name,
      color: def.color,
      icon: def.icon,
      heightM: def.default3DHeightM,
    });
  };

  return (
    <aside className="fixed right-0 top-14 bottom-0 z-40 flex w-96 flex-col border-l border-stone-200 bg-white/95 shadow-xl backdrop-blur transition-all">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-stone-100 p-4">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl shadow-2xs"
            style={{ backgroundColor: element.color || '#0284c7' }}
          >
            <DesignerIcon name={element.type} category={element.category} className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900 line-clamp-1">{element.name}</h3>
            <p className="text-[11px] text-stone-500 capitalize">
              {element.category} • {element.width.toFixed(1)}m × {element.height.toFixed(1)}m ({(element.width * element.height).toFixed(1)} m²)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onDuplicateElement(element.id)}
            title="Duplicate Element"
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteElement(element.id)}
            title="Delete Element"
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
        {/* Name Input */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Structure / Element Name
          </label>
          <input
            type="text"
            value={element.name}
            onChange={(e) => onUpdateElement({ ...element, name: e.target.value })}
            className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-900 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>

        {/* Structure Type Selector */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Element Type
          </label>
          <select
            value={element.type}
            onChange={(e) => handleTypeChange(e.target.value as ElementType)}
            className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-900 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            <optgroup label="Water Systems">
              {FARM_ELEMENTS_CATALOGUE.filter((e) => e.category === 'water').map((e) => (
                <option key={e.type} value={e.type}>
                  {e.icon} {e.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Infrastructure & Access">
              {FARM_ELEMENTS_CATALOGUE.filter((e) => e.category === 'infrastructure').map((e) => (
                <option key={e.type} value={e.type}>
                  {e.icon} {e.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Animal Systems">
              {FARM_ELEMENTS_CATALOGUE.filter((e) => e.category === 'animal').map((e) => (
                <option key={e.type} value={e.type}>
                  {e.icon} {e.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Metric Dimensions (Width & Height) */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-800">Ground Footprint Dimensions</span>
            <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-stone-600 border border-stone-200">
              {(element.width * element.height).toFixed(1)} m²
            </span>
          </div>

          {/* Width */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-stone-600 font-semibold mb-1">
              <span>Width (X):</span>
              <span className="font-mono font-bold text-stone-900">{element.width.toFixed(1)} m</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={50.0}
              step={0.5}
              value={element.width}
              onChange={(e) => onUpdateElement({ ...element, width: Math.max(0.5, parseFloat(e.target.value)) })}
              className="w-full accent-green-600"
            />
          </div>

          {/* Height / Length */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-stone-600 font-semibold mb-1">
              <span>Length (Y):</span>
              <span className="font-mono font-bold text-stone-900">{element.height.toFixed(1)} m</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={50.0}
              step={0.5}
              value={element.height}
              onChange={(e) => onUpdateElement({ ...element, height: Math.max(0.5, parseFloat(e.target.value)) })}
              className="w-full accent-green-600"
            />
          </div>
        </div>

        {/* 3D Height / Depth & Rotation */}
        <div className="grid grid-cols-2 gap-3">
          {/* 3D Height */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              3D Height / Depth
            </label>
            <div className="mt-1 flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5">
              <input
                type="number"
                step="0.1"
                value={element.heightM ?? 2.0}
                onChange={(e) => onUpdateElement({ ...element, heightM: parseFloat(e.target.value) || 0 })}
                className="w-full bg-transparent text-xs font-semibold text-stone-900 focus:outline-none"
              />
              <span className="text-[10px] text-stone-400 font-bold">m</span>
            </div>
          </div>

          {/* Rotation */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Rotation (Deg)
            </label>
            <div className="mt-1 flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5">
              <input
                type="number"
                step="15"
                min="0"
                max="360"
                value={element.rotation ?? 0}
                onChange={(e) => onUpdateElement({ ...element, rotation: (parseFloat(e.target.value) || 0) % 360 })}
                className="w-full bg-transparent text-xs font-semibold text-stone-900 focus:outline-none"
              />
              <span className="text-[10px] text-stone-400 font-bold">°</span>
            </div>
          </div>
        </div>

        {/* Quick Rotation Buttons */}
        <div className="flex items-center gap-1.5">
          {[0, 45, 90, 180, 270].map((deg) => (
            <button
              key={deg}
              type="button"
              onClick={() => onUpdateElement({ ...element, rotation: deg })}
              className={`flex-1 rounded-lg py-1 text-[10px] font-bold transition ${
                (element.rotation ?? 0) === deg
                  ? 'bg-green-700 text-white shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {deg}°
            </button>
          ))}
        </div>

        {/* Color Presets */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Element Color &amp; Appearance
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onUpdateElement({ ...element, color })}
                className={`h-6 w-6 rounded-full border-2 transition ${
                  element.color === color ? 'border-stone-900 scale-110 shadow-xs' : 'border-white hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Element Planning Notes
          </label>
          <textarea
            value={element.notes || ''}
            onChange={(e) => onUpdateElement({ ...element, notes: e.target.value })}
            placeholder="Capacity, water flow, builder instructions, materials..."
            rows={3}
            className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-xs text-stone-900 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>

        {/* Agronomic / Infrastructure Guide Info Card */}
        {catalogDef && (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-stone-900">
              <Sparkles className="h-3.5 w-3.5 text-green-700" />
              <span>Specification &amp; Use</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">{catalogDef.description}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
