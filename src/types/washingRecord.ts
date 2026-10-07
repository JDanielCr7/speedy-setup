// MotoClean Analytics — Modelo de datos principal
// Estructura pensada para exportarse a CSV/JSON y procesarse con Python/Pandas.

export interface WashingRecord {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  durationMinutes: number; // calculado automáticamente
  serviceType: string;
  price: number; // COP
  cost: number; // COP
  profit: number; // calculado: price - cost

  motorcycleBrand: string;
  motorcycleModel: string;
  motorcycleYear: number | null;
  engineCapacity: number | null; // cc
  motorcycleType: string;
  motorcycleColor: string;
  motorcycleNotes: string;

  serviceZone: string;

  weatherCondition: string;
  temperature: number | null; // °C
  precipitation: number | null; // mm
  humidity: number | null; // %

  createdAt: string; // ISO
  isDemo?: boolean;
}

export const SERVICE_TYPES = [
  "Lavado básico",
  "Lavado premium",
  "Lavado completo",
  "Lavado + encerado",
  "Otro",
] as const;

export const MOTORCYCLE_BRANDS = [
  "Bajaj",
  "Yamaha",
  "Suzuki",
  "Honda",
  "AKT",
  "KTM",
  "BMW",
  "Kawasaki",
  "Otra",
] as const;

export const MOTORCYCLE_TYPES = [
  "Naked",
  "Deportiva",
  "Scooter",
  "Street",
  "Adventure",
  "Enduro",
  "Touring",
  "Cruiser",
  "Otra",
] as const;

export const SERVICE_ZONES = [
  "Bogotá – Engativá",
  "Bogotá – Suba",
  "Bogotá – Kennedy",
  "Bogotá – Fontibón",
  "Bogotá – Chapinero",
  "Bogotá – Usaquén",
  "Bogotá – Teusaquillo",
  "Otra",
] as const;

export const WEATHER_CONDITIONS = [
  "Soleado",
  "Parcialmente nublado",
  "Nublado",
  "Lluvia ligera",
  "Lluvia moderada",
  "Lluvia fuerte",
] as const;

export function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function computeDurationMinutes(start: string, end: string): number {
  const [sh = 0, sm = 0] = start.split(":").map(Number);
  const [eh = 0, em = 0] = end.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}
