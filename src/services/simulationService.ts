// Motor matemático del Simulador de escenarios.
// Independiente de la interfaz: recibe parámetros y devuelve resultados.
// En el futuro puede reemplazarse por una llamada a una API de Python
// (POST /simulations) que devuelva el mismo tipo SimulationResults.

import type { DayBucket } from "@/services/analyticsService";
import type {
  ClimatePreset,
  HistoricalBaseline,
  ScenarioDelta,
  SensitivityResult,
  SensitivityVariable,
  SimulationParameters,
  SimulationResults,
  FixedCostItem,
} from "@/types/simulation";
import type { WashingRecord } from "@/types/washingRecord";
import { SERVICE_TYPES } from "@/types/washingRecord";

export const ZERO_DELTA: ScenarioDelta = {
  demandPct: 0,
  pricePct: 0,
  variableCostPct: 0,
  fixedCostPct: 0,
  cancellationPp: 0,
  climatePp: 0,
  rainyShiftPp: 0,
};

export const CLIMATE_PRESETS: Record<
  Exclude<ClimatePreset, "manual">,
  { sunny: number; cloudy: number; rainy: number; label: string }
> = {
  normal: { sunny: 50, cloudy: 30, rainy: 20, label: "Normal" },
  sunny: { sunny: 70, cloudy: 20, rainy: 10, label: "Predominio soleado" },
  cloudy: { sunny: 20, cloudy: 60, rainy: 20, label: "Predominio nublado" },
  rainy: { sunny: 15, cloudy: 25, rainy: 60, label: "Predominio de lluvias" },
};

const clamp = (v: number, min: number, max: number) =>
  Number.isFinite(v) ? Math.min(Math.max(v, min), max) : min;
const nonNeg = (v: number) => (Number.isFinite(v) ? Math.max(v, 0) : 0);

