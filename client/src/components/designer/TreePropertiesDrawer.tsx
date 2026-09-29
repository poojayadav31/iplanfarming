import {
  X,
  Trash2,
  Copy,
  Sparkles,
} from 'lucide-react';
import type { PlacedTree, TreeGrowthCategory } from '../../types/designer';
import { CROP_LIBRARY } from '../../lib/designerCropsData';
import DesignerIcon from './DesignerIcon';

interface TreePropertiesDrawerProps {
  tree: PlacedTree | null;
  onUpdateTree: (updated: PlacedTree) => void;
  onDeleteTree: (treeId: string) => void;
  onDuplicateTree?: (treeId: string) => void;
  onClose: () => void;
}

const TREE_COLORS = [
  '#15803d', // Forest green
  '#16a34a', // Fresh green
  '#65a30d', // Lime green
  '#d97706', // Mango gold
  '#84cc16', // Guava lime
  '#facc15', // Lemon yellow
  '#0d9488', // Coconut teal
  '#eab308', // Banana yellow
  '#ea580c', // Orange
  '#047857', // Emerald
  '#78350f', // Dark amber
];

export default function TreePropertiesDrawer({
  tree,
  onUpdateTree,
  onDeleteTree,
  onDuplicateTree,
  onClose,
}: TreePropertiesDrawerProps) {
  if (!tree) return null;

  const catalogDef = CROP_LIBRARY.find((c) => c.name.toLowerCase() === tree.treeName.toLowerCase());

  return (
    <aside className="fixed right-0 top-14 bottom-0 z-40 flex w-96 flex-col border-l border-stone-200 bg-white/95 shadow-xl backdrop-blur transition-all">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-stone-100 p-4">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl shadow-2xs"
            style={{ backgroundColor: tree.color || '#15803d' }}
          >
            <DesignerIcon name={tree.treeName} category={tree.category || 'Trees'} className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900 line-clamp-1">{tree.treeName}</h3>
            <p className="text-[11px] text-stone-500">
              Canopy: Ø {tree.canopyDiameterM.toFixed(1)}m • Height: {tree.heightM.toFixed(1)}m
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onDuplicateTree && (
            <button
              type="button"
              onClick={() => onDuplicateTree(tree.id)}
              title="Duplicate Tree"
              className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
            >
              <Copy className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDeleteTree(tree.id)}
            title="Delete Tree"
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
        {/* Tree Name / Species Input */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Tree / Species Name
          </label>
          <input
            type="text"
            value={tree.treeName}
            onChange={(e) => onUpdateTree({ ...tree, treeName: e.target.value })}
            className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-900 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>

        {/* Tree Growth Stage & Habit */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Growth Rate &amp; Stage
          </label>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            {(['Slow', 'Medium', 'Fast'] as TreeGrowthCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => onUpdateTree({ ...tree, growthCategory: cat })}
                className={`rounded-xl py-1.5 text-xs font-bold transition ${
                  tree.growthCategory === cat
                    ? 'bg-green-700 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Canopy Diameter Slider */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-stone-800">
              Mature Canopy Diameter (Ø)
            </label>
            <span className="rounded-md bg-white px-2 py-0.5 text-xs font-bold text-emerald-700 border border-stone-200 font-mono">
              {tree.canopyDiameterM.toFixed(1)} m
            </span>
          </div>
          <input
            type="range"
            min={1.0}
            max={20.0}
            step={0.5}
            value={tree.canopyDiameterM}
            onChange={(e) => onUpdateTree({ ...tree, canopyDiameterM: parseFloat(e.target.value) })}
            className="w-full accent-green-600"
          />
          <p className="text-[10px] text-stone-500">
            Controls the shaded clearance ring and root zone on the 2D grid.
          </p>
        </div>

        {/* Tree Height & Trunk Diameter */}
        <div className="grid grid-cols-2 gap-3">
          {/* Tree Height */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 mb-1">
              <span>Tree Height</span>
              <span className="font-mono text-stone-900">{tree.heightM.toFixed(1)}m</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={25.0}
              step={0.5}
              value={tree.heightM}
              onChange={(e) => onUpdateTree({ ...tree, heightM: parseFloat(e.target.value) })}
              className="w-full accent-green-600"
            />
          </div>

          {/* Trunk Diameter */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 mb-1">
              <span>Trunk Width</span>
              <span className="font-mono text-stone-900">{tree.trunkDiameterM.toFixed(2)}m</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1.5}
              step={0.05}
              value={tree.trunkDiameterM}
              onChange={(e) => onUpdateTree({ ...tree, trunkDiameterM: parseFloat(e.target.value) })}
              className="w-full accent-green-600"
            />
          </div>
        </div>

        {/* Spacing Recommendation */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 mb-1">
            <span>Planting Spacing (Center to Center)</span>
            <span className="font-mono text-stone-900">{tree.spacingM.toFixed(1)}m</span>
          </div>
          <input
            type="range"
            min={1.0}
            max={15.0}
            step={0.5}
            value={tree.spacingM}
            onChange={(e) => onUpdateTree({ ...tree, spacingM: parseFloat(e.target.value) })}
            className="w-full accent-green-600"
          />
        </div>

        {/* Tree Color Palette */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Canopy Color Representation
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {TREE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onUpdateTree({ ...tree, color })}
                className={`h-6 w-6 rounded-full border-2 transition ${
                  tree.color === color ? 'border-stone-900 scale-110 shadow-xs' : 'border-white hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Tree Notes */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Tree Planting &amp; Guild Notes
          </label>
          <textarea
            value={tree.notes || ''}
            onChange={(e) => onUpdateTree({ ...tree, notes: e.target.value })}
            placeholder="e.g. Grafted Kesar variety, underplanted with Ginger and Vetiver..."
            rows={3}
            className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-xs text-stone-900 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>

        {/* Agronomic Guide Info Card */}
        {catalogDef && (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-stone-900">
              <Sparkles className="h-3.5 w-3.5 text-green-700" />
              <span>{catalogDef.name} Permaculture Guild Guide</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">{catalogDef.description}</p>
            {catalogDef.companionLikes.length > 0 && (
              <div className="pt-1 border-t border-stone-200">
                <span className="font-bold text-[10px] text-emerald-800">Ideal Understory Companions:</span>
                <p className="text-[10px] text-emerald-700">{catalogDef.companionLikes.join(', ')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
