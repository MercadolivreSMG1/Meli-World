/** Arte procedural da expansão: praça, lojas, casas, decoração, inimigos, armas e ícones novos. */
import { PROP_DEFS, TILE } from "@shared/index";
import { noise2, PixelBuffer, shade } from "./pixel";

const S = TILE;

function finish(b: PixelBuffer) {
  b.outline(0, 0, b.w, b.h, "#2b1b17", 220);
  return b;
}

function circle(b: PixelBuffer, cx: number, cy: number, r: number, col: string, alpha?: number) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) b.set(cx + x, cy + y, col, alpha);
}

const AWNING: Record<string, [string, string]> = {
  equip: ["#e5533d", "#f4f4f4"],
  food: ["#ffe600", "#f08a24"],
  home: ["#3fae5a", "#f4f4f4"],
  sell: ["#3483fa", "#ffe600"],
};

/** Props novos. Retorna null se o tipo não é da expansão. */
export function extraPropArt(kind: string, variant: number, data?: string): PixelBuffer | null {
  const d = PROP_DEFS[kind];
  if (!d) return null;
  const W = d.w * S;
  const H = d.h * S;
  const b = new PixelBuffer(W, H);
  switch (kind) {
    case "fountain": {
      circle(b, 24, 30, 17, "#9aa3ad");
      circle(b, 24, 30, 14, "#4aa3d8");
      circle(b, 24, 30, 9, "#7fc6ee");
      b.fill(21, 8, 6, 22, "#b9c1ca");
      b.fill(19, 6, 10, 4, "#9aa3ad");
      for (let i = 0; i < 6; i++) b.set(18 + i * 2, 4 - (i % 2), "#cdeaff");
      return finish(b);
    }
    case "stall": {
      const [c1, c2] = AWNING[data ?? "equip"] ?? AWNING.equip;
      b.fill(2, 18, W - 4, 28, "#b98552");
      b.fill(2, 18, W - 4, 3, "#d6a372");
      b.fill(4, 22, W - 8, 10, "#8a5a30");
      // mercadorias
      for (let i = 0; i < 5; i++) b.fill(7 + i * 11, 23, 7, 6, ["#c48a52", "#e5533d", "#3483fa", "#ffe600", "#3fae5a"][(i + variant) % 5]);
      for (const x of [3, W - 5]) b.fill(x, 8, 2, 38, "#6b4428");
      for (let x = 0; x < W; x += 8) {
        b.fill(x, 2, 8, 9, (x / 8) % 2 ? c1 : c2);
        b.fill(x, 11, 8, 2, shade((x / 8) % 2 ? c1 : c2, -0.25));
      }
      b.fill(0, 0, W, 2, shade(c1, -0.3));
      return finish(b);
    }
    case "market_board": {
      b.fill(1, 1, W - 2, 22, "#2d3277");
      b.fill(3, 3, W - 6, 5, "#ffe600");
      const cols = ["#fff7b0", "#ffffff", "#cde8ff", "#ffd1dc"];
      for (let i = 0; i < 6; i++) b.fill(4 + (i % 3) * 14, 10 + Math.floor(i / 3) * 6, 11, 5, cols[i % 4]);
      b.fill(6, 23, 3, 9, "#3c4048");
      b.fill(W - 9, 23, 3, 9, "#3c4048");
      return finish(b);
    }
    case "mp_terminal": {
      b.fill(4, 2, 24, 26, "#00b1ea");
      b.fill(6, 4, 20, 12, "#1d2a44");
      b.fill(8, 6, 16, 3, "#5fd3ff");
      b.fill(8, 11, 10, 2, "#ffffff");
      b.fill(8, 19, 16, 6, "#e8e8e8");
      b.fill(12, 28, 8, 4, "#2b2b2b");
      return finish(b);
    }
    case "realty_desk": {
      b.fill(0, 6, W, 26, "#c49a6c");
      b.fill(0, 6, W, 3, "#d9b386");
      b.fill(4, 10, 12, 9, "#3fae5a");
      b.fill(6, 12, 8, 5, "#ffffff");
      b.fill(8, 13, 4, 3, "#e5533d");
      b.fill(30, 2, 12, 9, "#25272e");
      b.fill(31, 3, 10, 7, "#5fd3ff");
      return finish(b);
    }
    case "plot_sign": {
      b.fill(7, 6, 2, 10, "#6b4428");
      b.fill(1, 1, 14, 8, "#f4f4f4");
      b.fill(2, 2, 12, 2, "#e5533d");
      b.fill(3, 5, 10, 1, "#9a9a9a");
      return finish(b);
    }
    case "dead_tree": {
      b.fill(13, 18, 6, 28, "#5c4a3a");
      b.fill(17, 18, 2, 28, "#43362a");
      for (const [x, y, w] of [[6, 14, 9], [18, 10, 10], [9, 6, 6], [20, 22, 8], [4, 22, 9]] as [number, number, number][]) b.fill(x, y, w, 2, "#5c4a3a");
      for (const [x, y] of [[6, 12], [26, 8], [9, 4], [27, 20]] as [number, number][]) b.fill(x, y, 2, 3, "#43362a");
      b.fill(10, 44, 12, 2, "#3a2e24");
      return finish(b);
    }
    case "ruin_pillar": {
      b.fill(2, 4, 12, 26, "#a59f93");
      b.fill(2, 4, 12, 2, "#c4beb2");
      b.fill(12, 4, 2, 26, "#837d72");
      b.fill(1, 28, 14, 4, "#8a8478");
      b.clear(2, 4, 4, 3);
      b.fill(6, 14, 4, 2, "#5f8d45");
      return finish(b);
    }
    case "barrel": {
      b.fill(3, 1, 10, 14, "#8a5a30");
      b.fill(3, 3, 10, 1, "#4a4d55");
      b.fill(3, 11, 10, 1, "#4a4d55");
      b.fill(5, 2, 2, 12, "#a87248");
      return finish(b);
    }
    case "crate_stack": {
      for (const [x, y, w, h] of [[1, 12, 14, 18], [16, 14, 14, 16], [6, 0, 14, 13]] as [number, number, number, number][]) {
        b.fill(x, y, w, h, "#9c7a52");
        b.fill(x, y, w, 2, "#b8946a");
        b.fill(x + 1, y + h / 2, w - 2, 1, "#6b5236");
        b.fill(x + w / 2, y + 2, 1, h - 2, "#6b5236");
      }
      return finish(b);
    }
    case "mushroom": {
      for (const [x, y, c] of [[4, 8, "#e5533d"], [10, 10, "#c9b45a"], [7, 4, "#9b59d0"]] as [number, number, string][]) {
        b.fill(x + 1, y + 2, 2, 4, "#f0e6d0");
        b.fill(x - 1, y, 6, 3, c);
        b.set(x + 1, y + 1, "#ffffff");
      }
      return b;
    }
    case "campfire": {
      b.fill(2, 11, 12, 3, "#6b4428");
      b.fill(4, 9, 8, 2, "#8a5a30");
      b.fill(5, 3, 6, 7, "#ff8a1f");
      b.fill(6, 1, 4, 6, "#ffd166");
      b.fill(7, 0, 2, 3, "#fff3b0");
      return finish(b);
    }
    case "big_sign": {
      b.fill(22, 14, 4, 18, "#6b4428");
      b.fill(0, 0, W, 16, "#2d3277");
      b.fill(2, 2, W - 4, 12, "#ffe600");
      return finish(b);
    }
  }
  return null;
}

