/**
 * Sistema de aparência em camadas.
 * Cada opção vira uma camada desenhada separadamente (corpo, rosto, cabelo, roupa,
 * calça, calçado, acessórios, equipamentos) => milhares de combinações.
 */
import { Rng, pick, randInt } from "./rng";

export const SKIN_TONES = [
  "#ffe0c8", "#f9d0b0", "#eebb94", "#e0a77e", "#c98d62",
  "#b07548", "#94603a", "#7a4b2c", "#5e3820", "#45291a",
] as const;

export const HAIR_COLORS = [
  "#1c1410", "#3b2416", "#5c3a21", "#8a5a2e", "#b98146", "#e3c27a",
  "#f1e3b5", "#a8a8a8", "#e9e9e9", "#a33a2c", "#d9663a", "#3c5bd6", "#c94fa8", "#3fae7a",
] as const;

export const EYE_COLORS = ["#2b1c12", "#5a3a1e", "#3d7a3a", "#2f6fae", "#7b8a96", "#9a6a2a", "#5b3a8a"] as const;

export const CLOTH_COLORS = [
  "#ffe600", "#2d3277", "#3483fa", "#e8e8e8", "#2b2b2b", "#d94a3a", "#3fa35a", "#f08a24",
  "#7b4fc9", "#e86fa8", "#6b4a2b", "#8fa0b4", "#1f6f6a", "#b8d44a", "#4a5568", "#a3d5ff",
  "#c49a6c", "#7a1f2b", "#f5e6c8", "#00a650",
] as const;

export const HAIR_STYLES = [
  "careca", "raspado", "curto", "topete", "social", "moicano", "black_power", "cacheado",
  "longo", "rabo_cavalo", "coque", "trancas", "chanel", "franja", "dreads",
] as const;

export type HairStyle = (typeof HAIR_STYLES)[number];

export const OPTIONS = {
  face: ["redondo", "oval", "quadrado", "fino"],
  eyes: ["normal", "grandes", "puxados", "sorridentes", "sonolentos"],
  brows: ["finas", "grossas", "arqueadas", "retas"],
  nose: ["pequeno", "medio", "largo", "pontudo"],
  mouth: ["sorriso", "neutro", "aberto", "sorrisao", "serio"],
  hair: HAIR_STYLES,
  beard: ["nenhuma", "cavanhaque", "curta", "cheia", "costeleta"],
  mustache: ["nenhum", "fino", "grosso", "chevron"],
  height: ["baixo", "medio", "alto"],
  body: ["magro", "medio", "forte"],
  top: ["camiseta", "uniforme", "polo", "xadrez", "regata", "moletom", "social"],
  vest: ["nenhum", "refletivo", "lider", "jaqueta"],
  bottom: ["calca", "jeans", "bermuda", "cargo", "saia", "jogger"],
  shoes: ["tenis", "botas", "sapatenis", "chinelo"],
  hat: ["nenhum", "bone", "bone_aba_reta", "touca", "capacete", "bandana"],
  glasses: ["nenhum", "redondo", "quadrado", "escuro", "seguranca"],
  backpack: ["nenhuma", "mochila", "pochete"],
  accessory: ["nenhum", "brincos", "fone", "relogio", "colar"],
} as const;

type Opt<K extends keyof typeof OPTIONS> = (typeof OPTIONS)[K][number];

export interface Appearance {
  skin: number;
  face: Opt<"face">;
  eyes: Opt<"eyes">;
  eyeColor: number;
  brows: Opt<"brows">;
  nose: Opt<"nose">;
  mouth: Opt<"mouth">;
  hair: HairStyle;
  hairColor: number;
  beard: Opt<"beard">;
  mustache: Opt<"mustache">;
  facialColor: number;
  height: Opt<"height">;
  body: Opt<"body">;
  top: Opt<"top">;
  topColor: number;
  vest: Opt<"vest">;
  vestColor: number;
  bottom: Opt<"bottom">;
  bottomColor: number;
  shoes: Opt<"shoes">;
  shoesColor: number;
  hat: Opt<"hat">;
  hatColor: number;
  glasses: Opt<"glasses">;
  badge: boolean;
  backpack: Opt<"backpack">;
  backpackColor: number;
  accessory: Opt<"accessory">;
}

/** Equipamentos (camada 8) — vêm do inventário, não do criador. */
export interface Equipment {
  epiVest: boolean; // colete refletivo (EPI)
  safetyShoes: boolean; // calçado de segurança (EPI)
  coletor: boolean; // handheld
}

