// Exportación del simulador a CSV/JSON con columnas snake_case para Pandas.
import { download, rowsToCsv } from "@/services/exportService";
import type { ScenarioSet, SensitivityResult, SimulationParameters, SimulationResults } from "@/types/simulation";

function flatten(obj: unknown, prefix = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => Object.assign(out, flatten(v, `${prefix}${i}_`)));
  } else if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      const key = `${prefix}${k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)}`;
      if (v && typeof v === "object") Object.assign(out, flatten(v, `${key}_`));
      else out[key] = v;
    }
  }
  return out;
}

const METRICS: (keyof SimulationResults)[] = [
  "horizonDays", "operatingDays", "adjustedDemand", "effectiveWashes", "capacity", "servedWashes",
  "unmetDemand", "effectivePrice", "revenue", "variableCostPerWash", "variableCosts", "fixedCosts",
  "operatingCosts", "operatingProfit", "operatingMarginPct", "contributionMargin", "breakEvenWashes",
  "totalInvestment", "roiPct", "monthlyProfit", "paybackMonths", "climateAdjustmentPct",
];
const snake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

export interface ExportBundle {
  params: SimulationParameters;
  deltas: ScenarioSet;
  results: { pessimistic: SimulationResults; base: SimulationResults; optimistic: SimulationResults };
  sensitivity: SensitivityResult[];
  dataVersion: string;
}

export const simulationExport = {
  csv(kind: "parameters" | "results" | "comparison" | "sensitivity", b: ExportBundle) {
    let rows: Record<string, unknown>[] = [];
    if (kind === "parameters")
      rows = Object.entries({ ...flatten(b.params), ...flatten(b.deltas, "delta_") }).map(([parameter, value]) => ({ parameter, value }));
    if (kind === "results")
      rows = METRICS.map((m) => ({ metric: snake(m), value: b.results.base[m] as unknown }));
    if (kind === "comparison")
      rows = METRICS.map((m) => ({
        metric: snake(m),
        pessimistic: b.results.pessimistic[m] as unknown,
        base: b.results.base[m] as unknown,
        optimistic: b.results.optimistic[m] as unknown,
      }));
    if (kind === "sensitivity")
      rows = b.sensitivity.map((s) => ({
        variable: s.variable, change: s.change, base_revenue: s.baseRevenue, new_revenue: s.newRevenue,
        base_profit: s.baseProfit, new_profit: s.newProfit, abs_diff: s.absDiff, pct_diff: s.pctDiff,
        base_break_even: s.baseBreakEven, new_break_even: s.newBreakEven,
      }));
    download(`motoclean_simulation_${kind}.csv`, rowsToCsv(rows), "text/csv");
  },
  json(b: ExportBundle) {
    const { dailyProjection: _d, ...base } = b.results.base;
    void _d;
    download(
      "motoclean_simulation.json",
      JSON.stringify({ type: "deterministic_simulation", exported_at: new Date().toISOString(), historical_data_version: b.dataVersion, parameters: b.params, scenario_deltas: b.deltas, results: { ...b.results, base }, sensitivity: b.sensitivity }, null, 2),
      "application/json",
    );
  },
};
