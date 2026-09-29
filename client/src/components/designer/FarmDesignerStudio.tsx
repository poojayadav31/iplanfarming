import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as turf from '@turf/turf';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Save,
  Undo2,
  Redo2,
  Layers,
  MousePointer,
  Square,
  RectangleHorizontal,
  Spline,
  Sprout,
  TreePine,
  Building2,
  Ruler,
  Eraser,
  Grid,
  Box,
  Eye,
  Loader2,
  Magnet,
  ChevronDown,
  Check,
  Search,
  ListFilter,
} from 'lucide-react';
import CropLibrarySidebar from './CropLibrarySidebar';
import BedPropertiesDrawer from './BedPropertiesDrawer';
import TreePropertiesDrawer from './TreePropertiesDrawer';
import ElementPropertiesDrawer from './ElementPropertiesDrawer';
import LayerManagerPanel from './LayerManagerPanel';
import DesignSaveModal from './DesignSaveModal';
import DesignerCanvas2D from './DesignerCanvas2D';
import DesignerCanvas3D from './DesignerCanvas3D';
import DesignerIcon from './DesignerIcon';
import { designerApi } from '../../lib/designerApi';
import { CROP_LIBRARY } from '../../lib/designerCropsData';
import type {
  FarmBed,
  PlacedTree,
  PlacedElement,
  LayerVisibility,
  DesignerTool,
  BedType,
  CropCatalogueItem,
  FarmElementDefinition,
  FarmDesignData,
  SavedFarmDesign,
  ViewMode,
} from '../../types/designer';
import type { Farm } from '../../types/farm';

export const GRID_PRESETS = [
  { value: 0.5, label: '0.5m × 0.5m', desc: 'Fine / Nursery / Seedlings' },
  { value: 1.0, label: '1.0m × 1.0m', desc: 'Bio-Intensive / Standard Small Bed' },
  { value: 1.5, label: '1.5m × 1.5m', desc: 'Standard Raised Bed' },
  { value: 2.0, label: '2.0m × 2.0m', desc: 'Standard Farm Row (Default)', isDefault: true },
  { value: 2.5, label: '2.5m × 2.5m', desc: 'High-Density Orchard / Wide Bed' },
  { value: 3.0, label: '3.0m × 3.0m', desc: 'Machinery Alley / Strip Plot' },
  { value: 4.0, label: '4.0m × 4.0m', desc: 'Fruit Tree Spacing' },
  { value: 5.0, label: '5.0m × 5.0m', desc: 'Field Plot / Agroforestry' },
  { value: 10.0, label: '10.0m × 10.0m', desc: 'Broadacre Block Division' },
];

interface FarmDesignerStudioProps {
  farm: Farm;
  initialDesignId?: string;
}

