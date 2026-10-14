/**
 * Guia de missões: mostra para ONDE ir.
 *  - trilha de pegadas douradas no chão (A* até o alvo)
 *  - marcador pulando em cima do alvo
 *  - seta na borda da tela quando o alvo está fora de vista (com distância)
 *  - minimapa no canto com o alvo
 */
import Phaser from "phaser";
import type { GuideStep, Profile } from "@shared/index";
import { ENEMIES, findPath, getWorld, MISSION_BY_ID, MISSIONS, NPC_BY_ID, objectiveGuide, PROP_DEFS, TILE, TILE_MINIMAP } from "@shared/index";
import { PixelBuffer } from "../art/pixel";
import { store } from "../store";

export interface GuideInfo {
  missionId: string;
  title: string;
  text: string;
  where: string;
  x: number;
  y: number;
  dist: number;
}

const DOTS = 48;

export class Guide {
  private world = getWorld();
  private dots: Phaser.GameObjects.Image[] = [];
  private marker: Phaser.GameObjects.Image;
  private arrow: HTMLElement;
  private mini: HTMLCanvasElement;
  private miniBase: HTMLCanvasElement;
  private path: [number, number][] = [];
  private pathFor = "";
  private pathAt = 0;
  private miniAt = 0;
  info: GuideInfo | null = null;
  enabled = true;

  constructor(private scene: Phaser.Scene & { px: number; py: number; state: any }) {
    if (!scene.textures.exists("guide_dot")) {
      const b = new PixelBuffer(6, 6);
      b.fill(1, 1, 4, 4, "#ffe600");
      b.fill(2, 0, 2, 6, "#ffe600");
      b.fill(0, 2, 6, 2, "#ffe600");
      b.outline(0, 0, 6, 6, "#2d3277", 255);
      scene.textures.addCanvas("guide_dot", b.toCanvas());
      const m = new PixelBuffer(11, 12);
      m.fill(1, 0, 9, 5, "#ffe600");
      for (let y = 5; y < 11; y++) m.fill(5 - (10 - y) / 2, y, 1 + (10 - y), 1, "#ffe600");
      m.outline(0, 0, 11, 12, "#2d3277", 255);
      scene.textures.addCanvas("guide_marker", m.toCanvas());
    }
    for (let i = 0; i < DOTS; i++) this.dots.push(scene.add.image(0, 0, "guide_dot").setVisible(false).setDepth(-800));
    this.marker = scene.add.image(0, 0, "guide_marker").setOrigin(0.5, 1).setVisible(false).setDepth(9700);
    this.arrow = document.createElement("div");
    this.arrow.className = "guide-arrow hidden";
    this.arrow.innerHTML = `<div class="ga-head">➤</div><div class="ga-dist"></div>`;
    document.getElementById("ui")!.appendChild(this.arrow);
    // minimapa
    this.miniBase = document.createElement("canvas");
    this.miniBase.width = this.world.w * 2;
    this.miniBase.height = this.world.h * 2;
    const ctx = this.miniBase.getContext("2d")!;
    for (let y = 0; y < this.world.h; y++)
      for (let x = 0; x < this.world.w; x++) {
        ctx.fillStyle = this.world.solid[y * this.world.w + x] && !this.isTreeOrProp(x, y) ? "#3b3436" : TILE_MINIMAP[this.world.ground[y * this.world.w + x]] ?? "#000";
        ctx.fillRect(x * 2, y * 2, 2, 2);
      }
    this.mini = document.createElement("canvas");
    this.mini.width = 180;
    this.mini.height = 124;
    this.mini.className = "minimap";
    this.mini.title = "Minimapa (M abre o mapa completo)";
    document.getElementById("ui")!.appendChild(this.mini);
  }

  private isTreeOrProp(x: number, y: number) {
    const t = this.world.ground[y * this.world.w + x];
    return t === 0 || t === 1 || t === 2 || t === 30 || t === 32 || t === 9 || t === 33;
  }

  /** Passo atual: missão rastreada → primeiro objetivo incompleto. */
  private currentStep(p: Profile): { missionId: string; title: string; text: string; step: GuideStep } | null {
    // 1) contexto tem prioridade: o que está nas suas mãos agora
    const ctx = this.contextStep(p);
    if (ctx) return ctx;
    return this.missionStep(p);
  }

