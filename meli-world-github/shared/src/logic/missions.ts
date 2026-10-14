/** Motor de missões: puro, sem efeitos colaterais — fácil de testar. */
import { GameEvent, MISSION_BY_ID, MISSIONS, MissionDef, ObjectiveDef } from "../data/missions";
import type { MissionProgress } from "../types";

export interface MissionBook {
  level: number;
  active: MissionProgress[];
  completed: string[]; // ids concluídos (permanentes)
  dailyDone: string[]; // ids diários concluídos hoje
}

export function objectiveMatches(obj: ObjectiveDef, ev: GameEvent): boolean {
  if (obj.type !== ev.type) return false;
  if (!obj.filter) return true;
  return Object.entries(obj.filter).every(([k, v]) => ev[k] === v);
}

export function isMissionComplete(def: MissionDef, mp: MissionProgress): boolean {
  return def.objectives.every((o) => (mp.progress[o.id] ?? 0) >= o.count);
}

/** Aplica um evento; retorna ids das missões que mudaram e das que foram concluídas. */
export function applyEvent(book: MissionBook, ev: GameEvent): { changed: string[]; completed: string[] } {
  const changed: string[] = [];
  const completed: string[] = [];
  for (const mp of book.active) {
    const def = MISSION_BY_ID[mp.id];
    if (!def) continue;
    let touched = false;
    for (const obj of def.objectives) {
      const cur = mp.progress[obj.id] ?? 0;
      if (cur >= obj.count) continue;
      if (objectiveMatches(obj, ev)) {
        mp.progress[obj.id] = Math.min(obj.count, cur + (ev.amount ?? 1));
        touched = true;
      }
    }
    if (touched) {
      changed.push(mp.id);
      if (isMissionComplete(def, mp)) completed.push(mp.id);
    }
  }
  return { changed, completed };
}

export function canAccept(book: MissionBook, def: MissionDef): boolean {
  if (book.active.some((m) => m.id === def.id)) return false;
  if (!def.daily && book.completed.includes(def.id)) return false;
  if (def.daily && book.dailyDone.includes(def.id)) return false;
  if (def.requires?.level && book.level < def.requires.level) return false;
  if (def.requires?.missions && !def.requires.missions.every((id) => book.completed.includes(id))) return false;
  return true;
}

export function availableMissions(book: MissionBook, giver?: string): MissionDef[] {
  return MISSIONS.filter((m) => (giver === undefined || m.giver === giver) && canAccept(book, m));
}

export function startMission(book: MissionBook, def: MissionDef, now: number): MissionProgress {
  const mp: MissionProgress = { id: def.id, progress: {}, startedAt: now };
  if (def.timeLimit) mp.deadline = now + def.timeLimit;
  for (const o of def.objectives) mp.progress[o.id] = 0;
  book.active.push(mp);
  return mp;
}

export function finishMission(book: MissionBook, id: string): MissionDef | null {
  const i = book.active.findIndex((m) => m.id === id);
  if (i < 0) return null;
  book.active.splice(i, 1);
  const def = MISSION_BY_ID[id];
  if (!def) return null;
  if (def.daily) {
    if (!book.dailyDone.includes(id)) book.dailyDone.push(id);
  } else if (!book.completed.includes(id)) book.completed.push(id);
  return def;
}

export function expireMissions(book: MissionBook, now: number): string[] {
  const failed: string[] = [];
  book.active = book.active.filter((m) => {
    if (m.deadline !== undefined && now > m.deadline) {
      failed.push(m.id);
      return false;
    }
    return true;
  });
  return failed;
}
