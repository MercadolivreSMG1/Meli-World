/** Arte procedural dos objetos do cenário, veículos, bakers, caixas e ícones. */
import { CLOTH_COLORS, ISLAND_COLORS, PROP_DEFS, TILE, WAVE_COLORS } from "@shared/index";
import { noise2, PixelBuffer, shade } from "./pixel";

const S = TILE;

/** Móvel em perspectiva 3/4: tampo claro + frente escura. */
function block(b: PixelBuffer, x: number, y: number, w: number, h: number, top: string, frontH = 4, front?: string) {
  b.fill(x, y, w, h - frontH, top);
  b.fill(x, y, w, 1, shade(top, 0.18));
  b.fill(x, y + h - frontH, w, frontH, front ?? shade(top, -0.28));
}

function finish(b: PixelBuffer) {
  b.outline(0, 0, b.w, b.h, "#2b1b17", 220);
  return b;
}

function screen(b: PixelBuffer, x: number, y: number, w: number, h: number, glow = "#5fd3ff") {
  b.fill(x, y, w, h, "#25272e");
  b.fill(x + 1, y + 1, w - 2, h - 2, shade(glow, -0.35));
  for (let i = 0; i < w - 3; i += 2) b.fill(x + 2 + i, y + h - 2 - ((i * 7) % (h - 3)), 1, ((i * 7) % (h - 3)) + 1, glow);
}

function treeArt(variant: number, pine: boolean) {
  const b = new PixelBuffer(32, 48);
  if (pine) {
    const g = ["#2f7a4a", "#2c6e45", "#357f52"][variant % 3];
    b.fill(14, 36, 4, 10, "#6b4428");
    b.fill(17, 36, 1, 10, "#4f3020");
    for (let i = 0; i < 4; i++) {
      const w = 8 + i * 6;
      const y = 4 + i * 8;
      for (let r = 0; r < 10; r++) {
        const ww = Math.min(w, 4 + r * 2 + i * 2);
        b.fill(16 - ww / 2, y + r, ww, 1, r < 2 ? shade(g, 0.15) : r > 7 ? shade(g, -0.2) : g);
      }
    }
  } else {
    const g = ["#4f9a3c", "#5aa646", "#468c37"][variant % 3];
    b.fill(13, 30, 6, 16, "#7a4e2c");
    b.fill(17, 30, 2, 16, "#5c3a20");
    b.fill(11, 44, 10, 2, "#5c3a20");
    const blobs: [number, number, number][] = [[16, 14, 13], [8, 20, 8], [24, 20, 8], [12, 8, 7], [21, 9, 7], [16, 24, 9]];
    for (const [cx, cy, r] of blobs)
      for (let y = -r; y <= r; y++)
        for (let x = -r; x <= r; x++)
          if (x * x + y * y <= r * r) {
            const n = noise2(cx + x, cy + y, variant);
            const c = y < -r / 3 ? shade(g, 0.14) : y > r / 2 ? shade(g, -0.18) : g;
            b.set(cx + x, cy + y, n < 0.08 ? shade(g, -0.25) : n > 0.94 ? shade(g, 0.3) : c);
          }
    if (variant === 1) for (const [x, y] of [[10, 12], [20, 8], [24, 18], [14, 22]]) {
      b.fill(x, y, 2, 2, "#e53935");
      b.set(x, y, "#ff8a80");
    }
  }
  return finish(b);
}

function carArt(variant: number, vertical: boolean) {
  const colors = ["#d94a3a", "#3483fa", "#e8e8e8", "#2b2b2b", "#3fa35a", "#f08a24"];
  const c = colors[variant % colors.length];
  if (vertical) {
    const b = new PixelBuffer(32, 48);
    b.fill(5, 4, 22, 40, c);
    b.fill(5, 4, 22, 2, shade(c, 0.25));
    b.fill(7, 10, 18, 7, "#2a3b52");
    b.fill(8, 11, 6, 2, "#8fb6d8");
    b.fill(7, 31, 18, 6, "#2a3b52");
    b.fill(7, 18, 18, 12, shade(c, 0.12));
    for (const [x, y] of [[3, 9], [26, 9], [3, 34], [26, 34]]) b.fill(x, y, 3, 6, "#1e1e22");
    b.fill(8, 4, 4, 2, "#fff6c2");
    b.fill(20, 4, 4, 2, "#fff6c2");
    b.fill(8, 42, 4, 2, "#e53935");
    b.fill(20, 42, 4, 2, "#e53935");
    return finish(b);
  }
  const b = new PixelBuffer(30, 16);
  b.fill(1, 3, 28, 10, c);
  b.fill(8, 3, 13, 10, shade(c, 0.12));
  b.fill(20, 4, 4, 8, "#2a3b52");
  b.fill(6, 4, 3, 8, "#2a3b52");
  b.fill(4, 1, 4, 2, "#1e1e22");
  b.fill(21, 1, 4, 2, "#1e1e22");
  b.fill(4, 13, 4, 2, "#1e1e22");
  b.fill(21, 13, 4, 2, "#1e1e22");
  b.fill(28, 4, 1, 2, "#fff6c2");
  b.fill(28, 10, 1, 2, "#fff6c2");
  return finish(b);
}

