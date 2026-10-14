/**
 * Simulação operacional do SVC: backlog (flowrack) -> etiquetagem/indução -> esteira -> pesca ->
 * conteinerização nos bakers -> goleiro/PS -> fechamento -> traslado -> expedição.
 * NPCs (REPs) trabalham num ritmo base para o mundo "andar sozinho"; jogadores aceleram e corrigem.
 */
import {
  generatePackage, getWorld, ISLANDS, MAP_W, needsTreatment, PackageData, Rng, ROUTE_BY_ID, ROUTES, TILE,
  correctGoleiroBin, hourOf, pick, Island,
} from "../../../shared/src";
import type { BakerEntity } from "./entities";

export interface OpsCounters {
  processed: number;
  green: number;
  orange: number;
  red: number;
  dispatched: number;
  late: number;
  errors: number;
  received: number;
  labeled: number;
  closed: number;
  safetyStrikes: number;
}

export class Ops {
  readonly world = getWorld();
  readonly beltLen: number;
  backlog: PackageData[] = [];
  reinduce: PackageData[] = [];
  belt: (PackageData | null)[];
  goleiro: PackageData[] = [];
  ps: PackageData[] = [];
  volumosos: PackageData[] = [];
  helpDesk = 0;
  custody = 0;
  dPlus1 = 0;
  bufferNext: PackageData[] = [];
  bakers = new Map<string, BakerEntity>();
  counters: OpsCounters = { processed: 0, green: 0, orange: 0, red: 0, dispatched: 0, late: 0, errors: 0, received: 0, labeled: 0, closed: 0, safetyStrikes: 0 };
  sorterBoostUntil = 0;
  surgeUntil = 0;
  alert = "";
  private beltAcc = 0;
  private npcAcc: Record<string, number> = {};
  private bakerSeq = 0;
  onBakerClosed: (b: BakerEntity) => void = () => {};

  constructor(private rng: Rng) {
    this.beltLen = (this.world.belt.x1 - this.world.belt.x0 + 1) * 2;
    this.belt = new Array(this.beltLen).fill(null);
    for (const slot of this.world.bakerSlots) this.spawnBaker(slot.route, 0);
  }

  // ------------------------------------------------------------ bakers
  spawnBaker(route: string, now: number): BakerEntity {
    const slot = this.world.bakerSlots.find((s) => s.route === route)!;
    const r = ROUTE_BY_ID[route];
    const b: BakerEntity = {
      id: `BK${++this.bakerSeq}`,
      route,
      island: r.island,
      x: (slot.x + 1) * TILE,
      y: (slot.y + 2) * TILE,
      homeX: (slot.x + 1) * TILE,
      homeY: (slot.y + 2) * TILE,
      packages: [],
      misplaced: [],
      target: r.spr,
      state: "open",
      pushedBy: "",
      setupDone: false,
      setupAt: now,
      cycle: this.bakerSeq,
      closedAt: 0,
    };
    this.bakers.set(b.id, b);
    return b;
  }

  /** Baker "na posição" da rota (ao lado da esteira). */
  homeBaker(route: string): BakerEntity | undefined {
    let fallback: BakerEntity | undefined;
    for (const b of this.bakers.values()) {
      if (b.route !== route || b.x !== b.homeX || b.y !== b.homeY || b.state === "moving" || b.state === "loaded") continue;
      if (b.state === "open" || b.state === "pending") return b;
      fallback ??= b;
    }
    return fallback;
  }

  closedBakerFor(route: string): BakerEntity | undefined {
    for (const b of this.bakers.values()) if (b.route === route && (b.state === "closed" || b.state === "staged")) return b;
    return undefined;
  }

  /** Coloca pacote no baker. `correct=false` simula erro (pacote de outra rota) -> baker pendente. */
  addToBaker(b: BakerEntity, p: PackageData, correct: boolean, now: number) {
    if (correct) b.packages.push(p);
    else b.misplaced.push(p);
    this.counters.processed++;
    this.checkBaker(b, now);
  }

