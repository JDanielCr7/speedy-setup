import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Copy,
  Download,
  FolderOpen,
  Gauge,
  Play,
  Save,
  Target,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppLayout } from "@/components/AppLayout";
import { BarChart } from "@/components/BarChart";
import { SignedBars } from "@/components/SignedBars";
import { StatCard } from "@/components/StatCard";
import { useWashingRecords } from "@/hooks/useWashingRecords";
import { simulationExport } from "@/services/simulationExport";
import {
  buildBaseline,
  CLIMATE_PRESETS,
  combineDelta,
  defaultParameters,
  SENSITIVITY_LABELS,
  sensitivity,
  simulate,
  validateParameters,
} from "@/services/simulationService";
import { simulationStorage } from "@/services/simulationStorage";
import type {
  ClimatePreset,
  Frequency,
  ScenarioDelta,
  ScenarioSet,
  SensitivityVariable,
  SimulationParameters,
  SimulationResults,
  SimulationScenario,
} from "@/types/simulation";
import { formatCOP } from "@/types/washingRecord";

export const Route = createFileRoute("/simulador")({
  head: () => ({
    meta: [
      { title: "Simulador de escenarios — MotoClean Analytics" },
      {
        name: "description",
        content:
          "Simula demanda, ingresos, costos, utilidad, punto de equilibrio y ROI del negocio MotoClean con escenarios pesimista, base y optimista.",
      },
      { property: "og:title", content: "Simulador de escenarios — MotoClean Analytics" },
      {
        property: "og:description",
        content: "Simulación financiera y operativa del lavado de motos a domicilio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SimuladorPage,
});

const DEFAULT_DELTAS: ScenarioSet = {
  pessimistic: { demandPct: -20, pricePct: -5, variableCostPct: 10, fixedCostPct: 0, cancellationPp: 5, climatePp: 0, rainyShiftPp: 0 },
  optimistic: { demandPct: 20, pricePct: 0, variableCostPct: -5, fixedCostPct: 0, cancellationPp: -2, climatePp: 0, rainyShiftPp: 0 },
};
const DELTA_LABELS: Record<keyof ScenarioDelta, string> = {
  demandPct: "Demanda (%)",
  pricePct: "Precio (%)",
  variableCostPct: "Costos variables (%)",
  fixedCostPct: "Costos fijos (%)",
  cancellationPp: "Cancelaciones (pp)",
  climatePp: "Ajuste climático (pp)",
  rainyShiftPp: "Días de lluvia (pp)",
};

const pct = (v: number | null, d = 1) => (v === null ? "No aplica" : `${v.toFixed(d)} %`);
const num = (v: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(v);
const kCOP = (v: number) => `${v < 0 ? "−" : ""}$${num(Math.abs(v) / 1000)}k`;

// ---------- UI helpers ----------
function Tag({ kind }: { kind: "manual" | "historico" | "simulado" | "supuesto" }) {
  const map = {
    manual: ["Parámetro manual", "bg-secondary text-foreground"],
    historico: ["Dato histórico", "bg-accent text-accent-foreground"],
    simulado: ["Resultado simulado", "bg-primary/15 text-primary"],
    supuesto: ["Supuesto de simulación", "bg-destructive/15 text-destructive"],
  } as const;
  const [label, cls] = map[kind];
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{label}</span>;
}

function Section({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group rounded-xl border border-border bg-card">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold">{title}</summary>
      <div className="space-y-3 border-t border-border p-4">{children}</div>
    </details>
  );
}

function NumField({
  label, value, onChange, min = 0, max, step = 1, suffix, integer,
}: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string; integer?: boolean;
}) {
  return (
    <label className="block text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="mt-1 flex items-center gap-1">
        <input
          type="number"
          inputMode="decimal"
          className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            let v = e.target.value === "" ? 0 : Number(e.target.value);
            if (!Number.isFinite(v)) v = 0;
            if (integer) v = Math.round(v);
            if (min !== undefined) v = Math.max(min, v);
            if (max !== undefined) v = Math.min(max, v);
            onChange(v);
          }}
        />
        {suffix && <span className="shrink-0 text-muted-foreground">{suffix}</span>}
      </div>
    </label>
  );
}

function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <label className="block text-xs">
      <span className="text-muted-foreground">{label}</span>
      <select
        className="mt-1 w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}

const btn = "inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium hover:bg-secondary/70";

// ---------- Página ----------
function SimuladorPage() {
  const { records } = useWashingRecords();
  const baseline = useMemo(() => buildBaseline(records), [records]);
  const [params, setParams] = useState<SimulationParameters>(defaultParameters);
  const [deltas, setDeltas] = useState<ScenarioSet>(DEFAULT_DELTAS);
  const [saved, setSaved] = useState<SimulationScenario[]>([]);
  const [currentId, setCurrentId] = useState<string | undefined>();
  const [name, setName] = useState("Escenario 1");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [sensVar, setSensVar] = useState<SensitivityVariable>("demand");
  const [sensChange, setSensChange] = useState(20);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => setSaved(simulationStorage.getAll()), []);

  const set = (patch: Partial<SimulationParameters>) => setParams((p) => ({ ...p, ...patch }));
  const errors = validateParameters(params);
  const base = useMemo(() => simulate(params, baseline), [params, baseline]);
  const pes = useMemo(() => simulate(params, baseline, deltas.pessimistic), [params, baseline, deltas]);
  const opt = useMemo(() => simulate(params, baseline, deltas.optimistic), [params, baseline, deltas]);

  const sens = useMemo(() => sensitivity(params, baseline, sensVar, sensChange), [params, baseline, sensVar, sensChange]);
  const presetSens = useMemo(
    () => [
      sensitivity(params, baseline, "demand", 20),
      sensitivity(params, baseline, "price", -10),
      sensitivity(params, baseline, "variableCost", 15),
      sensitivity(params, baseline, "rainyDays", 2),
      sensitivity(params, baseline, "cancellation", 5),
    ],
    [params, baseline],
  );
  const curves = useMemo(
    () =>
      (["price", "demand", "variableCost"] as const).map((v) => ({
        v,
        items: [-20, -10, 0, 10, 20].map((c) => ({
          label: `${c > 0 ? "+" : ""}${c} %`,
          value: sensitivity(params, baseline, v, c).newProfit,
        })),
      })),
    [params, baseline],
  );
  const impact = useMemo(
    () =>
      (Object.keys(DELTA_LABELS) as (keyof ScenarioDelta)[])
        .map((k) => ({
          k,
          spread:
            simulate(params, baseline, combineDelta(deltas.optimistic, k)).operatingProfit -
            simulate(params, baseline, combineDelta(deltas.pessimistic, k)).operatingProfit,
        }))
        .filter((x) => x.spread !== 0)
        .sort((a, b) => Math.abs(b.spread) - Math.abs(a.spread)),
    [params, baseline, deltas],
  );

  const bundle = { params, deltas, results: { pessimistic: pes, base, optimistic: opt }, sensitivity: [sens, ...presetSens], dataVersion: baseline.dataVersion };

  const run = () => {
    setLastRun(new Date().toLocaleTimeString("es-CO"));
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const save = (asNew: boolean) => {
    const item = simulationStorage.save(
      { name: name.trim() || "Sin nombre", params, deltas, results: base, horizonDays: base.horizonDays, dataVersion: baseline.dataVersion },
      asNew ? undefined : currentId,
    );
    setCurrentId(item.id);
    setSaved(simulationStorage.getAll());
  };
  const load = (s: SimulationScenario) => {
    setParams(s.params);
    setDeltas(s.deltas);
    setName(s.name);
    setCurrentId(s.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const useHistoricalPrices = () => {
    if (!baseline.recordCount) return;
    set({
      avgPrice: Math.round(baseline.avgPrice),
      serviceMix: params.serviceMix.map((m) => {
        const h = baseline.priceByService.find((x) => x.service === m.service);
        return h ? { ...m, price: Math.round(h.avg), sharePct: Math.round((h.count / baseline.recordCount) * 100) } : { ...m, sharePct: 0 };
      }),
    });
  };
  const useHistoricalClimate = () => {
    const g = Object.fromEntries(baseline.climateGroups.map((x) => [x.group, x.effectPct]));
    set({
      climate: {
        ...params.climate,
        sunnyEffectPct: Math.round((g["sunny"] ?? 0) * 10) / 10,
        cloudyEffectPct: Math.round((g["cloudy"] ?? 0) * 10) / 10,
        rainyEffectPct: Math.round((g["rainy"] ?? 0) * 10) / 10,
      },
    });
  };
  const climateAvailable = baseline.climateGroups.some((g) => g.effectPct !== null);
  const compared = saved.filter((s) => compareIds.includes(s.id));
  const cl = params.climate;

  return (
    <AppLayout>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Simulador de escenarios</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Simulación matemática determinista con tus parámetros y, si lo eliges, con tus registros históricos.
            No es una predicción de machine learning.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Tag kind="manual" /><Tag kind="historico" /><Tag kind="simulado" /><Tag kind="supuesto" />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* ---------- Configuración ---------- */}
        <div className="space-y-3">
          <Section title="A. Periodo" open>
            <Select<SimulationParameters["horizon"]>
              label="Horizonte"
              value={params.horizon}
              onChange={(v) => set({ horizon: v })}
              options={[["7", "Próximos 7 días"], ["30", "Próximos 30 días"], ["90", "Próximos 90 días"], ["custom", "Periodo personalizado"]]}
            />
            {params.horizon === "custom" && (
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-muted-foreground">Inicio
                  <input type="date" className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground" value={params.startDate} onChange={(e) => set({ startDate: e.target.value })} />
                </label>
                <label className="text-xs text-muted-foreground">Fin
                  <input type="date" className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground" value={params.endDate} onChange={(e) => set({ endDate: e.target.value })} />
                </label>
              </div>
            )}
          </Section>

          <Section title="B. Demanda" open>
            <Select<SimulationParameters["demandSource"]>
              label="Fuente de la demanda"
              value={params.demandSource}
              onChange={(v) => set({ demandSource: v })}
              options={[["manual", "Parámetros manuales"], ["historical", "Promedio histórico"], ["trend", "Tendencia histórica lineal"]]}
            />
            {params.demandSource !== "manual" && (
              <p className="rounded-lg bg-accent/40 p-2 text-[11px]">
                <Tag kind="historico" /> Lavados por día de operación: <b>{num(base.washesPerOperatingDay)}</b>
                {params.demandSource === "trend" && " (regresión lineal por mínimos cuadrados sobre lavados diarios; no es IA)"}
                {params.demandSource === "trend" && !baseline.trend && " — datos insuficientes (mín. 10 registros y 14 días)."}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <NumField label="Lavados esperados / día" value={params.washesPerDay} integer onChange={(v) => set({ washesPerDay: v })} />
              <NumField label="Días de operación / semana" value={params.operatingDaysPerWeek} max={7} integer onChange={(v) => set({ operatingDaysPerWeek: v })} />
              <NumField label="Lavadores disponibles" value={params.washers} integer onChange={(v) => set({ washers: v })} />
              <NumField label="Capacidad / lavador / día" value={params.capacityPerWasher} integer onChange={(v) => set({ capacityPerWasher: v })} />
              <NumField label="Cancelaciones" value={params.cancellationPct} max={100} suffix="%" onChange={(v) => set({ cancellationPct: v })} />
              <NumField label="Crecimiento demanda" value={params.growthPct} min={-100} max={500} suffix="%" onChange={(v) => set({ growthPct: v })} />
            </div>
          </Section>

          <Section title="C. Precio y ventas">
            <div className="grid grid-cols-2 gap-2">
              <NumField label="Precio promedio (COP)" value={params.avgPrice} step={1000} onChange={(v) => set({ avgPrice: v })} />
              <NumField label="Descuento promedio" value={params.discountPct} max={100} suffix="%" onChange={(v) => set({ discountPct: v })} />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={params.useServiceMix} onChange={(e) => set({ useServiceMix: e.target.checked })} />
              Usar mezcla de servicios (reemplaza el precio promedio)
            </label>
            {params.useServiceMix && (
              <div className="space-y-2">
                {params.serviceMix.map((m, i) => (
                  <div key={m.service} className="grid grid-cols-[1fr_5rem_7rem] items-end gap-2">
                    <span className="pb-2 text-xs">{m.service}</span>
                    <NumField label="%" value={m.sharePct} max={100} onChange={(v) => set({ serviceMix: params.serviceMix.map((x, j) => (j === i ? { ...x, sharePct: v } : x)) })} />
                    <NumField label="Precio" value={m.price} step={1000} onChange={(v) => set({ serviceMix: params.serviceMix.map((x, j) => (j === i ? { ...x, price: v } : x)) })} />
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground">Suma: {params.serviceMix.reduce((s, m) => s + m.sharePct, 0)} %</p>
              </div>
            )}
            <button type="button" className={btn} disabled={!baseline.recordCount} onClick={useHistoricalPrices}>
              Usar precios del historial
            </button>
          </Section>

          <Section title="D. Costos variables por lavado">
            <div className="grid grid-cols-2 gap-2">
              {([["supplies", "Insumos"], ["transport", "Transporte"], ["utilities", "Agua y energía"], ["labor", "Mano de obra variable"], ["other", "Otros variables"]] as const).map(([k, l]) => (
                <NumField key={k} label={`${l} (COP)`} value={params.variableCosts[k]} step={100} onChange={(v) => set({ variableCosts: { ...params.variableCosts, [k]: v } })} />
              ))}
            </div>
            <p className="text-xs">Total por lavado: <b>{formatCOP(base.variableCostPerWash)}</b></p>
          </Section>

          <Section title="E. Costos fijos">
            {params.fixedCosts.map((f, i) => (
              <div key={f.key} className="grid grid-cols-[1fr_7.5rem] items-end gap-2">
                <NumField label={`${f.label} (COP)`} value={f.amount} step={10000} onChange={(v) => set({ fixedCosts: params.fixedCosts.map((x, j) => (j === i ? { ...x, amount: v } : x)) })} />
                <Select<Frequency> label="Frecuencia" value={f.frequency} onChange={(v) => set({ fixedCosts: params.fixedCosts.map((x, j) => (j === i ? { ...x, frequency: v } : x)) })} options={[["daily", "Diario"], ["weekly", "Semanal"], ["monthly", "Mensual"]]} />
              </div>
            ))}
            <p className="text-xs">Costos fijos del periodo ({base.horizonDays} días): <b>{formatCOP(base.fixedCosts)}</b></p>
          </Section>

          <Section title="F. Inversión (separada de los costos operativos)">
            <div className="grid grid-cols-2 gap-2">
              {([["initial", "Inversión inicial (otros)"], ["equipment", "Equipos"], ["tools", "Herramientas"], ["workingCapital", "Capital de trabajo"], ["other", "Otros desembolsos"]] as const).map(([k, l]) => (
                <NumField key={k} label={`${l} (COP)`} value={params.investment[k]} step={50000} onChange={(v) => set({ investment: { ...params.investment, [k]: v } })} />
              ))}
            </div>
            <p className="text-xs">Inversión total: <b>{formatCOP(base.totalInvestment)}</b></p>
          </Section>

          <Section title="G. Clima">
            <Select<ClimatePreset>
              label="Escenario climático"
              value={cl.preset}
              onChange={(v) => set({ climate: { ...cl, preset: v } })}
              options={[["normal", "Normal"], ["sunny", "Predominio de días soleados"], ["cloudy", "Predominio de días nublados"], ["rainy", "Predominio de lluvias"], ["manual", "Configuración manual"]]}
            />
            {cl.preset === "manual" ? (
              <div className="grid grid-cols-3 gap-2">
                <NumField label="Soleados %" value={cl.sunnyPct} max={100} onChange={(v) => set({ climate: { ...cl, sunnyPct: v } })} />
                <NumField label="Nublados %" value={cl.cloudyPct} max={100} onChange={(v) => set({ climate: { ...cl, cloudyPct: v } })} />
                <NumField label="Lluviosos %" value={cl.rainyPct} max={100} onChange={(v) => set({ climate: { ...cl, rainyPct: v } })} />
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Proporción: {CLIMATE_PRESETS[cl.preset].sunny} % sol · {CLIMATE_PRESETS[cl.preset].cloudy} % nublado · {CLIMATE_PRESETS[cl.preset].rainy} % lluvia
              </p>
            )}
            <div className="flex items-center gap-2"><Tag kind="supuesto" /><span className="text-[11px] text-muted-foreground">Variación de demanda por tipo de día</span></div>
            <div className="grid grid-cols-3 gap-2">
              <NumField label="Sol %" min={-100} max={200} value={cl.sunnyEffectPct} onChange={(v) => set({ climate: { ...cl, sunnyEffectPct: v } })} />
              <NumField label="Nublado %" min={-100} max={200} value={cl.cloudyEffectPct} onChange={(v) => set({ climate: { ...cl, cloudyEffectPct: v } })} />
              <NumField label="Lluvia %" min={-100} max={200} value={cl.rainyEffectPct} onChange={(v) => set({ climate: { ...cl, rainyEffectPct: v } })} />
            </div>
            <p className="text-xs">Ajuste climático resultante: <b>{pct(base.climateAdjustmentPct)}</b></p>
            {climateAvailable ? (
              <button type="button" className={btn} onClick={useHistoricalClimate}>Usar diferencias observadas en el historial</button>
            ) : (
              <p className="flex gap-1.5 text-[11px] text-destructive"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />Datos climáticos insuficientes (mín. 5 días por condición): el análisis es preliminar y los valores son supuestos.</p>
            )}
            <p className="text-[11px] text-muted-foreground">Las diferencias históricas son correlaciones descriptivas, no prueban que el clima cause los cambios.</p>
          </Section>

          <button type="button" onClick={run} className="sticky bottom-20 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-lg hover:bg-primary/90 md:bottom-4">
            <Play className="h-4 w-4" /> Ejecutar simulación
          </button>
        </div>

        {/* ---------- Resultados ---------- */}
        <div ref={resultsRef} className="scroll-mt-20 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Resultados estimados <Tag kind="simulado" /></h2>
            <span className="text-xs text-muted-foreground">
              {base.horizonDays} días · {base.operatingDays} días de operación{lastRun && ` · ejecutada ${lastRun}`}
            </span>
          </div>

          {errors.length > 0 && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              {errors.map((e) => <p key={e}>• {e}</p>)}
            </div>
          )}
          {base.warnings.length > 0 && (
            <div className="rounded-lg border border-border bg-secondary p-3 text-xs">
              {base.warnings.map((w) => <p key={w} className="flex gap-1.5"><AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />{w}</p>)}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard label="Lavados proyectados" value={num(base.servedWashes)} hint={`Capacidad ${num(base.capacity)}`} icon={Users} />
            <StatCard label="Ingresos" value={formatCOP(base.revenue)} hint={`Precio efectivo ${formatCOP(base.effectivePrice)}`} icon={Wallet} />
            <StatCard label="Costos operativos" value={formatCOP(base.operatingCosts)} hint={`Var. ${kCOP(base.variableCosts)} · Fijos ${kCOP(base.fixedCosts)}`} icon={Wallet} />
            <StatCard label="Utilidad operativa" value={formatCOP(base.operatingProfit)} hint="No equivale a flujo de caja" icon={TrendingUp} />
            <StatCard label="Margen operativo" value={pct(base.operatingMarginPct)} icon={Gauge} />
            <StatCard label="ROI estimado" value={base.roiPct === null ? "No disponible" : pct(base.roiPct)} hint="Del periodo, simplificado" icon={TrendingUp} />
            <StatCard label="Punto de equilibrio" value={base.breakEvenWashes === null ? "No se alcanza" : `${num(base.breakEvenWashes)} lavados`} hint={`Contribución ${formatCOP(base.contributionMargin)}/lavado`} icon={Target} />
            <StatCard label="Demanda no atendida" value={num(base.unmetDemand)} hint="Por falta de capacidad" icon={AlertTriangle} />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 text-xs">
            <h3 className="text-sm font-semibold">Recuperación de la inversión</h3>
            <p className="mt-1">
              {base.totalInvestment <= 0
                ? "No disponible: no se registró inversión."
                : base.paybackMonths === null
                  ? "No se recupera: la utilidad operativa mensual estimada no es positiva."
                  : <>Aprox. <b>{base.paybackMonths.toFixed(1)} meses</b> (utilidad mensual estimada {formatCOP(base.monthlyProfit)}).</>}
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-muted-foreground"><tr><th className="py-1">Horizonte</th><th>Utilidad acumulada</th><th>Neto de inversión</th></tr></thead>
                <tbody>
                  {base.cumulative.map((c) => (
                    <tr key={c.months} className="border-t border-border">
                      <td className="py-1">{c.months} {c.months === 1 ? "mes" : "meses"}</td>
                      <td>{formatCOP(c.operatingProfit)}</td>
                      <td className={c.netOfInvestment < 0 ? "text-destructive" : ""}>{formatCOP(c.netOfInvestment)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-muted-foreground">Aproximación simplificada: no considera impuestos, financiación, depreciación ni cambios futuros de demanda. El ROI no equivale al ROI contable ni garantiza rentabilidad.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SignedBars title="Ingresos frente a costos" format={kCOP} items={[
              { label: "Ingresos", value: base.revenue },
              { label: "Costos variables", value: base.variableCosts },
              { label: "Costos fijos", value: base.fixedCosts },
              { label: "Utilidad", value: base.operatingProfit },
            ]} />
            <SignedBars title="Utilidad por escenario" format={kCOP} items={[
              { label: "Pesimista", value: pes.operatingProfit },
              { label: "Base", value: base.operatingProfit },
              { label: "Optimista", value: opt.operatingProfit },
            ]} />
          </div>
          <BarChart title="Demanda atendida proyectada por día" data={base.dailyProjection.length > 31 ? weekly(base.dailyProjection) : base.dailyProjection} />
        </div>
      </div>

      {/* ---------- Comparación de escenarios ---------- */}
      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-bold">Comparación de escenarios</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {(["pessimistic", "optimistic"] as const).map((key) => (
            <div key={key} className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">{key === "pessimistic" ? "Escenario pesimista" : "Escenario optimista"} — variaciones respecto al base</h3>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(Object.keys(DELTA_LABELS) as (keyof ScenarioDelta)[]).map((k) => (
                  <NumField key={k} label={DELTA_LABELS[k]} min={-100} max={500} value={deltas[key][k]} onChange={(v) => setDeltas((d) => ({ ...d, [key]: { ...d[key], [k]: v } }))} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <ComparisonTable cols={[["Pesimista", pes], ["Base", base], ["Optimista", opt]]} />
        <div className="grid gap-4 md:grid-cols-2">
          <SignedBars title="Ingresos por escenario" format={kCOP} items={[{ label: "Pesimista", value: pes.revenue }, { label: "Base", value: base.revenue }, { label: "Optimista", value: opt.revenue }]} />
          <SignedBars title="Costos operativos por escenario" format={kCOP} items={[{ label: "Pesimista", value: pes.operatingCosts }, { label: "Base", value: base.operatingCosts }, { label: "Optimista", value: opt.operatingCosts }]} />
        </div>
        <SignedBars
          title="Variables que más separan el escenario optimista del pesimista (diferencia de utilidad)"
          format={kCOP}
          items={impact.length ? impact.map((i) => ({ label: DELTA_LABELS[i.k], value: i.spread })) : [{ label: "Sin diferencias", value: 0 }]}
        />
      </section>

      {/* ---------- ¿Qué pasa si…? ---------- */}
      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-bold">¿Qué pasa si…?</h2>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
            <Select<SensitivityVariable> label="Variable" value={sensVar} onChange={setSensVar} options={(Object.keys(SENSITIVITY_LABELS) as SensitivityVariable[]).map((k) => [k, SENSITIVITY_LABELS[k]])} />
            <NumField label="Cambio" min={-100} max={500} value={sensChange} onChange={setSensChange} />
          </div>
          <SensTable rows={[sens]} />
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">Casos frecuentes</h3>
          <SensTable rows={presetSens} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {curves.map((c) => (
            <SignedBars key={c.v} title={`Utilidad vs. ${SENSITIVITY_LABELS[c.v].toLowerCase()}`} format={kCOP} items={c.items} />
          ))}
        </div>
      </section>

      {/* ---------- Referencia histórica ---------- */}
      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-bold">Referencia histórica <Tag kind="historico" /></h2>
        {baseline.warnings.map((w) => (
          <p key={w} className="flex gap-1.5 text-xs text-destructive"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />{w}</p>
        ))}
        {baseline.recordCount > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Registros usados" value={String(baseline.recordCount)} hint={`${baseline.firstDate} a ${baseline.lastDate}`} icon={FolderOpen} />
              <StatCard label="Lavados / día activo" value={num(baseline.avgPerActiveDay)} hint={`${baseline.activeDays} de ${baseline.spanDays} días con registros`} icon={Users} />
              <StatCard label="Ingreso diario prom." value={formatCOP(baseline.avgDailyRevenue)} icon={Wallet} />
              <StatCard label="Costo / utilidad prom." value={`${kCOP(baseline.avgCost)} / ${kCOP(baseline.avgProfit)}`} hint={`Ticket ${formatCOP(baseline.avgPrice)}`} icon={TrendingUp} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <BarChart title="Promedio de lavados por día de la semana" data={baseline.byWeekday} />
              <BarChart title="Demanda por hora de inicio" data={baseline.byHour} />
              <SignedBars title="Precio promedio por servicio" format={kCOP} items={baseline.priceByService.map((s) => ({ label: `${s.service} (${s.count})`, value: s.avg }))} />
              <div className="rounded-xl border border-border bg-card p-4 text-xs">
                <h3 className="text-sm font-semibold">Demanda por condición climática</h3>
                <table className="mt-2 w-full text-left">
                  <thead className="text-muted-foreground"><tr><th className="py-1">Condición</th><th>Registros</th><th>Días</th><th>Lavados/día</th></tr></thead>
                  <tbody>
                    {baseline.byWeather.map((w) => (
                      <tr key={w.condition} className="border-t border-border"><td className="py-1">{w.condition}</td><td>{w.count}</td><td>{w.days}</td><td>{num(w.avgPerDay)}</td></tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-muted-foreground">
                  Diferencia vs. promedio: {baseline.climateGroups.map((g) => `${{ sunny: "sol", cloudy: "nublado", rainy: "lluvia" }[g.group]} ${g.effectPct === null ? "insuficiente" : pct(g.effectPct)}`).join(" · ")}. Correlación descriptiva, no causalidad.
                </p>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ---------- Historial y exportación ---------- */}
      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-bold">Historial de simulaciones</h2>
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-4">
          <label className="min-w-48 flex-1 text-xs text-muted-foreground">Nombre
            <input className="mt-1 w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm text-foreground" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          {currentId && <button type="button" className={btn} onClick={() => save(false)}><Save className="h-3.5 w-3.5" />Actualizar</button>}
          <button type="button" className={btn} onClick={() => save(true)}><Save className="h-3.5 w-3.5" />Guardar como nueva</button>
        </div>
        {saved.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay simulaciones guardadas.</p>
        ) : (
          <div className="space-y-2">
            {saved.map((s) => (
              <div key={s.id} className={`flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 text-xs ${s.id === currentId ? "border-primary" : "border-border"}`}>
                <input type="checkbox" aria-label={`Comparar ${s.name}`} checked={compareIds.includes(s.id)} onChange={(e) => setCompareIds((ids) => (e.target.checked ? [...ids, s.id] : ids.filter((x) => x !== s.id)))} />
                <div className="min-w-40 flex-1">
                  <p className="text-sm font-semibold">{s.name}</p>
                  <p className="text-muted-foreground">{new Date(s.createdAt).toLocaleString("es-CO")} · {s.horizonDays} días · utilidad {formatCOP(s.results.operatingProfit)}</p>
                  <p className="text-muted-foreground">Datos históricos: {s.dataVersion}{s.dataVersion !== baseline.dataVersion && " (los registros cambiaron desde que se guardó)"}</p>
                </div>
                <button type="button" className={btn} onClick={() => load(s)}><FolderOpen className="h-3.5 w-3.5" />Cargar</button>
                <button type="button" className={btn} onClick={() => { simulationStorage.duplicate(s.id); setSaved(simulationStorage.getAll()); }}><Copy className="h-3.5 w-3.5" />Duplicar</button>
                <button type="button" className={btn} onClick={() => { simulationStorage.remove(s.id); setSaved(simulationStorage.getAll()); if (s.id === currentId) setCurrentId(undefined); }}><Trash2 className="h-3.5 w-3.5" />Eliminar</button>
              </div>
            ))}
          </div>
        )}
        {compared.length >= 2 && <ComparisonTable cols={compared.map((s) => [s.name, s.results] as [string, SimulationResults])} />}
        {compared.length === 1 && <p className="text-xs text-muted-foreground">Selecciona al menos dos simulaciones para compararlas.</p>}

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">Exportar para Python / Pandas</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {([["parameters", "Parámetros CSV"], ["results", "Resultados CSV"], ["comparison", "Comparación CSV"], ["sensitivity", "Sensibilidad CSV"]] as const).map(([k, l]) => (
              <button key={k} type="button" className={btn} onClick={() => simulationExport.csv(k, bundle)}><Download className="h-3.5 w-3.5" />{l}</button>
            ))}
            <button type="button" className={btn} onClick={() => simulationExport.json(bundle)}><Download className="h-3.5 w-3.5" />Todo en JSON</button>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Integración futura: registros → PostgreSQL → API REST → Python/Pandas → modelo predictivo → dashboard. El motor local
            (simulationService) puede sustituirse por una llamada a la API que devuelva la misma estructura de resultados; las
            predicciones de machine learning se mostrarán como una categoría separada de estas simulaciones.
          </p>
        </div>
      </section>
    </AppLayout>
  );
}

function weekly(days: { label: string; value: number }[]) {
  const out: { label: string; value: number }[] = [];
  for (let i = 0; i < days.length; i += 7) {
    const chunk = days.slice(i, i + 7);
    out.push({ label: `Sem ${i / 7 + 1}`, value: chunk.reduce((s, d) => s + d.value, 0) });
  }
  return out;
}

function ComparisonTable({ cols }: { cols: [string, SimulationResults][] }) {
  const rows: [string, (r: SimulationResults) => string][] = [
    ["Lavados atendidos", (r) => num(r.servedWashes)],
    ["Demanda no atendida", (r) => num(r.unmetDemand)],
    ["Ingresos", (r) => formatCOP(r.revenue)],
    ["Costos variables", (r) => formatCOP(r.variableCosts)],
    ["Costos fijos", (r) => formatCOP(r.fixedCosts)],
    ["Utilidad operativa", (r) => formatCOP(r.operatingProfit)],
    ["Margen operativo", (r) => pct(r.operatingMarginPct)],
    ["Punto de equilibrio", (r) => (r.breakEvenWashes === null ? "No se alcanza" : `${num(r.breakEvenWashes)} lavados`)],
    ["ROI estimado", (r) => (r.roiPct === null ? "No disponible" : pct(r.roiPct))],
    ["Recuperación inversión", (r) => (r.paybackMonths === null ? "No disponible" : `${r.paybackMonths.toFixed(1)} meses`)],
  ];
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[520px] text-left text-xs">
        <thead className="text-muted-foreground">
          <tr><th className="p-3">Indicador</th>{cols.map(([n]) => <th key={n} className="p-3">{n}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map(([l, f]) => (
            <tr key={l} className="border-t border-border"><td className="p-3 font-medium">{l}</td>{cols.map(([n, r]) => <td key={n} className="p-3">{f(r)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SensTable({ rows }: { rows: ReturnType<typeof sensitivity>[] }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-xs">
        <thead className="text-muted-foreground">
          <tr><th className="py-1">Cambio</th><th>Utilidad base</th><th>Nueva utilidad</th><th>Diferencia</th><th>Dif. %</th><th>Equilibrio (base → nuevo)</th></tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={`${s.variable}${s.change}`} className="border-t border-border">
              <td className="py-1.5">{s.label}: {s.change > 0 ? "+" : ""}{s.change}</td>
              <td>{formatCOP(s.baseProfit)}</td>
              <td>{formatCOP(s.newProfit)}</td>
              <td className={s.absDiff < 0 ? "text-destructive" : "text-primary"}>{formatCOP(s.absDiff)}</td>
              <td>{s.pctDiff === null ? "No aplica" : pct(s.pctDiff)}</td>
              <td>{s.baseBreakEven ?? "—"} → {s.newBreakEven ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