function motoArt(variant: number, vertical: boolean) {
  const c = ["#d94a3a", "#2b2b2b", "#3483fa", "#ffe600"][variant % 4];
  if (vertical) {
    const b = new PixelBuffer(16, 32);
    b.fill(7, 3, 2, 6, "#1e1e22");
    b.fill(7, 23, 2, 6, "#1e1e22");
    b.fill(5, 8, 6, 15, c);
    b.fill(6, 13, 4, 6, "#2b2b2b");
    b.fill(3, 8, 10, 1, "#9aa0aa");
    return finish(b);
  }
  const b = new PixelBuffer(20, 12);
  b.fill(1, 6, 5, 5, "#1e1e22");
  b.fill(14, 6, 5, 5, "#1e1e22");
  b.fill(4, 4, 12, 4, c);
  b.fill(7, 2, 5, 3, "#2b2b2b");
  b.fill(15, 2, 2, 3, "#9aa0aa");
  return finish(b);
}

export function busArt() {
  const b = new PixelBuffer(64, 22);
  b.fill(1, 2, 62, 18, "#3fa35a");
  b.fill(1, 2, 62, 3, "#e8e8e8");
  for (let x = 6; x < 56; x += 8) b.fill(x, 6, 6, 5, "#2a3b52");
  b.fill(58, 6, 4, 8, "#2a3b52");
  for (const x of [8, 48]) {
    b.fill(x, 0, 6, 2, "#1e1e22");
    b.fill(x, 20, 6, 2, "#1e1e22");
  }
  return finish(b);
}

/** Van da expedição. dir: up/down (vertical, cabine embaixo — dá ré na doca) ou left/right. */
export function vanArt(dir: string, wave: number) {
  const body = "#ffe600";
  const tag = WAVE_COLORS[wave] ?? "#ffffff";
  if (dir === "up" || dir === "down") {
    const b = new PixelBuffer(32, 64);
    b.fill(3, 2, 26, 60, body);
    b.fill(3, 2, 26, 2, shade(body, 0.3));
    b.fill(5, 4, 22, 38, shade(body, 0.12)); // teto do baú
    b.fill(5, 22, 22, 3, "#2d3277");
    b.fill(8, 44, 16, 7, "#2a3b52"); // para-brisa
    b.fill(9, 45, 5, 2, "#8fb6d8");
    b.fill(12, 52, 8, 4, tag); // QR do flash parking
    b.fill(14, 53, 4, 2, "#222");
    for (const [x, y] of [[1, 8], [28, 8], [1, 48], [28, 48]]) b.fill(x, y, 3, 8, "#1e1e22");
    b.fill(1, 42, 2, 3, "#2b2b2b");
    b.fill(29, 42, 2, 3, "#2b2b2b");
    b.fill(7, 59, 4, 2, "#fff6c2");
    b.fill(21, 59, 4, 2, "#fff6c2");
    return finish(b);
  }
  const b = new PixelBuffer(64, 32);
  b.fill(2, 3, 60, 26, body);
  b.fill(4, 5, 40, 22, shade(body, 0.12));
  b.fill(22, 5, 3, 22, "#2d3277");
  b.fill(46, 6, 8, 20, "#2a3b52");
  b.fill(47, 7, 3, 6, "#8fb6d8");
  b.fill(55, 12, 5, 8, tag);
  for (const [x, y] of [[8, 1], [48, 1], [8, 28], [48, 28]]) b.fill(x, y, 8, 3, "#1e1e22");
  if (dir === "left") {
    const f = new PixelBuffer(64, 32);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 64; x++) {
      const si = (y * 64 + x) * 4;
      const di = (y * 64 + (63 - x)) * 4;
      for (let k = 0; k < 4; k++) f.data[di + k] = b.data[si + k];
    }
    return finish(f);
  }
  return finish(b);
}