function todayISO(): string {
  const d = new Date();
  return toISO(d);
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseISO(s: string): Date {
  const [y = 1970, m = 1, d = 1] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(s: string, n: number): string {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
function diffDays(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);
}

export function defaultParameters(): SimulationParameters {
  const start = addDays(todayISO(), 1);
  const prices = [15000, 25000, 35000, 45000, 20000];
  const shares = [40, 25, 20, 10, 5];
  return {
    horizon: "30",
    startDate: start,
    endDate: addDays(start, 29),
    demandSource: "manual",
    washesPerDay: 8,
    operatingDaysPerWeek: 6,
    washers: 2,
    capacityPerWasher: 6,
    cancellationPct: 5,
    growthPct: 0,
    avgPrice: 25000,
    discountPct: 0,
    useServiceMix: false,
    serviceMix: SERVICE_TYPES.map((service, i) => ({
      service,
      sharePct: shares[i] ?? 0,
      price: prices[i] ?? 0,
    })),
    variableCosts: { supplies: 3000, transport: 2500, utilities: 800, labor: 6000, other: 500 },
    fixedCosts: [
      { key: "salaries", label: "Sueldos fijos", amount: 1300000, frequency: "monthly" },
      { key: "rent", label: "Arriendo o almacenamiento", amount: 300000, frequency: "monthly" },
      { key: "ads", label: "Publicidad", amount: 200000, frequency: "monthly" },
      { key: "phone", label: "Telefonía y software", amount: 80000, frequency: "monthly" },
      { key: "maintenance", label: "Mantenimiento de equipos", amount: 50000, frequency: "monthly" },
      { key: "other", label: "Otros costos fijos", amount: 0, frequency: "monthly" },
    ],
    investment: { initial: 0, equipment: 2500000, tools: 600000, workingCapital: 1000000, other: 0 },
    climate: {
      preset: "normal",
      sunnyPct: 50,
      cloudyPct: 30,
      rainyPct: 20,
      sunnyEffectPct: 0,
      cloudyEffectPct: 0,
      rainyEffectPct: 0,
    },
  };
}

export function horizonDays(p: SimulationParameters): number {
  if (p.horizon === "custom") {
    return clamp(diffDays(p.startDate, p.endDate) + 1, 1, 730);
  }
  return Number(p.horizon);
}

export function fixedCostForPeriod(item: FixedCostItem, days: number): number {
  const a = nonNeg(item.amount);
  if (item.frequency === "daily") return a * days;
  if (item.frequency === "weekly") return (a * days) / 7;
  return (a * days) / 30; // mensual = 30 días
}

/** Validación: devuelve mensajes comprensibles (vacío = válido). */
export function validateParameters(p: SimulationParameters): string[] {
  const e: string[] = [];
  const pct = (v: number, name: string) => {
    if (!Number.isFinite(v) || v < 0 || v > 100) e.push(`${name} debe estar entre 0 % y 100 %.`);
  };
  if (!Number.isInteger(p.washesPerDay) || p.washesPerDay < 0)
    e.push("Los lavados esperados por día deben ser un entero no negativo.");
  if (p.operatingDaysPerWeek < 0 || p.operatingDaysPerWeek > 7)
    e.push("Los días de operación por semana deben estar entre 0 y 7.");
  if (p.washers < 0 || p.capacityPerWasher < 0) e.push("La capacidad no puede ser negativa.");
  pct(p.cancellationPct, "El porcentaje de cancelaciones");
  pct(p.discountPct, "El descuento");
  if (p.growthPct < -100) e.push("El crecimiento no puede ser inferior a −100 %.");
  if (p.avgPrice < 0) e.push("El precio no puede ser negativo.");
  if (Object.values(p.variableCosts).some((v) => v < 0)) e.push("Los costos variables no pueden ser negativos.");
  if (p.fixedCosts.some((f) => f.amount < 0)) e.push("Los costos fijos no pueden ser negativos.");
  if (Object.values(p.investment).some((v) => v < 0)) e.push("La inversión no puede ser negativa.");
  if (p.useServiceMix) {
    const sum = p.serviceMix.reduce((s, m) => s + m.sharePct, 0);
    if (Math.abs(sum - 100) > 0.01) e.push(`La mezcla de servicios suma ${sum} %; debe sumar 100 %.`);
    if (p.serviceMix.some((m) => m.price < 0 || m.sharePct < 0)) e.push("La mezcla de servicios tiene valores negativos.");
  }
  if (p.climate.preset === "manual") {
    const sum = p.climate.sunnyPct + p.climate.cloudyPct + p.climate.rainyPct;
    if (Math.abs(sum - 100) > 0.01) e.push(`La proporción climática suma ${sum} %; debe sumar 100 %.`);
  }
  if (p.horizon === "custom" && diffDays(p.startDate, p.endDate) < 0)
    e.push("La fecha final debe ser posterior a la inicial.");
  return e;
}

export function climateShares(p: SimulationParameters) {
  if (p.climate.preset === "manual")
    return { sunny: p.climate.sunnyPct, cloudy: p.climate.cloudyPct, rainy: p.climate.rainyPct };
  const c = CLIMATE_PRESETS[p.climate.preset];
  return { sunny: c.sunny, cloudy: c.cloudy, rainy: c.rainy };
}

/** Desplaza puntos porcentuales de días soleados/nublados hacia lluviosos. */
function shiftRain(s: { sunny: number; cloudy: number; rainy: number }, pp: number) {
  let { sunny, cloudy, rainy } = s;
  if (pp > 0) {
    const fromSunny = Math.min(sunny, pp);
    sunny -= fromSunny;
    const fromCloudy = Math.min(cloudy, pp - fromSunny);
    cloudy -= fromCloudy;
    rainy += fromSunny + fromCloudy;
  } else if (pp < 0) {
    const moved = Math.min(rainy, -pp);
    rainy -= moved;
    sunny += moved;
  }
  return { sunny, cloudy, rainy };
}

/** Lavados por día de operación según la fuente de demanda elegida. */
export function resolveWashesPerDay(
  p: SimulationParameters,
  baseline: HistoricalBaseline | null,
  days: number,
): number {
  if (p.demandSource === "historical" && baseline && baseline.activeDays > 0) {
    return baseline.avgPerActiveDay;
  }
  if (p.demandSource === "trend" && baseline?.trend && baseline.activeDays > 0) {
    const { slope, intercept, n } = baseline.trend;
    let sum = 0;
    for (let k = 1; k <= days; k++) sum += Math.max(0, intercept + slope * (n - 1 + k));
    const perCalendarDay = sum / days;
    // La regresión incluye días sin registro como 0: se reescala a días con actividad.
    return perCalendarDay * (baseline.spanDays / baseline.activeDays);
  }
  return nonNeg(p.washesPerDay);
}

export function simulate(
  p: SimulationParameters,
  baseline: HistoricalBaseline | null = null,
  delta: ScenarioDelta = ZERO_DELTA,
): SimulationResults {
  const warnings: string[] = [];
  const days = horizonDays(p);
  const opPerWeek = clamp(p.operatingDaysPerWeek, 0, 7);
  const operatingDays = Math.round((days * opPerWeek) / 7);

  // A. Demanda
  const wpd = resolveWashesPerDay(p, baseline, days) * Math.max(0, 1 + delta.demandPct / 100);
  if (p.demandSource !== "manual" && (!baseline || baseline.activeDays === 0))
    warnings.push("No hay datos históricos: se usan los lavados por día manuales.");
  if (p.demandSource === "trend" && baseline && !baseline.trend)
    warnings.push("Datos insuficientes para la tendencia: se usan los lavados por día manuales.");
  const baseDemand = wpd * operatingDays;

  const shares = shiftRain(climateShares(p), delta.rainyShiftPp);
  const climateAdjustmentPct =
    (shares.sunny * p.climate.sunnyEffectPct +
      shares.cloudy * p.climate.cloudyEffectPct +
      shares.rainy * p.climate.rainyEffectPct) /
      100 +
    delta.climatePp;

  const growth = Math.max(-100, p.growthPct);
  const adjustedDemand = Math.max(
    0,
    Math.round(baseDemand * (1 + growth / 100) * (1 + climateAdjustmentPct / 100)),
  );
  const cancel = clamp(p.cancellationPct + delta.cancellationPp, 0, 100);
  const effectiveWashes = Math.round(adjustedDemand * (1 - cancel / 100));
  const capacity = Math.round(nonNeg(p.washers) * nonNeg(p.capacityPerWasher) * operatingDays);
  const servedWashes = Math.min(effectiveWashes, capacity);
  const unmetDemand = effectiveWashes - servedWashes;
  if (unmetDemand > 0)
    warnings.push(
      `La demanda supera la capacidad: ${unmetDemand} lavados no podrían atenderse con ${p.washers} lavador(es).`,
    );

  // B. Ingresos
  let grossPrice = nonNeg(p.avgPrice);
  if (p.useServiceMix) {
    const totalShare = p.serviceMix.reduce((s, m) => s + nonNeg(m.sharePct), 0);
    grossPrice =
      totalShare > 0
        ? p.serviceMix.reduce((s, m) => s + nonNeg(m.sharePct) * nonNeg(m.price), 0) / totalShare
        : 0;
  }
  grossPrice *= Math.max(0, 1 + delta.pricePct / 100);
  const effectivePrice = grossPrice * (1 - clamp(p.discountPct, 0, 100) / 100);
  const revenue = servedWashes * effectivePrice;

  // C–E. Costos y utilidad
  const vc = p.variableCosts;
  const variableCostPerWash =
    (nonNeg(vc.supplies) + nonNeg(vc.transport) + nonNeg(vc.utilities) + nonNeg(vc.labor) + nonNeg(vc.other)) *
    Math.max(0, 1 + delta.variableCostPct / 100);
  const variableCosts = servedWashes * variableCostPerWash;
  const fixedCosts =
    p.fixedCosts.reduce((s, f) => s + fixedCostForPeriod(f, days), 0) *
    Math.max(0, 1 + delta.fixedCostPct / 100);
  const operatingCosts = variableCosts + fixedCosts;
  const operatingProfit = revenue - operatingCosts;
  const operatingMarginPct = revenue > 0 ? (operatingProfit / revenue) * 100 : null;

  // G. Punto de equilibrio
  const contributionMargin = effectivePrice - variableCostPerWash;
  const breakEvenWashes = contributionMargin > 0 ? Math.ceil(fixedCosts / contributionMargin) : null;
  if (contributionMargin <= 0)
    warnings.push("El precio efectivo no cubre el costo variable: no se alcanza el punto de equilibrio.");

  // H–I. ROI y recuperación
  const inv = p.investment;
  const totalInvestment =
    nonNeg(inv.initial) + nonNeg(inv.equipment) + nonNeg(inv.tools) + nonNeg(inv.workingCapital) + nonNeg(inv.other);
  const roiPct = totalInvestment > 0 ? (operatingProfit / totalInvestment) * 100 : null;
  const monthlyProfit = days > 0 ? (operatingProfit / days) * 30 : 0;
  const paybackMonths = totalInvestment > 0 && monthlyProfit > 0 ? totalInvestment / monthlyProfit : null;
  const cumulative = [1, 3, 6, 12, 24].map((months) => ({
    months,
    operatingProfit: monthlyProfit * months,
    netOfInvestment: monthlyProfit * months - totalInvestment, // la inversión se resta una sola vez
  }));

  // Distribución diaria de los lavados atendidos (días de operación repartidos uniformemente).
  const dailyProjection: DayBucket[] = [];
  const opFlags: boolean[] = [];
  for (let i = 0; i < days; i++) opFlags.push(Math.floor(((i + 1) * operatingDays) / days) > Math.floor((i * operatingDays) / days));
  let assigned = 0;
  let opSeen = 0;
  const start = p.horizon === "custom" ? p.startDate : addDays(todayISO(), 1);
  for (let i = 0; i < days; i++) {
    let v = 0;
    if (opFlags[i]) {
      opSeen++;
      const target = Math.round((servedWashes * opSeen) / Math.max(operatingDays, 1));
      v = target - assigned;
      assigned = target;
    }
    dailyProjection.push({ label: addDays(start, i).slice(5), value: v });
  }

  return {
    horizonDays: days,
    operatingDays,
    washesPerOperatingDay: wpd,
    baseDemand,
    climateAdjustmentPct,
    adjustedDemand,
    effectiveWashes,
    capacity,
    servedWashes,
    unmetDemand,
    grossPrice,
    effectivePrice,
    revenue,
    variableCostPerWash,
    variableCosts,
    fixedCosts,
    operatingCosts,
    operatingProfit,
    operatingMarginPct,
    contributionMargin,
    breakEvenWashes,
    totalInvestment,
    roiPct,
    monthlyProfit,
    paybackMonths,
    cumulative,
    dailyProjection,
    warnings,
  };
}

// ---------- Referencia histórica ----------

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
function weatherGroup(c: string): "sunny" | "cloudy" | "rainy" | null {
  if (c === "Soleado") return "sunny";
  if (c === "Nublado" || c === "Parcialmente nublado") return "cloudy";
  if (c.startsWith("Lluvia")) return "rainy";
  return null;
}

export function buildBaseline(records: WashingRecord[]): HistoricalBaseline {
  const warnings: string[] = [];
  const n = records.length;
  const dates = [...new Set(records.map((r) => r.date))].sort();
  const firstDate = dates[0] ?? null;
  const lastDate = dates[dates.length - 1] ?? null;
  const spanDays = firstDate && lastDate ? diffDays(firstDate, lastDate) + 1 : 0;
  const activeDays = dates.length;
  const perDay = new Map<string, number>();
  for (const r of records) perDay.set(r.date, (perDay.get(r.date) ?? 0) + 1);
  const revenue = records.reduce((s, r) => s + r.price, 0);

  // Promedio por día de la semana (sobre días con registros).
  const wdCount = Array(7).fill(0) as number[];
  const wdDays = Array(7).fill(0) as number[];
  for (const [d, c] of perDay) {
    const w = parseISO(d).getDay();
    wdCount[w] = (wdCount[w] ?? 0) + c;
    wdDays[w] = (wdDays[w] ?? 0) + 1;
  }
  const order = [1, 2, 3, 4, 5, 6, 0];
  const byWeekday = order.map((w) => ({
    label: WEEKDAYS[w] ?? "",
    value: (wdDays[w] ?? 0) > 0 ? Math.round(((wdCount[w] ?? 0) / (wdDays[w] ?? 1)) * 10) / 10 : 0,
  }));

  const hours = new Map<number, number>();
  for (const r of records) {
    const h = Number(r.startTime.split(":")[0]);
    if (Number.isFinite(h)) hours.set(h, (hours.get(h) ?? 0) + 1);
  }
  const byHour = [...hours.entries()].sort((a, b) => a[0] - b[0]).map(([h, v]) => ({ label: `${h}h`, value: v }));

  const svc = new Map<string, { sum: number; count: number }>();
  for (const r of records) {
    const s = svc.get(r.serviceType) ?? { sum: 0, count: 0 };
    s.sum += r.price;
    s.count++;
    svc.set(r.serviceType, s);
  }
  const priceByService = [...svc.entries()].map(([service, s]) => ({ service, avg: s.sum / s.count, count: s.count }));

  const wx = new Map<string, { count: number; days: Set<string> }>();
  for (const r of records) {
    if (!r.weatherCondition) continue;
    const w = wx.get(r.weatherCondition) ?? { count: 0, days: new Set<string>() };
    w.count++;
    w.days.add(r.date);
    wx.set(r.weatherCondition, w);
  }
  const byWeather = [...wx.entries()].map(([condition, w]) => ({
    condition,
    count: w.count,
    days: w.days.size,
    avgPerDay: w.count / w.days.size,
  }));

  const avgPerActiveDay = activeDays > 0 ? n / activeDays : 0;
  const groups = (["sunny", "cloudy", "rainy"] as const).map((group) => {
    const days = new Set<string>();
    let count = 0;
    for (const r of records)
      if (weatherGroup(r.weatherCondition) === group) {
        count++;
        days.add(r.date);
      }
    const effectPct =
      days.size >= 5 && avgPerActiveDay > 0 ? (count / days.size / avgPerActiveDay - 1) * 100 : null;
    return { group, days: days.size, count, effectPct };
  });

  // Tendencia lineal (mínimos cuadrados) sobre lavados por día calendario.
  let trend: HistoricalBaseline["trend"] = null;
  if (firstDate && spanDays >= 14 && n >= 10) {
    const ys: number[] = [];
    for (let i = 0; i < spanDays; i++) ys.push(perDay.get(addDays(firstDate, i)) ?? 0);
    const xm = (spanDays - 1) / 2;
    const ym = ys.reduce((s, y) => s + y, 0) / spanDays;
    let num = 0;
    let den = 0;
    ys.forEach((y, x) => {
      num += (x - xm) * (y - ym);
      den += (x - xm) ** 2;
    });
    const slope = den > 0 ? num / den : 0;
    trend = { slope, intercept: ym - slope * xm, n: spanDays };
  }

  if (n === 0) warnings.push("No hay registros de lavados: la referencia histórica no está disponible.");
  else if (n < 30 || activeDays < 14)
    warnings.push(`Solo hay ${n} registros en ${activeDays} días: las estimaciones históricas tienen baja confiabilidad.`);
  if (spanDays > activeDays)
    warnings.push(
      `${spanDays - activeDays} días del periodo no tienen registros; no es posible saber si fueron días con cero lavados o días sin registrar.`,
    );
  if (n > 0 && groups.every((g) => g.effectPct === null))
    warnings.push("Datos climáticos insuficientes: el análisis climático es preliminar.");

  const latest = records.reduce((m, r) => (r.createdAt > m ? r.createdAt : m), "");
  return {
    recordCount: n,
    firstDate,
    lastDate,
    spanDays,
    activeDays,
    avgPerActiveDay,
    avgPerCalendarDay: spanDays > 0 ? n / spanDays : 0,
    avgDailyRevenue: activeDays > 0 ? revenue / activeDays : 0,
    avgPrice: n ? revenue / n : 0,
    avgCost: n ? records.reduce((s, r) => s + r.cost, 0) / n : 0,
    avgProfit: n ? records.reduce((s, r) => s + r.profit, 0) / n : 0,
    byWeekday,
    byHour,
    priceByService,
    byWeather,
    climateGroups: groups,
    trend,
    dataVersion: `${n} registros · ${firstDate ?? "-"} a ${lastDate ?? "-"} · ${latest.slice(0, 10) || "sin fecha"}`,
    warnings,
  };
}

// ---------- Sensibilidad ----------

export const SENSITIVITY_LABELS: Record<SensitivityVariable, string> = {
  demand: "Demanda (%)",
  price: "Precio (%)",
  variableCost: "Costos variables / insumos (%)",
  fixedCost: "Costos fijos (%)",
  cancellation: "Cancelaciones (puntos %)",
  rainyDays: "Días adicionales de lluvia",
};

export function deltaFor(variable: SensitivityVariable, change: number, p: SimulationParameters): ScenarioDelta {
  const d = { ...ZERO_DELTA };
  if (variable === "demand") d.demandPct = change;
  if (variable === "price") d.pricePct = change;
  if (variable === "variableCost") d.variableCostPct = change;
  if (variable === "fixedCost") d.fixedCostPct = change;
  if (variable === "cancellation") d.cancellationPp = change;
  if (variable === "rainyDays") {
    const op = Math.max(1, Math.round((horizonDays(p) * p.operatingDaysPerWeek) / 7));
    d.rainyShiftPp = (change / op) * 100;
  }
  return d;
}

export function sensitivity(
  p: SimulationParameters,
  baseline: HistoricalBaseline | null,
  variable: SensitivityVariable,
  change: number,
): SensitivityResult {
  const base = simulate(p, baseline);
  const next = simulate(p, baseline, deltaFor(variable, change, p));
  const absDiff = next.operatingProfit - base.operatingProfit;
  return {
    variable,
    label: SENSITIVITY_LABELS[variable],
    change,
    baseRevenue: base.revenue,
    newRevenue: next.revenue,
    baseProfit: base.operatingProfit,
    newProfit: next.operatingProfit,
    absDiff,
    pctDiff: base.operatingProfit !== 0 ? (absDiff / Math.abs(base.operatingProfit)) * 100 : null,
    baseBreakEven: base.breakEvenWashes,
    newBreakEven: next.breakEvenWashes,
  };
}

export function combineDelta(a: ScenarioDelta, key: keyof ScenarioDelta): ScenarioDelta {
  return { ...ZERO_DELTA, [key]: a[key] };
}
