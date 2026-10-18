/**
 * Expansão do mundo ao redor do SVC SMG1:
 *  - Avenida Mercado Pago (x 112..118) ligando tudo
 *  - Centro Logístico (leste): praça, lojas, Balcão de Anúncios, Mercado Pago, FBM, imobiliária
 *  - Bairro Residencial Vila Logística (sudoeste): 24 lotes para comprar e construir a casa própria
 *  - Zona de Extravio (sudeste): floresta, lago, ruínas e o Galpão Abandonado — inimigos e chefe
 */
import type { Rng } from "../rng";
import type { PropInstance } from "./props";
import { T } from "./tiles";

export interface Plot {
  id: string;
  x: number; // tile canto superior esquerdo (10x10)
  y: number;
  price: number;
  minLevel: number;
  row: number;
}

export type EnemyKind = "rato" | "caixa_mimica" | "bug" | "fraudador" | "atraso";

export interface SpawnZone {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kinds: EnemyKind[];
  max: number;
}

export interface ExpansionApi {
  W: number;
  H: number;
  rng: Rng;
  set(x: number, y: number, t: T): void;
  get(x: number, y: number): number;
  fill(x0: number, y0: number, x1: number, y1: number, t: T): void;
  prop(kind: string, x: number, y: number, extra?: Partial<PropInstance>): PropInstance;
  building(x0: number, y0: number, x1: number, y1: number, floor: T): void;
  door(x: number, y0: number, y1: number, w?: number): void;
}

export interface ExpansionResult {
  zones: { id: string; name: string; x: number; y: number; w: number; h: number }[];
  points: Record<string, [number, number]>;
  plots: Plot[];
  spawnZones: SpawnZone[];
  bossSpawn: [number, number];
}

export const PLOT_SIZE = 10;
/** Área da casa dentro do lote (relativa): sólida quando construída. */
export const HOUSE_FOOT = { dx: 2, dy: 1, w: 6, h: 4 };

