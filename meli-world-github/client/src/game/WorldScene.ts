/** Cena principal: mundo, entidades sincronizadas, predição do jogador local e interação. */
import Phaser from "phaser";
import type { AnimName, Appearance, Dir, Equipment, Island } from "@shared/index";
import {
  CARRY_MULT, CLIENT_SEND_MS, darkness, distToRect, getWorld, INTERACT_RANGE, islandAtX, moveWithCollision, NO_EQUIP,
  PROP_DEFS, PUSH_MULT, RUN_MULT, sanitizeAppearance, speedMultiplier, TILE, TIRED_MULT, trafficAt, WALK_SPEED, zoneAt,
  ROUTE_BY_ID, ENEMIES,
} from "@shared/index";
import { net } from "../net/Net";
import { store } from "../store";
import { activeGivers, missionGivers, mapProvider } from "../ui/panels";
import { lookProvider } from "../ui/dialog";
import * as Hud from "../ui/hud";
import { bakerTexture, bootTextures, characterTexture, GROUND_CHUNK, propTexture } from "./Textures";
import { Guide } from "./Guide";
import { PlotLayer } from "./Plots";
import { togglePanel } from "../ui/panels";

interface Avatar {
  shadow: Phaser.GameObjects.Image;
  sprite: Phaser.GameObjects.Sprite;
  box: Phaser.GameObjects.Image;
  name: Phaser.GameObjects.Text;
  bubble: Phaser.GameObjects.Text;
  marker: Phaser.GameObjects.Image;
  weapon: Phaser.GameObjects.Image;
  weaponId: string;
  atk: number;
  swingAt: number;
  hpBar: Phaser.GameObjects.Graphics;
  hp: number;
  texKey: string;
  lookKey: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  dir: string;
  anim: string;
}

const FLAT = new Set(["flowers", "passarela", "sign", "mushroom"]);

interface EnemyView {
  s: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  bar: Phaser.GameObjects.Graphics;
  name: Phaser.GameObjects.Text | null;
  tx: number;
  ty: number;
  hp: number;
  maxHp: number;
  kind: string;
}

export class WorldScene extends Phaser.Scene {
  world = getWorld();
  me: Avatar | null = null;
  avatars = new Map<string, Avatar>();
  npcs = new Map<string, Avatar>();
  vehicles = new Map<string, { s: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text; tx: number; ty: number; key: string }>();
  bakers = new Map<string, { s: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text; tx: number; ty: number; key: string }>();
  traffic: Phaser.GameObjects.Image[] = [];
  beltBoxes: Phaser.GameObjects.Image[] = [];
  belt!: Phaser.GameObjects.TileSprite;
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  state: any = null;
  px = 0;
  py = 0;
  dir: Dir = "down";
  lastSend = 0;
  seq = 0;
  lastMoving = false;
  beltStr = "";
  beltChangedAt = 0;
  serverTime = 0;
  serverTimeAt = 0;
  clock = 0;
  target: { kind: string; id: string; label: string } | null = null;
  lastTargetCheck = 0;
  interactProps: { id: string; x: number; y: number; w: number; h: number; name: string }[] = [];
  nightEl: HTMLElement | null = null;
  started = false;
  lastKpi = 0;
  enemies = new Map<string, EnemyView>();
  lastGuideHud = 0;
  guide!: Guide;
  plotLayer!: PlotLayer;

  constructor() {
    super("world");
  }

