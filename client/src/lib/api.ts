import axios from 'axios';
import type {
  CropRecommendationResponse,
  InputRecipeResponse,
  FinancialEstimateResponse,
} from '../types/farm';
import type { FarmEconomicsResponse, WeeklyEconomicsResponse } from '../types/economics';
import type { FarmPlanResponse, AssignCropResponse } from '../types/plan';
import type {
  WaterSource,
  WaterSourcePayload,
  WaterSummary,
  IrrigationSchedule,
  GenerateSchedulesResult,
  CompleteSchedulePayload,
} from '../types/water';
import type {
  CalendarResponse,
  TodayResponse,
  YearOverviewResponse,
  MissedTasksResponse,
  TaskUpdatePayload,
  ChecklistUpdatePayload,
  ChecklistUpdateResponse,
  ActivityLogResponse,
} from '../types/calendar';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function getRecommendationsForZone(
  zoneId: string
): Promise<CropRecommendationResponse> {
  const { data } = await api.get<ApiEnvelope<CropRecommendationResponse>>(
    `/zones/${zoneId}/recommendations`
  );

  return data.data;
}

export async function getInputRecipe(
  zoneId: string,
  recipeType: string
): Promise<InputRecipeResponse> {
  const { data } = await api.get<ApiEnvelope<InputRecipeResponse>>(
    `/zones/${zoneId}/calculations/recipe`,
    { params: { type: recipeType } }
  );

  return data.data;
}

export async function getFinancialEstimate(
  zoneId: string,
  cropName: string
): Promise<FinancialEstimateResponse> {
  const { data } = await api.get<ApiEnvelope<FinancialEstimateResponse>>(
    `/zones/${zoneId}/calculations/financial`,
    { params: { crop: cropName } }
  );

  return data.data;
}

export async function getFarmEconomics(
  farmId: string
): Promise<FarmEconomicsResponse> {
  const { data } = await api.get<ApiEnvelope<FarmEconomicsResponse>>(
    `/farms/${farmId}/economics`
  );
  return data.data;
}

export async function getWeeklyEconomics(
  farmId: string,
  startDate?: string
): Promise<WeeklyEconomicsResponse> {
  const { data } = await api.get<ApiEnvelope<WeeklyEconomicsResponse>>(
    `/farms/${farmId}/economics/weekly`,
    { params: startDate ? { startDate } : undefined }
  );
  return data.data;
}

export async function getFarmPlan(farmId: string): Promise<FarmPlanResponse> {
  const { data } = await api.get<ApiEnvelope<FarmPlanResponse>>(
    `/farms/${farmId}/plan`
  );
  return data.data;
}

export async function assignCropToZone(
  zoneId: string,
  cropEconomicsId: string,
  notes?: string
): Promise<AssignCropResponse> {
  const { data } = await api.put<ApiEnvelope<AssignCropResponse>>(
    `/zones/${zoneId}/assign`,
    { cropEconomicsId, notes }
  );
  return data.data;
}

export async function assignCropToZoneByName(
  zoneId: string,
  cropName: string
): Promise<AssignCropResponse> {
  const { data } = await api.put<ApiEnvelope<AssignCropResponse>>(
    `/zones/${zoneId}/assign`,
    { cropName }
  );
  return data.data;
}

export async function clearZoneAssignment(zoneId: string): Promise<{ zoneId: string; cleared: boolean }> {
  const { data } = await api.delete<ApiEnvelope<{ zoneId: string; cleared: boolean }>>(
    `/zones/${zoneId}/assign`
  );
  return data.data;
}

// ─── Water Management ─────────────────────────────────────────────────────────

export async function getWaterSummary(farmId: string): Promise<WaterSummary> {
  const { data } = await api.get<ApiEnvelope<WaterSummary>>(
    `/farms/${farmId}/water/summary`
  );
  return data.data;
}

export async function getWaterSources(farmId: string): Promise<WaterSource[]> {
  const { data } = await api.get<ApiEnvelope<WaterSource[]>>(
    `/farms/${farmId}/water/sources`
  );
  return data.data;
}

export async function addWaterSource(
  farmId: string,
  payload: WaterSourcePayload
): Promise<WaterSource> {
  const { data } = await api.post<ApiEnvelope<WaterSource>>(
    `/farms/${farmId}/water/sources`,
    payload
  );
  return data.data;
}