/** Caminhão Line Haul (carreta). */
export function truckArt(dir: string) {
  if (dir === "up" || dir === "down") {
    const b = new PixelBuffer(48, 96);
    b.fill(3, 2, 42, 70, "#e9ecef");
    b.fill(3, 2, 42, 2, "#ffffff");
    b.fill(5, 30, 38, 6, "#3483fa");
    b.fill(5, 37, 38, 2, "#ffe600");
    for (let y = 6; y < 70; y += 8) b.fill(5, y, 38, 1, "#cfd4da");
    b.fill(8, 72, 32, 22, "#2d3277"); // cavalo
    b.fill(11, 84, 26, 6, "#2a3b52");
    b.fill(12, 85, 8, 2, "#8fb6d8");
    for (const [x, y] of [[0, 10], [44, 10], [0, 22], [44, 22], [0, 58], [44, 58], [4, 76], [40, 76]]) b.fill(x, y, 4, 8, "#1e1e22");
    b.fill(12, 92, 5, 2, "#fff6c2");
    b.fill(31, 92, 5, 2, "#fff6c2");
    return finish(b);
  }
  const b = new PixelBuffer(96, 48);
  b.fill(2, 3, 70, 42, "#e9ecef");
  b.fill(30, 5, 6, 38, "#3483fa");
  b.fill(37, 5, 2, 38, "#ffe600");
  b.fill(72, 8, 22, 32, "#2d3277");
  b.fill(84, 11, 6, 26, "#2a3b52");
  for (const [x, y] of [[10, 0], [22, 0], [58, 0], [10, 44], [22, 44], [58, 44], [76, 4], [76, 40]]) b.fill(x, y, 8, 4, "#1e1e22");
  if (dir === "left") {
    const f = new PixelBuffer(96, 48);
    for (let y = 0; y < 48; y++) for (let x = 0; x < 96; x++) {
      const si = (y * 96 + x) * 4;
      const di = (y * 96 + (95 - x)) * 4;
      for (let k = 0; k < 4; k++) f.data[di + k] = b.data[si + k];
    }
    return finish(f);
  }
  return finish(b);
}

/** Baker cart (gaiola). fill 0..1, state open|pending|closed|setup */
export function bakerArt(fill: number, state: string, setup: boolean, island: string) {
  const b = new PixelBuffer(32, 34);
  const metal = "#9aa3ad";
  const dark = "#6b737c";
  // rodas
  for (const x of [3, 26]) {
    b.fill(x, 30, 4, 3, "#2b2b2b");
    b.fill(x + 1, 31, 2, 1, "#555");
  }
  // estrutura
  b.fill(2, 4, 2, 26, metal);
  b.fill(28, 4, 2, 26, dark);
  b.fill(2, 4, 28, 2, shade(metal, 0.2));
  for (const y of [12, 20, 28]) b.fill(2, y, 28, 2, y === 28 ? dark : metal);
  // grade
  for (let x = 6; x < 28; x += 4) for (let y = 6; y < 28; y++) if (y % 8 !== 4) b.set(x, y, "#b9c1ca", 140);
  // pacotes por nível
  const levels = [21, 13, 5];
  const total = Math.round(fill * 9);
  let k = 0;
  for (const ly of levels)
    for (let i = 0; i < 3; i++) {
      if (k++ >= total) break;
      const bx = 5 + i * 8;
      const c = ["#c48a52", "#b47a45", "#d39b62"][(i + ly) % 3];
      b.fill(bx, ly + 1, 7, 6, c);
      b.fill(bx, ly + 1, 7, 1, shade(c, 0.2));
      b.fill(bx + 3, ly + 1, 1, 6, "#e8d7a8");
      b.fill(bx + 1, ly + 4, 3, 2, "#f4f4f4");
    }
  // QR do setup no topo (meio da prateleira de cima)
  if (setup) {
    b.fill(13, 0, 6, 5, "#ffffff");
    b.fill(14, 1, 2, 2, "#222");
    b.fill(17, 2, 1, 2, "#222");
  }
  // faixa da ilha
  b.fill(2, 0, 3, 4, ISLAND_COLORS[island as "A"] ?? "#888");
  if (state === "closed" || state === "staged" || state === "moving") {
    b.fill(2, 13, 28, 2, "#38c172");
    b.fill(2, 21, 28, 2, "#38c172");
  }
  if (state === "pending") b.fill(2, 13, 28, 2, "#e5533d");
  return finish(b);
}

export function boxArt(kind: "small" | "bulky" | "belt", color?: string) {
  if (kind === "bulky") {
    const b = new PixelBuffer(14, 12);
    b.fill(0, 0, 14, 12, "#b07a45");
    b.fill(0, 0, 14, 3, "#c99460");
    b.fill(6, 0, 2, 12, "#e8d7a8");
    b.fill(1, 5, 4, 3, "#f4f4f4");
    b.fill(9, 8, 4, 2, "#e5533d");
    return finish(b);
  }
  if (kind === "belt") {
    const b = new PixelBuffer(8, 7);
    b.fill(0, 0, 8, 7, "#c48a52");
    b.fill(0, 0, 8, 2, "#d9a36c");
    b.fill(1, 3, 4, 3, color ?? "#ffffff");
    return finish(b);
  }
  const b = new PixelBuffer(10, 8);
  b.fill(0, 0, 10, 8, "#c48a52");
  b.fill(0, 0, 10, 2, "#d9a36c");
  b.fill(4, 0, 2, 8, "#e8d7a8");
  b.fill(1, 3, 3, 3, "#f4f4f4");
  b.fill(6, 4, 3, 2, "#ffe600");
  return finish(b);
}

