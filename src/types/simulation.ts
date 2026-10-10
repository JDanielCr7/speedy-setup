// MotoClean Analytics — Tipos del Simulador de escenarios.
// Simulación matemática determinista (no es machine learning).

import type { DayBucket } from "@/services/analyticsService";

export type Horizon = "7" | "30" | "90" | "custom";
export type DemandSource = "manual" | "historical" | "trend";
export type Frequency = "daily" | "weekly" | "monthly";
export type ClimatePreset = "normal" | "sunny" | "cloudy" | "rainy" | "manual";

export interface ServiceMixItem {
  service: string;
  sharePct: number;
  price: number;
}

export interface FixedCostItem {
  key: string;
  label: string;
  amount: number;
  frequency: Frequency;
}

export interface SimulationParameters {
  horizon: Horizon;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  demandSource: DemandSource;
  washesPerDay: number;
  operatingDaysPerWeek: number;
  washers: number;
  capacityPerWasher: number;
  cancellationPct: number;
  growthPct: number;
  avgPrice: number;
  discountPct: number;
  useServiceMix: boolean;
  serviceMix: ServiceMixItem[];
  variableCosts: {
    supplies: number;
    transport: number;
    utilities: number;
    labor: number;
    other: number;
  };
  fixedCosts: FixedCostItem[];
  investment: {
    initial: number;
    equipment: number;
    tools: number;
    workingCapital: number;
    other: number;
  };
  climate: {
    preset: ClimatePreset;
    sunnyPct: number;
    cloudyPct: number;
    rainyPct: number;
    // Supuestos del usuario: variación % de la demanda en cada tipo de día.
    sunnyEffectPct: number;
    cloudyEffectPct: number;
    rainyEffectPct: number;
  };
}

/** Variaciones aplicadas sobre los parámetros base (escenarios y sensibilidad). */
export interface ScenarioDelta {
  demandPct: number;
  pricePct: number;
  variableCostPct: number;
  fixedCostPct: number;
  cancellationPp: number;
  climatePp: number;
  rainyShiftPp: number;
}

export interface CumulativePoint {
  months: number;
  operatingProfit: number;
  netOfInvestment: number;
}

export interface SimulationResults {
  horizonDays: number;
  operatingDays: number;
  washesPerOperatingDay: number;
  baseDemand: number;
  climateAdjustmentPct: number;
  adjustedDemand: number;
  effectiveWashes: number;
  capacity: number;
  servedWashes: number;
  unmetDemand: number;
  grossPrice: number;
  effectivePrice: number;
  revenue: number;
  variableCostPerWash: number;
  variableCosts: number;
  fixedCosts: number;
  operatingCosts: number;
  operatingProfit: number;
  operatingMarginPct: number | null;
  contributionMargin: number;
  breakEvenWashes: number | null;
  totalInvestment: number;
  roiPct: number | null;
  monthlyProfit: number;
  paybackMonths: number | null;
  cumulative: CumulativePoint[];
  dailyProjection: DayBucket[];
  warnings: string[];
}

export interface HistoricalBaseline {
  recordCount: number;
  firstDate: string | null;
  lastDate: string | null;
  spanDays: number;
  activeDays: number;
  avgPerActiveDay: number;
  avgPerCalendarDay: number;
  avgDailyRevenue: number;
  avgPrice: number;
  avgCost: number;
  avgProfit: number;
  byWeekday: DayBucket[];
  byHour: DayBucket[];
  priceByService: { service: string; avg: number; count: number }[];
  byWeather: { condition: string; count: number; days: number; avgPerDay: number }[];
  climateGroups: {
    group: "sunny" | "cloudy" | "rainy";
    days: number;
    count: number;
    effectPct: number | null;
  }[];
  trend: { slope: number; intercept: number; n: number } | null;
  dataVersion: string;
  warnings: string[];
}

export interface SensitivityResult {
  variable: SensitivityVariable;
  label: string;
  change: number;
  baseRevenue: number;
  newRevenue: number;
  baseProfit: number;
  newProfit: number;
  absDiff: number;
  pctDiff: number | null;
  baseBreakEven: number | null;
  newBreakEven: number | null;
}

export type SensitivityVariable =
  | "demand"
  | "price"
  | "variableCost"
  | "fixedCost"
  | "cancellation"
  | "rainyDays";

export interface ScenarioSet {
  pessimistic: ScenarioDelta;
  optimistic: ScenarioDelta;
}

export interface SimulationScenario {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  horizonDays: number;
  params: SimulationParameters;
  deltas: ScenarioSet;
  results: SimulationResults;
  dataVersion: string;
}