// ----------------------------------------------------------------------------- casas
/** Casa 6x5 tiles (96x80) + telhado acima (total 96x104). */
export function houseArt(tier: number, variant: number): PixelBuffer {
  const b = new PixelBuffer(96, 104);
  const walls = ["#f5e6c8", "#d9e7f5", "#f7d9d0", "#dff0d0"][variant % 4];
  const roof = ["#c0503a", "#2d3277", "#3f7a36", "#8a5a30"][variant % 4];
  const baseY = tier >= 3 ? 30 : 40;
  // paredes
  b.fill(4, baseY, 88, 100 - baseY, walls);
  b.fill(4, baseY, 88, 3, shade(walls, -0.15));
  b.fill(88, baseY, 4, 100 - baseY, shade(walls, -0.12));
  // janelas
  const win = (x: number, y: number) => {
    b.fill(x, y, 14, 12, "#5c4a3a");
    b.fill(x + 1, y + 1, 12, 10, "#8fc6e8");
    b.fill(x + 2, y + 2, 4, 3, "#cdeaff");
    b.fill(x + 7, y + 1, 1, 10, "#5c4a3a");
  };
  win(12, baseY + 18);
  win(70, baseY + 18);
  if (tier >= 2) win(12, baseY + 40 > 84 ? baseY + 18 : baseY + 40);
  if (tier >= 3) {
    win(12, baseY + 4);
    win(41, baseY + 4);
    win(70, baseY + 4);
    b.fill(4, baseY + 34, 88, 3, shade(walls, -0.2)); // divisão dos andares
  }
  // porta (centro)
  b.fill(40, 74, 16, 26, "#8a5a30");
  b.fill(42, 76, 12, 22, "#a87248");
  b.fill(51, 87, 2, 2, "#ffe600");
  // varanda (tier 2+)
  if (tier >= 2) {
    b.fill(0, 98, 96, 6, "#b98552");
    for (let x = 2; x < 96; x += 8) b.fill(x, 92, 2, 6, "#8a5a30");
    b.fill(0, 92, 96, 2, "#a87248");
  } else b.fill(36, 98, 24, 6, "#9aa3ad");
  // telhado
  const top = baseY - 30;
  for (let y = 0; y < 34; y++) {
    const inset = Math.max(0, 22 - Math.floor(y * 0.75));
    const c = y < 3 ? shade(roof, 0.2) : y % 6 === 0 ? shade(roof, -0.18) : roof;
    b.fill(inset, top + y, 96 - inset * 2, 1, c);
  }
  b.fill(0, top + 31, 96, 3, shade(roof, -0.3));
  // chaminé
  b.fill(70, top + 2, 8, 14, "#8a7c74");
  b.fill(69, top + 1, 10, 3, "#6b5e57");
  // placa amarela da caixinha
  if (tier >= 3) b.fill(60, baseY + 40, 10, 6, "#ffe600");
  return finish(b);
}

