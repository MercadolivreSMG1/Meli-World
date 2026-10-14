/** Sala Colyseus: liga a rede ao World (lógica pura) e espelha o estado no Schema. */
import { Client, Room } from "colyseus";
import { SERVER_TICK_MS } from "../../../shared/src";
import type { Repo } from "../db/repo";
import { World } from "../game/World";
import { BakerS, NpcS, PlayerS, VehicleS, WorldState } from "./schema";

function patch<T extends object>(target: T, values: Partial<T>) {
  for (const k in values) {
    const v = values[k] as unknown;
    if ((target as any)[k] !== v) (target as any)[k] = v;
  }
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}

export class WorldRoom extends Room<WorldState> {
  static repo: Repo;
  world!: World;
  maxClients = 80;
  autoDispose = false;
  private clients_ = new Map<string, Client>();

  onCreate() {
    this.setState(new WorldState());
    this.setPatchRate(SERVER_TICK_MS);
    this.world = new World(WorldRoom.repo, {
      send: (sid, type, msg) => this.clients_.get(sid)?.send(type, msg),
      broadcast: (type, msg) => this.broadcast(type, msg),
    });

    this.onMessage("input", (c, m) => this.world.input(c.sessionId, m));
    this.onMessage("interact", (c, m) => this.world.interact(c.sessionId, m));
    this.onMessage("minigame", (c, m) => this.world.minigameResult(c.sessionId, m));
    this.onMessage("minigameCancel", (c) => this.world.minigameCancel(c.sessionId));
    this.onMessage("action", (c, m) => this.world.action(c.sessionId, m));
    this.onMessage("chat", (c, m) => this.world.chat(c.sessionId, m?.text));
    this.onMessage("dialog", (c, m) => this.world.dialogChoice(c.sessionId, m));
    this.onMessage("mission", (c, m) => this.world.missionOp(c.sessionId, m));
    this.onMessage("appearance", (c, m) => this.world.setAppearance(c.sessionId, m?.look));
    this.onMessage("kpi", (c) => c.send("kpiData", this.world.kpiSnapshot(this.world.players.get(c.sessionId))));
    this.onMessage("*", () => {});

    this.setSimulationInterval((dt) => {
      this.world.tick(dt);
      this.sync();
    }, SERVER_TICK_MS);

    // salvamento periódico de segurança
    this.clock.setInterval(() => this.world.saveAll(), 60_000);
    console.log("[room] mundo SMG1 criado");
  }

  async onJoin(client: Client, options: any) {
    this.clients_.set(client.sessionId, client);
    const p = await this.world.join(client.sessionId, options ?? {});
    if (!this.clients_.has(client.sessionId)) {
      await this.world.leave(client.sessionId); // caiu durante o join
      return;
    }
    client.send("welcome", { sid: client.sessionId, id: p.id, serverStart: this.world.serverStart, now: Date.now() });
  }

  async onLeave(client: Client) {
    this.clients_.delete(client.sessionId);
    await this.world.leave(client.sessionId);
  }

  async onDispose() {
    await this.world.saveAll();
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
        carryN: p.carrying.length, bubble: p.bubble,
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
  }
}
