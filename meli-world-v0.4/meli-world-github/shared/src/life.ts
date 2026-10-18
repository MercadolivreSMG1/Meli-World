/** Casa própria, decoração e inimigos da Zona de Extravio. */
import type { EnemyKind } from "../map/expansion";

export const HOUSE_TIERS = [
  { tier: 1, name: "Kitnet", price: 220, minLevel: 3, desc: "Começo de vida: cama para descansar e ponto de retorno." },
  { tier: 2, name: "Casa", price: 750, minLevel: 6, desc: "Mais espaço, varanda e cara de lar." },
  { tier: 3, name: "Sobrado", price: 1700, minLevel: 10, desc: "Dois andares. Vizinhança toda vai saber." },
];

/** where: "out" = quintal, "in" = dentro de casa, "any" = os dois */
export const DECORS: Record<string, { name: string; w: number; h: number; where: "in" | "out" | "any" }> = {
  // quintal
  arvore: { name: "Árvore em vaso", w: 1, h: 1, where: "any" },
  canteiro: { name: "Canteiro de flores", w: 1, h: 1, where: "out" },
  banco: { name: "Banco de jardim", w: 2, h: 1, where: "out" },
  poste: { name: "Poste de luz", w: 1, h: 1, where: "out" },
  caixa_correio: { name: "Caixa de correio", w: 1, h: 1, where: "out" },
  churrasqueira: { name: "Churrasqueira", w: 1, h: 1, where: "out" },
  piscina: { name: "Piscina", w: 2, h: 2, where: "out" },
  estatua_van: { name: "Estátua da Van", w: 1, h: 1, where: "any" },
  cerca_viva: { name: "Cerca viva", w: 1, h: 1, where: "out" },
  rede: { name: "Rede de descanso", w: 2, h: 1, where: "out" },
  horta: { name: "Horta", w: 2, h: 1, where: "out" },
  trofeu: { name: "Troféu da Pontualidade", w: 1, h: 1, where: "any" },
  balanco: { name: "Balanço", w: 2, h: 1, where: "out" },
  arvore_natal: { name: "Árvore de Natal", w: 1, h: 1, where: "any" },
  varal: { name: "Varal", w: 2, h: 1, where: "out" },
  bicicleta: { name: "Bicicleta", w: 1, h: 1, where: "out" },
  moto_meli: { name: "Moto de entrega", w: 2, h: 1, where: "out" },
  fogueira: { name: "Fogueira", w: 1, h: 1, where: "out" },
  caixa_dagua: { name: "Caixa d'água", w: 1, h: 1, where: "out" },
  placa_meli: { name: "Placa \"Lar Logístico\"", w: 1, h: 1, where: "out" },
  // dentro de casa
  cama: { name: "Cama de solteiro", w: 1, h: 2, where: "in" },
  cama_casal: { name: "Cama de casal", w: 2, h: 2, where: "in" },
  sofa_casa: { name: "Sofá", w: 3, h: 1, where: "in" },
  poltrona: { name: "Poltrona", w: 1, h: 1, where: "in" },
  mesa_centro: { name: "Mesa de centro", w: 2, h: 1, where: "in" },
  mesa_jantar: { name: "Mesa de jantar", w: 2, h: 2, where: "in" },
  cadeira_casa: { name: "Cadeira", w: 1, h: 1, where: "in" },
  tv_casa: { name: "TV de LED", w: 2, h: 1, where: "in" },
  estante: { name: "Estante de livros", w: 2, h: 1, where: "in" },
  tapete: { name: "Tapete", w: 3, h: 2, where: "in" },
  tapete_meli: { name: "Tapete amarelo MELI", w: 2, h: 2, where: "in" },
  geladeira: { name: "Geladeira", w: 1, h: 1, where: "in" },
  fogao: { name: "Fogão", w: 1, h: 1, where: "in" },
  pia: { name: "Pia de cozinha", w: 2, h: 1, where: "in" },
  armario: { name: "Armário", w: 2, h: 1, where: "in" },
  guarda_roupa: { name: "Guarda-roupa", w: 2, h: 1, where: "in" },
  planta_casa: { name: "Costela-de-adão", w: 1, h: 1, where: "in" },
  quadro_meli: { name: "Quadro do SMG1", w: 2, h: 1, where: "in" },
  luminaria: { name: "Luminária de pé", w: 1, h: 1, where: "in" },
  computador_gamer: { name: "Setup gamer", w: 2, h: 1, where: "in" },
  aquario: { name: "Aquário", w: 2, h: 1, where: "in" },
  piano: { name: "Piano", w: 2, h: 1, where: "in" },
  vaso_flores: { name: "Vaso de flores", w: 1, h: 1, where: "in" },
  gato_galpao: { name: "Gatinho do Galpão", w: 1, h: 1, where: "any" },
  cachorro: { name: "Caramelo (vira-lata)", w: 1, h: 1, where: "any" },
  cofre: { name: "Cofre", w: 1, h: 1, where: "in" },
  esteira_mini: { name: "Mini-esteira decorativa", w: 3, h: 1, where: "in" },
  baker_decor: { name: "Baker de colecionador", w: 2, h: 2, where: "in" },
  fliperama: { name: "Fliperama", w: 1, h: 1, where: "in" },
  banheira: { name: "Banheira", w: 2, h: 1, where: "in" },
};

