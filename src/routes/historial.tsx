import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Database,
  FileJson,
  FileSpreadsheet,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useWashingRecords } from "@/hooks/useWashingRecords";
import { exportService } from "@/services/exportService";
import {
  MOTORCYCLE_TYPES,
  SERVICE_TYPES,
  SERVICE_ZONES,
  WEATHER_CONDITIONS,
  formatCOP,
} from "@/types/washingRecord";

export const Route = createFileRoute("/historial")({
  head: () => ({
    meta: [
      { title: "Historial de lavados — MotoClean Analytics" },
      {
        name: "description",
        content:
          "Consulta, filtra, edita y exporta en CSV o JSON los lavados registrados en MotoClean.",
      },
      { property: "og:title", content: "Historial de lavados — MotoClean Analytics" },
      {
        property: "og:description",
        content: "Historial filtrable y exportable de los lavados de MotoClean.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistorialPage,
});

const selectCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function HistorialPage() {
  const { records, remove, restoreDemo, clearAll } = useWashingRecords();
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");
  const [service, setService] = useState("");
  const [type, setType] = useState("");
  const [weather, setWeather] = useState("");
  const [zone, setZone] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return records.filter((r) => {
      if (date && r.date !== date) return false;
      if (service && r.serviceType !== service) return false;
      if (type && r.motorcycleType !== type) return false;
      if (weather && r.weatherCondition !== weather) return false;
      if (zone && r.serviceZone !== zone) return false;
      if (query) {
        const hay =
          `${r.motorcycleBrand} ${r.motorcycleModel} ${r.motorcycleColor} ${r.serviceType} ${r.serviceZone} ${r.motorcycleNotes}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [records, q, date, service, type, weather, zone]);

  function handleDelete(id: string) {
    if (confirm("¿Eliminar este registro?")) remove(id);
  }

  return (
    <AppLayout>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Historial</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} de {records.length} registros
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => exportService.exportCsv(filtered)}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4" /> Exportar CSV
          </button>
          <button
            onClick={() => exportService.exportJson(filtered)}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
          >
            <FileJson className="h-4 w-4" /> Exportar JSON
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => {
            if (
              confirm(
                "Esto reemplazará todos los registros por datos de demostración. ¿Continuar?",
              )
            )
              restoreDemo();
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Restaurar datos demo
        </button>
        <button
          onClick={() => {
            if (confirm("¿Borrar todos los registros de este dispositivo?"))
              clearAll();
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" /> Borrar todo
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3 md:grid-cols-3 lg:grid-cols-6">
        <div className="relative col-span-2 md:col-span-3 lg:col-span-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar por marca, modelo, color, zona…"
            className={`${selectCls} pl-9`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <input
          type="date"
          className={selectCls}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Filtrar por fecha"
        />
        <select className={selectCls} value={service} onChange={(e) => setService(e.target.value)} aria-label="Servicio">
          <option value="">Todos los servicios</option>
          {SERVICE_TYPES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className={selectCls} value={type} onChange={(e) => setType(e.target.value)} aria-label="Tipo de moto">
          <option value="">Todos los tipos</option>
          {MOTORCYCLE_TYPES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className={selectCls} value={weather} onChange={(e) => setWeather(e.target.value)} aria-label="Clima">
          <option value="">Todo clima</option>
          {WEATHER_CONDITIONS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className={selectCls} value={zone} onChange={(e) => setZone(e.target.value)} aria-label="Zona">
          <option value="">Todas las zonas</option>
          {SERVICE_ZONES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button
          onClick={() => {
            setQ(""); setDate(""); setService(""); setType(""); setWeather(""); setZone("");
          }}
          className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
        >
          Limpiar filtros
        </button>
      </div>

      {records.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
          <Database className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Aún no hay lavados registrados.
          </p>
          <div className="flex gap-2">
            <Link to="/registrar" className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
              Registrar lavado
            </Link>
            <button onClick={restoreDemo} className="rounded-lg border border-border px-3 py-2 text-sm">
              Cargar datos demo
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Tabla escritorio */}
          <div className="mt-4 hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  {["Fecha", "Hora", "Servicio", "Moto", "Tipo", "Valor", "Costo", "Utilidad", "Clima", "Zona", ""].map((h) => (
                    <th key={h} className="px-3 py-2.5 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {r.date}
                      {r.isDemo && <span className="ml-1.5 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">demo</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">{r.startTime}–{r.endTime}</td>
                    <td className="px-3 py-2.5">{r.serviceType}</td>
                    <td className="px-3 py-2.5">{r.motorcycleBrand} {r.motorcycleModel}</td>
                    <td className="px-3 py-2.5">{r.motorcycleType}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{formatCOP(r.price)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{formatCOP(r.cost)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-primary">{formatCOP(r.profit)}</td>
                    <td className="px-3 py-2.5">{r.weatherCondition}</td>
                    <td className="px-3 py-2.5">{r.serviceZone.replace("Bogotá – ", "")}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <RowActions id={r.id} onDelete={handleDelete} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tarjetas móvil */}
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:hidden">
            {filtered.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{r.serviceType}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.date} · {r.startTime}–{r.endTime} ({r.durationMinutes} min)
                      {r.isDemo && " · demo"}
                    </p>
                  </div>
                  <RowActions id={r.id} onDelete={handleDelete} />
                </div>
                <p className="mt-2 text-sm">
                  {r.motorcycleBrand} {r.motorcycleModel} · {r.motorcycleType}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.serviceZone} · {r.weatherCondition}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-secondary/60 p-2 text-center text-xs">
                  <div><p className="text-muted-foreground">Valor</p><p className="font-semibold">{formatCOP(r.price)}</p></div>
                  <div><p className="text-muted-foreground">Costo</p><p className="font-semibold">{formatCOP(r.cost)}</p></div>
                  <div><p className="text-muted-foreground">Utilidad</p><p className="font-semibold text-primary">{formatCOP(r.profit)}</p></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </AppLayout>
  );
}

function RowActions({ id, onDelete }: { id: string; onDelete: (id: string) => void }) {
  return (
    <div className="flex gap-1">
      <Link
        to="/registrar"
        search={{ edit: id }}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
        aria-label="Editar"
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <button
        onClick={() => onDelete(id)}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label="Eliminar"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