  checkBaker(b: BakerEntity, now: number) {
    if (b.state !== "open" && b.state !== "pending") return;
    if (b.packages.length + b.misplaced.length >= b.target) {
      if (b.misplaced.length > 0) b.state = "pending";
      else {
        b.state = "closed";
        b.closedAt = now;
        this.counters.closed++;
        this.onBakerClosed(b);
      }
    } else if (b.misplaced.length > 0 && b.packages.length >= b.target * 0.8) b.state = "pending";
  }

  /** Remove pacotes errados do baker (auditoria) e os reposiciona no baker certo. */
  auditFix(b: BakerEntity, ids: string[], now: number): number {
    let fixed = 0;
    for (const id of ids) {
      const i = b.misplaced.findIndex((p) => p.id === id);
      if (i < 0) continue;
      const [p] = b.misplaced.splice(i, 1);
      const dest = this.homeBaker(p.route);
      if (dest && dest !== b && (dest.state === "open" || dest.state === "pending")) dest.packages.push(p);
      else this.reinduce.push(p);
      fixed++;
    }
    if (b.misplaced.length === 0 && b.state === "pending") {
      b.state = "open";
      this.checkBaker(b, now);
    }
    return fixed;
  }

  // ------------------------------------------------------------ esteira
  islandSlots(isl: Island): [number, number] {
    const [a, b] = this.world.islandRanges[isl];
    return [(a - this.world.belt.x0) * 2, (b - this.world.belt.x0) * 2 + 1];
  }

  induce(p: PackageData): boolean {
    p.labeled = true;
    if (this.belt[0] === null) {
      this.belt[0] = p;
      return true;
    }
    this.reinduce.push(p);
    return false;
  }

  /** Pacotes na esteira a partir do início do segmento da ilha (ordem de chegada). */
  upcomingFor(isl: Island): PackageData[] {
    const [, end] = this.islandSlots(isl);
    const out: PackageData[] = [];
    for (let i = end; i >= 0; i--) {
      const p = this.belt[i];
      if (p) out.push(p);
    }
    return out;
  }

  takePackage(id: string): PackageData | null {
    const i = this.belt.findIndex((p) => p?.id === id);
    if (i >= 0) {
      const p = this.belt[i]!;
      this.belt[i] = null;
      return p;
    }
    const g = this.goleiro.findIndex((p) => p.id === id);
    if (g >= 0) return this.goleiro.splice(g, 1)[0];
    return null;
  }

  beltString(): string {
    let s = "";
    for (const p of this.belt) s += !p ? "." : needsTreatment(p) ? "x" : p.island;
    return s;
  }

  // ------------------------------------------------------------ fluxo de entrada
  addInbound(n: number) {
    for (let i = 0; i < n; i++) {
      const p = generatePackage(this.rng, { issueRate: this.surgeUntil > 0 ? 0.14 : 0.1 });
      if (p.size !== "sortable") this.volumosos.push(p);
      else this.backlog.push(p);
    }
    if (this.rng() < 0.5) this.helpDesk += 1 + Math.floor(this.rng() * 2);
    this.counters.received += n;
  }

  /** Destino de um pacote triado no goleiro. */
  applyGoleiroBin(p: PackageData, bin: string) {
    switch (bin) {
      case "reinduzir":
        if (p.labelType === "branca") p.labelType = "normal";
        this.reinduce.push(p);
        break;
      case "danificado":
      case "caso_ps":
        this.ps.push(p);
        break;
      case "sem_etiqueta":
      case "erro_etiquetagem":
        p.issue = "";
        p.labeled = false;
        this.backlog.unshift(p);
        break;
      case "etiqueta_branca_futura":
        this.dPlus1++;
        break;
      case "buffer":
        p.labelType = "normal";
        this.bufferNext.push(p);
        break;
      case "custodia":
        this.custody++;
        break;
      default:
        this.reinduce.push(p);
    }
  }

