import { describe, expect, it } from "vitest";
import { buildBaseline, defaultParameters, sensitivity, simulate } from "@/services/simulationService";
import type { SimulationParameters } from "@/types/simulation";

function params(over: Partial<SimulationParameters> = {}): SimulationParameters {
  const p = defaultParameters();
  return {
    ...p,
    horizon: "7",
    washesPerDay: 10,
    operatingDaysPerWeek: 7,
    washers: 2,
    capacityPerWasher: 10,
    cancellationPct: 10,
    growthPct: 0,
    avgPrice: 20000,
    discountPct: 0,
    variableCosts: { supplies: 5000, transport: 0, utilities: 0, labor: 0, other: 0 },
    fixedCosts: [{ key: "a", label: "a", amount: 7000, frequency: "daily" }],
    investment: { initial: 100000, equipment: 0, tools: 0, workingCapital: 0, other: 0 },
    ...over,
  };
}

describe("simulationService", () => {
  it("calcula demanda, ingresos, costos y utilidad", () => {
    const r = simulate(params());
    expect(r.operatingDays).toBe(7);
    expect(r.adjustedDemand).toBe(70);
    expect(r.servedWashes).toBe(63);
    expect(r.revenue).toBe(63 * 20000);
    expect(r.variableCosts).toBe(63 * 5000);
    expect(r.fixedCosts).toBe(49000);
    expect(r.operatingProfit).toBe(63 * 15000 - 49000);
    expect(r.breakEvenWashes).toBe(Math.ceil(49000 / 15000));
    expect(r.roiPct).toBeCloseTo(((63 * 15000 - 49000) / 100000) * 100);
  });

  it("limita por capacidad y reporta demanda no atendida", () => {
    const r = simulate(params({ washers: 1, capacityPerWasher: 5 }));
    expect(r.servedWashes).toBe(35);
    expect(r.unmetDemand).toBe(63 - 35);
  });

  it("convierte costos fijos mensuales y semanales", () => {
    const r = simulate(params({ horizon: "30", fixedCosts: [
      { key: "m", label: "m", amount: 300000, frequency: "monthly" },
      { key: "w", label: "w", amount: 7000, frequency: "weekly" },
    ] }));
    expect(r.fixedCosts).toBeCloseTo(300000 + 30000);
  });

  it("maneja ingresos cero, margen negativo e inversión cero", () => {
    const r = simulate(params({ avgPrice: 0, investment: { initial: 0, equipment: 0, tools: 0, workingCapital: 0, other: 0 } }));
    expect(r.operatingMarginPct).toBeNull();
    expect(r.breakEvenWashes).toBeNull();
    expect(r.roiPct).toBeNull();
    expect(r.paybackMonths).toBeNull();
  });

  it("aplica descuento y mezcla de servicios", () => {
    const r = simulate(params({ discountPct: 10, useServiceMix: true, serviceMix: [
      { service: "a", sharePct: 50, price: 10000 },
      { service: "b", sharePct: 50, price: 30000 },
    ] }));
    expect(r.effectivePrice).toBe(18000);
  });

  it("sensibilidad de precio", () => {
    const s = sensitivity(params(), null, "price", -10);
    expect(s.absDiff).toBeCloseTo(-63 * 2000);
  });

  it("baseline vacío no falla", () => {
    const b = buildBaseline([]);
    expect(b.recordCount).toBe(0);
    expect(b.trend).toBeNull();
  });
});
