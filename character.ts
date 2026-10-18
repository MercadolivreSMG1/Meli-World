/**
 * Gerador procedural de personagens em camadas (16x32, estilo Stardew).
 * Camadas: 1 corpo · 2 rosto · 3 cabelo · 4 roupa · 5 calça · 6 calçado · 7 acessórios · 8 equipamentos.
 * Cada combinação de aparência gera um spritesheet com todas as animações nas 4 direções.
 * Para trocar por arte desenhada à mão, basta substituir as funções de camada mantendo o layout do sheet.
 */
import type { AnimName, Appearance, Equipment } from "@shared/index";
import { CLOTH_COLORS, EYE_COLORS, HAIR_COLORS, SKIN_TONES } from "@shared/index";
import { mix, PixelBuffer, shade } from "./pixel";

export const FW = 16;
export const FH = 32;
export const DIRS = ["down", "up", "left", "right"] as const;

export const ANIM_FRAMES: Record<AnimName, number> = {
  idle: 2, walk: 4, run: 4, carry: 4, carryIdle: 1, push: 4, scan: 2, interact: 2, sit: 1, celebrate: 2, work: 2,
};
export const ANIM_FPS: Record<AnimName, number> = {
  idle: 1.6, walk: 8, run: 12, carry: 7, carryIdle: 1, push: 6, scan: 2.5, interact: 4, sit: 1, celebrate: 6, work: 4,
};
export const ANIM_ORDER = Object.keys(ANIM_FRAMES) as AnimName[];
export const ANIM_START: Record<string, number> = {};
let acc = 0;
for (const a of ANIM_ORDER) {
  ANIM_START[a] = acc;
  acc += ANIM_FRAMES[a];
}
export const COLS = acc; // 28

type View = "front" | "back" | "side";
type Arm = "down" | "carry" | "push" | "up" | "scan" | "reach" | "work";

interface Pose {
  bob: number;
  leg: number;
  armL: Arm;
  armR: Arm;
  swing: number;
  sit: boolean;
  jump: number;
  lean: number;
  phase: number;
  blink: boolean;
  screen: boolean;
}

function poseFor(anim: AnimName, f: number): Pose {
  const p: Pose = { bob: 0, leg: 0, armL: "down", armR: "down", swing: 0, sit: false, jump: 0, lean: 0, phase: f % 2, blink: false, screen: false };
  const walkLeg = [0, 1, 0, -1][f % 4];
  switch (anim) {
    case "idle":
      p.bob = f === 1 ? 1 : 0;
      break;
    case "walk":
      p.leg = walkLeg;
      p.swing = -walkLeg;
      p.bob = f % 2 === 1 ? -1 : 0;
      break;
    case "run":
      p.leg = [2, 0, -2, 0][f % 4];
      p.swing = -Math.sign(p.leg) * 1;
      p.bob = f % 2 === 1 ? -1 : 0;
      p.lean = 1;
      break;
    case "carry":
      p.leg = walkLeg;
      p.bob = f % 2 === 1 ? -1 : 0;
      p.armL = p.armR = "carry";
      break;
    case "carryIdle":
      p.armL = p.armR = "carry";
      break;
    case "push":
      p.leg = walkLeg;
      p.bob = f % 2 === 1 ? -1 : 0;
      p.armL = p.armR = "push";
      p.lean = 1;
      break;
    case "scan":
      p.armR = "scan";
      p.screen = f === 1;
      break;
    case "interact":
      p.armR = f === 1 ? "reach" : "scan";
      break;
    case "sit":
      p.sit = true;
      break;
    case "celebrate":
      p.armL = p.armR = "up";
      p.jump = f === 1 ? -2 : 0;
      break;
    case "work":
      p.armL = p.armR = "work";
      p.bob = f === 1 ? 1 : 0;
      break;
  }
  return p;
}

interface Pal {
  skin: string; skinS: string; skinD: string; hair: string; hairS: string; hairH: string; eye: string;
  facial: string; top: string; topS: string; topH: string; vest: string; vestS: string; bottom: string; bottomS: string;
  shoes: string; shoesS: string; hat: string; hatS: string; pack: string; packS: string;
}

function palette(a: Appearance, e: Equipment): Pal {
  const skin = SKIN_TONES[a.skin] ?? SKIN_TONES[3];
  const hair = HAIR_COLORS[a.hairColor] ?? HAIR_COLORS[1];
  const top = a.top === "uniforme" ? "#ffe600" : CLOTH_COLORS[a.topColor] ?? "#ffe600";
  const vest = e.epiVest ? "#ff8a1f" : a.vest === "refletivo" ? "#c6f135" : a.vest === "lider" ? "#2d3277" : CLOTH_COLORS[a.vestColor] ?? "#2d3277";
  const bottom = a.bottom === "jeans" ? mix(CLOTH_COLORS[a.bottomColor] ?? "#2d3277", "#3a5a8c", 0.55) : CLOTH_COLORS[a.bottomColor] ?? "#2d3277";
  const shoes = e.safetyShoes ? "#3a2a1e" : CLOTH_COLORS[a.shoesColor] ?? "#e8e8e8";
  const hat = a.hat === "capacete" ? (CLOTH_COLORS[a.hatColor] === "#2d3277" ? "#f4f4f4" : CLOTH_COLORS[a.hatColor] ?? "#f4f4f4") : CLOTH_COLORS[a.hatColor] ?? "#2d3277";
  const pack = CLOTH_COLORS[a.backpackColor] ?? "#2b2b2b";
  return {
    skin, skinS: shade(skin, -0.14), skinD: shade(skin, -0.3), hair, hairS: shade(hair, -0.25), hairH: shade(hair, 0.22),
    eye: EYE_COLORS[a.eyeColor] ?? "#2b1c12", facial: HAIR_COLORS[a.facialColor] ?? hair,
    top, topS: shade(top, -0.2), topH: shade(top, 0.18), vest, vestS: shade(vest, -0.22), bottom, bottomS: shade(bottom, -0.22),
    shoes, shoesS: shade(shoes, -0.3), hat, hatS: shade(hat, -0.25), pack, packS: shade(pack, -0.25),
  };
}