  /** Empurrando baker → van da rota. Com pacotes na mão → baker da rota. */
  private contextStep(p: Profile): { missionId: string; title: string; text: string; step: GuideStep } | null {
    const s = this.scene.state;
    if (p.pushing) {
      const r = p.pushing;
      let van: any = null;
      s?.vehicles?.forEach?.((v: any) => {
        if (v.kind === "van" && v.route === r && v.state !== "leaving") van = v;
      });
      if (van && (van.state === "docked" || van.state === "to_dock"))
        return { missionId: "", title: `Traslado do baker ${r}`, text: `Leve o baker ${r} até a van da rota ${r}`, step: { target: { type: "vehicle", id: "", route: r } as any, where: `doca ${van.dock || "de expedição"} · sem correr!` } };
      return { missionId: "", title: `Traslado do baker ${r}`, text: `A van da rota ${r} ainda não encostou`, step: { target: { type: "point", name: "stage" }, where: "Espere na Stage Zone (solte com Q) e volte quando ela chegar na doca" } };
    }
    if (p.carrying.length) {
      const r = p.carrying[0].route;
      const isl = r.charAt(0);
      return { missionId: "", title: "Pacotes na mão", text: `Coloque o pacote ${r} no baker ${r}`, step: { target: { type: "baker", route: r } as any, where: `Ilha ${isl} · ao lado da esteira` } };
    }
    return null;
  }

  private missionStep(p: Profile): { missionId: string; title: string; text: string; step: GuideStep } | null {
    const tracked = p.activeMissions.find((m) => m.id === store.trackedMission) ?? p.activeMissions[0];
    if (tracked) {
      const def = MISSION_BY_ID[tracked.id];
      const obj = def?.objectives.find((o) => (tracked.progress[o.id] ?? 0) < o.count);
      if (def && obj) return { missionId: def.id, title: def.title, text: obj.text, step: objectiveGuide(obj) };
    }
    // sem missão ativa: leva até quem tem missão para oferecer
    const avail = p.availableMissions.map((id) => MISSIONS.find((m) => m.id === id)).filter((m) => m && m.giver !== "board");
    if (avail.length) {
      let best: { id: string; d: number } | null = null;
      for (const m of avail) {
        const n = this.scene.state?.npcs?.get?.(m!.giver);
        if (!n) continue;
        const d = Math.hypot(n.x - this.scene.px, n.y - this.scene.py);
        if (!best || d < best.d) best = { id: m!.giver, d };
      }
      if (best) {
        const npc = NPC_BY_ID[best.id];
        return { missionId: "", title: "Nova missão disponível", text: `Fale com ${npc?.name ?? best.id}`, step: { target: { type: "npc", id: best.id }, where: npc?.role ?? "" } };
      }
    }
    if (p.availableMissions.length) return { missionId: "", title: "Missões do quadro", text: "Veja o Quadro de Missões", step: { target: { type: "prop", kind: "mission_board" }, where: "Hall do administrativo" } };
    return null;
  }

  private nearestProp(kind: string, data?: string): [number, number] | null {
    let best: [number, number] | null = null;
    let bd = Infinity;
    for (const p of this.world.props) {
      if (p.kind !== kind || (data && p.data !== data)) continue;
      const d = PROP_DEFS[p.kind];
      const x = (p.x + d.w / 2) * TILE;
      const y = (p.y + d.h) * TILE + 6;
      const dd = Math.hypot(x - this.scene.px, y - this.scene.py);
      if (dd < bd) {
        bd = dd;
        best = [x, y];
      }
    }
    return best;
  }

  private nearestIn(map: any, pred: (v: any) => boolean): [number, number] | null {
    let best: [number, number] | null = null;
    let bd = Infinity;
    map?.forEach?.((v: any) => {
      if (!pred(v)) return;
      const d = Math.hypot(v.x - this.scene.px, v.y - this.scene.py);
      if (d < bd) {
        bd = d;
        best = [v.x, v.y];
      }
    });
    return best;
  }

