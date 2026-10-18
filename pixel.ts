/** Buffer de pixels independente de plataforma (roda no navegador e no Node para testes). */

export type RGBA = [number, number, number, number];

const cache = new Map<string, RGBA>();

export function rgba(hex: string, a = 255): RGBA {
  const key = hex + a;
  const c = cache.get(key);
  if (c) return c;
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
  const v: RGBA = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), a];
  cache.set(key, v);
  return v;
}

export function toHex(c: RGBA): string {
  return "#" + c.slice(0, 3).map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

/** f > 0 clareia, f < 0 escurece (com leve desvio de matiz, estilo pixel art). */
export function shade(hex: string, f: number): string {
  const [r, g, b] = rgba(hex);
  if (f >= 0) return toHex([r + (255 - r) * f, g + (255 - g) * f, b + (240 - b) * f, 255]);
  const k = 1 + f;
  return toHex([r * k, g * k * 0.98, b * k * 1.04 + 4 * -f, 255]);
}

export function mix(a: string, b: string, t: number): string {
  const ca = rgba(a);
  const cb = rgba(b);
  return toHex([ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t, 255]);
}

export class PixelBuffer {
  data: Uint8ClampedArray;
  constructor(public w: number, public h: number) {
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  set(x: number, y: number, color: string | RGBA, alpha?: number) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const c = typeof color === "string" ? rgba(color, alpha ?? 255) : color;
    const i = (y * this.w + x) * 4;
    const a = c[3] / 255;
    if (a >= 1 || this.data[i + 3] === 0) {
      this.data[i] = c[0];
      this.data[i + 1] = c[1];
      this.data[i + 2] = c[2];
      this.data[i + 3] = Math.max(this.data[i + 3], c[3]);
    } else {
      this.data[i] = this.data[i] * (1 - a) + c[0] * a;
      this.data[i + 1] = this.data[i + 1] * (1 - a) + c[1] * a;
      this.data[i + 2] = this.data[i + 2] * (1 - a) + c[2] * a;
      this.data[i + 3] = Math.min(255, this.data[i + 3] + c[3] * (1 - this.data[i + 3] / 255));
    }
  }

  alphaAt(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[(y * this.w + x) * 4 + 3];
  }

  /** retângulo inclusivo (x0..x1, y0..y1) */
  rect(x0: number, y0: number, x1: number, y1: number, color: string, alpha?: number) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, color, alpha);
  }

  fill(x: number, y: number, w: number, h: number, color: string, alpha?: number) {
    this.rect(x, y, x + w - 1, y + h - 1, color, alpha);
  }

  clear(x0 = 0, y0 = 0, w = this.w, h = this.h) {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) {
        const i = (y * this.w + x) * 4;
        this.data[i] = this.data[i + 1] = this.data[i + 2] = this.data[i + 3] = 0;
      }
  }

  /** Contorno escuro estilo Stardew em volta de pixels opacos, dentro de uma região. */
  outline(x0: number, y0: number, w: number, h: number, color = "#2b1b17", alpha = 235) {
    const marks: number[] = [];
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) {
        if (this.alphaAt(x, y) > 40) continue;
        const n =
          (x > x0 && this.alphaAt(x - 1, y) > 100) ||
          (x < x0 + w - 1 && this.alphaAt(x + 1, y) > 100) ||
          (y > y0 && this.alphaAt(x, y - 1) > 100) ||
          (y < y0 + h - 1 && this.alphaAt(x, y + 1) > 100);
        if (n) marks.push(x, y);
      }
    const c = rgba(color, alpha);
    for (let i = 0; i < marks.length; i += 2) this.set(marks[i], marks[i + 1], c);
  }

  /** Copia uma região espelhando horizontalmente. */
  copyFlipped(sx: number, sy: number, w: number, h: number, dx: number, dy: number) {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const si = ((sy + y) * this.w + (sx + x)) * 4;
        const di = ((dy + y) * this.w + (dx + (w - 1 - x))) * 4;
        for (let k = 0; k < 4; k++) this.data[di + k] = this.data[si + k];
      }
  }

  blit(src: PixelBuffer, dx: number, dy: number) {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const i = (y * src.w + x) * 4;
        if (src.data[i + 3] === 0) continue;
        this.set(dx + x, dy + y, [src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3]]);
      }
  }

  toCanvas(scale = 1): HTMLCanvasElement {
    const c = document.createElement("canvas");
    c.width = this.w;
    c.height = this.h;
    const ctx = c.getContext("2d")!;
    const img = ctx.createImageData(this.w, this.h);
    img.data.set(this.data);
    ctx.putImageData(img, 0, 0);
    if (scale === 1) return c;
    const s = document.createElement("canvas");
    s.width = this.w * scale;
    s.height = this.h * scale;
    const sctx = s.getContext("2d")!;
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(c, 0, 0, s.width, s.height);
    return s;
  }
}

/** Ruído determinístico barato para texturas. */
export function noise2(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
