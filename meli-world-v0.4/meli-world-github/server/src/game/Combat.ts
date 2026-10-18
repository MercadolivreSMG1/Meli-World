/**
 * Combate na Zona de Extravio: inimigos temáticos (Rato do Estoque, Caixa Mímica, Bug do Sistema,
 * Fraudador) e o chefe O Grande Atraso. Tudo simulado no servidor (autoritativo).
 */
import {
  Dir, ENEMIES, EnemyKind, getWorld, isSafeZone, ITEMS, moveWithCollision, PLAYER_MAX_HP, PUNCH, randInt, TILE, boxBlocked,
} from "../../../shared/src";
import type { EnemyEntity, PlayerEntity } from "./entities";
import type { World } from "./World";

const LEASH = 280;
const BOSS_RESPAWN_MS = 8 * 60_000;
const RESPAWN_MS = 25_000;

export class Combat {
  readonly map = getWorld();
  enemies = new Map<string, EnemyEntity>();
  private seq = 0;
  private spawnAcc = 0;
  bossDeadUntil = 0;

  constructor(private w: World) {
    for (const z of this.map.spawnZones) for (let i = 0; i < Math.ceil(z.max * 0.7); i++) this.spawn(z.id);
    this.spawnBoss();
  }

  private randomPointIn(zoneId: string): [number, number] | null {
    const z = this.map.spawnZones.find((s) => s.id === zoneId)!;
    for (let tries = 0; tries < 30; tries++) {
      const x = (z.x + Math.random() * z.w) * TILE;
      const y = (z.y + Math.random() * z.h) * TILE;
      if (!boxBlocked(this.map, x, y, 10, 6)) return [x, y];
    }
    return null;
  }

  private make(kind: EnemyKind, zone: string, x: number, y: number, minion = false): EnemyEntity {
    const d = ENEMIES[kind];
    const e: EnemyEntity = {
      id: `E${++this.seq}`, kind, zone, x, y, homeX: x, homeY: y, hp: d.hp, maxHp: d.hp, dir: "down", state: "idle",
      target: "", atkAt: 0, wanderAt: 0, wx: x, wy: y, respawnAt: 0, flashUntil: 0, summonAt: Date.now() + 6000, minion,
    };
    this.enemies.set(e.id, e);
    return e;
  }

  spawn(zoneId: string) {
    const z = this.map.spawnZones.find((s) => s.id === zoneId);
    if (!z) return;
    const pt = this.randomPointIn(zoneId);
    if (!pt) return;
    const kind = z.kinds[Math.floor(Math.random() * z.kinds.length)];
    this.make(kind, zoneId, pt[0], pt[1]);
  }

  spawnBoss() {
    const [bx, by] = this.map.bossSpawn;
    this.make("atraso", "galpao", bx * TILE + 8, by * TILE + 8);
  }

