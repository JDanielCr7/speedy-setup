import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Save } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useWashingRecords } from "@/hooks/useWashingRecords";
import {
  MOTORCYCLE_BRANDS,
  MOTORCYCLE_TYPES,
  SERVICE_TYPES,
  SERVICE_ZONES,
  WEATHER_CONDITIONS,
  computeDurationMinutes,
  formatCOP,
} from "@/types/washingRecord";

export const Route = createFileRoute("/registrar")({
  validateSearch: (search: Record<string, unknown>) => ({
    edit: typeof search.edit === "string" ? search.edit : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Registrar lavado — MotoClean Analytics" },
      {
        name: "description",
        content:
          "Registra un lavado de motocicleta con datos del servicio, la moto, la zona y el clima.",
      },
      { property: "og:title", content: "Registrar lavado — MotoClean Analytics" },
      {
        property: "og:description",
        content: "Captura rápida de datos de lavados para MotoClean.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegistrarPage,
});

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const inputCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30";
const labelCls = "mb-1 block text-xs font-medium text-muted-foreground";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function RegistrarPage() {
  const { edit } = Route.useSearch();
  const navigate = useNavigate();
  const { records, create, update } = useWashingRecords();
  const editing = useMemo(
    () => (edit ? records.find((r) => r.id === edit) : undefined),
    [edit, records],
  );

  const [form, setForm] = useState({
    date: todayStr(),
    startTime: nowTime(),
    endTime: "",
    serviceType: SERVICE_TYPES[0] as string,
    price: "",
    cost: "",
    motorcycleBrand: MOTORCYCLE_BRANDS[0] as string,
    motorcycleModel: "",
    motorcycleYear: "",
    engineCapacity: "",
    motorcycleType: MOTORCYCLE_TYPES[0] as string,
    motorcycleColor: "",
    motorcycleNotes: "",
    serviceZone: SERVICE_ZONES[0] as string,
    weatherCondition: WEATHER_CONDITIONS[0] as string,
    temperature: "",
    precipitation: "",
    humidity: "",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!editing) return;
    setForm({
      date: editing.date,
      startTime: editing.startTime,
      endTime: editing.endTime,
      serviceType: editing.serviceType,
      price: String(editing.price),
      cost: String(editing.cost),
      motorcycleBrand: editing.motorcycleBrand,
      motorcycleModel: editing.motorcycleModel,
      motorcycleYear: editing.motorcycleYear?.toString() ?? "",
      engineCapacity: editing.engineCapacity?.toString() ?? "",
      motorcycleType: editing.motorcycleType,
      motorcycleColor: editing.motorcycleColor,
      motorcycleNotes: editing.motorcycleNotes,
      serviceZone: editing.serviceZone,
      weatherCondition: editing.weatherCondition,
      temperature: editing.temperature?.toString() ?? "",
      precipitation: editing.precipitation?.toString() ?? "",
      humidity: editing.humidity?.toString() ?? "",
    });
  }, [editing]);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const duration =
    form.startTime && form.endTime
      ? computeDurationMinutes(form.startTime, form.endTime)
      : null;
  const price = Number(form.price) || 0;
  const cost = Number(form.cost) || 0;
  const profit = price - cost;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    if (!form.date) errs.push("La fecha es obligatoria.");
    if (!form.startTime) errs.push("La hora de inicio es obligatoria.");
    if (!form.endTime) errs.push("La hora de finalización es obligatoria.");
    if (duration !== null && duration <= 0)
      errs.push("La hora final no puede ser anterior o igual a la inicial.");
    if (price <= 0) errs.push("El valor cobrado debe ser mayor que 0.");
    if (cost < 0) errs.push("El costo no puede ser negativo.");
    const year = form.motorcycleYear ? Number(form.motorcycleYear) : null;
    if (year !== null && (year < 1950 || year > new Date().getFullYear() + 1))
      errs.push("El año de la motocicleta no es válido.");
    const cc = form.engineCapacity ? Number(form.engineCapacity) : null;
    if (cc !== null && (cc <= 0 || cc > 3000))
      errs.push("El cilindraje no es válido.");
    const temp = form.temperature ? Number(form.temperature) : null;
    if (temp !== null && (temp < -20 || temp > 50))
      errs.push("La temperatura debe estar entre -20 y 50 °C.");
    const hum = form.humidity ? Number(form.humidity) : null;
    if (hum !== null && (hum < 0 || hum > 100))
      errs.push("La humedad debe estar entre 0 y 100 %.");
    const prec = form.precipitation ? Number(form.precipitation) : null;
    if (prec !== null && prec < 0)
      errs.push("La precipitación no puede ser negativa.");

    setErrors(errs);
    if (errs.length > 0) return;

    const record = {
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      durationMinutes: duration ?? 0,
      serviceType: form.serviceType,
      price,
      cost,
      profit,
      motorcycleBrand: form.motorcycleBrand,
      motorcycleModel: form.motorcycleModel.trim(),
      motorcycleYear: year,
      engineCapacity: cc,
      motorcycleType: form.motorcycleType,
      motorcycleColor: form.motorcycleColor.trim(),
      motorcycleNotes: form.motorcycleNotes.trim(),
      serviceZone: form.serviceZone,
      weatherCondition: form.weatherCondition,
      temperature: temp,
      precipitation: prec,
      humidity: hum,
      isDemo: false,
    };

    if (editing) {
      update(editing.id, record);
      navigate({ to: "/historial" });
      return;
    }
    create(record);
    setSaved(true);
    setForm((f) => ({
      ...f,
      startTime: nowTime(),
      endTime: "",
      price: "",
      cost: "",
      motorcycleModel: "",
      motorcycleYear: "",
      engineCapacity: "",
      motorcycleColor: "",
      motorcycleNotes: "",
      temperature: "",
      precipitation: "",
      humidity: "",
    }));
    setTimeout(() => setSaved(false), 4000);
  }

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold tracking-tight">
        {editing ? "Editar lavado" : "Registrar lavado"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Captura rápida optimizada para celular. Los campos de duración y
        utilidad se calculan automáticamente.
      </p>

      {saved && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5 text-sm text-primary">
          <CheckCircle2 className="h-4 w-4" />
          Lavado registrado correctamente.
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <p className="font-semibold">Revisa los siguientes campos:</p>
          <ul className="mt-1 list-inside list-disc">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Datos del servicio</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
            <Field label="Fecha *">
              <input
                type="date"
                className={inputCls}
                value={form.date}
                onChange={(e) => set("date")(e.target.value)}
              />
            </Field>
            <Field label="Hora de inicio *">
              <input
                type="time"
                className={inputCls}
                value={form.startTime}
                onChange={(e) => set("startTime")(e.target.value)}
              />
            </Field>
            <Field label="Hora de finalización *">
              <input
                type="time"
                className={inputCls}
                value={form.endTime}
                onChange={(e) => set("endTime")(e.target.value)}
              />
            </Field>
            <Field label="Servicio realizado *">
              <select
                className={inputCls}
                value={form.serviceType}
                onChange={(e) => set("serviceType")(e.target.value)}
              >
                {SERVICE_TYPES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Valor cobrado (COP) *">
              <input
                type="number"
                min={0}
                step={500}
                inputMode="numeric"
                placeholder="25000"
                className={inputCls}
                value={form.price}
                onChange={(e) => set("price")(e.target.value)}
              />
            </Field>
            <Field label="Costo estimado (COP)">
              <input
                type="number"
                min={0}
                step={500}
                inputMode="numeric"
                placeholder="8000"
                className={inputCls}
                value={form.cost}
                onChange={(e) => set("cost")(e.target.value)}
              />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
            <span>
              Duración:{" "}
              <strong className="text-foreground">
                {duration !== null && duration > 0 ? `${duration} min` : "—"}
              </strong>
            </span>
            <span>
              Utilidad:{" "}
              <strong className="text-foreground">
                {price > 0 ? formatCOP(profit) : "—"}
              </strong>
            </span>
            <span>
              Margen:{" "}
              <strong className="text-foreground">
                {price > 0 ? `${((profit / price) * 100).toFixed(1)} %` : "—"}
              </strong>
            </span>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Motocicleta</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
            <Field label="Marca">
              <select
                className={inputCls}
                value={form.motorcycleBrand}
                onChange={(e) => set("motorcycleBrand")(e.target.value)}
              >
                {MOTORCYCLE_BRANDS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </Field>
            <Field label="Modelo">
              <input
                type="text"
                placeholder="NS200"
                className={inputCls}
                value={form.motorcycleModel}
                onChange={(e) => set("motorcycleModel")(e.target.value)}
              />
            </Field>
            <Field label="Año">
              <input
                type="number"
                inputMode="numeric"
                placeholder="2022"
                className={inputCls}
                value={form.motorcycleYear}
                onChange={(e) => set("motorcycleYear")(e.target.value)}
              />
            </Field>
            <Field label="Cilindraje (cc)">
              <input
                type="number"
                inputMode="numeric"
                placeholder="200"
                className={inputCls}
                value={form.engineCapacity}
                onChange={(e) => set("engineCapacity")(e.target.value)}
              />
            </Field>
            <Field label="Tipo de motocicleta">
              <select
                className={inputCls}
                value={form.motorcycleType}
                onChange={(e) => set("motorcycleType")(e.target.value)}
              >
                {MOTORCYCLE_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Color">
              <input
                type="text"
                placeholder="Negro"
                className={inputCls}
                value={form.motorcycleColor}
                onChange={(e) => set("motorcycleColor")(e.target.value)}
              />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Observaciones (opcional)">
              <textarea
                rows={2}
                placeholder="Ej.: motocicleta con bastante suciedad en cadena."
                className={inputCls}
                value={form.motorcycleNotes}
                onChange={(e) => set("motorcycleNotes")(e.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Ubicación y clima</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
            <Field label="Zona / localidad">
              <select
                className={inputCls}
                value={form.serviceZone}
                onChange={(e) => set("serviceZone")(e.target.value)}
              >
                {SERVICE_ZONES.map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </select>
            </Field>
            <Field label="Estado del clima">
              <select
                className={inputCls}
                value={form.weatherCondition}
                onChange={(e) => set("weatherCondition")(e.target.value)}
              >
                {WEATHER_CONDITIONS.map((w) => (
                  <option key={w}>{w}</option>
                ))}
              </select>
            </Field>
            <Field label="Temperatura aprox. (°C)">
              <input
                type="number"
                inputMode="decimal"
                placeholder="22"
                className={inputCls}
                value={form.temperature}
                onChange={(e) => set("temperature")(e.target.value)}
              />
            </Field>
            <Field label="Precipitación (mm)">
              <input
                type="number"
                min={0}
                inputMode="decimal"
                placeholder="0"
                className={inputCls}
                value={form.precipitation}
                onChange={(e) => set("precipitation")(e.target.value)}
              />
            </Field>
            <Field label="Humedad (%)">
              <input
                type="number"
                min={0}
                max={100}
                inputMode="numeric"
                placeholder="60"
                className={inputCls}
                value={form.humidity}
                onChange={(e) => set("humidity")(e.target.value)}
              />
            </Field>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            En una versión futura estos datos se obtendrán automáticamente
            desde una API meteorológica.
          </p>
        </section>

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Save className="h-5 w-5" />
          {editing ? "Guardar cambios" : "Guardar lavado"}
        </button>
      </form>
    </AppLayout>
  );
}
