/**
 * Persistência. Interface única com duas implementações:
 *  - SQLite (better-sqlite3)  -> padrão, zero configuração, arquivo data/meli-world.db
 *  - JSON em disco            -> fallback automático se o módulo nativo não estiver disponível
 * Para produção, implemente esta mesma interface com PostgreSQL (ver docs/ARQUITETURA.md).
 */
import fs from "fs";
import path from "path";

export type { PlayerRecord, HistoryEntry, Repo } from "./types";
import type { PlayerRecord, HistoryEntry, Repo } from "./types";

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, "..", "..", "data"));

class SqliteRepo implements Repo {
  readonly kind = "sqlite";
  private db: any;
  constructor(Database: any) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    this.db = new Database(path.join(DATA_DIR, "meli-world.db"));
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        xp INTEGER NOT NULL DEFAULT 0,
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS kv (
        k TEXT PRIMARY KEY,
        v TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT NOT NULL,
        ts INTEGER NOT NULL,
        type TEXT NOT NULL,
        text TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_history_player ON history(player_id, ts DESC);
      CREATE INDEX IF NOT EXISTS idx_players_xp ON players(xp DESC);
    `);
  }
  async load(id: string) {
    const row = this.db.prepare("SELECT data FROM players WHERE id = ?").get(id);
    return row ? (JSON.parse(row.data) as PlayerRecord) : null;
  }
  async save(rec: PlayerRecord) {
    rec.updatedAt = Date.now();
    this.db
      .prepare(
        `INSERT INTO players (id, name, xp, data, created_at, updated_at) VALUES (@id, @name, @xp, @data, @createdAt, @updatedAt)
         ON CONFLICT(id) DO UPDATE SET name=excluded.name, xp=excluded.xp, data=excluded.data, updated_at=excluded.updated_at`,
      )
      .run({ id: rec.id, name: rec.name, xp: rec.xp, data: JSON.stringify(rec), createdAt: rec.createdAt, updatedAt: rec.updatedAt });
  }
  async addHistory(id: string, type: string, text: string) {
    this.db.prepare("INSERT INTO history (player_id, ts, type, text) VALUES (?, ?, ?, ?)").run(id, Date.now(), type, text);
  }
  async history(id: string, limit: number) {
    return this.db.prepare("SELECT ts, type, text FROM history WHERE player_id = ? ORDER BY ts DESC LIMIT ?").all(id, limit) as HistoryEntry[];
  }
  async leaderboard(limit: number) {
    return this.db.prepare("SELECT name, xp FROM players ORDER BY xp DESC LIMIT ?").all(limit) as { name: string; xp: number }[];
  }
  async kvGet(key: string) {
    const row = this.db.prepare("SELECT v FROM kv WHERE k = ?").get(key);
    return row ? JSON.parse(row.v) : null;
  }
  async kvSet(key: string, value: unknown) {
    this.db.prepare("INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v=excluded.v").run(key, JSON.stringify(value));
  }
}

class JsonRepo implements Repo {
  readonly kind = "json";
  private file = path.join(DATA_DIR, "meli-world.json");
  private data: { players: Record<string, PlayerRecord>; history: Record<string, HistoryEntry[]>; kv?: Record<string, unknown> } = { players: {}, history: {}, kv: {} };
  private timer: NodeJS.Timeout | null = null;
  constructor() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(this.file)) {
      try {
        this.data = JSON.parse(fs.readFileSync(this.file, "utf8"));
      } catch {
        console.warn("[repo] arquivo JSON corrompido; iniciando vazio");
      }
    }
  }
  private flush() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      fs.writeFileSync(this.file + ".tmp", JSON.stringify(this.data));
      fs.renameSync(this.file + ".tmp", this.file);
    }, 500);
  }
  async load(id: string) {
    const r = this.data.players[id];
    return r ? (JSON.parse(JSON.stringify(r)) as PlayerRecord) : null;
  }
  async save(rec: PlayerRecord) {
    rec.updatedAt = Date.now();
    this.data.players[rec.id] = JSON.parse(JSON.stringify(rec));
    this.flush();
  }
  async addHistory(id: string, type: string, text: string) {
    const list = (this.data.history[id] ||= []);
    list.unshift({ ts: Date.now(), type, text });
    if (list.length > 200) list.length = 200;
    this.flush();
  }
  async history(id: string, limit: number) {
    return (this.data.history[id] || []).slice(0, limit);
  }
  async kvGet(key: string) {
    const v = (this.data.kv ||= {})[key];
    return v === undefined ? null : JSON.parse(JSON.stringify(v));
  }
  async kvSet(key: string, value: unknown) {
    (this.data.kv ||= {})[key] = JSON.parse(JSON.stringify(value));
    this.flush();
  }
  async leaderboard(limit: number) {
    return Object.values(this.data.players)
      .sort((a, b) => b.xp - a.xp)
      .slice(0, limit)
      .map((p) => ({ name: p.name, xp: p.xp }));
  }
}

/** Repositório em memória (testes). */
export class MemoryRepo extends JsonRepo {
  constructor() {
    super();
    (this as any).flush = () => {};
    (this as any).data = { players: {}, history: {}, kv: {} };
  }
}

export function createRepo(): Repo {
  if (process.env.DB === "json") return new JsonRepo();
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Database = require("better-sqlite3");
    const repo = new SqliteRepo(Database);
    console.log(`[repo] SQLite em ${path.join(DATA_DIR, "meli-world.db")}`);
    return repo;
  } catch (e) {
    console.warn("[repo] better-sqlite3 indisponível — usando JSON em disco. Motivo:", (e as Error).message);
    return new JsonRepo();
  }
}
