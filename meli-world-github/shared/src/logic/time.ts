/** Relógio do jogo e tráfego determinístico da rua (todos os clientes veem igual sem rede). */
import { MAP_W, TILE } from "../constants";

export function dayOf(totalMin: number): number {
  return Math.floor(totalMin / 1440) + 1;
}

export function hourOf(totalMin: number): number {
  return (totalMin % 1440) / 60;
}

export function formatClock(totalMin: number): string {
  const m = Math.floor(totalMin % 1440);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function shiftName(totalMin: number): string {
  const h = hourOf(totalMin);
  if (h >= 6 && h < 14.33) return "Turno A";
  if (h >= 14.33 && h < 22) return "Turno B";
  return "Turno C (noturno)";
}

/** 0 = dia pleno, 1 = noite profunda. */
export function darkness(totalMin: number): number {
  const h = hourOf(totalMin);
  if (h >= 7 && h < 17.5) return 0;
  if (h >= 17.5 && h < 20) return (h - 17.5) / 2.5;
  if (h >= 20 || h < 4.5) return 1;
  return 1 - (h - 4.5) / 2.5;
}

export interface TrafficCar {
  id: number;
  kind: "car" | "moto" | "bus";
  x: number;
  y: number;
  dir: "left" | "right";
  variant: number;
}

const LANES = [
  { y: 75.3, dir: "left" as const, speed: 58, count: 4 },
  { y: 79.0, dir: "right" as const, speed: 66, count: 4 },
];

export function trafficAt(serverSeconds: number): TrafficCar[] {
  const span = MAP_W * TILE + 240;
  const out: TrafficCar[] = [];
  let id = 0;
  for (const lane of LANES) {
    for (let i = 0; i < lane.count; i++) {
      const offset = (i * span) / lane.count + i * 37;
      const kind = (i + (lane.dir === "left" ? 1 : 0)) % 4 === 0 ? "moto" : i === 2 && lane.dir === "right" ? "bus" : "car";
      const sp = lane.speed * (kind === "moto" ? 1.25 : kind === "bus" ? 0.8 : 1);
      const d = ((serverSeconds * sp + offset) % span + span) % span;
      const x = lane.dir === "right" ? d - 120 : span - d - 120;
      out.push({ id: id++, kind, x, y: lane.y * TILE, dir: lane.dir, variant: (i * 3 + (lane.dir === "left" ? 1 : 0)) % 6 });
    }
  }
  return out;
}
