import { useState, useMemo } from 'react';
import {
  Search,
  Sprout,
  TreePine,
  Flower2,
  Apple,
  Layers,
  Building2,
  Info,
  Check,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  CROP_LIBRARY,
  BED_TYPES_CATALOGUE,
  FARM_ELEMENTS_CATALOGUE,
} from '../../lib/designerCropsData';
import DesignerIcon from './DesignerIcon';
import type {
  CropCatalogueItem,
  BedTypeDefinition,
  FarmElementDefinition,
  BedType,
  DesignerTool,
} from '../../types/designer';

interface CropLibrarySidebarProps {
  activeTool: DesignerTool;
  selectedCrop: CropCatalogueItem | null;
  selectedBedType: BedType;
  selectedElement: FarmElementDefinition | null;
  onSelectCrop: (crop: CropCatalogueItem) => void;
  onSelectBedType: (type: BedType) => void;
  onSelectElement: (element: FarmElementDefinition) => void;
  onSelectTool: (tool: DesignerTool) => void;
}

type TabCategory = 'all' | 'vegetables' | 'herbs' | 'fruit' | 'trees' | 'support' | 'elements' | 'bed_types';

export default function CropLibrarySidebar({
  activeTool,
  selectedCrop,
  selectedBedType,
  selectedElement,
  onSelectCrop,
  onSelectBedType,
  onSelectElement,
  onSelectTool,
}: CropLibrarySidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabCategory>('all');
  const [previewItem, setPreviewItem] = useState<CropCatalogueItem | BedTypeDefinition | FarmElementDefinition | null>(null);

  const TABS = [
    { id: 'all', label: 'All Items', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'vegetables', label: 'Vegetables', icon: <Sprout className="h-4 w-4" /> },
    { id: 'herbs', label: 'Herbs', icon: <Flower2 className="h-4 w-4" /> },
    { id: 'fruit', label: 'Fruit', icon: <Apple className="h-4 w-4" /> },
    { id: 'trees', label: 'Trees', icon: <TreePine className="h-4 w-4" /> },
    { id: 'support', label: 'Support Plants', icon: <Flower2 className="h-4 w-4" /> },
    { id: 'bed_types', label: 'Bed Profiles', icon: <Layers className="h-4 w-4" /> },
    { id: 'elements', label: 'Structures & Water', icon: <Building2 className="h-4 w-4" /> },
  ];

  const filteredCrops = useMemo(() => {
    return CROP_LIBRARY.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.benefits.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (activeTab === 'all') return true;
      if (activeTab === 'vegetables') return item.category === 'Vegetables';
      if (activeTab === 'herbs') return item.category === 'Herbs';
      if (activeTab === 'fruit') return item.category === 'Fruit Crops';
      if (activeTab === 'trees') return item.category === 'Trees';
      if (activeTab === 'support') return item.category === 'Support Plants';
      return false;
    });
  }, [searchQuery, activeTab]);

  const filteredBedTypes = useMemo(() => {
    if (activeTab !== 'all' && activeTab !== 'bed_types') return [];
    return BED_TYPES_CATALOGUE.filter((b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.bestFor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.tagline.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, activeTab]);

  const filteredElements = useMemo(() => {
    if (activeTab !== 'all' && activeTab !== 'elements') return [];
    return FARM_ELEMENTS_CATALOGUE.filter((e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, activeTab]);

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-stone-200 bg-white/95 shadow-xs backdrop-blur select-none">
      {/* ── Header & Search ── */}
      <div className="border-b border-stone-100 p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-100 text-green-700">
              <Sprout className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900">Crop &amp; Element Library</h2>
              <p className="text-[10px] text-stone-500">Drag &amp; Drop onto farm canvas or click to select</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mt-2.5">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tomato, mango, pond, shed..."
            className="w-full rounded-xl border border-stone-200 bg-stone-50 py-1.5 pl-9 pr-3 text-xs text-stone-800 placeholder-stone-400 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-stone-400 hover:text-stone-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Scrollable Tabs */}
        <div className="mt-2.5 flex gap-1 overflow-x-auto pb-1 no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabCategory)}
              className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-green-700 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Item Lists ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Bed Types Section */}
        {filteredBedTypes.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Bed Profiles ({filteredBedTypes.length})</span>
            </div>
            <div className="space-y-1.5">
              {filteredBedTypes.map((bed) => {
                const isSelected = selectedBedType === bed.type && activeTool.startsWith('draw-');
                return (
                  <div
                    key={bed.type}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/json', JSON.stringify({ type: 'bed_type', item: bed }));
                    }}
                    onClick={() => {
                      onSelectBedType(bed.type);
                      if (!activeTool.startsWith('draw-')) onSelectTool('draw-rect');
                    }}
                    onMouseEnter={() => setPreviewItem(bed)}
                    className={`group relative flex cursor-grab active:cursor-grabbing items-center justify-between rounded-xl border p-2.5 transition ${
                      isSelected
                        ? 'border-green-600 bg-green-50/70 shadow-xs ring-1 ring-green-600'
                        : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-8 w-8 rounded-xl flex items-center justify-center shadow-2xs shrink-0"
                        style={{ backgroundColor: bed.defaultColor + '20', border: `1px solid ${bed.defaultColor}` }}
                      >
                        <DesignerIcon name={bed.type} category="bed_types" className="h-4 w-4" style={{ color: bed.defaultColor }} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-stone-900">{bed.name}</p>
                        <p className="text-[10px] text-stone-500 line-clamp-1">{bed.tagline}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[9px] font-medium text-stone-600">
                        {bed.defaultHeightMm > 0 ? `+${bed.defaultHeightMm}mm` : `${bed.defaultHeightMm}mm`}
                      </span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-green-700" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Crops / Plants Section */}
        {filteredCrops.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Plants &amp; Crops ({filteredCrops.length})</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {filteredCrops.map((crop) => {
                const isSelected = selectedCrop?.id === crop.id && (activeTool === 'crop' || activeTool === 'tree');
                const isTree = crop.category === 'Trees' || crop.category === 'Fruit Crops';
                return (
                  <div
                    key={crop.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/json', JSON.stringify({ type: isTree ? 'tree' : 'crop', item: crop }));
                    }}
                    onClick={() => {
                      onSelectCrop(crop);
                      onSelectTool(isTree ? 'tree' : 'crop');
                    }}
                    onMouseEnter={() => setPreviewItem(crop)}
                    className={`group relative flex cursor-grab active:cursor-grabbing items-center justify-between rounded-xl border p-2.5 transition ${
                      isSelected
                        ? 'border-green-600 bg-green-50/70 shadow-xs ring-1 ring-green-600'
                        : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl shadow-2xs shrink-0"
                        style={{ backgroundColor: crop.bgRgb, border: `1px solid ${crop.color}40` }}
                      >
                        <DesignerIcon name={crop.id} category={crop.category} className="h-4 w-4" style={{ color: crop.color }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-stone-900">{crop.name}</p>
                          <span className="rounded-md bg-stone-100 px-1 py-0.2 text-[9px] font-medium text-stone-500">
                            {crop.category}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-500">
                          {isTree ? `Canopy: ~${crop.canopyDiameterM ?? 4}m` : `Spacing: ${crop.spacingCm}cm`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                        crop.waterNeed === 'High'
                          ? 'bg-blue-100 text-blue-800'
                          : crop.waterNeed === 'Moderate'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {crop.waterNeed}
                      </span>
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5 text-green-700" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-stone-300 group-hover:text-stone-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Farm Elements / Structures Section */}
        {filteredElements.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Water &amp; Infrastructure ({filteredElements.length})</span>
            </div>
            <div className="space-y-1.5">
              {filteredElements.map((elem) => {
                const isSelected = selectedElement?.type === elem.type && activeTool === 'element';
                return (
                  <div
                    key={elem.type}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/json', JSON.stringify({ type: 'element', item: elem }));
                    }}
                    onClick={() => {
                      onSelectElement(elem);
                      onSelectTool('element');
                    }}
                    onMouseEnter={() => setPreviewItem(elem)}
                    className={`group relative flex cursor-grab active:cursor-grabbing items-center justify-between rounded-xl border p-2.5 transition ${
                      isSelected
                        ? 'border-green-600 bg-green-50/70 shadow-xs ring-1 ring-green-600'
                        : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl shadow-2xs shrink-0"
                        style={{ backgroundColor: elem.color + '25', border: `1px solid ${elem.color}` }}
                      >
                        <DesignerIcon name={elem.type} category={elem.category} className="h-4 w-4" style={{ color: elem.color }} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-stone-900">{elem.name}</p>
                        <p className="text-[10px] text-stone-500">{elem.defaultWidthM}m × {elem.defaultHeightM}m</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[9px] font-medium text-stone-600 capitalize">
                        {elem.category}
                      </span>
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5 text-green-700" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-stone-300 group-hover:text-stone-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {filteredCrops.length === 0 && filteredBedTypes.length === 0 && filteredElements.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Info className="h-8 w-8 text-stone-300" />
            <p className="mt-2 text-xs font-semibold text-stone-600">No matching items</p>
            <p className="text-[11px] text-stone-400">Try a different search term or category</p>
          </div>
        )}
      </div>

      {/* ── Quick Info Footer ── */}
      {previewItem && (
        <div className="border-t border-stone-200 bg-stone-50/90 p-3 text-xs">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1.5">
              <DesignerIcon
                name={'id' in previewItem ? (previewItem as any).id : 'type' in previewItem ? (previewItem as any).type : ''}
                category={'category' in previewItem ? (previewItem as any).category : ''}
                className="h-4 w-4 text-green-700"
              />
              <p className="font-bold text-stone-800">
                {'name' in previewItem ? previewItem.name : ''}
              </p>
            </div>
            {'category' in previewItem && typeof previewItem.category === 'string' && (
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-semibold text-green-800">
                {previewItem.category}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-stone-600 line-clamp-2">
            {'description' in previewItem ? (previewItem as any).description : 'tagline' in previewItem ? (previewItem as any).tagline : ''}
          </p>
          {'companionLikes' in previewItem && previewItem.companionLikes && previewItem.companionLikes.length > 0 && (
            <p className="mt-1 text-[10px] text-emerald-700 line-clamp-1 font-medium">
              ❤️ Likes: {previewItem.companionLikes.slice(0, 3).join(', ')}
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
