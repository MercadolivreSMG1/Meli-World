/**
 * Persistência. Interface única com três implementações:
 *  - PostgreSQL (pg)          -> quando existe DATABASE_URL (ex.: Neon/Supabase grátis + Render grátis)
 *  - SQLite (better-sqlite3)  -> padrão local, zero configuração, arquivo data/meli-world.db
 *  - JSON em disco            -> fallback automático se o módulo nativo não estiver disponível
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

/** PostgreSQL: o progresso sobrevive aos reinícios do Render grátis (disco de lá é apagado). */
class PgRepo implements Repo {
  readonly kind = "postgres";
  private pool: any;
  private ready: Promise<void>;
  constructor(Pg: any, url: string) {
    const local = /localhost|127\.0\.0\.1/.test(url);
    this.pool = new Pg.Pool({ connectionString: url, ssl: local || /sslmode=disable/.test(url) ? false : { rejectUnauthorized: false }, max: 5 });
    this.pool.on("error", (e: Error) => console.warn("[repo] erro no Postgres:", e.message));
    this.ready = this.pool
      .query(`
        CREATE TABLE IF NOT EXISTS players (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          xp INTEGER NOT NULL DEFAULT 0,
          data JSONB NOT NULL,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v JSONB NOT NULL);
        CREATE TABLE IF NOT EXISTS history (
          id BIGSERIAL PRIMARY KEY,
          player_id TEXT NOT NULL,
          ts BIGINT NOT NULL,
          type TEXT NOT NULL,
          text TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_history_player ON history(player_id, ts DESC);
        CREATE INDEX IF NOT EXISTS idx_players_xp ON players(xp DESC);
      `)
      .then(() => undefined);
  }
  private async q(sql: string, params: unknown[] = []) {
    await this.ready;
    return this.pool.query(sql, params);
  }
  async load(id: string) {
    const r = await this.q("SELECT data FROM players WHERE id = $1", [id]);
    return r.rows[0] ? (r.rows[0].data as PlayerRecord) : null;
  }
  async save(rec: PlayerRecord) {
    rec.updatedAt = Date.now();
    await this.q(
      `INSERT INTO players (id, name, xp, data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, xp = EXCLUDED.xp, data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
      [rec.id, rec.name, Math.floor(rec.xp), JSON.stringify(rec), rec.createdAt, rec.updatedAt],
    );
  }
  async addHistory(id: string, type: string, text: string) {
    await this.q("INSERT INTO history (player_id, ts, type, text) VALUES ($1, $2, $3, $4)", [id, Date.now(), type, text]);
  }
  async history(id: string, limit: number) {
    const r = await this.q("SELECT ts, type, text FROM history WHERE player_id = $1 ORDER BY ts DESC LIMIT $2", [id, limit]);
    return r.rows.map((x: any) => ({ ts: Number(x.ts), type: x.type, text: x.text })) as HistoryEntry[];
  }
  async leaderboard(limit: number) {
    const r = await this.q("SELECT name, xp FROM players ORDER BY xp DESC LIMIT $1", [limit]);
    return r.rows as { name: string; xp: number }[];
  }
  async kvGet(key: string) {
    const r = await this.q("SELECT v FROM kv WHERE k = $1", [key]);
    return r.rows[0] ? r.rows[0].v : null;
  }
  async kvSet(key: string, value: unknown) {
    await this.q("INSERT INTO kv (k, v) VALUES ($1, $2) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v", [key, JSON.stringify(value)]);
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
  const url = process.env.DATABASE_URL;
  if (url) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const repo = new PgRepo(require("pg"), url);
      console.log("[repo] PostgreSQL (DATABASE_URL)");
      return repo;
    } catch (e) {
      console.warn("[repo] DATABASE_URL definido, mas o módulo pg não carregou — usando SQLite/JSON. Motivo:", (e as Error).message);
    }
  }
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
