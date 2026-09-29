export type EventType =
  | 'field_prep'
  | 'planting'
  | 'thinning'
  | 'training'
  | 'mulching'
  | 'weeding'
  | 'pruning'
  | 'fertilizer'
  | 'pest_control'
  | 'harvest'
  | 'irrigation'
  | 'observation'
  | 'germination_check'
  | 'plant_stand'
  | 'tiller_check'
  | 'leaf_health'
  | 'underground_check'
  | 'flower_stalk_check'
  | 'pest_scout'
  | 'leaf_yellowing'
  | 'harvest_readiness'
  | 'seedling_check'
  | 'sex_determination'
  | 'male_thinning'
  | 'flowering_check'
  | 'fruit_set'
  | 'fruit_development'
  | 'maturity_check'
  | 'annual_health'
  | 'vine_check'
  | 'male_flower_check'
  | 'female_flower_check'
  | 'fruit_sizing'
  | 'yield_tally'
  | 'season_review'
  | 'true_leaf_check'
  | 'growth_rate'
  | 'colour_check'
  | 'quality_check'
  | 'custom';

export type EventCategory = 'irrigation' | 'crop_care' | 'inputs' | 'harvest' | 'observation';

export type EventStatus = 'scheduled' | 'overdue' | 'pending' | 'completed' | 'skipped' | 'template';

export interface RecipeIngredient {
  label: string;
  amount: number;
  unit: string;
}

export interface EventIrrigationDetails {
  waterLiters: number;
  baseWaterLiters: number;
  soilRetentionMultiplier: number;
  method: string;
  sourceName: string | null;
  sourceType: string | null;
  isDeficit: boolean;
  overdraftLiters: number;
  completedLiters: number | null;
}

export interface CalendarEventDetails {
  recipe: { name: string; ingredients: Record<string, RecipeIngredient> } | null;
  irrigation: EventIrrigationDetails | null;
  soilAdvisory: string | null;
  notes: string | null;
}

export interface CalendarEvent {
  id: string;
  date: string;           // YYYY-MM-DD
  type: EventType;
  category: EventCategory;
  title: string;
  zoneId: string;
  zoneName: string;
  zoneNumber: number;
  cropName: string;
  priority: 'morning' | 'afternoon';
  labourWorkers: number;
  labourHours: number;
  status: EventStatus;
  details: CalendarEventDetails;
  checklistItems?: ChecklistItem[];
  dbTaskId?: string;
  isCustom?: boolean;
}

export interface DailyLabour {
  workers: number;
  hours: number;
  taskTitles: string[];
}

export interface CalendarAlerts {
  deficitIrrigations: CalendarEvent[];
  harvestsOpening: CalendarEvent[];
  overdueTasks: CalendarEvent[];
}

export interface ZoneMeta {
  zoneId: string;
  zoneName: string;
  cropName: string;
}

export interface CalendarResponse {
  farmId: string;
  farmName: string;
  year: number;
  month: number;
  events: CalendarEvent[];
  dailyLabour: Record<string, DailyLabour>;
  alerts: CalendarAlerts;
  zoneMeta: ZoneMeta[];
}

// ── UI filter state ────────────────────────────────────────────────────────────

export interface CalendarFilters {
  zoneId: string;
  category: string;
  cropName: string;
}

// ── Event type display metadata ────────────────────────────────────────────────

export const EVENT_META: Record<
  EventType,
  { label: string; color: string; bg: string; border: string; icon: string }
