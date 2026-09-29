export interface ZoneEconomics {
  grossIncomeRaw: number;
  grossIncomeProcessed: number;
  inputCost: number;
  netProfitRaw: number;
  netProfitProcessed: number;
}

export interface ZoneSuggestion {
  cropName: string;
  cropEconomicsId: string;
  notes: string | null;
  reason: string;
  isAutoSuggested: boolean;
}

export interface PlanZoneSoilReport {
  soilType: string;
  phLevel: number;
  drainageSpeed: string;
  soilHealthScore: number;
  scoreLabel: string;
}

export interface PlanZone {
  id: string;
  name: string;
  zoneNumber: number;
  areaAcres: number;
  areaBigha: number;
  soilReport: PlanZoneSoilReport | null;
  suggestion: ZoneSuggestion;
  economics: ZoneEconomics;
}

export interface AvailableCrop {
  id: string;
  cropName: string;
  season: string;
  durationMonths: number;
  yieldPerAcreKg: number;
  rawSalePricePerKg: number;
  processedSalePricePerKg: number;
}

export type ScenarioHighlightColor = 'emerald' | 'blue' | 'amber' | 'violet';

export interface PlanScenario {
  key: string;
  name: string;
  description: string;
  highlightColor: ScenarioHighlightColor;
  grossIncomeRaw: number;
  grossIncomeProcessed: number;
  inputCost: number;
  netProfitRaw: number;
  netProfitProcessed: number;
}

export interface FarmPlanResponse {
  farmId: string;
  farmName: string;
  areaAcres: number;
  totalZones: number;
  availableCrops: AvailableCrop[];
  zones: PlanZone[];
  scenarios: PlanScenario[];
}

export interface AssignCropRequest {
  cropEconomicsId: string;
  notes?: string;
}

export interface AssignCropResponse {
  zoneId: string;
  zoneName: string;
  cropEconomicsId: string;
  cropName: string;
  notes: string | null;
}
