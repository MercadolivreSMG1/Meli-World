/** Casa própria, decoração e inimigos da Zona de Extravio. */
import type { EnemyKind } from "../map/expansion";

export const HOUSE_TIERS = [
  { tier: 1, name: "Kitnet", price: 220, minLevel: 3, desc: "Começo de vida: cama para descansar e ponto de retorno." },
  { tier: 2, name: "Casa", price: 750, minLevel: 6, desc: "Mais espaço, varanda e cara de lar." },
  { tier: 3, name: "Sobrado", price: 1700, minLevel: 10, desc: "Dois andares. Vizinhança toda vai saber." },
];

export const DECORS: Record<string, { name: string; w: number; h: number }> = {
  arvore: { name: "Árvore em vaso", w: 1, h: 1 },
  canteiro: { name: "Canteiro de flores", w: 1, h: 1 },
  banco: { name: "Banco de jardim", w: 2, h: 1 },
  poste: { name: "Poste de luz", w: 1, h: 1 },
  caixa_correio: { name: "Caixa de correio", w: 1, h: 1 },
  churrasqueira: { name: "Churrasqueira", w: 1, h: 1 },
  piscina: { name: "Piscina", w: 2, h: 2 },
  estatua_van: { name: "Estátua da Van", w: 1, h: 1 },
  cerca_viva: { name: "Cerca viva", w: 1, h: 1 },
  rede: { name: "Rede de descanso", w: 2, h: 1 },
  horta: { name: "Horta", w: 2, h: 1 },
  trofeu: { name: "Troféu da Pontualidade", w: 1, h: 1 },
};

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  hp: number;
  dmg: number;
  speed: number; // px/s
  aggro: number; // px
  xp: number;
  coins: [number, number];
  drops: [string, number][]; // [itemId, chance]
  size: number; // px (sprite)
  boss?: boolean;
  lore: string;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  rato: {
    kind: "rato", name: "Rato do Estoque", hp: 12, dmg: 4, speed: 56, aggro: 80, xp: 6, coins: [2, 5], size: 12,
    drops: [["rabo_rato", 0.5], ["pacote_extraviado", 0.12]], lore: "Rói as fitas e espalha pacotes pela floresta.",
  },
  caixa_mimica: {
    kind: "caixa_mimica", name: "Caixa Mímica", hp: 26, dmg: 7, speed: 38, aggro: 70, xp: 12, coins: [5, 10], size: 16,
    drops: [["pacote_extraviado", 0.45]], lore: "Parece um pacote extraviado… até abrir a boca.",
  },
  bug: {
    kind: "bug", name: "Bug do Sistema", hp: 18, dmg: 6, speed: 64, aggro: 95, xp: 10, coins: [4, 8], size: 14,
    drops: [["chip_bugado", 0.55]], lore: "Um glitch que escapou do Logistics. Teleporta quando apanha.",
  },
  fraudador: {
    kind: "fraudador", name: "Fraudador", hp: 48, dmg: 11, speed: 50, aggro: 110, xp: 26, coins: [15, 30], size: 16,
    drops: [["cartao_clonado", 0.6], ["pacote_extraviado", 0.5], ["energetico", 0.15]], lore: "Desvia encomendas e clona cartões. Prevenção de Perdas está atrás dele.",
  },
  atraso: {
    kind: "atraso", name: "O Grande Atraso", hp: 520, dmg: 18, speed: 36, aggro: 150, xp: 350, coins: [250, 320], size: 40, boss: true,
    drops: [["lamina_onda_verde", 1], ["decor_trofeu", 1], ["kit_socorros", 1]],
    lore: "Um relógio gigante feito de rotas atrasadas. Invoca Ratos do Estoque para atrapalhar a expedição.",
  },
};

export const PLAYER_MAX_HP = 100;
export const PUNCH = { dmg: 2, range: 16, cd: 0.5 };