class Painter {
  // geometria
  H = 0;
  tw = 4;
  legLen = 5;
  torsoLen = 7;
  hip = 25;
  torsoTop = 18;
  neckY = 17;
  ht = 7;
  cx0 = 4;
  cx1 = 11;
  up = 0; // deslocamento vertical do tronco/cabeça
  dx = 0; // inclinação lateral (side view)
  constructor(
    private buf: PixelBuffer, private ox: number, private oy: number, private a: Appearance, private e: Equipment,
    private view: View, private pose: Pose, private c: Pal,
  ) {
    this.H = a.height === "baixo" ? -1 : a.height === "alto" ? 1 : 0;
    const B = a.body === "magro" ? 0 : a.body === "forte" ? 2 : 1;
    this.tw = 3 + B;
    this.legLen = 5 + this.H;
    this.torsoLen = 7 + this.H;
    const j = pose.jump;
    const sitDrop = pose.sit ? 3 : 0;
    this.hip = 30 - this.legLen + sitDrop + j;
    this.up = pose.bob + j + sitDrop;
    this.torsoTop = 30 - this.legLen - this.torsoLen + this.up;
    this.neckY = this.torsoTop - 1;
    this.ht = this.neckY - 10;
    if (view === "side") {
      this.cx0 = B === 0 ? 6 : B === 1 ? 5 : 4;
      this.cx1 = B === 2 ? 11 : 10;
      this.dx = -pose.lean;
    } else {
      this.cx0 = 8 - this.tw;
      this.cx1 = 7 + this.tw;
    }
  }

