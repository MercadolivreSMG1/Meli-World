/**
 * Estado sincronizado (Colyseus Schema). Só o que todos precisam ver vai aqui;
 * dados privados (inventário, missões…) vão por mensagem só para o dono.
 * Usa defineTypes + `declare` para funcionar sem decorators.
 */
import { defineTypes, MapSchema, Schema } from "@colyseus/schema";

export class PlayerS extends Schema {
  declare name: string;
  declare x: number;
  declare y: number;
  declare dir: string;
  declare anim: string;
  declare look: string;
  declare equip: string;
  declare level: number;
  declare title: string;
  declare carry: string;
  declare carryN: number;
  declare bubble: string;
  declare hp: number;
  declare weapon: string;
  declare atk: number;
  constructor() {
    super();
    this.hp = 100;
    this.weapon = "";
    this.atk = 0;
    this.name = "";
    this.x = 0;
    this.y = 0;
    this.dir = "down";
    this.anim = "idle";
    this.look = "";
    this.equip = "";
    this.level = 1;
    this.title = "";
    this.carry = "";
    this.carryN = 0;
    this.bubble = "";
  }
}
defineTypes(PlayerS, {
  name: "string", x: "number", y: "number", dir: "string", anim: "string", look: "string", equip: "string",
  level: "uint8", title: "string", carry: "string", carryN: "uint8", bubble: "string", hp: "uint8", weapon: "string", atk: "uint16",
});

export class EnemyS extends Schema {
  declare kind: string;
  declare x: number;
  declare y: number;
  declare hp: number;
  declare maxHp: number;
  declare dir: string;
  declare state: string;
  declare flash: boolean;
  constructor() {
    super();
    this.kind = "";
    this.x = 0;
    this.y = 0;
    this.hp = 0;
    this.maxHp = 1;
    this.dir = "down";
    this.state = "idle";
    this.flash = false;
  }
}
defineTypes(EnemyS, { kind: "string", x: "number", y: "number", hp: "uint16", maxHp: "uint16", dir: "string", state: "string", flash: "boolean" });

export class PlotS extends Schema {
  declare ownerId: string;
  declare ownerName: string;
  declare tier: number;
  declare decor: string;
  declare inside: string;
  declare access: string;
  constructor() {
    super();
    this.ownerId = "";
    this.ownerName = "";
    this.tier = 0;
    this.decor = "[]";
    this.inside = "[]";
    this.access = "private";
  }
}
defineTypes(PlotS, { ownerId: "string", ownerName: "string", tier: "uint8", decor: "string", inside: "string", access: "string" });

export class NpcS extends Schema {
  declare name: string;
  declare role: string;
  declare x: number;
  declare y: number;
  declare dir: string;
  declare anim: string;
  declare look: string;
  declare activity: string;
  declare carry: string;
  constructor() {
    super();
    this.name = "";
    this.role = "";
    this.x = 0;
    this.y = 0;
    this.dir = "down";
    this.anim = "idle";
    this.look = "";
    this.activity = "";
    this.carry = "";
  }
}
defineTypes(NpcS, { name: "string", role: "string", x: "number", y: "number", dir: "string", anim: "string", look: "string", activity: "string", carry: "string" });

export class VehicleS extends Schema {
  declare kind: string;
  declare x: number;
  declare y: number;
  declare dir: string;
  declare route: string;
  declare wave: number;
  declare state: string;
  declare label: string;
  declare load: number;
  declare dock: string;
  declare minutes: number;
  constructor() {
    super();
    this.kind = "van";
    this.x = 0;
    this.y = 0;
    this.dir = "left";
    this.route = "";
    this.wave = 0;
    this.state = "";
    this.label = "";
    this.load = 0;
    this.dock = "";
    this.minutes = 0;
  }
}
defineTypes(VehicleS, {
  kind: "string", x: "number", y: "number", dir: "string", route: "string", wave: "uint8", state: "string",
  label: "string", load: "uint16", dock: "string", minutes: "uint16",
});

export class BakerS extends Schema {
  declare route: string;
  declare x: number;
  declare y: number;
  declare count: number;
  declare target: number;
  declare state: string;
  declare setup: boolean;
  declare pushed: boolean;
  constructor() {
    super();
    this.route = "";
    this.x = 0;
    this.y = 0;
    this.count = 0;
    this.target = 0;
    this.state = "open";
    this.setup = false;
    this.pushed = false;
  }
}
defineTypes(BakerS, { route: "string", x: "number", y: "number", count: "uint8", target: "uint8", state: "string", setup: "boolean", pushed: "boolean" });

export class OpsS extends Schema {
  declare backlog: number;
  declare goleiro: number;
  declare ps: number;
  declare greenRate: number;
  declare dispatched: number;
  declare late: number;
  declare processed: number;
  declare alert: string;
  constructor() {
    super();
    this.backlog = 0;
    this.goleiro = 0;
    this.ps = 0;
    this.greenRate = 100;
    this.dispatched = 0;
    this.late = 0;
    this.processed = 0;
    this.alert = "";
  }
}
defineTypes(OpsS, { backlog: "uint16", goleiro: "uint16", ps: "uint16", greenRate: "number", dispatched: "uint16", late: "uint16", processed: "uint32", alert: "string" });

export class WorldState extends Schema {
  declare players: MapSchema<PlayerS>;
  declare npcs: MapSchema<NpcS>;
  declare vehicles: MapSchema<VehicleS>;
  declare bakers: MapSchema<BakerS>;
  declare enemies: MapSchema<EnemyS>;
  declare plots: MapSchema<PlotS>;
  declare ops: OpsS;
  declare belt: string;
  declare clock: number;
  declare serverTime: number;
  constructor() {
    super();
    this.players = new MapSchema<PlayerS>();
    this.npcs = new MapSchema<NpcS>();
    this.vehicles = new MapSchema<VehicleS>();
    this.bakers = new MapSchema<BakerS>();
    this.enemies = new MapSchema<EnemyS>();
    this.plots = new MapSchema<PlotS>();
    this.ops = new OpsS();
    this.belt = "";
    this.clock = 0;
    this.serverTime = 0;
  }
}
defineTypes(WorldState, {
  players: { map: PlayerS }, npcs: { map: NpcS }, vehicles: { map: VehicleS }, bakers: { map: BakerS },
  enemies: { map: EnemyS }, plots: { map: PlotS },
  ops: OpsS, belt: "string", clock: "number", serverTime: "number",
});
