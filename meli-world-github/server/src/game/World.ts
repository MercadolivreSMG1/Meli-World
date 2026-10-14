/**
 * World: toda a lógica do jogo, independente de rede.
 * O WorldRoom (Colyseus) só repassa mensagens para cá e espelha o estado.
 * Isso permite testar o jogo inteiro sem servidor (ver src/tests/simulate.ts).
 */
import {
  hashString, AnimName, applyEvent, availableMissions, boxBlocked, canAccept, CARRY_MULT, DAY_START_MIN, dayOf, DialogMessage,
  distToRect, Dir, expireMissions, finishMission, formatClock, GAME_MIN_PER_SEC, GameEvent, generatePackage, getWorld,
  hourOf, INTERACT_RANGE, InteractRequest, isInWarehouse, ITEMS, levelFromXp, MAX_CARRY, MAX_ENERGY, MIN_BATTERY_TO_START,
  MISSION_BY_ID, MissionBook, mulberry32, NPC_BY_ID, NPCS, PackageData, PERKS, Profile, PROP_DEFS, PUSH_MULT, RUN_MULT,
  ROUTE_BY_ID, ROUTES, sanitizeAppearance, SKILLS, speedMultiplier, startMission, STARTING_ITEMS, TILE, TIRED_MULT,
  titleFor, WALK_SPEED, xpForLevel, zoneAt, pick, Island, MinigameKind, routeLabel, WAVE_NAMES, InputMessage,
} from "../../../shared/src";
import type { PlayerRecord, Repo } from "../db/types";
import type { BakerEntity, NpcEntity, Outbox, PlayerEntity, VehicleEntity } from "./entities";
import * as MG from "./minigames";
import { Npcs } from "./Npcs";
import { Ops } from "./Ops";
import { Vehicles } from "./Vehicles";

export interface JoinOptions {
  token?: string;
  name?: string;
  look?: unknown;
}

type XpCat = "sorting" | "qualidade" | "expedicao" | "geral";

export class World {
  readonly map = getWorld();
  readonly rng = mulberry32(Date.now() & 0xffffffff);
  readonly ops = new Ops(this.rng);
  readonly vehicles = new Vehicles(this.rng);
  readonly npcs = new Npcs(this.rng);
  players = new Map<string, PlayerEntity>();
  clock = DAY_START_MIN; // minutos de jogo absolutos
  serverStart = Date.now();
  private bakerActor = new Map<string, string>(); // bakerId -> sid do último jogador
  private secAcc = 0;
  private autoAcc = 0;
  private tokenSeq = 0;

  constructor(private repo: Repo, private out: Outbox) {
    this.bootstrap();
  }

  // =====================================================================================
  // Cenário inicial (o mundo já começa "vivo")
  // =====================================================================================
  private bootstrap() {
    this.ops.addInbound(40);
    for (let i = 0; i < 22; i++) {
      const idx = Math.floor(this.rng() * this.ops.beltLen);
      if (!this.ops.belt[idx]) this.ops.belt[idx] = { ...generatePackage(this.rng, { issueRate: 0.08 }), labeled: true };
    }
    for (const b of this.ops.bakers.values()) {
      const n = Math.floor(b.target * (0.2 + this.rng() * 0.5));
      for (let i = 0; i < n; i++) b.packages.push({ ...generatePackage(this.rng), route: b.route, island: b.island as Island, issue: "", labeled: true });
      b.setupDone = this.rng() < 0.6;
    }
    // dois bakers da Onda 1 já fechados, com vans na doca
    const far = ROUTES.filter((r) => r.wave === 1).slice(0, 2);
    for (const r of far) {
      const b = this.ops.homeBaker(r.id)!;
      while (b.packages.length < b.target) b.packages.push({ ...generatePackage(this.rng), route: b.route, island: b.island as Island, issue: "", labeled: true });
      b.setupDone = true;
      this.ops.checkBaker(b, this.clock);
      this.vehicles.spawnVan(r.id, this.clock, true);
    }
    // um baker pendente (com erro de sorting) para auditoria
    const pend = this.ops.homeBaker("B3")!;
    pend.misplaced.push({ ...generatePackage(this.rng), route: "B1", island: "B", issue: "", labeled: true });
    pend.state = "pending";
    this.vehicles.spawnLh(this.clock, true);
    this.vehicles.backlogSize = () => this.ops.backlog.length;

    this.ops.onBakerClosed = (b) => {
      if (!this.vehicles.vanFor(b.route)) this.vehicles.spawnVan(b.route, this.clock);
      const sid = this.bakerActor.get(b.id);
      const p = sid ? this.players.get(sid) : undefined;
      if (p) {
        this.emit(p, { type: "baker_closed", route: b.route });
        this.gainXp(p, 20, "sorting");
        this.toast(p, `Baker ${b.route} fechou automaticamente (completo)!`, "good");
      }
    };
    this.vehicles.onDispatch = (v, late) => {
      this.ops.counters.dispatched++;
      if (late) this.ops.counters.late++;
      this.out.broadcast("toast", { text: `Rota ${v.route} despachada (${WAVE_NAMES[v.wave] ?? ""})${late ? " — ATRASADA" : ""}`, kind: late ? "warn" : "info" });
      const p = this.playerById(v.loadedBy);
      if (p) {
        this.gainXp(p, late ? 15 : 40, "expedicao");
        this.emit(p, { type: "dispatch", wave: v.wave, late, route: v.route });
        this.history(p, "dispatch", `Despachou a rota ${v.route}${late ? " (atrasada)" : ""}`);
      }
    };
    this.vehicles.onCount = (v, ok) => {
      const p = this.playerById(v.loadedBy);
      if (!p) return;
      if (ok) this.toast(p, `Motorista conferiu a rota ${v.route}. Confirme "Já carreguei tudo" na van.`, "good");
      else if (v.state === "aduana") this.toast(p, `Contagem da rota ${v.route} falhou 2x: ADUANA! Faça a recontagem na van.`, "bad");
      else this.toast(p, `Motorista errou a contagem da rota ${v.route} (1/2). Recontando…`, "warn");
    };
    this.npcs.onTrasladoDone = (bakerId, vanId) => {
      const b = this.ops.bakers.get(bakerId);
      const v = this.vehicles.list.get(vanId);
      if (!b) return;
      if (v && v.state === "docked") {
        v.load = b.packages.length;
        this.ops.bakers.delete(b.id);
        this.vehicles.startCount(v, this.clock);
      } else {
        b.state = "staged";
        b.pushedBy = "";
      }
    };
  }

  // =====================================================================================
  // Conexão
  // =====================================================================================
  async join(sid: string, opts: JoinOptions): Promise<PlayerEntity> {
    const token = typeof opts.token === "string" && opts.token.length >= 8 ? opts.token.slice(0, 128) : randomToken();
    const id = playerIdFrom(token);
    // reconexão / segunda aba: encerra a sessão antiga (solta baker, devolve pacotes, salva)
    for (const other of [...this.players.values()]) if (other.id === id) await this.leave(other.sid);
    let rec = await this.repo.load(id);
    const name = String(opts.name ?? "").replace(/[^\p{L}\p{N} ._-]/gu, "").trim().slice(0, 18) || `REP${Math.floor(this.rng() * 900 + 100)}`;
    const isNew = !rec;
    if (!rec) {
      rec = this.newRecord(id, name, sanitizeAppearance(opts.look));
    } else if (opts.look) {
      rec.look = sanitizeAppearance(opts.look);
      if (opts.name) rec.name = name;
    }
    const lv = levelFromXp(rec.xp);
    let [x, y] = [rec.x, rec.y];
    if (!x || !y || boxBlocked(this.map, x, y)) [x, y] = this.map.spawn;
    const p: PlayerEntity = {
      sid, id, name: rec.name, x, y, dir: "down", anim: "idle", look: rec.look, lookJson: JSON.stringify(rec.look),
      equipJson: JSON.stringify(rec.equipped), level: lv.level, title: titleFor(lv.level, rec.perks), carryKind: "",
      carrying: [], bakerId: "", bubble: "", bubbleUntil: 0, moving: false, running: false, sitting: false,
      actionAnim: "", actionUntil: 0, lastMoveAt: Date.now(), ranWhilePushing: false, pending: null, rec,
      dirty: true, profileDirty: true, lastSave: 0, cooldowns: {}, zoneId: "", epiWarnAt: 0,
    };
    this.resetDaily(p);
    this.hist.set(id, await this.repo.history(id, 12).catch(() => []));
    this.players.set(sid, p);
    this.out.broadcast("chat", { from: "SMG1", text: `${p.name} ${isNew ? "chegou para o primeiro dia!" : "entrou no turno."}`, sid: "" });
    if (isNew) await this.repo.addHistory(id, "join", "Contratado(a) no SMG1");
    this.sendProfile(p);
    this.toast(p, isNew ? "Bem-vindo(a) ao SMG1! Fale com o Seu Antônio na portaria (tecla E)." : `Bem-vindo(a) de volta, ${p.name}!`, "info");
    return p;
  }

