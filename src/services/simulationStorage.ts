// Persistencia de simulaciones guardadas (LocalStorage, demo).
// Reemplazable por una API REST manteniendo las mismas firmas.

import type { SimulationScenario } from "@/types/simulation";

const KEY = "motoclean_simulations_v1";

function read(): SimulationScenario[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function write(list: SimulationScenario[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export const simulationStorage = {
  getAll(): SimulationScenario[] {
    return read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  save(s: Omit<SimulationScenario, "id" | "createdAt" | "updatedAt">, id?: string): SimulationScenario {
    const list = read();
    const now = new Date().toISOString();
    const idx = id ? list.findIndex((x) => x.id === id) : -1;
    const existing = idx >= 0 ? list[idx] : undefined;
    const item: SimulationScenario = {
      ...s,
      id: existing?.id ?? crypto.randomUUID(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (existing) list[idx] = item;
    else list.push(item);
    write(list);
    return item;
  },
  duplicate(id: string): void {
    const list = read();
    const src = list.find((x) => x.id === id);
    if (!src) return;
    const now = new Date().toISOString();
    list.push({ ...structuredClone(src), id: crypto.randomUUID(), name: `${src.name} (copia)`, createdAt: now, updatedAt: now });
    write(list);
  },
  remove(id: string): void {
    write(read().filter((x) => x.id !== id));
  },
};