  /** Converte o alvo em coordenadas do mundo. */
  resolve(step: GuideStep, p: Profile): [number, number] | null {
    const t = step.target as any;
    const s = this.scene.state;
    if (t.type === "vehicle") return this.nearestIn(s?.vehicles, (v) => v.kind === "van" && v.route === t.route && v.state !== "leaving");
    if (t.type === "baker") return this.nearestIn(s?.bakers, (b) => b.route === t.route && (b.state === "open" || b.state === "pending"));
    if (t.type === "prop") return this.nearestProp(t.kind, t.data);
    if (t.type === "npc") {
      const n = s?.npcs?.get?.(t.id);
      return n ? [n.x, n.y] : null;
    }
    if (t.type === "point") {
      const pt = this.world.points[t.name];
      return pt ? [pt[0] * TILE + 8, pt[1] * TILE + 8] : null;
    }
    const me = s?.players?.get?.(store.sid);
    switch (t.what) {
      case "belt": {
        let best: [number, number] | null = null;
        let bd = Infinity;
        for (const k of ["ilhaA", "ilhaB", "ilhaC", "ilhaD"]) {
          const [x, y] = this.world.points[k];
          const d = Math.hypot(x * TILE - this.scene.px, y * TILE - this.scene.py);
          if (d < bd) {
            bd = d;
            best = [x * TILE + 8, y * TILE + 10];
          }
        }
        return best;
      }
      case "carried_baker": {
        const route = p.carrying[0]?.route;
        if (!route) return this.resolve({ target: { type: "dynamic", what: "belt" }, where: "" }, p);
        return this.nearestIn(s?.bakers, (b) => b.route === route && (b.state === "open" || b.state === "pending"));
      }
      case "pending_baker":
        return this.nearestIn(s?.bakers, (b) => b.state === "pending") ?? this.nearestProp("audit_desk");
      case "closed_baker":
      case "van_for_baker":
        if (me?.carry === "baker") return this.nearestIn(s?.vehicles, (v) => v.kind === "van" && v.state === "docked");
        return this.nearestIn(s?.bakers, (b) => (b.state === "closed" || b.state === "staged") && !b.pushed) ?? this.nearestIn(s?.vehicles, (v) => v.kind === "van");
      case "van_ready":
        return this.nearestIn(s?.vehicles, (v) => v.kind === "van" && v.state === "ready") ?? this.resolve({ target: { type: "dynamic", what: "van_for_baker" }, where: "" }, p);
      case "van_aduana":
        return this.nearestIn(s?.vehicles, (v) => v.state === "aduana") ?? this.nearestIn(s?.vehicles, (v) => v.kind === "van" && v.state === "counting");
      case "lh_docked":
        return this.nearestIn(s?.vehicles, (v) => v.kind === "lh" && v.state === "docked") ?? [this.world.points.recebimento[0] * TILE, this.world.points.recebimento[1] * TILE];
      case "rep":
        return this.nearestIn(s?.npcs, (n) => String(n.role).startsWith("REP"));
      case "kpi":
        return this.nearestProp("kpi_wall") ?? this.nearestProp("kpi_board");
      case "plot_free": {
        let best: [number, number] | null = null;
        let bd = Infinity;
        for (const pl of this.world.plots) {
          const st = s?.plots?.get?.(pl.id);
          if (st && st.ownerId) continue;
          const x = (pl.x + 6.5) * TILE;
          const y = (pl.y + 11.5) * TILE;
          const d = Math.hypot(x - this.scene.px, y - this.scene.py);
          if (d < bd) {
            bd = d;
            best = [x, y];
          }
        }
        return best;
      }
      case "plot_own": {
        for (const pl of this.world.plots) {
          const st = s?.plots?.get?.(pl.id);
          if (st && st.ownerId === store.playerId) return [(pl.x + 5) * TILE, (pl.y + 7) * TILE];
        }
        return this.resolve({ target: { type: "dynamic", what: "plot_free" }, where: "" }, p);
      }
      case "enemy_zone": {
        const kind = t.enemy;
        if (kind && ENEMIES[kind as "rato"]?.boss) {
          const boss = this.nearestIn(s?.enemies, (v) => v.kind === kind && v.state !== "dead");
          return boss ?? [this.world.bossSpawn[0] * TILE + 8, this.world.bossSpawn[1] * TILE + 8];
        }
        const e = this.nearestIn(s?.enemies, (v) => v.state !== "dead" && (!kind || v.kind === kind));
        if (e && Math.hypot(e[0] - this.scene.px, e[1] - this.scene.py) < 70 * TILE) return e;
        const z = this.world.spawnZones.find((zz) => !kind || zz.kinds.includes(kind as never)) ?? this.world.spawnZones[0];
        return [(z.x + z.w / 2) * TILE, (z.y + z.h / 2) * TILE];
      }
    }
    return null;
  }