export function buildExpansion(a: ExpansionApi): ExpansionResult {
  const { W, H, rng, set, get, fill, prop, building, door } = a;
  const reserved = new Uint8Array(W * H);
  const reserve = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) reserved[y * W + x] = 1;
  };
  const free = (x: number, y: number, w = 1, h = 1) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (xx < 0 || yy < 0 || xx >= W || yy >= H || reserved[yy * W + xx]) return false;
    return true;
  };

  // ================================================================ Avenida Mercado Pago
  fill(112, 0, 112, H - 1, T.SIDEWALK);
  fill(118, 0, 118, H - 1, T.SIDEWALK);
  fill(113, 0, 117, H - 1, T.ASPHALT);
  for (let y = 0; y < H; y += 3) if (y < 73 || y > 81) set(115, y, T.ASPHALT_DASH_V);
  reserve(112, 0, 118, H - 1);
  // rua do bairro (sul)
  fill(0, 119, 111, 119, T.SIDEWALK);
  fill(0, 120, 112, 126, T.ASPHALT);
  for (let x = 0; x < 112; x += 3) set(x, 123, T.ASPHALT_DASH);
  fill(0, 127, 111, 127, T.SIDEWALK);
  reserve(0, 119, 118, 127);
  reserve(0, 72, W - 1, 82); // rua principal

  // ================================================================ Centro Logístico (leste)
  // FBM (fachada)
  building(122, 4, 150, 26, T.CONCRETE);
  for (const x of [126, 132, 138, 144]) fill(x, 26, x + 2, 26, T.DOCK_DOOR);
  fill(122, 27, 150, 34, T.ASPHALT);
  for (let x = 124; x <= 148; x += 4) fill(x, 28, x, 31, T.PARKING_LINE);
  prop("big_sign", 134, 35, { label: "FULFILLMENT (FBM) · em breve" });
  prop("pallet_boxes", 124, 31);
  prop("pallet_boxes", 146, 31);
  reserve(121, 3, 151, 37);
  // Praça
  fill(150, 30, 192, 56, T.PLAZA);
  fill(119, 42, 149, 43, T.STONE_PATH); // caminho da avenida até a praça
  fill(193, 42, 231, 43, T.STONE_PATH);
  fill(170, 57, 171, 72, T.STONE_PATH);
  reserve(119, 42, 231, 43);
  reserve(170, 57, 171, 72);
  prop("fountain", 169, 41);
  for (const [x, y] of [[160, 38], [178, 38], [160, 47], [178, 47]] as [number, number][]) prop("bench", x, y);
  for (const [x, y] of [[152, 33], [190, 33], [152, 54], [190, 54]] as [number, number][]) prop("lamp", x, y);
  for (const [x, y] of [[155, 50], [185, 50], [164, 53], [176, 53]] as [number, number][]) prop("flowers", x, y, { variant: x % 4 });
  for (const [x, y] of [[166, 39], [173, 39], [166, 44], [173, 44]] as [number, number][]) prop("flowers", x, y, { variant: (x + y) % 4 });
  for (const [x, y] of [[156, 43], [183, 43]] as [number, number][]) prop("tree", x, y, { variant: 1 });
  for (const [x, y] of [[158, 52], [181, 52]] as [number, number][]) prop("bench", x, y);
  prop("tree", 151, 50, { variant: 0 });
  prop("tree", 189, 50, { variant: 2 });
  // Lojas (barracas)
  prop("stall", 153, 30, { data: "equip", label: "ARSENAL DO GALPÃO" });
  prop("stall", 161, 30, { data: "food", label: "LANCHONETE DA ZEFA" });
  prop("stall", 169, 30, { data: "moveis", label: "MÓVEIS DA VILA" });
  prop("stall", 177, 30, { data: "home", label: "CASA & CONSTRUÇÃO" });
  prop("stall", 185, 30, { data: "sell", label: "COMPRA & VENDA" });
  prop("market_board", 168, 50, { label: "BALCÃO DE ANÚNCIOS" });
  reserve(150, 30, 192, 56);
  // Agência Mercado Pago
  building(196, 8, 214, 22, T.TL_FLOOR);
  door(204, 22, 22, 2);
  prop("mp_terminal", 199, 14);
  prop("mp_terminal", 203, 14);
  prop("mp_terminal", 207, 14);
  prop("plant", 211, 12);
  prop("big_sign", 203, 24, { label: "MERCADO PAGO" });
  fill(204, 23, 205, 41, T.STONE_PATH);
  reserve(195, 7, 215, 41);
  // Imobiliária
  building(196, 46, 212, 58, T.WOOD_FLOOR);
  door(203, 46, 48, 2);
  prop("realty_desk", 202, 52);
  prop("plant", 198, 50);
  prop("plant", 210, 50);
  prop("big_sign", 203, 59, { label: "IMOBILIÁRIA LAR LOGÍSTICO" });
  reserve(195, 44, 213, 61);
  // árvores do centro
  for (let i = 0; i < 70; i++) {
    const x = 120 + Math.floor(rng() * 110);
    const y = Math.floor(rng() * 70);
    if (free(x, y, 2, 3)) {
      prop(rng() < 0.35 ? "pine" : "tree", x, y, { variant: Math.floor(rng() * 3) });
      reserve(x - 1, y, x + 2, y + 3);
    }
  }
  for (let i = 0; i < 40; i++) {
    const x = 120 + Math.floor(rng() * 110);
    const y = Math.floor(rng() * 70);
    if (free(x, y)) prop(rng() < 0.6 ? "flowers" : "bush", x, y, { variant: Math.floor(rng() * 4) });
  }

  // ================================================================ Bairro Residencial Vila Logística
  const plots: Plot[] = [];
  const xs = [4, 21, 38, 55, 72, 89];
  const ys = [88, 104, 131, 148];
  ys.forEach((py, row) => {
    xs.forEach((px, col) => {
      const id = `L${row + 1}${String.fromCharCode(65 + col)}`;
      fill(px, py, px + 9, py + 9, T.FENCE);
      fill(px + 1, py + 1, px + 8, py + 8, T.PLOT_GRASS);
      fill(px + 4, py + 9, px + 5, py + 9, T.DIRT); // portão
      fill(px + 4, py + 10, px + 5, py + 10, T.SIDEWALK);
      prop("plot_sign", px + 6, py + 10, { data: id, label: id });
      const price = [300, 380, 480, 600][row] + (col === 0 || col === 5 ? 60 : 0);
      plots.push({ id, x: px, y: py, price, minLevel: row < 2 ? 3 : 5, row });
      reserve(px - 1, py - 1, px + 10, py + 11);
    });
  });
  // calçadas do bairro
  for (const y of [99, 100, 115, 116, 142, 143, 159, 160]) fill(0, y, 111, y, T.SIDEWALK);
  for (const x of [15, 16, 32, 33, 49, 50, 66, 67, 83, 84, 100, 101]) {
    fill(x, 86, x, 118, T.SIDEWALK);
    fill(x, 128, x, 175, T.SIDEWALK);
  }
  fill(0, 82, 111, 85, T.GRASS); // faixa verde entre a rua principal e o bairro
  for (let x = 2; x < 110; x += 9) if (free(x, 82, 2, 3)) prop("tree", x, 82, { variant: x % 3 });
  for (const [x, y] of [[15, 101], [49, 101], [83, 101], [32, 144], [66, 144], [100, 144]] as [number, number][]) prop("lamp", x, y);
  // pracinha do bairro
  fill(4, 162, 50, 174, T.GRASS_FLOWERS);
  prop("pergola", 20, 164);
  prop("bench", 12, 168);
  prop("bench", 30, 168);
  prop("pingpong", 40, 166);
  prop("fountain", 6, 165);
  reserve(0, 162, 52, 175);
  for (let i = 0; i < 30; i++) {
    const x = 54 + Math.floor(rng() * 56);
    const y = 162 + Math.floor(rng() * 12);
    if (free(x, y, 2, 3)) {
      prop("tree", x, y, { variant: Math.floor(rng() * 3) });
      reserve(x - 1, y, x + 2, y + 3);
    }
  }

  // ================================================================ Zona de Extravio (sudeste)
  fill(119, 86, W - 1, H - 1, T.FOREST);
  for (let x = 119; x < W; x++) if (x < 168 || x > 171) set(x, 86, T.FENCE);
  for (let y = 86; y < H; y++) if (y < 150 || y > 152) set(119, y, T.FENCE);
  prop("big_sign", 165, 83, { label: "ZONA DE EXTRAVIO · PERIGO" });
  prop("big_sign", 113 + 0, 146, { label: "ZONA DE EXTRAVIO →" });
  // trilhas
  const path = (x0: number, y0: number, x1: number, y1: number) => {
    let x = x0;
    let y = y0;
    while (x !== x1 || y !== y1) {
      fill(x - 1, y - 1, x + 1, y + 1, T.DIRT);
      reserve(x - 2, y - 2, x + 2, y + 2);
      if (x !== x1 && (y === y1 || rng() < 0.5)) x += Math.sign(x1 - x);
      else y += Math.sign(y1 - y);
    }
  };
  path(170, 87, 170, 132);
  path(170, 110, 200, 118);
  path(170, 120, 142, 120);
  path(170, 132, 197, 156);
  path(121, 151, 170, 132);
  fill(168, 85, 171, 87, T.DIRT);
  // acampamento seguro perto do portão
  fill(172, 90, 178, 95, T.DIRT);
  prop("campfire", 175, 92);
  prop("bench", 173, 94);
  reserve(171, 89, 179, 96);
  // lago
  for (let y = 96; y <= 116; y++)
    for (let x = 190; x <= 222; x++) {
      const dx = (x - 206) / 15;
      const dy = (y - 106) / 9;
      if (dx * dx + dy * dy <= 1) set(x, y, T.WATER);
    }
  reserve(188, 94, 224, 118);
  // ruínas
  fill(130, 110, 152, 128, T.RUIN_FLOOR);
  for (const [x, y] of [[132, 112], [138, 112], [146, 112], [132, 124], [150, 120], [141, 126]] as [number, number][]) prop("ruin_pillar", x, y);
  fill(134, 116, 140, 116, T.WALL_TOP);
  fill(144, 122, 144, 126, T.WALL_TOP);
  prop("crate_stack", 147, 115);
  reserve(129, 109, 153, 129);
  // Galpão Abandonado (masmorra do chefe)
  building(196, 140, 228, 172, T.DUNGEON_FLOOR);
  door(196, 155, 157);
  for (const [x, y] of [[199, 144], [224, 144], [199, 168], [224, 168], [205, 150], [218, 164]] as [number, number][]) prop("crate_stack", x, y);
  for (const [x, y] of [[202, 160], [221, 150], [210, 168], [215, 145]] as [number, number][]) prop("barrel", x, y);
  prop("big_sign", 192, 152, { label: "GALPÃO ABANDONADO" });
  reserve(190, 139, 229, 173);
  // floresta densa
  for (let i = 0; i < 520; i++) {
    const x = 121 + Math.floor(rng() * (W - 123));
    const y = 88 + Math.floor(rng() * (H - 91));
    if (!free(x - 1, y, 4, 4)) continue;
    const r = rng();
    prop(r < 0.45 ? "pine" : r < 0.7 ? "dead_tree" : "tree", x, y, { variant: Math.floor(rng() * 3) });
    reserve(x - 1, y + 1, x + 2, y + 3);
  }
  for (let i = 0; i < 120; i++) {
    const x = 121 + Math.floor(rng() * (W - 123));
    const y = 88 + Math.floor(rng() * (H - 91));
    if (get(x, y) === T.FOREST && free(x, y)) prop(rng() < 0.5 ? "mushroom" : "bush", x, y, { variant: Math.floor(rng() * 4) });
  }

  const spawnZones: SpawnZone[] = [
    { id: "orla", name: "Orla da Zona", x: 150, y: 97, w: 40, h: 10, kinds: ["rato"], max: 6 },
    { id: "floresta", name: "Floresta dos Extraviados", x: 124, y: 132, w: 44, h: 38, kinds: ["rato", "caixa_mimica", "bug"], max: 9 },
    { id: "lago", name: "Margens do Lago", x: 176, y: 118, w: 46, h: 18, kinds: ["bug", "caixa_mimica"], max: 7 },
    { id: "ruinas", name: "Ruínas do Antigo XD", x: 131, y: 111, w: 21, h: 17, kinds: ["fraudador", "bug"], max: 5 },
    { id: "galpao", name: "Galpão Abandonado", x: 199, y: 145, w: 27, h: 25, kinds: ["fraudador", "caixa_mimica"], max: 6 },
  ];

  return {
    zones: [
      { id: "avenida", name: "Avenida Mercado Pago", x: 112, y: 0, w: 7, h: H },
      { id: "fbm", name: "Fulfillment (FBM)", x: 122, y: 4, w: 29, h: 31 },
      { id: "praca", name: "Praça do Centro Logístico", x: 150, y: 30, w: 43, h: 27 },
      { id: "mp", name: "Agência Mercado Pago", x: 196, y: 8, w: 19, h: 15 },
      { id: "imobiliaria", name: "Imobiliária Lar Logístico", x: 196, y: 46, w: 17, h: 13 },
      { id: "centro", name: "Centro Logístico", x: 119, y: 0, w: W - 119, h: 72 },
      { id: "galpao_abandonado", name: "Galpão Abandonado (chefe)", x: 196, y: 140, w: 33, h: 33 },
      { id: "acampamento", name: "Acampamento seguro", x: 171, y: 89, w: 9, h: 8 },
      { id: "ruinas", name: "Ruínas do Antigo XD", x: 129, y: 109, w: 25, h: 21 },
      { id: "lago", name: "Lago dos Pacotes Perdidos", x: 188, y: 94, w: 37, h: 25 },
      { id: "extravio", name: "Zona de Extravio", x: 119, y: 86, w: W - 119, h: H - 86 },
      { id: "pracinha", name: "Pracinha da Vila", x: 0, y: 162, w: 53, h: 14 },
      { id: "bairro", name: "Bairro Vila Logística", x: 0, y: 86, w: 112, h: H - 86 },
    ],
    points: {
      praca: [170, 46], mp: [205, 18], imobiliaria: [204, 55], portao_extravio: [170, 84], acampamento: [175, 94],
      lojas: [165, 35], balcao: [169, 53], bairro: [40, 102], galpao_abandonado: [194, 156], ruinas: [141, 119],
      lago: [200, 120], vendedor_equip: [155, 34], vendedor_food: [163, 34], vendedor_home: [179, 34], vendedor_moveis: [171, 34], casa_indio: [9, 94], vendedor_sell: [187, 34],
      atendente_mp: [205, 17], corretor: [203, 55],
    },
    plots,
    spawnZones,
    bossSpawn: [214, 156],
  };
}
