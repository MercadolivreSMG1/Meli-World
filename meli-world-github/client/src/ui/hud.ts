/** HUD: status, KPIs, rastreador de missões, hotbar, chat, toasts e prompt de interação. */
import type { Profile } from "@shared/index";
import { formatClock, ITEMS, MISSION_BY_ID, routeLabel, shiftName, dayOf } from "@shared/index";
import { renderPortrait } from "../art/character";
import { net } from "../net/Net";
import { bus, store } from "../store";
import { iconUrl } from "../game/Textures";
import { clear, h, root } from "./dom";

let els: Record<string, HTMLElement> = {};
let typing = false;

export function isTyping() {
  return typing;
}

export function initHud() {
  const r = root();
  els.status = h("div", { class: "hud-status panel" });
  els.kpi = h("div", { class: "hud-kpi panel" });
  els.tracker = h("div", { class: "hud-tracker" });
  els.hotbar = h("div", { class: "hud-hotbar" });
  els.carry = h("div", { class: "hud-carry" });
  els.prompt = h("div", { class: "hud-prompt hidden" });
  els.toasts = h("div", { class: "toasts" });
  els.zone = h("div", { class: "hud-zone" });
  els.alert = h("div", { class: "hud-alert hidden" });
  els.help = h("div", { class: "hud-keys" }, "WASD mover · Shift correr · E interagir · Q soltar · C comemorar · X sentar · I inventário · J missões · K habilidades · M mapa · H ajuda · Enter chat");
  const log = h("div", { class: "chat-log" });
  const input = h("input", { class: "chat-input", maxlength: 140, placeholder: "Enter para conversar…" }) as HTMLInputElement;
  input.addEventListener("focus", () => (typing = true));
  input.addEventListener("blur", () => (typing = false));
  input.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      const t = input.value.trim();
      if (t) net.send("chat", { text: t });
      input.value = "";
      input.blur();
    } else if (e.key === "Escape") input.blur();
  });
  els.chatLog = log;
  els.chatInput = input;
  els.chat = h("div", { class: "chat" }, log, input);
  r.append(els.status, els.kpi, els.zone, els.alert, els.tracker, els.carry, els.hotbar, els.prompt, els.toasts, els.chat, els.help);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !typing && !document.querySelector(".modal-bg") && !document.querySelector(".dialog")) {
      e.preventDefault();
      input.focus();
    }
  });
}

export function addChat(from: string, text: string, system = false) {
  const log = els.chatLog;
  if (!log) return;
  log.appendChild(h("div", { class: "chat-line" + (system ? " sys" : "") }, system ? "" : h("b", {}, from + ": "), text));
  while (log.children.length > 40) log.removeChild(log.firstChild!);
  log.scrollTop = log.scrollHeight;
}

export function toast(text: string, kind = "info") {
  if (!els.toasts) return;
  const t = h("div", { class: `toast ${kind}` }, text);
  els.toasts.appendChild(t);
  setTimeout(() => t.classList.add("out"), kind === "bad" || kind === "warn" ? 5200 : 3800);
  setTimeout(() => t.remove(), kind === "bad" || kind === "warn" ? 5800 : 4400);
  while (els.toasts.children.length > 6) els.toasts.removeChild(els.toasts.firstChild!);
}

export function setPrompt(text: string | null) {
  if (!els.prompt) return;
  if (!text) els.prompt.classList.add("hidden");
  else {
    els.prompt.textContent = "";
    els.prompt.append(h("span", { class: "key" }, "E"), " " + text);
    els.prompt.classList.remove("hidden");
  }
}

export function setBanner(text: string | null) {
  let el = document.querySelector<HTMLElement>(".hud-banner");
  if (!el) {
    el = h("div", { class: "hud-banner hidden" });
    root().appendChild(el);
  }
  if (!text) el.classList.add("hidden");
  else {
    el.textContent = text;
    el.classList.remove("hidden");
  }
}

export function setZone(name: string) {
  if (els.zone && els.zone.textContent !== name) els.zone.textContent = name;
}

function bar(cls: string, value: number, max: number, label: string) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return h("div", { class: `bar ${cls}` }, h("div", { class: "bar-fill", style: { width: pct + "%" } }), h("span", {}, label));
}

let portraitKey = "";
let portrait: HTMLCanvasElement | null = null;