/** Esteira (tile de 16x32, 2 tiles de altura) com rolos. frame 0..3 para animação. */
export function beltArt() {
  const b = new PixelBuffer(16, 32);
  b.fill(0, 0, 16, 3, "#565b63");
  b.fill(0, 29, 16, 3, "#565b63");
  b.fill(0, 3, 16, 26, "#2f3238");
  for (let x = 0; x < 16; x += 4) {
    b.fill(x, 4, 2, 24, "#3d4148");
    b.fill(x + 1, 4, 1, 24, "#474b53");
  }
  b.fill(0, 0, 16, 1, "#e8c33a");
  b.fill(0, 31, 16, 1, "#e8c33a");
  return b;
}

export function shadowArt(w: number) {
  const b = new PixelBuffer(w, 5);
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < w; x++) {
      const dx = (x - w / 2 + 0.5) / (w / 2);
      const dy = (y - 2) / 2.5;
      if (dx * dx + dy * dy <= 1) b.set(x, y, "#000000", 70);
    }
  return b;
}

export function markerArt(kind: "!" | "?" | "…") {
  const b = new PixelBuffer(9, 13);
  const col = kind === "!" ? "#ffe600" : kind === "?" ? "#9ad0ff" : "#ffffff";
  b.fill(1, 0, 7, 10, col);
  b.fill(0, 1, 9, 8, col);
  b.fill(3, 10, 3, 2, col);
  b.fill(4, 12, 1, 1, col);
  if (kind === "!") {
    b.fill(4, 2, 1, 4, "#2d3277");
    b.fill(4, 7, 1, 1, "#2d3277");
  } else if (kind === "?") {
    b.fill(3, 2, 3, 1, "#2d3277");
    b.fill(5, 3, 1, 2, "#2d3277");
    b.fill(4, 5, 1, 1, "#2d3277");
    b.fill(4, 7, 1, 1, "#2d3277");
  } else for (const x of [2, 4, 6]) b.set(x, 5, "#555");
  return finish(b);
}