export async function updateWaterSource(
  farmId: string,
  sourceId: string,
  payload: Partial<WaterSourcePayload>
): Promise<WaterSource> {
  const { data } = await api.put<ApiEnvelope<WaterSource>>(
    `/farms/${farmId}/water/sources/${sourceId}`,
    payload
  );
  return data.data;
}

export async function deleteWaterSource(
  farmId: string,
  sourceId: string
): Promise<{ deleted: boolean }> {
  const { data } = await api.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/farms/${farmId}/water/sources/${sourceId}`
  );
  return data.data;
}

export async function getIrrigationSchedules(
  farmId: string
): Promise<IrrigationSchedule[]> {
  const { data } = await api.get<ApiEnvelope<IrrigationSchedule[]>>(
    `/farms/${farmId}/water/schedules`
  );
  return data.data;
}

export async function generateIrrigationSchedules(
  farmId: string
): Promise<GenerateSchedulesResult> {
  const { data } = await api.post<ApiEnvelope<GenerateSchedulesResult>>(
    `/farms/${farmId}/water/schedules/generate`
  );
  return data.data;
}

export async function completeIrrigationSchedule(
  farmId: string,
  scheduleId: string,
  payload?: CompleteSchedulePayload
): Promise<IrrigationSchedule> {
  const { data } = await api.put<ApiEnvelope<IrrigationSchedule>>(
    `/farms/${farmId}/water/schedules/${scheduleId}/complete`,
    payload ?? {}
  );
  return data.data;
}

export async function skipIrrigationSchedule(
  farmId: string,
  scheduleId: string
): Promise<IrrigationSchedule> {
  const { data } = await api.put<ApiEnvelope<IrrigationSchedule>>(
    `/farms/${farmId}/water/schedules/${scheduleId}/skip`
  );
  return data.data;
}

// ─── Farm Calendar ────────────────────────────────────────────────────────────

export async function getFarmCalendar(
  farmId: string,
  options?: { year?: number; month?: number; zoneId?: string; category?: string }
): Promise<CalendarResponse> {
  const { data } = await api.get<ApiEnvelope<CalendarResponse>>(
    `/farms/${farmId}/calendar`,
    { params: options }
  );
  return data.data;
}

export async function getTodayTasks(farmId: string): Promise<TodayResponse> {
  const { data } = await api.get<ApiEnvelope<TodayResponse>>(
    `/farms/${farmId}/calendar/today`
  );
  return data.data;
}

export async function getYearOverview(
  farmId: string,
  year?: number
): Promise<YearOverviewResponse> {
  const { data } = await api.get<ApiEnvelope<YearOverviewResponse>>(
    `/farms/${farmId}/calendar/year`,
    { params: year ? { year } : undefined }
  );
  return data.data;
}

export async function getMissedTasks(farmId: string): Promise<MissedTasksResponse> {
  const { data } = await api.get<ApiEnvelope<MissedTasksResponse>>(
    `/farms/${farmId}/calendar/missed`
  );
  return data.data;
}

export async function updateCalendarTask(
  farmId: string,
  taskId: string,
  payload: TaskUpdatePayload
): Promise<{ id: string; status: string; completedAt: string | null }> {
  const { data } = await api.patch<ApiEnvelope<{ id: string; status: string; completedAt: string | null }>>(
    `/farms/${farmId}/tasks/${taskId}`,
    payload
  );
  return data.data;
}

export async function updateChecklistItem(
  farmId: string,
  taskId: string,
  payload: ChecklistUpdatePayload
): Promise<ChecklistUpdateResponse> {
  const { data } = await api.patch<ApiEnvelope<ChecklistUpdateResponse>>(
    `/farms/${farmId}/tasks/${taskId}/checklist`,
    payload
  );
  return data.data;
}

export async function getActivityLog(
  farmId: string,
  options?: { year?: number; month?: number; status?: string; zoneId?: string }
): Promise<ActivityLogResponse> {
  const { data } = await api.get<ApiEnvelope<ActivityLogResponse>>(
    `/farms/${farmId}/calendar/activity-log`,
    { params: options }
  );
  return data.data;
}

export interface CustomTaskPayload {
  title: string;
  scheduledDate: string;
  category: string;
  priority: 'morning' | 'afternoon';
  labourWorkers: number;
  labourHours: number;
  zoneId?: string;
  notes?: string;
}

export async function createCalendarTask(
  farmId: string,
  payload: CustomTaskPayload
): Promise<{ id: string; title: string }> {
  const { data } = await api.post<ApiEnvelope<{ id: string; title: string }>>(
    `/farms/${farmId}/tasks`,
    payload
  );
  return data.data;
}

export async function updateCalendarCustomTask(
  farmId: string,
  taskId: string,
  payload: Partial<CustomTaskPayload>
): Promise<{ id: string; title: string }> {
  const { data } = await api.put<ApiEnvelope<{ id: string; title: string }>>(
    `/farms/${farmId}/tasks/${taskId}/custom`,
    payload
  );
  return data.data;
}

export async function deleteCalendarTask(
  farmId: string,
  taskId: string
): Promise<{ deleted: boolean }> {
  const { data } = await api.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/farms/${farmId}/tasks/${taskId}`
  );
  return data.data;
}

