// Exportación de datos a CSV y JSON para análisis en Excel, Power BI,
// Python/Pandas. Los datos nunca se envían a ningún servidor: la descarga
// ocurre completamente en el navegador.

import type { WashingRecord } from "@/types/washingRecord";

const CSV_HEADERS = [
  "id",
  "date",
  "start_time",
  "end_time",
  "duration_minutes",
  "service_type",
  "price_cop",
  "cost_cop",
  "profit_cop",
  "motorcycle_brand",
  "motorcycle_model",
  "motorcycle_year",
  "engine_capacity_cc",
  "motorcycle_type",
  "motorcycle_color",
  "motorcycle_notes",
  "service_zone",
  "weather_condition",
  "temperature_c",
  "precipitation_mm",
  "humidity_pct",
  "created_at",
] as const;

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(records: WashingRecord[]): string {
  const rows = records.map((r) =>
    [
      r.id,
      r.date,
      r.startTime,
      r.endTime,
      r.durationMinutes,
      r.serviceType,
      r.price,
      r.cost,
      r.profit,
      r.motorcycleBrand,
      r.motorcycleModel,
      r.motorcycleYear,
      r.engineCapacity,
      r.motorcycleType,
      r.motorcycleColor,
      r.motorcycleNotes,
      r.serviceZone,
      r.weatherCondition,
      r.temperature,
      r.precipitation,
      r.humidity,
      r.createdAt,
    ]
      .map(csvEscape)
      .join(","),
  );
  return [CSV_HEADERS.join(","), ...rows].join("\n");
}

function download(filename: string, content: string, mime: string): void {
  const blob = new Blob(["\uFEFF" + content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const exportService = {
  exportCsv(records: WashingRecord[]): void {
    download("motoclean_washing_data.csv", toCsv(records), "text/csv");
  },

  exportJson(records: WashingRecord[]): void {
    download(
      "motoclean_washing_data.json",
      JSON.stringify(records, null, 2),
      "application/json",
    );
  },
};
