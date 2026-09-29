import { Eye, EyeOff, Layers } from 'lucide-react';
import type { LayerVisibility } from '../../types/designer';

interface LayerManagerPanelProps {
  layers: LayerVisibility;
  onToggleLayer: (layerKey: keyof LayerVisibility) => void;
  onToggleAll: (visible: boolean) => void;
  isOpen: boolean;
  onClose: () => void;
  counts?: {
    beds: number;
    crops: number;
    trees: number;
    water: number;
    buildings: number;
    animals: number;
    irrigation: number;
    paths: number;
    fencing: number;
  };
}

export default function LayerManagerPanel({
  layers,
  onToggleLayer,
  onToggleAll,
  isOpen,
  onClose,
  counts,
}: LayerManagerPanelProps) {
  if (!isOpen) return null;

  const LAYER_DEFS: { key: keyof LayerVisibility; label: string; count?: number; dotColor: string }[] = [
    { key: 'beds', label: 'Growing Beds', count: counts?.beds, dotColor: '#d97706' },
    { key: 'crops', label: 'Crops & Vegetables', count: counts?.crops, dotColor: '#22c55e' },
    { key: 'trees', label: 'Trees & Agroforestry', count: counts?.trees, dotColor: '#15803d' },
    { key: 'water', label: 'Water & Ponds', count: counts?.water, dotColor: '#0284c7' },
    { key: 'buildings', label: 'Structures & Sheds', count: counts?.buildings, dotColor: '#b45309' },
    { key: 'animals', label: 'Animal Shelters', count: counts?.animals, dotColor: '#92400e' },
    { key: 'irrigation', label: 'Irrigation Lines', count: counts?.irrigation, dotColor: '#2563eb' },
    { key: 'paths', label: 'Paths & Accessways', count: counts?.paths, dotColor: '#a8a29e' },
    { key: 'fencing', label: 'Fencing & Perimeter', count: counts?.fencing, dotColor: '#78716c' },
    { key: 'grid', label: '2m Metric Grid', dotColor: '#94a3b8' },
    { key: 'boundary', label: 'Farm Boundary', dotColor: '#166534' },
  ];

  return (
    <div className="absolute right-4 top-16 z-30 w-72 rounded-2xl border border-stone-200 bg-white/95 p-3.5 shadow-xl backdrop-blur animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-green-700" />
          <h3 className="text-xs font-bold text-stone-900">Layer Visibility</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-[11px] font-bold text-stone-400 hover:text-stone-700"
        >
          ✕
        </button>
      </div>

      <div className="my-2 flex items-center justify-between text-[10px] font-semibold text-stone-500">
        <button
          type="button"
          onClick={() => onToggleAll(true)}
          className="text-green-700 hover:underline"
        >
          Show All
        </button>
        <button
          type="button"
          onClick={() => onToggleAll(false)}
          className="text-stone-500 hover:text-stone-800"
        >
          Hide All
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
        {LAYER_DEFS.map((item) => {
          const isVisible = layers[item.key];
          return (
            <div
              key={item.key}
              onClick={() => onToggleLayer(item.key)}
              className={`flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-1.5 transition select-none ${
                isVisible ? 'bg-stone-50 hover:bg-stone-100' : 'opacity-50 hover:opacity-75'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.dotColor }}
                />
                <span className="text-xs font-medium text-stone-800">{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className="rounded-md bg-stone-200/70 px-1 py-0.2 text-[9px] font-bold text-stone-600">
                    {item.count}
                  </span>
                )}
              </div>

              <button
                type="button"
                className="text-stone-500 hover:text-stone-800"
              >
                {isVisible ? <Eye className="h-3.5 w-3.5 text-green-700" /> : <EyeOff className="h-3.5 w-3.5 text-stone-400" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