// ─── Market ───────────────────────────────────────────────────────────────────
import type {
  Supply, Demand, Order, OrderBook, BrowseSuppliesResult,
  PlaceOrderPayload, CreateDemandPayload, UpdateDemandPayload, UpdateSupplyPayload,
} from '../types/market';

// Farmer
export async function getMySupplies(): Promise<Supply[]> {
  const { data } = await api.get<ApiEnvelope<Supply[]>>('/market/farmer/supplies');
  return data.data;
}

export async function updateSupply(supplyId: string, body: UpdateSupplyPayload): Promise<Supply> {
  const { data } = await api.patch<ApiEnvelope<Supply>>(`/market/farmer/supplies/${supplyId}`, body);
  return data.data;
}

export async function getDemandAlerts(): Promise<Demand[]> {
  const { data } = await api.get<ApiEnvelope<Demand[]>>('/market/farmer/demand-alerts');
  return data.data;
}

export async function getIncomingOrders(): Promise<Order[]> {
  const { data } = await api.get<ApiEnvelope<Order[]>>('/market/farmer/orders');
  return data.data;
}

export async function updateOrderStatus(orderId: string, status: string, farmerNote?: string): Promise<Order> {
  const { data } = await api.patch<ApiEnvelope<Order>>(`/market/farmer/orders/${orderId}`, { status, farmerNote });
  return data.data;
}

export async function getOrderBook(): Promise<OrderBook> {
  const { data } = await api.get<ApiEnvelope<OrderBook>>('/market/farmer/order-book');
  return data.data;
}

// Customer
export async function browseSupplies(params?: Record<string, string>): Promise<BrowseSuppliesResult> {
  const { data } = await api.get<ApiEnvelope<BrowseSuppliesResult>>('/market/supplies', { params });
  return data.data;
}

export async function placeOrder(payload: PlaceOrderPayload): Promise<Order> {
  const { data } = await api.post<ApiEnvelope<Order>>('/market/orders', payload);
  return data.data;
}

export async function getMyOrders(): Promise<Order[]> {
  const { data } = await api.get<ApiEnvelope<Order[]>>('/market/customer/orders');
  return data.data;
}

export async function cancelMyOrder(orderId: string, reason?: string): Promise<Order> {
  const { data } = await api.patch<ApiEnvelope<Order>>(`/market/customer/orders/${orderId}/cancel`, { reason });
  return data.data;
}

export async function createDemand(payload: CreateDemandPayload): Promise<Demand> {
  const { data } = await api.post<ApiEnvelope<Demand>>('/market/demands', payload);
  return data.data;
}

export async function getMyDemands(): Promise<Demand[]> {
  const { data } = await api.get<ApiEnvelope<Demand[]>>('/market/customer/demands');
  return data.data;
}

export async function updateDemand(demandId: string, body: UpdateDemandPayload): Promise<Demand> {
  const { data } = await api.patch<ApiEnvelope<Demand>>(`/market/customer/demands/${demandId}`, body);
  return data.data;
}

// ─── Expert ───────────────────────────────────────────────────────────────────

export async function getExpertOverview(): Promise<Record<string, unknown>> {
  const { data } = await api.get<ApiEnvelope<Record<string, unknown>>>('/expert/overview');
  return data.data;
}

export async function getExpertFarms(): Promise<unknown[]> {
  const { data } = await api.get<ApiEnvelope<unknown[]>>('/expert/farms');
  return data.data;
}

export async function getExpertSoilReports(params?: Record<string, string>): Promise<unknown[]> {
  const { data } = await api.get<ApiEnvelope<unknown[]>>('/expert/soil-reports', { params });
  return data.data;
}

export async function getExpertCropEconomics(): Promise<unknown[]> {
  const { data } = await api.get<ApiEnvelope<unknown[]>>('/expert/crop-economics');
  return data.data;
}

