/**
 * Geração determinística do mapa do Service Center SMG1.
 * Cliente e servidor geram exatamente o mesmo mundo (mesma seed), sem precisar trafegar o mapa.
 *
 *  y 0..12   Jardim norte / área de descanso externa / lago
 *  y 13..37  Prédio administrativo (x 2..29)   |  Galpão principal (x 30..109, y 13..51)
 *  y 37..52  Refeitório + descanso (x 2..29)   |
 *  y 52..71  Estacionamento | Pátio de recebimento (LH) | Portaria | Flash Parking (vans)
 *  y 72      Cerca com portões
 *  y 73..81  Rua
 */
import { MAP_H, MAP_W, SVC_W, TILE, WORLD_H } from "../constants";
import { INTERIOR } from "../data/life";
import { mulberry32 } from "../rng";
import { ISLANDS, ROUTES } from "../data/routes";
import type { Island } from "../types";
import { PROP_DEFS, PropInstance } from "./props";
import { SOLID_TILES, T } from "./tiles";
import { buildExpansion, HOUSE_FOOT, Plot, SpawnZone } from "./expansion";

export interface Zone {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BakerSlot {
  route: string;
  island: Island;
  x: number; // tile
  y: number; // tile (2x2)
}

export interface Dock {
  id: string;
  kind: "receiving" | "expedition";
  x: number; // tile da porta (esquerda)
  w: number;
  parkX: number; // tile onde o veículo estaciona
  parkY: number;
}

export interface WorldMap {
  w: number;
  h: number;
  ground: Uint8Array;
  props: PropInstance[];
  solid: Uint8Array; // 1 = bloqueado
  zones: Zone[];
  bakerSlots: BakerSlot[];
  docks: Dock[];
  belt: { x0: number; x1: number; y: number; passarelas: number[] };
  islandRanges: Record<Island, [number, number]>;
  points: Record<string, [number, number]>; // tiles
  flashSpots: { wave: 1 | 2 | 3; x: number; y: number }[];
  spawn: [number, number]; // px
  plots: Plot[];
  spawnZones: SpawnZone[];
  bossSpawn: [number, number]; // tiles
  /** altura (tiles) da parte externa do mundo — abaixo ficam os interiores das casas */
  worldH: number;
}

let cached: WorldMap | null = null;

export function getWorld(): WorldMap {
  if (!cached) cached = buildWorld();
  return cached;
}

function buildWorld(): WorldMap {
  const W = MAP_W;
  const H = MAP_H;
  const rng = mulberry32(1337);
  const g = new Uint8Array(W * H).fill(T.GRASS);
  const props: PropInstance[] = [];
  let pid = 0;

  const set = (x: number, y: number, t: T) => {
    if (x >= 0 && y >= 0 && x < W && y < H) g[y * W + x] = t;
  };
  const get = (x: number, y: number) => g[y * W + x];
  const fill = (x0: number, y0: number, x1: number, y1: number, t: T) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, t);
  };
  const prop = (kind: string, x: number, y: number, extra: Partial<PropInstance> = {}) => {
    const d = PROP_DEFS[kind];
    const p: PropInstance = { id: `p${pid++}`, kind, x, y, w: d.w, h: d.h, ...extra };
    props.push(p);
    return p;
  };

  /** Prédio com paredes: topo + 2 linhas de fachada (vista de cima estilo Stardew). */
  const building = (x0: number, y0: number, x1: number, y1: number, floor: T) => {
    fill(x0, y0, x1, y1, T.WALL_TOP);
    fill(x0 + 1, y0 + 1, x1 - 1, y0 + 2, T.WALL_FACE);
    for (let x = x0 + 2; x < x1 - 1; x += 4) set(x, y0 + 1, T.WALL_WINDOW);
    fill(x0 + 1, y0 + 3, x1 - 1, y1 - 1, floor);
  };
  const hwall = (x0: number, x1: number, y: number) => {
    fill(x0, y, x1, y, T.WALL_TOP);
    fill(x0, y + 1, x1, y + 1, T.WALL_FACE);
  };
  const vwall = (x: number, y0: number, y1: number) => fill(x, y0, x, y1, T.WALL_TOP);
  const door = (x: number, y0: number, y1: number, w = 1) => fill(x, y0, x + w - 1, y1, T.DOOR);

  // ---------- Grama com variação ----------
  for (let y = 0; y < WORLD_H; y++)
    for (let x = 0; x < W; x++) {
      const r = rng();
      if (r < 0.18) set(x, y, T.GRASS_DARK);
      else if (r < 0.22) set(x, y, T.GRASS_FLOWERS);
    }

  // ---------- Rua ----------
  fill(0, 73, W - 1, 73, T.SIDEWALK);
  fill(0, 74, W - 1, 80, T.ASPHALT);
  for (let x = 0; x < W; x += 3) set(x, 77, T.ASPHALT_DASH);
  fill(0, 81, W - 1, 81, T.SIDEWALK);

  // ---------- Pátios ----------
  fill(2, 54, 27, 70, T.ASPHALT); // estacionamento
  for (let x = 3; x <= 26; x += 3) {
    fill(x, 55, x, 58, T.PARKING_LINE);
    fill(x, 66, x, 69, T.PARKING_LINE);
  }
  fill(12, 71, 15, 72, T.ASPHALT);
  fill(30, 52, 56, 71, T.ASPHALT); // recebimento LH
  fill(40, 72, 45, 72, T.ASPHALT);
  fill(66, 52, 109, 71, T.ASPHALT); // flash parking
  fill(86, 72, 91, 72, T.ASPHALT);
  fill(2, 53, 66, 53, T.SIDEWALK);
  fill(28, 53, 29, 53, T.CROSSWALK);
  for (let x = 30; x <= 56; x++) set(x, 53, x % 2 ? T.CROSSWALK : T.SIDEWALK);
  fill(63, 53, 65, 72, T.SIDEWALK);
  fill(57, 54, 62, 63, T.GRASS);
  fill(14, 52, 15, 53, T.SIDEWALK);

  const flashSpots: WorldMap["flashSpots"] = [];
  const spotDef: [1 | 2 | 3, number][] = [[1, 68], [1, 71], [1, 74], [2, 79], [2, 82], [2, 85], [3, 95], [3, 98], [3, 101]];
  for (const [wave, x] of spotDef) {
    fill(x, 58, x + 1, 61, wave === 1 ? T.WAVE1 : wave === 2 ? T.WAVE2 : T.WAVE3);
    flashSpots.push({ wave, x, y: 58 });
  }

  // ---------- Cerca ----------
  for (let x = 0; x < SVC_W; x++) {
    const gap = (x >= 12 && x <= 15) || (x >= 40 && x <= 45) || (x >= 63 && x <= 65) || (x >= 86 && x <= 91);
    if (!gap) set(x, 72, T.FENCE);
  }

  // ---------- Prédio administrativo ----------
  building(2, 13, 29, 37, T.WOOD_FLOOR);
  fill(3, 16, 11, 23, T.TL_FLOOR); // sala dos TLs
  fill(13, 16, 19, 23, T.CARPET); // TL Sênior
  fill(21, 16, 28, 23, T.CARPET); // Supervisores
  vwall(12, 16, 23);
  vwall(20, 16, 23);
  hwall(3, 28, 24);
  door(7, 24, 25);
  door(16, 24, 25);
  door(24, 24, 25);
  hwall(3, 14, 30);
  vwall(15, 30, 36);
  door(9, 30, 31);
  fill(3, 32, 14, 36, T.CARPET); // treinamento
  door(2, 27, 28); // porta lateral -> jardim
  door(29, 32, 33); // admin -> galpão
  // ---------- Refeitório ----------
  building(2, 37, 29, 52, T.CAFE_TILE);
  door(22, 37, 39);
  door(14, 52, 52, 2);

  // ---------- Galpão ----------
  building(30, 13, 109, 51, T.CONCRETE);
  door(30, 32, 33);
  door(62, 51, 51, 2);
  // corredores (epóxi verde) e faixas
  fill(31, 36, 108, 37, T.EPOXY_GREEN);
  fill(46, 16, 46, 50, T.EPOXY_GREEN);
  fill(54, 26, 100, 26, T.YELLOW_LINE);
  fill(54, 29, 100, 29, T.YELLOW_LINE);
  fill(60, 16, 72, 21, T.BRIEFING);
  fill(62, 40, 106, 45, T.STAGE_ZONE);
  for (let x = 62; x <= 106; x += 4) fill(x, 40, x, 45, T.CONCRETE);

  const docks: Dock[] = [];
  for (const [i, x] of [34, 42, 50].entries()) {
    fill(x, 51, x + 2, 51, T.DOCK_DOOR);
    fill(x, 49, x + 2, 50, T.DOCK_PAD);
    docks.push({ id: `R${i + 1}`, kind: "receiving", x, w: 3, parkX: x, parkY: 52 });
  }
  for (const [i, x] of [68, 74, 80, 86, 92, 98, 104].entries()) {
    fill(x, 51, x + 1, 51, T.DOCK_DOOR);
    fill(x, 49, x + 1, 50, T.DOCK_PAD);
    docks.push({ id: `E${i + 1}`, kind: "expedition", x, w: 2, parkX: x, parkY: 52 });
  }

  // ---------- Portaria ----------
  building(57, 64, 62, 71, T.WOOD_FLOOR);
  door(62, 69, 69);

  // ---------- Jardim norte ----------
  fill(5, 3, 12, 8, T.WATER);
  fill(4, 2, 13, 2, T.GRASS_FLOWERS);
  fill(40, 3, 56, 10, T.STONE_PATH);
  fill(0, 9, 1, 72, T.DIRT); // trilha oeste
  fill(0, 9, 40, 10, T.DIRT);
  fill(56, 9, 111, 10, T.DIRT);
  fill(110, 9, 111, 71, T.DIRT); // trilha leste
  fill(0, 27, 1, 28, T.DIRT);

  // =================== PROPS ===================
  // Jardim
  const treeSpots: [number, number][] = [
    [2, 0], [16, 1], [20, 3], [25, 0], [30, 2], [34, 0], [60, 1], [64, 4], [70, 0], [76, 3], [82, 1], [88, 4],
    [94, 0], [100, 2], [106, 0], [15, 6], [27, 5], [36, 5], [68, 6], [84, 6], [104, 5], [92, 7],
  ];
  for (const [x, y] of treeSpots) prop(rng() < 0.3 ? "pine" : "tree", x, y, { variant: Math.floor(rng() * 3) });
  for (let x = 1; x < SVC_W - 4; x += 5) prop(rng() < 0.5 ? "tree" : "pine", x, 83, { variant: Math.floor(rng() * 3) });
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(rng() * W);
    const y = Math.floor(rng() * 9);
    if (get(x, y) === T.GRASS || get(x, y) === T.GRASS_DARK) prop(rng() < 0.6 ? "flowers" : "bush", x, y, { variant: Math.floor(rng() * 4) });
  }
  prop("pergola", 42, 4);
  prop("bench", 42, 8);
  prop("bench", 50, 8);
  prop("bench", 47, 4);
  prop("pingpong", 52, 4);
  prop("lamp", 40, 3);
  prop("lamp", 56, 3);
  for (const x of [41, 45, 49, 53]) prop("flowers", x, 10, { variant: x % 4 });
  prop("rock", 13, 4);
  prop("rock", 4, 8);
  prop("bench", 6, 9);

  // Admin — sala dos TLs
  prop("desk_pc", 4, 17, { label: "Índio" });
  prop("chair", 5, 18);
  prop("desk_pc", 7, 17, { label: "Letícia" });
  prop("chair", 8, 18);
  prop("desk_pc", 4, 21, { label: "Mateus Ferrari" });
  prop("chair", 5, 22);
  prop("whiteboard", 7, 21);
  prop("plant", 10, 16);
  // TL Sênior
  prop("desk_pc", 13, 17, { label: "Dai" });
  prop("desk_pc", 17, 17, { label: "Jaderson" });
  prop("desk_pc", 15, 20, { label: "Ranieri" });
  prop("chair", 14, 18);
  prop("chair", 18, 18);
  prop("chair", 16, 21);
  prop("sofa", 14, 22);
  prop("plant", 19, 16);
  // Supervisores
  prop("meeting_table", 22, 19);
  for (const x of [22, 23, 24, 25]) prop("chair", x, 18);
  for (const x of [22, 23, 24, 25]) prop("chair", x, 21);
  prop("tv", 23, 14 + 2 - 2, { label: "Supervisores" });
  prop("plant", 28, 16);
  // Corredor / hall
  prop("mission_board", 18, 30);
  prop("kpi_board", 23, 30);
  prop("plant", 16, 36);
  prop("plant", 28, 36);
  prop("water_cooler", 27, 26);
  prop("sign", 25, 26, { label: "GALPÃO →" });
  // Treinamento
  prop("training_screen", 6, 30);
  for (const y of [33, 35]) for (const x of [4, 6, 8, 10, 12]) prop("chair", x, y);

  // Refeitório
  prop("counter", 4, 40);
  prop("coffee", 13, 40);
  prop("microwave", 14, 40);
  prop("microwave", 15, 40);
  prop("water_cooler", 16, 40);
  for (const [x, y] of [[5, 43], [10, 43], [5, 47], [10, 47], [15, 45]] as [number, number][]) {
    prop("cafe_table", x, y);
    prop("chair", x - 1, y);
    prop("chair", x + 2, y + 1);
  }
  prop("tv", 23, 38);
  prop("sofa", 20, 44);
  prop("sofa", 20, 49);
  prop("pingpong", 24, 46);
  prop("plant", 27, 41);
  prop("plant", 19, 51);

  // Portaria
  prop("guard_desk", 58, 68);
  prop("chair", 59, 69);
  prop("timeclock", 65, 67);
  prop("sign", 63, 66, { label: "PORTARIA" });

  // Estacionamento (carros e motos parados)
  for (let x = 4; x <= 24; x += 3) if (rng() < 0.75) prop("car", x, 55, { variant: Math.floor(rng() * 6) });
  for (let x = 4; x <= 24; x += 3) if (rng() < 0.6) prop("car", x, 66, { variant: Math.floor(rng() * 6) });
  for (let x = 18; x <= 26; x += 1.5) prop("moto", Math.floor(x), 61, { variant: Math.floor(rng() * 4) });
  prop("lamp", 2, 62);
  prop("lamp", 27, 62);
  prop("lamp", 58, 56);
  prop("lamp", 66, 63);
  for (const x of [57, 59, 61]) prop("bush", x, 63);

  // ---------- Galpão ----------
  // PS / auditoria / custódia / mesa de ajuda
  prop("ps_desk", 33, 18);
  prop("audit_desk", 37, 18);
  prop("custody", 41, 17);
  prop("help_desk", 33, 22);
  prop("sign", 37, 16, { label: "PS · AUDITORIA" });
  // EPI / espelho / carregadores
  prop("locker", 31, 26);
  prop("locker", 32, 26);
  prop("locker", 33, 26);
  prop("mirror", 34, 26);
  prop("charger", 31, 34);
  prop("setup_station", 38, 30);
  prop("empty_bakers", 41, 29);
  prop("empty_bakers", 43, 29);
  // Volumosos
  prop("volumosos", 34, 39);
  prop("bulky_stack", 38, 38);
  prop("bulky_stack", 41, 38);
  prop("pallet", 38, 41);
  prop("sign", 35, 38 - 0, { label: "VOLUMOSOS" });
  // Recebimento
  prop("pallet_boxes", 34, 45);
  prop("pallet_boxes", 42, 45);
  prop("pallet_boxes", 50, 45);
  prop("forklift", 38, 46);
  prop("sign", 41, 43, { label: "RECEBIMENTO" });
  prop("cone", 33, 48);
  prop("cone", 53, 48);
  // Etiquetagem
  prop("flowrack", 47, 22);
  for (const y of [22, 25, 28, 31]) prop("label_table", 50, y);
  prop("printer", 52, 22);
  prop("printer", 52, 31);
  prop("sign", 48, 20, { label: "ETIQUETAGEM" });
  // Esteira
  const belt = { x0: 54, x1: 100, y: 27, passarelas: [64, 75, 86] };
  for (const px of belt.passarelas) prop("passarela", px, 25);
  // Ilhas e bakers
  const bakerSlots: BakerSlot[] = [];
  const islandRanges = {} as Record<Island, [number, number]>;
  ISLANDS.forEach((isl, i) => {
    const sx = 56 + i * 11;
    islandRanges[isl] = [sx, sx + 10];
    const routes = ROUTES.filter((r) => r.island === isl);
    const pos: [number, number][] = [[sx + 1, 24], [sx + 5, 24], [sx + 1, 30], [sx + 5, 30]];
    routes.forEach((r, j) => bakerSlots.push({ route: r.id, island: isl, x: pos[j][0], y: pos[j][1] }));
    prop("sign", sx + 3, 22, { label: `ILHA ${isl}` });
  });
  // Goleiro + Sorter
  prop("goleiro", 101, 27);
  prop("goleiro_cages", 104, 24);
  prop("sign", 101, 24, { label: "GOLEIRO" });
  prop("sorter", 78, 16);
  prop("sorter_panel", 75, 17);
  prop("kpi_wall", 62, 14);
  prop("briefing_board", 66, 17);
  // Expedição
  prop("sign", 64, 38, { label: "STAGE ZONES" });
  prop("sign", 84, 47, { label: "EXPEDIÇÃO" });
  for (const x of [66, 72, 78, 84, 90, 96, 102]) prop("cone", x, 48);
  prop("forklift", 106, 46);
  prop("pallet", 32, 41);

  // ---------- Zonas ----------
  const zones: Zone[] = [
    { id: "jardim", name: "Jardim & Descanso Externo", x: 0, y: 0, w: SVC_W, h: 12 },
    { id: "tl", name: "Sala dos Team Leaders", x: 3, y: 16, w: 9, h: 8 },
    { id: "tls", name: "Sala dos TL Sêniors", x: 13, y: 16, w: 7, h: 8 },
    { id: "sup", name: "Sala dos Supervisores", x: 21, y: 16, w: 8, h: 8 },
    { id: "treinamento", name: "Sala de Treinamento", x: 3, y: 32, w: 12, h: 5 },
    { id: "admin", name: "Área Administrativa", x: 3, y: 26, w: 26, h: 11 },
    { id: "refeitorio", name: "Refeitório", x: 3, y: 40, w: 16, h: 12 },
    { id: "descanso", name: "Área de Descanso", x: 19, y: 40, w: 10, h: 12 },
    { id: "ps", name: "PS · Auditoria · Tratativas", x: 31, y: 16, w: 14, h: 9 },
    { id: "epi", name: "EPI & Coletores", x: 31, y: 25, w: 14, h: 10 },
    { id: "volumosos", name: "Área de Volumosos", x: 31, y: 38, w: 14, h: 5 },
    { id: "recebimento", name: "Recebimento", x: 31, y: 43, w: 25, h: 8 },
    { id: "etiquetagem", name: "Etiquetagem & Indução", x: 47, y: 16, w: 7, h: 20 },
    { id: "briefing", name: "Ponto do Tier 1 (Briefing)", x: 60, y: 16, w: 13, h: 6 },
    { id: "sorter", name: "Sorter Cross Belt", x: 74, y: 16, w: 34, h: 6 },
    { id: "sorting", name: "Sorting (Ilhas A–D)", x: 54, y: 22, w: 47, h: 13 },
    { id: "goleiro", name: "Goleiro", x: 101, y: 22, w: 8, h: 13 },
    { id: "stage", name: "Stage Zones (Traslado)", x: 60, y: 38, w: 49, h: 8 },
    { id: "expedicao", name: "Expedição / Carregamento", x: 60, y: 46, w: 49, h: 5 },
    { id: "galpao", name: "Galpão Principal", x: 31, y: 16, w: 78, h: 35 },
    { id: "estacionamento", name: "Estacionamento", x: 2, y: 54, w: 26, h: 17 },
    { id: "patio_lh", name: "Pátio de Recebimento (LH)", x: 30, y: 52, w: 27, h: 20 },
    { id: "portaria", name: "Portaria", x: 57, y: 64, w: 9, h: 8 },
    { id: "flash", name: "Flash Parking", x: 66, y: 52, w: 44, h: 20 },
    { id: "rua", name: "Rua", x: 0, y: 73, w: W, h: 9 },
  ];

  const points: Record<string, [number, number]> = {
    portaria: [64, 68], guarita: [60, 69], tl: [6, 19], tl_indio: [5, 19], tl_leticia: [8, 19], tl_mateus: [6, 22],
    tls: [14, 19], tls2: [18, 19], tls3: [13, 21], sup2: [27, 22], sup: [24, 22], hall: [21, 33], treinamento: [9, 34], refeitorio: [8, 45], cafe: [13, 41],
    descanso: [21, 46], jardim: [46, 7], briefing: [66, 20], ps: [34, 20], auditoria: [38, 20],
    etiquetagem: [49, 26], ilhaA: [60, 26], ilhaB: [71, 29], ilhaC: [82, 26], ilhaD: [93, 29],
    goleiro: [103, 29], sorter: [76, 20], expedicao: [84, 47], stage: [80, 42], recebimento: [42, 47],
    volumosos: [36, 42], flash: [88, 66], estacionamento: [14, 62], epi: [33, 29], spawn: [64, 69],
    sorting: [78, 33],
  };

  // ---------- Expansão: avenida, Centro Logístico, bairro e Zona de Extravio ----------
  const exp = buildExpansion({ W, H: WORLD_H, rng, set, get, fill, prop, building, door });

  // ---------- Interiores das casas (região isolada abaixo do mapa) ----------
  fill(0, WORLD_H, W - 1, H - 1, T.WALL_TOP);
  exp.plots.forEach((pl, i) => {
    const r = interiorRect(i);
    building(r.x, r.y, r.x + r.w - 1, r.y + r.h - 1, T.WOOD_FLOOR);
    fill(r.x + 1, r.y + 3, r.x + r.w - 2, r.y + 3, T.CARPET); // rodapé
    fill(r.x + 7, r.y + r.h - 2, r.x + 8, r.y + r.h - 2, T.DOOR);
    prop("house_exit", r.x + 7, r.y + r.h - 2, { data: pl.id, label: "" });
  });
  zones.unshift({ id: "casa", name: "Dentro de casa", x: 0, y: WORLD_H, w: W, h: H - WORLD_H } as any);
  zones.unshift(...exp.zones.filter((z) => z.id !== "centro" && z.id !== "extravio" && z.id !== "bairro"));
  zones.push(...exp.zones.filter((z) => z.id === "centro" || z.id === "extravio" || z.id === "bairro"));
  Object.assign(points, exp.points);

  // ---------- Grade de colisão ----------
  const solid = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) solid[i] = SOLID_TILES.has(g[i]) ? 1 : 0;
  const block = (x0: number, y0: number, w: number, h: number) => {
    for (let y = Math.floor(y0); y < Math.ceil(y0 + h); y++)
      for (let x = Math.floor(x0); x < Math.ceil(x0 + w); x++) if (x >= 0 && y >= 0 && x < W && y < H) solid[y * W + x] = 1;
  };
  for (const p of props) {
    const d = PROP_DEFS[p.kind];
    if (d.solid) block(p.x + d.solid[0], p.y + d.solid[1], d.solid[2], d.solid[3]);
  }
  // esteira (sólida, exceto passarelas)
  for (let x = belt.x0; x <= belt.x1; x++) {
    if (belt.passarelas.some((px) => x >= px && x <= px + 1)) continue;
    block(x, belt.y, 1, 2);
  }
  for (const b of bakerSlots) block(b.x, b.y, 2, 2);

  return {
    w: W, h: H, ground: g, props, solid, zones, bakerSlots, docks, belt, islandRanges, points, flashSpots,
    spawn: [points.spawn[0] * TILE + TILE / 2, points.spawn[1] * TILE + TILE / 2],
    plots: exp.plots, spawnZones: exp.spawnZones, bossSpawn: exp.bossSpawn, worldH: WORLD_H,
  };
}