export const NO_EQUIP: Equipment = { epiVest: false, safetyShoes: false, coletor: false };

export const LABELS: Record<string, string> = {
  skin: "Tom de pele", face: "Formato do rosto", eyes: "Olhos", eyeColor: "Cor dos olhos",
  brows: "Sobrancelhas", nose: "Nariz", mouth: "Boca", hair: "Cabelo", hairColor: "Cor do cabelo",
  beard: "Barba", mustache: "Bigode", facialColor: "Cor da barba", height: "Altura", body: "Corpo",
  top: "Parte de cima", topColor: "Cor", vest: "Colete/Jaqueta", vestColor: "Cor", bottom: "Parte de baixo",
  bottomColor: "Cor", shoes: "Calçado", shoesColor: "Cor", hat: "Chapéu/Boné", hatColor: "Cor",
  glasses: "Óculos", badge: "Crachá", backpack: "Mochila", backpackColor: "Cor", accessory: "Acessório",
};

export const DEFAULT_APPEARANCE: Appearance = {
  skin: 3, face: "redondo", eyes: "normal", eyeColor: 1, brows: "retas", nose: "pequeno", mouth: "sorriso",
  hair: "curto", hairColor: 1, beard: "nenhuma", mustache: "nenhum", facialColor: 1,
  height: "medio", body: "medio", top: "uniforme", topColor: 0, vest: "nenhum", vestColor: 7,
  bottom: "jeans", bottomColor: 1, shoes: "tenis", shoesColor: 3, hat: "nenhum", hatColor: 1,
  glasses: "nenhum", badge: true, backpack: "nenhuma", backpackColor: 4, accessory: "nenhum",
};

const COLOR_KEYS: Record<string, number> = {
  skin: SKIN_TONES.length, eyeColor: EYE_COLORS.length, hairColor: HAIR_COLORS.length,
  facialColor: HAIR_COLORS.length, topColor: CLOTH_COLORS.length, vestColor: CLOTH_COLORS.length,
  bottomColor: CLOTH_COLORS.length, shoesColor: CLOTH_COLORS.length, hatColor: CLOTH_COLORS.length,
  backpackColor: CLOTH_COLORS.length,
};

export function colorKeyCount(key: string): number {
  return COLOR_KEYS[key] ?? 0;
}

/** Valida/limpa aparência vinda do cliente (o servidor nunca confia no input). */
export function sanitizeAppearance(input: unknown): Appearance {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...DEFAULT_APPEARANCE };
  for (const [k, n] of Object.entries(COLOR_KEYS)) {
    const v = Number(src[k]);
    if (Number.isInteger(v) && v >= 0 && v < n) out[k] = v;
  }
  for (const [k, list] of Object.entries(OPTIONS)) {
    const v = src[k];
    if (typeof v === "string" && (list as readonly string[]).includes(v)) out[k] = v;
  }
  out.badge = typeof src.badge === "boolean" ? src.badge : DEFAULT_APPEARANCE.badge;
  return out as unknown as Appearance;
}

export function randomAppearance(rng: Rng): Appearance {
  const a: Record<string, unknown> = {};
  for (const [k, list] of Object.entries(OPTIONS)) a[k] = pick(rng, list as readonly string[]);
  for (const [k, n] of Object.entries(COLOR_KEYS)) a[k] = randInt(rng, 0, n - 1);
  // deixa mais plausível
  if (rng() < 0.55) a.beard = "nenhuma";
  if (rng() < 0.6) a.mustache = "nenhum";
  if (rng() < 0.55) a.hat = "nenhum";
  if (rng() < 0.6) a.glasses = "nenhum";
  if (rng() < 0.5) a.vest = "nenhum";
  if (rng() < 0.4) a.top = "uniforme";
  if (a.top === "uniforme") a.topColor = 0;
  a.facialColor = a.hairColor;
  a.badge = rng() < 0.8;
  return a as unknown as Appearance;
}

/** Chave estável para cache de spritesheets. */
export function appearanceKey(a: Appearance, e: Equipment = NO_EQUIP): string {
  const parts = Object.keys(DEFAULT_APPEARANCE).map((k) => String((a as unknown as Record<string, unknown>)[k]));
  return parts.join("|") + `#${+e.epiVest}${+e.safetyShoes}${+e.coletor}`;
}