export async function updateExpertCropEconomics(id: string, body: Record<string, unknown>): Promise<unknown> {
  const { data } = await api.patch<ApiEnvelope<unknown>>(`/expert/crop-economics/${id}`, body);
  return data.data;
}

export async function getExpertCrops(): Promise<unknown[]> {
  const { data } = await api.get<ApiEnvelope<unknown[]>>('/expert/crops');
  return data.data;
}

export async function updateExpertCrop(id: string, body: Record<string, unknown>): Promise<unknown> {
  const { data } = await api.patch<ApiEnvelope<unknown>>(`/expert/crops/${id}`, body);
  return data.data;
}

export async function getExpertAdvisories(): Promise<unknown[]> {
  const { data } = await api.get<ApiEnvelope<unknown[]>>('/expert/advisories');
  return data.data;
}

export async function createExpertAdvisory(body: Record<string, unknown>): Promise<unknown> {
  const { data } = await api.post<ApiEnvelope<unknown>>('/expert/advisories', body);
  return data.data;
}

export async function deleteExpertAdvisory(id: string): Promise<unknown> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(`/expert/advisories/${id}`);
  return data.data;
}

export async function addExpertFarmTask(farmId: string, body: Record<string, unknown>): Promise<unknown> {
  const { data } = await api.post<ApiEnvelope<unknown>>(`/expert/farms/${farmId}/tasks`, body);
  return data.data;
}

export async function getExpertSuggestions(): Promise<unknown[]> {
  const { data } = await api.get<ApiEnvelope<unknown[]>>('/expert/suggestions');
  return data.data;
}

export async function createExpertSuggestion(body: Record<string, unknown>): Promise<unknown> {
  const { data } = await api.post<ApiEnvelope<unknown>>('/expert/suggestions', body);
  return data.data;
}

export async function deleteExpertSuggestion(id: string): Promise<unknown> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(`/expert/suggestions/${id}`);
  return data.data;
}

export async function createExpertCrop(body: Record<string, unknown>): Promise<unknown> {
  const { data } = await api.post<ApiEnvelope<unknown>>('/expert/crops', body);
  return data.data;
}

export async function createExpertCropEconomics(body: Record<string, unknown>): Promise<unknown> {
  const { data } = await api.post<ApiEnvelope<unknown>>('/expert/crop-economics', body);
  return data.data;
}

export async function updateExpertSoilReport(id: string, body: Record<string, unknown>): Promise<unknown> {
  const { data } = await api.patch<ApiEnvelope<unknown>>(`/expert/soil-reports/${id}`, body);
  return data.data;
}

export async function getExpertSoilCropRefs(): Promise<unknown[]> {
  const { data } = await api.get<ApiEnvelope<unknown[]>>('/expert/soil-crop-reference');
  return data.data;
}

export async function createExpertSoilCropRef(body: Record<string, unknown>): Promise<unknown> {
  const { data } = await api.post<ApiEnvelope<unknown>>('/expert/soil-crop-reference', body);
  return data.data;
}

export async function deleteExpertSoilCropRef(id: string): Promise<unknown> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(`/expert/soil-crop-reference/${id}`);
  return data.data;
}

export async function updateExpertFarmFinancials(farmId: string, body: Record<string, unknown>): Promise<unknown> {
  const { data } = await api.patch<ApiEnvelope<unknown>>(`/expert/farms/${farmId}/financials`, body);
  return data.data;
}

export async function getExpertLifecycleTemplates(): Promise<unknown[]> {
  const { data } = await api.get<ApiEnvelope<unknown[]>>('/expert/lifecycle-templates');
  return data.data;
}

export async function createExpertLifecycleTemplate(body: Record<string, unknown>): Promise<unknown> {
  const { data } = await api.post<ApiEnvelope<unknown>>('/expert/lifecycle-templates', body);
  return data.data;
}

export async function updateExpertLifecycleTemplate(id: string, body: Record<string, unknown>): Promise<unknown> {
  const { data } = await api.patch<ApiEnvelope<unknown>>(`/expert/lifecycle-templates/${id}`, body);
  return data.data;
}

export async function deleteExpertLifecycleTemplate(id: string): Promise<unknown> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(`/expert/lifecycle-templates/${id}`);
  return data.data;
}

export async function getFarmerAdvisories(farmId: string): Promise<unknown[]> {
  const { data } = await api.get<ApiEnvelope<unknown[]>>(`/expert/farms/${farmId}/advisories`);
  return data.data;
}

