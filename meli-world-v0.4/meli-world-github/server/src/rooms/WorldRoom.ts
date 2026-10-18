/** Sala Colyseus: liga a rede ao World (lógica pura) e espelha o estado no Schema. */
import { Client, matchMaker, Room } from "colyseus";
import { SERVER_TICK_MS } from "../../../shared/src";
import type { Repo } from "../db/repo";
import { World } from "../game/World";
import type { Hub } from "../game/Hub";
import { BakerS, EnemyS, NpcS, PlayerS, PlotS, VehicleS, WorldState } from "./schema";

function patch<T extends object>(target: T, values: Partial<T>) {
  for (const k in values) {
    const v = values[k] as unknown;
    if ((target as any)[k] !== v) (target as any)[k] = v;
  }
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}

/** Lotação de cada sala (pode mudar com a variável de ambiente ROOM_MAX). */
export const ROOM_MAX = Math.max(2, Math.min(100, Number(process.env.ROOM_MAX) || 30));

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(n = 5) {
  let s = "";
  for (let i = 0; i < n; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}
function cleanName(v: unknown, fallback: string) {
  const s = String(v ?? "").replace(/[^\p{L}\p{N} ._'!#-]/gu, "").trim().slice(0, 28);
  return s || fallback;
}

export class WorldRoom extends Room<WorldState> {
  static repo: Repo;
  static hub: Hub;
  static rooms = new Map<string, WorldRoom>();
  world!: World;
  maxClients = ROOM_MAX;
  autoDispose = true;
  private clients_ = new Map<string, Client>();
  info = { name: "", private: false, code: "", persistent: false, num: 0 };

  async onCreate(options: any = {}) {
    const priv = !!options.private;
    if (priv) {
      // código curto e legível para os amigos digitarem
      let code = randomCode();
      for (let i = 0; i < 20 && (await matchMaker.query({ roomId: code })).length; i++) code = randomCode();
      this.roomId = code;
      await this.setPrivate(true);
    }
    // próximo número livre: Sala 1, Sala 2… (reaproveita números de salas que fecharam)
    let n = 1;
    const used = new Set([...WorldRoom.rooms.values()].filter((r) => !r.info.private).map((r) => r.info.num));
    while (used.has(n)) n++;
    this.info = {
      name: priv ? cleanName(options.roomName, `Sala de ${cleanName(options.name, "um colega")}`) : cleanName(options.roomName, `SMG1 · Sala ${n}`),
      private: priv,
      code: priv ? this.roomId : "",
      persistent: !!options.persistent,
      num: priv ? 0 : n,
    };
    this.autoDispose = !options.persistent;
    await this.setMetadata({ name: this.info.name, private: priv });
    this.setState(new WorldState());
    this.setPatchRate(SERVER_TICK_MS);
    this.world = new World(WorldRoom.repo, {
      send: (sid, type, msg) => this.clients_.get(sid)?.send(type, msg),
      broadcast: (type, msg) => this.broadcast(type, msg),
    }, WorldRoom.hub);
    WorldRoom.rooms.set(this.roomId, this);

    this.onMessage("input", (c, m) => this.world.input(c.sessionId, m));
    this.onMessage("interact", (c, m) => this.world.interact(c.sessionId, m));
    this.onMessage("minigame", (c, m) => this.world.minigameResult(c.sessionId, m));
    this.onMessage("minigameCancel", (c) => this.world.minigameCancel(c.sessionId));
    this.onMessage("action", (c, m) => this.world.action(c.sessionId, m));
    this.onMessage("chat", (c, m) => this.world.chat(c.sessionId, m?.text));
    this.onMessage("dialog", (c, m) => this.world.dialogChoice(c.sessionId, m));
    this.onMessage("mission", (c, m) => this.world.missionOp(c.sessionId, m));
    this.onMessage("appearance", (c, m) => this.world.setAppearance(c.sessionId, m?.look));
    this.onMessage("attack", (c, m) => this.world.attack(c.sessionId, m));
    this.onMessage("shop", (c, m) => this.world.shopOp(c.sessionId, m));
    this.onMessage("market", (c, m) => this.world.marketOp(c.sessionId, m));
    this.onMessage("mp", (c, m) => this.world.mpOp(c.sessionId, m));
    this.onMessage("plot", (c, m) => this.world.plotOp(c.sessionId, m));
    this.onMessage("kpi", (c) => c.send("kpiData", this.world.kpiSnapshot(this.world.players.get(c.sessionId))));
    this.onMessage("*", () => {});

    this.setSimulationInterval((dt) => {
      this.world.tick(dt);
      this.sync();
    }, SERVER_TICK_MS);

    // salvamento periódico de segurança
    this.clock.setInterval(() => this.world.saveAll(), 60_000);
    console.log(`[room] ${this.info.name} criada (${this.roomId}${priv ? ", privada" : ""})`);
  }

  private inited: Promise<void> | null = null;

  async onJoin(client: Client, options: any) {
    this.inited ??= this.world.init();
    await this.inited;
    this.clients_.set(client.sessionId, client);
    const p = await this.world.join(client.sessionId, options ?? {});
    if (!this.clients_.has(client.sessionId)) {
      await this.world.leave(client.sessionId); // caiu durante o join
      return;
    }
    client.send("welcome", {
      sid: client.sessionId, id: p.id, serverStart: this.world.serverStart, now: Date.now(),
      room: { id: this.roomId, name: this.info.name, private: this.info.private, code: this.info.code, max: this.maxClients },
    });
    this.broadcast("chat", { from: this.info.name, text: `${this.clients.length}/${this.maxClients} pessoas nesta sala.`, sid: "" });
  }

  async onLeave(client: Client) {
    this.clients_.delete(client.sessionId);
    await this.world.leave(client.sessionId);
  }

  async onDispose() {
    await this.world.saveAll();
    this.world.dispose();
    WorldRoom.rooms.delete(this.roomId);
    console.log(`[room] ${this.info.name} encerrada`);
  }

  /** O Hub encerrou esta sessão (o jogador entrou em outra sala). */
  evict(sid: string) {
    const c = this.clients_.get(sid);
    this.clients_.delete(sid);
    c?.send("toast", { text: "Você entrou em outra sala com este personagem. Esta conexão foi encerrada.", kind: "warn" });
    setTimeout(() => c?.leave(4001), 200);
  }

  private sync() {
    const s = this.state;
    const w = this.world;
    s.clock = round(w.clock);
    s.serverTime = Date.now() - w.serverStart;
    const belt = w.ops.beltString();
    if (s.belt !== belt) s.belt = belt;
    patch(s.ops, {
      backlog: w.ops.backlog.length,
      goleiro: w.ops.goleiro.length,
      ps: w.ops.ps.length,
      greenRate: w.ops.greenRate(),
      dispatched: w.ops.counters.dispatched,
      late: w.ops.counters.late,
      processed: w.ops.counters.processed,
      alert: w.ops.alert,
    });

    // jogadores
    for (const [sid, p] of w.players) {
      let ps = s.players.get(sid);
      if (!ps) {
        ps = new PlayerS();
        s.players.set(sid, ps);
      }
      patch(ps, {
        name: p.name, x: round(p.x), y: round(p.y), dir: p.dir, anim: p.anim, look: p.lookJson, equip: p.equipJson,
        level: p.level, title: p.title, carry: p.carryKind === "pkg" ? (p.carrying.some((c) => c.size !== "sortable") ? "bulky" : "pkg") : p.carryKind,
        carryN: p.carrying.length, bubble: p.bubble, hp: Math.max(0, Math.min(255, Math.round(p.rec.hp ?? 100))),
        weapon: p.rec.equipped.weapon && p.rec.inventory[p.rec.equipped.weapon] ? p.rec.equipped.weapon : "", atk: p.atkSeq,
      });
    }
    s.players.forEach((_, sid) => {
      if (!w.players.has(sid)) s.players.delete(sid);
    });

    // NPCs
    for (const [id, n] of w.npcs.list) {
      let ns = s.npcs.get(id);
      if (!ns) {
        ns = new NpcS();
        s.npcs.set(id, ns);
      }
      patch(ns, { name: n.name, role: n.role, x: round(n.x), y: round(n.y), dir: n.dir, anim: n.anim, look: n.lookJson, activity: n.activity, carry: n.carry });
    }

    // veículos
    for (const [id, v] of w.vehicles.list) {
      let vs = s.vehicles.get(id);
      if (!vs) {
        vs = new VehicleS();
        s.vehicles.set(id, vs);
      }
      patch(vs, {
        kind: v.kind, x: round(v.x), y: round(v.y), dir: v.dir, route: v.route, wave: v.wave, state: v.state, label: v.label,
        load: v.load, dock: v.dock, minutes: v.dockedAt && v.state !== "leaving" ? Math.max(0, Math.round(w.clock - v.dockedAt)) : 0,
      });
    }
    s.vehicles.forEach((_, id) => {
      if (!w.vehicles.list.has(id)) s.vehicles.delete(id);
    });

    // bakers
    for (const [id, b] of w.ops.bakers) {
      let bs = s.bakers.get(id);
      if (!bs) {
        bs = new BakerS();
        s.bakers.set(id, bs);
      }
      patch(bs, {
        route: b.route, x: round(b.x), y: round(b.y), count: Math.min(255, b.packages.length + b.misplaced.length), target: b.target,
        state: b.state, setup: b.setupDone, pushed: !!b.pushedBy,
      });
    }
    s.bakers.forEach((_, id) => {
      if (!w.ops.bakers.has(id)) s.bakers.delete(id);
    });

    // inimigos
    const now = Date.now();
    for (const [id, e] of w.combat.enemies) {
      let es = s.enemies.get(id);
      if (!es) {
        es = new EnemyS();
        s.enemies.set(id, es);
      }
      patch(es, { kind: e.kind, x: round(e.x), y: round(e.y), hp: Math.max(0, Math.round(e.hp)), maxHp: e.maxHp, dir: e.dir, state: e.state, flash: now < e.flashUntil });
    }
    s.enemies.forEach((_, id) => {
      if (!w.combat.enemies.has(id)) s.enemies.delete(id);
    });

    // lotes
    for (const [id, st] of w.economy.plots) {
      let ps = s.plots.get(id);
      if (!ps) {
        ps = new PlotS();
        s.plots.set(id, ps);
      }
      patch(ps, { ownerId: st.owner, ownerName: st.ownerName, tier: st.tier, decor: JSON.stringify(st.decor), inside: JSON.stringify(st.inside ?? []), access: st.access ?? "private" });
    }
  }
}
