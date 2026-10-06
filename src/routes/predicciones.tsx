import { createFileRoute } from "@tanstack/react-router";
import { CloudRain, Coins, LineChart, TrendingUp } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";

export const Route = createFileRoute("/predicciones")({
  head: () => ({
    meta: [
      { title: "Predicciones — MotoClean Analytics" },
      {
        name: "description",
        content:
          "Módulo preparado para integrar modelos predictivos de demanda, ingresos, utilidad y clima desarrollados en Python.",
      },
      { property: "og:title", content: "Predicciones — MotoClean Analytics" },
      {
        property: "og:description",
        content: "Módulo preparado para integración con modelos de Python.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrediccionesPage,
});

const MODELS = [
  {
    icon: TrendingUp,
    title: "Predicción de demanda",
    target: "number_of_washes",
    inputs: ["Día de semana", "Hora", "Mes", "Clima", "Temperatura", "Precipitación", "Zona", "Tipo de servicio"],
    output: "Lavados estimados: XX",
  },
  {
    icon: Coins,
    title: "Predicción de ingresos",
    target: "daily_revenue",
    inputs: ["Número de lavados", "Servicio", "Precio", "Día", "Hora", "Clima", "Zona"],
    output: "Ingresos estimados: $XXX.XXX",
  },
  {
    icon: LineChart,
    title: "Predicción de utilidad",
    target: "daily_profit",
    inputs: ["Ingresos", "Costos", "Cantidad de lavados", "Servicio", "Clima", "Zona", "Día"],
    output: "Utilidad estimada: $XXX.XXX",
  },
  {
    icon: CloudRain,
    title: "Influencia del clima",
    target: "weather_impact",
    inputs: ["Lluvia", "Temperatura", "Humedad", "Condición climática"],
    output: "Con lluvia moderada, la demanda podría variar un X %",
  },
];

const PIPELINE = [
  "MotoClean Analytics",
  "Base de datos PostgreSQL",
  "API REST",
  "Python",
  "Pandas / NumPy",
  "Machine Learning",
  "Predicciones",
  "Dashboard MotoClean",
];

function PrediccionesPage() {
  return (
    <AppLayout>
      <span className="inline-block rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Predicciones futuras
      </span>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Predicciones</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Módulo preparado para integración con modelos de Python. Aquí no se
        muestran resultados inventados: cada tarjeta se activará cuando el
        modelo correspondiente esté entrenado y conectado.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {MODELS.map((m) => (
          <div key={m.title} className="rounded-xl border border-dashed border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <m.icon className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">{m.title}</h2>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Variable objetivo: <code className="rounded bg-secondary px-1.5 py-0.5">{m.target}</code>
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {m.inputs.map((i) => (
                <span key={i} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                  {i}
                </span>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-secondary/60 p-3">
              <p className="text-sm font-medium text-muted-foreground/70">{m.output}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Disponible después de integrar el modelo predictivo.
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Arquitectura futura</h2>
        <ol className="mt-4 flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
          {PIPELINE.map((step, i) => (
            <li key={step} className="flex items-center gap-2 text-sm">
              <span className="rounded-lg border border-border bg-secondary/60 px-3 py-1.5">{step}</span>
              {i < PIPELINE.length - 1 && <span className="text-primary">→</span>}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-muted-foreground">
          Exporta los datos desde el Historial (CSV o JSON) para trabajarlos en
          Jupyter Notebook con Pandas, NumPy, Matplotlib, Seaborn y scikit-learn.
        </p>
      </div>
    </AppLayout>
  );
}