export async function getFarmerSuggestions(farmId: string): Promise<unknown[]> {
  const { data } = await api.get<ApiEnvelope<unknown[]>>(`/expert/farms/${farmId}/suggestions`);
  return data.data;
}

export async function respondToSuggestion(id: string, status: 'ACCEPTED' | 'REJECTED', farmerNote?: string): Promise<unknown> {
  const { data } = await api.patch<ApiEnvelope<unknown>>(`/expert/suggestions/${id}/respond`, { status, farmerNote });
  return data.data;
}

// ─── Farmer-friendly endpoints ─────────────────────────────────────────────────

export interface SimpleTask {
  id: string;
  title: string;
  taskType: string;
  category: string;
  scheduledDate: string;
  priority: string;
  status: string;
  zoneName: string | null;
  recipeKey: string | null;
  cropName: string;
}

export interface ActiveZone {
  zoneId: string;
  zoneName: string;
  farmName: string;
  cropName: string;
  riskLevel: string;
  weeksElapsed: number;
  totalWeeks: number;
  progressPct: number;
  startedAt: string;
  areaBigha: number;
}

export interface AchievementBadge {
  id: string;
  badgeKey: string;
  title: string;
  description: string;
  earnedAt: string;
}

export interface TodayDashboard {
  hasFarm: boolean;
  todayTasks: SimpleTask[];
  weekTasks: SimpleTask[];
  activeZones: ActiveZone[];
  achievements: AchievementBadge[];
}

export interface RecipeIngredient { key: string; label: string; amount: number; unit: string }
export interface RecipeGuide {
  recipeKey: string;
  purpose: string;
  prepTimeHours: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  tips: string[];
  scaledForAcres: number;
}

export interface CropPopularity { cropName: string; farmerCount: number }

export interface DistrictSoilDefaults {
  soilType: string;
  drainageSpeed: string;
  phLevel: number;
  earthwormCount: number;
  sampleSize: number;
  note: string;
}

export interface OnboardingStatus { needsOnboarding: boolean; hasFarm: boolean; experienceLevel: string }

export async function getTodayDashboard(): Promise<TodayDashboard> {
  const { data } = await api.get<ApiEnvelope<TodayDashboard>>('/farmer/today');
  return data.data;
}

export async function getRecipeGuide(recipeKey: string, acres = 1): Promise<RecipeGuide> {
  const { data } = await api.get<ApiEnvelope<RecipeGuide>>(`/farmer/recipe-guide/${recipeKey}?acres=${acres}`);
  return data.data;
}

export async function getCropPopularity(district: string): Promise<CropPopularity[]> {
  const { data } = await api.get<ApiEnvelope<CropPopularity[]>>(`/farmer/crop-popularity/${encodeURIComponent(district)}`);
  return data.data;
}

export async function getDistrictSoilDefaults(district: string): Promise<DistrictSoilDefaults | null> {
  const { data } = await api.get<ApiEnvelope<DistrictSoilDefaults | null>>(`/farmer/district-defaults/${encodeURIComponent(district)}`);
  return data.data;
}

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const { data } = await api.get<ApiEnvelope<OnboardingStatus>>('/farmer/onboarding-status');
  return data.data;
}

export async function completeOnboarding(experienceLevel: 'New' | 'Some' | 'Expert'): Promise<unknown> {
  const { data } = await api.post<ApiEnvelope<unknown>>('/farmer/onboarding-complete', { experienceLevel });
  return data.data;
}

export async function reportIssue(payload: { farmId: string; zoneId?: string; title: string; description: string; symptom?: string; photoUrl?: string }): Promise<{ issue: unknown; suggestion: string }> {
  const { data } = await api.post<ApiEnvelope<{ issue: unknown; suggestion: string }>>('/farmer/issues', payload);
  return data.data;
}

export async function listIssues(): Promise<unknown[]> {
  const { data } = await api.get<ApiEnvelope<unknown[]>>('/farmer/issues');
  return data.data;
}

export async function askQuestion(question: string, category = 'general'): Promise<unknown> {
  const { data } = await api.post<ApiEnvelope<unknown>>('/farmer/questions', { question, category });
  return data.data;
}

export async function listMyQuestions(): Promise<unknown[]> {
  const { data } = await api.get<ApiEnvelope<unknown[]>>('/farmer/questions');
  return data.data;
}

