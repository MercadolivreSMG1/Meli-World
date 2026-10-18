/** Tiles procedurais e "bake" do chão inteiro do mapa num único bitmap. */
import { SOLID_TILES, T, TILE, type WorldMap } from "@shared/index";
import { noise2, PixelBuffer, shade } from "./pixel";

const S = TILE;

function speckle(b: PixelBuffer, ox: number, oy: number, wx: number, wy: number, base: string, dark: string, light: string, dens = 0.12, seed = 1) {
  b.fill(ox, oy, S, S, base);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const n = noise2(wx * S + x, wy * S + y, seed);
      if (n < dens) b.set(ox + x, oy + y, dark);
      else if (n > 1 - dens * 0.7) b.set(ox + x, oy + y, light);
    }
}

function grass(b: PixelBuffer, ox: number, oy: number, wx: number, wy: number, base: string) {
  speckle(b, ox, oy, wx, wy, base, shade(base, -0.12), shade(base, 0.1), 0.1, 3);
  // tufos
  for (let i = 0; i < 3; i++) {
    const n = noise2(wx * 7 + i, wy * 13 + i, 9);
    const x = Math.floor(n * 13) + 1;
    const y = Math.floor(noise2(wx + i * 3, wy - i, 4) * 12) + 2;
    b.set(ox + x, oy + y, shade(base, -0.22));
    b.set(ox + x + 1, oy + y - 1, shade(base, -0.18));
    b.set(ox + x - 1, oy + y - 1, shade(base, -0.18));
  }
}