  // ------------------------------------------------------------------ ataque do jogador
  attack(p: PlayerEntity, dir: Dir) {
    const now = Date.now();
    const wid = p.rec.equipped.weapon;
    const wdef = wid && p.rec.inventory[wid] ? ITEMS[wid]?.weapon : undefined;
    const st = wdef ?? PUNCH;
    if (now - p.atkAt < st.cd * 1000 * 0.9) return;
    p.atkAt = now;
    p.atkSeq = (p.atkSeq + 1) % 1000;
    if (["down", "up", "left", "right"].includes(dir)) p.dir = dir;
    p.actionAnim = "interact";
    p.actionUntil = now + 260;
    p.sitting = false;
    const fx = p.dir === "left" ? -1 : p.dir === "right" ? 1 : 0;
    const fy = p.dir === "up" ? -1 : p.dir === "down" ? 1 : 0;
    const cx = p.x;
    const cy = p.y - 8;
    let hits = 0;
    for (const e of this.enemies.values()) {
      if (e.state === "dead") continue;
      const size = ENEMIES[e.kind].size;
      const dx = e.x - cx;
      const dy = e.y - size / 2 - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > st.range + size / 2) continue;
      const dot = dist < 8 ? 1 : (dx * fx + dy * fy) / dist;
      if (dot < 0.25) continue;
      const crit = Math.random() < 0.1;
      const lvlBonus = 1 + 0.03 * (p.level - 1);
      const dmg = Math.max(1, Math.round(st.dmg * lvlBonus * (0.85 + Math.random() * 0.3) * (crit ? 1.8 : 1)));
      this.hurtEnemy(e, dmg, p, fx, fy, crit);
      hits++;
      if (hits >= 3) break;
    }
  }

  private hurtEnemy(e: EnemyEntity, dmg: number, p: PlayerEntity, fx: number, fy: number, crit: boolean) {
    const d = ENEMIES[e.kind];
    e.hp -= dmg;
    e.flashUntil = Date.now() + 160;
    e.state = "chase";
    e.target = p.sid;
    this.w.out.broadcast("fx", { x: e.x, y: e.y - d.size - 4, text: crit ? `${dmg}!` : String(dmg), color: crit ? "#ffd166" : "#ffffff" });
    if (!d.boss) {
      const [nx, ny] = moveWithCollision(this.map, e.x, e.y, fx * 10, fy * 10);
      e.x = nx;
      e.y = ny;
    }
    if (e.kind === "bug" && Math.random() < 0.35) {
      const a = Math.random() * Math.PI * 2;
      const tx = e.x + Math.cos(a) * 36;
      const ty = e.y + Math.sin(a) * 36;
      if (!boxBlocked(this.map, tx, ty, 10, 6)) {
        e.x = tx;
        e.y = ty;
      }
    }
    if (e.hp <= 0) this.kill(e, p);
  }

  private kill(e: EnemyEntity, p: PlayerEntity) {
    const d = ENEMIES[e.kind];
    e.state = "dead";
    e.hp = 0;
    e.respawnAt = Date.now() + (d.boss ? BOSS_RESPAWN_MS : RESPAWN_MS);
    if (d.boss) this.bossDeadUntil = e.respawnAt;
    const coins = randInt(Math.random, d.coins[0], d.coins[1]);
    this.w.addCoins(p, coins, false);
    const loot: string[] = [];
    for (const [item, chance] of d.drops)
      if (Math.random() < chance) {
        p.rec.inventory[item] = (p.rec.inventory[item] ?? 0) + 1;
        loot.push(ITEMS[item]?.name ?? item);
      }
    this.w.gainXp(p, d.xp, "geral", true);
    this.w.emit(p, { type: "kill", enemy: e.kind });
    this.w.out.broadcast("fx", { x: e.x, y: e.y - d.size - 12, text: `+${coins} M$`, color: "#ffe600" });
    this.w.toast(p, `${d.name} derrotado! +${coins} MeliCoins${loot.length ? " · " + loot.join(", ") : ""}`, d.boss ? "xp" : "good");
    if (d.boss) this.w.out.broadcast("toast", { text: `${p.name} derrotou O GRANDE ATRASO! Nenhuma rota atrasada hoje!`, kind: "xp" });
    if (e.minion) this.enemies.delete(e.id);
    p.profileDirty = true;
    p.dirty = true;
  }

  // ------------------------------------------------------------------ dano no jogador
  private hurtPlayer(p: PlayerEntity, dmg: number, e: EnemyEntity) {
    const armorId = p.rec.equipped.armor;
    const red = armorId && p.rec.inventory[armorId] ? ITEMS[armorId]?.armor ?? 0 : 0;
    const final = Math.max(1, Math.round(dmg * (1 - red) * (0.85 + Math.random() * 0.3)));
    p.rec.hp = Math.max(0, (p.rec.hp ?? PLAYER_MAX_HP) - final);
    p.hitAt = Date.now();
    p.profileDirty = true;
    this.w.out.broadcast("fx", { x: p.x, y: p.y - 36, text: `-${final}`, color: "#ff6b5a" });
    this.w.out.send(p.sid, "hurt", { hp: p.rec.hp, by: ENEMIES[e.kind].name });
    if (p.rec.hp <= 0) this.w.playerDown(p, ENEMIES[e.kind].name);
  }

  // ------------------------------------------------------------------ tick
  tick(dt: number) {
    const now = Date.now();
    // respawns
    this.spawnAcc += dt;
    if (this.spawnAcc > 4) {
      this.spawnAcc = 0;
      for (const z of this.map.spawnZones) {
        const alive = [...this.enemies.values()].filter((e) => e.zone === z.id && e.state !== "dead" && !e.minion && e.kind !== "atraso").length;
        if (alive < z.max) this.spawn(z.id);
      }
    }
    for (const [id, e] of this.enemies) {
      const d = ENEMIES[e.kind];
      if (e.state === "dead") {
        if (now >= e.respawnAt) {
          if (d.boss) {
            e.hp = e.maxHp;
            e.state = "idle";
            e.x = e.homeX;
            e.y = e.homeY;
          } else this.enemies.delete(id);
        }
        continue;
      }
      // alvo mais próximo
      let target: PlayerEntity | undefined;
      let best = Infinity;
      for (const p of this.w.players.values()) {
        if ((p.rec.hp ?? PLAYER_MAX_HP) <= 0 || isSafeZone(this.map, p.x, p.y)) continue;
        const dd = Math.hypot(p.x - e.x, p.y - e.y);
        if (dd < best && (dd < d.aggro || (e.state === "chase" && e.target === p.sid && dd < d.aggro * 2.2))) {
          best = dd;
          target = p;
        }
      }
      const leashed = Math.hypot(e.x - e.homeX, e.y - e.homeY) > LEASH;
      if (target && !leashed) {
        e.state = "chase";
        e.target = target.sid;
        const dx = target.x - e.x;
        const dy = target.y - e.y;
        const dist = Math.hypot(dx, dy);
        const reach = 12 + d.size / 3;
        if (dist > reach) {
          const sp = d.speed * dt * (e.kind === "caixa_mimica" ? (Math.sin(now / 160) > 0 ? 1.6 : 0.2) : 1);
          const [nx, ny] = moveWithCollision(this.map, e.x, e.y, (dx / dist) * sp, (dy / dist) * sp);
          e.x = nx;
          e.y = ny;
        } else if (now - e.atkAt > (d.boss ? 1400 : 1150)) {
          e.atkAt = now;
          this.hurtPlayer(target, d.dmg, e);
        }
        e.dir = (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up") as Dir;
        // chefe invoca ratos
        if (d.boss && now > e.summonAt) {
          e.summonAt = now + 9000;
          const minions = [...this.enemies.values()].filter((m) => m.minion && m.state !== "dead").length;
          for (let i = 0; i < 2 && minions + i < 5; i++) {
            const m = this.make("rato", e.zone, e.x + (Math.random() - 0.5) * 50, e.y + (Math.random() - 0.5) * 30, true);
            m.state = "chase";
            m.target = target.sid;
          }
          this.w.out.broadcast("fx", { x: e.x, y: e.y - 50, text: "TIC-TAC! ATRASO!", color: "#ff8a80" });
        }
      } else {
        // volta para casa / passeia
        if (e.state === "chase" || leashed) e.state = "return";
        const tx = e.state === "return" ? e.homeX : e.wx;
        const ty = e.state === "return" ? e.homeY : e.wy;
        const dx = tx - e.x;
        const dy = ty - e.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 3) {
          const sp = d.speed * 0.45 * dt;
          const [nx, ny] = moveWithCollision(this.map, e.x, e.y, (dx / dist) * sp, (dy / dist) * sp);
          if (nx === e.x && ny === e.y) {
            e.wx = e.x;
            e.wy = e.y;
          }
          e.x = nx;
          e.y = ny;
        } else {
          if (e.state === "return") {
            e.state = "idle";
            e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.5);
          }
          if (now > e.wanderAt) {
            e.wanderAt = now + 2500 + Math.random() * 4000;
            e.wx = e.homeX + (Math.random() - 0.5) * 70;
            e.wy = e.homeY + (Math.random() - 0.5) * 50;
          }
        }
      }
    }
  }
}