export async function addZonePhoto(payload: { zoneId: string; photoUrl: string; caption?: string }): Promise<unknown> {
  const { data } = await api.post<ApiEnvelope<unknown>>('/farmer/photos', payload);
  return data.data;
}

export async function listZonePhotos(zoneId: string): Promise<Array<{ id: string; photoUrl: string; caption: string | null; weekIntoSeason: number | null; createdAt: string }>> {
  const { data } = await api.get<ApiEnvelope<Array<{ id: string; photoUrl: string; caption: string | null; weekIntoSeason: number | null; createdAt: string }>>>(`/farmer/zones/${zoneId}/photos`);
  return data.data;
}

export async function getMyAchievements(): Promise<AchievementBadge[]> {
  const { data } = await api.get<ApiEnvelope<AchievementBadge[]>>('/farmer/achievements');
  return data.data;
}

// ─── Intelligence layer (yields, companions, alerts, mandi, schemes, etc.) ───

export interface HarvestRecord { id: string; cropName: string; varietyName: string | null; yieldKg: number; pricePerKg: number | null; totalRevenue: number | null; netProfit: number | null; harvestedAt: string; notes: string | null }
export interface CropPairing   { id: string; primaryCrop: string; companionCrop: string; benefit: string; rowRatio: string | null; spacingNotes: string | null }
export interface CoverCrop     { id: string; name: string; durationWeeks: number; nitrogenFixedKgPerAcre: number; bestForSeason: string; description: string; preparationNotes: string | null }
export interface CropVariety   { id: string; cropName: string; varietyName: string; recommendedFor: string[]; yieldPotential: number | null; durationDays: number | null; pestResistance: string | null; notes: string | null }
export interface WeatherAlertItem { farmId: string; farmName: string; severity: string; title: string; message: string }
export interface PestAlertItem    { id: string; district: string; pestName: string; reportCount: number; lastReportedAt: string }
export interface MandiPriceRow    { id: string; cropName: string; district: string; pricePerQuintal: number; msp: number | null; recordedAt: string }
export interface GovSchemeItem    { id: string; schemeName: string; category: string; benefitSummary: string; eligibilityNotes: string; applyUrl: string | null }
export interface SeasonGoalItem   { id: string; season: string; cropName: string; targetRevenue: number; targetYieldKg: number | null; feasibilityScore: number | null; feasibilityNotes: string | null; achieved: boolean; createdAt: string }
export interface PreSeasonTaskItem{ id: string; cropName: string; title: string; category: string; dueDate: string; isDone: boolean; notes: string | null }
export interface KnowledgeArticleItem { id: string; title: string; body: string; category: string; tags: string[]; createdAt: string }
export interface BuyGroupItem     { id: string; district: string; itemName: string; totalQuantity: number; unit: string; pricePerUnit: number | null; contactPhone: string | null; organiserName: string | null; status: string; closesAt: string | null; createdAt: string }
export interface EquipmentItem    { id: string; equipmentType: string; district: string; hourlyRate: number | null; dailyRate: number | null; contactPhone: string | null; notes: string | null; createdAt: string }
export interface ComplianceScore  { score: number | null; totalDue: number; completed: number }
export interface DroughtContingency { hasShortfall: boolean; weeksOfWater?: number; weeksRemaining?: number; deficitWeeks?: number; suggestions?: string[] }
export interface YearStat         { year: number; totalYieldKg: number; totalRevenue: number; totalProfit: number; harvests: number }

const wrap = <T,>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