export default function FarmDesignerStudio({ farm, initialDesignId }: FarmDesignerStudioProps) {
  const navigate = useNavigate();
  const canvas2DRef = useRef<HTMLCanvasElement | null>(null);

  // ── 1. Farm Boundary Metric Conversion (GeoJSON → Local Meters) ──
  const { boundaryPoints, metersWidth, metersHeight, originGeo } = (() => {
    try {
      const bbox = turf.bbox(farm.boundary); // [minX, minY, maxX, maxY] (lng, lat)
      const minLng = bbox[0];
      const maxLat = bbox[3];

      // Convert width in meters
      const widthMeters = turf.distance(
        turf.point([minLng, maxLat]),
        turf.point([bbox[2], maxLat]),
        { units: 'meters' }
      );

      // Convert height in meters
      const heightMeters = turf.distance(
        turf.point([minLng, maxLat]),
        turf.point([minLng, bbox[1]]),
        { units: 'meters' }
      );

      // Convert coordinates of outer ring
      const coords = (farm.boundary as any).geometry?.coordinates?.[0] || (farm.boundary as any).coordinates?.[0] || [];
      const localPts: [number, number][] = coords.map((coord: number[]) => {
        const xM = turf.distance(
          turf.point([minLng, coord[1]]),
          turf.point([coord[0], coord[1]]),
          { units: 'meters' }
        );
        const yM = turf.distance(
          turf.point([coord[0], maxLat]),
          turf.point([coord[0], coord[1]]),
          { units: 'meters' }
        );
        return [xM, yM];
      });

      return {
        boundaryPoints: localPts,
        metersWidth: Math.max(widthMeters, 40),
        metersHeight: Math.max(heightMeters, 40),
        originGeo: [minLng, maxLat] as [number, number],
      };
    } catch {
      return {
        boundaryPoints: [
          [0, 0],
          [60, 0],
          [60, 60],
          [0, 60],
        ] as [number, number][],
        metersWidth: 60,
        metersHeight: 60,
        originGeo: [0, 0] as [number, number],
      };
    }
  })();

  // ── 2. Studio State ──
  const [viewMode, setViewMode] = useState<ViewMode>('2d');
  const [isWalkthrough, setIsWalkthrough] = useState(false);
  const [activeTool, setActiveTool] = useState<DesignerTool>('select');
  const [gridSizeMeters, setGridSizeMeters] = useState<number>(2.0);
  const [snapToGridEnabled, setSnapToGridEnabled] = useState<boolean>(true);
  const [isGridMenuOpen, setIsGridMenuOpen] = useState<boolean>(false);
  const [customGridInput, setCustomGridInput] = useState<string>('2.0');
  const gridMenuRef = useRef<HTMLDivElement | null>(null);

  // Objects Outliner / Land Entities Quick Selector
  const [isObjectsMenuOpen, setIsObjectsMenuOpen] = useState<boolean>(false);
  const [objectsSearchQuery, setObjectsSearchQuery] = useState<string>('');
  const objectsMenuRef = useRef<HTMLDivElement | null>(null);

  // Palettes
  const [selectedBedType, setSelectedBedType] = useState<BedType>('Raised Bed');
  const [selectedCrop, setSelectedCrop] = useState<CropCatalogueItem | null>(CROP_LIBRARY[0]);
  const [selectedElement, setSelectedElement] = useState<FarmElementDefinition | null>(null);

  // Active Placed Entities
  const [beds, setBeds] = useState<FarmBed[]>([]);
  const [trees, setTrees] = useState<PlacedTree[]>([]);
  const [elements, setElements] = useState<PlacedElement[]>([]);

  // Selection
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Layers
  const [layers, setLayers] = useState<LayerVisibility>({
    beds: true,
    crops: true,
    trees: true,
    water: true,
    buildings: true,
    animals: true,
    irrigation: true,
    paths: true,
    fencing: true,
    grid: true,
    boundary: true,
  });

  // History Stack for Undo/Redo
  const [history, setHistory] = useState<{ beds: FarmBed[]; trees: PlacedTree[]; elements: PlacedElement[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Modals & Panels
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  // Persistence Info
  const [currentDesignId, setCurrentDesignId] = useState<string | null>(initialDesignId || null);
  const [designName, setDesignName] = useState<string>(`${farm.name} - Master Bed Plan`);
  const [designNotes, setDesignNotes] = useState<string>('');
  const [designStatus, setDesignStatus] = useState<'DRAFT' | 'FINAL'>('DRAFT');
  const [savedDesignsList, setSavedDesignsList] = useState<SavedFarmDesign[]>([]);
  const [isLoadingDesign, setIsLoadingDesign] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Dismiss grid & objects popover on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (gridMenuRef.current && !gridMenuRef.current.contains(event.target as Node)) {
        setIsGridMenuOpen(false);
      }
      if (objectsMenuRef.current && !objectsMenuRef.current.contains(event.target as Node)) {
        setIsObjectsMenuOpen(false);
      }
    };
    if (isGridMenuOpen || isObjectsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isGridMenuOpen, isObjectsMenuOpen]);

  // ── Push State to Undo/Redo History ──
  const pushHistory = useCallback(
    (newBeds: FarmBed[], newTrees: PlacedTree[], newElements: PlacedElement[]) => {
      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        return [...next, { beds: newBeds, trees: newTrees, elements: newElements }];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setBeds(prevState.beds);
      setTrees(prevState.trees);
      setElements(prevState.elements);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setBeds(nextState.beds);
      setTrees(nextState.trees);
      setElements(nextState.elements);
      setHistoryIndex(historyIndex + 1);
    }
  };

  // ── Load Saved Designs ──
  const loadSavedDesignsList = useCallback(async () => {
    try {
      const list = await designerApi.listDesigns(farm.id);
      setSavedDesignsList(list);
    } catch {
      // safe fallback
    }
  }, [farm.id]);

  useEffect(() => {
    loadSavedDesignsList();
  }, [loadSavedDesignsList]);

  // Load Initial Design if specified
  useEffect(() => {
    if (!initialDesignId) {
      // Seed an initial history state
      pushHistory([], [], []);
      return;
    }

    setIsLoadingDesign(true);
    designerApi
      .getDesign(farm.id, initialDesignId)
      .then((data) => {
        setCurrentDesignId(data.id);
        setDesignName(data.name);
        setDesignNotes(data.notes || '');
        setDesignStatus(data.status);
        const gSize = typeof data.gridSizeMeters === 'number' && data.gridSizeMeters > 0 ? data.gridSizeMeters : 2.0;
        setGridSizeMeters(gSize);
        setCustomGridInput(gSize.toString());

        if (data.designData) {
          setBeds(data.designData.beds || []);
          setTrees(data.designData.trees || []);
          setElements(data.designData.elements || []);
          if (data.designData.layers) setLayers(data.designData.layers);
          pushHistory(data.designData.beds || [], data.designData.trees || [], data.designData.elements || []);
        }
      })
      .catch(() => {
        toast.error('Could not load specified farm design.');
      })
      .finally(() => {
        setIsLoadingDesign(false);
      });
  }, [farm.id, initialDesignId, pushHistory]);

  // ── Entity Modification Handlers with History Tracking ──

  const handleAddBed = (newBed: FarmBed) => {
    const nextBeds = [...beds, newBed];
    setBeds(nextBeds);
    pushHistory(nextBeds, trees, elements);
    toast.success(`Created ${newBed.name}`);
  };

  const handleUpdateBed = (updatedBed: FarmBed) => {
    const nextBeds = beds.map((b) => (b.id === updatedBed.id ? updatedBed : b));
    setBeds(nextBeds);
    pushHistory(nextBeds, trees, elements);
  };

  const handleDeleteBed = (bedId: string) => {
    const nextBeds = beds.filter((b) => b.id !== bedId);
    setBeds(nextBeds);
    setSelectedBedId(null);
    pushHistory(nextBeds, trees, elements);
    toast.success('Bed removed');
  };

  const handleDuplicateBed = (bedId: string) => {
    const original = beds.find((b) => b.id === bedId);
    if (!original) return;
    const duplicated: FarmBed = {
      ...original,
      id: `bed-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${original.name} (Copy)`,
      x: original.x + gridSizeMeters,
      y: original.y + gridSizeMeters,
    };
    const nextBeds = [...beds, duplicated];
    setBeds(nextBeds);
    setSelectedBedId(duplicated.id);
    pushHistory(nextBeds, trees, elements);
    toast.success('Bed duplicated');
  };

  const handleAddTree = (newTree: PlacedTree) => {
    const nextTrees = [...trees, newTree];
    setTrees(nextTrees);
    pushHistory(beds, nextTrees, elements);
    toast.success(`Planted ${newTree.treeName}`);
  };

  const handleUpdateTree = (updatedTree: PlacedTree) => {
    const nextTrees = trees.map((t) => (t.id === updatedTree.id ? updatedTree : t));
    setTrees(nextTrees);
    pushHistory(beds, nextTrees, elements);
  };

  const handleDeleteTree = (treeId: string) => {
    const nextTrees = trees.filter((t) => t.id !== treeId);
    setTrees(nextTrees);
    setSelectedTreeId(null);
    pushHistory(beds, nextTrees, elements);
    toast.success('Tree removed');
  };

  const handleDuplicateTree = (treeId: string) => {
    const original = trees.find((t) => t.id === treeId);
    if (!original) return;
    const duplicated: PlacedTree = {
      ...original,
      id: `tree-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      treeName: `${original.treeName} (Copy)`,
      x: original.x + gridSizeMeters,
      y: original.y + gridSizeMeters,
    };
    const nextTrees = [...trees, duplicated];
    setTrees(nextTrees);
    setSelectedTreeId(duplicated.id);
    pushHistory(beds, nextTrees, elements);
    toast.success('Tree duplicated');
  };

  const handleAddElement = (newElem: PlacedElement) => {
    const nextElements = [...elements, newElem];
    setElements(nextElements);
    pushHistory(beds, trees, nextElements);
    toast.success(`Placed ${newElem.name}`);
  };

  const handleUpdateElement = (updatedElem: PlacedElement) => {
    const nextElements = elements.map((e) => (e.id === updatedElem.id ? updatedElem : e));
    setElements(nextElements);
    pushHistory(beds, trees, nextElements);
  };

  const handleDuplicateElement = (elementId: string) => {
    const original = elements.find((e) => e.id === elementId);
    if (!original) return;
    const duplicated: PlacedElement = {
      ...original,
      id: `elem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${original.name} (Copy)`,
      x: original.x + gridSizeMeters,
      y: original.y + gridSizeMeters,
    };
    const nextElements = [...elements, duplicated];
    setElements(nextElements);
    setSelectedElementId(duplicated.id);
    pushHistory(beds, trees, nextElements);
    toast.success('Element duplicated');
  };

  const handleDeleteElement = (elementId: string) => {
    const nextElements = elements.filter((e) => e.id !== elementId);
    setElements(nextElements);
    setSelectedElementId(null);
    pushHistory(beds, trees, nextElements);
    toast.success('Element removed');
  };

  const handleDeleteSelected = () => {
    if (selectedBedId) {
      handleDeleteBed(selectedBedId);
    } else if (selectedTreeId) {
      handleDeleteTree(selectedTreeId);
    } else if (selectedElementId) {
      handleDeleteElement(selectedElementId);
    }
  };

  // ── Keyboard Shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected();
      } else if (e.key === 'Escape') {
        setSelectedBedId(null);
        setSelectedTreeId(null);
        setSelectedElementId(null);
        setActiveTool('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDeleteSelected, handleUndo, handleRedo]);

  // ── Save Design Payload ──
  const handleSaveDesign = async (name: string, status: 'DRAFT' | 'FINAL', notes: string) => {
    setIsSaving(true);
    try {
      const designPayload: FarmDesignData = {
        version: 1,
        gridSizeMeters,
        boundaryPolygon: boundaryPoints,
        originGeo,
        metersWidth,
        metersHeight,
        beds,
        trees,
        elements,
        layers,
      };

      if (currentDesignId) {
        // Update
        const updated = await designerApi.updateDesign(farm.id, currentDesignId, {
          name,
          status,
          gridSizeMeters,
          designData: designPayload,
          notes,
          incrementVersion: true,
        });
        setDesignName(updated.name);
        setDesignStatus(updated.status);
        setDesignNotes(updated.notes || '');
        toast.success('Farm design updated successfully');
      } else {
        // Create new
        const created = await designerApi.createDesign(farm.id, {
          name,
          status,
          gridSizeMeters,
          designData: designPayload,
          notes,
        });
        setCurrentDesignId(created.id);
        setDesignName(created.name);
        setDesignStatus(created.status);
        setDesignNotes(created.notes || '');
        toast.success('Farm design saved successfully');
      }
      await loadSavedDesignsList();
    } catch {
      toast.error('Could not save farm design.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadDesign = async (designId: string) => {
    setIsLoadingDesign(true);
    try {
      const data = await designerApi.getDesign(farm.id, designId);
      setCurrentDesignId(data.id);
      setDesignName(data.name);
      setDesignNotes(data.notes || '');
      setDesignStatus(data.status);
      const gSize = typeof data.gridSizeMeters === 'number' && data.gridSizeMeters > 0 ? data.gridSizeMeters : 2.0;
      setGridSizeMeters(gSize);
      setCustomGridInput(gSize.toString());

      if (data.designData) {
        setBeds(data.designData.beds || []);
        setTrees(data.designData.trees || []);
        setElements(data.designData.elements || []);
        if (data.designData.layers) setLayers(data.designData.layers);
        pushHistory(data.designData.beds || [], data.designData.trees || [], data.designData.elements || []);
      }
      toast.success(`Loaded "${data.name}"`);
    } catch {
      toast.error('Could not load design.');
    } finally {
      setIsLoadingDesign(false);
    }
  };

  const handleDuplicateDesign = async (designId: string) => {
    try {
      const dup = await designerApi.duplicateDesign(farm.id, designId);
      toast.success(`Cloned as "${dup.name}"`);
      await loadSavedDesignsList();
    } catch {
      toast.error('Could not duplicate design.');
    }
  };

  const handleDeleteDesign = async (designId: string) => {
    try {
      await designerApi.deleteDesign(farm.id, designId);
      toast.success('Design deleted');
      if (currentDesignId === designId) {
        setCurrentDesignId(null);
      }
      await loadSavedDesignsList();
    } catch {
      toast.error('Could not delete design.');
    }
  };

  // ── PNG & JSON Export ──
  const handleExportPng = () => {
    if (!canvas2DRef.current) return;
    const dataUrl = canvas2DRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${designName.toLowerCase().replace(/\s+/g, '_')}_blueprint.png`;
    link.href = dataUrl;
    link.click();
    toast.success('PNG blueprint downloaded');
  };

  const handleExportJson = () => {
    const data: FarmDesignData = {
      version: 1,
      gridSizeMeters,
      boundaryPolygon: boundaryPoints,
      originGeo,
      metersWidth,
      metersHeight,
      beds,
      trees,
      elements,
      layers,
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${designName.toLowerCase().replace(/\s+/g, '_')}_data.json`;
    link.href = url;
    link.click();
    toast.success('JSON blueprint data downloaded');
  };

  // Active selected bed, tree, or element
  const activeBed = beds.find((b) => b.id === selectedBedId) || null;
  const activeTree = trees.find((t) => t.id === selectedTreeId) || null;
  const activeElement = elements.find((e) => e.id === selectedElementId) || null;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-stone-100 font-sans">
      {/* ── Top Master Header & Toolbar ── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-stone-200 bg-white/95 px-4 shadow-xs backdrop-blur z-20">
        {/* Left: Back + Farm Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/dashboard/farm/${farm.id}`)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-stone-900 line-clamp-1">{designName}</h1>
              <span className={`rounded-full px-2 py-0.2 text-[9px] font-bold ${
                designStatus === 'FINAL' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {designStatus}
              </span>
            </div>
            <p className="text-[10px] text-stone-500">
              {farm.name} • {farm.areaBigha.toFixed(2)} Bigha ({farm.areaAcres.toFixed(2)} Acres) • {beds.length} Beds
            </p>
          </div>
        </div>

        {/* Center: View Switcher (2D / 3D) */}
        <div className="flex items-center gap-1 rounded-2xl border border-stone-200 bg-stone-100 p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => { setViewMode('2d'); setIsWalkthrough(false); }}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold transition ${
              viewMode === '2d' ? 'bg-white text-green-800 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Layers className="h-3.5 w-3.5" /> 2D Grid Studio
          </button>
          <button
            type="button"
            onClick={() => { setViewMode('3d'); }}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold transition ${
              viewMode === '3d' ? 'bg-white text-green-800 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Box className="h-3.5 w-3.5" /> 3D Farm View
          </button>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 rounded-xl border border-stone-200 bg-stone-50 p-0.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="Undo (Ctrl+Z)"
              className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-200 disabled:opacity-30 transition"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Redo (Ctrl+Y)"
              className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-200 disabled:opacity-30 transition"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>

          {/* Grid Selector with Popover & Quick Select */}
          <div className="relative">
            <div className="flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setIsGridMenuOpen(!isGridMenuOpen)}
                title="Configure Grid Size & Snap Settings"
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  isGridMenuOpen ? 'bg-green-700 text-white shadow-xs' : 'text-stone-700 hover:bg-stone-200'
                }`}
              >
                <Grid className="h-3.5 w-3.5" />
                <span>{gridSizeMeters}m × {gridSizeMeters}m</span>
                {gridSizeMeters === 2.0 && <span className="text-[10px] opacity-80 font-bold">(Default)</span>}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>

              {/* Quick Snap Magnet Toggle */}
              <button
                type="button"
                onClick={() => {
                  setSnapToGridEnabled(!snapToGridEnabled);
                  toast.success(snapToGridEnabled ? 'Grid snapping disabled' : `Snapped to ${gridSizeMeters}m grid`);
                }}
                title={snapToGridEnabled ? 'Grid Snapping Enabled (Click to disable)' : 'Grid Snapping Disabled (Click to enable)'}
                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition ${
                  snapToGridEnabled
                    ? 'bg-green-100 text-green-800'
                    : 'bg-stone-100 text-stone-400 hover:text-stone-700'
                }`}
              >
                <Magnet className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold">{snapToGridEnabled ? 'Snap ON' : 'Snap OFF'}</span>
              </button>
            </div>

            {/* Grid Popover Dropdown */}
            {isGridMenuOpen && (
              <div
                ref={gridMenuRef}
                className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-stone-200 bg-white p-3.5 shadow-xl backdrop-blur z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="mb-2 flex items-center justify-between border-b border-stone-100 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
                    <Grid className="h-4 w-4 text-green-700" />
                    <span>Grid Size & Snapping</span>
                  </div>
                  <span className="text-[10px] font-bold text-stone-500">Metric (m)</span>
                </div>

                {/* Presets List */}
                <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                  {GRID_PRESETS.map((preset) => {
                    const isSelected = gridSizeMeters === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => {
                          setGridSizeMeters(preset.value);
                          setCustomGridInput(preset.value.toString());
                          setIsGridMenuOpen(false);
                          toast.success(`Grid set to ${preset.label}`);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition ${
                          isSelected
                            ? 'bg-green-700 text-white font-bold shadow-xs'
                            : 'text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span>{preset.label}</span>
                            {preset.isDefault && (
                              <span className={`rounded-md px-1.5 py-0.2 text-[9px] font-bold ${
                                isSelected ? 'bg-green-800 text-green-100' : 'bg-green-100 text-green-800'
                              }`}>
                                Default
                              </span>
                            )}
                          </div>
                          <p className={`text-[10px] ${isSelected ? 'text-green-100' : 'text-stone-400'}`}>
                            {preset.desc}
                          </p>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-white" />}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Size Input */}
                <div className="mt-3 border-t border-stone-100 pt-2.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    Custom Grid Size (Meters)
                  </label>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const val = parseFloat(customGridInput);
                      if (!isNaN(val) && val > 0 && val <= 100) {
                        setGridSizeMeters(val);
                        setIsGridMenuOpen(false);
                        toast.success(`Custom grid set to ${val}m × ${val}m`);
                      } else {
                        toast.error('Please enter a valid grid size (0.1m - 100m)');
                      }
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="100"
                      value={customGridInput}
                      onChange={(e) => setCustomGridInput(e.target.value)}
                      placeholder="e.g. 0.8 or 6"
                      className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-800 focus:border-green-600 focus:bg-white focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-green-700 px-3 py-1 text-xs font-bold text-white hover:bg-green-800 transition"
                    >
                      Apply
                    </button>
                  </form>
                </div>

                {/* Grid Layer & Snap Toggles */}
                <div className="mt-2.5 flex items-center justify-between border-t border-stone-100 pt-2 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-stone-700 hover:text-stone-900">
                    <input
                      type="checkbox"
                      checked={layers.grid}
                      onChange={(e) => setLayers((prev) => ({ ...prev, grid: e.target.checked }))}
                      className="rounded border-stone-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-[11px] font-medium">Show Grid Overlay</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-stone-700 hover:text-stone-900">
                    <input
                      type="checkbox"
                      checked={snapToGridEnabled}
                      onChange={(e) => setSnapToGridEnabled(e.target.checked)}
                      className="rounded border-stone-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-[11px] font-medium">Snap Active</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Land Objects / Placed Items Outliner Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsObjectsMenuOpen(!isObjectsMenuOpen)}
              title="View, Search & Select Any Placed Bed, Tree, or Structure"
              className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold transition ${
                isObjectsMenuOpen || selectedBedId || selectedTreeId || selectedElementId
                  ? 'border-green-600 bg-green-50 text-green-800'
                  : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
              }`}
            >
              <ListFilter className="h-3.5 w-3.5 text-green-700" />
              <span>Objects ({beds.length + trees.length + elements.length})</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            {isObjectsMenuOpen && (
              <div
                ref={objectsMenuRef}
                className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-stone-200 bg-white p-3.5 shadow-xl backdrop-blur z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[80vh] flex flex-col"
              >
                <div className="mb-2 flex items-center justify-between border-b border-stone-100 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
                    <ListFilter className="h-4 w-4 text-green-700" />
                    <span>Land Objects &amp; Placed Items</span>
                  </div>
                  <span className="text-[10px] font-bold text-stone-500">
                    {beds.length + trees.length + elements.length} Total
                  </span>
                </div>

                {/* Search in objects */}
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                  <input
                    type="text"
                    value={objectsSearchQuery}
                    onChange={(e) => setObjectsSearchQuery(e.target.value)}
                    placeholder="Search placed bed, tree, pond..."
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 py-1 pl-8 pr-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-green-500 focus:bg-white"
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs max-h-72">
                  {/* Beds Section */}
                  {beds.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                        Growing Beds ({beds.length})
                      </p>
                      <div className="space-y-1">
                        {beds
                          .filter((b) => b.name.toLowerCase().includes(objectsSearchQuery.toLowerCase()) || b.type.toLowerCase().includes(objectsSearchQuery.toLowerCase()))
                          .map((b) => {
                            const isSelected = selectedBedId === b.id;
                            return (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => {
                                  setSelectedBedId(b.id);
                                  setSelectedTreeId(null);
                                  setSelectedElementId(null);
                                  setIsObjectsMenuOpen(false);
                                }}
                                className={`flex w-full items-center justify-between rounded-xl p-2 text-left transition ${
                                  isSelected
                                    ? 'bg-green-700 text-white font-bold shadow-xs'
                                    : 'bg-stone-50 text-stone-800 hover:bg-stone-100'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0 shadow-2xs"
                                    style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : `${b.color || '#16a34a'}20` }}
                                  >
                                    <DesignerIcon
                                      name={b.type}
                                      category="bed_types"
                                      className="h-3.5 w-3.5"
                                      style={{ color: isSelected ? '#ffffff' : b.color || '#16a34a' }}
                                    />
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold leading-tight">{b.name}</p>
                                    <p className={`text-[10px] ${isSelected ? 'text-green-100' : 'text-stone-500'}`}>
                                      {b.type} • {b.width}m × {b.height}m ({b.areaSqM.toFixed(1)}m²)
                                    </p>
                                  </div>
                                </div>
                                {b.crops.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    {b.crops.slice(0, 3).map((c) => (
                                      <div
                                        key={c.id}
                                        title={c.cropName}
                                        className="flex h-5 w-5 items-center justify-center rounded-full bg-white/30 shrink-0"
                                      >
                                        <DesignerIcon name={c.cropName} category={c.category} className="h-3 w-3" />
                                      </div>
                                    ))}
                                    {b.crops.length > 3 && (
                                      <span className={`text-[9px] font-bold ${isSelected ? 'text-green-200' : 'text-stone-400'}`}>
                                        +{b.crops.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Trees Section */}
                  {trees.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                        Trees &amp; Orchard ({trees.length})
                      </p>
                      <div className="space-y-1">
                        {trees
                          .filter((t) => t.treeName.toLowerCase().includes(objectsSearchQuery.toLowerCase()))
                          .map((t) => {
                            const isSelected = selectedTreeId === t.id;
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                  setSelectedTreeId(t.id);
                                  setSelectedBedId(null);
                                  setSelectedElementId(null);
                                  setIsObjectsMenuOpen(false);
                                }}
                                className={`flex w-full items-center justify-between rounded-xl p-2 text-left transition ${
                                  isSelected
                                    ? 'bg-green-700 text-white font-bold shadow-xs'
                                    : 'bg-stone-50 text-stone-800 hover:bg-stone-100'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0 shadow-2xs"
                                    style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : `${t.color || '#15803d'}20` }}
                                  >
                                    <DesignerIcon
                                      name={t.treeName}
                                      category={t.category || 'Trees'}
                                      className="h-3.5 w-3.5"
                                      style={{ color: isSelected ? '#ffffff' : t.color || '#15803d' }}
                                    />
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold leading-tight">{t.treeName}</p>
                                    <p className={`text-[10px] ${isSelected ? 'text-green-100' : 'text-stone-500'}`}>
                                      Canopy: Ø {t.canopyDiameterM.toFixed(1)}m • H: {t.heightM.toFixed(1)}m
                                    </p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Elements Section */}
                  {elements.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                        Water &amp; Infrastructure ({elements.length})
                      </p>
                      <div className="space-y-1">
                        {elements
                          .filter((e) => e.name.toLowerCase().includes(objectsSearchQuery.toLowerCase()) || e.category.toLowerCase().includes(objectsSearchQuery.toLowerCase()))
                          .map((elem) => {
                            const isSelected = selectedElementId === elem.id;
                            return (
                              <button
                                key={elem.id}
                                type="button"
                                onClick={() => {
                                  setSelectedElementId(elem.id);
                                  setSelectedBedId(null);
                                  setSelectedTreeId(null);
                                  setIsObjectsMenuOpen(false);
                                }}
                                className={`flex w-full items-center justify-between rounded-xl p-2 text-left transition ${
                                  isSelected
                                    ? 'bg-green-700 text-white font-bold shadow-xs'
                                    : 'bg-stone-50 text-stone-800 hover:bg-stone-100'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0 shadow-2xs"
                                    style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : `${elem.color || '#0284c7'}20` }}
                                  >
                                    <DesignerIcon
                                      name={elem.type}
                                      category={elem.category}
                                      className="h-3.5 w-3.5"
                                      style={{ color: isSelected ? '#ffffff' : elem.color || '#0284c7' }}
                                    />
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold leading-tight">{elem.name}</p>
                                    <p className={`text-[10px] ${isSelected ? 'text-green-100' : 'text-stone-500'}`}>
                                      {elem.category} • {elem.width}m × {elem.height}m
                                    </p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {beds.length === 0 && trees.length === 0 && elements.length === 0 && (
                    <div className="py-6 text-center text-stone-400 text-xs">
                      No items placed on the farm land yet. Drag items from the sidebar to place them!
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Layers Button */}
          <button
            type="button"
            onClick={() => setIsLayerPanelOpen(!isLayerPanelOpen)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              isLayerPanelOpen ? 'border-green-600 bg-green-50 text-green-800' : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Layers</span>
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={() => setIsSaveModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-green-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-green-800 transition shadow-xs"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Plan</span>
          </button>
        </div>
      </header>

      {/* ── Main Studio Workspace ── */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Left Tools Ribbon */}
        <div className="flex w-14 shrink-0 flex-col items-center gap-2 border-r border-stone-200 bg-white py-3 shadow-2xs z-10">
          <button
            type="button"
            onClick={() => setActiveTool('select')}
            title="Select & Move Tool (Escape)"
            className={`rounded-xl p-2.5 transition ${
              activeTool === 'select' ? 'bg-green-700 text-white shadow-xs' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
            }`}
          >
            <MousePointer className="h-5 w-5" />
          </button>

          <div className="my-1 h-px w-8 bg-stone-200" />

          {/* Bed Drawing Tools */}
          <button
            type="button"
            onClick={() => setActiveTool('draw-rect')}
            title="Draw Rectangle Bed"
            className={`rounded-xl p-2.5 transition ${
              activeTool === 'draw-rect' ? 'bg-green-700 text-white shadow-xs' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
            }`}
          >
            <RectangleHorizontal className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('draw-square')}
            title="Draw Square Bed"
            className={`rounded-xl p-2.5 transition ${
              activeTool === 'draw-square' ? 'bg-green-700 text-white shadow-xs' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
            }`}
          >
            <Square className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('draw-lshape')}
            title="Draw L-Shape Bed"
            className={`rounded-xl p-2.5 transition ${
              activeTool === 'draw-lshape' ? 'bg-green-700 text-white shadow-xs' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
            }`}
          >
            <Spline className="h-5 w-5" />
          </button>

          <div className="my-1 h-px w-8 bg-stone-200" />

          {/* Plants, Trees & Elements Tools */}
          <button
            type="button"
            onClick={() => setActiveTool('crop')}
            title="Assign Plant to Bed"
            className={`rounded-xl p-2.5 transition ${
              activeTool === 'crop' ? 'bg-green-700 text-white shadow-xs' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
            }`}
          >
            <Sprout className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('tree')}
            title="Place Tree & Canopy"
            className={`rounded-xl p-2.5 transition ${
              activeTool === 'tree' ? 'bg-green-700 text-white shadow-xs' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
            }`}
          >
            <TreePine className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('element')}
            title="Place Water & Infrastructure"
            className={`rounded-xl p-2.5 transition ${
              activeTool === 'element' ? 'bg-green-700 text-white shadow-xs' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
            }`}
          >
            <Building2 className="h-5 w-5" />
          </button>

          <div className="my-1 h-px w-8 bg-stone-200" />

          {/* Measure & Eraser */}
          <button
            type="button"
            onClick={() => setActiveTool('measure')}
            title="Measure Distance"
            className={`rounded-xl p-2.5 transition ${
              activeTool === 'measure' ? 'bg-green-700 text-white shadow-xs' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
            }`}
          >
            <Ruler className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('eraser')}
            title="Eraser / Delete Tool"
            className={`rounded-xl p-2.5 transition ${
              activeTool === 'eraser' ? 'bg-red-600 text-white shadow-xs' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
            }`}
          >
            <Eraser className="h-5 w-5" />
          </button>
        </div>

        {/* Left Palette: Crop & Element Catalogue */}
        <CropLibrarySidebar
          activeTool={activeTool}
          selectedCrop={selectedCrop}
          selectedBedType={selectedBedType}
          selectedElement={selectedElement}
          onSelectCrop={(c) => setSelectedCrop(c)}
          onSelectBedType={(b) => setSelectedBedType(b)}
          onSelectElement={(e) => setSelectedElement(e)}
          onSelectTool={(t) => setActiveTool(t)}
        />

        {/* Center Canvas Viewport */}
        <main className="relative flex-1 overflow-hidden">
          {viewMode === '2d' ? (
            <DesignerCanvas2D
              boundaryPoints={boundaryPoints}
              metersWidth={metersWidth}
              metersHeight={metersHeight}
              gridSizeMeters={gridSizeMeters}
              layers={layers}
              activeTool={activeTool}
              selectedBedType={selectedBedType}
              selectedCrop={selectedCrop}
              selectedElement={selectedElement}
              beds={beds}
              trees={trees}
              elements={elements}
              selectedBedId={selectedBedId}
              selectedTreeId={selectedTreeId}
              selectedElementId={selectedElementId}
              onSelectBed={(id) => { setSelectedBedId(id); setSelectedTreeId(null); setSelectedElementId(null); }}
              onSelectTree={(id) => { setSelectedTreeId(id); setSelectedBedId(null); setSelectedElementId(null); }}
              onSelectElement={(id) => { setSelectedElementId(id); setSelectedBedId(null); setSelectedTreeId(null); }}
              onAddBed={handleAddBed}
              onUpdateBed={handleUpdateBed}
              onAddTree={handleAddTree}
              onUpdateTree={handleUpdateTree}
              onAddElement={handleAddElement}
              onUpdateElement={handleUpdateElement}
              onDeleteSelected={handleDeleteSelected}
              canvasRefCallback={(c) => { canvas2DRef.current = c; }}
              snapToGridEnabled={snapToGridEnabled}
              onToggleSnap={() => setSnapToGridEnabled(!snapToGridEnabled)}
            />
          ) : (
            <DesignerCanvas3D
              boundaryPoints={boundaryPoints}
              metersWidth={metersWidth}
              metersHeight={metersHeight}
              beds={beds}
              trees={trees}
              elements={elements}
              layers={layers}
              isWalkthrough={isWalkthrough}
              onToggleWalkthrough={() => setIsWalkthrough(!isWalkthrough)}
            />
          )}

          {/* Floating Layer Manager Panel */}
          <LayerManagerPanel
            layers={layers}
            onToggleLayer={(k) => setLayers((prev) => ({ ...prev, [k]: !prev[k] }))}
            onToggleAll={(v) =>
              setLayers({
                beds: v,
                crops: v,
                trees: v,
                water: v,
                buildings: v,
                animals: v,
                irrigation: v,
                paths: v,
                fencing: v,
                grid: v,
                boundary: v,
              })
            }
            isOpen={isLayerPanelOpen}
            onClose={() => setIsLayerPanelOpen(false)}
            counts={{
              beds: beds.length,
              crops: beds.reduce((acc, b) => acc + b.crops.length, 0),
              trees: trees.length,
              water: elements.filter((e) => e.category === 'water').length,
              buildings: elements.filter((e) => e.category === 'infrastructure').length,
              animals: elements.filter((e) => e.category === 'animal').length,
              irrigation: elements.filter((e) => e.type === 'irrigation_line').length,
              paths: elements.filter((e) => e.type === 'pathway').length,
              fencing: elements.filter((e) => e.type === 'fence').length,
            }}
          />

          {/* Loading Indicator */}
          {isLoadingDesign && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-xs">
              <Loader2 className="h-8 w-8 animate-spin text-green-700" />
            </div>
          )}
        </main>

        {/* Right Inspect Drawers */}
        {activeBed && (
          <BedPropertiesDrawer
            bed={activeBed}
            onUpdateBed={handleUpdateBed}
            onDeleteBed={handleDeleteBed}
            onDuplicateBed={handleDuplicateBed}
            onClose={() => setSelectedBedId(null)}
          />
        )}

        {activeTree && (
          <TreePropertiesDrawer
            tree={activeTree}
            onUpdateTree={handleUpdateTree}
            onDeleteTree={handleDeleteTree}
            onDuplicateTree={handleDuplicateTree}
            onClose={() => setSelectedTreeId(null)}
          />
        )}

        {activeElement && (
          <ElementPropertiesDrawer
            element={activeElement}
            onUpdateElement={handleUpdateElement}
            onDeleteElement={handleDeleteElement}
            onDuplicateElement={handleDuplicateElement}
            onClose={() => setSelectedElementId(null)}
          />
        )}
      </div>

      {/* ── Modals ── */}
      <DesignSaveModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        designName={designName}
        designNotes={designNotes}
        designStatus={designStatus}
        savedDesigns={savedDesignsList}
        isSaving={isSaving}
        currentDesignId={currentDesignId}
        onSave={handleSaveDesign}
        onLoadDesign={handleLoadDesign}
        onDuplicateDesign={handleDuplicateDesign}
        onDeleteDesign={handleDeleteDesign}
        onExportPng={handleExportPng}
        onExportJson={handleExportJson}
      />
    </div>
  );
}