  /** Resolve uma incidência do PS: pacote volta etiquetado para reindução (ou sai do fluxo). */
  resolvePs(p: PackageData | undefined, salvage: boolean) {
    if (!p) return;
    if (salvage) {
      p.issue = "";
      p.labelType = "normal";
      this.reinduce.push(p);
    }
  }

  // ------------------------------------------------------------ eventos especiais
  surge(now: number) {
    this.addInbound(60);
    for (let i = 0; i < 30; i++) {
      const idx = Math.floor(this.rng() * this.beltLen);
      if (!this.belt[idx]) this.belt[idx] = { ...generatePackage(this.rng), labeled: true };
    }
    this.surgeUntil = now + 90;
    this.alert = "Acúmulo na esteira! Backlog alto e goleiro lotando.";
  }

  chaos(now: number) {
    let n = 0;
    for (const b of this.bakers.values()) {
      if (b.state !== "open" || n >= 5) continue;
      const wrong = pick(this.rng, ROUTES.filter((r) => r.island === b.island && r.id !== b.route));
      for (let k = 0; k < 2; k++) b.misplaced.push({ ...generatePackage(this.rng), route: wrong.id, island: wrong.island, labeled: true, issue: "" });
      while (b.packages.length < b.target - 2) b.packages.push({ ...generatePackage(this.rng), route: b.route, island: b.island as Island, labeled: true, issue: "" });
      b.state = "pending";
      n++;
    }
    let s = 0;
    for (const b of this.bakers.values()) if (b.state === "open" && s < 4) {
      b.setupDone = false;
      b.setupAt = now;
      s++;
    }
    for (let i = 0; i < 10; i++) this.goleiro.push({ ...generatePackage(this.rng, { issueRate: 0.6 }), labeled: true });
    this.alert = "Setor desorganizado: bakers pendentes, goleiro lotado e time desencontrado.";
  }

  /** Enche bakers até fechar (para a Expedição Relâmpago). Retorna rotas fechadas. */
  rush(now: number, count: number): string[] {
    const out: string[] = [];
    const open = [...this.bakers.values()].filter((b) => b.state === "open" && b.x === b.homeX).sort((a, b) => b.packages.length - a.packages.length);
    for (const b of open.slice(0, count)) {
      b.misplaced = [];
      while (b.packages.length < b.target) b.packages.push({ ...generatePackage(this.rng), route: b.route, island: b.island as Island, labeled: true, issue: "" });
      b.setupDone = true;
      this.checkBaker(b, now);
      out.push(b.route);
    }
    this.alert = "Onda inteira no Flash Parking! Cuidado com o tempo de permanência.";
    return out;
  }

  // ------------------------------------------------------------ tick
  private every(key: string, dt: number, period: number): boolean {
    this.npcAcc[key] = (this.npcAcc[key] ?? 0) + dt;
    if (this.npcAcc[key] >= period) {
      this.npcAcc[key] -= period;
      return true;
    }
    return false;
  }

