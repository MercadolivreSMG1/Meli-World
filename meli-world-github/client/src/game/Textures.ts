/** Registra no Phaser as texturas geradas proceduralmente (com cache por chave). */
import Phaser from "phaser";
import type { AnimName, Appearance, Equipment } from "@shared/index";
import { appearanceKey, getWorld, PROP_DEFS } from "@shared/index";
import { ANIM_FPS, ANIM_FRAMES, ANIM_ORDER, COLS, DIRS, FH, FW, renderSheet } from "../art/character";
import { PixelBuffer, shade } from "../art/pixel";
import { bakerArt, beltArt, boxArt, busArt, iconArt, markerArt, propArt, shadowArt, truckArt, vanArt } from "../art/props";
import { renderGround } from "../art/tiles";

function addBuffer(scene: Phaser.Scene, key: string, buf: PixelBuffer) {
  if (scene.textures.exists(key)) return key;
  scene.textures.addCanvas(key, buf.toCanvas());
  return key;
}

export function bootTextures(scene: Phaser.Scene) {
  const world = getWorld();
  addBuffer(scene, "ground", renderGround(world));
  addBuffer(scene, "belt", beltArt());
  addBuffer(scene, "box_small", boxArt("small"));
  addBuffer(scene, "box_bulky", boxArt("bulky"));
  for (const [k, c] of Object.entries({ A: "#e5533d", B: "#3483fa", C: "#3fae5a", D: "#9b59d0", x: "#555555" })) addBuffer(scene, `beltbox_${k}`, boxArt("belt", c));
  addBuffer(scene, "shadow16", shadowArt(12));
  addBuffer(scene, "shadow32", shadowArt(26));
  addBuffer(scene, "marker_!", markerArt("!"));
  addBuffer(scene, "marker_?", markerArt("?"));
  addBuffer(scene, "bus", busArt());
  for (const dir of ["up", "down", "left", "right"]) {
    addBuffer(scene, `truck_${dir}`, truckArt(dir));
    for (const w of [0, 1, 2, 3]) addBuffer(scene, `van_${dir}_${w}`, vanArt(dir, w));
  }
  for (const p of world.props) propTexture(scene, p.kind, p.variant ?? 0);
  // carros do tráfego (horizontais) — reaproveita a arte de carro/moto
  for (let v = 0; v < 6; v++) {
    addBuffer(scene, `traffic_car_${v}`, trafficCar(v));
    addBuffer(scene, `traffic_moto_${v}`, trafficMoto(v));
  }
  // luz noturna
  const glow = document.createElement("canvas");
  glow.width = glow.height = 96;
  const g = glow.getContext("2d")!;
  const grad = g.createRadialGradient(48, 48, 2, 48, 48, 48);
  grad.addColorStop(0, "rgba(255,236,170,0.55)");
  grad.addColorStop(1, "rgba(255,236,170,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 96, 96);
  if (!scene.textures.exists("glow")) scene.textures.addCanvas("glow", glow);
}

function trafficCar(v: number) {
  const colors = ["#d94a3a", "#3483fa", "#e8e8e8", "#2b2b2b", "#3fa35a", "#f08a24"];
  const c = colors[v % 6];
  const b = new PixelBuffer(30, 16);
  b.fill(1, 3, 28, 10, c);
  b.fill(8, 3, 11, 10, shade(c, 0.14));
  b.fill(19, 4, 4, 8, "#2a3b52");
  b.fill(6, 4, 3, 8, "#2a3b52");
  for (const [x, y] of [[4, 1], [21, 1], [4, 13], [21, 13]]) b.fill(x, y, 4, 2, "#1e1e22");
  b.fill(28, 4, 1, 2, "#fff6c2");
  b.fill(28, 10, 1, 2, "#fff6c2");
  b.outline(0, 0, 30, 16);
  return b;
}

function trafficMoto(v: number) {
  const c = ["#d94a3a", "#2b2b2b", "#3483fa", "#ffe600", "#3fa35a", "#f08a24"][v % 6];
  const b = new PixelBuffer(20, 14);
  b.fill(1, 8, 5, 5, "#1e1e22");
  b.fill(14, 8, 5, 5, "#1e1e22");
  b.fill(4, 6, 12, 4, c);
  b.fill(8, 1, 4, 6, "#2d3277");
  b.fill(8, 0, 4, 2, "#e8e8e8");
  b.outline(0, 0, 20, 14);
  return b;
}

export function propTexture(scene: Phaser.Scene, kind: string, variant: number): string {
  const key = `prop_${kind}_${variant}`;
  if (!scene.textures.exists(key)) addBuffer(scene, key, propArt(kind, variant));
  return key;
}

export function bakerTexture(scene: Phaser.Scene, island: string, state: string, setup: boolean, fill: number): string {
  const bucket = Math.max(0, Math.min(9, Math.round(fill * 9)));
  const st = state === "staged" || state === "moving" ? "closed" : state;
  const key = `baker_${island}_${st}_${setup ? 1 : 0}_${bucket}`;
  if (!scene.textures.exists(key)) addBuffer(scene, key, bakerArt(bucket / 9, st, setup, island));
  return key;
}

const sheetCache = new Set<string>();

/** Gera (uma vez) o spritesheet + animações para uma aparência. Retorna o prefixo de chave. */
export function characterTexture(scene: Phaser.Scene, look: Appearance, equip: Equipment): string {
  const key = "ch_" + hash(appearanceKey(look, equip));
  if (sheetCache.has(key) && scene.textures.exists(key)) return key;
  const buf = renderSheet(look, equip);
  const tex = scene.textures.addCanvas(key, buf.toCanvas())!;
  for (let row = 0; row < 4; row++) for (let col = 0; col < COLS; col++) tex.add(row * COLS + col, 0, col * FW, row * FH, FW, FH);
  let start = 0;
  const starts: Record<string, number> = {};
  for (const a of ANIM_ORDER) {
    starts[a] = start;
    start += ANIM_FRAMES[a];
  }
  DIRS.forEach((dir, row) => {
    for (const a of ANIM_ORDER) {
      const frames = Array.from({ length: ANIM_FRAMES[a] }, (_, i) => ({ key, frame: row * COLS + starts[a] + i }));
      scene.anims.create({ key: `${key}:${a}:${dir}`, frames, frameRate: ANIM_FPS[a as AnimName], repeat: -1 });
    }
  });
  sheetCache.add(key);
  return key;
}

function hash(s: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/** Ícone de item como dataURL (para a interface HTML). */
const iconCache = new Map<string, string>();
export function iconUrl(id: string, scale = 3): string {
  const k = id + scale;
  if (!iconCache.has(k)) iconCache.set(k, iconArt(id).toCanvas(scale).toDataURL());
  return iconCache.get(k)!;
}

export function propSize(kind: string) {
  const d = PROP_DEFS[kind];
  return { w: d.w * 16, h: d.h * 16 };
}