  private newRecord(id: string, name: string, look: PlayerRecord["look"]): PlayerRecord {
    const inv: Record<string, number> = {};
    for (const [it, q] of STARTING_ITEMS) inv[it] = q;
    return {
      id, name, look, x: 0, y: 0, xp: 0, energy: MAX_ENERGY, battery: 60, skillPoints: 0, skills: {}, perks: [], inventory: inv,
      equipped: { epiVest: false, safetyShoes: false, coletor: false },
      missions: { active: [], completed: [], dailyDone: [], dailyDay: dayOf(this.clock) },
      stats: {}, flags: {}, clockedInDay: 0, createdAt: Date.now(), updatedAt: Date.now(),
    };
  }

  async leave(sid: string) {
    const p = this.players.get(sid);
    if (!p) return;
    this.cancelPending(p);
    this.dropBaker(p);
    for (const pkg of p.carrying) this.ops.reinduce.push(pkg);
    p.carrying = [];
    this.players.delete(sid);
    this.out.broadcast("chat", { from: "SMG1", text: `${p.name} saiu do turno.`, sid: "" });
    await this.save(p);
  }

  async saveAll() {
    for (const p of this.players.values()) await this.save(p);
  }

  private async save(p: PlayerEntity) {
    p.rec.x = p.x;
    p.rec.y = p.y;
    p.rec.name = p.name;
    p.dirty = false;
    p.lastSave = Date.now();
    try {
      await this.repo.save(p.rec);
    } catch (e) {
      console.error("[save]", e);
    }
  }

  private playerById(id: string): PlayerEntity | undefined {
    if (!id) return undefined;
    for (const p of this.players.values()) if (p.id === id) return p;
    return undefined;
  }

