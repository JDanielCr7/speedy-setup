// Datos de demostración para MotoClean Analytics.
// Se generan de forma perezosa (lazy) para no ejecutar aleatoriedad en el
// ámbito de módulo. Estos registros se marcan con isDemo: true y deben
// presentarse siempre como "Datos de demostración", nunca como datos reales.

import {
  MOTORCYCLE_BRANDS,
  MOTORCYCLE_TYPES,
  SERVICE_TYPES,
  SERVICE_ZONES,
  WEATHER_CONDITIONS,
  computeDurationMinutes,
  type WashingRecord,
} from "@/types/washingRecord";

// PRNG determinista (mulberry32) para que los datos demo sean estables.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MODELS: Record<string, string[]> = {
  Bajaj: ["NS200", "Pulsar 150", "Dominar 400", "Boxer CT100"],
  Yamaha: ["FZ25", "MT-03", "NMAX 155", "YZF-R3"],
  Suzuki: ["Gixxer 250", "GN125", "V-Strom 650"],
  Honda: ["CB190R", "CB500F", "XR190L", "PCX 160"],
  AKT: ["NKD 125", "TT200", "CR5 200"],
  KTM: ["Duke 200", "Duke 390", "RC 200"],
  BMW: ["G310R", "F750GS"],
  Kawasaki: ["Z400", "Ninja 400", "Versys 300"],
  Otra: ["Genérico"],
};

const COLORS = ["Negro", "Rojo", "Azul", "Blanco", "Gris", "Verde", "Naranja"];

const PRICE_BY_SERVICE: Record<string, [number, number]> = {
  "Lavado básico": [15000, 20000],
  "Lavado premium": [25000, 35000],
  "Lavado completo": [35000, 45000],
  "Lavado + encerado": [40000, 55000],
  Otro: [18000, 30000],
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function generateDemoRecords(count = 45): WashingRecord[] {
  const rand = mulberry32(20261006);
  const pick = <T,>(arr: readonly T[]): T =>
    arr[Math.floor(rand() * arr.length)] as T;
  const between = (min: number, max: number) =>
    Math.round(min + rand() * (max - min));

  const today = new Date();
  const records: WashingRecord[] = [];

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(rand() * 21); // últimas 3 semanas
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const startHour = 7 + Math.floor(rand() * 11); // 7:00 - 17:00
    const startMin = pick([0, 15, 30, 45] as const);
    const duration = between(25, 90);
    const endTotal = startHour * 60 + startMin + duration;
    const startTime = `${pad(startHour)}:${pad(startMin)}`;
    const endTime = `${pad(Math.floor(endTotal / 60))}:${pad(endTotal % 60)}`;

    const serviceType = pick(SERVICE_TYPES);
    const [pMin, pMax] = PRICE_BY_SERVICE[serviceType] ?? [15000, 30000];
    const price = Math.round(between(pMin, pMax) / 500) * 500;
    const cost = Math.round((price * (0.25 + rand() * 0.2)) / 500) * 500;

    const brand = pick(MOTORCYCLE_BRANDS);
    const weather = pick(WEATHER_CONDITIONS);
    const isRain = weather.startsWith("Lluvia");

    records.push({
      id: `demo-${i + 1}`,
      date,
      startTime,
      endTime,
      durationMinutes: computeDurationMinutes(startTime, endTime),
      serviceType,
      price,
      cost,
      profit: price - cost,
      motorcycleBrand: brand,
      motorcycleModel: pick(MODELS[brand] ?? ["Genérico"]),
      motorcycleYear: between(2012, 2026),
      engineCapacity: pick([100, 125, 150, 200, 250, 300, 400, 650] as const),
      motorcycleType: pick(MOTORCYCLE_TYPES),
      motorcycleColor: pick(COLORS),
      motorcycleNotes: "",
      serviceZone: pick(SERVICE_ZONES),
      weatherCondition: weather,
      temperature: isRain ? between(12, 18) : between(16, 28),
      precipitation: isRain ? between(2, 25) : 0,
      humidity: isRain ? between(75, 95) : between(45, 75),
      createdAt: new Date(d.getTime() + startHour * 3600000).toISOString(),
      isDemo: true,
    });
  }

  return records.sort((a, b) =>
    `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`),
  );
}