export function updateStatus(p: Profile, clock: number, lookJson: string, equipJson: string) {
  if (!els.status) return;
  const key = lookJson + equipJson;
  if (key !== portraitKey && lookJson) {
    portraitKey = key;
    try {
      const b = renderPortrait(JSON.parse(lookJson), JSON.parse(equipJson || "{}"));
      // recorta só cabeça/ombros
      const full = b.toCanvas();
      const c = document.createElement("canvas");
      c.width = 16 * 4;
      c.height = 16 * 4;
      const ctx = c.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(full, 0, 2, 16, 16, 0, 0, 64, 64);
      portrait = c;
    } catch {
      /* ignore */
    }
  }
  clear(els.status);
  els.status.append(
    h("div", { class: "status-top" },
      h("div", { class: "portrait" }, portrait ?? ""),
      h("div", { class: "status-info" },
        h("div", { class: "status-name" }, p.name, h("span", { class: "lvl" }, `Nv ${p.level}`)),
        h("div", { class: "status-title" }, p.title),
        bar("xp", p.xpThisLevel, p.xpToNext, `XP ${p.xpThisLevel}/${p.xpToNext}`),
      ),
    ),
    bar("hp" + (p.hp < 30 ? " low" : ""), p.hp, p.maxHp || 100, `Vida ${p.hp}/${p.maxHp || 100}`),
    bar("energy", p.energy, 100, `Energia ${p.energy}`),
    bar("battery" + (p.battery < 20 ? " low" : ""), p.battery, 100, `Coletor ${p.equipped.coletor ? p.battery + "%" : "—"}`),
    h("div", { class: "status-coins" }, h("img", { src: iconUrl("coins", 2) }), h("b", {}, `${(p.coins ?? 0).toLocaleString("pt-BR")} M$`), p.savings ? h("small", {}, ` · Cofrinho ${p.savings.toLocaleString("pt-BR")} M$`) : null),
    h("div", { class: "status-clock" },
      h("span", {}, `Dia ${dayOf(clock)} · ${formatClock(clock)}`),
      h("span", { class: "shift" }, shiftName(clock)),
    ),
    h("div", { class: "status-flags" },
      h("span", { class: "flag " + (p.clockedIn ? "ok" : "no") }, p.clockedIn ? "Ponto ✔" : "Sem ponto"),
      h("span", { class: "flag " + (p.equipped.epiVest && p.equipped.safetyShoes ? "ok" : "no") }, p.equipped.epiVest && p.equipped.safetyShoes ? "EPI ✔" : "Sem EPI"),
      p.skillPoints ? h("span", { class: "flag pts" }, `+${p.skillPoints} pts (K)`) : null,
    ),
  );
}

export function updateClockOnly(clock: number) {
  const c = els.status?.querySelector(".status-clock span");
  if (c) c.textContent = `Dia ${dayOf(clock)} · ${formatClock(clock)}`;
}

export function updateKpi(ops: any) {
  if (!els.kpi || !ops) return;
  clear(els.kpi);
  const green = ops.greenRate ?? 100;
  els.kpi.append(
    h("div", { class: "kpi-title" }, "SMG1 · ao vivo"),
    h("div", { class: "kpi-grid" },
      h("div", {}, h("b", {}, String(ops.backlog)), h("small", {}, "flowrack")),
      h("div", { class: green >= 98 ? "good" : green >= 92 ? "warn" : "bad" }, h("b", {}, green.toFixed(1) + "%"), h("small", {}, "telas verdes")),
      h("div", { class: ops.goleiro > 20 ? "bad" : "" }, h("b", {}, String(ops.goleiro)), h("small", {}, "goleiro")),
      h("div", {}, h("b", {}, `${ops.dispatched}`), h("small", {}, `rotas · ${ops.late} atras.`)),
    ),
  );
  if (ops.alert) {
    els.alert.textContent = "⚠ " + ops.alert;
    els.alert.classList.remove("hidden");
  } else els.alert.classList.add("hidden");
}

export function updateTracker(p: Profile) {
  if (!els.tracker) return;
  clear(els.tracker);
  if (!p.activeMissions.length) {
    els.tracker.append(h("div", { class: "tracker-card muted" }, "Sem missões ativas. Procure NPCs com ", h("b", {}, "!"), " ou o Quadro de Missões."));
    return;
  }
  const tracked = p.activeMissions.find((m) => m.id === store.trackedMission) ?? p.activeMissions[0];
  const ordered = tracked ? [tracked, ...p.activeMissions.filter((m) => m !== tracked)] : p.activeMissions;
  for (const m of ordered.slice(0, 4)) {
    const def = MISSION_BY_ID[m.id];
    if (!def) continue;
    const isTracked = m === tracked;
    const timer = m.deadline !== undefined ? h("span", { class: "timer", "data-deadline": m.deadline }, "") : null;
    els.tracker.append(
      h("div", { class: "tracker-card" + (def.special ? " special" : "") + (isTracked ? " tracked" : ""), title: isTracked ? "Missão rastreada" : "Clique para rastrear esta missão", onclick: () => {
        store.trackedMission = m.id;
        updateTracker(p);
      } },
        h("div", { class: "tracker-title" }, isTracked ? "📍 " : "", def.title, timer),
        isTracked ? h("div", { class: "tracker-next" }, "") : null,
        ...def.objectives.map((o) => {
          const v = m.progress[o.id] ?? 0;
          return h("div", { class: "tracker-obj" + (v >= o.count ? " done" : "") }, `${v >= o.count ? "✔" : "•"} ${o.text} `, h("span", {}, `${v}/${o.count}`));
        }),
      ),
    );
  }
}

