/** Catálogo de tiles do mapa. O cliente gera a arte de cada um proceduralmente. */
export enum T {
  GRASS = 0, GRASS_DARK, GRASS_FLOWERS, DIRT, STONE_PATH, ASPHALT, ASPHALT_DASH, PARKING_LINE, SIDEWALK,
  CONCRETE, YELLOW_LINE, EPOXY_GREEN, WALL_TOP, WALL_FACE, WALL_WINDOW, WOOD_FLOOR, CARPET, CAFE_TILE,
  DOCK_DOOR, DOCK_PAD, WATER, FENCE, STAGE_ZONE, BRIEFING, WAVE1, WAVE2, WAVE3, DOOR, CROSSWALK, TL_FLOOR,
  FOREST, RUIN_FLOOR, PLOT_GRASS, PLAZA, ASPHALT_DASH_V, DUNGEON_FLOOR,
}

export const TILE_COUNT = 36;

export const SOLID_TILES = new Set<number>([T.WALL_TOP, T.WALL_FACE, T.WALL_WINDOW, T.DOCK_DOOR, T.WATER, T.FENCE]);

/** Cor média de cada tile (minimapa). */
export const TILE_MINIMAP: Record<number, string> = {
  [T.GRASS]: "#5fa548", [T.GRASS_DARK]: "#4d9140", [T.GRASS_FLOWERS]: "#6bb050", [T.DIRT]: "#b98a56",
  [T.STONE_PATH]: "#b9b2a4", [T.ASPHALT]: "#4a4d55", [T.ASPHALT_DASH]: "#4a4d55", [T.PARKING_LINE]: "#6b6e76",
  [T.SIDEWALK]: "#c9c3b6", [T.CONCRETE]: "#a9a59d", [T.YELLOW_LINE]: "#c8b04a", [T.EPOXY_GREEN]: "#5d9a6e",
  [T.WALL_TOP]: "#3b3436", [T.WALL_FACE]: "#7d6f68", [T.WALL_WINDOW]: "#7d6f68", [T.WOOD_FLOOR]: "#b3804e",
  [T.CARPET]: "#4f6aa8", [T.CAFE_TILE]: "#d8d0c0", [T.DOCK_DOOR]: "#555", [T.DOCK_PAD]: "#c7a83a",
  [T.WATER]: "#4aa3d8", [T.FENCE]: "#7a5a3a", [T.STAGE_ZONE]: "#9fa6a0", [T.BRIEFING]: "#8fa3c4",
  [T.WAVE1]: "#e8e8e8", [T.WAVE2]: "#e6cf3a", [T.WAVE3]: "#46b46a", [T.DOOR]: "#9a7b56", [T.CROSSWALK]: "#d8d8d8",
  [T.TL_FLOOR]: "#a77a52",
  [T.FOREST]: "#3f7a36", [T.RUIN_FLOOR]: "#8a8478", [T.PLOT_GRASS]: "#7dbb5a", [T.PLAZA]: "#d8c9a8",
  [T.ASPHALT_DASH_V]: "#4a4d55", [T.DUNGEON_FLOOR]: "#5b5560",
};