export function drawTile(b: PixelBuffer, ox: number, oy: number, t: number, wx: number, wy: number) {
  switch (t) {
    case T.GRASS:
      grass(b, ox, oy, wx, wy, "#69ab4b");
      break;
    case T.GRASS_DARK:
      grass(b, ox, oy, wx, wy, "#5e9d43");
      break;
    case T.GRASS_FLOWERS: {
      grass(b, ox, oy, wx, wy, "#69ab4b");
      const cols = ["#ffffff", "#ffe066", "#ff8fb1", "#b3a6ff"];
      for (let i = 0; i < 3; i++) {
        const x = 2 + Math.floor(noise2(wx, wy + i, 21) * 12);
        const y = 2 + Math.floor(noise2(wx + i, wy, 22) * 12);
        const c = cols[Math.floor(noise2(wx + i, wy + i, 23) * 4)];
        b.set(ox + x, oy + y, c);
        b.set(ox + x + 1, oy + y, shade(c, -0.2));
        b.set(ox + x, oy + y + 1, "#3f7a32");
      }
      break;
    }
    case T.DIRT:
      speckle(b, ox, oy, wx, wy, "#bb8a58", "#a2754a", "#cfa070", 0.14, 5);
      break;
    case T.STONE_PATH: {
      b.fill(ox, oy, S, S, "#8d877c");
      const off = (wy % 2) * 4;
      for (let row = 0; row < 2; row++)
        for (let col = -1; col < 3; col++) {
          const x0 = col * 8 + off + (row ? 4 : 0);
          const y0 = row * 8;
          const c = shade("#c4bdaf", (noise2(wx * 3 + col, wy * 3 + row, 7) - 0.5) * 0.18);
          for (let y = y0 + 1; y < y0 + 7; y++) for (let x = x0 + 1; x < x0 + 7; x++) if (x >= 0 && x < S) b.set(ox + x, oy + y, c);
          for (let x = x0 + 1; x < x0 + 7; x++) if (x >= 0 && x < S) b.set(ox + x, oy + y0 + 1, shade(c, 0.12));
        }
      break;
    }
    case T.ASPHALT:
      speckle(b, ox, oy, wx, wy, "#4c4f58", "#41444c", "#5a5d66", 0.12, 11);
      break;
    case T.ASPHALT_DASH:
      speckle(b, ox, oy, wx, wy, "#4c4f58", "#41444c", "#5a5d66", 0.12, 11);
      b.fill(ox + 2, oy + 7, 12, 2, "#f2d24a");
      break;
    case T.PARKING_LINE:
      speckle(b, ox, oy, wx, wy, "#4c4f58", "#41444c", "#5a5d66", 0.12, 11);
      b.fill(ox + 7, oy, 2, S, "#e9e9e9");
      break;
    case T.CROSSWALK:
      speckle(b, ox, oy, wx, wy, "#4c4f58", "#41444c", "#5a5d66", 0.12, 11);
      for (let x = 1; x < S; x += 5) b.fill(ox + x, oy + 2, 3, 12, "#ececec");
      break;
    case T.SIDEWALK:
      speckle(b, ox, oy, wx, wy, "#cdc6b6", "#bdb6a6", "#dad4c6", 0.08, 13);
      b.fill(ox, oy + 15, S, 1, "#aaa393");
      b.fill(ox + 15, oy, 1, S, "#b5ae9e");
      break;
    case T.CONCRETE:
      speckle(b, ox, oy, wx, wy, "#aba79e", "#9f9b92", "#b6b2a9", 0.07, 17);
      if (wx % 4 === 0) b.fill(ox, oy, 1, S, "#9a968d");
      if (wy % 4 === 0) b.fill(ox, oy, S, 1, "#9a968d");
      break;
    case T.YELLOW_LINE:
      speckle(b, ox, oy, wx, wy, "#aba79e", "#9f9b92", "#b6b2a9", 0.07, 17);
      b.fill(ox, oy + 6, S, 4, "#e8c33a");
      for (let x = 0; x < S; x += 4) b.fill(ox + x, oy + 6, 2, 4, "#2f2f2f");
      break;
    case T.EPOXY_GREEN:
      speckle(b, ox, oy, wx, wy, "#5f9b70", "#568f66", "#6aa87b", 0.06, 19);
      break;
    case T.WALL_TOP:
      b.fill(ox, oy, S, S, "#3d3437");
      b.fill(ox, oy, S, 2, "#5a4e50");
      for (let x = 0; x < S; x += 4) b.set(ox + x, oy + 8, "#342c2f");
      break;
    case T.WALL_FACE:
    case T.WALL_WINDOW: {
      b.fill(ox, oy, S, S, "#8d7f76");
      for (let y = 3; y < S; y += 5) b.fill(ox, oy + y, S, 1, "#7d7067");
      b.fill(ox, oy, S, 1, "#a39489");
      if (t === T.WALL_WINDOW) {
        b.fill(ox + 3, oy + 3, 10, 9, "#4b3c37");
        b.fill(ox + 4, oy + 4, 8, 7, "#8fc6e8");
        b.fill(ox + 4, oy + 4, 3, 2, "#cdeaff");
        b.fill(ox + 7, oy + 4, 1, 7, "#4b3c37");
      }
      break;
    }
    case T.WOOD_FLOOR:
    case T.TL_FLOOR: {
      const base = t === T.WOOD_FLOOR ? "#b98552" : "#a37248";
      b.fill(ox, oy, S, S, base);
      for (let y = 0; y < S; y += 4) {
        b.fill(ox, oy + y, S, 1, shade(base, -0.18));
        const seam = (Math.floor(noise2(wx, wy * 4 + y, 31) * 12) + 2) | 0;
        b.set(ox + seam, oy + y + 1, shade(base, -0.15));
        b.set(ox + seam, oy + y + 2, shade(base, -0.15));
        b.set(ox + ((seam + 7) % 16), oy + y + 2, shade(base, 0.1));
      }
      break;
    }
    case T.CARPET:
      b.fill(ox, oy, S, S, "#4f68a6");
      for (let y = 1; y < S; y += 4) for (let x = (y % 8 === 1 ? 1 : 3); x < S; x += 4) b.set(ox + x, oy + y, "#6680bd");
      break;
    case T.CAFE_TILE:
      for (let y = 0; y < S; y += 4) for (let x = 0; x < S; x += 4) b.fill(ox + x, oy + y, 4, 4, ((x + y) / 4) % 2 ? "#e4dccd" : "#cfc4ae");
      break;
    case T.DOCK_DOOR:
      b.fill(ox, oy, S, S, "#6b717d");
      for (let y = 1; y < S; y += 3) b.fill(ox, oy + y, S, 1, "#555a64");
      b.fill(ox, oy + 14, S, 2, "#e8c33a");
      break;
    case T.DOCK_PAD:
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) b.set(ox + x, oy + y, ((x + y + wx * 16) >> 2) % 2 ? "#2f2f2f" : "#e8c33a");
      break;
    case T.WATER: {
      b.fill(ox, oy, S, S, "#4aa3d8");
      for (let i = 0; i < 3; i++) {
        const x = Math.floor(noise2(wx, wy + i, 41) * 11);
        const y = Math.floor(noise2(wx + i, wy, 42) * 14);
        b.fill(ox + x, oy + y, 4, 1, "#8fd0f2");
      }
      break;
    }
    case T.FENCE:
      grass(b, ox, oy, wx, wy, "#69ab4b");
      b.fill(ox, oy + 5, S, 2, "#a8784a");
      b.fill(ox, oy + 10, S, 2, "#a8784a");
      b.fill(ox, oy + 7, S, 1, "#7a5232");
      b.fill(ox, oy + 12, S, 1, "#7a5232");
      b.fill(ox + 6, oy + 2, 4, 13, "#b98552");
      b.fill(ox + 9, oy + 2, 1, 13, "#7a5232");
      b.fill(ox + 6, oy + 2, 4, 1, "#d6a372");
      break;
    case T.STAGE_ZONE:
      speckle(b, ox, oy, wx, wy, "#a3aaa3", "#979e97", "#b0b7b0", 0.07, 17);
      b.fill(ox + 1, oy + 1, 14, 1, "#e9eef2");
      b.fill(ox + 1, oy + 14, 14, 1, "#e9eef2");
      if ((wx + wy) % 3 === 0) {
        b.fill(ox + 6, oy + 6, 4, 4, "#ffffff");
        b.set(ox + 7, oy + 7, "#222");
        b.set(ox + 8, oy + 8, "#222");
      }
      break;
    case T.BRIEFING:
      speckle(b, ox, oy, wx, wy, "#8aa0c4", "#7f95b9", "#97acd0", 0.06, 23);
      break;
    case T.WAVE1:
    case T.WAVE2:
    case T.WAVE3: {
      const col = t === T.WAVE1 ? "#f4f4f4" : t === T.WAVE2 ? "#ffe600" : "#38c172";
      speckle(b, ox, oy, wx, wy, "#4c4f58", "#41444c", "#5a5d66", 0.12, 11);
      b.fill(ox, oy, 2, S, col);
      b.fill(ox + 14, oy, 2, S, col);
      break;
    }
    case T.DOOR:
      b.fill(ox, oy, S, S, "#9a7b56");
      for (let x = 1; x < S; x += 3) b.fill(ox + x, oy + 1, 1, 14, "#86694a");
      break;
    case T.FOREST: {
      grass(b, ox, oy, wx, wy, "#3f7a36");
      if (noise2(wx, wy, 77) < 0.12) {
        b.set(ox + 5, oy + 9, "#6b4a2b");
        b.set(ox + 6, oy + 9, "#7a5a3a");
      }
      if (noise2(wx, wy, 78) < 0.08) b.fill(ox + 9, oy + 4, 2, 1, "#c9b45a");
      break;
    }
    case T.RUIN_FLOOR: {
      b.fill(ox, oy, S, S, "#7d776c");
      for (let yy = 0; yy < S; yy += 8)
        for (let xx = (yy / 8) % 2 ? 4 : 0; xx < S; xx += 8) {
          const c = shade("#9a9488", (noise2(wx * 2 + xx, wy * 2 + yy, 81) - 0.5) * 0.25);
          b.fill(ox + xx + 1, oy + yy + 1, 6, 6, c);
        }
      if (noise2(wx, wy, 82) < 0.3) b.fill(ox + 3, oy + 11, 4, 2, "#5f8d45");
      if (noise2(wx, wy, 83) < 0.2) b.fill(ox + 10, oy + 3, 1, 5, "#5d574d");
      break;
    }
    case T.PLOT_GRASS:
      grass(b, ox, oy, wx, wy, "#7cba58");
      if ((wx + wy) % 2 === 0) b.fill(ox, oy, S, S, "#ffffff", 14);
      break;
    case T.PLAZA: {
      b.fill(ox, oy, S, S, "#cdbd9a");
      const c1 = "#dccca8";
      const c2 = "#c4b28c";
      for (let yy = 0; yy < S; yy += 4) for (let xx = 0; xx < S; xx += 4) b.fill(ox + xx, oy + yy, 3, 3, ((xx + yy + wx * 4 + wy * 4) / 4) % 3 ? c1 : c2);
      if ((wx + wy) % 6 === 0) b.fill(ox + 6, oy + 6, 4, 4, "#e5533d", 120);
      break;
    }
    case T.ASPHALT_DASH_V:
      speckle(b, ox, oy, wx, wy, "#4c4f58", "#41444c", "#5a5d66", 0.12, 11);
      b.fill(ox + 7, oy + 2, 2, 12, "#f2d24a");
      break;
    case T.DUNGEON_FLOOR: {
      speckle(b, ox, oy, wx, wy, "#57515c", "#4a4550", "#635d68", 0.12, 91);
      if (noise2(wx, wy, 92) < 0.15) b.fill(ox + 2, oy + 8, 6, 1, "#3d3843");
      if (noise2(wx, wy, 93) < 0.06) b.fill(ox + 9, oy + 5, 3, 2, "#8a2b2b", 120);
      break;
    }
    default:
      b.fill(ox, oy, S, S, "#ff00ff");
  }
}

