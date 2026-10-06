// Estadísticas descriptivas calculadas directamente de los registros.
// Sin machine learning: solo agregaciones para el dashboard y la sección Análisis.

import type { WashingRecord } from "@/types/washingRecord";

export interface DayBucket {
  label: string;
  value: number;
}

function dateKey(date: string): string {
  return date; // YYYY-MM-DD
}

function lastNDays(n: number): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }
  return days;
}

export const analyticsService = {
  summary(records: WashingRecord[]) {
    const totalWashes = records.length;
    const totalRevenue = records.reduce((s, r) => s + r.price, 0);
    const totalCost = records.reduce((s, r) => s + r.cost, 0);
    const totalProfit = records.reduce((s, r) => s + r.profit, 0);
    const totalDuration = records.reduce((s, r) => s + r.durationMinutes, 0);
    return {
      totalWashes,
      totalRevenue,
      totalCost,
      totalProfit,
      avgTicket: totalWashes ? totalRevenue / totalWashes : 0,
      avgProfit: totalWashes ? totalProfit / totalWashes : 0,
      avgMargin:
        totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      avgDuration: totalWashes ? totalDuration / totalWashes : 0,
    };
  },

  today(records: WashingRecord[]) {
    const key = lastNDays(1)[0];
    const todayRecords = records.filter((r) => dateKey(r.date) === key);
    return {
      washes: todayRecords.length,
      revenue: todayRecords.reduce((s, r) => s + r.price, 0),
      profit: todayRecords.reduce((s, r) => s + r.profit, 0),
    };
  },

  last7Days(records: WashingRecord[]) {
    const keys = lastNDays(7);
    const inRange = records.filter((r) => keys.includes(dateKey(r.date)));
    return {
      washes: inRange.length,
      revenue: inRange.reduce((s, r) => s + r.price, 0),
    };
  },

  washesByDay(records: WashingRecord[], days = 14): DayBucket[] {
    const keys = lastNDays(days);
    return keys.map((k) => ({
      label: k.slice(5), // MM-DD
      value: records.filter((r) => dateKey(r.date) === k).length,
    }));
  },

  revenueByDay(records: WashingRecord[], days = 14): DayBucket[] {
    const keys = lastNDays(days);
    return keys.map((k) => ({
      label: k.slice(5),
      value: records
        .filter((r) => dateKey(r.date) === k)
        .reduce((s, r) => s + r.price, 0),
    }));
  },

  washesByHour(records: WashingRecord[]): DayBucket[] {
    const buckets = new Map<number, number>();
    for (const r of records) {
      const h = Number(r.startTime.split(":")[0]);
      buckets.set(h, (buckets.get(h) ?? 0) + 1);
    }
    return Array.from({ length: 24 }, (_, h) => ({
      label: `${h}h`,
      value: buckets.get(h) ?? 0,
    })).filter((b) => b.value > 0 || (Number(b.label.slice(0, -1)) >= 6 && Number(b.label.slice(0, -1)) <= 20));
  },

  washesByMotorcycleType(records: WashingRecord[]): DayBucket[] {
    const map = new Map<string, number>();
    for (const r of records)
      map.set(r.motorcycleType, (map.get(r.motorcycleType) ?? 0) + 1);
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  },

  demandByWeekday(records: WashingRecord[]): DayBucket[] {
    const names = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];
    const counts = new Array(7).fill(0);
    for (const r of records) {
      const d = new Date(`${r.date}T12:00:00`);
      counts[d.getDay()]++;
    }
    const order = [1, 2, 3, 4, 5, 6, 0]; // Lunes primero
    return order.map((i) => ({ label: names[i], value: counts[i] }));
  },

  demandByWeather(records: WashingRecord[]): DayBucket[] {
    const groups: Record<string, string[]> = {
      Soleado: ["Soleado"],
      Nublado: ["Parcialmente nublado", "Nublado"],
      Lluvia: ["Lluvia ligera", "Lluvia moderada", "Lluvia fuerte"],
    };
    return Object.entries(groups).map(([label, conditions]) => ({
      label,
      value: records.filter((r) => conditions.includes(r.weatherCondition))
        .length,
    }));
  },

  byCategory(records: WashingRecord[], key: keyof WashingRecord): DayBucket[] {
    const map = new Map<string, number>();
    for (const r of records) {
      const k = String(r[key] ?? "Sin dato");
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  },
};