  p(x: number, y: number, col: string, alpha?: number) {
    if (x < 0 || x >= FW || y < 0 || y >= FH) return;
    this.buf.set(this.ox + x, this.oy + y, col, alpha);
  }
  r(x0: number, y0: number, x1: number, y1: number, col: string, alpha?: number) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.p(x, y, col, alpha);
  }

  draw() {
    const v = this.view;
    if (v === "side") this.backPackSide(true);
    this.legs();
    this.torso();
    this.vest();
    if (v !== "back") this.badgeAndBelt();
    this.neck();
    this.head();
    if (v !== "back") this.face();
    this.hair();
    this.hat();
    if (v !== "back") this.glasses();
    this.accessory();
    this.arms();
    if (v === "back") this.backPackBack();
    if (v === "front") this.packStrapsFront();
  }

  // ---------------------------------------------------------------- pernas, calça e calçado
  private legs() {
    const { a, c, view, pose } = this;
    const hip = this.hip;
    if (view === "side") return this.legsSide();
    const forte = a.body === "forte";
    const L: [number, number] = [forte ? 4 : 5, 7];
    const R: [number, number] = [8, forte ? 11 : 10];
    const liftL = pose.sit ? 0 : Math.max(0, pose.leg);
    const liftR = pose.sit ? 0 : Math.max(0, -pose.leg);
    const legBottom = 29;
    for (const [[x0, x1], lift, isLeft] of [[L, liftL, true], [R, liftR, false]] as [[number, number], number, boolean][]) {
      const yb = legBottom - lift;
      const len = yb - hip + 1;
      let pantsRows = len;
      if (a.bottom === "bermuda") pantsRows = Math.ceil(len * 0.55);
      if (a.bottom === "saia") pantsRows = 0;
      for (let y = hip; y <= yb; y++) {
        const isPants = y - hip < pantsRows;
        const col = isPants ? (x1 === 7 && isLeft ? c.bottom : c.bottomS) : c.skin;
        this.r(x0, y, x1, y, isPants ? c.bottom : c.skin);
        // sombra na parte interna
        this.p(isLeft ? x1 : x0, y, isPants ? c.bottomS : c.skinS);
        void col;
      }
      if (a.bottom === "jeans") this.r(isLeft ? x0 + 1 : x1 - 1, hip + 1, isLeft ? x0 + 1 : x1 - 1, hip + pantsRows - 1, shade(c.bottom, 0.15));
      if (a.bottom === "cargo") this.r(isLeft ? x0 : x1, hip + 2, isLeft ? x0 : x1, hip + 3, c.bottomS);
      if (a.bottom === "jogger") this.r(x0, yb, x1, yb, shade(c.bottom, 0.25));
      this.shoe(x0, x1, 30 - lift, isLeft);
    }
    // cós
    if (a.bottom === "saia") {
      this.r(this.cx0 - 1, hip, this.cx1 + 1, hip + 2, c.bottom);
      this.r(this.cx0 - 1, hip + 2, this.cx1 + 1, hip + 2, c.bottomS);
    } else {
      this.r(this.cx0, hip, this.cx1, hip, c.bottom);
      if (a.bottom !== "jogger" && a.bottom !== "bermuda") this.r(this.cx0, hip, this.cx1, hip, shade(c.bottom, -0.35), 160);
    }
  }

  private shoe(x0: number, x1: number, y: number, isLeft: boolean) {
    const { a, c, e } = this;
    const style = e.safetyShoes ? "botas" : a.shoes;
    if (style === "chinelo") {
      this.r(x0, y, x1, y + 1, c.skin);
      this.r(x0, y, x1, y, c.shoes);
      this.r(x0, y + 1, x1, y + 1, shade(c.shoes, -0.2), 200);
      return;
    }
    if (style === "botas") {
      this.r(x0, y - 1, x1, y + 1, c.shoes);
      this.r(x0, y + 1, x1, y + 1, c.shoesS);
      if (e.safetyShoes) this.p(isLeft ? x0 : x1, y + 1, "#d9a520");
      return;
    }
    this.r(x0, y, x1, y + 1, c.shoes);
    this.r(x0, y + 1, x1, y + 1, style === "tenis" ? "#f4f4f4" : shade(c.shoes, 0.25));
    if (style === "tenis") this.p(isLeft ? x1 : x0, y, shade(c.shoes, -0.25));
  }

  private legsSide() {
    const { a, c, pose } = this;
    const hip = this.hip;
    const forte = a.body === "forte";
    const legs: { x: number; off: number; back: boolean }[] = [
      { x: forte ? 8 : 8, off: -pose.leg, back: true },
      { x: forte ? 5 : 6, off: pose.leg, back: false },
    ];
    if (pose.sit) {
      // coxas para frente, canelas para baixo
      for (const back of [true, false]) {
        const col = back ? c.bottomS : c.bottom;
        this.r(3, hip, 9, hip + 1, col);
        const shin = a.bottom === "bermuda" || a.bottom === "saia" ? c.skin : col;
        this.r(3, hip + 2, 4, 29, back ? shade(shin, -0.1) : shin);
      }
      this.r(1, 30, 4, 31, c.shoes);
      this.r(1, 31, 4, 31, c.shoesS);
      return;
    }
    for (const L of legs) {
      const knee = hip + Math.floor(this.legLen / 2);
      const pantsRows = a.bottom === "bermuda" ? Math.ceil(this.legLen * 0.55) : a.bottom === "saia" ? 0 : 99;
      for (let y = hip; y <= 29; y++) {
        const o = y > knee ? -Math.sign(L.off) * Math.min(Math.abs(L.off), y - knee) : 0;
        const isPants = y - hip < pantsRows;
        const col = isPants ? (L.back ? c.bottomS : c.bottom) : L.back ? c.skinS : c.skin;
        this.r(L.x + o, y, L.x + 1 + o, y, col);
      }
      const fo = -Math.sign(L.off) * Math.min(Math.abs(L.off), 29 - knee);
      const style = this.e.safetyShoes ? "botas" : a.shoes;
      const sc = L.back ? c.shoesS : c.shoes;
      if (style === "botas") this.r(L.x - 1 + fo, 29, L.x + 1 + fo, 31, sc);
      else this.r(L.x - 1 + fo, 30, L.x + 1 + fo, 31, style === "chinelo" ? c.skin : sc);
      this.r(L.x - 1 + fo, 31, L.x + 1 + fo, 31, style === "tenis" ? "#f0f0f0" : shade(sc, -0.25));
      if (style === "chinelo") this.r(L.x + fo, 30, L.x + 1 + fo, 30, c.shoes);
    }
    if (a.bottom === "saia") this.r(this.cx0, hip, this.cx1 + 1, hip + 2, c.bottom);
    else this.r(this.cx0 + 1, hip, this.cx1, hip, c.bottom);
  }

  // ---------------------------------------------------------------- tronco e roupa
  private torso() {
    const { a, c, view } = this;
    const y0 = this.torsoTop;
    const y1 = this.hip - 1;
    const x0 = this.cx0 + this.dx;
    const x1 = this.cx1 + this.dx;
    this.r(x0, y0, x1, y1, c.top);
    // sombreamento
    if (view === "side") this.r(x1, y0, x1, y1, c.topS);
    else this.r(x1, y0 + 1, x1, y1, c.topS);
    this.r(x0, y1, x1, y1, c.topS);
    this.r(x0 + 1, y0, x1 - 1, y0, c.topH);
    const mid = 7 + this.dx;
    switch (a.top) {
      case "uniforme":
        if (view === "front") {
          this.p(7, y0, "#2d3277");
          this.p(8, y0, "#2d3277");
          this.p(x1 - 2, y0 + 2, "#2d3277");
          this.p(x1 - 1, y0 + 2, "#3483fa");
        } else if (view === "back") {
          this.r(x0 + 1, y0 + 2, x1 - 1, y0 + 2, "#2d3277");
        } else this.p(x0, y0 + 2, "#2d3277");
        break;
      case "polo":
        if (view !== "back") {
          this.p(view === "side" ? x0 : 6, y0, "#ffffff");
          this.p(view === "side" ? x0 + 1 : 9, y0, "#ffffff");
          if (view === "front") this.p(8, y0 + 1, c.topS);
        } else this.r(x0 + 1, y0, x1 - 1, y0, shade(c.top, 0.35));
        break;
      case "xadrez":
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if ((x + 1) % 3 === 0 || (y - y0) % 3 === 1) this.p(x, y, c.topS);
        break;
      case "regata":
        if (view === "front") {
          this.p(x0, y0, c.skin);
          this.p(x1, y0, c.skin);
          this.r(6, y0, 9, y0, c.skin);
        }
        break;
      case "moletom":
        if (view === "back") this.r(x0 + 1, y0, x1 - 1, y0 + 2, c.topS);
        else if (view === "front") {
          this.r(6, y1 - 3, 9, y1 - 2, c.topS);
          this.p(7, y0 + 1, "#f4f4f4");
          this.p(8, y0 + 1, "#f4f4f4");
        } else this.r(x1 - 1, y0, x1, y0 + 2, c.topS);
        break;
      case "social":
        if (view === "front") {
          this.r(6, y0, 9, y0, "#f8f8f8");
          for (let y = y0 + 1; y <= y1; y += 2) this.p(mid, y, c.topS);
        } else if (view === "side") this.p(x0, y0, "#f8f8f8");
        break;
      case "camiseta":
      default:
        if (view === "front") this.r(7, y0, 8, y0, c.skinS);
        break;
    }
  }

  private vest() {
    const { a, c, e, view } = this;
    const kind = e.epiVest ? "epi" : a.vest;
    if (kind === "nenhum") return;
    const y0 = this.torsoTop;
    const y1 = this.hip - 1;
    const x0 = this.cx0 + this.dx;
    const x1 = this.cx1 + this.dx;
    if (kind === "jaqueta") {
      this.r(x0, y0, x1, y1, c.vest);
      this.r(x1, y0, x1, y1, c.vestS);
      if (view === "front") this.r(7, y0, 8, y1, c.top);
      if (view === "side") this.r(x0, y0 + 1, x0, y1, c.top);
      return;
    }
    const col = c.vest;
    if (view === "front") {
      this.r(x0, y0, 6, y1, col);
      this.r(9, y0, x1, y1, col);
      this.r(x1, y0, x1, y1, c.vestS);
    } else if (view === "back") {
      this.r(x0, y0, x1, y1, col);
      this.r(x1, y0, x1, y1, c.vestS);
    } else {
      this.r(x0 + 1, y0, x1, y1, col);
      this.r(x1, y0, x1, y1, c.vestS);
    }
    if (kind === "epi" || kind === "refletivo") {
      const s1 = y0 + 2;
      const s2 = Math.min(y1 - 1, y0 + 5);
      for (const sy of [s1, s2]) {
        if (view === "front") {
          this.r(x0, sy, 6, sy, "#e9eef2");
          this.r(9, sy, x1, sy, "#e9eef2");
        } else this.r(view === "side" ? x0 + 1 : x0, sy, x1, sy, "#e9eef2");
      }
    } else if (kind === "lider") {
      if (view === "front") {
        this.r(6, y0, 6, y1, "#ffe600");
        this.r(9, y0, 9, y1, "#ffe600");
      } else if (view === "back") {
        this.r(x0 + 2, y0 + 2, x1 - 2, y0 + 2, "#ffe600");
      } else this.r(x0 + 1, y0, x0 + 1, y1, "#ffe600");
    }
  }

  private badgeAndBelt() {
    const { a, c, e, view } = this;
    const y0 = this.torsoTop;
    if (a.badge) {
      if (view === "front") {
        this.p(6, y0, "#3483fa");
        this.p(6, y0 + 1, "#3483fa");
        this.r(5, y0 + 2, 6, y0 + 3, "#ffffff");
        this.p(5, y0 + 2, "#9ab6e0");
      } else {
        this.r(this.cx0 + this.dx, y0 + 2, this.cx0 + this.dx, y0 + 3, "#ffffff");
      }
    }
    if (a.backpack === "pochete" && view === "front") {
      this.r(this.cx0, this.hip - 1, this.cx1, this.hip - 1, c.packS);
      this.r(6, this.hip - 2, 9, this.hip - 1, c.pack);
    }
    if (e.coletor && this.pose.armR !== "scan" && this.pose.armR !== "reach") {
      // coletor no coldre
      const hx = view === "side" ? this.cx1 - 1 + this.dx : this.cx1 - 1;
      this.r(hx, this.hip - 2, hx + 1, this.hip - 1, "#33363d");
      this.p(hx, this.hip - 2, "#5fd3a6");
    }
  }

  // ---------------------------------------------------------------- cabeça e rosto
  private neck() {
    const x = this.view === "side" ? 7 + this.dx : 7;
    this.r(x, this.neckY, x + 1, this.neckY, this.c.skinS);
  }

  private head() {
    const { a, c, view } = this;
    const ht = this.ht;
    const d = view === "side" ? this.dx : 0;
    this.r(4 + d, ht, 11 + d, ht + 9, c.skin);
    const clearPx = (x: number, y: number) => {
      const X = this.ox + x + d;
      const Y = this.oy + ht + y;
      if (X < 0 || Y < 0 || X >= this.buf.w || Y >= this.buf.h) return;
      const i = (Y * this.buf.w + X) * 4;
      this.buf.data[i + 3] = 0;
    };
    clearPx(4, 0);
    clearPx(11, 0);
    if (a.face === "redondo") {
      clearPx(4, 9);
      clearPx(11, 9);
    } else if (a.face === "oval") {
      clearPx(4, 8);
      clearPx(11, 8);
      clearPx(4, 9);
      clearPx(5, 9);
      clearPx(10, 9);
      clearPx(11, 9);
    } else if (a.face === "fino") {
      for (const y of [7, 8, 9]) {
        clearPx(4, y);
        clearPx(11, y);
      }
      clearPx(5, 9);
      clearPx(10, 9);
    }
    // sombra lateral e queixo
    if (view === "side") this.r(10 + d, ht + 2, 11 + d, ht + 8, c.skinS);
    else this.r(11, ht + 1, 11, ht + 7, c.skinS);
    // orelhas
    if (view === "front" || view === "back") {
      this.r(3, ht + 4, 3, ht + 5, c.skinS);
      this.r(12, ht + 4, 12, ht + 5, c.skinS);
    } else {
      this.r(8 + d, ht + 4, 9 + d, ht + 6, c.skinS);
      this.p(8 + d, ht + 5, c.skinD);
    }
  }

  private face() {
    const { a, c, view, pose } = this;
    const ht = this.ht;
    const ey = ht + 5;
    const my = ht + 8;
    if (view === "side") {
      const d = this.dx;
      const ex = 5 + d;
      if (pose.blink) this.p(ex, ey + 1, c.skinD);
      else if (a.eyes === "grandes") {
        this.r(ex - 1, ey, ex, ey + 1, "#ffffff");
        this.r(ex - 1, ey, ex - 1, ey + 1, c.eye);
      } else if (a.eyes === "puxados" || a.eyes === "sonolentos") this.p(ex, ey + 1, c.eye);
      else if (a.eyes === "sorridentes") this.p(ex, ey, c.eye);
      else this.r(ex, ey, ex, ey + 1, c.eye);
      if (a.eyes === "sonolentos") this.p(ex, ey, c.skinD);
      this.p(ex, ey - 1, c.hairS);
      if (a.brows === "grossas") this.p(ex + 1, ey - 1, c.hairS);
      // nariz saltado
      this.p(3 + d, ey + 1, c.skin);
      this.p(3 + d, ey + 2, a.nose === "largo" ? c.skin : c.skinS);
      if (a.nose === "pontudo") this.p(2 + d, ey + 1, c.skinS);
      // boca
      const mc = "#8a3b34";
      if (a.mouth === "sorriso" || a.mouth === "sorrisao") {
        this.p(4 + d, my, mc);
        this.p(5 + d, my - (a.mouth === "sorrisao" ? 0 : 1) + 1, mc);
      } else if (a.mouth === "aberto") this.r(4 + d, my, 5 + d, my, mc);
      else this.p(4 + d, my, shade(c.skin, -0.35));
      this.beardSide();
      return;
    }
    // ---- frente
    if (pose.blink) {
      this.r(5, ey + 1, 6, ey + 1, c.skinD);
      this.r(9, ey + 1, 10, ey + 1, c.skinD);
    } else
      switch (a.eyes) {
        case "grandes":
          this.r(5, ey, 6, ey + 1, "#ffffff");
          this.r(9, ey, 10, ey + 1, "#ffffff");
          this.r(6, ey, 6, ey + 1, c.eye);
          this.r(9, ey, 9, ey + 1, c.eye);
          break;
        case "puxados":
          this.r(5, ey + 1, 6, ey + 1, c.eye);
          this.r(9, ey + 1, 10, ey + 1, c.eye);
          break;
        case "sorridentes":
          this.p(5, ey + 1, c.eye);
          this.p(6, ey, c.eye);
          this.p(9, ey, c.eye);
          this.p(10, ey + 1, c.eye);
          break;
        case "sonolentos":
          this.r(5, ey, 6, ey, c.skinD);
          this.r(5, ey + 1, 6, ey + 1, c.eye);
          this.r(9, ey, 10, ey, c.skinD);
          this.r(9, ey + 1, 10, ey + 1, c.eye);
          break;
        default:
          this.r(6, ey, 6, ey + 1, c.eye);
          this.r(9, ey, 9, ey + 1, c.eye);
          this.p(5, ey, mix(c.skin, "#ffffff", 0.5));
      }
    // sobrancelhas
    const bc = a.brows === "retas" ? mix(c.hairS, c.skin, 0.35) : c.hairS;
    switch (a.brows) {
      case "finas":
        this.p(6, ey - 1, bc);
        this.p(9, ey - 1, bc);
        break;
      case "arqueadas":
        this.p(5, ey - 1, bc);
        this.p(6, ey - 2, bc);
        this.p(9, ey - 2, bc);
        this.p(10, ey - 1, bc);
        break;
      default:
        this.r(5, ey - 1, 6, ey - 1, bc);
        this.r(9, ey - 1, 10, ey - 1, bc);
    }
    // bochechas
    this.p(5, ey + 2, mix(c.skin, "#ff6f6f", 0.22));
    this.p(10, ey + 2, mix(c.skin, "#ff6f6f", 0.22));
    // nariz
    if (a.nose === "medio" || a.nose === "pontudo") this.p(8, ey + 1, c.skinS);
    if (a.nose === "largo") this.r(7, ey + 2, 8, ey + 2, c.skinS);
    else this.p(8, ey + 2, a.nose === "pontudo" ? c.skinD : c.skinS);
    // barba antes da boca
    this.beardFront();
    const mc = "#8a3b34";
    switch (a.mouth) {
      case "sorriso":
        this.p(6, my - 1, mc);
        this.r(7, my, 8, my, mc);
        this.p(9, my - 1, mc);
        break;
      case "aberto":
        this.p(6, my, mc);
        this.r(7, my, 8, my, "#d9605a");
        this.p(9, my, mc);
        break;
      case "sorrisao":
        this.p(5, my - 1, mc);
        this.p(6, my, mc);
        this.r(7, my, 8, my, "#ffffff");
        this.p(9, my, mc);
        this.p(10, my - 1, mc);
        break;
      case "serio":
        this.r(6, my, 9, my, shade(c.skin, -0.35));
        break;
      default:
        this.r(7, my, 8, my, mc);
    }
    this.mustacheFront();
  }

  private beardFront() {
    const { a, c } = this;
    const ht = this.ht;
    const f = c.facial;
    switch (a.beard) {
      case "cavanhaque":
        this.r(6, ht + 9, 9, ht + 9, f);
        this.r(7, ht + 8, 8, ht + 8, f);
        break;
      case "curta":
        this.r(5, ht + 9, 10, ht + 9, f, 210);
        this.r(4, ht + 7, 4, ht + 8, f, 210);
        this.r(11, ht + 7, 11, ht + 8, f, 210);
        break;
      case "cheia":
        this.r(4, ht + 5, 4, ht + 8, f);
        this.r(11, ht + 5, 11, ht + 8, f);
        this.r(4, ht + 8, 11, ht + 9, f);
        this.r(5, ht + 7, 5, ht + 7, f);
        this.r(10, ht + 7, 10, ht + 7, f);
        break;
      case "costeleta":
        this.r(4, ht + 4, 4, ht + 7, f);
        this.r(11, ht + 4, 11, ht + 7, f);
        break;
    }
  }

  private mustacheFront() {
    const { a, c } = this;
    const y = this.ht + 7;
    const f = c.facial;
    if (a.mustache === "fino") this.r(6, y, 9, y, f, 220);
    else if (a.mustache === "grosso") {
      this.r(5, y, 10, y, f);
      this.p(5, y + 1, f);
      this.p(10, y + 1, f);
    } else if (a.mustache === "chevron") {
      this.r(6, y, 9, y, f);
      this.p(7, y - 1, f, 140);
      this.p(8, y - 1, f, 140);
    }
  }

  private beardSide() {
    const { a, c } = this;
    const ht = this.ht;
    const d = this.dx;
    const f = c.facial;
    if (a.beard === "cheia") this.r(4 + d, ht + 7, 9 + d, ht + 9, f);
    else if (a.beard === "curta") this.r(4 + d, ht + 9, 8 + d, ht + 9, f, 210);
    else if (a.beard === "cavanhaque") this.r(4 + d, ht + 9, 5 + d, ht + 9, f);
    else if (a.beard === "costeleta") this.r(7 + d, ht + 4, 7 + d, ht + 7, f);
    if (a.mustache !== "nenhum") this.r(3 + d, ht + 7, 5 + d, ht + 7, f);
  }

  // ---------------------------------------------------------------- cabelo
  private hair() {
    const { a, c, view } = this;
    const s = a.hair;
    if (s === "careca") {
      if (view !== "back") this.p(view === "side" ? 6 + this.dx : 6, this.ht + 1, mix(this.c.skin, "#ffffff", 0.45));
      return;
    }
    const ht = this.ht;
    const H = c.hair;
    const S = c.hairS;
    const L = c.hairH;
    const d = view === "side" ? this.dx : 0;
    const R = (x0: number, y0: number, x1: number, y1: number, col = H, al?: number) => this.r(x0 + d, ht + y0, x1 + d, ht + y1, col, al);
    const P = (x: number, y: number, col = H) => this.p(x + d, ht + y, col);
    if (s === "raspado") {
      const st = mix(H, this.c.skin, 0.45);
      if (view === "back") R(4, -1, 11, 6, st);
      else if (view === "side") {
        R(5, -1, 10, 0, st);
        R(4, 0, 11, 1, st);
        R(9, 2, 11, 6, st);
      } else {
        R(5, -1, 10, -1, st);
        R(4, 0, 11, 1, st);
        R(4, 2, 4, 3, st);
        R(11, 2, 11, 3, st);
      }
      return;
    }
    if (s === "black_power") {
      const rows: [number, number, number][] = [[-4, 5, 10], [-3, 3, 12], [-2, 2, 13], [-1, 2, 13], [0, 2, 13], [1, 2, 13]];
      for (const [y, x0, x1] of rows) R(x0, y, x1, y);
      if (view === "front") {
        R(2, 2, 4, 5);
        R(11, 2, 13, 5);
        R(2, 6, 3, 6);
        R(12, 6, 13, 6);
      } else if (view === "back") R(2, 2, 13, 7);
      else {
        R(7, 2, 13, 7);
        R(3, 2, 4, 2);
      }
      for (let y = -3; y <= 5; y += 2) for (let x = 3; x <= 12; x += 3) P(x + ((y + 3) % 4 === 0 ? 1 : 0), y, S);
      P(5, -3, L);
      P(6, -3, L);
      return;
    }
    // base (capa)
    const capTop = s === "topete" ? -1 : -1;
    R(5, capTop, 10, capTop);
    R(4, 0, 11, 1);
    if (view === "back") {
      const bottom = s === "longo" ? 14 : s === "chanel" ? 8 : s === "dreads" ? 12 : s === "trancas" ? 7 : s === "cacheado" ? 8 : 7;
      R(4, 2, 11, Math.min(bottom, 8));
      if (bottom > 8) R(4, 9, 11, bottom);
      if (s === "rabo_cavalo") {
        R(7, 8, 8, 14);
        R(7, 7, 8, 7, "#e5533d");
      }
      if (s === "trancas") {
        R(5, 8, 6, 13);
        R(9, 8, 10, 13);
        for (let y = 8; y <= 13; y += 2) {
          R(5, y, 6, y, S);
          R(9, y, 10, y, S);
        }
      }
      if (s === "coque") R(6, -4, 9, -2);
      if (s === "moicano") {
        R(4, 0, 11, 7, mix(H, this.c.skin, 0.5));
        R(7, -3, 8, 7);
      }
      if (s === "dreads") for (let x = 4; x <= 11; x += 2) R(x, 9, x, 12, S);
      R(6, 0, 7, 0, L);
      for (let x = 5; x <= 10; x += 2) P(x, 4, S);
      return;
    }
    if (view === "side") {
      R(8, 2, 11, s === "longo" ? 14 : s === "chanel" ? 8 : 6);
      R(4, 2, 5, 2);
      P(7, 2);
      P(7, 3);
      switch (s) {
        case "topete":
          R(4, -3, 9, -2);
          R(3, -2, 4, 0);
          P(5, -3, L);
          break;
        case "moicano":
          R(4, 0, 11, 1, mix(H, this.c.skin, 0.5));
          R(8, 2, 11, 6, mix(H, this.c.skin, 0.5));
          R(5, -3, 10, -1);
          break;
        case "cacheado":
          R(3, -2, 11, -1);
          R(9, 2, 12, 8);
          for (let y = -2; y <= 8; y += 2) P(12, y, S);
          break;
        case "rabo_cavalo":
          R(11, 3, 12, 10);
          P(11, 3, "#e5533d");
          break;
        case "coque":
          R(8, -3, 10, -1);
          break;
        case "trancas":
          R(10, 6, 11, 13);
          for (let y = 6; y <= 13; y += 2) R(10, y, 11, y, S);
          break;
        case "chanel":
          R(3, 2, 5, 3);
          break;
        case "franja":
          R(3, 2, 6, 3);
          break;
        case "dreads":
          for (let y = 2; y <= 12; y++) {
            P(9, y, (y % 3) ? H : S);
            P(11, y, (y % 3) ? S : H);
          }
          break;
        case "longo":
          R(9, 9, 11, 14);
          R(9, 14, 10, 14, S);
          break;
      }
      R(6, -1, 7, -1, L);
      return;
    }
    // ---- frente
    switch (s) {
      case "curto":
        P(5, 2);
        P(6, 2);
        P(8, 2);
        P(9, 2);
        P(10, 2);
        R(4, 2, 4, 4);
        R(11, 2, 11, 4);
        break;
      case "topete":
        R(6, -3, 10, -2);
        R(7, -4, 10, -4);
        P(6, -4, L);
        R(4, 2, 4, 3);
        R(11, 2, 11, 3);
        P(9, 2);
        P(10, 2);
        break;
      case "social":
        R(4, 2, 7, 2);
        R(4, 3, 4, 4);
        R(11, 2, 11, 4);
        P(6, -1, L);
        P(6, 0, L);
        break;
      case "moicano":
        R(4, 0, 11, 1, mix(H, this.c.skin, 0.5));
        R(7, -3, 8, 2);
        P(7, -3, L);
        break;
      case "cacheado":
        R(3, -2, 12, -1);
        R(3, 0, 12, 1);
        R(3, 2, 4, 7);
        R(11, 2, 12, 7);
        P(5, 2);
        P(7, 2);
        P(9, 2);
        for (const [x, y] of [[3, -1], [5, -2], [8, -2], [11, -1], [3, 3], [12, 4], [3, 6], [12, 7]] as [number, number][]) P(x, y, S);
        P(6, -2, L);
        P(9, -1, L);
        break;
      case "longo":
        R(5, 2, 7, 2);
        R(3, 2, 4, 14);
        R(11, 2, 12, 14);
        R(3, 12, 3, 14, S);
        R(12, 12, 12, 14, S);
        break;
      case "rabo_cavalo":
        R(4, 2, 4, 3);
        R(11, 2, 11, 3);
        R(5, 2, 6, 2);
        break;
      case "coque":
        R(6, -4, 9, -2);
        P(7, -4, L);
        R(4, 2, 4, 3);
        R(11, 2, 11, 3);
        break;
      case "trancas":
        R(4, 2, 4, 3);
        R(11, 2, 11, 3);
        R(3, 4, 4, 13);
        R(11, 4, 12, 13);
        for (let y = 5; y <= 13; y += 2) {
          R(3, y, 4, y, S);
          R(11, y, 12, y, S);
        }
        R(5, 2, 10, 2);
        break;
      case "chanel":
        R(5, 2, 10, 3);
        R(3, 2, 4, 8);
        R(11, 2, 12, 8);
        R(3, 8, 4, 8, S);
        R(11, 8, 12, 8, S);
        break;
      case "franja":
        R(4, 2, 11, 3);
        R(4, 4, 4, 6);
        R(11, 4, 11, 6);
        for (let x = 5; x <= 10; x += 2) P(x, 3, S);
        break;
      case "dreads":
        R(5, 2, 10, 2);
        for (const x of [3, 4, 11, 12]) for (let y = 2; y <= 12; y++) if ((y + x) % 4 !== 0) P(x, y, (y + x) % 3 ? H : S);
        break;
    }
    R(6, 0, 7, 0, L);
    P(9, -1, L);
  }

  private hat() {
    const { a, c, view } = this;
    if (a.hat === "nenhum") return;
    const ht = this.ht;
    const d = view === "side" ? this.dx : 0;
    const R = (x0: number, y0: number, x1: number, y1: number, col = c.hat) => this.r(x0 + d, ht + y0, x1 + d, ht + y1, col);
    switch (a.hat) {
      case "bone":
      case "bone_aba_reta":
        R(5, -2, 10, -2);
        R(4, -1, 11, 2);
        R(4, 2, 11, 2, c.hatS);
        if (view === "front") {
          if (a.hat === "bone") R(3, 3, 12, 3, c.hatS);
          else R(2, 3, 13, 3, shade(c.hat, -0.4));
          this.p(7, ht - 1, shade(c.hat, 0.35));
        } else if (view === "side") {
          R(a.hat === "bone" ? 1 : 0, 2, 4, 3, c.hatS);
        } else R(6, 2, 9, 2, "#f4f4f4");
        this.p(7 + d, ht - 2, shade(c.hat, 0.3));
        break;
      case "touca":
        R(5, -3, 10, -3);
        R(4, -2, 11, 2);
        R(4, 2, 11, 3, c.hatS);
        for (let x = 5; x <= 10; x += 2) this.p(x + d, ht, c.hatS);
        break;
      case "capacete":
        R(6, -4, 9, -4);
        R(5, -3, 10, -3);
        R(4, -2, 11, 1);
        R(view === "side" ? 2 : 3, 2, 12, 2, c.hatS);
        R(7, -3, 8, 1, shade(c.hat, 0.25));
        break;
      case "bandana":
        R(4, 1, 11, 2);
        for (let x = 5; x <= 10; x += 2) this.p(x + d, ht + 1, "#ffffff");
        if (view === "front") {
          this.p(12, ht + 2, c.hat);
          this.p(13, ht + 3, c.hat);
        } else if (view === "side") {
          this.p(12 + d, ht + 2, c.hat);
          this.p(12 + d, ht + 3, c.hatS);
        } else {
          this.p(7, ht + 3, c.hat);
          this.p(8, ht + 4, c.hatS);
        }
        break;
    }
  }

  private glasses() {
    const { a, view } = this;
    if (a.glasses === "nenhum") return;
    const ey = this.ht + 5;
    const fr = "#22222a";
    if (view === "side") {
      const d = this.dx;
      this.r(4 + d, ey, 5 + d, ey + 1, a.glasses === "escuro" ? "#1d1d26" : "#bfe3ff", a.glasses === "escuro" ? 240 : 120);
      this.r(6 + d, ey, 8 + d, ey, fr);
      return;
    }
    if (a.glasses === "seguranca") {
      this.r(4, ey, 11, ey + 1, "#d8f0ff", 110);
      this.r(4, ey - 1, 11, ey - 1, "#e8a33a");
      return;
    }
    const lens = a.glasses === "escuro" ? "#1d1d26" : "#bfe3ff";
    const al = a.glasses === "escuro" ? 245 : 110;
    this.r(5, ey, 6, ey + 1, lens, al);
    this.r(9, ey, 10, ey + 1, lens, al);
    this.r(4, ey, 4, ey + 1, fr);
    this.r(11, ey, 11, ey + 1, fr);
    this.r(7, ey, 8, ey, fr);
    if (a.glasses === "quadrado" || a.glasses === "escuro") {
      this.r(5, ey - 1, 6, ey - 1, fr);
      this.r(9, ey - 1, 10, ey - 1, fr);
      this.r(5, ey + 2, 6, ey + 2, fr, 160);
      this.r(9, ey + 2, 10, ey + 2, fr, 160);
    } else {
      this.r(5, ey + 2, 6, ey + 2, fr, 150);
      this.r(9, ey + 2, 10, ey + 2, fr, 150);
    }
  }

  private accessory() {
    const { a, view } = this;
    const ht = this.ht;
    const d = view === "side" ? this.dx : 0;
    switch (a.accessory) {
      case "brincos":
        if (view === "side") this.p(8 + d, ht + 7, "#f2c94c");
        else {
          this.p(3, ht + 6, "#f2c94c");
          this.p(12, ht + 6, "#f2c94c");
        }
        break;
      case "fone":
        if (view === "side") {
          this.r(7 + d, ht - 1, 9 + d, ht - 1, "#2b2b2b");
          this.r(8 + d, ht + 3, 9 + d, ht + 6, "#2b2b2b");
          this.p(8 + d, ht + 4, "#e5533d");
        } else {
          this.p(4, ht - 1, "#2b2b2b");
          this.r(5, ht - 2, 10, ht - 2, "#2b2b2b");
          this.p(11, ht - 1, "#2b2b2b");
          this.r(2, ht + 3, 3, ht + 6, "#2b2b2b");
          this.r(12, ht + 3, 13, ht + 6, "#2b2b2b");
          this.p(2, ht + 4, "#e5533d");
          this.p(13, ht + 4, "#e5533d");
        }
        break;
      case "colar":
        if (view === "front") for (let x = 6; x <= 9; x++) this.p(x, this.torsoTop + (x === 6 || x === 9 ? 0 : 1), "#f2c94c");
        break;
    }
  }

  // ---------------------------------------------------------------- braços
  private sleeveRows(): number {
    if (this.e.epiVest === false && this.a.vest === "jaqueta") return 99;
    switch (this.a.top) {
      case "regata": return 0;
      case "moletom":
      case "social": return 99;
      default: return 3;
    }
  }

  private sleeveColor(): string {
    if (this.a.vest === "jaqueta" && !this.e.epiVest) return this.c.vest;
    return this.c.top;
  }

  private arms() {
    if (this.view === "side") return this.armSide();
    const { pose } = this;
    this.armFront(-1, pose.armL, pose.swing);
    this.armFront(1, pose.armR, -pose.swing);
  }

  private armFront(side: -1 | 1, state: Arm, swing: number) {
    const { c } = this;
    const back = this.view === "back";
    const y0 = this.torsoTop;
    const x0 = side < 0 ? this.cx0 - 2 : this.cx1 + 1;
    const sr = this.sleeveRows();
    const sc = this.sleeveColor();
    const col = (i: number) => (i < sr ? sc : c.skin);
    const colS = (i: number) => (i < sr ? shade(sc, -0.18) : c.skinS);
    const inward = side < 0 ? 1 : -1;
    switch (state) {
      case "down": {
        const len = this.torsoLen + 1 - Math.abs(swing);
        for (let i = 0; i < len; i++) {
          this.p(x0, y0 + i, side < 0 ? col(i) : colS(i));
          this.p(x0 + 1, y0 + i, side < 0 ? colS(i) : col(i));
        }
        if (this.a.accessory === "relogio" && side < 0) this.r(x0, y0 + len - 2, x0 + 1, y0 + len - 2, "#2b2b2b");
        break;
      }
      case "carry":
      case "work": {
        const fy = y0 + 3 + (state === "work" && (this.pose.phase === (side < 0 ? 0 : 1)) ? 1 : 0);
        for (let i = 0; i < 3; i++) this.r(x0, y0 + i, x0 + 1, y0 + i, col(i));
        for (let k = 0; k < 4; k++) this.r(x0 + inward * k, fy, x0 + 1 + inward * k, fy, k < 1 ? col(3) : c.skin);
        if (!back) this.r(x0 + inward * 3, fy, x0 + 1 + inward * 3, fy + (state === "carry" ? 0 : 1), c.skinS);
        break;
      }
      case "push": {
        for (let i = 0; i < 2; i++) this.r(x0, y0 + i, x0 + 1, y0 + i, col(i));
        this.r(x0 + inward, y0 + 2, x0 + 1 + inward, y0 + 3, back ? col(2) : c.skin);
        break;
      }
      case "up": {
        const top = this.ht + 1;
        const ox = x0 - inward;
        for (let y = y0; y >= top; y--) this.r(ox, y, ox + 1, y, y0 - y < sr ? sc : c.skin);
        this.r(ox, top - 1, ox + 1, top, c.skin);
        break;
      }
      case "scan":
      case "reach": {
        if (state === "reach") {
          for (let i = 0; i < this.torsoLen + 2; i++) this.r(x0 + (i > 3 ? -inward : 0), y0 + i, x0 + 1 + (i > 3 ? -inward : 0), y0 + i, col(i));
          break;
        }
        for (let i = 0; i < 3; i++) this.r(x0, y0 + i, x0 + 1, y0 + i, col(i));
        for (let k = 0; k < 3; k++) this.r(x0 + inward * k, y0 + 3, x0 + 1 + inward * k, y0 + 3, c.skin);
        if (!back) {
          const dx = x0 + inward * 3;
          this.r(Math.min(dx, dx + inward * 2), y0 + 1, Math.max(dx, dx + inward * 2), y0 + 3, "#33363d");
          this.p(dx + inward, y0 + 1, this.pose.screen ? "#5fffb0" : "#3fae8a");
          this.p(dx, y0 + 1, "#e5533d");
        }
        break;
      }
    }
  }

  private armSide() {
    const { c, pose } = this;
    const state = pose.armR !== "down" ? pose.armR : pose.armL;
    const y0 = this.torsoTop;
    const ax = 7 + this.dx;
    const sr = this.sleeveRows();
    const sc = this.sleeveColor();
    const col = (i: number) => (i < sr ? sc : c.skin);
    switch (state) {
      case "down": {
        const sw = pose.swing;
        for (let i = 0; i <= this.torsoLen; i++) {
          const o = i > 3 ? sw : 0;
          this.r(ax + o, y0 + i, ax + 1 + o, y0 + i, col(i));
        }
        this.p(ax + 1 + (sw > 0 ? sw : 0), y0 + this.torsoLen, c.skinS);
        break;
      }
      case "carry":
      case "work": {
        const fy = y0 + 3 + (state === "work" && pose.phase ? 1 : 0);
        for (let i = 0; i < 3; i++) this.r(ax, y0 + i, ax + 1, y0 + i, col(i));
        this.r(ax - 4, fy, ax + 1, fy, c.skin);
        if (sr > 3) this.r(ax - 1, fy, ax + 1, fy, sc);
        this.p(ax - 5, fy, c.skinS);
        break;
      }
      case "push": {
        this.r(ax, y0, ax + 1, y0 + 1, col(0));
        this.r(ax - 5, y0 + 2, ax + 1, y0 + 3, c.skin);
        if (sr > 2) this.r(ax - 2, y0 + 2, ax + 1, y0 + 3, sc);
        this.r(ax - 6, y0 + 2, ax - 6, y0 + 3, c.skinS);
        break;
      }
      case "up": {
        for (let y = y0 + 1; y >= this.ht - 2; y--) this.r(ax, y, ax + 1, y, y0 - y < sr ? sc : c.skin);
        break;
      }
      case "scan":
      case "reach": {
        for (let i = 0; i < 3; i++) this.r(ax, y0 + i, ax + 1, y0 + i, col(i));
        const fy = y0 + 3 + (state === "reach" ? 1 : 0);
        this.r(ax - 3, fy, ax + 1, fy, c.skin);
        if (state === "scan") {
          this.r(ax - 6, y0 + 1, ax - 4, y0 + 3, "#33363d");
          this.p(ax - 5, y0 + 1, pose.screen ? "#5fffb0" : "#3fae8a");
        } else this.p(ax - 4, fy, c.skinS);
        break;
      }
    }
  }

  // ---------------------------------------------------------------- mochila
  private backPackBack() {
    const { a, c } = this;
    if (a.backpack === "nenhuma") return;
    const y0 = this.torsoTop;
    if (a.backpack === "pochete") {
      this.r(this.cx0, this.hip - 1, this.cx1, this.hip - 1, c.packS);
      return;
    }
    this.r(5, y0 + 1, 10, Math.min(this.hip, y0 + 6), c.pack);
    this.r(5, y0 + 1, 10, y0 + 1, shade(c.pack, 0.2));
    this.r(6, y0 + 4, 9, y0 + 5, c.packS);
    this.r(10, y0 + 1, 10, Math.min(this.hip, y0 + 6), c.packS);
  }

  private backPackSide(behind: boolean) {
    const { a, c } = this;
    if (!behind || a.backpack !== "mochila") return;
    const y0 = this.torsoTop;
    this.r(this.cx1 + this.dx, y0 + 1, this.cx1 + 2 + this.dx, y0 + 6, c.pack);
    this.r(this.cx1 + 2 + this.dx, y0 + 1, this.cx1 + 2 + this.dx, y0 + 6, c.packS);
  }

  private packStrapsFront() {
    const { a, c } = this;
    if (a.backpack !== "mochila") return;
    const y0 = this.torsoTop;
    this.r(this.cx0 + 1, y0, this.cx0 + 1, y0 + 4, c.packS);
    this.r(this.cx1 - 1, y0, this.cx1 - 1, y0 + 4, c.packS);
  }
}