  update(time: number) {
    const p = store.profile;
    if (!p || !this.enabled) {
      this.hideAll();
      return;
    }
    const cur = this.currentStep(p);
    const pos = cur ? this.resolve(cur.step, p) : null;
    if (!cur || !pos) {
      this.info = null;
      this.hideAll();
      this.drawMini(time, null);
      return;
    }
    const [tx, ty] = pos;
    const dist = Math.hypot(tx - this.scene.px, ty - this.scene.py);
    this.info = { missionId: cur.missionId, title: cur.title, text: cur.text, where: cur.step.where, x: tx, y: ty, dist };
    // recalcula a trilha
    const key = `${Math.floor(tx / TILE / 3)},${Math.floor(ty / TILE / 3)}`;
    if ((key !== this.pathFor && time - this.pathAt > 500) || time - this.pathAt > 1500) {
      this.pathAt = time;
      this.pathFor = key;
      const sx = Math.floor(this.scene.px / TILE);
      const sy = Math.floor((this.scene.py - 3) / TILE);
      this.path = dist < 20 ? [] : findPath(this.world, sx, sy, Math.floor(tx / TILE), Math.floor((ty - 3) / TILE), 30000) ?? [];
    }
    // descarta o trecho que o jogador já percorreu
    const ptx = this.scene.px / TILE;
    const pty = this.scene.py / TILE;
    let start = 0;
    for (let i = 0; i < Math.min(this.path.length, 12); i++) if (Math.abs(this.path[i][0] + 0.5 - ptx) + Math.abs(this.path[i][1] + 0.5 - pty) < 1.5) start = i + 1;
    let n = 0;
    for (let i = start + 1; i < this.path.length && n < DOTS; i += 2) {
      const [x, y] = this.path[i];
      const d = this.dots[n++];
      d.setPosition(x * TILE + 8, y * TILE + 10).setVisible(true);
      d.setAlpha(0.45 + 0.45 * Math.max(0, Math.sin(time / 180 - i * 0.35)));
    }
    for (; n < DOTS; n++) this.dots[n].setVisible(false);
    // marcador
    this.marker.setVisible(true).setPosition(tx, ty - 26 - Math.abs(Math.sin(time / 220)) * 5);
    // seta na borda
    const cam = this.scene.cameras.main;
    const v = cam.worldView;
    const onScreen = tx > v.x + 8 && tx < v.right - 8 && ty > v.y + 8 && ty < v.bottom - 8;
    if (onScreen) this.arrow.classList.add("hidden");
    else {
      const cx = v.centerX;
      const cy = v.centerY;
      const ang = Math.atan2(ty - cy, tx - cx);
      const W = window.innerWidth;
      const H = window.innerHeight;
      const r = Math.min(W / 2 - 60, H / 2 - 70);
      const ax = W / 2 + Math.cos(ang) * r;
      const ay = H / 2 + Math.sin(ang) * r;
      this.arrow.classList.remove("hidden");
      const l = `${Math.round(ax)}px`;
      const tp = `${Math.round(ay)}px`;
      if (this.arrow.style.left !== l) this.arrow.style.left = l;
      if (this.arrow.style.top !== tp) this.arrow.style.top = tp;
      const rot = `rotate(${ang.toFixed(2)}rad)`;
      const head = this.arrow.firstElementChild as HTMLElement;
      if (head.style.transform !== rot) head.style.transform = rot;
      const txt = `${Math.round(dist / TILE)} m`;
      const de = this.arrow.lastElementChild as HTMLElement;
      if (de.textContent !== txt) de.textContent = txt;
    }
    this.drawMini(time, pos);
  }

  private hideAll() {
    for (const d of this.dots) d.setVisible(false);
    this.marker.setVisible(false);
    this.arrow.classList.add("hidden");
  }

  private drawMini(time: number, target: [number, number] | null) {
    if (time - this.miniAt < 200) return;
    this.miniAt = time;
    const ctx = this.mini.getContext("2d")!;
    const tw = 90; // tiles visíveis
    const th = 62;
    const cx = this.scene.px / TILE;
    const cy = this.scene.py / TILE;
    const x0 = Math.max(0, Math.min(this.world.w - tw, cx - tw / 2));
    const y0 = Math.max(0, Math.min(this.world.h - th, cy - th / 2));
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#16181d";
    ctx.fillRect(0, 0, 180, 124);
    ctx.drawImage(this.miniBase, x0 * 2, y0 * 2, tw * 2, th * 2, 0, 0, 180, 124);
    const sx = 180 / tw;
    const sy = 124 / th;
    const dot = (wx: number, wy: number, col: string, r = 2) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc((wx / TILE - x0) * sx, (wy / TILE - y0) * sy, r, 0, Math.PI * 2);
      ctx.fill();
    };
    const s = this.scene.state;
    s?.npcs?.forEach?.((n: any) => dot(n.x, n.y, "#ff8a1f", 1.6));
    s?.enemies?.forEach?.((e: any) => e.state !== "dead" && dot(e.x, e.y, ENEMIES[e.kind as "rato"]?.boss ? "#ff3b3b" : "#e5533d", ENEMIES[e.kind as "rato"]?.boss ? 3.5 : 1.6));
    s?.players?.forEach?.((pl: any, sid: string) => sid !== store.sid && dot(pl.x, pl.y, "#3483fa", 2.2));
    if (target) {
      const [tx, ty] = target;
      let mx = (tx / TILE - x0) * sx;
      let my = (ty / TILE - y0) * sy;
      mx = Math.max(4, Math.min(176, mx));
      my = Math.max(4, Math.min(120, my));
      ctx.fillStyle = "#ffe600";
      ctx.strokeStyle = "#2d3277";
      ctx.lineWidth = 2;
      const r = 4 + Math.abs(Math.sin(time / 250)) * 2;
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    dot(this.scene.px, this.scene.py, "#ffffff", 3.4);
    dot(this.scene.px, this.scene.py, "#ffe600", 2.4);
  }
}
