/** Estado local do cliente (perfil privado, preferências) + pequeno event bus. */
import type { Appearance, Profile } from "@shared/index";
import { DEFAULT_APPEARANCE, sanitizeAppearance } from "@shared/index";

type Fn = (data?: any) => void;

class Bus {
  private m = new Map<string, Fn[]>();
  on(ev: string, fn: Fn) {
    if (!this.m.has(ev)) this.m.set(ev, []);
    this.m.get(ev)!.push(fn);
  }
  emit(ev: string, data?: any) {
    for (const f of this.m.get(ev) ?? []) f(data);
  }
}

export const bus = new Bus();

function safeGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function safeSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* sem storage: segue em memória */
  }
}

export const store = {
  profile: null as Profile | null,
  sid: "",
  playerId: "",
  trackedMission: "",
  get token(): string {
    let t = safeGet("mw.token");
    if (!t) {
      t = (crypto as any).randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
      safeSet("mw.token", t);
    }
    return t;
  },
  get name(): string {
    return safeGet("mw.name") ?? "";
  },
  set name(v: string) {
    safeSet("mw.name", v);
  },
  get look(): Appearance {
    try {
      const raw = safeGet("mw.look");
      return raw ? sanitizeAppearance(JSON.parse(raw)) : { ...DEFAULT_APPEARANCE };
    } catch {
      return { ...DEFAULT_APPEARANCE };
    }
  },
  set look(v: Appearance) {
    safeSet("mw.look", JSON.stringify(v));
  },
  get hasProfile(): boolean {
    return !!safeGet("mw.look");
  },
};