// ----------------------------------------------------------------------------- decoração do lote
export function decorArt(kind: string): PixelBuffer {
  const sizes: Record<string, [number, number]> = { banco: [32, 16], piscina: [32, 32], rede: [32, 16], horta: [32, 16] };
  const [W, H] = sizes[kind] ?? [16, kind === "poste" || kind === "arvore" || kind === "estatua_van" ? 28 : 16];
  const b = new PixelBuffer(W, H);
  switch (kind) {
    case "arvore":
      b.fill(4, 20, 8, 7, "#b0603a");
      circle(b, 8, 11, 7, "#4f9a3c");
      circle(b, 6, 9, 3, "#6bb050");
      break;
    case "canteiro":
      b.fill(1, 9, 14, 6, "#8a5a30");
      for (let i = 0; i < 5; i++) {
        b.fill(2 + i * 3, 5, 2, 4, "#3f7a32");
        b.set(2 + i * 3, 4, ["#ff6b8a", "#ffe066", "#ffffff", "#b39dff", "#ff8a1f"][i]);
      }
      break;
    case "banco":
      b.fill(1, 3, 30, 4, "#8a5a30");
      b.fill(1, 7, 30, 4, "#b98552");
      b.fill(3, 11, 2, 4, "#5c3a20");
      b.fill(27, 11, 2, 4, "#5c3a20");
      break;
    case "poste":
      b.fill(7, 6, 2, 22, "#3c4048");
      b.fill(4, 1, 8, 5, "#3c4048");
      b.fill(5, 4, 6, 2, "#fff3b0");
      break;
    case "caixa_correio":
      b.fill(7, 8, 2, 8, "#6b4428");
      b.fill(2, 2, 12, 7, "#ffe600");
      b.fill(2, 2, 12, 2, "#e6cf3a");
      b.fill(11, 0, 2, 4, "#e5533d");
      break;
    case "churrasqueira":
      b.fill(2, 4, 12, 9, "#9a3a2c");
      b.fill(3, 2, 10, 3, "#3c4048");
      b.fill(4, 1, 2, 2, "#ff8a1f");
      b.fill(9, 0, 2, 2, "#ffd166");
      b.fill(3, 13, 2, 3, "#2b2b2b");
      b.fill(11, 13, 2, 3, "#2b2b2b");
      break;
    case "piscina":
      b.fill(0, 0, 32, 32, "#e8e8e8");
      b.fill(2, 2, 28, 28, "#3fb5e8");
      for (let i = 0; i < 6; i++) b.fill(5 + ((i * 7) % 20), 6 + i * 4, 6, 1, "#9ee0ff");
      b.fill(26, 4, 2, 8, "#9aa3ad");
      break;
    case "estatua_van":
      b.fill(2, 18, 12, 10, "#9aa3ad");
      b.fill(2, 18, 12, 2, "#b9c1ca");
      b.fill(3, 6, 10, 12, "#ffe600");
      b.fill(4, 6, 8, 4, "#2a3b52");
      b.fill(3, 15, 3, 3, "#1e1e22");
      b.fill(10, 15, 3, 3, "#1e1e22");
      break;
    case "cerca_viva":
      for (let y = 2; y < 16; y++) for (let x = 0; x < 16; x++) if (noise2(x, y, 5) > 0.15) b.set(x, y, noise2(x, y, 6) > 0.8 ? "#6bb050" : "#3f8a3a");
      break;
    case "rede":
      b.fill(1, 2, 2, 14, "#6b4428");
      b.fill(29, 2, 2, 14, "#6b4428");
      for (let x = 3; x < 29; x++) b.fill(x, 6 + Math.round(Math.sin(((x - 3) / 26) * Math.PI) * 4), 1, 3, x % 4 < 2 ? "#e5533d" : "#ffe600");
      break;
    case "horta":
      b.fill(0, 4, 32, 12, "#6b4428");
      for (let i = 0; i < 7; i++) {
        b.fill(2 + i * 4, 2, 3, 5, "#3f8a3a");
        if (i % 2) b.set(3 + i * 4, 1, "#e5533d");
      }
      break;
    case "trofeu":
      b.fill(4, 12, 8, 4, "#6b4428");
      b.fill(3, 2, 10, 7, "#f2c94c");
      b.fill(6, 9, 4, 3, "#f2c94c");
      b.fill(5, 3, 2, 4, "#fff3b0");
      b.fill(1, 3, 2, 3, "#f2c94c");
      b.fill(13, 3, 2, 3, "#f2c94c");
      break;
    default:
      b.fill(2, 2, 12, 12, "#c48a52");
  }
  return finish(b);
}

