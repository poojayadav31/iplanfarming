export type BedType =
  | 'Raised Bed'
  | 'Sunken Bed'
  | 'Hot Bed'
  | 'Wicking Bed'
  | 'Hugelkultur Bed'
  | 'Keyhole Bed'
  | 'Terrace Bed'
  | 'Polyculture Bed'
  | 'Food Forest Patch'
  | 'Nursery Bed';

export type BedShape = 'rectangle' | 'square' | 'l-shape' | 'polygon';

export interface BedCropItem {
  id: string;
  cropName: string;
  category: 'Vegetables' | 'Herbs' | 'Fruit Crops' | 'Support Plants';
  quantity: number;
  spacingCm: number;
  color: string;
  icon?: string;
  notes?: string;
}

export interface FarmBed {
  id: string;
  name: string;
  type: BedType;
  shape: BedShape;
  x: number; // meters from top-left origin
  y: number; // meters from top-left origin
  width: number; // meters
  height: number; // meters
  points?: [number, number][]; // optional polygon local offsets
  rotation?: number; // degrees
  areaSqM: number;
  heightMm: number; // Physical elevation for 3D view
  notes?: string;
  color?: string;
  crops: BedCropItem[];
}

export type TreeGrowthCategory = 'Fast' | 'Medium' | 'Slow';

export interface PlacedTree {
  id: string;
  treeName: string;
  category: 'Trees' | 'Fruit Crops';
  x: number; // center x in meters
  y: number; // center y in meters
  canopyDiameterM: number;
  trunkDiameterM: number;
  spacingM: number;
  growthCategory: TreeGrowthCategory;
  heightM: number;
  color?: string;
  icon?: string;
  notes?: string;
}

export type ElementCategory = 'water' | 'infrastructure' | 'animal';

export type ElementType =
  | 'pond'
  | 'tank'
  | 'swale'
  | 'irrigation_line'
  | 'pathway'
  | 'fence'
  | 'gate'
  | 'shed'
  | 'greenhouse'
  | 'compost_area'
  | 'cow_shed'
  | 'chicken_coop'
  | 'goat_shelter';

export interface PlacedElement {
  id: string;
  name: string;
  category: ElementCategory;
  type: ElementType;
  x: number; // meters
  y: number; // meters
  width: number;
  height: number;
  points?: [number, number][]; // for linear or polygon elements like paths, fences
  rotation?: number;
  heightM?: number; // for 3D representation
  color?: string;
  icon?: string;
  notes?: string;
}

export interface LayerVisibility {
  beds: boolean;
  crops: boolean;
  trees: boolean;
  water: boolean;
  buildings: boolean;
  animals: boolean;
  irrigation: boolean;
  paths: boolean;
  fencing: boolean;
  grid: boolean;
  boundary: boolean;
}

export type DesignerTool =
  | 'select'
  | 'draw-rect'
  | 'draw-square'
  | 'draw-lshape'
  | 'draw-polygon'
  | 'crop'
  | 'tree'
  | 'element'
  | 'measure'
  | 'eraser';

export type ViewMode = '2d' | '3d' | 'walkthrough';

export interface FarmDesignData {
  version: number;
  gridSizeMeters: number;
  boundaryPolygon?: [number, number][]; // Local metric coordinates (x, y) relative to bounding box
  originGeo?: [number, number]; // [lng, lat] of top-left corner
  metersWidth?: number;
  metersHeight?: number;
  beds: FarmBed[];
  trees: PlacedTree[];
  elements: PlacedElement[];
  layers: LayerVisibility;
}

export interface SavedFarmDesign {
  id: string;
  farmId: string;
  name: string;
  version: number;
  status: 'DRAFT' | 'FINAL';
  gridSizeMeters: number;
  designData: FarmDesignData;
  previewImage?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  farmMeta?: {
    name: string;
    boundary: any;
    centroid: any;
    areaAcres: number;
    areaBigha: number;
  };
}

export interface CropCatalogueItem {
  id: string;
  name: string;
  category: 'Vegetables' | 'Herbs' | 'Fruit Crops' | 'Trees' | 'Support Plants';
  scientificName?: string;
  spacingCm: number;
  canopyDiameterM?: number;
  durationMonths?: number;
  color: string;
  bgRgb: string;
  icon?: string;
  waterNeed: 'Low' | 'Moderate' | 'High';
  idealBedTypes: BedType[];
  companionLikes: string[];
  companionDislikes: string[];
  benefits: string;
  description: string;
}

export interface BedTypeDefinition {
  type: BedType;
  name: string;
  tagline: string;
  defaultHeightMm: number;
  defaultColor: string;
  borderColor: string;
  icon?: string;
  waterRetention: 'High' | 'Balanced' | 'Fast';
  thermalMass: 'High' | 'Normal';
  bestFor: string;
  description: string;
}

export interface FarmElementDefinition {
  type: ElementType;
  name: string;
  category: ElementCategory;
  defaultWidthM: number;
  defaultHeightM: number;
  default3DHeightM: number;
  color: string;
  iconName: string;
  icon?: string;
  description: string;
}