/** Linha "Próximo passo" da missão rastreada (vem do Guia). */
export function setGuide(info: { text: string; where: string; dist: number; missionId: string; title: string } | null) {
  const el = els.tracker?.querySelector<HTMLElement>(".tracker-next");
  const txt = info ? `➜ ${info.text}${info.where ? " · " + info.where : ""} (${Math.round(info.dist / 16)} m)` : "";
  if (el) {
    if (el.textContent !== txt) el.textContent = txt;
  } else if (info && !info.missionId && els.tracker) {
    // sem missão ativa: dica de onde pegar uma
    const muted = els.tracker.querySelector<HTMLElement>(".tracker-card.muted");
    if (muted) muted.textContent = `➜ ${info.text} (${Math.round(info.dist / 16)} m) — siga a trilha dourada`;
  }
}

export function hurtFlash() {
  let el = document.querySelector<HTMLElement>(".hurt-flash");
  if (!el) {
    el = h("div", { class: "hurt-flash" });
    document.body.appendChild(el);
  }
  el.classList.remove("on");
  void el.offsetWidth;
  el.classList.add("on");
}

export function tickTimers(clock: number) {
  els.tracker?.querySelectorAll<HTMLElement>(".timer").forEach((t) => {
    const left = Math.max(0, Number(t.dataset.deadline) - clock);
    t.textContent = ` ⏱ ${Math.floor(left)}min`;
    t.classList.toggle("bad", left < 10);
  });
}

/** Ordem da hotbar: armas, armaduras, comida/cura, EPIs; loot e decoração ficam no inventário (I). */
function hotbarItems(p: Profile) {
  const rank = (id: string) => {
    const d = ITEMS[id];
    if (!d) return 9;
    if (d.equip === "weapon") return 0;
    if (d.equip === "armor") return 1;
    if (d.consumable) return 2;
    if (d.equip) return 3;
    if (d.decor) return 5;
    return 4;
  };
  return p.inventory.filter((i) => ITEMS[i.id]).sort((a, b) => rank(a.id) - rank(b.id));
}

export function updateHotbar(p: Profile) {
  if (!els.hotbar) return;
  clear(els.hotbar);
  const items = hotbarItems(p);
  for (let i = 0; i < 10; i++) {
    const it = items[i];
    const def = it ? ITEMS[it.id] : null;
    const equipped = def?.equip ? (def.equip === "weapon" || def.equip === "armor" ? (p.equipped as any)[def.equip] === it.id : !!(p.equipped as any)[def.equip]) : false;
    const slot = h("div", { class: "slot" + (equipped ? " equipped" : ""), title: def ? `${def.name}\n${def.desc}${def.equip ? "\n(clique para equipar/desequipar)" : def.consumable ? "\n(clique para usar)" : ""}` : "" },
      h("span", { class: "slot-key" }, String((i + 1) % 10)),
      def ? h("img", { src: iconUrl(it.id), draggable: "false" }) : null,
      it && it.qty > 1 ? h("span", { class: "qty" }, String(it.qty)) : null,
    );
    if (def) slot.onclick = () => net.send("action", { type: def.equip ? "equip" : "use", itemId: it.id });
    els.hotbar.appendChild(slot);
  }
  // pacotes nas mãos
  clear(els.carry);
  if (p.carrying.length) {
    els.carry.append(
      h("div", { class: "carry-title" }, `Nas mãos (${p.carrying.length}/3)`),
      ...p.carrying.map((c) => h("div", { class: "carry-pkg" }, h("span", { class: `isl isl-${c.island}` }, c.route), " ", routeLabel(c.route).split("· ")[1] ?? "", c.size !== "sortable" ? " · VOLUMOSO" : "")),
    );
  }
}

export function useHotbarKey(n: number) {
  const p = store.profile;
  if (!p) return;
  const items = hotbarItems(p);
  const it = items[n];
  if (!it) return;
  const def = ITEMS[it.id];
  net.send("action", { type: def.equip ? "equip" : "use", itemId: it.id });
}

bus.on("profile", (p: Profile) => {
  updateTracker(p);
  updateHotbar(p);
});
