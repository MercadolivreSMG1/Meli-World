/** Conexão: multiplayer (Colyseus) ou modo solo (World rodando no próprio navegador). */
import { Client } from "colyseus.js";
import { DEFAULT_PORT } from "@shared/index";

const env: Record<string, any> = (import.meta as any).env ?? {};

export function serverUrl(): string {
  if (env.VITE_SERVER_URL) return env.VITE_SERVER_URL as string;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  // em dev o Vite roda na 5173 e o servidor na 2567; em produção o servidor entrega o cliente
  if (env.DEV) return `${proto}://${location.hostname}:${DEFAULT_PORT}`;
  return `${proto}://${location.host}`;
}

/** Existe servidor multiplayer acessível? (no GitHub Pages a resposta é não → só modo solo) */
export async function probeServer(timeoutMs = 2500): Promise<boolean> {
  if (env.VITE_SOLO === "1") return false;
  const http = serverUrl().replace(/^ws/, "http").replace(/\/$/, "") + "/api/health";
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const r = await fetch(http, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return false;
    const j = await r.json().catch(() => null);
    return !!j?.ok;
  } catch {
    return false;
  }
}

type Handler = (msg: any) => void;

/** Interface mínima comum entre a Room do colyseus.js e a LocalRoom. */
export interface RoomLike {
  sessionId: string;
  state: any;
  onMessage(type: string, cb: (m: any) => void): void;
  onStateChange(cb: (s: any) => void): void;
  onLeave(cb: (code: number) => void): void;
  onError(cb: (code: number, message?: string) => void): void;
  send(type: string, msg?: any): void;
}

const MESSAGE_TYPES = [
  "welcome", "profile", "toast", "dialog", "minigame", "chat", "fx", "xp", "levelUp", "missionComplete",
  "correct", "board", "openCreator", "kpiData", "shop", "market", "mp", "plot", "realty", "coins", "hurt",
];

export class Net {
  room: RoomLike | null = null;
  sid = "";
  mode: "online" | "solo" = "online";
  private handlers = new Map<string, Handler[]>();

  on(type: string, h: Handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type)!.push(h);
  }

  private emit(type: string, msg: any) {
    for (const h of this.handlers.get(type) ?? []) h(msg);
  }

  private attach(room: RoomLike) {
    this.room = room;
    this.sid = room.sessionId;
    for (const type of MESSAGE_TYPES) room.onMessage(type, (m: any) => this.emit(type, m));
    room.onLeave((code: number) => this.emit("disconnect", { code }));
    room.onError((code: number, message?: string) => this.emit("error", { code, message }));
  }

  async connect(options: { token: string; name: string; look: unknown }): Promise<RoomLike> {
    const client = new Client(serverUrl());
    const room = (await client.joinOrCreate("world", options)) as unknown as RoomLike;
    this.mode = "online";
    this.attach(room);
    return room;
  }

  /** Modo solo: carrega o motor do jogo sob demanda e roda tudo localmente. */
  async connectLocal(options: { token: string; name: string; look: unknown }): Promise<RoomLike> {
    const { LocalRoom } = await import("./LocalRoom");
    const room = new LocalRoom();
    this.mode = "solo";
    this.attach(room);
    await room.join(options);
    return room;
  }

  send(type: string, msg: unknown = {}) {
    this.room?.send(type, msg);
  }
}

export const net = new Net();
