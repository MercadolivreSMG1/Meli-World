/** Caminhões Line Haul (recebimento) e vans (Flash Parking / expedição). */
import { getWorld, MAP_W, pick, Rng, ROUTE_BY_ID, TILE, Dir, randInt, GAME_MIN_PER_SEC, hourOf } from "../../../shared/src";
import type { VehicleEntity } from "./entities";

const T = TILE;
const DRIVERS = ["Sr. Jorge", "Dona Célia", "Marcão", "Luana", "Edson", "Patrícia", "Robson", "Sueli", "Cláudio", "Vera"];
const CARRIERS = ["MLP Rota Sul", "MLP Expresso", "MLP Leste Log", "MLP Fast"];

export class Vehicles {
  readonly world = getWorld();
  list = new Map<string, VehicleEntity>();
  private seq = 0;
  private lhTimer = 0;
  /** Chamado quando uma van sai pelo portão com a rota despachada. */
  onDispatch: (v: VehicleEntity, late: boolean) => void = () => {};
  /** Chamado quando a contagem do motorista termina (ok ou falha). */
  onCount: (v: VehicleEntity, ok: boolean) => void = () => {};
  onLhDocked: (v: VehicleEntity) => void = () => {};

  constructor(private rng: Rng) {}

  private dockCenter(dockId: string, kind: "lh" | "van"): [number, number] {
    const d = this.world.docks.find((x) => x.id === dockId)!;
    return kind === "lh" ? [(d.x + 1.5) * T, 55 * T] : [(d.x + 1) * T, 54 * T];
  }

  private freeDock(kind: "receiving" | "expedition"): string | null {
    for (const d of this.world.docks) {
      if (d.kind !== kind) continue;
      const busy = [...this.list.values()].some((v) => v.dock === d.id && v.state !== "gone");
      if (!busy) return d.id;
    }
    return null;
  }

  private freeSpot(wave: number): number {
    const used = new Set([...this.list.values()].filter((v) => v.spot >= 0).map((v) => v.spot));
    const idx = this.world.flashSpots.findIndex((s, i) => s.wave === wave && !used.has(i));
    if (idx >= 0) return idx;
    return this.world.flashSpots.findIndex((_, i) => !used.has(i));
  }

  private base(kind: "lh" | "van", route: string): VehicleEntity {
    const r = ROUTE_BY_ID[route];
    return {
      id: `V${++this.seq}`, kind, x: 0, y: 0, dir: "left", route, wave: r ? r.wave : 0, state: "arriving",
      label: "", load: 0, path: [], speed: kind === "lh" ? 52 : 64, dock: "", dockedAt: 0, countFails: 0, countAt: 0,
      loadedBy: "", loadedByName: "", packages: 0, hus: 0, seal: "", sealOk: true, driver: pick(this.rng, DRIVERS), spot: -1,
    };
  }

  spawnLh(now: number, docked = false): VehicleEntity | null {
    const dock = this.freeDock("receiving");
    if (!dock) return null;
    const v = this.base("lh", "");
    v.dock = dock;
    v.hus = randInt(this.rng, 4, 8);
    v.packages = v.hus * randInt(this.rng, 7, 10);
    v.seal = `LCR${randInt(this.rng, 100000, 999999)}`;
    v.sealOk = this.rng() > 0.2;
    v.label = `LH FBM→SMG1 · ${v.hus} HUs`;
    const [cx, cy] = this.dockCenter(dock, "lh");
    if (docked) {
      v.x = cx;
      v.y = cy;
      v.dir = "up";
      v.state = "docked";
      v.dockedAt = now;
    } else {
      v.x = -60;
      v.y = 79 * T;
      v.path = [[43 * T, 79 * T], [43 * T, 64 * T], [cx, 64 * T], [cx, cy]];
    }
    this.list.set(v.id, v);
    return v;
  }

  spawnVan(route: string, now: number, docked = false): VehicleEntity {
    const v = this.base("van", route);
    v.label = `${CARRIERS[this.seq % CARRIERS.length]} · Rota ${route}`;
    if (docked) {
      const dock = this.freeDock("expedition");
      if (dock) {
        const [cx, cy] = this.dockCenter(dock, "van");
        v.dock = dock;
        v.x = cx;
        v.y = cy;
        v.dir = "up";
        v.state = "docked";
        v.dockedAt = now;
        this.list.set(v.id, v);
        return v;
      }
    }
    v.spot = this.freeSpot(v.wave);
    v.x = MAP_W * T + 60;
    v.y = 75.3 * T;
    const s = this.world.flashSpots[v.spot] ?? this.world.flashSpots[0];
    const sx = (s.x + 1) * T;
    v.path = [[88.5 * T, 75.3 * T], [88.5 * T, 65 * T], [sx, 65 * T], [sx, 60 * T]];
    this.list.set(v.id, v);
    return v;
  }

