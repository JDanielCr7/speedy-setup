// Servicio de persistencia de registros de lavado.
// Versión demo: usa localStorage. Preparado para reemplazarse por una API REST
// (VITE_API_BASE_URL) sin modificar los componentes: basta con cambiar la
// implementación de estas funciones manteniendo las mismas firmas.

import { generateDemoRecords } from "@/data/demoData";
import type { WashingRecord } from "@/types/washingRecord";

const STORAGE_KEY = "motoclean_washing_records_v1";

function readAll(): WashingRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WashingRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(records: WashingRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export const washingRecordService = {
  getAll(): WashingRecord[] {
    return readAll().sort((a, b) =>
      `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`),
    );
  },

  getById(id: string): WashingRecord | undefined {
    return readAll().find((r) => r.id === id);
  },

  create(record: Omit<WashingRecord, "id" | "createdAt">): WashingRecord {
    const records = readAll();
    const newRecord: WashingRecord = {
      ...record,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    records.push(newRecord);
    writeAll(records);
    return newRecord;
  },

  update(id: string, patch: Partial<WashingRecord>): WashingRecord | null {
    const records = readAll();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    records[idx] = { ...records[idx], ...patch, id };
    writeAll(records);
    return records[idx];
  },

  remove(id: string): boolean {
    const records = readAll();
    const next = records.filter((r) => r.id !== id);
    if (next.length === records.length) return false;
    writeAll(next);
    return true;
  },

  replaceAll(records: WashingRecord[]): void {
    writeAll(records);
  },

  restoreDemoData(): WashingRecord[] {
    const demo = generateDemoRecords(45);
    writeAll(demo);
    return demo;
  },

  clear(): void {
    writeAll([]);
  },
};
