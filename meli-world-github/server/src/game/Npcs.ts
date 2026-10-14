/** NPCs: rotinas por horário (A*), REPs ambientes e o REP de traslado que empurra bakers de verdade. */
import {
  AMBIENT_REPS, findPath, getWorld, hashString, hourOf, mulberry32, NPCS, randomAppearance, Rng, TILE, Dir, isSolidTile,
} from "../../../shared/src";
import type { BakerEntity, NpcEntity } from "./entities";

const SPEED = 46;

export class Npcs {
  readonly world = getWorld();
  list = new Map<string, NpcEntity>();
  /** tarefa do REP de traslado */
  trasladoTask: { bakerId: string; dockX: number; stage: "go" | "push"; vanId: string } | null = null;
  onTrasladoDone: (bakerId: string, vanId: string) => void = () => {};

  constructor(private rng: Rng) {
    for (const def of NPCS) {
      const [px, py] = this.world.points[def.schedule[0].point];
      this.list.set(def.id, this.make(def.id, def.name, def.role, JSON.stringify(def.look), px, py, false, def.schedule[0].point));
    }
    for (const rep of AMBIENT_REPS) {
      const look = randomAppearance(mulberry32(hashString(rep.id)));
      look.top = "uniforme";
      look.topColor = 0;
      const [px, py] = this.world.points[rep.post];
      const n = this.make(rep.id, rep.name, `REP · ${rep.label}`, JSON.stringify(look), px, py, true, rep.post);
      n.activity = rep.label;
      this.list.set(rep.id, n);
    }
  }

  private make(id: string, name: string, role: string, lookJson: string, tx: number, ty: number, ambient: boolean, post: string): NpcEntity {
    return {
      id, name, role, x: tx * TILE + TILE / 2, y: ty * TILE + TILE - 2, dir: "down", anim: "idle", lookJson, activity: "",
      carry: "", path: [], goal: post, pauseUntil: 0, ambient, post, wanderAt: 0, phase: 0, pushingBaker: "",
      assignedUntil: {}, lastPath: 0,
    };
  }

  private tileOf(n: NpcEntity): [number, number] {
    return [Math.floor(n.x / TILE), Math.floor((n.y - 2) / TILE)];
  }

  goTo(n: NpcEntity, tx: number, ty: number) {
    const [sx, sy] = this.tileOf(n);
    if (sx === tx && sy === ty) {
      n.path = [];
      return;
    }
    const p = findPath(this.world, sx, sy, tx, ty, 60000);
    n.path = p ?? [];
  }

  /** Pausa o NPC e vira para o jogador (conversa). */
  faceTalk(n: NpcEntity, px: number, py: number, realNow: number) {
    n.pauseUntil = realNow + 5000;
    const dx = px - n.x;
    const dy = py - n.y;
    n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    n.anim = "idle";
  }

  currentEntry(id: string, clock: number) {
    const def = NPCS.find((d) => d.id === id)!;
    const h = hourOf(clock);
    let cur = def.schedule[0];
    for (const e of def.schedule) if (h >= e.from) cur = e;
    return cur;
  }

  startTraslado(baker: BakerEntity, dockX: number, vanId: string) {
    if (this.trasladoTask) return false;
    this.trasladoTask = { bakerId: baker.id, dockX, stage: "go", vanId };
    const n = this.list.get("rep_gabi")!;
    this.goTo(n, Math.floor(baker.homeX / TILE) - 1, Math.floor(baker.y / TILE) + (baker.homeY / TILE < 28 ? 0 : 0));
    n.activity = `Traslado do baker ${baker.route}`;
    return true;
  }

  tick(dt: number, clock: number, realNow: number, bakers: Map<string, BakerEntity>) {
    for (const n of this.list.values()) {
      if (realNow < n.pauseUntil) continue;
      // escolhe objetivo
      if (!n.ambient) {
        const e = this.currentEntry(n.id, clock);
        if (n.goal !== e.point) {
          n.goal = e.point;
          n.activity = e.label;
          const [tx, ty] = this.world.points[e.point];
          this.goTo(n, tx, ty);
        }
      } else if (n.id === "rep_gabi" && this.trasladoTask) {
        // controlado abaixo
      } else if (!n.path.length && realNow > n.wanderAt) {
        // REP ambiente: vai e volta entre o posto e um ponto próximo (vida no galpão)
        const [px, py] = this.world.points[n.post];
        n.phase = 1 - n.phase;
        const off: [number, number] = n.phase ? [Math.floor(this.rng() * 5) - 2, Math.floor(this.rng() * 3) - 1] : [0, 0];
        const tx = px + off[0];
        const ty = py + off[1];
        if (!isSolidTile(this.world, tx, ty)) this.goTo(n, tx, ty);
        n.carry = n.phase && /Pescando|Traslado|Recebimento/.test(n.role) ? "pkg" : "";
        n.wanderAt = realNow + 3500 + this.rng() * 5000;
      }
      // anda pelo caminho
      if (n.path.length) {
        const [tx, ty] = n.path[0];
        const gx = tx * TILE + TILE / 2;
        const gy = ty * TILE + TILE - 2;
        const dx = gx - n.x;
        const dy = gy - n.y;
        const d = Math.hypot(dx, dy);
        const pushing = !!n.pushingBaker;
        const step = SPEED * (pushing ? 0.75 : 1) * dt;
        if (d <= step) {
          n.x = gx;
          n.y = gy;
          n.path.shift();
        } else {
          n.x += (dx / d) * step;
          n.y += (dy / d) * step;
        }
        if (d > 0.5) n.dir = (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up") as Dir;
        n.anim = pushing ? "push" : n.carry ? "carry" : "walk";
      } else {
        n.anim = this.idleAnim(n, clock);
      }
    }
    this.tickTraslado(bakers);
  }

  private idleAnim(n: NpcEntity, clock: number) {
    if (n.ambient) {
      if (n.carry) return "carryIdle";
      return /Goleiro|Etiquet/.test(n.role) ? "work" : "scan";
    }
    const e = this.currentEntry(n.id, clock);
    switch (e.activity) {
      case "work": return "work";
      case "scan": return "scan";
      case "eat": case "sit": return "sit";
      case "talk": return "interact";
      default: return "idle";
    }
  }

  private tickTraslado(bakers: Map<string, BakerEntity>) {
    const t = this.trasladoTask;
    if (!t) return;
    const n = this.list.get("rep_gabi")!;
    const b = bakers.get(t.bakerId);
    if (!b || (b.state !== "closed" && b.state !== "staged" && b.state !== "moving")) {
      this.trasladoTask = null;
      n.pushingBaker = "";
      return;
    }
    if (t.stage === "go" && !n.path.length) {
      t.stage = "push";
      n.pushingBaker = b.id;
      b.state = "moving";
      b.pushedBy = n.id;
      this.goTo(n, t.dockX, 48);
    } else if (t.stage === "push") {
      // baker acompanha o REP
      b.x = n.x + (n.dir === "left" ? -12 : n.dir === "right" ? 12 : 0);
      b.y = n.y + (n.dir === "down" ? 12 : n.dir === "up" ? -10 : 2);
      if (!n.path.length) {
        n.pushingBaker = "";
        this.trasladoTask = null;
        n.activity = "Traslado de bakers";
        this.onTrasladoDone(b.id, t.vanId);
        const [px, py] = this.world.points[n.post];
        this.goTo(n, px, py);
      }
    }
  }
}
