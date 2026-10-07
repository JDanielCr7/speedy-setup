import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Clock,
  Droplets,
  PlusCircle,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { BarChart } from "@/components/BarChart";
import { StatCard } from "@/components/StatCard";
import { useWashingRecords } from "@/hooks/useWashingRecords";
import { analyticsService } from "@/services/analyticsService";
import { formatCOP } from "@/types/washingRecord";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MotoClean Analytics — Registro y análisis de operaciones" },
      {
        name: "description",
        content:
          "Registra los lavados de motocicletas de MotoClean, consulta estadísticas y exporta los datos para análisis con Python.",
      },
      { property: "og:title", content: "MotoClean Analytics" },
      {
        property: "og:description",
        content:
          "Registro y análisis de operaciones de lavado de motocicletas. Lava tu moto sin moverla.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { records } = useWashingRecords();
  const today = analyticsService.today(records);
  const week = analyticsService.last7Days(records);
  const summary = analyticsService.summary(records);
  const hasDemo = records.some((r) => r.isDemo);

  return (
    <AppLayout>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel principal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen de la operación de lavados de MotoClean.
          </p>
        </div>
        <Link
          to="/registrar"
          search={{ edit: undefined }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <PlusCircle className="h-4 w-4" />
          Registrar lavado
        </Link>
      </div>

      {hasDemo && (
        <p className="mt-4 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
          Estás viendo datos de demostración. Puedes restaurarlos o borrarlos
          desde el Historial.
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="Total lavados"
          value={String(summary.totalWashes)}
          icon={Droplets}
        />
        <StatCard
          label="Lavados hoy"
          value={String(today.washes)}
          icon={Clock}
        />
        <StatCard
          label="Ingresos hoy"
          value={formatCOP(today.revenue)}
          icon={Wallet}
        />
        <StatCard
          label="Utilidad hoy"
          value={formatCOP(today.profit)}
          icon={TrendingUp}
        />
        <StatCard
          label="Lavados 7 días"
          value={String(week.washes)}
          icon={CalendarDays}
        />
        <StatCard
          label="Ingresos 7 días"
          value={formatCOP(week.revenue)}
          icon={Wallet}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <BarChart
          title="Lavados por día (últimos 14 días)"
          data={analyticsService.washesByDay(records, 14)}
        />
        <BarChart
          title="Ingresos por día (últimos 14 días)"
          data={analyticsService.revenueByDay(records, 14)}
          formatValue={(v) => `$${Math.round(v / 1000)}k`}
        />
        <BarChart
          title="Lavados por hora de inicio"
          data={analyticsService.washesByHour(records)}
        />
        <BarChart
          title="Motocicletas por tipo"
          data={analyticsService.washesByMotorcycleType(records)}
        />
      </div>
    </AppLayout>
  );
}
