export type WaterSourceType = 'POND' | 'BOREWELL' | 'CANAL' | 'TANK' | 'RIVER';
export type IrrigationStatus = 'PENDING' | 'COMPLETED' | 'SKIPPED';

export interface WaterSource {
  id: string;
  farmId: string;
  name: string;
  sourceType: WaterSourceType;
  totalCapacityLiters: number;
  currentLevelLiters: number;
  createdAt: string;
  updatedAt: string;
}

export interface IrrigationSchedule {
  id: string;
  zoneId: string;
  farmId: string;
  cropId: string;
  waterSourceId: string | null;
  weekStartDate: string;
  weekEndDate: string;
  areaAcres: number;
  soilRetentionMultiplier: number;
  baseWaterLiters: number;
  adjustedWaterLiters: number;
  irrigationMethod: string;
  status: IrrigationStatus;
  completedAt: string | null;
  completedLiters: number | null;
  notes: string | null;
  zone?: { id: string; name: string; zoneNumber: number };
  crop?: {
    id: string;
    name: string;
    season: string;
    weeklyWaterRequirementLitersPerAcre: number;
  };
  waterSource?: {
    id: string;
    name: string;
    sourceType: WaterSourceType;
    currentLevelLiters: number;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ZoneHydraulics {
  zoneId: string;
  zoneName: string;
  zoneNumber: number;
  ready: boolean;
  missingData?: string;
  cropName?: string;
  soilType?: string;
  drainageSpeed?: string;
  areaAcres?: number;
  soilRetentionMultiplier?: number;
  soilMultiplierLabel?: string;
  baseWaterLiters?: number;
  adjustedWaterLiters?: number;
  irrigationMethod?: string;
  explanation?: string;
  thisWeekSchedule?: IrrigationSchedule | null;
}

export interface WaterSummary {
  waterSources: WaterSource[];
  totalCapacityLiters: number;
  totalCurrentLiters: number;
  fillPercentage: number;
  totalPendingLiters: number;
  pendingScheduleCount: number;
  schedules: IrrigationSchedule[];
  zoneHydraulics: ZoneHydraulics[];
}

export interface GenerateSchedulesResult {
  created: IrrigationSchedule[];
  skipped: { zoneId: string; reason: string }[];
  weekStart: string;
  weekEnd: string;
}

export interface WaterSourcePayload {
  name: string;
  sourceType: WaterSourceType;
  totalCapacityLiters: number;
  currentLevelLiters?: number;
}

export interface CompleteSchedulePayload {
  completedLiters?: number;
  notes?: string;
}
