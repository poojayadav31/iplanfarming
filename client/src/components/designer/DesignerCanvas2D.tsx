import { useEffect, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Magnet, Plus, Minus, RotateCcw } from 'lucide-react';
import type {
  FarmBed,
  PlacedTree,
  PlacedElement,
  LayerVisibility,
  DesignerTool,
  BedType,
  CropCatalogueItem,
  FarmElementDefinition,
  BedCropItem,
  BedTypeDefinition,
} from '../../types/designer';
import { BED_TYPES_CATALOGUE, FARM_ELEMENTS_CATALOGUE } from '../../lib/designerCropsData';

interface DesignerCanvas2DProps {
  boundaryPoints: [number, number][]; // [x, y] in meters relative to farm bounding box
  metersWidth: number;
  metersHeight: number;
  gridSizeMeters: number;
  layers: LayerVisibility;
  activeTool: DesignerTool;
  selectedBedType: BedType;
  selectedCrop: CropCatalogueItem | null;
  selectedElement: FarmElementDefinition | null;
  beds: FarmBed[];
  trees: PlacedTree[];
  elements: PlacedElement[];
  selectedBedId: string | null;
  selectedTreeId: string | null;
  selectedElementId: string | null;
  onSelectBed: (bedId: string | null) => void;
  onSelectTree: (treeId: string | null) => void;
  onSelectElement: (elementId: string | null) => void;
  onAddBed: (bed: FarmBed) => void;
  onUpdateBed: (bed: FarmBed) => void;
  onAddTree: (tree: PlacedTree) => void;
  onUpdateTree: (tree: PlacedTree) => void;
  onAddElement: (elem: PlacedElement) => void;
  onUpdateElement: (elem: PlacedElement) => void;
  onDeleteSelected: () => void;
  canvasRefCallback?: (canvas: HTMLCanvasElement | null) => void;
  snapToGridEnabled?: boolean;
  onToggleSnap?: () => void;
}

