/** A* em grade de tiles (4 direções) — usado pelos NPCs no servidor. */
import { isSolidTile, WorldMap } from "../map/world";

class MinHeap {
  private items: number[] = [];
  private prio: number[] = [];
  get size() {
    return this.items.length;
  }
  push(item: number, p: number) {
    this.items.push(item);
    this.prio.push(p);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.prio[parent] <= this.prio[i]) break;
      this.swap(i, parent);
      i = parent;
    }
  }
  pop(): number {
    const top = this.items[0];
    const lastI = this.items.pop()!;
    const lastP = this.prio.pop()!;
    if (this.items.length) {
      this.items[0] = lastI;
      this.prio[0] = lastP;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < this.items.length && this.prio[l] < this.prio[m]) m = l;
        if (r < this.items.length && this.prio[r] < this.prio[m]) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }
  private swap(a: number, b: number) {
    [this.items[a], this.items[b]] = [this.items[b], this.items[a]];
    [this.prio[a], this.prio[b]] = [this.prio[b], this.prio[a]];
  }
}

export function findPath(world: WorldMap, sx: number, sy: number, gx: number, gy: number, maxNodes = 6000): [number, number][] | null {
  const W = world.w;
  if (isSolidTile(world, gx, gy)) {
    // procura vizinho livre do objetivo
    let found = false;
    for (let r = 1; r <= 3 && !found; r++)
      for (let dy = -r; dy <= r && !found; dy++)
        for (let dx = -r; dx <= r && !found; dx++)
          if (!isSolidTile(world, gx + dx, gy + dy)) {
            gx += dx;
            gy += dy;
            found = true;
          }
    if (!found) return null;
  }
  const start = sy * W + sx;
  const goal = gy * W + gx;
  const came = new Map<number, number>();
  const cost = new Map<number, number>([[start, 0]]);
  const open = new MinHeap();
  open.push(start, 0);
  let expanded = 0;
  while (open.size) {
    const cur = open.pop();
    if (cur === goal) break;
    if (++expanded > maxNodes) return null;
    const cx = cur % W;
    const cy = (cur - cx) / W;
    const base = cost.get(cur)!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (isSolidTile(world, nx, ny)) continue;
      const n = ny * W + nx;
      const nc = base + 1;
      if (nc < (cost.get(n) ?? Infinity)) {
        cost.set(n, nc);
        came.set(n, cur);
        open.push(n, nc + Math.abs(nx - gx) + Math.abs(ny - gy));
      }
    }
  }
  if (!came.has(goal) && start !== goal) return null;
  const path: [number, number][] = [];
  let c = goal;
  while (c !== start) {
    path.push([c % W, Math.floor(c / W)]);
    c = came.get(c)!;
  }
  path.reverse();
  return path;
}