export function zoneAt(world: WorldMap, px: number, py: number): Zone | null {
  const tx = px / TILE;
  const ty = py / TILE;
  // zonas mais específicas primeiro (lista já está ordenada do específico para o geral, exceto jardim)
  for (const z of world.zones) {
    if (z.id === "galpao") continue;
    if (tx >= z.x && tx < z.x + z.w && ty >= z.y && ty < z.y + z.h) return z;
  }
  const g = world.zones.find((z) => z.id === "galpao")!;
  if (tx >= g.x && tx < g.x + g.w && ty >= g.y && ty < g.y + g.h) return g;
  return null;
}

export function isInWarehouse(world: WorldMap, px: number, py: number): boolean {
  const tx = px / TILE;
  const ty = py / TILE;
  return tx >= 31 && tx < 109 && ty >= 16 && ty < 51;
}

export function islandAtX(world: WorldMap, tileX: number): Island | null {
  for (const isl of ISLANDS) {
    const [a, b] = world.islandRanges[isl];
    if (tileX >= a && tileX <= b) return isl;
  }
  return null;
}

export function isSolidTile(world: WorldMap, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= world.w || ty >= world.h) return true;
  return world.solid[ty * world.w + tx] === 1;
}

/** Marca/desmarca a área da casa de um lote como sólida (cliente e servidor chamam igual). */
export function setHouseSolid(world: WorldMap, plot: Plot, built: boolean) {
  for (let y = plot.y + HOUSE_FOOT.dy; y < plot.y + HOUSE_FOOT.dy + HOUSE_FOOT.h; y++)
    for (let x = plot.x + HOUSE_FOOT.dx; x < plot.x + HOUSE_FOOT.dx + HOUSE_FOOT.w; x++) world.solid[y * world.w + x] = built ? 1 : 0;
}