// ----------------------------------------------------------------------------- inimigos (2 quadros)
export function enemyArt(kind: string): PixelBuffer {
  const size = kind === "atraso" ? 48 : kind === "rato" ? 16 : 20;
  const b = new PixelBuffer(size * 2, size);
  for (let f = 0; f < 2; f++) {
    const ox = f * size;
    switch (kind) {
      case "rato": {
        const y = f ? 1 : 0;
        b.fill(ox + 3, 8 + y, 9, 6, "#8a8a92");
        b.fill(ox + 10, 7 + y, 4, 5, "#9a9aa2");
        b.set(ox + 12, 8 + y, "#e5533d");
        b.fill(ox + 11, 6 + y, 2, 2, "#ffb3c1");
        b.fill(ox + 0, 11 + y, 3, 1, "#ffb3c1");
        b.fill(ox + 4, 14, 2, 2, "#5a5a62");
        b.fill(ox + 9, 14, 2, 2, "#5a5a62");
        break;
      }
      case "caixa_mimica": {
        const open = f === 1;
        b.fill(ox + 2, 7, 16, 12, "#c48a52");
        b.fill(ox + 9, 7, 2, 12, "#e8d7a8");
        b.fill(ox + 2, open ? 1 : 4, 16, 4, "#d9a36c");
        if (open) {
          b.fill(ox + 3, 5, 14, 3, "#5a1a1a");
          for (let x = 3; x < 17; x += 3) b.set(ox + x, 5, "#ffffff");
          b.fill(ox + 7, 6, 6, 2, "#e5533d");
        }
        b.fill(ox + 5, 10, 3, 3, "#ffffff");
        b.fill(ox + 12, 10, 3, 3, "#ffffff");
        b.set(ox + 6, 11, "#e5533d");
        b.set(ox + 13, 11, "#e5533d");
        break;
      }
      case "bug": {
        const cols = ["#5fffb0", "#ff5fd2", "#5fd3ff"];
        for (let i = 0; i < 26; i++) {
          const x = 3 + Math.floor(noise2(i, f, 11) * 14);
          const y = 3 + Math.floor(noise2(f, i, 12) * 14);
          b.fill(ox + x, y, 2, 2, cols[i % 3]);
        }
        b.fill(ox + 6, 7, 8, 7, "#1d1d26");
        b.fill(ox + 7, 9, 2, 2, "#ff5f5f");
        b.fill(ox + 11, 9, 2, 2, "#ff5f5f");
        b.fill(ox + 8, 12, 4, 1, "#5fffb0");
        break;
      }
      case "fraudador": {
        const y = f ? 1 : 0;
        b.fill(ox + 6, 1 + y, 8, 7, "#e0a77e");
        b.fill(ox + 5, 1 + y, 10, 3, "#1d1d26"); // touca
        b.fill(ox + 6, 4 + y, 8, 2, "#1d1d26"); // máscara
        b.set(ox + 8, 5 + y, "#ffffff");
        b.set(ox + 11, 5 + y, "#ffffff");
        b.fill(ox + 4, 8 + y, 12, 8, "#2b2b2b");
        b.fill(ox + 5, 10 + y, 10, 1, "#e5533d");
        b.fill(ox + 15, 9 + y, 3, 2, "#f2c94c"); // cartão
        b.fill(ox + 6, 16, 3, 4, "#1e1e22");
        b.fill(ox + 11, 16, 3, 4, "#1e1e22");
        break;
      }
      case "atraso": {
        const r = 19;
        circle(b, ox + 24, 22, r + 2, "#6b1a1a");
        circle(b, ox + 24, 22, r, "#f4f4f4");
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          b.fill(ox + 24 + Math.round(Math.cos(a) * 15), 22 + Math.round(Math.sin(a) * 15), 2, 2, "#2b2b2b");
        }
        const t = f ? 0.9 : 0.4;
        for (let k = 0; k < 13; k++) b.set(ox + 24 + Math.round(Math.cos(t * 6) * k), 22 + Math.round(Math.sin(t * 6) * k), "#e5533d");
        for (let k = 0; k < 9; k++) b.set(ox + 24 + Math.round(Math.cos(-1.4) * k), 22 + Math.round(Math.sin(-1.4) * k), "#2b2b2b");
        b.fill(ox + 15, 15, 5, 4, "#e5533d");
        b.fill(ox + 28, 15, 5, 4, "#e5533d");
        b.fill(ox + 18, 30, 12, 3, "#2b2b2b");
        for (let x = 19; x < 30; x += 2) b.set(ox + x, 30, "#ffffff");
        // pernas e sinos
        b.fill(ox + 12, 40, 5, 8, "#3c4048");
        b.fill(ox + 31, 40, 5, 8, "#3c4048");
        circle(b, ox + 10, 4, 4, "#f2c94c");
        circle(b, ox + 38, 4, 4, "#f2c94c");
        break;
      }
    }
  }
  b.outline(0, 0, b.w, b.h, "#1b1012", 230);
  return b;
}

