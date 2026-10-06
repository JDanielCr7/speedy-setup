import { createFileRoute } from "@tanstack/react-router";
import {
  Clock,
  Coins,
  Droplets,
  Percent,
  Receipt,
  TrendingUp,
  Wallet,
  Wrench,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { BarChart } from "@/components/BarChart";
import { StatCard } from "@/components/StatCard";
import { useWashingRecords } from "@/hooks/useWashingRecords";
import { analyticsService } from "@/services/analyticsService";
import { formatCOP } from "@/types/washingRecord";

export const Route = createFileRoute("/analisis")({
  head: () => ({
    meta: [
      { title: "Análisis descriptivo — MotoClean Analytics" },
      {
        name: "description",
        content:
          "Ingresos, costos, utilidad, margen y demanda por día, hora, clima y zona calculados de los lavados registrados.",
      },
      { property: "og:title", content: "Análisis descriptivo — MotoClean Analytics" },
      {
        property: "og:description",
        content: "Estadísticas actuales de la operación de MotoClean.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalisisPage,
});

function AnalisisPage() {
  const { records } = useWashingRecords();
  const s = analyticsService.summary(records);
  const byHour = analyticsService
    .washesByHour(records)
    .filter((b) => b.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <AppLayout>
      <span className="inline-block rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
        Análisis actual
      </span>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Análisis descriptivo</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Estadísticas calculadas directamente de los registros. No incluye
        modelos predictivos.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total lavados" value={String(s.totalWashes)} icon={Droplets} />
        <StatCard label="Ingresos totales" value={formatCOP(s.totalRevenue)} icon={Wallet} />
        <StatCard label="Costos totales" value={formatCOP(s.totalCost)} icon={Wrench} />
        <StatCard label="Utilidad total" value={formatCOP(s.totalProfit)} icon={TrendingUp} />
        <StatCard label="Ticket promedio" value={formatCOP(s.avgTicket)} icon={Receipt} />
        <StatCard label="Utilidad promedio" value={formatCOP(s.avgProfit)} icon={Coins} />
        <StatCard label="Margen promedio" value={`${s.avgMargin.toFixed(1)} %`} icon={Percent} />
        <StatCard label="Duración promedio" value={`${Math.round(s.avgDuration)} min`} icon={Clock} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <BarChart title="Demanda por día de la semana" data={analyticsService.demandByWeekday(records)} />
        <BarChart title="Demanda por clima" data={analyticsService.demandByWeather(records)} />
        <BarChart title="Servicios más solicitados" data={analyticsService.byCategory(records, "serviceType")} />
        <BarChart title="Demanda por zona" data={analyticsService.byCategory(records, "serviceZone").map((b) => ({ ...b, label: b.label.replace("Bogotá – ", "") }))} />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Horas con mayor demanda</h3>
        {byHour.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Registra algunos lavados para comenzar a visualizar tendencias.
          </p>
        ) : (
          <ol className="mt-3 space-y-2">
            {byHour.map((b, i) => (
              <li key={b.label} className="flex items-center justify-between text-sm">
                <span>
                  <span className="mr-2 font-bold text-primary">#{i + 1}</span>
                  {b.label.replace("h", ":00")}
                </span>
                <span className="text-muted-foreground">{b.value} lavados</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </AppLayout>
  );
}