function viewOf(dir: string): View {
  return dir === "down" ? "front" : dir === "up" ? "back" : "side";
}

/** Desenha um quadro no buffer (ox, oy = canto superior esquerdo do quadro). */
export function drawFrame(buf: PixelBuffer, ox: number, oy: number, look: Appearance, equip: Equipment, dir: string, anim: AnimName, f: number) {
  const pose = poseFor(anim, f);
  if (anim === "idle" && f === 1 && look.eyes !== "sorridentes") pose.blink = false;
  const view = viewOf(dir);
  const painter = new Painter(buf, ox, oy, look, equip, view, pose, palette(look, equip));
  painter.draw();
  buf.outline(ox, oy, FW, FH);
}

/** Spritesheet completo: 4 linhas (down, up, left, right) x COLS quadros. */
export function renderSheet(look: Appearance, equip: Equipment): PixelBuffer {
  const buf = new PixelBuffer(FW * COLS, FH * 4);
  DIRS.forEach((dir, row) => {
    if (dir === "right") return;
    for (const anim of ANIM_ORDER) {
      for (let f = 0; f < ANIM_FRAMES[anim]; f++) drawFrame(buf, (ANIM_START[anim] + f) * FW, row * FH, look, equip, dir, anim, f);
    }
  });
  // direita = espelho da esquerda
  for (let col = 0; col < COLS; col++) buf.copyFlipped(col * FW, 2 * FH, FW, FH, col * FW, 3 * FH);
  return buf;
}

/** Retrato (quadro parado de frente) para UI. */
export function renderPortrait(look: Appearance, equip: Equipment, dir = "down", anim: AnimName = "idle", f = 0): PixelBuffer {
  if (dir === "right") {
    const tmp = new PixelBuffer(FW * 2, FH);
    drawFrame(tmp, 0, 0, look, equip, "left", anim, f);
    tmp.copyFlipped(0, 0, FW, FH, FW, 0);
    const out = new PixelBuffer(FW, FH);
    for (let y = 0; y < FH; y++)
      for (let x = 0; x < FW; x++) {
        const si = (y * tmp.w + FW + x) * 4;
        const di = (y * FW + x) * 4;
        for (let k = 0; k < 4; k++) out.data[di + k] = tmp.data[si + k];
      }
    return out;
  }
  const buf = new PixelBuffer(FW, FH);
  drawFrame(buf, 0, 0, look, equip, dir, anim, f);
  return buf;
}

export function frameIndex(dir: string, anim: AnimName, f: number): number {
  const row = DIRS.indexOf(dir as (typeof DIRS)[number]);
  return row * COLS + ANIM_START[anim] + (f % ANIM_FRAMES[anim]);
}