  // =====================================================================================
  // Movimento (validação autoritativa da posição enviada pelo cliente)
  // =====================================================================================
  input(sid: string, msg: InputMessage) {
    const p = this.players.get(sid);
    if (!p || !msg) return;
    const now = Date.now();
    const x = Number(msg.x);
    const y = Number(msg.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const elapsed = Math.min(0.35, Math.max(0.016, (now - p.lastMoveAt) / 1000));
    const allowed = this.speedOf(p, !!msg.run) * elapsed * 1.45 + 6;
    const dist = Math.hypot(x - p.x, y - p.y);
    if (dist > allowed || boxBlocked(this.map, x, y)) {
      this.out.send(sid, "correct", { x: p.x, y: p.y });
      p.lastMoveAt = now;
      return;
    }
    if (["down", "up", "left", "right"].includes(msg.dir)) p.dir = msg.dir as Dir;
    p.x = x;
    p.y = y;
    p.moving = !!msg.moving && dist > 0.01;
    p.running = !!msg.run && p.moving && p.carryKind !== "baker" && p.rec.energy > 0;
    if (p.carryKind === "baker" && msg.run && p.moving && !p.ranWhilePushing) {
      p.ranWhilePushing = true;
      this.ops.counters.safetyStrikes++;
      this.toast(p, "Segurança: nunca corra empurrando baker! Este traslado não conta como seguro.", "bad");
    }
    if (p.moving) {
      p.sitting = false;
      if (p.actionAnim === "celebrate" || p.actionAnim === "sit") p.actionAnim = "";
    }
    p.lastMoveAt = now;
    p.dirty = true;
  }

  speedOf(p: PlayerEntity, run: boolean): number {
    let s = WALK_SPEED * speedMultiplier(p.rec.skills);
    if (p.carryKind === "baker") s *= PUSH_MULT * (p.rec.perks.includes("expedicao_relampago") ? 1.2 : 1);
    else {
      if (run && p.rec.energy > 0) s *= RUN_MULT;
      if (p.carrying.length) s *= CARRY_MULT;
    }
    if (p.rec.energy <= 0) s *= TIRED_MULT;
    return s;
  }

  // =====================================================================================
  // Ações e chat
  // =====================================================================================
  action(sid: string, msg: { type?: string; itemId?: string; skill?: string }) {
    const p = this.players.get(sid);
    if (!p || !msg) return;
    const now = Date.now();
    switch (msg.type) {
      case "celebrate":
        p.actionAnim = "celebrate";
        p.actionUntil = now + 1800;
        break;
      case "sit":
        p.sitting = !p.sitting;
        break;
      case "drop":
        if (p.carryKind === "baker") this.dropBaker(p);
        else if (p.carrying.length) {
          const pkg = p.carrying.pop()!;
          this.ops.reinduce.push(pkg);
          this.toast(p, "Pacote devolvido para reindução (nunca deixe pacote no chão!).", "info");
          if (!p.carrying.length) p.carryKind = "";
          p.profileDirty = true;
        }
        break;
      case "use":
        this.useItem(p, String(msg.itemId ?? ""));
        break;
      case "skill":
        this.upgradeSkill(p, String(msg.skill ?? ""));
        break;
      case "equip":
        this.toggleEquip(p, String(msg.itemId ?? ""));
        break;
    }
  }

  chat(sid: string, text: unknown) {
    const p = this.players.get(sid);
    if (!p || typeof text !== "string") return;
    const clean = text.replace(/[<>]/g, "").trim().slice(0, 140);
    if (!clean) return;
    p.bubble = clean;
    p.bubbleUntil = Date.now() + 6000;
    this.out.broadcast("chat", { from: p.name, text: clean, sid });
  }

  setAppearance(sid: string, look: unknown) {
    const p = this.players.get(sid);
    if (!p) return;
    p.look = sanitizeAppearance(look);
    p.rec.look = p.look;
    p.lookJson = JSON.stringify(p.look);
    p.dirty = true;
    this.toast(p, "Visual atualizado!", "good");
  }

  private useItem(p: PlayerEntity, itemId: string) {
    const def = ITEMS[itemId];
    if (!def || !(p.rec.inventory[itemId] > 0)) return;
    if (def.equip) return this.toggleEquip(p, itemId);
    if (!def.consumable) return this.toast(p, def.desc, "info");
    if (def.consumable.energy) p.rec.energy = Math.min(MAX_ENERGY, p.rec.energy + def.consumable.energy);
    if (def.consumable.battery) p.rec.battery = Math.min(100, p.rec.battery + def.consumable.battery);
    p.rec.inventory[itemId]--;
    if (p.rec.inventory[itemId] <= 0) delete p.rec.inventory[itemId];
    this.toast(p, `Usou ${def.name}.`, "good");
    p.profileDirty = true;
    p.dirty = true;
  }

  private toggleEquip(p: PlayerEntity, itemId: string) {
    const def = ITEMS[itemId];
    if (!def?.equip || !(p.rec.inventory[itemId] > 0)) return;
    p.rec.equipped[def.equip] = !p.rec.equipped[def.equip];
    p.equipJson = JSON.stringify(p.rec.equipped);
    if (p.rec.equipped.epiVest && p.rec.equipped.safetyShoes) this.emit(p, { type: "equip_epi" });
    p.profileDirty = true;
    p.dirty = true;
  }

  private upgradeSkill(p: PlayerEntity, skill: string) {
    const def = SKILLS.find((s) => s.id === skill);
    if (!def || p.rec.skillPoints <= 0) return;
    const cur = p.rec.skills[skill] ?? 0;
    if (cur >= def.max) return this.toast(p, "Habilidade no nível máximo.", "info");
    p.rec.skills[skill] = cur + 1;
    p.rec.skillPoints--;
    this.toast(p, `${def.name} agora no nível ${cur + 1}!`, "good");
    p.profileDirty = true;
    p.dirty = true;
  }

  // =====================================================================================
  // Interações
  // =====================================================================================
  interact(sid: string, req: InteractRequest) {
    const p = this.players.get(sid);
    if (!p || !req || p.pending) return;
    switch (req.kind) {
      case "prop":
        return this.interactProp(p, String(req.id));
      case "npc":
        return this.interactNpc(p, String(req.id));
      case "vehicle":
        return this.interactVehicle(p, String(req.id));
      case "baker":
        return this.interactBaker(p, String(req.id));
      case "belt":
        return this.interactBelt(p, String(req.id) as Island);
    }
  }

  private near(p: PlayerEntity, tx: number, ty: number, tw: number, th: number, extra = 0) {
    return distToRect(p.x, p.y, tx, ty, tw, th) <= INTERACT_RANGE + extra;
  }

  private requireOps(p: PlayerEntity, needColetor = true): boolean {
    if (!p.rec.equipped.epiVest || !p.rec.equipped.safetyShoes) {
      this.toast(p, "Sem EPI, sem operação! Vista colete refletivo e calçado de segurança (armário de EPI).", "bad");
      return false;
    }
    if (p.rec.clockedInDay !== dayOf(this.clock)) {
      this.toast(p, "Bata o ponto na portaria antes de operar.", "warn");
      return false;
    }
    if (needColetor) {
      if (!p.rec.equipped.coletor) {
        this.toast(p, "Você precisa de um coletor (pegue no carregador de coletores).", "warn");
        return false;
      }
      if (p.rec.battery < 8) {
        this.toast(p, "Bateria do coletor no fim! Recarregue no carregador ou use uma bateria extra.", "bad");
        return false;
      }
    }
    return true;
  }

  private open(p: PlayerEntity, kind: MinigameKind, built: MG.Built, ctx: Record<string, unknown> = {}) {
    const token = `mg${++this.tokenSeq}${Math.floor(this.rng() * 1e6)}`;
    p.pending = { token, kind, answer: built.answer, ctx, openedAt: Date.now() };
    p.actionAnim = kind === "training" || kind === "kpi" ? "interact" : "work";
    p.actionUntil = Date.now() + 60_000;
    this.out.send(p.sid, "minigame", { token, kind, title: built.title, data: built.data });
  }

  private interactProp(p: PlayerEntity, id: string) {
    const prop = this.map.props.find((x) => x.id === id);
    if (!prop) return;
    const def = PROP_DEFS[prop.kind];
    if (!def.interact || !this.near(p, prop.x, prop.y, prop.w, prop.h)) return;
    const day = dayOf(this.clock);
    switch (def.interact) {
      case "timeclock": {
        if (p.rec.clockedInDay === day) return this.toast(p, `Ponto já registrado hoje. Bom trabalho!`, "info");
        p.rec.clockedInDay = day;
        this.emit(p, { type: "clock_in" });
        this.toast(p, `Ponto registrado às ${formatClock(this.clock)}. Bom turno!`, "good");
        this.history(p, "ponto", `Bateu o ponto às ${formatClock(this.clock)} (dia ${day})`);
        p.profileDirty = true;
        return;
      }
      case "locker": {
        const inv = p.rec.inventory;
        if (!inv.colete || !inv.botina) {
          inv.colete = 1;
          inv.botina = 1;
          p.rec.equipped.epiVest = true;
          p.rec.equipped.safetyShoes = true;
          this.toast(p, "Você recebeu colete refletivo e calçado de segurança. EPIs vestidos!", "good");
        } else {
          const on = !(p.rec.equipped.epiVest && p.rec.equipped.safetyShoes);
          p.rec.equipped.epiVest = on;
          p.rec.equipped.safetyShoes = on;
          this.toast(p, on ? "EPIs vestidos." : "EPIs guardados no armário.", "info");
        }
        if (p.rec.equipped.epiVest && p.rec.equipped.safetyShoes) this.emit(p, { type: "equip_epi" });
        p.equipJson = JSON.stringify(p.rec.equipped);
        p.profileDirty = true;
        p.actionAnim = "interact";
        p.actionUntil = Date.now() + 600;
        return;
      }
      case "mirror":
        this.out.send(p.sid, "openCreator", {});
        return;
      case "charger": {
        if (!p.rec.inventory.coletor) {
          p.rec.inventory.coletor = 1;
          p.rec.equipped.coletor = true;
          this.toast(p, "Você pegou um coletor (HH). Ele fica equipado na sua mão.", "good");
        }
        p.rec.equipped.coletor = true;
        p.rec.battery = 100;
        p.equipJson = JSON.stringify(p.rec.equipped);
        this.toast(p, "Coletor carregado: 100%.", "good");
        if (p.rec.battery >= MIN_BATTERY_TO_START) this.emit(p, { type: "charge" });
        p.profileDirty = true;
        return;
      }
      case "kpi": {
        this.emit(p, { type: "kpi_view" });
        this.open(p, "kpi", { title: "Painel de Indicadores · SMG1", data: this.kpiSnapshot(p), answer: null });
        return;
      }
      case "missions": {
        const book = this.book(p);
        const avail = availableMissions(book, "board");
        this.out.send(p.sid, "board", {
          available: avail.map((m) => ({ id: m.id, title: m.title, summary: m.summary, daily: !!m.daily, xp: m.rewards.xp })),
          npcMissions: NPCS.flatMap((n) => availableMissions(book, n.id).map((m) => ({ id: m.id, title: m.title, giver: n.name, summary: m.summary }))),
        });
        return;
      }
      case "training": {
        if ((p.cooldowns.training ?? 0) > this.clock) return this.toast(p, "Aguarde um pouco antes de refazer o treinamento.", "info");
        this.open(p, "training", MG.buildTraining(this.rng));
        return;
      }
      case "flowrack":
        return this.toast(p, `Flowrack: ${this.ops.backlog.length} pacotes aguardando etiquetagem · ${this.ops.reinduce.length} para reindução.`, "info");
      case "label_table": {
        if (!this.requireOps(p)) return;
        if (p.carrying.length) return this.toast(p, "Mãos ocupadas: conteinerize ou devolva os pacotes antes.", "warn");
        const pkgs = this.ops.backlog.splice(0, 3);
        if (!pkgs.length) return this.toast(p, "Flowrack vazio! Receba um LH na doca de recebimento.", "info");
        this.open(p, "labeling", MG.buildLabeling(this.rng, pkgs), { pkgs });
        return;
      }
      case "sorter_panel": {
        if (!this.requireOps(p, false)) return;
        this.open(p, "sorter", MG.buildSorter(this.rng));
        return;
      }
      case "goleiro": {
        if (!this.requireOps(p)) return;
        const items = this.ops.goleiro.splice(0, 6);
        if (!items.length) return this.toast(p, "Goleiro limpo! Nenhum pacote para triar.", "good");
        this.open(p, "goleiro", MG.buildGoleiro(items), { pkgs: items });
        return;
      }
      case "ps_desk": {
        if (!this.requireOps(p)) return;
        const items = this.ops.ps.splice(0, 4);
        this.open(p, "ps", MG.buildPs(this.rng, items), { pkgs: items });
        return;
      }
      case "audit_desk": {
        if (!this.requireOps(p)) return;
        const b = [...this.ops.bakers.values()].find((x) => x.state === "pending");
        if (!b) return this.toast(p, "Nenhum baker pendente de auditoria agora.", "good");
        this.open(p, "audit", MG.buildAudit(this.rng, b.route, b.packages, b.misplaced), { bakerId: b.id });
        return;
      }
      case "help_desk": {
        if (!this.requireOps(p)) return;
        if (!this.ops.helpDesk) return this.toast(p, "Mesa de Ajuda vazia.", "info");
        const n = this.ops.helpDesk;
        this.ops.helpDesk = 0;
        for (let i = 0; i < n; i++) this.ops.backlog.push(generatePackage(this.rng));
        this.gainXp(p, 6 * n, "qualidade");
        this.toast(p, `${n} pacote(s) solto(s) tratados e enviados à etiquetagem.`, "good");
        return;
      }
      case "volumosos": {
        if (!this.requireOps(p)) return;
        const items = this.ops.volumosos.splice(0, 5);
        while (items.length < 3) items.push({ ...generatePackage(this.rng, { volumosoRate: 0.7 }), labeled: true });
        this.open(p, "volumosos", MG.buildVolumosos(items), { pkgs: items });
        return;
      }
      case "custody":
        return this.toast(p, `Custódia: ${this.ops.custody} pacote(s) aguardando autorização (waiting_authority).`, "info");
      case "coffee": {
        if ((p.cooldowns.coffee ?? 0) > this.clock) return this.toast(p, "Já tomou café agora há pouco!", "info");
        p.cooldowns.coffee = this.clock + 15;
        p.rec.energy = Math.min(MAX_ENERGY, p.rec.energy + 20);
        p.actionAnim = "interact";
        p.actionUntil = Date.now() + 900;
        this.toast(p, "+20 energia. Hidratação também é segurança!", "good");
        p.profileDirty = true;
        return;
      }
      case "food": {
        if ((p.cooldowns.food ?? 0) > this.clock) return this.toast(p, "Você já almoçou. Volte mais tarde!", "info");
        p.cooldowns.food = this.clock + 120;
        p.rec.energy = MAX_ENERGY;
        p.rec.inventory.marmita = (p.rec.inventory.marmita ?? 0) + 1;
        this.emit(p, { type: "eat" });
        this.toast(p, "Refeição completa! Energia cheia e uma marmita para depois.", "good");
        p.profileDirty = true;
        return;
      }
      case "seat": {
        p.x = (prop.x + prop.w / 2) * TILE;
        p.y = (prop.y + 1) * TILE - 1;
        if (boxBlocked(this.map, p.x, p.y)) p.y = (prop.y + 1) * TILE + 6;
        p.sitting = true;
        this.out.send(p.sid, "correct", { x: p.x, y: p.y, sit: true });
        return;
      }
      case "setup_station": {
        if (!this.requireOps(p)) return;
        const routes = [...this.ops.bakers.values()].filter((b) => !b.setupDone && b.state === "open").slice(0, 2).map((b) => b.route);
        if (!routes.length) return this.toast(p, "Todos os bakers já estão preparados (QR + sacas).", "good");
        this.open(p, "setup", MG.buildSetup(this.rng, routes), { routes });
        return;
      }
      case "briefing": {
        const tier1 = p.rec.missions.active.some((m) => m.id === "tier1");
        const h = hourOf(this.clock);
        const window = (h >= 5.5 && h < 8) || (h >= 13.8 && h < 16) || (h >= 21.5 && h < 23.5);
        if (!tier1 && !window) return this.toast(p, "O Tier 1 acontece no início de cada turno (06:00, 14:20 e 22:00).", "info");
        if (p.rec.flags.briefingDay === day) return this.toast(p, "Você já participou do Tier 1 de hoje.", "info");
        p.rec.flags.briefingDay = day;
        const hm = this.ops.heatmap();
        const worst = Object.entries(hm).sort((a, b) => b[1].belt - a[1].belt)[0];
        this.dialog(p, {
          npcId: "livia", name: "Tier 1 · Briefing Operacional", role: `Dia ${day} · ${formatClock(this.clock)}`,
          lines: [
            `Layout: ${this.ops.bakers.size} bakers em ${4} ilhas. Ilha com mais carga agora: ${worst?.[0] ?? "-"}.`,
            `Insumos: etiquetas, sacas e coletores carregados (bateria ≥ 85%).`,
            `Pessoas: confira sua ilha e o lado (direito/esquerdo) antes de pescar.`,
            `Metas: % telas verdes acima de 98%, zero rota atrasada no Flash Parking.`,
            `Segurança: EPI sempre, nunca correr com baker, 5 km/h junto à operação.`,
          ],
          choices: [{ id: "bye", text: "Entendido! Bora pro turno." }],
        });
        this.emit(p, { type: "briefing" });
        this.gainXp(p, 15, "geral");
        return;
      }
    }
  }

  private interactBelt(p: PlayerEntity, island: Island) {
    if (!["A", "B", "C", "D"].includes(island)) return;
    const [a, b] = this.map.islandRanges[island];
    if (!this.near(p, a, this.map.belt.y, b - a + 1, 2, 4)) return;
    if (!this.requireOps(p)) return;
    if (p.carryKind === "baker") return this.toast(p, "Solte o baker antes de pescar (tecla Q).", "warn");
    const free = MAX_CARRY - p.carrying.length;
    if (free <= 0) return this.toast(p, `Mãos cheias (máx. ${MAX_CARRY} pacotes). Conteinerize nos bakers da ilha.`, "warn");
    const items = this.ops.upcomingFor(island);
    const built = MG.buildFishing(this.rng, island, items, (p.rec.skills.sorting ?? 0) * 0.06, p.rec.perks.includes("automacao_pro_max"));
    const map: Record<string, string> = {};
    for (const it of (built.data as any).items) map[it.id] = it.island + "|" + it.route;
    this.open(p, "fishing", built, { island, map, free });
  }

  private interactBaker(p: PlayerEntity, id: string) {
    const b = this.ops.bakers.get(id);
    if (!b) return;
    const dist = Math.hypot(p.x - b.x, p.y - 8 - (b.y - 16));
    if (dist > INTERACT_RANGE + 18) return;
    // conteinerizar
    if (p.carrying.length) {
      if (!this.requireOps(p)) return;
      if (b.state === "closed" || b.state === "staged" || b.state === "moving" || b.state === "loaded")
        return this.toast(p, `Baker ${b.route} está fechado. Leve-o para a expedição.`, "warn");
      if (!b.setupDone) {
        this.ops.counters.red++;
        this.bump(p, "red");
        return this.toast(p, `Tela VERMELHA: baker ${b.route} sem QR vinculado. Faça a Preparação de carrinhos!`, "bad");
      }
      p.rec.battery = Math.max(0, p.rec.battery - 1);
      const pkg = p.carrying.find((x) => x.route === b.route);
      if (!pkg) {
        this.ops.counters.orange++;
        this.bump(p, "orange");
        this.fx(p, "LARANJA", "#f08a24");
        const routes = [...new Set(p.carrying.map((x) => x.route))].join(", ");
        return this.toast(p, `Tela LARANJA: contêiner errado! Seus pacotes são da(s) rota(s) ${routes}; este baker é ${b.route}.`, "bad");
      }
      this.ops.counters.green++;
      this.bump(p, "green");
      this.open(p, "containerize", MG.buildContainerize(pkg, b.route), { pkgId: pkg.id, bakerId: b.id });
      return;
    }
    if (p.carryKind === "baker") return;
    if (b.state === "pending") {
      if (!this.requireOps(p)) return;
      this.open(p, "audit", MG.buildAudit(this.rng, b.route, b.packages, b.misplaced), { bakerId: b.id });
      return;
    }
    if (b.state === "closed" || b.state === "staged") {
      if (!this.requireOps(p, false)) return;
      if (b.pushedBy) return this.toast(p, "Outra pessoa já está trasladando este baker.", "info");
      const wasHome = b.x === b.homeX && b.y === b.homeY;
      b.state = "moving";
      b.pushedBy = p.sid;
      p.carryKind = "baker";
      p.bakerId = b.id;
      p.ranWhilePushing = false;
      p.sitting = false;
      if (wasHome) this.ops.spawnBaker(b.route, this.clock);
      const v = this.vehicles.vanFor(b.route);
      const where = v?.dock ? `doca ${v.dock}` : "Stage Zone (a van ainda não encostou)";
      this.toast(p, `Traslado do baker ${b.route} → ${where}. Empurre pela lateral e NÃO corra.`, "info");
      p.profileDirty = true;
      return;
    }
    this.toast(p, `Baker ${routeLabel(b.route)} · ${b.packages.length + b.misplaced.length}/${b.target} pacotes${b.setupDone ? "" : " · SEM SETUP"}`, "info");
  }

  private dropBaker(p: PlayerEntity) {
    if (p.carryKind !== "baker") return;
    const b = this.ops.bakers.get(p.bakerId);
    if (b) {
      b.state = "staged";
      b.pushedBy = "";
    }
    p.carryKind = "";
    p.bakerId = "";
    p.profileDirty = true;
  }

  private interactVehicle(p: PlayerEntity, id: string) {
    const v = this.vehicles.list.get(id);
    if (!v) return;
    const halfW = v.kind === "lh" ? 1.5 : 1;
    const halfH = v.kind === "lh" ? 3 : 2;
    if (!this.near(p, v.x / TILE - halfW, v.y / TILE - halfH, halfW * 2, halfH * 2, 10)) return;
    if (v.kind === "lh") {
      if (v.state !== "docked") return this.toast(p, v.state === "counting" ? "Descarregando HUs…" : "Caminhão em manobra.", "info");
      if (!this.requireOps(p)) return;
      this.open(p, "receiving", MG.buildReceiving(this.rng, v), { vanId: v.id });
      return;
    }
    switch (v.state) {
      case "docked": {
        if (p.carryKind !== "baker") return this.toast(p, `Van da rota ${routeLabel(v.route)} na doca ${v.dock}. Traga o baker fechado da rota.`, "info");
        const b = this.ops.bakers.get(p.bakerId);
        if (!b || b.route !== v.route) return this.toast(p, `Essa van é da rota ${v.route}; o seu baker é da rota ${b?.route}.`, "bad");
        const bulky = b.packages.filter((x) => x.size !== "sortable").length;
        this.open(p, "loading", MG.buildLoading(this.rng, v.route, b.packages.length, bulky), { vanId: v.id, bakerId: b.id });
        return;
      }
      case "counting":
        return this.toast(p, `Motorista ${v.driver} contando os pacotes da rota ${v.route}…`, "info");
      case "aduana":
        if (!this.requireOps(p, false)) return;
        this.open(p, "aduana", MG.buildAduana(this.rng, v.route), { vanId: v.id });
        return;
      case "ready":
        this.dialog(p, {
          npcId: "", name: `Motorista ${v.driver}`, role: v.label,
          lines: ["Contagem conferida! Posso confirmar 'Já carreguei tudo' e fazer o Gate Out pelo app?"],
          choices: [{ id: `dispatch:${v.id}`, text: "Confirmar e liberar a saída" }, { id: "bye", text: "Aguarde um momento" }],
        });
        return;
      case "waiting":
      case "arriving":
        return this.toast(p, `Van da rota ${v.route} aguardando no Flash Parking (${WAVE_NAMES[v.wave] ?? ""}).`, "info");
      default:
        return;
    }
  }

  private interactNpc(p: PlayerEntity, id: string) {
    const n = this.npcs.list.get(id);
    if (!n || Math.hypot(n.x - p.x, n.y - p.y) > INTERACT_RANGE + 14) return;
    this.npcs.faceTalk(n, p.x, p.y, Date.now());
    this.emit(p, { type: "talk", npc: id });
    if (n.ambient) return this.talkRep(p, n);
    const def = NPC_BY_ID[id];
    const book = this.book(p);
    const offer = availableMissions(book, id)[0];
    const active = p.rec.missions.active.find((m) => MISSION_BY_ID[m.id]?.giver === id);
    if (offer) {
      this.dialog(p, {
        npcId: id, name: def.name, role: def.role, lines: [`[Missão] ${offer.title}`, ...offer.intro],
        choices: [{ id: `accept:${offer.id}`, text: "Aceitar missão" }, { id: "tip", text: "Me dá uma dica de processo" }, { id: "bye", text: "Agora não" }],
      });
      return;
    }
    if (active) {
      const md = MISSION_BY_ID[active.id];
      const lines = md.objectives.map((o) => `${(active.progress[o.id] ?? 0) >= o.count ? "✔" : "•"} ${o.text} (${active.progress[o.id] ?? 0}/${o.count})`);
      this.dialog(p, {
        npcId: id, name: def.name, role: def.role, lines: [`Como vai "${md.title}"?`, ...lines],
        choices: [{ id: "tip", text: "Uma dica?" }, { id: "bye", text: "Tô nessa!" }],
      });
      return;
    }
    const e = this.npcs.currentEntry(id, this.clock);
    this.dialog(p, {
      npcId: id, name: def.name, role: def.role,
      lines: [pick(this.rng, def.greetings), `(${e.label})`, pick(this.rng, def.lines)],
      choices: [{ id: "tip", text: "Me ensina algo das WIs?" }, { id: "bye", text: "Valeu!" }],
    });
  }

  private talkRep(p: PlayerEntity, n: NpcEntity) {
    const needs = p.rec.missions.active.some((m) => MISSION_BY_ID[m.id]?.objectives.some((o) => o.type === "assign_rep" && (m.progress[o.id] ?? 0) < o.count));
    const assigned = (n.assignedUntil[p.id] ?? 0) > this.clock;
    const hm = this.ops.heatmap();
    const worst = Object.entries(hm).sort((a, b) => b[1].belt - a[1].belt)[0]?.[0] ?? "A";
    const choices = needs && !assigned
      ? [
          { id: `assign:${n.id}:ilha${worst}`, text: `Reforçar a ilha ${worst} (mais carga agora)` },
          { id: `assign:${n.id}:goleiro`, text: `Ajudar o goleiro (${this.ops.goleiro.length} pacotes)` },
          { id: `assign:${n.id}:etiquetagem`, text: `Apoiar a etiquetagem (${this.ops.backlog.length} no flowrack)` },
        ]
      : [{ id: "bye", text: "Bom trabalho!" }];
    this.dialog(p, {
      npcId: n.id, name: n.name, role: n.role,
      lines: [pick(this.rng, ["Opa! Tudo certo?", "Oi! Correria hoje, hein?", "E aí! Precisando de algo?", "Fala! Tô aqui firme."]), `Agora estou: ${n.activity}.`],
      choices,
    });
  }

  dialogChoice(sid: string, msg: { npcId?: string; choice?: string }) {
    const p = this.players.get(sid);
    if (!p || !msg || typeof msg.choice !== "string") return;
    const c = msg.choice;
    if (c.startsWith("accept:")) {
      const def = MISSION_BY_ID[c.slice(7)];
      if (!def || !canAccept(this.book(p), def)) return;
      this.acceptMission(p, def.id);
    } else if (c === "tip") {
      const def = NPC_BY_ID[String(msg.npcId)];
      if (!def) return;
      this.dialog(p, { npcId: def.id, name: def.name, role: def.role, lines: [pick(this.rng, def.tips)], choices: [{ id: "bye", text: "Anotado!" }] });
    } else if (c.startsWith("assign:")) {
      const [, npcId, where] = c.split(":");
      const n = this.npcs.list.get(npcId);
      if (!n || (n.assignedUntil[p.id] ?? 0) > this.clock) return;
      n.assignedUntil[p.id] = this.clock + 60;
      n.activity = where === "goleiro" ? "Apoiando o goleiro" : where === "etiquetagem" ? "Apoiando a etiquetagem" : `Reforçando a ${where.replace("ilha", "ilha ")}`;
      if (where === "goleiro") for (const pkg of this.ops.goleiro.splice(0, 3)) this.ops.applyGoleiroBin(pkg, "reinduzir");
      this.emit(p, { type: "assign_rep", npc: npcId });
      this.gainXp(p, 12, "geral");
      this.toast(p, `${n.name} foi direcionado(a): ${n.activity}.`, "good");
    } else if (c.startsWith("dispatch:")) {
      const v = this.vehicles.list.get(c.slice(9));
      if (!v || v.state !== "ready") return;
      if (!v.loadedBy) {
        v.loadedBy = p.id;
        v.loadedByName = p.name;
      }
      this.vehicles.dispatch(v, this.clock);
    }
  }

  missionOp(sid: string, msg: { op?: string; id?: string }) {
    const p = this.players.get(sid);
    if (!p || !msg) return;
    const def = MISSION_BY_ID[String(msg.id)];
    if (!def) return;
    if (msg.op === "accept" && def.giver === "board" && canAccept(this.book(p), def)) this.acceptMission(p, def.id);
    if (msg.op === "abandon") {
      p.rec.missions.active = p.rec.missions.active.filter((m) => m.id !== def.id);
      this.toast(p, `Missão "${def.title}" abandonada.`, "info");
      p.profileDirty = true;
    }
  }

  private acceptMission(p: PlayerEntity, id: string) {
    const def = MISSION_BY_ID[id];
    startMission(this.book(p), def, this.clock);
    this.toast(p, `Nova missão: ${def.title}`, "info");
    this.history(p, "mission", `Aceitou a missão "${def.title}"`);
    if (def.startEvent === "backlog_surge") {
      this.ops.surge(this.clock);
      this.vehicles.spawnLh(this.clock, true);
      this.vehicles.spawnLh(this.clock, true);
    } else if (def.startEvent === "sector_chaos") this.ops.chaos(this.clock);
    else if (def.startEvent === "wave_rush") {
      for (const route of this.ops.rush(this.clock, 3)) if (!this.vehicles.vanFor(route)) this.vehicles.spawnVan(route, this.clock);
    }
    if (def.startEvent) this.out.broadcast("toast", { text: `ALERTA OPERACIONAL: ${this.ops.alert}`, kind: "warn" });
    p.profileDirty = true;
    p.dirty = true;
  }

  // =====================================================================================
  // Resultados dos mini-jogos
  // =====================================================================================
  minigameCancel(sid: string) {
    const p = this.players.get(sid);
    if (p) this.cancelPending(p);
  }

  private cancelPending(p: PlayerEntity) {
    const pend = p.pending;
    if (!pend) return;
    p.pending = null;
    p.actionAnim = "";
    const pkgs = (pend.ctx.pkgs as PackageData[] | undefined) ?? [];
    if (pend.kind === "labeling") this.ops.backlog.unshift(...pkgs);
    else if (pend.kind === "goleiro") this.ops.goleiro.unshift(...pkgs);
    else if (pend.kind === "ps") this.ops.ps.unshift(...pkgs);
    else if (pend.kind === "volumosos") this.ops.volumosos.unshift(...pkgs.filter((x) => x.size !== "sortable" || true));
  }

  minigameResult(sid: string, msg: { token?: string; result?: any }) {
    const p = this.players.get(sid);
    if (!p || !p.pending || !msg || msg.token !== p.pending.token) return;
    const pend = p.pending;
    p.pending = null;
    p.actionAnim = "";
    const r = msg.result ?? {};
    const ctx = pend.ctx;
    const ans = pend.answer as any;
    p.rec.energy = Math.max(0, p.rec.energy - 2);
    p.rec.battery = Math.max(0, p.rec.battery - 1.5);
    p.profileDirty = true;
    p.dirty = true;
    switch (pend.kind) {
      case "receiving": {
        const v = this.vehicles.list.get(String(ctx.vanId));
        const s = MG.scoreReceiving(ans, r);
        if (!v || v.state !== "docked") return;
        if (!s.pass) {
          this.toast(p, `Checklist com erros (${s.correct}/${s.total}). Ordem: motor/chave → calços → romaneio → lacre → QR doca → QR transportador → HUs → sobras.`, "bad");
          this.gainXp(p, 8, "geral");
          return;
        }
        this.ops.addInbound(v.packages);
        v.state = "counting";
        v.countAt = this.clock + 3;
        this.gainXp(p, 60, "geral");
        this.emit(p, { type: "receive_lh" });
        this.toast(p, `LH recebido: ${v.hus} HUs, ${v.packages} pacotes para o flowrack.${v.sealOk ? "" : " Divergência de lacre registrada e TL avisado."}`, "good");
        this.history(p, "receive", `Recebeu um LH com ${v.hus} HUs`);
        return;
      }
      case "labeling": {
        const pkgs = ctx.pkgs as PackageData[];
        const choices: Record<string, string> = r.choices ?? {};
        let ok = 0;
        let labeledOk = 0;
        for (const pkg of pkgs) {
          const right = ans[pkg.id];
          const got = choices[pkg.id];
          if (right === "separar") {
            this.ops.ps.push(pkg);
            if (got === "separar") ok++;
            continue;
          }
          if (got === "separar") {
            this.ops.backlog.push(pkg);
            continue;
          }
          if (pkg.issue === "sem_etiqueta") pkg.issue = "";
          if (got !== right) {
            pkg.issue = "erro_etiquetagem";
            this.ops.counters.errors++;
          } else {
            ok++;
            labeledOk++;
          }
          this.ops.induce(pkg);
          this.ops.counters.labeled++;
        }
        const wrong = pkgs.length - ok;
        this.gainXp(p, ok * 7, "sorting");
        if (labeledOk) this.emit(p, { type: "label", amount: labeledOk });
        this.toast(p, wrong ? `${ok}/${pkgs.length} certos. Etiqueta errada vira "erro de etiquetagem" no goleiro!` : `Etiquetagem perfeita: ${ok}/${pkgs.length}.`, wrong ? "warn" : "good");
        return;
      }
      case "fishing": {
        const island = ctx.island as Island;
        const map = ctx.map as Record<string, string>;
        let free = MAX_CARRY - p.carrying.length;
        const picked: string[] = Array.isArray(r.picked) ? r.picked.slice(0, 6) : [];
        let correct = 0;
        let wrong = 0;
        for (const id of picked) {
          const info = map[id];
          if (!info) continue;
          const [isl, route] = info.split("|");
          if (isl === island && free > 0) {
            let pkg = this.ops.takePackage(id);
            if (!pkg) pkg = { ...generatePackage(this.rng), route, island: island, issue: "", labelType: "normal", labeled: true };
            p.carrying.push(pkg);
            free--;
            correct++;
          } else if (isl !== island) {
            wrong++;
            const pkg = this.ops.takePackage(id);
            if (pkg) this.ops.goleiro.push(pkg);
          }
        }
        if (p.carrying.length) p.carryKind = "pkg";
        this.ops.counters.errors += wrong;
        this.gainXp(p, correct * 5, "sorting");
        if (correct) this.emit(p, { type: "fish_correct", amount: correct });
        this.toast(p, correct ? `Pescou ${correct} pacote(s) da ilha ${island}${wrong ? `; ${wrong} de outra ilha foram para o goleiro` : ""}. Agora conteinerize nos bakers!` : "Nenhum pacote certo pescado.", correct ? "good" : "warn");
        return;
      }
      case "containerize": {
        const b = this.ops.bakers.get(String(ctx.bakerId));
        const i = p.carrying.findIndex((x) => x.id === ctx.pkgId);
        if (!b || i < 0 || (b.state !== "open" && b.state !== "pending")) return;
        const [pkg] = p.carrying.splice(i, 1);
        if (!p.carrying.length) p.carryKind = "";
        const levelOk = r.level === ans.level;
        this.bakerActor.set(b.id, p.sid);
        this.ops.addToBaker(b, pkg, true, this.clock);
        this.gainXp(p, levelOk ? 9 : 3, "sorting");
        this.emit(p, { type: "containerize", green: true, route: b.route });
        this.fx(p, "VERDE", "#38c172");
        if (!levelOk) this.toast(p, `Nível errado: o coletor indicava "${ans.level}". Pacote reposicionado.`, "warn");
        if (p.rec.perks.includes("automacao_pro_max") && this.rng() < 0.25 && (b.state === "open" || b.state === "pending")) {
          const extra = this.ops.belt.findIndex((x) => x?.route === b.route && !x.issue && x.labelType === "normal");
          if (extra >= 0) {
            const e = this.ops.belt[extra]!;
            this.ops.belt[extra] = null;
            this.ops.addToBaker(b, e, true, this.clock);
            this.toast(p, "AUTOMATIZAÇÃO PRO MAX: +1 pacote classificado automaticamente!", "xp");
            this.gainXp(p, 5, "sorting");
          }
        }
        return;
      }
      case "goleiro": {
        const pkgs = ctx.pkgs as PackageData[];
        const s = MG.scoreMap(ans, r);
        for (const pkg of pkgs) this.ops.applyGoleiroBin(pkg, ans[pkg.id]);
        this.gainXp(p, s.correct * 6, "qualidade");
        if (s.correct) this.emit(p, { type: "goleiro_correct", amount: s.correct });
        this.ops.counters.errors += s.total - s.correct;
        this.toast(p, `Triagem: ${s.correct}/${s.total} corretos.${s.correct < s.total ? " Os errados foram corrigidos pelo Wesley." : ""}`, s.pass ? "good" : "warn");
        return;
      }
      case "ps": {
        const pkgs = ctx.pkgs as PackageData[];
        const s = MG.scoreMap(ans, r);
        for (const pkg of pkgs) this.ops.resolvePs(pkg, ans[pkg.id] !== "status_danificado");
        this.gainXp(p, s.correct * 10, "qualidade");
        if (s.correct) this.emit(p, { type: "ps_resolve", amount: s.correct });
        this.toast(p, `PS: ${s.correct}/${s.total} incidências tratadas corretamente.`, s.pass ? "good" : "warn");
        return;
      }
      case "audit": {
        const b = this.ops.bakers.get(String(ctx.bakerId));
        if (!b) return;
        const s = MG.scoreAudit(ans, r);
        this.bakerActor.set(b.id, p.sid);
        const fixed = this.ops.auditFix(b, s.fixed, this.clock);
        this.gainXp(p, fixed * 12, "qualidade");
        if (fixed) this.emit(p, { type: "audit_fix", amount: fixed });
        if (s.falsePos) this.toast(p, `${s.falsePos} pacote(s) marcados por engano — eles eram da rota certa.`, "warn");
        this.toast(p, fixed ? `Auditoria: ${fixed} pacote(s) reposicionado(s). ${b.misplaced.length ? "Ainda há erros!" : "Baker liberado."}` : "Nenhum erro encontrado. Olhe a rota de cada pacote!", fixed ? "good" : "warn");
        return;
      }
      case "volumosos": {
        const pkgs = ctx.pkgs as PackageData[];
        const s = MG.scoreMap(ans, r);
        for (const pkg of pkgs) {
          pkg.size = ans[pkg.id];
          if (pkg.size === "sortable") this.ops.backlog.push(pkg);
          else {
            const b = this.ops.homeBaker(pkg.route);
            if (b && (b.state === "open" || b.state === "pending")) this.ops.addToBaker(b, pkg, true, this.clock);
            else this.ops.volumosos.push(pkg);
          }
        }
        const mult = p.rec.inventory.luvas ? 1.3 : 1;
        this.gainXp(p, Math.round(s.correct * 7 * mult), "expedicao");
        if (s.correct) this.emit(p, { type: "volumosos_correct", amount: s.correct });
        this.toast(p, `Volumosos: ${s.correct}/${s.total}. Lembre: >15 kg no chão = duas pessoas.`, s.pass ? "good" : "warn");
        return;
      }
      case "loading": {
        const v = this.vehicles.list.get(String(ctx.vanId));
        const b = this.ops.bakers.get(String(ctx.bakerId));
        if (!v || !b || v.state !== "docked") return;
        const tol = p.rec.perks.includes("expedicao_relampago") ? 1 : 0;
        const s = MG.scoreOrder(ans, r, tol);
        if (!s.pass) {
          this.toast(p, `Ordem de carregamento incorreta (${s.correct}/${s.total}). Volumosos no piso primeiro; depois as paradas mais distantes (maior número) vão para o fundo.`, "bad");
          return;
        }
        v.load = b.packages.length;
        v.loadedBy = p.id;
        v.loadedByName = p.name;
        this.ops.bakers.delete(b.id);
        p.carryKind = "";
        p.bakerId = "";
        this.vehicles.startCount(v, this.clock);
        const safe = !p.ranWhilePushing;
        this.gainXp(p, safe ? 30 : 12, "expedicao");
        this.emit(p, { type: "traslado", safe });
        this.emit(p, { type: "load_van", route: v.route });
        this.toast(p, `Rota ${v.route} carregada${safe ? " com traslado seguro" : ""}! Motorista ${v.driver} vai contar os pacotes.`, "good");
        return;
      }
      case "aduana": {
        const v = this.vehicles.list.get(String(ctx.vanId));
        if (!v || v.state !== "aduana") return;
        if (Number(r.count) !== ans.count) return this.toast(p, "A recontagem não bate. Conte de novo com calma!", "bad");
        this.vehicles.finishAduana(v, this.clock);
        if (!v.loadedBy) {
          v.loadedBy = p.id;
          v.loadedByName = p.name;
        }
        this.gainXp(p, 30, "expedicao");
        this.emit(p, { type: "aduana" });
        this.toast(p, `Aduana concluída: ${ans.count} pacotes conferidos.`, "good");
        return;
      }
      case "sorter": {
        const s = MG.scoreSorter(ans, r);
        if (!s.pass) return this.toast(p, `Layout desequilibrado (diferença de ${(s.detail as any).diff} pacotes entre ilhas). Meta: ≤ 40.`, "bad");
        this.ops.sorterBoostUntil = this.clock + 60;
        this.gainXp(p, 40, "sorting");
        this.emit(p, { type: "sorter_optimize" });
        this.toast(p, "Layout otimizado! Produtividade das ilhas +60% por 1 hora.", "good");
        return;
      }
      case "training": {
        const s = MG.scoreTraining(ans, r);
        p.cooldowns.training = this.clock + 5;
        this.gainXp(p, s.correct * 8, "geral");
        if (s.pass) {
          this.emit(p, { type: "training_pass" });
          this.toast(p, `Aprovado(a) no treinamento: ${s.correct}/${s.total}!`, "good");
        } else this.toast(p, `${s.correct}/${s.total}. Precisa de 4 acertos. Revise e tente de novo!`, "warn");
        return;
      }
      case "setup": {
        const s = MG.scoreSetup(ans, r);
        if (!s.pass) return this.toast(p, "Setup incorreto: QR no meio da prateleira de cima; ordem: abrir app → QR do baker → sacas → 'Já atribuí todas'.", "bad");
        const routes = ctx.routes as string[];
        let n = 0;
        for (const route of routes) {
          const b = this.ops.homeBaker(route);
          if (b && !b.setupDone) {
            b.setupDone = true;
            n++;
          }
        }
        this.gainXp(p, n * 10, "qualidade");
        if (n) this.emit(p, { type: "setup_baker", amount: n });
        this.toast(p, `Setup concluído em ${n} baker(s): ${routes.join(", ")}.`, "good");
        return;
      }
      default:
        return;
    }
  }

  // =====================================================================================
  // Missões, XP, perfil
  // =====================================================================================
  book(p: PlayerEntity): MissionBook {
    const m = p.rec.missions;
    // O MissionBook compartilha os arrays do registro (mutação direta).
    const book = { level: p.level, active: m.active, completed: m.completed, dailyDone: m.dailyDone };
    return new Proxy(book, {
      set: (t, k, v) => {
        (t as any)[k] = v;
        if (k === "active") m.active = v;
        return true;
      },
    });
  }

  private emit(p: PlayerEntity, ev: GameEvent) {
    p.rec.stats[ev.type] = (p.rec.stats[ev.type] ?? 0) + (ev.amount ?? 1);
    const book = this.book(p);
    const { changed, completed } = applyEvent(book, ev);
    if (changed.length) p.profileDirty = true;
    for (const id of completed) {
      const def = finishMission(book, id);
      if (!def) continue;
      this.gainXp(p, def.rewards.xp, "geral", true);
      for (const [it, q] of def.rewards.items ?? []) p.rec.inventory[it] = (p.rec.inventory[it] ?? 0) + q;
      if (def.rewards.perk && !p.rec.perks.includes(def.rewards.perk)) p.rec.perks.push(def.rewards.perk);
      if (def.rewards.skillPoints) p.rec.skillPoints += def.rewards.skillPoints;
      const giver = NPC_BY_ID[def.giver];
      this.out.send(p.sid, "missionComplete", {
        id, title: def.title, xp: def.rewards.xp, special: !!def.special,
        perk: def.rewards.perk ? PERKS[def.rewards.perk] : null,
        items: (def.rewards.items ?? []).map(([it, q]) => `${q}x ${ITEMS[it]?.name ?? it}`),
        npc: giver ? { id: giver.id, name: giver.name, role: giver.role } : null,
        lines: def.outro,
      });
      if (def.special) this.out.broadcast("toast", { text: `${p.name} concluiu a missão especial ${def.title}!`, kind: "xp" });
      this.history(p, "mission_done", `Concluiu "${def.title}" (+${def.rewards.xp} XP)`);
      p.title = titleFor(p.level, p.rec.perks);
      p.dirty = true;
    }
  }

  private gainXp(p: PlayerEntity, base: number, cat: XpCat, raw = false) {
    if (base <= 0) return;
    let mult = 1;
    if (!raw) {
      if (cat === "sorting") mult += 0.08 * (p.rec.skills.sorting ?? 0);
      if (cat === "qualidade") mult += 0.1 * (p.rec.skills.qualidade ?? 0);
      if (cat === "expedicao") mult += 0.1 * (p.rec.skills.expedicao ?? 0);
      // aura de liderança de jogadores próximos
      for (const o of this.players.values()) {
        if (o === p) continue;
        const l = o.rec.skills.lideranca ?? 0;
        if (l && Math.hypot(o.x - p.x, o.y - p.y) < 6 * TILE) mult += 0.03 * l;
      }
    }
    const amount = Math.round(base * mult);
    const before = p.level;
    p.rec.xp += amount;
    const lv = levelFromXp(p.rec.xp);
    p.level = lv.level;
    this.out.send(p.sid, "xp", { amount });
    if (p.level > before) {
      p.rec.skillPoints += p.level - before;
      p.title = titleFor(p.level, p.rec.perks);
      this.out.send(p.sid, "levelUp", { level: p.level, title: p.title });
      this.out.broadcast("toast", { text: `${p.name} subiu para o nível ${p.level} (${p.title})!`, kind: "xp" });
      this.history(p, "level", `Subiu para o nível ${p.level}`);
    }
    p.profileDirty = true;
    p.dirty = true;
  }

  private bump(p: PlayerEntity, stat: string) {
    p.rec.stats[stat] = (p.rec.stats[stat] ?? 0) + 1;
  }

  private hist = new Map<string, { ts: number; type: string; text: string }[]>();

  private history(p: PlayerEntity, type: string, text: string) {
    const list = this.hist.get(p.id) ?? [];
    list.unshift({ ts: Date.now(), type, text });
    if (list.length > 12) list.length = 12;
    this.hist.set(p.id, list);
    p.profileDirty = true;
    this.repo.addHistory(p.id, type, text).catch(() => {});
  }

  private toast(p: PlayerEntity, text: string, kind: "info" | "good" | "bad" | "xp" | "warn") {
    this.out.send(p.sid, "toast", { text, kind });
  }

  private fx(p: PlayerEntity, text: string, color: string) {
    this.out.broadcast("fx", { x: p.x, y: p.y - 34, text, color });
  }

  private dialog(p: PlayerEntity, d: DialogMessage) {
    this.out.send(p.sid, "dialog", d);
  }

  private resetDaily(p: PlayerEntity) {
    const day = dayOf(this.clock);
    if (p.rec.missions.dailyDay !== day) {
      p.rec.missions.dailyDay = day;
      p.rec.missions.dailyDone = [];
      p.rec.missions.active = p.rec.missions.active.filter((m) => !MISSION_BY_ID[m.id]?.daily);
    }
  }

  async buildProfile(p: PlayerEntity): Promise<Profile> {
    const lv = levelFromXp(p.rec.xp);
    const book = this.book(p);
    return {
      id: p.id, name: p.name, level: lv.level, xp: p.rec.xp, xpToNext: xpForLevel(lv.level), xpThisLevel: lv.into,
      title: p.title, energy: Math.round(p.rec.energy), battery: Math.round(p.rec.battery), skillPoints: p.rec.skillPoints,
      skills: p.rec.skills, perks: p.rec.perks,
      inventory: Object.entries(p.rec.inventory).map(([id, qty]) => ({ id, qty })),
      equipped: p.rec.equipped, clockedIn: p.rec.clockedInDay === dayOf(this.clock),
      activeMissions: p.rec.missions.active, completedMissions: p.rec.missions.completed,
      availableMissions: availableMissions(book).map((m) => m.id), stats: p.rec.stats, carrying: p.carrying,
      history: this.hist.get(p.id) ?? [],
    };
  }

  private sendProfile(p: PlayerEntity) {
    p.profileDirty = false;
    this.buildProfile(p).then((prof) => this.out.send(p.sid, "profile", prof));
  }

  kpiSnapshot(p?: PlayerEntity) {
    const c = this.ops.counters;
    return {
      clock: formatClock(this.clock), day: dayOf(this.clock), backlog: this.ops.backlog.length, reinduce: this.ops.reinduce.length,
      onBelt: this.ops.belt.filter(Boolean).length, goleiro: this.ops.goleiro.length, ps: this.ops.ps.length,
      volumosos: this.ops.volumosos.length, helpDesk: this.ops.helpDesk, custody: this.ops.custody,
      greenRate: this.ops.greenRate(), counters: c, heatmap: this.ops.heatmap(), alert: this.ops.alert,
      bakers: [...this.ops.bakers.values()].map((b) => ({ route: b.route, state: b.state, fill: b.packages.length + b.misplaced.length, target: b.target, setup: b.setupDone })),
      vans: [...this.vehicles.list.values()].filter((v) => v.kind === "van").map((v) => ({ route: v.route, state: v.state, wave: v.wave, dock: v.dock, minutes: v.dockedAt ? Math.round(this.clock - v.dockedAt) : 0 })),
      perkInsight: !!p?.rec.perks.includes("operacao_sob_controle"),
      players: [...this.players.values()].map((x) => ({ name: x.name, level: x.level, title: x.title })),
    };
  }

  // =====================================================================================
  // Tick
  // =====================================================================================
  tick(dtMs: number) {
    const dt = dtMs / 1000;
    const prevDay = dayOf(this.clock);
    this.clock += dt * GAME_MIN_PER_SEC;
    const realNow = Date.now();
    this.ops.tick(dt, this.clock);
    this.vehicles.tick(dt, this.clock);
    this.npcs.tick(dt, this.clock, realNow, this.ops.bakers);

    if (dayOf(this.clock) !== prevDay) {
      // virada do dia: BUFFER entra no novo ciclo
      this.ops.backlog.push(...this.ops.bufferNext.splice(0));
      for (const p of this.players.values()) {
        this.resetDaily(p);
        p.profileDirty = true;
      }
      this.out.broadcast("toast", { text: `Novo dia no SMG1 (dia ${dayOf(this.clock)}). Missões diárias renovadas!`, kind: "info" });
    }

    for (const p of this.players.values()) {
      // baker acompanha quem empurra
      if (p.carryKind === "baker") {
        const b = this.ops.bakers.get(p.bakerId);
        if (b) {
          b.x = p.x + (p.dir === "left" ? -13 : p.dir === "right" ? 13 : 0);
          b.y = p.y + (p.dir === "down" ? 13 : p.dir === "up" ? -9 : 2);
        } else {
          p.carryKind = "";
          p.bakerId = "";
        }
      }
      p.anim = this.animOf(p, realNow);
      if (p.bubble && realNow > p.bubbleUntil) p.bubble = "";
    }

    this.secAcc += dt;
    if (this.secAcc >= 1) {
      this.secAcc -= 1;
      this.perSecond(realNow);
    }
    this.autoAcc += dt;
    if (this.autoAcc >= 2) {
      this.autoAcc = 0;
      this.autoOps();
    }
  }

  private animOf(p: PlayerEntity, now: number): AnimName {
    if (p.actionAnim && now < p.actionUntil) return p.actionAnim;
    if (p.sitting) return "sit";
    if (p.carryKind === "baker") return "push";
    if (p.carrying.length) return p.moving ? "carry" : "carryIdle";
    if (p.moving) return p.running ? "run" : "walk";
    return "idle";
  }

  private perSecond(realNow: number) {
    for (const p of this.players.values()) {
      const r = p.rec;
      const e0 = Math.round(r.energy);
      const regen = r.perks.includes("operacao_sob_controle") ? 2 : 1;
      const agil = 1 - 0.1 * (r.skills.agilidade ?? 0);
      if (p.running) r.energy -= 1.1 * agil;
      else if (p.sitting) r.energy += 2.5 * regen;
      else if (!p.moving) r.energy += 0.25 * regen;
      else if (p.carryKind) r.energy -= 0.15;
      r.energy = Math.max(0, Math.min(MAX_ENERGY, r.energy));
      if (Math.round(r.energy) !== e0) p.profileDirty = true;
      // aviso de EPI no galpão
      const z = zoneAt(this.map, p.x, p.y);
      const zid = z?.id ?? "";
      if (zid !== p.zoneId) {
        p.zoneId = zid;
        if (zid) this.emit(p, { type: "visit", zone: zid });
      }
      if (isInWarehouse(this.map, p.x, p.y) && (!r.equipped.epiVest || !r.equipped.safetyShoes) && realNow - p.epiWarnAt > 45000) {
        p.epiWarnAt = realNow;
        this.toast(p, "Atenção: você está no galpão sem EPI completo. Armário de EPI fica ao lado da porta do administrativo.", "warn");
      }
      // missões cronometradas
      const failed = expireMissions(this.book(p), this.clock);
      for (const id of failed) {
        this.toast(p, `Tempo esgotado: "${MISSION_BY_ID[id].title}". Fale com ${NPC_BY_ID[MISSION_BY_ID[id].giver]?.name ?? "o quadro"} para tentar de novo.`, "bad");
        p.profileDirty = true;
      }
      if (p.profileDirty) this.sendProfile(p);
      if (p.dirty && realNow - p.lastSave > 20000) this.save(p);
    }
  }

  /** Rede de segurança operacional: NPCs resolvem o que ficou parado tempo demais. */
  private autoOps() {
    for (const v of this.vehicles.list.values()) {
      if (v.kind === "lh" && v.state === "docked" && this.clock - v.dockedAt > 25) {
        this.ops.addInbound(Math.round(v.packages * 0.8));
        v.state = "counting";
        v.countAt = this.clock + 3;
      }
      if (v.kind === "van" && v.state === "docked" && this.clock - v.dockedAt > 4 && !this.npcs.trasladoTask) {
        const b = this.ops.closedBakerFor(v.route);
        const dock = this.map.docks.find((d) => d.id === v.dock);
        if (b && !b.pushedBy && dock) {
          if (b.x === b.homeX && b.y === b.homeY) this.ops.spawnBaker(b.route, this.clock);
          this.npcs.startTraslado(b, dock.x, v.id);
        }
      }
      if (v.state === "aduana" && this.clock - v.dockedAt > 40) this.vehicles.finishAduana(v, this.clock);
    }
  }
}

/** Gera um token aleatório (sem depender do módulo crypto do Node — funciona no navegador). */
function randomToken(): string {
  let s = "";
  for (let i = 0; i < 4; i++) s += Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
  return s;
}

/** Id estável do jogador a partir do token (hash de 80 bits, determinístico). */
export function playerIdFrom(token: string): string {
  let out = "";
  for (const salt of ["meli-world:", "mw-b:", "mw-c:"]) out += hashString(salt + token).toString(16).padStart(8, "0");
  return out.slice(0, 20);
}