> = {
  field_prep:   { label: 'Field Prep',    color: 'text-stone-700',   bg: 'bg-stone-100',   border: 'border-stone-300',   icon: '⛏️'  },
  planting:     { label: 'Planting',      color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-300', icon: '🌱'  },
  thinning:     { label: 'Thinning',      color: 'text-lime-700',    bg: 'bg-lime-100',    border: 'border-lime-300',    icon: '✂️'  },
  training:     { label: 'Training',      color: 'text-indigo-700',  bg: 'bg-indigo-100',  border: 'border-indigo-300',  icon: '🪢'  },
  mulching:     { label: 'Mulching',      color: 'text-amber-800',   bg: 'bg-amber-100',   border: 'border-amber-300',   icon: '🍂'  },
  weeding:      { label: 'Weeding',       color: 'text-teal-700',    bg: 'bg-teal-100',    border: 'border-teal-300',    icon: '🌿'  },
  pruning:      { label: 'Pruning',       color: 'text-purple-700',  bg: 'bg-purple-100',  border: 'border-purple-300',  icon: '🌾'  },
  fertilizer:   { label: 'Fertilizer',    color: 'text-green-700',   bg: 'bg-green-100',   border: 'border-green-300',   icon: '🧪'  },
  pest_control: { label: 'Pest Control',  color: 'text-orange-700',  bg: 'bg-orange-100',  border: 'border-orange-300',  icon: '🛡️'  },
  harvest:      { label: 'Harvest',       color: 'text-yellow-700',  bg: 'bg-yellow-100',  border: 'border-yellow-300',  icon: '🌾'  },
  irrigation:   { label: 'Irrigation',    color: 'text-blue-700',    bg: 'bg-blue-100',    border: 'border-blue-300',    icon: '💧'  },
  germination_check:   { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  plant_stand:         { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  tiller_check:        { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  leaf_health:         { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  underground_check:   { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  flower_stalk_check:  { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  pest_scout:          { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  leaf_yellowing:      { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  harvest_readiness:   { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  seedling_check:      { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  sex_determination:   { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  male_thinning:       { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  flowering_check:     { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  fruit_set:           { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  fruit_development:   { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  maturity_check:      { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  annual_health:       { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  vine_check:          { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  male_flower_check:   { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  female_flower_check: { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  fruit_sizing:        { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  yield_tally:         { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  season_review:       { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  true_leaf_check:     { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  growth_rate:         { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  colour_check:        { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  quality_check:       { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  observation:         { label: 'Observation', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', icon: '🔍' },
  custom:              { label: 'Custom',      color: 'text-pink-700',   bg: 'bg-pink-100',   border: 'border-pink-300',   icon: '📝' },
};

export const CATEGORY_META: Record<EventCategory, { label: string; color: string }> = {
  irrigation: { label: 'Irrigation',  color: 'bg-blue-100 text-blue-700'    },
  crop_care:  { label: 'Crop Care',   color: 'bg-emerald-100 text-emerald-700' },
  inputs:     { label: 'Inputs',      color: 'bg-green-100 text-green-700'  },
  harvest:     { label: 'Harvest',      color: 'bg-yellow-100 text-yellow-700' },
  observation: { label: 'Observation', color: 'bg-violet-100 text-violet-700' },
};

// ── Today endpoint types ───────────────────────────────────────────────────────

export interface TodayResponse {
  farmId: string;
  date: string;
  morning: CalendarEvent[];
  afternoon: CalendarEvent[];
  totalTasks: number;
  completedToday: number;
  totalWorkers: number;
  totalHours: number;
  missedCount: number;
}

// ── Year overview types ────────────────────────────────────────────────────────

export interface MonthSummary {
  month: number;
  total: number;
  completed: number;
  skipped: number;
  missed: number;
  pending: number;
  completionRate: number;
  byCategory: Partial<Record<EventCategory, number>>;
  totalWorkers: number;
  totalHours: number;
  criticalDates: { date: string; type: EventType; title: string; cropName: string; zoneName: string }[];
}

export interface YearOverviewResponse {
  farmId: string;
  farmName: string;
  year: number;
  months: MonthSummary[];
}

// ── Missed tasks endpoint type ─────────────────────────────────────────────────

export interface MissedTasksResponse {
  farmId: string;
  missedCount: number;
  tasks: CalendarEvent[];
}

// ── Task update payload ────────────────────────────────────────────────────────

export interface TaskUpdatePayload {
  status: 'COMPLETED' | 'SKIPPED' | 'PENDING';
  note?: string;
}

// ── Checklist ──────────────────────────────────────────────────────────────────

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface ChecklistUpdatePayload {
  itemId: string;
  done: boolean;
}

export interface ChecklistUpdateResponse {
  id: string;
  checklistItems: ChecklistItem[];
  status: string;
  completedAt: string | null;
  allDone: boolean;
}

// ── Activity Log ───────────────────────────────────────────────────────────────

export interface ActivityLogTask {
  id: string;
  scheduledDate: string;
  completedAt: string | null;
  status: 'COMPLETED' | 'SKIPPED';
  taskType: EventType;
  category: EventCategory;
  title: string;
  cropName: string;
  zoneId: string;
  zoneName: string;
  zoneNumber: number;
  priority: 'morning' | 'afternoon';
  labourWorkers: number;
  labourHours: number;
  daysLate: number | null;
  completedNote: string | null;
  checklistItems: ChecklistItem[];
}

export interface ActivityLogZone {
  id: string;
  name: string;
  zoneNumber: number;
}

export interface ActivityLogResponse {
  farmId: string;
  farmName: string;
  totalCount: number;
  completedCount: number;
  skippedCount: number;
  tasks: ActivityLogTask[];
  zones: ActivityLogZone[];
}
