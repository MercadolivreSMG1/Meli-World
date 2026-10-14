/** Movimento com colisão (mesma função no cliente — predição — e no servidor — validação). */
import { FEET_H, FEET_W, TILE } from "../constants";
import { isSolidTile, WorldMap } from "../map/world";

export function boxBlocked(world: WorldMap, x: number, y: number, w = FEET_W, h = FEET_H): boolean {
  const x0 = Math.floor((x - w / 2) / TILE);
  const x1 = Math.floor((x + w / 2 - 0.01) / TILE);
  const y0 = Math.floor((y - h) / TILE);
  const y1 = Math.floor((y - 0.01) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (isSolidTile(world, tx, ty)) return true;
  return false;
}

/** Move separando eixos, para deslizar nas paredes. Retorna a nova posição. */
export function moveWithCollision(world: WorldMap, x: number, y: number, dx: number, dy: number): [number, number] {
  let nx = x;
  let ny = y;
  if (dx !== 0) {
    const tx = nx + dx;
    if (!boxBlocked(world, tx, ny)) nx = tx;
    else {
      // tentativa de "escorregar" em quinas (ajuda a passar em portas)
      for (const nudge of [2, -2, 4, -4]) {
        if (!boxBlocked(world, tx, ny + nudge) && !boxBlocked(world, nx, ny + nudge)) {
          nx = tx;
          ny += nudge * 0.5;
          break;
        }
      }
    }
  }
  if (dy !== 0) {
    const ty = ny + dy;
    if (!boxBlocked(world, nx, ty)) ny = ty;
    else {
      for (const nudge of [2, -2, 4, -4]) {
        if (!boxBlocked(world, nx + nudge, ty) && !boxBlocked(world, nx + nudge, ny)) {
          ny = ty;
          nx += nudge * 0.5;
          break;
        }
      }
    }
  }
  return [nx, ny];
}

/** Distância do ponto (px,py) até o retângulo em tiles. */
export function distToRect(px: number, py: number, tx: number, ty: number, tw: number, th: number): number {
  const rx0 = tx * TILE;
  const ry0 = ty * TILE;
  const rx1 = (tx + tw) * TILE;
  const ry1 = (ty + th) * TILE;
  const cx = Math.max(rx0, Math.min(px, rx1));
  const cy = Math.max(ry0, Math.min(py - FEET_H / 2, ry1));
  return Math.hypot(px - cx, py - FEET_H / 2 - cy);
}