/** Renderiza o chão inteiro + sombras de parede (use renderGroundRegion para mapas grandes). */
export function renderGround(world: WorldMap): PixelBuffer {
  return renderGroundRegion(world, 0, 0, world.w, world.h);
}

/** Renderiza um pedaço do chão (em tiles) — o cliente usa pedaços de 64x64 para não estourar o limite de textura. */
export function renderGroundRegion(world: WorldMap, tx0: number, ty0: number, tw: number, th: number): PixelBuffer {
  tw = Math.min(tw, world.w - tx0);
  th = Math.min(th, world.h - ty0);
  const b = new PixelBuffer(tw * S, th * S);
  for (let y = 0; y < th; y++)
    for (let x = 0; x < tw; x++) drawTile(b, x * S, y * S, world.ground[(ty0 + y) * world.w + tx0 + x], tx0 + x, ty0 + y);
  // sombra sob paredes (oclusão ambiente) e bordas de grama
  const isGrass = (t: number) => t === T.GRASS || t === T.GRASS_DARK || t === T.GRASS_FLOWERS || t === T.FENCE || t === T.FOREST || t === T.PLOT_GRASS;
  for (let ly = 0; ly < th; ly++)
    for (let lx = 0; lx < tw; lx++) {
      const x = tx0 + lx;
      const y = ty0 + ly;
      if (y < 1) continue;
      const t = world.ground[y * world.w + x];
      const above = world.ground[(y - 1) * world.w + x];
      if (!SOLID_TILES.has(t) && (above === T.WALL_FACE || above === T.WALL_WINDOW || above === T.WALL_TOP)) {
        b.fill(lx * S, ly * S, S, 3, "#000000", 60);
        b.fill(lx * S, ly * S, S, 1, "#000000", 50);
      }
      if (isGrass(above) && !isGrass(t) && !SOLID_TILES.has(t)) b.fill(lx * S, ly * S, S, 1, "#3e6e2e", 140);
      if (isGrass(t) && !isGrass(above) && !SOLID_TILES.has(above)) b.fill(lx * S, ly * S, S, 1, "#3e6e2e", 110);
    }
  return b;
}