/** Sala interna de cada casa (região isolada no fim do mapa). */
export const INTERIOR = { originX: 4, originY: 180, cellW: 18, cellH: 13, roomW: 16, roomH: 12, cols: 6 };
/** Limite de móveis por nível de casa */
export const INTERIOR_MAX = [0, 18, 32, 50];

/** Itens de chão: podem ficar por baixo de outros móveis. */
export const RUGS = new Set(["tapete", "tapete_meli"]);

/** Valida um móvel na sala interna (mesma regra no cliente). Retorna a mensagem de erro ou "". */
export function interiorSpotError(list: { kind: string; x: number; y: number }[], kind: string, x: number, y: number): string {
  const dd = DECORS[kind];
  if (!dd) return "Item inválido.";
  if (!(x >= 1 && y >= 4 && x + dd.w <= INTERIOR.roomW - 1 && y + dd.h <= INTERIOR.roomH - 2)) return "Fora da área da casa.";
  if (x < 10 && x + dd.w > 6 && y + dd.h > 8) return "Deixe a entrada livre.";
  const rug = RUGS.has(kind);
  for (const o of list) {
    const od = DECORS[o.kind] ?? { w: 1, h: 1 };
    if (rug !== RUGS.has(o.kind)) continue; // tapete não colide com móvel
    if (x < o.x + od.w && x + dd.w > o.x && y < o.y + od.h && y + dd.h > o.y) return "Já tem algo nesse lugar.";
  }
  return "";
}

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
    drops: [["pacote_extraviado", 0.45], ["caixa_misteriosa", 0.12]], lore: "Parece um pacote extraviado… até abrir a boca.",
  },
  bug: {
    kind: "bug", name: "Bug do Sistema", hp: 18, dmg: 6, speed: 64, aggro: 95, xp: 10, coins: [4, 8], size: 14,
    drops: [["chip_bugado", 0.55], ["engrenagem_sorter", 0.2]], lore: "Um glitch que escapou do Logistics. Teleporta quando apanha.",
  },
  fraudador: {
    kind: "fraudador", name: "Fraudador", hp: 48, dmg: 11, speed: 50, aggro: 110, xp: 26, coins: [15, 30], size: 16,
    drops: [["cartao_clonado", 0.6], ["pacote_extraviado", 0.5], ["energetico", 0.15], ["etiqueta_dourada", 0.05], ["caixa_misteriosa", 0.15]], lore: "Desvia encomendas e clona cartões. Prevenção de Perdas está atrás dele.",
  },
  atraso: {
    kind: "atraso", name: "O Grande Atraso", hp: 520, dmg: 18, speed: 36, aggro: 150, xp: 350, coins: [250, 320], size: 40, boss: true,
    drops: [["lamina_onda_verde", 1], ["decor_trofeu", 1], ["kit_socorros", 1], ["etiqueta_dourada", 1], ["caixa_misteriosa", 1]],
    lore: "Um relógio gigante feito de rotas atrasadas. Invoca Ratos do Estoque para atrapalhar a expedição.",
  },
};

export const PLAYER_MAX_HP = 100;
export const PUNCH = { dmg: 2, range: 16, cd: 0.5 };