  vanFor(route: string): VehicleEntity | undefined {
    for (const v of this.list.values()) if (v.kind === "van" && v.route === route && v.state !== "gone" && v.state !== "leaving") return v;
    return undefined;
  }

  private leave(v: VehicleEntity) {
    const [cx] = this.dockCenter(v.dock, v.kind);
    v.state = "leaving";
    if (v.kind === "lh") v.path = [[cx, 64 * T], [43 * T, 64 * T], [43 * T, 75.3 * T], [-120, 75.3 * T]];
    else v.path = [[cx, 65 * T], [88.5 * T, 65 * T], [88.5 * T, 79 * T], [MAP_W * T + 120, 79 * T]];
    v.dock = "";
  }

  /** Motorista termina o carregamento -> contagem. */
  startCount(v: VehicleEntity, now: number) {
    v.state = "counting";
    v.countAt = now + 2;
  }

  finishAduana(v: VehicleEntity, now: number) {
    v.state = "ready";
    v.countAt = now + 3;
  }

  /** Tamanho do backlog (injetado pelo World) para não inundar o flowrack. */
  backlogSize: () => number = () => 0;

  dispatch(v: VehicleEntity, now: number) {
    const late = now - v.dockedAt > 30;
    this.onDispatch(v, late);
    this.leave(v);
  }

  finishUnload(v: VehicleEntity) {
    this.leave(v);
  }

  tick(dt: number, now: number) {
    // novos LH periodicamente
    this.lhTimer += dt * GAME_MIN_PER_SEC;
    const h = hourOf(now);
    if (this.lhTimer > 55 && h >= 4 && h < 22 && this.backlogSize() < 220) {
      this.lhTimer = 0;
      this.spawnLh(now);
    }
    for (const v of this.list.values()) {
      // movimento por waypoints
      if (v.path.length) {
        const [tx, ty] = v.path[0];
        const dx = tx - v.x;
        const dy = ty - v.y;
        const d = Math.hypot(dx, dy);
        const step = v.speed * dt;
        let dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
        if (d <= step) {
          v.x = tx;
          v.y = ty;
          v.path.shift();
        } else {
          v.x += (dx / d) * step;
          v.y += (dy / d) * step;
        }
        v.dir = dir;
        if (!v.path.length) this.arrive(v, now);
        continue;
      }
      if (v.state === "waiting") {
        const dock = this.freeDock("expedition");
        if (dock && v.load === 0) {
          v.dock = dock;
          const [cx, cy] = this.dockCenter(dock, "van");
          const s = this.world.flashSpots[v.spot];
          const sx = s ? (s.x + 1) * T : v.x;
          v.spot = -1;
          v.state = "to_dock";
          v.path = [[sx, 65 * T], [cx, 65 * T], [cx, cy]];
        }
      } else if (v.kind === "lh" && v.state === "counting" && now >= v.countAt) {
        this.finishUnload(v); // descarregamento concluído
      } else if (v.state === "counting" && now >= v.countAt) {
        const ok = this.rng() > 0.2;
        if (ok) {
          v.state = "ready";
          v.countAt = now + 3; // auto "Já carreguei tudo"
        } else {
          v.countFails++;
          if (v.countFails >= 2) v.state = "aduana";
          else v.countAt = now + 2;
        }
        this.onCount(v, ok);
      } else if (v.state === "ready" && v.countAt && now >= v.countAt) {
        this.dispatch(v, now);
      }
    }
    for (const [id, v] of this.list) if (v.state === "gone") this.list.delete(id);
  }

  private arrive(v: VehicleEntity, now: number) {
    if (v.state === "leaving") {
      v.state = "gone";
      return;
    }
    if (v.kind === "lh") {
      v.state = "docked";
      v.dir = "up";
      v.dockedAt = now;
      this.onLhDocked(v);
      return;
    }
    if (v.state === "arriving") {
      v.state = "waiting";
      v.dir = "up";
    } else if (v.state === "to_dock") {
      v.state = "docked";
      v.dir = "up";
      v.dockedAt = now;
    }
  }
}