  create() {
    bootTextures(this);
    const w = this.world;
    for (let cy = 0; cy < w.h; cy += GROUND_CHUNK)
      for (let cx = 0; cx < w.w; cx += GROUND_CHUNK) this.add.image(cx * TILE, cy * TILE, `ground_${cx}_${cy}`).setOrigin(0, 0).setDepth(-1000);
    this.belt = this.add.tileSprite(w.belt.x0 * TILE, w.belt.y * TILE, (w.belt.x1 - w.belt.x0 + 1) * TILE, 32, "belt").setOrigin(0, 0).setDepth(-900);
    for (let i = 0; i < 100; i++) this.beltBoxes.push(this.add.image(0, 0, "beltbox_A").setVisible(false).setDepth(-890));
    // props
    for (const p of w.props) {
      const def = PROP_DEFS[p.kind];
      const bottom = (p.y + def.h) * TILE;
      if (p.kind === "sign" || p.kind === "big_sign") {
        // placas viram etiquetas legíveis (sem sobrepor letras)
        const cx = p.x * TILE + (def.w * TILE) / 2;
        if (p.kind === "big_sign") this.add.rectangle(cx, bottom, 3, 14, 0x6b4428).setOrigin(0.5, 1).setDepth(bottom - 1);
        if (!p.label) continue;
        this.add
          .text(cx, p.kind === "big_sign" ? bottom - 13 : bottom - 6, p.label, {
            fontFamily: "Trebuchet MS, sans-serif", fontSize: "6px", color: "#2d3277", fontStyle: "bold", backgroundColor: "#ffe600", padding: { x: 3, y: 1 },
          })
          .setOrigin(0.5, 1)
          .setResolution(4)
          .setDepth(p.kind === "big_sign" ? bottom : -850);
        continue;
      }
      const key = propTexture(this, p.kind, p.variant ?? 0, p.data);
      const img = this.add.image(p.x * TILE, bottom, key).setOrigin(0, 1);
      img.setDepth(p.kind === "passarela" ? w.belt.y * TILE + 1 : FLAT.has(p.kind) ? bottom - 12 : bottom);
      if (p.kind === "passarela") img.setDepth(-880);
      if (p.label && p.kind !== "plot_sign") {
        this.add
          .text(p.x * TILE + (def.w * TILE) / 2, bottom - def.h * TILE - 2, p.label, {
            fontFamily: "Trebuchet MS, sans-serif", fontSize: "5px", color: "#ffffff", fontStyle: "bold", stroke: "#000000", strokeThickness: 2,
          })
          .setOrigin(0.5, 0.5)
          .setResolution(4)
          .setDepth(bottom + 1);
      }
      if (def.interact) this.interactProps.push({ id: p.id, x: p.x, y: p.y, w: p.w, h: p.h, name: def.name });
    }
    // tráfego
    for (let i = 0; i < 8; i++) this.traffic.push(this.add.image(-200, 0, "traffic_car_0").setDepth(80 * TILE));

    this.cameras.main.setBounds(0, 0, w.w * TILE, w.h * TILE);
    this.cameras.main.setRoundPixels(true);
    this.applyZoom();
    this.scale.on("resize", () => this.applyZoom());
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({ up: "W", down: "S", left: "A", right: "D", up2: "UP", down2: "DOWN", left2: "LEFT", right2: "RIGHT", shift: "SHIFT" }, false) as any;

    this.nightEl = document.getElementById("night");
    this.guide = new Guide(this as any);
    this.plotLayer = new PlotLayer(this);
    document.querySelector(".minimap")?.addEventListener("click", () => togglePanel("map"));
    // ataque: F ou clique esquerdo (fora do modo decoração)
    this.input.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
      if (ptr.leftButtonDown() && !this.plotLayer.buildItem && !this.blocked()) this.attack();
    });
    lookProvider.npc = (id) => this.state?.npcs?.get?.(id)?.look ?? null;
    mapProvider.entities = () => this.mapEntities();

    const room = net.room!;
    room.onStateChange((s: any) => this.onState(s));
    if (room.state) this.onState(room.state);
    net.on("correct", (m: any) => {
      this.px = m.x;
      this.py = m.y;
    });
    net.on("fx", (m: any) => this.floatText(m.x, m.y, m.text, m.color));
    net.on("coins", (m: any) => {
      if (this.me) this.floatText(this.px + 10, this.py - 44, `+${m.amount} M$`, "#ffd166");
    });
    net.on("xp", (m: any) => {
      if (this.me) this.floatText(this.px, this.py - 36, `+${m.amount} XP`, "#ffe600");
    });
  }

  applyZoom() {
    const z = Math.max(2, Math.min(4, Math.round(window.innerHeight / 290)));
    this.cameras.main.setZoom(z);
  }

  // ----------------------------------------------------------------------------- sincronização
  onState(s: any) {
    this.state = s;
    this.clock = s.clock;
    if (s.serverTime !== this.serverTime) {
      this.serverTime = s.serverTime;
      this.serverTimeAt = performance.now();
    }
    const myId = net.sid;
    // jogadores
    const seen = new Set<string>();
    s.players.forEach((p: any, sid: string) => {
      seen.add(sid);
      let a = this.avatars.get(sid);
      const equip = safeEquip(p.equip);
      const lookKey = p.look + p.equip;
      if (!a) {
        a = this.makeAvatar(p.x, p.y, p.name, p.look, equip, sid === myId ? "#ffe600" : "#ffffff");
        a.lookKey = lookKey;
        this.avatars.set(sid, a);
        if (sid === myId) {
          this.me = a;
          this.px = p.x;
          this.py = p.y;
          this.cameras.main.startFollow(a.sprite, true, 0.18, 0.18);
          this.started = true;
        }
      } else if (a.lookKey !== lookKey) {
        this.retexture(a, p.look, equip);
        a.lookKey = lookKey;
      }
      a.name.setText(`${p.name} · Nv${p.level}`);
      a.tx = p.x;
      a.ty = p.y;
      a.dir = sid === myId && this.lastMoving ? a.dir : p.dir;
      if (sid !== myId || !this.lastMoving) a.anim = p.anim;
      a.bubble.setText(p.bubble || "").setVisible(!!p.bubble);
      a.box.setData("carry", p.carry);
      if (a.weaponId !== (p.weapon ?? "")) {
        a.weaponId = p.weapon ?? "";
        if (a.weaponId) a.weapon.setTexture(`weapon_${a.weaponId}`);
      }
      if (p.atk !== undefined && p.atk !== a.atk) {
        if (a.atk !== -1) this.swing(a);
        a.atk = p.atk;
      }
      a.hp = p.hp ?? 100;
    });
    for (const [sid, a] of this.avatars)
      if (!seen.has(sid)) {
        this.destroyAvatar(a);
        this.avatars.delete(sid);
      }
    // NPCs
    const givers = missionGivers(store.profile);
    const act = activeGivers(store.profile);
    s.npcs.forEach((n: any, id: string) => {
      let a = this.npcs.get(id);
      const equip: Equipment = { epiVest: /REP/.test(n.role), safetyShoes: true, coletor: /REP|Team Leader|PS/.test(n.role) };
      if (!a) {
        a = this.makeAvatar(n.x, n.y, n.name, n.look, equip, "#ffd9a0");
        this.npcs.set(id, a);
      }
      a.tx = n.x;
      a.ty = n.y;
      a.dir = n.dir;
      a.anim = n.anim;
      a.box.setData("carry", n.carry);
      a.marker.setVisible(givers.has(id) || act.has(id));
      a.marker.setTexture(givers.has(id) ? "marker_!" : "marker_?");
    });
    // veículos
    const vseen = new Set<string>();
    s.vehicles.forEach((v: any, id: string) => {
      vseen.add(id);
      const key = v.kind === "lh" ? `truck_${v.dir}` : `van_${v.dir}_${v.wave}`;
      let e = this.vehicles.get(id);
      if (!e) {
        const img = this.add.image(v.x, v.y, key);
        const label = this.add.text(v.x, v.y, "", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "6px", color: "#ffffff", fontStyle: "bold", stroke: "#000", strokeThickness: 2 }).setOrigin(0.5, 1).setResolution(4);
        e = { s: img, label, tx: v.x, ty: v.y, key };
        this.vehicles.set(id, e);
      }
      if (e.key !== key) {
        e.s.setTexture(key);
        e.key = key;
      }
      e.tx = v.x;
      e.ty = v.y;
      let text = v.kind === "lh" ? (v.state === "docked" ? "LH aguardando recebimento" : v.state === "counting" ? "Descarregando…" : "") : `Rota ${v.route}`;
      if (v.kind === "van") {
        const st: Record<string, string> = { waiting: "Flash Parking", docked: "na doca", counting: "contando", aduana: "ADUANA", ready: "pronta p/ sair", to_dock: "indo p/ doca", arriving: "chegando", leaving: "saindo" };
        text += ` · ${st[v.state] ?? v.state}`;
        if (v.minutes && ["docked", "counting", "aduana", "ready"].includes(v.state)) text += ` · ${v.minutes}min`;
      }
      setLabel(e.label, text, v.minutes > 25 ? "#ff8a80" : v.state === "aduana" ? "#ffd166" : "#ffffff");
    });
    for (const [id, e] of this.vehicles)
      if (!vseen.has(id)) {
        e.s.destroy();
        e.label.destroy();
        this.vehicles.delete(id);
      }
    // bakers
    const bseen = new Set<string>();
    s.bakers.forEach((b: any, id: string) => {
      if (b.state === "loaded") return;
      bseen.add(id);
      const route = ROUTE_BY_ID[b.route];
      const key = bakerTexture(this, route?.island ?? "A", b.state, b.setup, b.target ? b.count / b.target : 0);
      let e = this.bakers.get(id);
      if (!e) {
        const img = this.add.image(b.x, b.y, key).setOrigin(0.5, 1);
        const label = this.add.text(b.x, b.y - 34, b.route, { fontFamily: "monospace", fontSize: "6px", color: "#ffffff", fontStyle: "bold", stroke: "#000", strokeThickness: 2 }).setOrigin(0.5, 1).setResolution(4);
        e = { s: img, label, tx: b.x, ty: b.y, key };
        this.bakers.set(id, e);
      }
      if (e.key !== key) {
        e.s.setTexture(key);
        e.key = key;
      }
      e.tx = b.x;
      e.ty = b.y;
      const tag = b.state === "pending" ? " !" : b.state === "closed" || b.state === "staged" || b.state === "moving" ? " ✔" : "";
      setLabel(e.label, `${b.route}${tag}`, b.state === "pending" ? "#ff8a80" : tag ? "#9effa8" : b.setup ? "#ffffff" : "#ffd166");
    });
    for (const [id, e] of this.bakers)
      if (!bseen.has(id)) {
        e.s.destroy();
        e.label.destroy();
        this.bakers.delete(id);
      }
    if (s.belt !== this.beltStr) {
      this.beltStr = s.belt;
      this.beltChangedAt = performance.now();
    }
    this.syncEnemies(s.enemies);
    this.plotLayer.sync(s.plots);
    const now = performance.now();
    if (now - this.lastKpi > 500) {
      this.lastKpi = now;
      Hud.updateKpi(s.ops);
    }
  }

  private makeAvatar(x: number, y: number, name: string, lookJson: string, equip: Equipment, nameColor: string): Avatar {
    const look = safeLook(lookJson);
    const texKey = characterTexture(this, look, equip);
    const shadow = this.add.image(x, y, "shadow16").setOrigin(0.5, 0.5);
    const sprite = this.add.sprite(x, y, texKey, 0).setOrigin(0.5, 1);
    const box = this.add.image(x, y, "box_small").setOrigin(0.5, 1).setVisible(false);
    const label = this.add.text(x, y - 34, name, { fontFamily: "Trebuchet MS, sans-serif", fontSize: "6px", color: nameColor, fontStyle: "bold", stroke: "#000000", strokeThickness: 2 }).setOrigin(0.5, 1).setResolution(4);
    const bubble = this.add
      .text(x, y - 42, "", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "6px", color: "#2b1b17", backgroundColor: "#fff8e6", padding: { x: 3, y: 2 }, wordWrap: { width: 110 } })
      .setOrigin(0.5, 1)
      .setResolution(4)
      .setVisible(false);
    const marker = this.add.image(x, y - 44, "marker_!").setOrigin(0.5, 1).setVisible(false);
    const weapon = this.add.image(x, y, "weapon_regua").setOrigin(0.5, 0.9).setVisible(false);
    const hpBar = this.add.graphics().setDepth(9450);
    return { shadow, sprite, box, name: label, bubble, marker, weapon, weaponId: "", atk: -1, swingAt: 0, hpBar, hp: 100, texKey, lookKey: lookJson + JSON.stringify(equip), x, y, tx: x, ty: y, dir: "down", anim: "idle" };
  }

  private retexture(a: Avatar, lookJson: string, equip: Equipment) {
    a.texKey = characterTexture(this, safeLook(lookJson), equip);
    a.lookKey = lookJson + JSON.stringify(equip);
    a.anim = "";
  }

  private destroyAvatar(a: Avatar) {
    for (const o of [a.shadow, a.sprite, a.box, a.name, a.bubble, a.marker, a.weapon, a.hpBar]) o.destroy();
  }

  // ----------------------------------------------------------------------------- loop
  update(time: number, dtMs: number) {
    if (!this.started || !this.state) return;
    const dt = Math.min(0.1, dtMs / 1000);
    this.updateLocal(dt);
    const k = Math.min(1, dt * 12);
    for (const [sid, a] of this.avatars) {
      if (a === this.me) {
        a.x = this.px;
        a.y = this.py;
      } else {
        a.x += (a.tx - a.x) * k;
        a.y += (a.ty - a.y) * k;
        if (Math.hypot(a.tx - a.x, a.ty - a.y) > 64) {
          a.x = a.tx;
          a.y = a.ty;
        }
      }
      this.placeAvatar(a);
      void sid;
    }
    for (const a of this.npcs.values()) {
      a.x += (a.tx - a.x) * k;
      a.y += (a.ty - a.y) * k;
      this.placeAvatar(a);
    }
    for (const e of this.vehicles.values()) {
      e.s.x += (e.tx - e.s.x) * k;
      e.s.y += (e.ty - e.s.y) * k;
      e.s.setDepth(e.s.y + e.s.height / 2);
      e.label.setPosition(e.s.x, e.s.y - e.s.height / 2 - 2).setDepth(9000);
    }
    for (const e of this.bakers.values()) {
      e.s.x += (e.tx - e.s.x) * Math.min(1, dt * 16);
      e.s.y += (e.ty - e.s.y) * Math.min(1, dt * 16);
      e.s.setDepth(e.s.y);
      e.label.setPosition(e.s.x, e.s.y - 33).setDepth(e.s.y + 1);
    }
    for (const e of this.enemies.values()) {
      e.s.x += (e.tx - e.s.x) * k;
      e.s.y += (e.ty - e.s.y) * k;
      e.s.setDepth(e.s.y);
      e.shadow.setPosition(e.s.x, e.s.y - 1).setDepth(e.s.y - 1);
      const bk = `${Math.round(e.s.x)},${Math.round(e.s.y)},${e.hp}`;
      if (bk !== e.bar.getData("k")) {
        e.bar.setData("k", bk);
        this.drawBar(e.bar, e.s.x, e.s.y - e.s.height - 3, e.hp / e.maxHp, e.hp < e.maxHp || !!e.name, ENEMIES[e.kind as "rato"]?.boss ? 40 : 16);
      }
      e.name?.setPosition(e.s.x, e.s.y - e.s.height - 6);
    }
    this.guide.update(time);
    this.plotLayer.checkDistance(this.px, this.py);
    if (time - this.lastGuideHud > 300) {
      this.lastGuideHud = time;
      Hud.setGuide(this.guide.info);
    }
    this.updateBelt(dt);
    this.updateTraffic();
    this.updateTarget();
    this.updateNight();
    Hud.updateClockOnly(this.clock);
    Hud.tickTimers(this.clock);
    const z = zoneAt(this.world, this.px, this.py);
    Hud.setZone(z?.name ?? "SMG1");
  }

  private placeAvatar(a: Avatar) {
    const x = Math.round(a.x);
    const y = Math.round(a.y);
    a.sprite.setPosition(x, y).setDepth(y);
    a.shadow.setPosition(x, y - 1).setDepth(y - 1);
    const animKey = `${a.texKey}:${a.anim || "idle"}:${a.dir || "down"}`;
    if (a.sprite.anims.currentAnim?.key !== animKey && this.anims.exists(animKey)) a.sprite.play(animKey, true);
    const carry = a.box.getData("carry") as string;
    const showBox = carry === "pkg" || carry === "bulky";
    a.box.setVisible(showBox);
    if (showBox) {
      a.box.setTexture(carry === "bulky" ? "box_bulky" : "box_small");
      const side = a.dir === "left" ? -5 : a.dir === "right" ? 5 : 0;
      a.box.setPosition(x + side, y - 13).setDepth(a.dir === "up" ? y - 0.5 : y + 0.5);
    }
    // arma na mão
    const showW = !!a.weaponId && a.anim !== "push" && a.anim !== "carry" && a.anim !== "carryIdle" && a.anim !== "sit";
    a.weapon.setVisible(showW);
    if (showW) {
      const now = this.time.now;
      const swing = now - a.swingAt < 200 ? (now - a.swingAt) / 200 : -1;
      const side = a.dir === "left" ? -1 : 1;
      const ox = a.dir === "left" ? -6 : a.dir === "right" ? 6 : a.dir === "up" ? 5 : -6;
      a.weapon.setPosition(x + ox, y - 11).setFlipX(a.dir === "left");
      a.weapon.setDepth(a.dir === "up" ? y - 1 : y + 1);
      a.weapon.setAngle(swing >= 0 ? side * (-80 + swing * 170) : side * 20);
    }
    const barKey = a.hp < 100 && a !== this.me ? `${x},${y},${a.hp}` : "";
    if (barKey !== a.hpBar.getData("k")) {
      a.hpBar.setData("k", barKey);
      if (barKey) this.drawBar(a.hpBar, x, y - 37, a.hp / 100, true, 16);
      else a.hpBar.clear();
    }
    a.name.setPosition(x, y - 33).setDepth(9500);
    a.bubble.setPosition(x, y - 41).setDepth(9600);
    a.marker.setPosition(x, y - 42 - Math.round(Math.abs(Math.sin(this.time.now / 260)) * 3)).setDepth(9550);
  }

  private blocked(): boolean {
    return Hud.isTyping() || !!document.querySelector(".modal-bg") || !!document.querySelector(".dialog");
  }

  private updateLocal(dt: number) {
    if (!this.me) return;
    const K = this.keys;
    let dx = 0;
    let dy = 0;
    if (!this.blocked()) {
      if (K.left.isDown || K.left2.isDown) dx -= 1;
      if (K.right.isDown || K.right2.isDown) dx += 1;
      if (K.up.isDown || K.up2.isDown) dy -= 1;
      if (K.down.isDown || K.down2.isDown) dy += 1;
    }
    const moving = dx !== 0 || dy !== 0;
    const run = moving && K.shift.isDown;
    const prof = store.profile;
    const myState = this.state.players.get(net.sid);
    const pushing = myState?.carry === "baker";
    if (moving) {
      const len = Math.hypot(dx, dy);
      let speed = WALK_SPEED * speedMultiplier(prof?.skills ?? {});
      if (pushing) speed *= PUSH_MULT * (prof?.perks.includes("expedicao_relampago") ? 1.2 : 1);
      else {
        if (run && (prof?.energy ?? 1) > 0) speed *= RUN_MULT;
        if (prof?.carrying.length) speed *= CARRY_MULT;
      }
      if ((prof?.energy ?? 1) <= 0) speed *= TIRED_MULT;
      const [nx, ny] = moveWithCollision(this.world, this.px, this.py, (dx / len) * speed * dt, (dy / len) * speed * dt);
      this.px = nx;
      this.py = ny;
      this.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
      this.me.dir = this.dir;
      this.me.anim = pushing ? "push" : myState?.carry === "pkg" || myState?.carry === "bulky" ? "carry" : run && !pushing ? "run" : "walk";
    } else if (this.lastMoving) {
      this.me.anim = pushing ? "push" : myState?.carry ? "carryIdle" : "idle";
    }
    const now = performance.now();
    if ((moving || this.lastMoving) && now - this.lastSend >= CLIENT_SEND_MS) {
      this.lastSend = now;
      net.send("input", { x: Math.round(this.px * 10) / 10, y: Math.round(this.py * 10) / 10, dir: this.dir, moving, run, seq: ++this.seq });
      this.lastMoving = moving;
    }
  }

  // ----------------------------------------------------------------------------- esteira, tráfego e noite
  private updateBelt(dt: number) {
    this.belt.tilePositionX -= 26.6 * dt;
    const s = this.beltStr;
    const prog = Math.min(1, (performance.now() - this.beltChangedAt) / 300);
    const w = this.world;
    let n = 0;
    for (let i = 0; i < s.length && n < this.beltBoxes.length; i++) {
      const ch = s[i];
      if (ch === ".") continue;
      const img = this.beltBoxes[n++];
      img.setTexture(`beltbox_${ch}`);
      img.setPosition(w.belt.x0 * TILE + i * 8 + 4 + prog * 8, w.belt.y * TILE + 16 + ((i * 7) % 5) - 2);
      img.setVisible(true);
    }
    for (; n < this.beltBoxes.length; n++) this.beltBoxes[n].setVisible(false);
  }

  private updateTraffic() {
    const t = (this.serverTime + (performance.now() - this.serverTimeAt)) / 1000;
    const cars = trafficAt(t);
    cars.forEach((c, i) => {
      const img = this.traffic[i];
      if (!img) return;
      const key = c.kind === "bus" ? "bus" : c.kind === "moto" ? `traffic_moto_${c.variant}` : `traffic_car_${c.variant}`;
      if (img.texture.key !== key) img.setTexture(key);
      img.setPosition(c.x, c.y).setFlipX(c.dir === "left").setDepth(c.y + 8);
    });
  }

  private updateNight() {
    if (!this.nightEl) return;
    const d = darkness(this.clock);
    this.nightEl.style.opacity = String(d * 0.62);
  }

  private floatText(x: number, y: number, text: string, color: string) {
    const t = this.add.text(x, y, text, { fontFamily: "Trebuchet MS, sans-serif", fontSize: "7px", color, fontStyle: "bold", stroke: "#000", strokeThickness: 2 }).setOrigin(0.5, 1).setResolution(4).setDepth(9800);
    this.tweens.add({ targets: t, y: y - 14, alpha: 0, duration: 1100, ease: "Cubic.easeOut", onComplete: () => t.destroy() });
  }

  // ----------------------------------------------------------------------------- interação
  private updateTarget() {
    const now = performance.now();
    if (now - this.lastTargetCheck < 90) return;
    this.lastTargetCheck = now;
    const best = this.findTarget();
    this.target = best;
    Hud.setPrompt(best && !this.blocked() ? best.label : null);
  }

  findTarget(): { kind: string; id: string; label: string } | null {
    const px = this.px;
    const py = this.py;
    let best: { kind: string; id: string; label: string; d: number } | null = null;
    const consider = (kind: string, id: string, label: string, d: number, limit: number) => {
      if (d <= limit && (!best || d < best.d)) best = { kind, id, label, d };
    };
    const prof = store.profile;
    const carrying = prof?.carrying ?? [];
    const me = this.state.players.get(net.sid);
    const pushing = me?.carry === "baker";
    for (const p of this.interactProps) consider("prop", p.id, p.name, distToRect(px, py, p.x, p.y, p.w, p.h), INTERACT_RANGE - 2);
    this.state.npcs.forEach((n: any, id: string) => consider("npc", id, `Falar com ${n.name}`, Math.hypot(n.x - px, n.y - py), INTERACT_RANGE + 8));
    this.state.vehicles.forEach((v: any, id: string) => {
      if (!["docked", "counting", "aduana", "ready", "waiting"].includes(v.state)) return;
      const hw = v.kind === "lh" ? 1.5 : 1;
      const hh = v.kind === "lh" ? 3 : 2;
      const d = distToRect(px, py, v.x / TILE - hw, v.y / TILE - hh, hw * 2, hh * 2);
      let label = v.kind === "lh" ? "Receber caminhão LH (checklist)" : `Van da rota ${v.route}`;
      if (v.kind === "van") {
        if (v.state === "docked") label = pushing ? `Carregar baker na van ${v.route}` : `Van ${v.route} aguardando baker`;
        if (v.state === "aduana") label = `Aduana: recontar rota ${v.route}`;
        if (v.state === "ready") label = `Liberar saída da rota ${v.route}`;
      }
      consider("vehicle", id, label, d, INTERACT_RANGE + 8);
    });
    if (!pushing)
      this.state.bakers.forEach((b: any, id: string) => {
        if (b.state === "loaded" || b.state === "moving") return;
        const d = Math.hypot(px - b.x, py - 8 - (b.y - 16));
        let label = `Baker ${b.route} (${b.count}/${b.target})`;
        if (carrying.length) label = `Conteinerizar no baker ${b.route}`;
        else if (b.state === "pending") label = `Auditar baker ${b.route} (pendente)`;
        else if (b.state === "closed" || b.state === "staged") label = `Trasladar baker ${b.route} (fechado)`;
        consider("baker", id, label, d - 4, INTERACT_RANGE + 14);
      });
    // casas (porta)
    const door = this.plotLayer.doorNear(px, py);
    if (door) consider("plot", door.id, "Casa · entrar / descansar / decorar", door.d, 30);
    // esteira
    const w = this.world;
    const ty = Math.floor((py - 3) / TILE);
    const tx = Math.floor(px / TILE);
    if ((ty === w.belt.y - 1 || ty === w.belt.y + 2) && tx >= w.belt.x0 && tx <= w.belt.x1) {
      const isl = islandAtX(w, tx);
      if (isl) consider("belt", isl, `Pescar na esteira · ilha ${isl}`, 6, 99);
    }
    return best ? { kind: (best as any).kind, id: (best as any).id, label: (best as any).label } : null;
  }

  interact() {
    if (!this.target) return;
    if (this.me) {
      this.me.anim = "interact";
    }
    net.send("interact", { kind: this.target.kind, id: this.target.id });
  }

  attack() {
    if (!this.me || this.blocked()) return;
    net.send("attack", { dir: this.dir });
  }

  private swing(a: Avatar) {
    a.swingAt = this.time.now;
    if (!a.weaponId && a !== this.me) return;
    const fx = a.dir === "left" ? -1 : a.dir === "right" ? 1 : 0;
    const fy = a.dir === "up" ? -1 : a.dir === "down" ? 1 : 0;
    const sl = this.add.image(a.x + fx * 14, a.y - 10 + fy * 12, "slash").setDepth(a.y + 2).setAlpha(0.9);
    sl.setAngle(a.dir === "left" ? 180 : a.dir === "up" ? -90 : a.dir === "down" ? 90 : 0);
    this.tweens.add({ targets: sl, alpha: 0, scale: 1.3, duration: 180, onComplete: () => sl.destroy() });
  }

  private drawBar(g: Phaser.GameObjects.Graphics, x: number, y: number, frac: number, show: boolean, w: number) {
    g.clear();
    if (!show) return;
    g.fillStyle(0x1b1012, 0.9).fillRect(x - w / 2 - 1, y - 1, w + 2, 4);
    g.fillStyle(frac > 0.5 ? 0x49c45f : frac > 0.25 ? 0xf0a524 : 0xe5533d, 1).fillRect(x - w / 2, y, Math.max(0, w * frac), 2);
    g.setDepth(9450);
  }

  private syncEnemies(map: any) {
    const seen = new Set<string>();
    map?.forEach?.((e: any, id: string) => {
      if (e.state === "dead") return;
      seen.add(id);
      let v = this.enemies.get(id);
      if (!v) {
        const def = ENEMIES[e.kind as "rato"];
        const s = this.add.sprite(e.x, e.y, `enemy_${e.kind}`, 0).setOrigin(0.5, 1);
        s.play(`enemy_${e.kind}:walk`);
        const shadow = this.add.image(e.x, e.y, def?.boss ? "shadow48" : "shadow16").setOrigin(0.5, 0.5);
        const bar = this.add.graphics();
        const name = def?.boss
          ? this.add.text(e.x, e.y, def.name, { fontFamily: "Trebuchet MS, sans-serif", fontSize: "7px", color: "#ff8a80", fontStyle: "bold", stroke: "#000", strokeThickness: 2 }).setOrigin(0.5, 1).setResolution(4).setDepth(9500)
          : null;
        v = { s, shadow, bar, name, tx: e.x, ty: e.y, hp: e.hp, maxHp: e.maxHp, kind: e.kind };
        this.enemies.set(id, v);
      }
      v.tx = e.x;
      v.ty = e.y;
      v.hp = e.hp;
      v.maxHp = e.maxHp;
      v.s.setFlipX(e.dir === "left");
      if (e.flash) v.s.setTintFill(0xffffff);
      else v.s.clearTint();
    });
    for (const [id, v] of this.enemies)
      if (!seen.has(id)) {
        const s = v.s;
        this.tweens.add({ targets: s, alpha: 0, scaleY: 0.2, duration: 220, onComplete: () => s.destroy() });
        v.shadow.destroy();
        v.bar.destroy();
        v.name?.destroy();
        this.enemies.delete(id);
      }
  }

  mapEntities() {
    const out: { x: number; y: number; color: string; me?: boolean }[] = [];
    this.npcs.forEach((a) => out.push({ x: a.x, y: a.y, color: "#ff8a1f" }));
    this.vehicles.forEach((v) => out.push({ x: v.s.x, y: v.s.y, color: "#e5533d" }));
    this.avatars.forEach((a) => out.push({ x: a.x, y: a.y, color: a === this.me ? "#ffe600" : "#3483fa", me: a === this.me }));
    return out;
  }

  /** Atualiza a aparência do jogador local imediatamente (antes do eco do servidor). */
  previewLook(look: Appearance) {
    if (!this.me) return;
    const eq = safeEquip(this.state.players.get(net.sid)?.equip);
    this.retexture(this.me, JSON.stringify(look), eq);
    this.me.lookKey = "";
  }
}

/** Só redesenha o texto quando conteúdo ou cor mudam (setColor re-renderiza o canvas). */
function setLabel(t: Phaser.GameObjects.Text, text: string, color: string) {
  if (t.text !== text) t.setText(text);
  if (t.getData("color") !== color) {
    t.setData("color", color);
    t.setColor(color);
  }
}

function safeLook(json: string): Appearance {
  try {
    return sanitizeAppearance(JSON.parse(json));
  } catch {
    return sanitizeAppearance({});
  }
}

function safeEquip(json: string | undefined): Equipment {
  try {
    const e = JSON.parse(json || "{}");
    return { epiVest: !!e.epiVest, safetyShoes: !!e.safetyShoes, coletor: !!e.coletor };
  } catch {
    return NO_EQUIP;
  }
}

export type { AnimName, Island };