// ----------------------------------------------------------------------------- armas na mão
export function weaponArt(id: string): PixelBuffer {
  const b = new PixelBuffer(16, 16);
  switch (id) {
    case "regua":
      b.fill(7, 1, 2, 13, "#c0c6cc");
      for (let y = 2; y < 14; y += 2) b.set(8, y, "#5a5f68");
      break;
    case "espada_papelao":
      b.fill(7, 1, 3, 10, "#c48a52");
      b.fill(8, 1, 1, 10, "#d9a36c");
      b.fill(5, 11, 7, 2, "#8a5a30");
      b.fill(7, 13, 3, 3, "#6b4428");
      break;
    case "fita_chicote":
      b.fill(7, 10, 3, 6, "#6b4428");
      for (let i = 0; i < 9; i++) b.fill(8 + Math.round(Math.sin(i) * 2), 1 + i, 2, 1, "#c9a96e");
      break;
    case "sabre_scanner":
      b.fill(6, 10, 4, 6, "#33363d");
      b.set(7, 11, "#5fffb0");
      b.fill(7, 0, 2, 10, "#5fffb0");
      b.fill(8, 0, 1, 10, "#d6ffee");
      break;
    case "martelo_palete":
      b.fill(7, 5, 2, 11, "#8a5a30");
      b.fill(3, 1, 10, 5, "#b98552");
      b.fill(3, 3, 10, 1, "#6b4428");
      break;
    case "lamina_onda_verde":
      b.fill(7, 0, 3, 11, "#38c172");
      b.fill(8, 0, 1, 11, "#c8ffd9");
      b.fill(4, 11, 9, 2, "#ffe600");
      b.fill(7, 13, 3, 3, "#2d3277");
      break;
    default:
      b.fill(7, 2, 2, 12, "#c0c6cc");
  }
  b.outline(0, 0, 16, 16, "#2b1b17", 200);
  return b;
}

export function slashArt(): PixelBuffer {
  const b = new PixelBuffer(28, 28);
  for (let a = -1.2; a <= 1.2; a += 0.04) {
    for (let r = 9; r <= 13; r++) {
      const x = 14 + Math.round(Math.cos(a) * r);
      const y = 14 + Math.round(Math.sin(a) * r);
      b.set(x, y, "#ffffff", r === 13 ? 120 : 220);
    }
  }
  return b;
}