export function plotAt(world: WorldMap, px: number, py: number): Plot | null {
  const tx = px / TILE;
  const ty = py / TILE;
  for (const p of world.plots) if (tx >= p.x && tx < p.x + 10 && ty >= p.y && ty < p.y + 11) return p;
  return null;
}

/** Retângulo (tiles) da sala interna do lote de índice i. Piso útil: x+1..x+w-2, y+3..y+h-2. */
export function interiorRect(i: number) {
  const col = i % INTERIOR.cols;
  const row = Math.floor(i / INTERIOR.cols);
  return { x: INTERIOR.originX + col * INTERIOR.cellW, y: INTERIOR.originY + row * INTERIOR.cellH, w: INTERIOR.roomW, h: INTERIOR.roomH };
}

/** Piso onde móveis podem ficar (tiles, inclusivo-exclusivo). */
export function interiorFloor(i: number) {
  const r = interiorRect(i);
  return { x0: r.x + 1, y0: r.y + 4, x1: r.x + r.w - 1, y1: r.y + r.h - 2 };
}

/** Ponto (px) onde o jogador aparece ao entrar na casa. */
export function interiorSpawn(i: number): [number, number] {
  const r = interiorRect(i);
  return [(r.x + 8) * TILE, (r.y + r.h - 3) * TILE + TILE / 2];
}

/** Índice do lote cuja sala contém o ponto (px), ou -1 se não estiver em nenhum interior. */
export function interiorAt(world: WorldMap, px: number, py: number): number {
  const tx = px / TILE;
  const ty = py / TILE;
  if (ty < world.worldH) return -1;
  for (let i = 0; i < world.plots.length; i++) {
    const r = interiorRect(i);
    if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) return i;
  }
  return -1;
}

/** Ponto (px) na porta de fora da casa do lote. */
export function plotDoor(plot: Plot): [number, number] {
  return [(plot.x + 5) * TILE, (plot.y + HOUSE_FOOT.dy + HOUSE_FOOT.h) * TILE + TILE * 0.6];
}

export function isSafeZone(world: WorldMap, px: number, py: number): boolean {
  const tx = px / TILE;
  const ty = py / TILE;
  if (ty >= world.worldH) return true;
  if (tx < 119 || ty < 87) return true;
  return tx >= 171 && tx < 180 && ty >= 89 && ty < 97; // acampamento
}