export default function DesignerCanvas2D({
  boundaryPoints,
  metersWidth,
  metersHeight,
  gridSizeMeters,
  layers,
  activeTool,
  selectedBedType,
  selectedCrop,
  selectedElement,
  beds,
  trees,
  elements,
  selectedBedId,
  selectedTreeId,
  selectedElementId,
  onSelectBed,
  onSelectTree,
  onSelectElement,
  onAddBed,
  onUpdateBed,
  onAddTree,
  onUpdateTree,
  onAddElement,
  onUpdateElement,
  onDeleteSelected,
  canvasRefCallback,
  snapToGridEnabled = true,
  onToggleSnap,
}: DesignerCanvas2DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Viewport transform (Pan & Zoom)
  const [zoom, setZoom] = useState(15); // pixels per meter
  const [pan, setPan] = useState({ x: 40, y: 40 }); // pixel offset from container top-left
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Interaction State
  const [dragAction, setDragAction] = useState<
    | null
    | { type: 'drawing-bed'; startM: { x: number; y: number }; currentM: { x: number; y: number } }
    | { type: 'moving-bed'; bedId: string; startM: { x: number; y: number }; initialBed: FarmBed }
    | { type: 'resizing-bed'; bedId: string; handle: string; startM: { x: number; y: number }; initialBed: FarmBed }
    | { type: 'moving-tree'; treeId: string; startM: { x: number; y: number }; initialTree: PlacedTree }
    | { type: 'moving-elem'; elemId: string; startM: { x: number; y: number }; initialElem: PlacedElement }
    | { type: 'measuring'; startM: { x: number; y: number }; currentM: { x: number; y: number } }
  >(null);

  const [hoveredMeters, setHoveredMeters] = useState<{ x: number; y: number } | null>(null);

  // Expose canvas ref to parent for exporting PNG
  useEffect(() => {
    if (canvasRefCallback) {
      canvasRefCallback(canvasRef.current);
    }
  }, [canvasRefCallback]);

  // Fit view to farm boundary initially
  const handleFitView = useCallback(() => {
    if (!containerRef.current || metersWidth <= 0 || metersHeight <= 0) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const padding = 60;
    const availableW = clientWidth - padding * 2;
    const availableH = clientHeight - padding * 2;
    const fitZoom = Math.min(availableW / metersWidth, availableH / metersHeight, 35);
    setZoom(Math.max(8, fitZoom));
    setPan({
      x: (clientWidth - metersWidth * fitZoom) / 2,
      y: (clientHeight - metersHeight * fitZoom) / 2,
    });
  }, [metersWidth, metersHeight]);

  useEffect(() => {
    handleFitView();
  }, [handleFitView]);

  // Metric snap helper
  const snapToGrid = useCallback(
    (m: number): number => {
      if (!snapToGridEnabled) return parseFloat(m.toFixed(2));
      const g = gridSizeMeters > 0 ? gridSizeMeters : 2.0;
      return parseFloat((Math.round(m / g) * g).toFixed(2));
    },
    [gridSizeMeters, snapToGridEnabled]
  );

  // Coordinate transforms
  const screenToMeters = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      return {
        x: (px - pan.x) / zoom,
        y: (py - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  // ── Drag & Drop Handlers from Sidebar ──
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const payload = JSON.parse(raw);
      const m = screenToMeters(e.clientX, e.clientY);
      const snapped = { x: snapToGrid(m.x), y: snapToGrid(m.y) };

      if (payload.type === 'crop') {
        const cropItem = payload.item as CropCatalogueItem;
        // Check if dropped inside an existing bed
        const targetBed = beds.find(
          (b) => m.x >= b.x && m.x <= b.x + b.width && m.y >= b.y && m.y <= b.y + b.height
        );

        if (targetBed) {
          const estimatedPlants = Math.max(
            1,
            Math.floor((targetBed.areaSqM * 10000 * 0.7) / Math.pow(cropItem.spacingCm, 2))
          );
          const newCrop: BedCropItem = {
            id: `crop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            cropName: cropItem.name,
            category: cropItem.category as any,
            quantity: estimatedPlants,
            spacingCm: cropItem.spacingCm,
            color: cropItem.color,
            icon: cropItem.icon,
          };
          onUpdateBed({
            ...targetBed,
            crops: [...targetBed.crops, newCrop],
          });
          onSelectBed(targetBed.id);
          toast.success(`Planted ${cropItem.icon || ''} ${cropItem.name} in ${targetBed.name}`);
        } else {
          // Dropped on open soil: Create a new bed with this crop
          const defaultW = Math.max(gridSizeMeters, 2.0);
          const defaultH = Math.max(gridSizeMeters, 2.0);
          const typeDef = BED_TYPES_CATALOGUE[0];
          const estimatedPlants = Math.max(
            1,
            Math.floor((defaultW * defaultH * 10000 * 0.7) / Math.pow(cropItem.spacingCm, 2))
          );
          const newBed: FarmBed = {
            id: `bed-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: `Bed ${beds.length + 1} (${cropItem.name})`,
            type: 'Raised Bed',
            shape: 'rectangle',
            x: snapped.x,
            y: snapped.y,
            width: defaultW,
            height: defaultH,
            areaSqM: defaultW * defaultH,
            heightMm: typeDef.defaultHeightMm,
            color: typeDef.defaultColor,
            crops: [
              {
                id: `crop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                cropName: cropItem.name,
                category: cropItem.category as any,
                quantity: estimatedPlants,
                spacingCm: cropItem.spacingCm,
                color: cropItem.color,
                icon: cropItem.icon,
              },
            ],
          };
          onAddBed(newBed);
          onSelectBed(newBed.id);
          toast.success(`Created Bed with ${cropItem.icon || ''} ${cropItem.name}`);
        }
      } else if (payload.type === 'tree') {
        const treeItem = payload.item as CropCatalogueItem;
        const newTree: PlacedTree = {
          id: `tree-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          treeName: treeItem.name,
          category: treeItem.category as any,
          x: snapped.x,
          y: snapped.y,
          canopyDiameterM: treeItem.canopyDiameterM || 4.5,
          trunkDiameterM: 0.4,
          spacingM: treeItem.spacingCm ? treeItem.spacingCm / 100 : 4.0,
          growthCategory: 'Medium',
          heightM: 4.5,
          color: treeItem.color,
          icon: treeItem.icon,
        };
        onAddTree(newTree);
        onSelectTree(newTree.id);
        toast.success(`Planted ${treeItem.icon || '🌳'} ${treeItem.name}`);
      } else if (payload.type === 'element') {
        const elemDef = payload.item as FarmElementDefinition;
        const newElem: PlacedElement = {
          id: `elem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: elemDef.name,
          category: elemDef.category,
          type: elemDef.type,
          x: snapped.x,
          y: snapped.y,
          width: elemDef.defaultWidthM,
          height: elemDef.defaultHeightM,
          heightM: elemDef.default3DHeightM,
          color: elemDef.color,
          icon: elemDef.icon,
        };
        onAddElement(newElem);
        onSelectElement(newElem.id);
        toast.success(`Placed ${elemDef.icon || '🏛️'} ${elemDef.name}`);
      } else if (payload.type === 'bed_type') {
        const bedDef = payload.item as BedTypeDefinition;
        const defaultW = Math.max(gridSizeMeters, 2.0);
        const defaultH = Math.max(gridSizeMeters, 2.0);
        const newBed: FarmBed = {
          id: `bed-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: `Bed ${beds.length + 1} (${bedDef.name})`,
          type: bedDef.type,
          shape: 'rectangle',
          x: snapped.x,
          y: snapped.y,
          width: defaultW,
          height: defaultH,
          areaSqM: defaultW * defaultH,
          heightMm: bedDef.defaultHeightMm,
          color: bedDef.defaultColor,
          crops: [],
        };
        onAddBed(newBed);
        onSelectBed(newBed.id);
        toast.success(`Created ${bedDef.icon || '🪴'} ${bedDef.name}`);
      }
    } catch (err) {
      console.error('Failed to parse drag drop data', err);
    }
  };

  // ── Render 2D Canvas Loop ──────────────────────────────────────────────────
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset transform & clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background terrain
    ctx.fillStyle = '#f5f5f4'; // stone-100
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // ── 1. Farm Boundary & Soil Area ──
    if (layers.boundary && boundaryPoints.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(boundaryPoints[0][0], boundaryPoints[0][1]);
      for (let i = 1; i < boundaryPoints.length; i++) {
        ctx.lineTo(boundaryPoints[i][0], boundaryPoints[i][1]);
      }
      ctx.closePath();

      // Soil fill
      ctx.fillStyle = '#ecfdf5'; // emerald-50
      ctx.fill();

      // Farm boundary stroke
      ctx.lineWidth = 2.5 / zoom;
      ctx.strokeStyle = '#15803d'; // green-700
      ctx.stroke();

      // Outer boundary dash
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([4 / zoom, 4 / zoom]);
      ctx.strokeStyle = '#166534';
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── 2. Metric Grid (Clipped strictly inside Farm Boundary if mapped) ──
    if (layers.grid && gridSizeMeters > 0) {
      ctx.save();

      // If farm boundary exists, clip the grid inside it
      if (boundaryPoints.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(boundaryPoints[0][0], boundaryPoints[0][1]);
        for (let i = 1; i < boundaryPoints.length; i++) {
          ctx.lineTo(boundaryPoints[i][0], boundaryPoints[i][1]);
        }
        ctx.closePath();
        ctx.clip();
      }

      const g = gridSizeMeters;
      const startX = 0;
      const endX = Math.ceil(metersWidth / g) * g + g * 2;
      const startY = 0;
      const endY = Math.ceil(metersHeight / g) * g + g * 2;

      ctx.lineWidth = 0.6 / zoom;
      ctx.strokeStyle = 'rgba(21, 128, 61, 0.28)'; // crisp green grid line

      // Vertical lines
      for (let x = startX; x <= endX; x += g) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = startY; y <= endY; y += g) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }

      // Subgrid intersection crosshairs on higher zoom levels
      if (zoom > 16) {
        ctx.fillStyle = 'rgba(21, 128, 61, 0.5)';
        const markerSize = 2.5 / zoom;
        for (let x = startX; x <= endX; x += g) {
          for (let y = startY; y <= endY; y += g) {
            ctx.fillRect(x - markerSize / 2, y - markerSize / 2, markerSize, markerSize);
          }
        }
      }

      ctx.restore();
    }

    // ── 3. Farm Elements / Infrastructure & Water ──
    if (layers.water || layers.buildings || layers.animals || layers.paths || layers.fencing || layers.irrigation) {
      elements.forEach((elem) => {
        const isSelected = elem.id === selectedElementId;
        const elemCatalog = FARM_ELEMENTS_CATALOGUE.find((item) => item.type === elem.type);
        const eIcon = elem.icon || elemCatalog?.icon || (elem.category === 'water' ? '🌊' : elem.category === 'animal' ? '🐄' : '🏛️');

        ctx.save();
        ctx.translate(elem.x, elem.y);
        if (elem.rotation) ctx.rotate((elem.rotation * Math.PI) / 180);

        if (elem.category === 'water' && layers.water) {
          // Water Pond or Tank
          ctx.beginPath();
          if (elem.type === 'tank') {
            ctx.arc(elem.width / 2, elem.height / 2, elem.width / 2, 0, Math.PI * 2);
          } else {
            ctx.roundRect(0, 0, elem.width, elem.height, [elem.width * 0.2]);
          }
          ctx.fillStyle = '#38bdf8'; // sky-400
          ctx.fill();
          ctx.lineWidth = isSelected ? 2.5 / zoom : 1.2 / zoom;
          ctx.strokeStyle = isSelected ? '#0284c7' : '#0369a1';
          ctx.stroke();

          // Water ripple
          ctx.beginPath();
          ctx.arc(elem.width / 2, elem.height / 2, elem.width * 0.25, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 1 / zoom;
          ctx.stroke();
        } else if (elem.type === 'pathway' && layers.paths) {
          ctx.fillStyle = '#e7e5e4'; // stone-200
          ctx.fillRect(0, 0, elem.width, elem.height);
          ctx.lineWidth = 0.5 / zoom;
          ctx.setLineDash([2 / zoom, 2 / zoom]);
          ctx.strokeStyle = '#a8a29e';
          ctx.beginPath();
          ctx.moveTo(0, elem.height / 2);
          ctx.lineTo(elem.width, elem.height / 2);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (elem.type === 'fence' && layers.fencing) {
          ctx.lineWidth = 1 / zoom;
          ctx.strokeStyle = '#78716c';
          ctx.strokeRect(0, 0, elem.width, elem.height);
          // Posts
          for (let px = 0; px <= elem.width; px += 2) {
            ctx.fillStyle = '#44403c';
            ctx.fillRect(px - 0.1, 0, 0.2, elem.height);
          }
        } else if ((elem.category === 'infrastructure' || elem.category === 'animal') && (layers.buildings || layers.animals)) {
          // Shed / Barn / Greenhouse / Gaushala
          ctx.fillStyle = elem.color || '#b45309';
          ctx.roundRect(0, 0, elem.width, elem.height, [0.3]);
          ctx.fill();
          ctx.lineWidth = isSelected ? 2.5 / zoom : 1.2 / zoom;
          ctx.strokeStyle = isSelected ? '#16a34a' : '#78350f';
          ctx.stroke();

          // Roof Ridge
          ctx.beginPath();
          ctx.moveTo(0, elem.height / 2);
          ctx.lineTo(elem.width, elem.height / 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.stroke();
        }

        // Element Emoji Icon
        ctx.font = `${Math.max(0.7, 16 / zoom)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(eIcon, elem.width / 2, Math.max(0.6, elem.height * 0.35));

        // Element Label
        ctx.fillStyle = '#1c1917';
        ctx.font = `bold ${Math.max(0.5, 11 / zoom)}px sans-serif`;
        ctx.fillText(elem.name, elem.width / 2, Math.min(elem.height - 0.4, elem.height * 0.75));

        // Selection outline & handles for element
        if (isSelected) {
          ctx.lineWidth = 1.5 / zoom;
          ctx.setLineDash([3 / zoom, 3 / zoom]);
          ctx.strokeStyle = '#0284c7';
          ctx.strokeRect(-0.1, -0.1, elem.width + 0.2, elem.height + 0.2);
          ctx.setLineDash([]);
        }

        ctx.restore();
      });
    }

    // ── 4. Growing Beds ──
    if (layers.beds) {
      beds.forEach((bed) => {
        const isSelected = bed.id === selectedBedId;
        const typeDef = BED_TYPES_CATALOGUE.find((b) => b.type === bed.type) ?? BED_TYPES_CATALOGUE[0];

        ctx.save();
        ctx.translate(bed.x, bed.y);
        if (bed.rotation) ctx.rotate((bed.rotation * Math.PI) / 180);

        // Bed Outline & Soil Fill
        ctx.beginPath();
        if (bed.shape === 'l-shape') {
          const w = bed.width;
          const h = bed.height;
          const armW = w * 0.5;
          const armH = h * 0.5;
          ctx.moveTo(0, 0);
          ctx.lineTo(w, 0);
          ctx.lineTo(w, armH);
          ctx.lineTo(armW, armH);
          ctx.lineTo(armW, h);
          ctx.lineTo(0, h);
          ctx.closePath();
        } else {
          ctx.roundRect(0, 0, bed.width, bed.height, [0.2]);
        }

        // Fill with bed type organic hue
        ctx.fillStyle = bed.color || typeDef.defaultColor;
        ctx.fill();

        // Border
        ctx.lineWidth = isSelected ? 2.5 / zoom : 1.2 / zoom;
        ctx.strokeStyle = isSelected ? '#166534' : typeDef.borderColor;
        ctx.stroke();

        // Soil Texture hatch pattern
        ctx.lineWidth = 0.4 / zoom;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        for (let ix = 0.5; ix < bed.width; ix += 0.8) {
          ctx.beginPath();
          ctx.moveTo(ix, 0.2);
          ctx.lineTo(ix, bed.height - 0.2);
          ctx.stroke();
        }

        // Bed Name & Type Label
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(0.5, 11 / zoom)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bed.name, bed.width / 2, Math.max(0.6, bed.height * 0.25));

        // Area Badge
        ctx.font = `600 ${Math.max(0.4, 9 / zoom)}px sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText(`${bed.areaSqM.toFixed(1)} m² • ${bed.type}`, bed.width / 2, Math.max(1.1, bed.height * 0.45));

        // Placed Multi-Crops Pills inside Bed
        if (layers.crops && bed.crops && bed.crops.length > 0) {
          const cropCount = bed.crops.length;
          const pillSpacing = bed.width / (cropCount + 1);

          bed.crops.forEach((c, cIdx) => {
            const cx = pillSpacing * (cIdx + 1);
            const cy = Math.min(bed.height - 0.5, bed.height * 0.75);
            const initials = (c.cropName || 'PL')
              .split(' ')
              .map((w) => w[0])
              .join('')
              .substring(0, 2)
              .toUpperCase();

            // Crop Pill Background
            ctx.beginPath();
            ctx.arc(cx, cy, 0.45, 0, Math.PI * 2);
            ctx.fillStyle = c.color || '#22c55e';
            ctx.fill();
            ctx.lineWidth = 0.6 / zoom;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();

            // Crop Initials Label
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.max(0.4, 10 / zoom)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(initials, cx, cy);
          });
        }

        // Selection Bounding Box & 8 Resize Handles
        if (isSelected) {
          ctx.lineWidth = 1.5 / zoom;
          ctx.setLineDash([3 / zoom, 3 / zoom]);
          ctx.strokeStyle = '#15803d';
          ctx.strokeRect(-0.1, -0.1, bed.width + 0.2, bed.height + 0.2);
          ctx.setLineDash([]);

          // 8 Handles
          const handles = [
            { x: 0, y: 0 },
            { x: bed.width, y: 0 },
            { x: bed.width, y: bed.height },
            { x: 0, y: bed.height },
            { x: bed.width / 2, y: 0 },
            { x: bed.width, y: bed.height / 2 },
            { x: bed.width / 2, y: bed.height },
            { x: 0, y: bed.height / 2 },
          ];

          handles.forEach((h) => {
            ctx.beginPath();
            ctx.arc(h.x, h.y, 4 / zoom, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.lineWidth = 1.5 / zoom;
            ctx.strokeStyle = '#166534';
            ctx.stroke();
          });
        }

        ctx.restore();
      });
    }

    // ── 5. Trees & Fruit Crops ──
    if (layers.trees) {
      trees.forEach((tree) => {
        const isSelected = tree.id === selectedTreeId;
        const radius = tree.canopyDiameterM / 2;

        ctx.save();
        ctx.translate(tree.x, tree.y);

        // Canopy Shade Clearance Halo (dashed circle)
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 197, 94, 0.18)'; // transparent green
        ctx.fill();
        ctx.lineWidth = isSelected ? 2.5 / zoom : 1.2 / zoom;
        ctx.setLineDash([3 / zoom, 3 / zoom]);
        ctx.strokeStyle = isSelected ? '#15803d' : '#16a34a';
        ctx.stroke();
        ctx.setLineDash([]);

        // Inner Foliage Canopy Cluster
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = tree.color || '#15803d';
        ctx.fill();

        // Central Trunk
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(0.25, tree.trunkDiameterM / 2), 0, Math.PI * 2);
        ctx.fillStyle = '#78350f'; // amber-900 (wood)
        ctx.fill();
        ctx.lineWidth = 0.5 / zoom;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Tree Name & Canopy Diameter Label
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${Math.max(0.5, 10 / zoom)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(tree.treeName, 0, radius + 0.2);

        ctx.font = `600 ${Math.max(0.4, 8 / zoom)}px sans-serif`;
        ctx.fillStyle = '#475569';
        ctx.fillText(`Ø ${tree.canopyDiameterM.toFixed(1)}m`, 0, radius + 0.8);

        ctx.restore();
      });
    }

    // ── 6. Active Drawing Preview (Ghost) ──
    if (dragAction?.type === 'drawing-bed') {
      const { startM, currentM } = dragAction;
      const minX = Math.min(startM.x, currentM.x);
      const minY = Math.min(startM.y, currentM.y);
      const w = Math.abs(currentM.x - startM.x);
      const h = Math.abs(currentM.y - startM.y);

      ctx.save();
      ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
      ctx.fillRect(minX, minY, w, h);
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([4 / zoom, 4 / zoom]);
      ctx.strokeStyle = '#15803d';
      ctx.strokeRect(minX, minY, w, h);
      ctx.setLineDash([]);

      // Floating Dimensions Readout
      ctx.fillStyle = '#166534';
      ctx.font = `bold ${Math.max(0.6, 12 / zoom)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${w.toFixed(1)}m × ${h.toFixed(1)}m (${(w * h).toFixed(1)} m²)`, minX + w / 2, minY + h / 2);
      ctx.restore();
    } else if (dragAction?.type === 'measuring') {
      const { startM, currentM } = dragAction;
      const dist = Math.sqrt(Math.pow(currentM.x - startM.x, 2) + Math.pow(currentM.y - startM.y, 2));

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(startM.x, startM.y);
      ctx.lineTo(currentM.x, currentM.y);
      ctx.lineWidth = 2 / zoom;
      ctx.strokeStyle = '#dc2626'; // red-600
      ctx.stroke();

      // Measure Badge
      const midX = (startM.x + currentM.x) / 2;
      const midY = (startM.y + currentM.y) / 2;
      ctx.fillStyle = '#dc2626';
      ctx.font = `bold ${Math.max(0.6, 12 / zoom)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${dist.toFixed(2)} meters`, midX, midY - 0.2);
      ctx.restore();
    }

    ctx.restore();
  }, [
    pan,
    zoom,
    metersWidth,
    metersHeight,
    gridSizeMeters,
    boundaryPoints,
    layers,
    beds,
    trees,
    elements,
    selectedBedId,
    selectedTreeId,
    selectedElementId,
    dragAction,
  ]);

  // Trigger continuous canvas update on change
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Resize canvas to match container pixel density
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      canvasRef.current.width = clientWidth;
      canvasRef.current.height = clientHeight;
      renderCanvas();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderCanvas]);

  // ── Mouse & Touch Event Handlers ──

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || e.altKey || (activeTool === 'select' && e.shiftKey)) {
      // Middle mouse or Alt/Shift+Click: Pan canvas
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    const m = screenToMeters(e.clientX, e.clientY);
    const snapped = { x: snapToGrid(m.x), y: snapToGrid(m.y) };

    // ── Priority 1: Check Hit-Testing for existing entities on the land ──
    // Check Tree
    const clickedTree = trees.find((t) => {
      const dist = Math.sqrt(Math.pow(m.x - t.x, 2) + Math.pow(m.y - t.y, 2));
      return dist <= t.canopyDiameterM / 2;
    });

    if (clickedTree) {
      if (activeTool === 'eraser') {
        onSelectTree(clickedTree.id);
        onDeleteSelected();
        return;
      }
      onSelectTree(clickedTree.id);
      onSelectBed(null);
      onSelectElement(null);
      setDragAction({
        type: 'moving-tree',
        treeId: clickedTree.id,
        startM: m,
        initialTree: { ...clickedTree },
      });
      return;
    }

    // Check Element
    const clickedElem = elements.find((elem) => {
      return m.x >= elem.x && m.x <= elem.x + elem.width && m.y >= elem.y && m.y <= elem.y + elem.height;
    });

    if (clickedElem) {
      if (activeTool === 'eraser') {
        onSelectElement(clickedElem.id);
        onDeleteSelected();
        return;
      }
      onSelectElement(clickedElem.id);
      onSelectBed(null);
      onSelectTree(null);
      setDragAction({
        type: 'moving-elem',
        elemId: clickedElem.id,
        startM: m,
        initialElem: { ...clickedElem },
      });
      return;
    }

    // Check Bed
    const clickedBed = beds.find((b) => {
      return m.x >= b.x && m.x <= b.x + b.width && m.y >= b.y && m.y <= b.y + b.height;
    });

    if (clickedBed) {
      if (activeTool === 'eraser') {
        onSelectBed(clickedBed.id);
        onDeleteSelected();
        return;
      }

      if (activeTool === 'crop' && selectedCrop) {
        // Direct assignment of crop to bed
        const newCropItem = {
          id: `crop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          cropName: selectedCrop.name,
          category: selectedCrop.category as any,
          quantity: Math.max(1, Math.floor((clickedBed.areaSqM * 10000 * 0.7) / Math.pow(selectedCrop.spacingCm, 2))),
          spacingCm: selectedCrop.spacingCm,
          color: selectedCrop.color,
          icon: selectedCrop.icon,
        };
        onUpdateBed({
          ...clickedBed,
          crops: [...clickedBed.crops, newCropItem],
        });
        onSelectBed(clickedBed.id);
        toast.success(`Planted ${selectedCrop.icon || ''} ${selectedCrop.name} in ${clickedBed.name}`);
        return;
      }

      // Check if clicked a resize handle of the already selected bed
      if (selectedBedId === clickedBed.id) {
        const handleThreshold = 8 / zoom;
        const handles: { key: string; x: number; y: number }[] = [
          { key: 'nw', x: clickedBed.x, y: clickedBed.y },
          { key: 'ne', x: clickedBed.x + clickedBed.width, y: clickedBed.y },
          { key: 'se', x: clickedBed.x + clickedBed.width, y: clickedBed.y + clickedBed.height },
          { key: 'sw', x: clickedBed.x, y: clickedBed.y + clickedBed.height },
          { key: 'e', x: clickedBed.x + clickedBed.width, y: clickedBed.y + clickedBed.height / 2 },
          { key: 's', x: clickedBed.x + clickedBed.width / 2, y: clickedBed.y + clickedBed.height },
        ];

        const clickedHandle = handles.find(
          (h) => Math.abs(m.x - h.x) <= handleThreshold && Math.abs(m.y - h.y) <= handleThreshold
        );

        if (clickedHandle) {
          setDragAction({
            type: 'resizing-bed',
            bedId: clickedBed.id,
            handle: clickedHandle.key,
            startM: m,
            initialBed: { ...clickedBed },
          });
          return;
        }
      }

      onSelectBed(clickedBed.id);
      onSelectTree(null);
      onSelectElement(null);

      setDragAction({
        type: 'moving-bed',
        bedId: clickedBed.id,
        startM: m,
        initialBed: { ...clickedBed },
      });
      return;
    }

    // ── Priority 2: Clicked on empty space ──
    if (activeTool.startsWith('draw-')) {
      // Start drawing a bed
      setDragAction({
        type: 'drawing-bed',
        startM: snapped,
        currentM: snapped,
      });
      return;
    }

    if (activeTool === 'measure') {
      setDragAction({
        type: 'measuring',
        startM: m,
        currentM: m,
      });
      return;
    }

    if (activeTool === 'tree' && selectedCrop) {
      // Place Tree
      const treeCanopy = selectedCrop.canopyDiameterM || 4.5;
      const newTree: PlacedTree = {
        id: `tree-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        treeName: selectedCrop.name,
        category: selectedCrop.category as any,
        x: snapped.x,
        y: snapped.y,
        canopyDiameterM: treeCanopy,
        trunkDiameterM: 0.4,
        spacingM: selectedCrop.spacingCm ? selectedCrop.spacingCm / 100 : 4.0,
        growthCategory: 'Medium',
        heightM: 4.5,
        color: selectedCrop.color,
        icon: selectedCrop.icon,
      };
      onAddTree(newTree);
      onSelectTree(newTree.id);
      toast.success(`Planted ${selectedCrop.icon || '🌳'} ${selectedCrop.name}`);
      return;
    }

    if (activeTool === 'element' && selectedElement) {
      // Place Infrastructure / Water Element
      const newElem: PlacedElement = {
        id: `elem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: selectedElement.name,
        category: selectedElement.category,
        type: selectedElement.type,
        x: snapped.x,
        y: snapped.y,
        width: selectedElement.defaultWidthM,
        height: selectedElement.defaultHeightM,
        heightM: selectedElement.default3DHeightM,
        color: selectedElement.color,
        icon: selectedElement.icon,
      };
      onAddElement(newElem);
      onSelectElement(newElem.id);
      toast.success(`Placed ${selectedElement.icon || '🏛️'} ${selectedElement.name}`);
      return;
    }

    // Clicked empty background: clear selection and start pan
    onSelectBed(null);
    onSelectTree(null);
    onSelectElement(null);

    setIsPanning(true);
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const m = screenToMeters(e.clientX, e.clientY);
    setHoveredMeters(m);

    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    if (!dragAction) return;

    if (dragAction.type === 'drawing-bed') {
      const snapped = { x: snapToGrid(m.x), y: snapToGrid(m.y) };
      setDragAction({
        ...dragAction,
        currentM: snapped,
      });
      return;
    }

    if (dragAction.type === 'measuring') {
      setDragAction({
        ...dragAction,
        currentM: m,
      });
      return;
    }

    if (dragAction.type === 'moving-bed') {
      const deltaX = snapToGrid(m.x - dragAction.startM.x);
      const deltaY = snapToGrid(m.y - dragAction.startM.y);
      const updated = {
        ...dragAction.initialBed,
        x: Math.max(0, dragAction.initialBed.x + deltaX),
        y: Math.max(0, dragAction.initialBed.y + deltaY),
      };
      onUpdateBed(updated);
      return;
    }

    if (dragAction.type === 'resizing-bed') {
      const deltaX = snapToGrid(m.x - dragAction.startM.x);
      const deltaY = snapToGrid(m.y - dragAction.startM.y);
      const init = dragAction.initialBed;

      let newX = init.x;
      let newY = init.y;
      let newW = init.width;
      let newH = init.height;

      if (dragAction.handle.includes('e')) newW = Math.max(gridSizeMeters, init.width + deltaX);
      if (dragAction.handle.includes('s')) newH = Math.max(gridSizeMeters, init.height + deltaY);
      if (dragAction.handle.includes('w')) {
        const potentialW = init.width - deltaX;
        if (potentialW >= gridSizeMeters) {
          newX = init.x + deltaX;
          newW = potentialW;
        }
      }
      if (dragAction.handle.includes('n')) {
        const potentialH = init.height - deltaY;
        if (potentialH >= gridSizeMeters) {
          newY = init.y + deltaY;
          newH = potentialH;
        }
      }

      onUpdateBed({
        ...init,
        x: newX,
        y: newY,
        width: newW,
        height: newH,
        areaSqM: newW * newH,
      });
      return;
    }

    if (dragAction.type === 'moving-tree') {
      const deltaX = snapToGrid(m.x - dragAction.startM.x);
      const deltaY = snapToGrid(m.y - dragAction.startM.y);
      onUpdateTree({
        ...dragAction.initialTree,
        x: Math.max(0, dragAction.initialTree.x + deltaX),
        y: Math.max(0, dragAction.initialTree.y + deltaY),
      });
      return;
    }

    if (dragAction.type === 'moving-elem') {
      const deltaX = snapToGrid(m.x - dragAction.startM.x);
      const deltaY = snapToGrid(m.y - dragAction.startM.y);
      onUpdateElement({
        ...dragAction.initialElem,
        x: Math.max(0, dragAction.initialElem.x + deltaX),
        y: Math.max(0, dragAction.initialElem.y + deltaY),
      });
      return;
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);

    if (dragAction?.type === 'drawing-bed') {
      const { startM, currentM } = dragAction;
      const minX = Math.min(startM.x, currentM.x);
      const minY = Math.min(startM.y, currentM.y);
      let w = Math.abs(currentM.x - startM.x);
      let h = Math.abs(currentM.y - startM.y);

      // Default minimum bed dimension: 1 grid unit
      if (w < gridSizeMeters) w = gridSizeMeters;
      if (h < gridSizeMeters) h = gridSizeMeters;

      const typeDef = BED_TYPES_CATALOGUE.find((b) => b.type === selectedBedType) ?? BED_TYPES_CATALOGUE[0];
      const shape = activeTool === 'draw-lshape' ? 'l-shape' : activeTool === 'draw-square' ? 'square' : 'rectangle';

      const newBed: FarmBed = {
        id: `bed-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: `Bed ${beds.length + 1} (${selectedBedType})`,
        type: selectedBedType,
        shape: shape as any,
        x: minX,
        y: minY,
        width: w,
        height: h,
        areaSqM: shape === 'l-shape' ? w * h * 0.75 : w * h,
        heightMm: typeDef.defaultHeightMm,
        color: typeDef.defaultColor,
        crops: [],
      };

      onAddBed(newBed);
      onSelectBed(newBed.id);
      toast.success(`Created ${typeDef.icon || '🪴'} ${newBed.name}`);
    }

    setDragAction(null);
  };

  // Zoom with Mouse Wheel centered at pointer
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 4), 100);

    setPan({
      x: mouseX - (mouseX - pan.x) * (newZoom / zoom),
      y: mouseY - (mouseY - pan.y) * (newZoom / zoom),
    });
    setZoom(newZoom);
  };

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative h-full w-full overflow-hidden bg-stone-100 select-none"
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="h-full w-full cursor-crosshair touch-none"
      />

      {/* Floating HUD: Coordinates, Snap & Zoom Controls */}
      <div className="absolute bottom-4 left-4 flex flex-wrap items-center gap-2.5 rounded-2xl border border-stone-200 bg-white/95 px-3.5 py-2 text-xs text-stone-700 shadow-md backdrop-blur z-10 max-w-[calc(100vw-2rem)]">
        {/* Coordinates */}
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="text-stone-400">X:</span>
          <span className="font-bold text-stone-900">{hoveredMeters ? hoveredMeters.x.toFixed(1) : '0.0'}m</span>
          <span className="text-stone-400 ml-1">Y:</span>
          <span className="font-bold text-stone-900">{hoveredMeters ? hoveredMeters.y.toFixed(1) : '0.0'}m</span>
        </div>

        {/* Snap Toggle Button */}
        {onToggleSnap && (
          <>
            <div className="h-3.5 w-px bg-stone-300" />
            <button
              type="button"
              onClick={onToggleSnap}
              title={snapToGridEnabled ? 'Snap is Enabled (Click to disable)' : 'Snap is Disabled (Click to enable)'}
              className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold transition ${
                snapToGridEnabled
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-stone-100 text-stone-400 hover:text-stone-700'
              }`}
            >
              <Magnet className="h-3 w-3" />
              <span>{snapToGridEnabled ? 'Snap: ON' : 'Snap: OFF'}</span>
            </button>
          </>
        )}

        <div className="h-3.5 w-px bg-stone-300" />

        {/* Zoom Controls & Reset View */}
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-600">
          <span>Zoom: {Math.round((zoom / 15) * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(4, z * 0.85))}
            title="Zoom Out"
            className="flex h-5 w-5 items-center justify-center rounded bg-stone-100 text-stone-700 hover:bg-stone-200 text-xs font-bold"
          >
            <Minus className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(100, z * 1.15))}
            title="Zoom In"
            className="flex h-5 w-5 items-center justify-center rounded bg-stone-100 text-stone-700 hover:bg-stone-200 text-xs font-bold"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={handleFitView}
            title="Reset & Fit View to Farm"
            className="flex items-center gap-1 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-600 hover:bg-stone-200 font-semibold"
          >
            <RotateCcw className="h-2.5 w-2.5" />
            <span>Fit</span>
          </button>
        </div>
      </div>
    </div>
  );
}