// ----------------------------------------------------------------------------- ícones novos
export function extraIcon(id: string): PixelBuffer | null {
  if (["regua", "espada_papelao", "fita_chicote", "sabre_scanner", "martelo_palete", "lamina_onda_verde"].includes(id)) return weaponArt(id);
  const b = new PixelBuffer(16, 16);
  switch (id) {
    case "capacete_aco":
      b.fill(3, 4, 10, 7, "#c0c6cc");
      b.fill(2, 10, 12, 2, "#9aa3ad");
      b.fill(6, 4, 2, 6, "#e8eef2");
      break;
    case "colete_kevlar":
      b.fill(3, 2, 10, 13, "#2d3277");
      b.clear(6, 2, 4, 3);
      b.fill(4, 7, 8, 3, "#4a5568");
      b.fill(7, 2, 2, 13, "#1f2450");
      break;
    case "armadura_baker":
      b.fill(2, 2, 12, 13, "#9aa3ad");
      for (let x = 4; x < 14; x += 3) b.fill(x, 3, 1, 11, "#6b737c");
      b.fill(2, 8, 12, 1, "#6b737c");
      break;
    case "energetico":
      b.fill(5, 1, 6, 2, "#c0c6cc");
      b.fill(4, 3, 8, 12, "#3483fa");
      b.fill(5, 6, 6, 3, "#ffe600");
      break;
    case "kit_socorros":
      b.fill(2, 4, 12, 10, "#f4f4f4");
      b.fill(6, 2, 4, 3, "#9aa3ad");
      b.fill(7, 6, 2, 6, "#e5533d");
      b.fill(5, 8, 6, 2, "#e5533d");
      break;
    case "coxinha":
      for (let y = 3; y < 14; y++) b.fill(8 - Math.floor((y - 3) / 2), y, Math.max(2, (y - 3)), 1, "#d9893a");
      b.fill(4, 12, 9, 2, "#b86a24");
      break;
    case "pao_queijo":
      circle(b, 8, 9, 5, "#f2c94c");
      circle(b, 7, 8, 2, "#ffe680");
      break;
    case "pacote_extraviado":
      b.fill(2, 4, 12, 10, "#9c7a52");
      b.fill(2, 4, 12, 2, "#b8946a");
      b.fill(7, 4, 2, 10, "#6b5236");
      b.fill(3, 8, 3, 3, "#e5533d");
      b.fill(10, 1, 4, 4, "#ffe600");
      b.set(11, 2, "#2d3277");
      break;
    case "chip_bugado":
      b.fill(3, 3, 10, 10, "#1d1d26");
      for (let i = 3; i < 13; i += 2) {
        b.set(i, 1, "#c0c6cc");
        b.set(i, 14, "#c0c6cc");
      }
      b.fill(5, 5, 6, 6, "#5fffb0");
      b.fill(7, 7, 2, 2, "#ff5fd2");
      break;
    case "cartao_clonado":
      b.fill(1, 4, 14, 9, "#f2c94c");
      b.fill(1, 6, 14, 2, "#2b2b2b");
      b.fill(3, 10, 4, 2, "#e5533d");
      break;
    case "rabo_rato":
      for (let i = 0; i < 10; i++) b.fill(3 + i, 8 + Math.round(Math.sin(i * 0.8) * 2), 2, 1, "#c9a96e");
      break;
    case "coins":
      circle(b, 8, 8, 6, "#f2c94c");
      circle(b, 8, 8, 4, "#ffe680");
      b.fill(7, 5, 2, 6, "#b8860b");
      break;
    default:
      if (id.startsWith("decor_")) {
        const art = decorArt(id.slice(6) === "trofeu" ? "trofeu" : id.slice(6));
        const out = new PixelBuffer(16, 16);
        const sx = art.w / 16;
        const sy = art.h / 16;
        const s2 = Math.max(sx, sy);
        for (let y = 0; y < 16; y++)
          for (let x = 0; x < 16; x++) {
            const ix = Math.floor(x * s2);
            const iy = Math.floor(y * s2);
            if (ix >= art.w || iy >= art.h) continue;
            const i = (iy * art.w + ix) * 4;
            if (art.data[i + 3]) out.set(x, y, [art.data[i], art.data[i + 1], art.data[i + 2], art.data[i + 3]]);
          }
        return out;
      }
      return null;
  }
  b.outline(0, 0, 16, 16, "#2b1b17", 220);
  return b;
}
