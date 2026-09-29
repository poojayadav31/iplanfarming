// ─── Sub-types ────────────────────────────────────────────────────────────────

export interface RevenueSlice {
  raw: number;
  valueAdded: number;
}

export interface OpExYear {
  seeds: number;
  labour: number;
  naturalInputs: number;
  total: number;
}

export interface CropBreakdownItem {
  cropName: string;
  season: string;
  durationMonths: number;
  seedCost: number;
  rawSalePricePerKg: number;
  processedSalePricePerKg: number;
  year1Revenue: RevenueSlice;
  year2Revenue: RevenueSlice;
}

/** Data point for the Recharts Donut (PieChart) */
export interface ExpenseDistributionItem {
  category: string;
  amount: number;
  percentage: number;
}

/** Data point for the Recharts multi-year Bar Chart */
export interface CashFlowDataPoint {
  year: string;
  totalCost: number;
  rawRevenue: number;
  valueAddedRevenue: number;
  rawProfit: number;
  valueAddedProfit: number;
}

// ─── Top-level response ────────────────────────────────────────────────────────

export interface FarmEconomicsResponse {
  farmId: string;
  farmName: string;
  areaAcres: number;

  capex: {
    landLayout: number;
    dripIrrigation: number;
    solarDryer: number;
    total: number;
  };

  opex: {
    year1: OpExYear;
    year2: OpExYear;
  };

  revenue: {
    year1: RevenueSlice;
    year2: RevenueSlice;
  };

  profitLoss: {
    year1: RevenueSlice;
    year2: RevenueSlice;
  };

  naturalFarmingSavings: {
    chemicalCost: number;
    naturalCost: number;
    savings: number;
    jeevamritHomemade: boolean;
  };

  cropBreakdown: CropBreakdownItem[];
  expenseDistribution: ExpenseDistributionItem[];
  cashFlowChart: CashFlowDataPoint[];
}

// ─── Weekly Economics ──────────────────────────────────────────────────────────

export interface WeeklyIngredient {
  label: string;
  amount: number;
  unit: string;
}

export interface WeeklyActivity {
  id: string;
  title: string;
  taskType: string;
  category: string;
  scheduledDate: string;
  priority: 'morning' | 'afternoon';
  labourWorkers: number;
  labourHours: number;
  labourCost: number;
  recipeKey: string | null;
  ingredients: WeeklyIngredient[];
  inputCost: number;
  revenue: number;
  zoneId: string | null;
  zoneName: string;
  zoneNumber: number | null;
  cropName: string;
  isCustom: boolean;
}

export interface WeekSummary {
  weekIndex: number;
  weekStart: string;
  weekEnd: string;
  totalCost: number;
  labourCost: number;
  inputCost: number;
  revenue: number;
  netProfit: number;
  taskCount: number;
  activities: WeeklyActivity[];
}

export interface WeeklyEconomicsResponse {
  farmId: string;
  farmName: string;
  currentWeek: string;
  weeks: WeekSummary[];
}
