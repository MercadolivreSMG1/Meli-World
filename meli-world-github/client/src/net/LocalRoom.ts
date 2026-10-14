/**
 * MODO SOLO: roda o mesmo World do servidor dentro do navegador.
 * Imita a API da Room do colyseus.js (state, onMessage, onStateChange, send), então o resto
 * do cliente não precisa saber se está online ou offline. O progresso fica no localStorage.
 */
import { SERVER_TICK_MS } from "@shared/index";
import type { HistoryEntry, PlayerRecord, Repo } from "../../../server/src/db/types";
import { World } from "../../../server/src/game/World";

const KEY = "mw.solo.";

function lsGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function lsSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* storage cheio ou bloqueado: segue só em memória */
  }
}

/** Repositório no localStorage do navegador. */
class LocalRepo implements Repo {
  readonly kind = "localStorage";
  private mem = new Map<string, string>();
  private get(k: string) {
    return lsGet(KEY + k) ?? this.mem.get(k) ?? null;
  }
  private set(k: string, v: string) {
    this.mem.set(k, v);
    lsSet(KEY + k, v);
  }
  async load(id: string) {
    const raw = this.get("player." + id);
    return raw ? (JSON.parse(raw) as PlayerRecord) : null;
  }
  async save(rec: PlayerRecord) {
    rec.updatedAt = Date.now();
    this.set("player." + rec.id, JSON.stringify(rec));
  }
  async addHistory(id: string, type: string, text: string) {
    const list = await this.history(id, 200);
    list.unshift({ ts: Date.now(), type, text });
    this.set("history." + id, JSON.stringify(list.slice(0, 200)));
  }
  async history(id: string, limit: number): Promise<HistoryEntry[]> {
    const raw = this.get("history." + id);
    return raw ? (JSON.parse(raw) as HistoryEntry[]).slice(0, limit) : [];
  }
  async leaderboard() {
    return [];
  }
}

type Cb = (m: any) => void;

const clone = <T>(v: T): T => {
  if (v === undefined || v === null) return v;
  try {
    return typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v));
  } catch {
    return JSON.parse(JSON.stringify(v));
  }
};

export class LocalRoom {
  readonly sessionId = "solo";
  state: any = null;
  private world: World;
  private handlers = new Map<string, Cb[]>();
  private stateCbs: Cb[] = [];
  private timer = 0;
  private last = performance.now();

  constructor() {
    this.world = new World(new LocalRepo(), {
      send: (sid, type, msg) => {
        if (sid === this.sessionId) this.deliver(type, msg);
      },
      broadcast: (type, msg) => this.deliver(type, msg),
    });
  }

  async join(options: { token: string; name: string; look: unknown }) {
    const p = await this.world.join(this.sessionId, options);
    this.deliver("welcome", { sid: this.sessionId, id: p.id, serverStart: this.world.serverStart, now: Date.now() });
    this.snapshot();
    this.timer = window.setInterval(() => this.tick(), SERVER_TICK_MS);
    // salva ao sair/fechar a aba e a cada 30 s
    window.addEventListener("beforeunload", () => this.world.saveAll());
    window.addEventListener("pagehide", () => this.world.saveAll());
    window.setInterval(() => this.world.saveAll(), 30_000);
  }

  private tick() {
    const now = performance.now();
    // se a aba ficou em segundo plano, avança no máximo 1 s de uma vez
    const dt = Math.min(1000, now - this.last);
    this.last = now;
    this.world.tick(dt);
    this.snapshot();
    for (const cb of this.stateCbs) cb(this.state);
  }

  private deliver(type: string, msg: unknown) {
    const copy = clone(msg);
    setTimeout(() => {
      for (const cb of this.handlers.get(type) ?? []) cb(copy);
    }, 0);
  }

  /** Mesmo formato do WorldState do Colyseus (Maps com get/forEach). */
  private snapshot() {
    const w = this.world;
    const r = (n: number) => Math.round(n * 10) / 10;
    const players = new Map<string, any>();
    for (const [sid, p] of w.players)
      players.set(sid, {
        name: p.name, x: r(p.x), y: r(p.y), dir: p.dir, anim: p.anim, look: p.lookJson, equip: p.equipJson,
        level: p.level, title: p.title,
        carry: p.carryKind === "pkg" ? (p.carrying.some((c) => c.size !== "sortable") ? "bulky" : "pkg") : p.carryKind,
        carryN: p.carrying.length, bubble: p.bubble,
      });
    const npcs = new Map<string, any>();
    for (const [id, n] of w.npcs.list)
      npcs.set(id, { name: n.name, role: n.role, x: r(n.x), y: r(n.y), dir: n.dir, anim: n.anim, look: n.lookJson, activity: n.activity, carry: n.carry });
    const vehicles = new Map<string, any>();
    for (const [id, v] of w.vehicles.list)
      vehicles.set(id, {
        kind: v.kind, x: r(v.x), y: r(v.y), dir: v.dir, route: v.route, wave: v.wave, state: v.state, label: v.label,
        load: v.load, dock: v.dock, minutes: v.dockedAt && v.state !== "leaving" ? Math.max(0, Math.round(w.clock - v.dockedAt)) : 0,
      });
    const bakers = new Map<string, any>();
    for (const [id, b] of w.ops.bakers)
      bakers.set(id, {
        route: b.route, x: r(b.x), y: r(b.y), count: b.packages.length + b.misplaced.length, target: b.target,
        state: b.state, setup: b.setupDone, pushed: !!b.pushedBy,
      });
    this.state = {
      players, npcs, vehicles, bakers,
      ops: {
        backlog: w.ops.backlog.length, goleiro: w.ops.goleiro.length, ps: w.ops.ps.length, greenRate: w.ops.greenRate(),
        dispatched: w.ops.counters.dispatched, late: w.ops.counters.late, processed: w.ops.counters.processed, alert: w.ops.alert,
      },
      belt: w.ops.beltString(),
      clock: r(w.clock),
      serverTime: Date.now() - w.serverStart,
    };
  }

  // ---------------------------------------------------------------- API estilo colyseus.js
  onMessage(type: string, cb: Cb) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type)!.push(cb);
  }
  onStateChange(cb: Cb) {
    this.stateCbs.push(cb);
  }
  onLeave(_cb: Cb) {}
  onError(_cb: Cb) {}

  send(type: string, raw: any = {}) {
    const m = clone(raw);
    const w = this.world;
    const sid = this.sessionId;
    switch (type) {
      case "input": return w.input(sid, m);
      case "interact": return w.interact(sid, m);
      case "minigame": return w.minigameResult(sid, m);
      case "minigameCancel": return w.minigameCancel(sid);
      case "action": return w.action(sid, m);
      case "chat": return w.chat(sid, m?.text);
      case "dialog": return w.dialogChoice(sid, m);
      case "mission": return w.missionOp(sid, m);
      case "appearance": return w.setAppearance(sid, m?.look);
      case "kpi": return this.deliver("kpiData", w.kpiSnapshot(w.players.get(sid)));
    }
  }

  stop() {
    window.clearInterval(this.timer);
    this.world.saveAll();
  }
}
