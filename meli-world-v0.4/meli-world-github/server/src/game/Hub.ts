/**
 * Hub: liga várias salas (instâncias do World) ao MESMO mundo persistente.
 * Cada sala tem sua própria operação, NPCs e inimigos, mas o personagem, os lotes/casas,
 * o Balcão de Anúncios e o Mercado Pago são compartilhados entre todas.
 */
import type { Repo } from "../db/types";
import { Economy, type EconHost } from "./Economy";
import type { GameEvent } from "../../../shared/src";
import type { PlayerEntity } from "./entities";
import type { World } from "./World";

export class Hub implements EconHost {
  readonly worlds = new Set<World>();
  readonly economy: Economy;
  /** chamado quando a sessão de um jogador é encerrada porque ele entrou em outra sala */
  onEvict: (world: World, sid: string) => void = () => {};
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(public repo: Repo) {
    this.economy = new Economy(this);
  }

  async start() {
    await this.economy.load().catch((e) => console.warn("[hub] falha ao carregar economia", e));
    let last = Date.now();
    this.timer = setInterval(() => {
      const now = Date.now();
      this.economy.tick((now - last) / 1000);
      last = now;
    }, 1000);
  }

  async stop() {
    if (this.timer) clearInterval(this.timer);
    await this.economy.save().catch(() => {});
  }

  register(w: World) {
    this.worlds.add(w);
  }

  unregister(w: World) {
    this.worlds.delete(w);
  }

  /** Total de jogadores online em todas as salas. */
  online() {
    let n = 0;
    for (const w of this.worlds) n += w.players.size;
    return n;
  }

  /** Mesmo personagem em outra sala? Encerra (e salva) a sessão antiga antes de carregar o save. */
  async evictElsewhere(id: string, except: World) {
    for (const w of this.worlds) {
      if (w === except) continue;
      for (const p of [...w.players.values()])
        if (p.id === id) {
          w.toast(p, "Você entrou em outra sala com este personagem.", "warn");
          await w.leave(p.sid);
          this.onEvict(w, p.sid);
        }
    }
  }

  // ------------------------------------------------------------------ EconHost (roteia para a sala do jogador)
  private worldOf(p: PlayerEntity): World | undefined {
    for (const w of this.worlds) if (w.players.get(p.sid) === p) return w;
    return undefined;
  }
  private worldOfSid(sid: string): World | undefined {
    for (const w of this.worlds) if (w.players.has(sid)) return w;
    return undefined;
  }

  out = {
    send: (sid: string, type: string, msg: unknown) => this.worldOfSid(sid)?.out.send(sid, type, msg),
    broadcast: (type: string, msg: unknown) => {
      for (const w of this.worlds) w.out.broadcast(type, msg);
    },
  };

  players = {
    get: (sid: string) => this.worldOfSid(sid)?.players.get(sid),
    values: () => {
      const all: PlayerEntity[] = [];
      for (const w of this.worlds) all.push(...w.players.values());
      return all[Symbol.iterator]();
    },
  };

  coins(p: PlayerEntity) {
    return Math.floor(p.rec.coins ?? 0);
  }
  addCoins(p: PlayerEntity, n: number, fx = true) {
    const w = this.worldOf(p);
    if (w) w.addCoins(p, n, fx);
    else p.rec.coins = Math.max(0, (p.rec.coins ?? 0) + n);
  }
  takeItem(p: PlayerEntity, id: string, qty: number) {
    this.worldOf(p)?.takeItem(p, id, qty);
  }
  emit(p: PlayerEntity, ev: GameEvent) {
    this.worldOf(p)?.emit(p, ev);
  }
  toast(p: PlayerEntity, text: string, kind: "info" | "good" | "bad" | "xp" | "warn") {
    this.worldOf(p)?.toast(p, text, kind);
  }
  history(p: PlayerEntity, type: string, text: string) {
    this.worldOf(p)?.history(p, type, text);
  }
  dropBaker(p: PlayerEntity) {
    this.worldOf(p)?.dropBaker(p);
  }
  playerById(id: string) {
    for (const w of this.worlds) {
      const p = w.playerById(id);
      if (p) return p;
    }
    return undefined;
  }
  npcList(p: PlayerEntity) {
    return this.worldOf(p)?.npcs.list ?? new Map();
  }
}
