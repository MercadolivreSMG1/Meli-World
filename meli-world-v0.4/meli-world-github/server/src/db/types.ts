/** Tipos de persistência (sem dependências de Node — usados também no modo solo do navegador). */
import type { Appearance, MissionProgress } from "../../../shared/src";

export interface PlayerRecord {
  id: string;
  name: string;
  look: Appearance;
  x: number;
  y: number;
  xp: number;
  energy: number;
  battery: number;
  skillPoints: number;
  skills: Record<string, number>;
  perks: string[];
  inventory: Record<string, number>;
  equipped: { epiVest: boolean; safetyShoes: boolean; coletor: boolean; weapon?: string; armor?: string };
  missions: { active: MissionProgress[]; completed: string[]; dailyDone: string[]; dailyDay: number };
  stats: Record<string, number>;
  flags: Record<string, number>;
  clockedInDay: number;
  coins?: number;
  hp?: number;
  savings?: number;
  savingsDay?: number;
  homePlot?: string;
  createdAt: number;
  updatedAt: number;
}

export interface HistoryEntry {
  ts: number;
  type: string;
  text: string;
}

export interface Repo {
  readonly kind: string;
  load(id: string): Promise<PlayerRecord | null>;
  save(rec: PlayerRecord): Promise<void>;
  addHistory(id: string, type: string, text: string): Promise<void>;
  history(id: string, limit: number): Promise<HistoryEntry[]>;
  leaderboard(limit: number): Promise<{ name: string; xp: number }[]>;
  /** armazenamento chave-valor do mundo (lotes, anúncios do Balcão, repasses) */
  kvGet(key: string): Promise<unknown | null>;
  kvSet(key: string, value: unknown): Promise<void>;
}
