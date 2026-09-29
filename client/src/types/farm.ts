export interface GeoJsonGeometry {
  type: string;
  coordinates: number[][][] | number[][];
}

export interface GeoJsonFeature<TGeometry = GeoJsonGeometry, TProperties = Record<string, unknown>> {
  type: 'Feature';
  geometry: TGeometry;
  properties: TProperties;
}

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface PointGeometry {
  type: 'Point';
  coordinates: [number, number];
}

export type PolygonFeature = GeoJsonFeature<PolygonGeometry>;
export type PointFeature = GeoJsonFeature<PointGeometry>;

export interface Zone {
  id: string;
  farmId: string;
  name: string;
  zoneNumber: number;
  boundary: PolygonFeature;
  centroid: PointFeature;
  areaSquareMeters: number;
  areaBigha: number;
  createdAt: string;
  updatedAt: string;
}

export type CropSeason = 'Kharif' | 'Rabi' | 'Zaid' | string;

export interface Crop {
  id: string;
  name: string;
  scientificName: string | null;
  suitableSoilTypes: string[];
  minPh: number;
  maxPh: number;
  season: CropSeason;
  estimatedDurationMonths: number;
  preferredDrainage?: string;
  weeklyWaterRequirementLitersPerAcre?: number;
  minTempC?: number;
  maxTempC?: number;
  rainfallTolerance?: string;
  plantingWindowStart?: number;
  plantingWindowEnd?: number;
  minSoilHealthScore?: number;
}

export interface RecommendationFactors {
  soilType: number;
  ph: number;
  drainage: number;
  water: number;
  temperature: number;
  season: number;
  seasonalRainfall: number;
  humidity: number;
  droughtFrostRisk: number;
  rotation: number;
}

export interface RecommendationWarning {
  factor: string;
  message: string;
}

export interface NaturalInputs {
  jeevamritLiters: number;
  beejamritLiters: number;
  agniastraLiters: number;
  mulchKg: number;
  cowDungKg: number;
  cowUrineLiters: number;
  jaggeryKg: number;
  mustardCakeKg: number;
  applicationCount: number;
}

export interface MarketDemand {
  buyerCount: number;
  totalQuantityKg: number;
  earliestDeadline: string;
  avgPricePerKg: number | null;
}

export interface WaterCostWarning {
  deficitLitersPerWeek: number;
  estimatedSeasonCostRupees: number;
  weeksOfDeficit: number;
}

export interface CropRecommendation {
  crop: Crop & { cropFamily?: string; riskLevel?: 'beginner' | 'intermediate' | 'expert' };
  suitabilityScore: number;
  reason: string;
  factors?: RecommendationFactors;
  warnings?: RecommendationWarning[];
  naturalInputs?: NaturalInputs;
  marketDemand?: MarketDemand | null;
  waterCostWarning?: WaterCostWarning | null;
}

export interface SeasonalClimate {
  seasonAvgTempC: number | null;
  seasonTotalRainfallMm: number | null;
  seasonAvgHumidityPct: number | null;
  avgDryWeeksPerSeason: number;
  avgFrostDaysPerSeason: number;
  monthsAnalyzed: number[];
}

export interface WeatherContext {
  tempC: number | null;
  humidityPct: number | null;
  precipMmLastWeek: number | null;
  forecastRainMm: number | null;
  rainfallCategory: 'dry' | 'moderate' | 'wet' | null;
}

export interface CropRecommendationResponse {
  zone: {
    id: string;
    name: string;
    farmId: string;
    farmName: string;
  };
  soilReport: {
    soilType: string;
    phLevel: number;
    drainageSpeed: string;
    soilHealthScore: number;
  };
  weather: WeatherContext;
  seasonalClimate: Record<string, SeasonalClimate | null>;
  recommendationsBySeason: Record<string, CropRecommendation[]>;
}

export interface Farm {
  id: string;
  farmerId: string;
  name: string;
  boundary: PolygonFeature;
  centroid: PointFeature;
  areaSquareMeters: number;
  areaBigha: number;
  areaAcres: number;
  areaHectares: number;
  perimeter: number;
  convexityScore: number;
  address: string | null;
  district: string;
  state: string;
  zones: Zone[];
  createdAt: string;
  updatedAt: string;
}

export interface FarmFormPayload {
  name: string;
  district: string;
  address?: string;
  actualAreaBigha?: number;
  boundary: PolygonFeature;
}

export interface ZonePayload {
  name: string;
  zoneNumber: number;
  boundary: PolygonFeature;
  areaSquareMeters: number;
  areaBigha: number;
  centroid: PointFeature;
}

export interface InputRecipeIngredient {
  key: string;
  label: string;
  amount: number;
  unit: string;
}

export interface InputRecipeResponse {
  zoneName: string;
  areaAcres: number;
  recipeType: string;
  ingredients: InputRecipeIngredient[];
}

export interface FinancialEstimateResponse {
  zoneName: string;
  areaAcres: number;
  cropName: string;
  estimatedGrossIncome: number;
  estimatedInputCost: number;
  netProfit: number;
}