// ----------------------------------------------------------------------------- props estáticos
export function propArt(kind: string, variant = 0): PixelBuffer {
  const d = PROP_DEFS[kind];
  const W = d.w * S;
  const H = d.h * S;
  const b = new PixelBuffer(W, H);
  switch (kind) {
    case "tree":
      return treeArt(variant, false);
    case "pine":
      return treeArt(variant, true);
    case "car":
      return carArt(variant, true);
    case "moto":
      return motoArt(variant, true);
    case "bush": {
      const g = "#4c9a3e";
      for (let y = 2; y < 16; y++) for (let x = 1; x < 15; x++) {
        const dx = x - 7.5;
        const dy = y - 9;
        if (dx * dx + dy * dy * 1.3 < 46) b.set(x, y, noise2(x, y, variant) > 0.85 ? shade(g, 0.25) : y > 12 ? shade(g, -0.2) : g);
      }
      if (variant % 2) for (const [x, y] of [[4, 6], [10, 8], [7, 11]]) b.set(x, y, "#ff8fb1");
      return finish(b);
    }
    case "flowers": {
      const cols = ["#ff6b8a", "#ffe066", "#ffffff", "#b39dff"];
      for (let i = 0; i < 5; i++) {
        const x = 2 + ((i * 5 + variant * 3) % 12);
        const y = 4 + ((i * 7) % 9);
        b.fill(x, y + 2, 1, 3, "#3f7a32");
        const c = cols[(i + variant) % 4];
        b.set(x, y, c);
        b.set(x - 1, y + 1, c);
        b.set(x + 1, y + 1, c);
        b.set(x, y + 1, "#ffcf3f");
      }
      return b;
    }
    case "rock":
      b.fill(2, 6, 12, 9, "#8f8a80");
      b.fill(3, 5, 9, 3, "#a9a398");
      b.fill(2, 13, 12, 2, "#6f6a62");
      return finish(b);
    case "lamp":
      b.fill(7, 6, 2, 25, "#3c4048");
      b.fill(4, 2, 8, 4, "#3c4048");
      b.fill(5, 5, 6, 2, "#fff3b0");
      b.fill(5, 29, 6, 3, "#2b2e34");
      return finish(b);
    case "bench":
      block(b, 1, 3, 30, 9, "#b98552", 4);
      b.fill(1, 1, 30, 3, "#8a5a30");
      b.fill(3, 12, 2, 4, "#5c3a20");
      b.fill(27, 12, 2, 4, "#5c3a20");
      return finish(b);
    case "pergola":
      for (const x of [2, 60]) b.fill(x, 8, 3, 40, "#8a5a30");
      for (let y = 4; y < 14; y += 4) b.fill(0, y, 64, 2, "#b98552");
      for (let x = 4; x < 64; x += 6) b.fill(x, 2, 2, 14, "#a07045");
      for (let i = 0; i < 40; i++) b.set((i * 13) % 64, 2 + ((i * 7) % 14), "#4f9a3c");
      return finish(b);
    case "pingpong":
      block(b, 1, 4, 46, 24, "#1f6f6a", 6);
      b.fill(23, 4, 2, 18, "#e8e8e8");
      b.fill(1, 12, 46, 1, "#e8e8e8");
      b.fill(4, 28, 2, 4, "#2b2b2b");
      b.fill(42, 28, 2, 4, "#2b2b2b");
      return finish(b);
    case "desk":
    case "desk_pc":
    case "guard_desk":
    case "setup_station":
      block(b, 0, 2, W, 14, kind === "setup_station" ? "#8fa0b4" : "#c49a6c", 5);
      if (kind === "desk_pc" || kind === "guard_desk") {
        screen(b, 9, 0, 14, 8);
        b.fill(14, 8, 4, 2, "#3c4048");
        b.fill(4, 9, 6, 2, "#e8e8e8");
      }
      if (kind === "setup_station") {
        b.fill(4, 4, 6, 5, "#ffffff");
        b.fill(5, 5, 2, 2, "#222");
        b.fill(18, 3, 8, 6, "#ffe600");
      }
      return finish(b);
    case "chair":
      b.fill(3, 2, 10, 6, "#3c4048");
      block(b, 3, 7, 10, 6, "#4a5568", 2);
      b.fill(4, 13, 2, 3, "#2b2b2b");
      b.fill(10, 13, 2, 3, "#2b2b2b");
      return finish(b);
    case "meeting_table":
      block(b, 0, 2, W, H - 2, "#8a5a30", 6);
      b.fill(8, 8, 10, 6, "#f4f4f4");
      b.fill(36, 10, 8, 5, "#ffe600");
      return finish(b);
    case "cafe_table":
      block(b, 2, 4, 28, 22, "#e8e8e8", 5);
      b.fill(12, 26, 8, 5, "#9aa3ad");
      b.fill(8, 9, 6, 4, "#d94a3a");
      b.fill(18, 10, 5, 3, "#ffe600");
      return finish(b);
    case "whiteboard":
      b.fill(1, 1, W - 2, 12, "#f8f8f8");
      b.fill(1, 12, W - 2, 2, "#9aa3ad");
      for (let i = 0; i < 4; i++) b.fill(5 + i * 9, 4 + (i % 2) * 3, 7, 1, ["#e5533d", "#3483fa", "#3fae5a", "#2b2b2b"][i]);
      return finish(b);
    case "plant":
      b.fill(4, 10, 8, 6, "#b0603a");
      b.fill(4, 10, 8, 1, "#c97a50");
      for (let i = 0; i < 9; i++) b.fill(3 + ((i * 5) % 10), 1 + ((i * 3) % 8), 3, 3, i % 2 ? "#3f8a3a" : "#56a848");
      return finish(b);
    case "sofa":
      block(b, 0, 0, W, 6, "#7b4fc9", 2);
      block(b, 0, 5, W, 11, "#8c62d6", 4);
      b.fill(0, 4, 4, 12, "#6a40b0");
      b.fill(W - 4, 4, 4, 12, "#6a40b0");
      return finish(b);
    case "tv":
      screen(b, 2, 2, W - 4, H - 8, "#7fd1ff");
      b.fill(W / 2 - 3, H - 6, 6, 4, "#3c4048");
      return finish(b);
    case "kpi_board":
    case "kpi_wall":
    case "training_screen": {
      screen(b, 1, 1, W - 2, kind === "kpi_board" ? 18 : H - 4, kind === "training_screen" ? "#ffe600" : "#5fffb0");
      if (kind !== "training_screen") {
        b.fill(4, 3, 6, 2, "#ffe600");
        b.fill(12, 3, 10, 2, "#e8e8e8");
      } else {
        b.fill(6, 6, 8, 6, "#3483fa");
        b.fill(18, 6, 30, 2, "#e8e8e8");
        b.fill(18, 10, 22, 2, "#e8e8e8");
      }
      if (kind === "kpi_board") {
        b.fill(6, 19, 4, 12, "#3c4048");
        b.fill(W - 10, 19, 4, 12, "#3c4048");
      }
      return finish(b);
    }
    case "mission_board": {
      b.fill(1, 1, W - 2, 20, "#a0703f");
      b.fill(3, 3, W - 6, 16, "#d8b07a");
      const cols = ["#fff7b0", "#ffd1dc", "#cde8ff", "#d4f5c9", "#ffffff"];
      for (let i = 0; i < 6; i++) {
        const x = 5 + (i % 3) * 13;
        const y = 4 + Math.floor(i / 3) * 8;
        b.fill(x, y, 10, 6, cols[i % 5]);
        b.set(x + 4, y, "#e5533d");
        b.fill(x + 2, y + 3, 6, 1, "#9a9a9a");
      }
      b.fill(6, 21, 4, 11, "#6b4428");
      b.fill(W - 10, 21, 4, 11, "#6b4428");
      return finish(b);
    }
    case "briefing_board":
      b.fill(1, 1, W - 2, 18, "#2d3277");
      b.fill(3, 3, W - 6, 4, "#ffe600");
      b.fill(3, 9, 18, 1, "#e8e8e8");
      b.fill(3, 12, 14, 1, "#e8e8e8");
      b.fill(3, 15, 20, 1, "#e8e8e8");
      b.fill(6, 19, 3, 13, "#3c4048");
      b.fill(W - 9, 19, 3, 13, "#3c4048");
      return finish(b);
    case "locker":
    case "mirror":
      if (kind === "mirror") {
        b.fill(1, 2, 14, 26, "#c49a6c");
        b.fill(3, 4, 10, 22, "#bfe3ff");
        b.fill(4, 5, 3, 8, "#eaf6ff");
        b.fill(2, 28, 12, 4, "#8a5a30");
        return finish(b);
      }
      b.fill(1, 0, 14, 32, "#3483fa");
      b.fill(1, 0, 14, 2, "#5fa0ff");
      b.fill(2, 4, 12, 1, "#2a6fd6");
      b.fill(2, 7, 12, 1, "#2a6fd6");
      b.fill(11, 14, 2, 4, "#e8e8e8");
      b.fill(4, 20, 7, 6, "#ff8a1f");
      b.fill(4, 22, 7, 1, "#e9eef2");
      b.fill(1, 29, 14, 3, "#2a6fd6");
      return finish(b);
    case "charger":
      block(b, 0, 2, W, 14, "#4a5568", 5);
      for (let i = 0; i < 6; i++) {
        b.fill(3 + i * 7, 2, 4, 7, "#33363d");
        b.fill(4 + i * 7, 3, 2, 2, i % 2 ? "#5fffb0" : "#ffe066");
      }
      return finish(b);
    case "flowrack":
      for (let y = 0; y < H; y += 8) {
        b.fill(0, y, W, 2, "#9aa3ad");
        for (let x = 2; x < W; x += 3) b.fill(x, y + 2, 1, 1, "#6b737c");
        b.fill(4, y + 3, 10, 5, ["#c48a52", "#d39b62", "#b47a45"][(y / 8) % 3]);
        b.fill(18, y + 3, 10, 5, ["#d39b62", "#b47a45", "#c48a52"][(y / 8) % 3]);
      }
      b.fill(0, 0, 2, H, "#6b737c");
      b.fill(W - 2, 0, 2, H, "#6b737c");
      return finish(b);
    case "label_table":
    case "ps_desk":
    case "audit_desk":
    case "help_desk":
    case "volumosos": {
      const top = kind === "ps_desk" ? "#e5533d" : kind === "audit_desk" ? "#9b59d0" : kind === "help_desk" ? "#3483fa" : kind === "volumosos" ? "#8fa0b4" : "#c49a6c";
      block(b, 0, 4, W, H - 4, shade(top, 0.25), 7, shade(top, -0.25));
      b.fill(0, 4, W, 2, top);
      if (kind === "label_table") {
        b.fill(3, 7, 9, 7, "#c48a52");
        b.fill(5, 9, 4, 3, "#ffffff");
        b.fill(18, 6, 10, 8, "#e8e8e8");
        b.fill(20, 7, 6, 3, "#33363d");
      } else if (kind === "volumosos") {
        b.fill(4, 0, 14, 12, "#b07a45");
        b.fill(10, 0, 2, 12, "#e8d7a8");
        b.fill(24, 6, 18, 2, "#2b2b2b");
      } else {
        screen(b, W - 18, 0, 14, 10);
        b.fill(4, 8, 8, 6, "#c48a52");
        b.fill(6, 10, 3, 2, "#f4f4f4");
      }
      return finish(b);
    }
    case "sorter": {
      b.fill(0, 6, W, H - 6, "#3c4048");
      b.fill(0, 6, W, 2, "#5a5f68");
      b.fill(4, 12, W - 8, 40, "#2b2e34");
      const cols = ["#e5533d", "#3483fa", "#3fae5a", "#9b59d0", "#ffe600"];
      for (let x = 6; x < W - 8; x += 6) {
        b.fill(x, 14, 5, 16, cols[(x / 6) % 5 | 0]);
        b.fill(x, 34, 5, 16, cols[((x / 6) + 2) % 5 | 0]);
      }
      b.fill(4, 31, W - 8, 2, "#9aa3ad");
      for (let x = 10; x < W; x += 34) {
        b.fill(x, 0, 10, 8, "#6b737c");
        b.fill(x + 3, 2, 4, 2, "#5fffb0");
      }
      b.fill(0, H - 4, W, 4, "#e8c33a");
      return finish(b);
    }
    case "sorter_panel":
      b.fill(4, 0, 24, 22, "#4a5568");
      screen(b, 6, 2, 20, 12, "#5fffb0");
      b.fill(8, 16, 4, 3, "#e5533d");
      b.fill(14, 16, 4, 3, "#ffe600");
      b.fill(20, 16, 4, 3, "#38c172");
      b.fill(12, 22, 8, 10, "#3c4048");
      return finish(b);
    case "goleiro":
      block(b, 0, 2, W, H - 2, "#f08a24", 8);
      b.fill(4, 6, 24, 10, "#c48a52");
      b.fill(8, 8, 6, 4, "#f4f4f4");
      b.fill(18, 8, 6, 4, "#e5533d");
      return finish(b);
    case "goleiro_cages": {
      const colors = ["#38c172", "#e5533d", "#ffe600", "#f4f4f4", "#9b59d0", "#3483fa", "#f08a24", "#2b2b2b"];
      for (let i = 0; i < 8; i++) {
        const y = i * 16;
        b.fill(1, y + 1, 30, 14, "#6b737c");
        b.fill(3, y + 3, 26, 10, "#4a5058");
        for (let x = 5; x < 29; x += 4) b.fill(x, y + 3, 1, 10, "#8a929b");
        b.fill(1, y + 1, 4, 14, colors[i]);
        if (i % 2 === 0) b.fill(10, y + 7, 8, 6, "#c48a52");
      }
      return finish(b);
    }
    case "custody":
      b.fill(0, 6, W, H - 6, "#4a5058");
      for (let x = 2; x < W; x += 4) b.fill(x, 6, 1, H - 6, "#8a929b");
      b.fill(0, 6, W, 2, "#8a929b");
      b.fill(8, 20, 12, 10, "#c48a52");
      b.fill(26, 24, 10, 8, "#b07a45");
      b.fill(16, 0, 16, 7, "#e5533d");
      b.fill(18, 2, 12, 3, "#ffffff");
      return finish(b);
    case "pallet":
    case "pallet_boxes":
    case "bulky_stack":
    case "empty_bakers": {
      if (kind === "empty_bakers") {
        for (let i = 0; i < 3; i++) {
          b.fill(2 + i * 3, 2 + i * 2, 24, 2, "#9aa3ad");
          b.fill(2 + i * 3, 2 + i * 2, 2, 24, "#9aa3ad");
          b.fill(24 + i * 3, 2 + i * 2, 2, 24, "#6b737c");
        }
        return finish(b);
      }
      b.fill(1, 24, 30, 6, "#b98552");
      b.fill(1, 24, 30, 1, "#d6a372");
      for (const x of [3, 14, 25]) b.fill(x, 27, 4, 3, "#6b4428");
      if (kind !== "pallet") {
        const big = kind === "bulky_stack";
        for (let row = 0; row < (big ? 2 : 3); row++)
          for (let col = 0; col < (big ? 1 : 3); col++) {
            const bw = big ? 26 : 9;
            const bh = big ? 11 : 7;
            const x = 3 + col * 9;
            const y = 24 - (row + 1) * bh;
            const c = ["#c48a52", "#b47a45", "#d39b62"][(row + col) % 3];
            b.fill(x, y, bw - 1, bh - 1, c);
            b.fill(x, y, bw - 1, 1, shade(c, 0.2));
            b.fill(x + Math.floor(bw / 2) - 1, y, 1, bh - 1, "#e8d7a8");
          }
        if (kind === "pallet_boxes") b.fill(2, 3, 28, 18, "#cfe8ff", 70); // filme stretch
      }
      return finish(b);
    }
    case "forklift":
      b.fill(4, 6, 20, 20, "#f08a24");
      b.fill(6, 8, 12, 8, "#2b2b2b");
      b.fill(24, 4, 3, 26, "#4a5058");
      b.fill(27, 22, 5, 2, "#9aa3ad");
      b.fill(27, 28, 5, 2, "#9aa3ad");
      for (const [x, y] of [[4, 26], [18, 26]]) b.fill(x, y, 6, 4, "#1e1e22");
      return finish(b);
    case "cone":
      b.fill(6, 3, 4, 10, "#ff7a1a");
      b.fill(5, 7, 6, 2, "#ffffff");
      b.fill(3, 13, 10, 2, "#ff7a1a");
      return finish(b);
    case "counter":
      block(b, 0, 2, W, 14, "#e8e8e8", 6, "#9aa3ad");
      for (let i = 0; i < 6; i++) {
        b.fill(6 + i * 20, 3, 14, 7, "#c0c6cc");
        b.fill(8 + i * 20, 4, 10, 5, ["#e5a33a", "#7bbf4e", "#d94a3a", "#f2d24a", "#c48a52", "#e8e8e8"][i]);
      }
      return finish(b);
    case "coffee":
      b.fill(2, 0, 12, 15, "#3c4048");
      b.fill(4, 2, 8, 4, "#d94a3a");
      b.fill(6, 8, 4, 4, "#1e1e22");
      b.fill(6, 11, 4, 2, "#f4f4f4");
      return finish(b);
    case "microwave":
      b.fill(1, 3, 14, 10, "#e8e8e8");
      b.fill(2, 4, 9, 8, "#2a3b52");
      b.fill(12, 5, 2, 2, "#38c172");
      return finish(b);
    case "water_cooler":
      b.fill(4, 0, 8, 6, "#9ad0ff");
      b.fill(3, 6, 10, 10, "#e8e8e8");
      b.fill(6, 9, 4, 2, "#3483fa");
      return finish(b);
    case "timeclock":
      b.fill(2, 0, 12, 14, "#2d3277");
      screen(b, 4, 2, 8, 5, "#5fffb0");
      b.fill(5, 9, 6, 3, "#ffe600");
      b.fill(7, 14, 2, 2, "#3c4048");
      return finish(b);
    case "sign":
      b.fill(1, 2, W - 2, 11, "#2d3277");
      b.fill(2, 3, W - 4, 9, "#ffe600");
      return finish(b);
    case "passarela": {
      for (let y = 0; y < H; y += 3) {
        b.fill(0, y, W, 2, "#d9a520");
        b.fill(0, y + 2, W, 1, "#8a6a14");
      }
      b.fill(0, 0, 2, H, "#6b737c");
      b.fill(W - 2, 0, 2, H, "#6b737c");
      return finish(b);
    }
    case "printer":
      b.fill(1, 4, 14, 10, "#e8e8e8");
      b.fill(3, 2, 10, 4, "#f8f8f8");
      b.fill(3, 12, 10, 2, "#3c4048");
      b.fill(11, 6, 2, 2, "#38c172");
      return finish(b);
    default:
      b.fill(0, 0, W, H, CLOTH_COLORS[variant % CLOTH_COLORS.length]);
      return finish(b);
  }
}