  tick(dt: number, clock: number) {
    const h = hourOf(clock);
    const onShift = h >= 6 && h < 22;
    const boost = clock < this.sorterBoostUntil ? 1.6 : 1;
    const night = onShift ? 1 : 0.35;

    // esteira anda
    this.beltAcc += dt;
    while (this.beltAcc >= 0.3) {
      this.beltAcc -= 0.3;
      const last = this.belt[this.beltLen - 1];
      if (last) this.goleiro.push(last);
      for (let i = this.beltLen - 1; i > 0; i--) this.belt[i] = this.belt[i - 1];
      this.belt[0] = null;
      if (this.reinduce.length) this.belt[0] = this.reinduce.shift()!;
      // REPs pescadores (NPC)
      for (const isl of ISLANDS) {
        const [a, b] = this.islandSlots(isl);
        for (let i = a; i <= b; i++) {
          const p = this.belt[i];
          if (!p || p.island !== isl || needsTreatment(p)) continue;
          if (this.rng() < 0.12 * boost * night) {
            this.belt[i] = null;
            const home = this.homeBaker(p.route);
            if (!home || (home.state !== "open" && home.state !== "pending")) {
              this.reinduce.push(p);
              continue;
            }
            const err = this.rng() < 0.035;
            if (err) {
              const other = this.homeBaker(pick(this.rng, ROUTES.filter((r) => r.island === isl && r.id !== p.route)).id);
              if (other && (other.state === "open" || other.state === "pending")) this.addToBaker(other, p, false, clock);
              else this.addToBaker(home, p, true, clock);
            } else this.addToBaker(home, p, true, clock);
            this.counters.green++;
            break;
          }
        }
      }
    }

    // REP da etiquetagem (NPC)
    if (this.every("label", dt, 2.4 / night) && this.backlog.length) {
      const p = this.backlog.shift()!;
      if (p.issue === "danificado" || p.issue === "liquido") this.ps.push(p);
      else {
        if (p.issue === "sem_etiqueta") p.issue = "";
        this.induce(p);
        this.counters.labeled++;
      }
    }
    // goleiro (NPC)
    if (this.every("goleiro", dt, (this.goleiro.length > 25 ? 1.2 : 3) / night) && this.goleiro.length) {
      const p = this.goleiro.shift()!;
      this.applyGoleiroBin(p, correctGoleiroBin(p));
    }
    // PS (NPC Juca)
    if (this.every("ps", dt, 9) && this.ps.length) this.resolvePs(this.ps.shift(), this.rng() < 0.75);
    // volumosos (NPC) — One Bip direto no baker
    if (this.every("vol", dt, 11 / night) && this.volumosos.length) {
      const p = this.volumosos.shift()!;
      const b = this.homeBaker(p.route);
      if (b && (b.state === "open" || b.state === "pending")) this.addToBaker(b, p, true, clock);
      else this.volumosos.push(p);
    }
    if (this.every("help", dt, 20) && this.helpDesk > 0) {
      this.helpDesk--;
      this.backlog.push(generatePackage(this.rng));
    }
    // setup automático e auditoria automática (rede de segurança para não travar o mundo)
    if (this.every("auto", dt, 3)) {
      for (const b of this.bakers.values()) {
        if (!b.setupDone && clock - b.setupAt > 6) b.setupDone = true;
        if (b.state === "pending" && b.misplaced.length && this.rng() < 0.04) this.auditFix(b, b.misplaced.map((p) => p.id), clock);
      }
    }
    if (this.surgeUntil && clock > this.surgeUntil) {
      this.surgeUntil = 0;
      this.alert = "";
    }
    if (!this.surgeUntil && this.alert && this.goleiro.length < 6 && this.backlog.length < 40) this.alert = "";
  }

  heatmap(): Record<string, { belt: number; bakers: number; pending: number }> {
    const out: Record<string, { belt: number; bakers: number; pending: number }> = {};
    for (const isl of ISLANDS) {
      const [a, b] = this.islandSlots(isl);
      let belt = 0;
      for (let i = a; i <= b; i++) if (this.belt[i]?.island === isl) belt++;
      let fill = 0;
      let pending = 0;
      for (const bk of this.bakers.values())
        if (bk.island === isl && bk.x === bk.homeX) {
          fill += (bk.packages.length + bk.misplaced.length) / bk.target;
          if (bk.state === "pending") pending++;
        }
      out[isl] = { belt, bakers: Math.round((fill / 4) * 100), pending };
    }
    return out;
  }

  greenRate(): number {
    const t = this.counters.green + this.counters.orange + this.counters.red;
    return t ? Math.round((this.counters.green / t) * 1000) / 10 : 100;
  }
}