export const recordHarvest      = (b: { zoneId: string; cropName: string; varietyName?: string; yieldKg: number; pricePerKg?: number; totalCost?: number; notes?: string }) => wrap<HarvestRecord>(api.post('/intel/harvests', b));
export const getZoneHarvests    = (zoneId: string) => wrap<HarvestRecord[]>(api.get(`/intel/zones/${zoneId}/harvests`));
export const getYieldNorms      = (cropName: string, district: string) => wrap<{ avgYieldKgPerAcre: number; sampleCount: number } | null>(api.get(`/intel/yield-norms/${cropName}?district=${encodeURIComponent(district)}`));
export const getSoilTrend       = (zoneId: string) => wrap<{ currentSoilReport: unknown; harvestTimeline: Array<{ yieldKg: number; harvestedAt: string; cropName: string }>; note: string }>(api.get(`/intel/zones/${zoneId}/soil-trend`));
export const getYearComparison  = (zoneId: string) => wrap<YearStat[]>(api.get(`/intel/zones/${zoneId}/year-comparison`));
export const getSeasonReport    = (zoneId: string) => wrap<{ farm: { name: string; district: string }; zone: { id: string; name: string; areaBigha: number }; soilReport: unknown; crop: { cropName: string } | null; harvest: HarvestRecord | null; compliance: number; tasksTotal: number; tasksCompleted: number; issuesCount: number; photos: Array<{ photoUrl: string; caption: string | null }>; generatedAt: string }>(api.get(`/intel/zones/${zoneId}/season-report`));
export const getCompanions      = (cropName: string) => wrap<CropPairing[]>(api.get(`/intel/companions/${cropName}`));
export const getCoverCrops      = (afterSeason: string) => wrap<CoverCrop[]>(api.get(`/intel/cover-crops?afterSeason=${afterSeason}`));
export const getVarieties       = (cropName: string, district = '') => wrap<CropVariety[]>(api.get(`/intel/varieties/${cropName}?district=${encodeURIComponent(district)}`));
export const getWeatherAlerts   = () => wrap<WeatherAlertItem[]>(api.get('/intel/weather-alerts'));
export const getPestAlerts      = () => wrap<PestAlertItem[]>(api.get('/intel/pest-alerts'));
export const generateChecklist  = (b: { zoneId?: string; cropName: string; plantingDate: string }) => wrap<PreSeasonTaskItem[]>(api.post('/intel/checklist/generate', b));
export const listChecklist      = () => wrap<PreSeasonTaskItem[]>(api.get('/intel/checklist'));
export const toggleChecklist    = (id: string, isDone: boolean) => wrap<PreSeasonTaskItem>(api.patch(`/intel/checklist/${id}`, { isDone }));
export const getMandiPrices     = (cropName?: string, district?: string) => wrap<MandiPriceRow[]>(api.get(`/intel/mandi-prices?${cropName ? `cropName=${cropName}&` : ''}${district ? `district=${district}` : ''}`));
export const upsertMandiPrice   = (b: { cropName: string; district: string; pricePerQuintal: number; msp?: number }) => wrap<MandiPriceRow>(api.post('/intel/mandi-prices', b));
export const getGovSchemes      = (category?: string) => wrap<GovSchemeItem[]>(api.get(`/intel/gov-schemes${category ? `?category=${category}` : ''}`));
export const recordCheckIn      = (b: { zoneId: string; pestSeen?: boolean; leavesHealthy?: boolean; soilMoist?: boolean; notes?: string; photoUrl?: string }) => wrap<unknown>(api.post('/intel/check-in', b));
export const setSeasonGoal      = (b: { season: string; cropName: string; targetRevenue: number; targetYieldKg?: number }) => wrap<SeasonGoalItem>(api.post('/intel/goals', b));
export const listSeasonGoals    = () => wrap<SeasonGoalItem[]>(api.get('/intel/goals'));
export const listKnowledge      = (category?: string, q?: string) => wrap<KnowledgeArticleItem[]>(api.get(`/intel/knowledge?${category ? `category=${category}&` : ''}${q ? `q=${encodeURIComponent(q)}` : ''}`));
export const createBuyGroup     = (b: { district: string; itemName: string; totalQuantity: number; unit: string; pricePerUnit?: number; contactPhone?: string; closesAt?: string }) => wrap<BuyGroupItem>(api.post('/intel/buy-groups', b));
export const listBuyGroups      = () => wrap<BuyGroupItem[]>(api.get('/intel/buy-groups'));
export const createEquipment    = (b: { equipmentType: string; district: string; hourlyRate?: number; dailyRate?: number; contactPhone?: string; notes?: string }) => wrap<EquipmentItem>(api.post('/intel/equipment', b));
export const listEquipment      = () => wrap<EquipmentItem[]>(api.get('/intel/equipment'));
export const getCompliance      = () => wrap<ComplianceScore>(api.get('/intel/compliance'));
export const getDroughtContingency = (farmId: string) => wrap<DroughtContingency>(api.get(`/intel/farms/${farmId}/drought`));

// New: soil history, border crops, sowing batches
export interface SoilSnapshot { id: string; phLevel: number; earthwormCount: number; soilHealthScore: number; soilType: string; drainageSpeed: string; recordedAt: string }
export interface BorderCropItem { id: string; primaryCrop: string; borderCrop: string; purpose: string; notes: string | null }
export interface SowingBatchItem { id: string; zoneId: string; batchNumber: number; cropName: string; plannedSowDate: string; actualSowDate: string | null; notes: string | null }