// ----------------------------------------------------------------------------- ícones de itens
export function iconArt(id: string): PixelBuffer {
  const b = new PixelBuffer(16, 16);
  switch (id) {
    case "coletor":
      b.fill(4, 1, 8, 14, "#33363d");
      b.fill(5, 2, 6, 6, "#3fae8a");
      b.fill(6, 3, 2, 2, "#b6ffe0");
      b.fill(5, 9, 6, 4, "#5a5f68");
      b.fill(6, 0, 4, 1, "#e5533d");
      break;
    case "colete":
      b.fill(3, 2, 10, 13, "#ff8a1f");
      b.clear(6, 2, 4, 4);
      b.fill(3, 7, 10, 2, "#e9eef2");
      b.fill(3, 11, 10, 2, "#e9eef2");
      b.fill(7, 2, 2, 13, "#c96a10");
      break;
    case "botina":
      b.fill(4, 3, 6, 9, "#3a2a1e");
      b.fill(4, 10, 10, 4, "#3a2a1e");
      b.fill(11, 10, 3, 3, "#d9a520");
      b.fill(4, 14, 10, 1, "#1e1e22");
      break;
    case "luvas":
      b.fill(4, 4, 8, 9, "#f2c94c");
      for (const x of [4, 6, 8, 10]) b.fill(x, 1, 2, 4, "#f2c94c");
      b.fill(4, 12, 8, 3, "#3483fa");
      break;
    case "cafe":
      b.fill(3, 5, 9, 9, "#f4f4f4");
      b.fill(4, 5, 7, 3, "#6b4428");
      b.fill(12, 7, 2, 4, "#f4f4f4");
      b.fill(5, 1, 1, 3, "#cfcfcf");
      b.fill(8, 0, 1, 3, "#cfcfcf");
      break;
    case "marmita":
      b.fill(2, 5, 12, 9, "#c0c6cc");
      b.fill(2, 4, 12, 2, "#e8e8e8");
      b.fill(4, 7, 4, 3, "#f2d24a");
      b.fill(9, 7, 3, 3, "#7bbf4e");
      b.fill(4, 10, 8, 2, "#d94a3a");
      break;
    case "agua":
      b.fill(5, 1, 6, 2, "#3483fa");
      b.fill(4, 3, 8, 12, "#9ad0ff");
      b.fill(5, 6, 2, 6, "#e3f4ff");
      break;
    case "bateria":
      b.fill(3, 3, 10, 11, "#33363d");
      b.fill(6, 1, 4, 2, "#33363d");
      b.fill(5, 5, 6, 7, "#5fffb0");
      break;
    case "etiquetas":
      b.fill(2, 3, 12, 10, "#f4f4f4");
      b.fill(6, 6, 4, 4, "#9a9a9a");
      b.fill(2, 3, 12, 1, "#ffe600");
      break;
    case "medalha":
      b.fill(5, 0, 2, 6, "#3483fa");
      b.fill(9, 0, 2, 6, "#e5533d");
      b.fill(4, 6, 8, 8, "#f2c94c");
      b.fill(6, 8, 4, 4, "#ffe680");
      break;
    case "cracha":
      b.fill(7, 0, 2, 4, "#3483fa");
      b.fill(3, 4, 10, 11, "#f4f4f4");
      b.fill(5, 6, 4, 4, "#9ab6e0");
      b.fill(5, 11, 6, 1, "#9a9a9a");
      b.fill(3, 13, 10, 2, "#ffe600");
      break;
    default:
      b.fill(3, 3, 10, 10, "#c48a52");
  }
  b.outline(0, 0, 16, 16, "#2b1b17", 220);
  return b;
}