export const getSoilHistory     = (zoneId: string) => wrap<SoilSnapshot[]>(api.get(`/intel/zones/${zoneId}/soil-history`));
export const getBorderCrops     = (cropName: string) => wrap<BorderCropItem[]>(api.get(`/intel/border-crops/${cropName}`));
export const getCropMetadata    = (cropName: string) => wrap<{ name: string; scientificName: string | null; season: string; estimatedDurationMonths: number; seedKgPerAcre: number; spacingNotes: string | null; riskLevel: string; cropFamily: string; plantingWindowStart: number; plantingWindowEnd: number } | null>(api.get(`/intel/crop/${cropName}`));
export const createSowingBatches = (b: { zoneId: string; cropName: string; batchCount: number; intervalWeeks?: number; firstSowDate: string }) => wrap<SowingBatchItem[]>(api.post('/intel/sowing-batches', b));
export const listSowingBatches  = (zoneId: string) => wrap<SowingBatchItem[]>(api.get(`/intel/zones/${zoneId}/sowing-batches`));
export const updateSowingBatch  = (id: string, b: { actualSowDate?: string | null; notes?: string }) => wrap<SowingBatchItem>(api.patch(`/intel/sowing-batches/${id}`, b));

// ─── Expert catalogue management ──────────────────────────────────────────────

export type CatalogueKind = 'gov-schemes' | 'crop-pairings' | 'cover-crops' | 'varieties' | 'mandi-prices' | 'knowledge' | 'pest-alerts' | 'border-crops';

export const listCatalogue   = <T,>(kind: CatalogueKind) => wrap<T[]>(api.get(`/expert/catalogues/${kind}`));
export const createInCatalogue = <T,>(kind: CatalogueKind, body: unknown) => wrap<T>(api.post(`/expert/catalogues/${kind}`, body));
export const patchInCatalogue  = <T,>(kind: CatalogueKind, id: string, body: unknown) => wrap<T>(api.patch(`/expert/catalogues/${kind}/${id}`, body));
export const deleteFromCatalogue = (kind: CatalogueKind, id: string) => wrap<{ deleted: boolean }>(api.delete(`/expert/catalogues/${kind}/${id}`));

export const listFarmerQuestions = () => wrap<Array<{ id: string; question: string; answer: string | null; answeredAt: string | null; category: string; createdAt: string; farmer: { user: { name: string } } }>>(api.get('/expert/farmer-questions'));
export const answerFarmerQuestion = (id: string, answer: string) => wrap<unknown>(api.patch(`/expert/farmer-questions/${id}/answer`, { answer }));

export interface SymptomSuggestionItem { id: string; symptom: string; label: string; suggestion: string; updatedAt: string }
export const listSymptomSuggestions  = () => wrap<SymptomSuggestionItem[]>(api.get('/expert/symptom-suggestions'));
export const patchSymptomSuggestion  = (symptom: string, body: { suggestion: string; label?: string }) => wrap<SymptomSuggestionItem>(api.patch(`/expert/symptom-suggestions/${symptom}`, body));

export interface EconomicsConfig {
  landLayoutCostPerAcre: number; dripIrrigationCostPerAcre: number;
  solarDryerCostFlat: number; annualLabourCost: number;
  labourRatePerHour: number; jeevamritHomemade: boolean;
}
export interface FarmFinancials {
  landLayoutCost: number | null; dripIrrigationCost: number | null;
  solarDryerCost: number | null; annualLabourCost: number | null;
  labourRatePerHour: number | null; jeevamritHomemade: boolean;
}
export const getEconomicsConfig   = () => wrap<EconomicsConfig>(api.get('/expert/economics-config'));
export const updateEconomicsConfig = (body: Partial<EconomicsConfig>) => wrap<EconomicsConfig>(api.patch('/expert/economics-config', body));
export const getFarmFinancials    = (farmId: string) => wrap<{ farmFinancials: FarmFinancials | null; globalConfig: EconomicsConfig }>(api.get(`/farms/${farmId}/economics/financials`));
export const saveFarmFinancials   = (farmId: string, body: Partial<FarmFinancials>) => wrap<FarmFinancials>(api.put(`/farms/${farmId}/economics/financials`, body));

export const saveVarietyToAssignment = (zoneId: string, varietyName: string) =>
  wrap<{ varietyName: string | null }>(api.patch(`/intel/zones/${zoneId}/variety`, { varietyName }));

export default api;
