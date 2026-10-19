/**
 * Controles de toque (celular/tablet): joystick virtual, botões de ação e menu.
 * Ativado automaticamente em telas de toque; no PC nada disso aparece.
 */
import { h, root } from "./dom";

/** Lido pela WorldScene a cada quadro. */
export const touchInput = { dx: 0, dy: 0, run: false };

export const isTouch: boolean =
  typeof window !== "undefined" &&
  // ?touch=1 força os controles de toque (testar no PC); ?touch=0 desliga (tablet com teclado)
  (/[?&]touch=1/.test(location.search) ||
    (!/[?&]touch=0/.test(location.search) &&
      (("ontouchstart" in window) || (navigator.maxTouchPoints ?? 0) > 0) &&
      window.matchMedia?.("(pointer: coarse)").matches !== false));

export interface TouchActions {
  interact(): void;
  attack(): void;
  drop(): void;
  sit(): void;
  celebrate(): void;
  panel(id: string): void;
  chat(): void;
  /** modo decoração ativo? */
  building(): boolean;
  toggleRemove(): boolean;
  stopBuild(): void;
}

let buildBar: HTMLElement | null = null;

export function initTouch(actions: TouchActions) {
  if (!isTouch) return;
  document.body.classList.add("touch");
  const r = root();

  // ------------------------------------------------------------------ joystick
  const knob = h("div", { class: "joy-knob" });
  const joy = h("div", { class: "joy" }, knob);
  let joyId: number | null = null;
  let cx = 0;
  let cy = 0;
  const R = 52;
  const setKnob = (x: number, y: number) => (knob.style.transform = `translate(${x}px, ${y}px)`);
  const reset = () => {
    joyId = null;
    touchInput.dx = 0;
    touchInput.dy = 0;
    touchInput.run = false;
    setKnob(0, 0);
    joy.classList.remove("on", "run");
  };
  const move = (e: PointerEvent) => {
    let x = e.clientX - cx;
    let y = e.clientY - cy;
    const d = Math.hypot(x, y);
    if (d > R) {
      x = (x / d) * R;
      y = (y / d) * R;
    }
    setKnob(x, y);
    const m = Math.min(1, d / R);
    if (m < 0.22) {
      touchInput.dx = 0;
      touchInput.dy = 0;
    } else {
      touchInput.dx = x / R;
      touchInput.dy = y / R;
    }
    touchInput.run = m > 0.95 && d > R * 1.25; // empurrar além da borda = correr
    joy.classList.toggle("run", touchInput.run);
  };
  joy.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    joyId = e.pointerId;
    joy.setPointerCapture(e.pointerId);
    const b = joy.getBoundingClientRect();
    cx = b.left + b.width / 2;
    cy = b.top + b.height / 2;
    joy.classList.add("on");
    move(e);
  });
  joy.addEventListener("pointermove", (e) => e.pointerId === joyId && move(e));
  joy.addEventListener("pointerup", (e) => e.pointerId === joyId && reset());
  joy.addEventListener("pointercancel", reset);
  window.addEventListener("blur", reset);

  // ------------------------------------------------------------------ botões de ação
  const btn = (cls: string, label: string, title: string, fn: () => void) => {
    const b = h("button", { class: "tbtn " + cls, title, "aria-label": title }, label);
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      b.classList.add("down");
      fn();
    });
    const up = () => b.classList.remove("down");
    b.addEventListener("pointerup", up);
    b.addEventListener("pointercancel", up);
    b.addEventListener("pointerleave", up);
    return b;
  };
  const pad = h("div", { class: "tpad" },
    btn("act", "E", "Interagir / falar", actions.interact),
    btn("atk", "⚔", "Atacar", actions.attack),
    btn("mini drop", "Q", "Soltar baker / devolver pacote", actions.drop),
    btn("mini sit", "🪑", "Sentar", actions.sit),
    btn("mini cel", "🎉", "Comemorar", actions.celebrate),
  );

  // ------------------------------------------------------------------ menu
  const menuItems: [string, string, () => void][] = [
    ["🎒", "Inventário", () => actions.panel("inv")],
    ["📜", "Missões", () => actions.panel("missions")],
    ["⭐", "Perfil", () => actions.panel("skills")],
    ["🗺️", "Mapa", () => actions.panel("map")],
    ["💬", "Chat", () => actions.chat()],
    ["📊", "Indicadores", () => document.body.classList.toggle("show-kpi")],
    ["❓", "Ajuda", () => actions.panel("help")],
    ["⛶", "Tela cheia", () => fullscreen()],
  ];
  if (!canFullscreen()) menuItems.pop(); // iPhone: não existe tela cheia para sites
  const menuHead = h("div", { class: "tmenu-head" });
  const menu = h("div", { class: "tmenu hidden" },
    menuHead,
    ...menuItems.map(([icon, label, fn]) =>
      h("button", { class: "tmenu-item", onclick: () => {
        menu.classList.add("hidden");
        fn();
      } }, h("span", {}, icon), h("small", {}, label)),
    ),
  );
  const menuBtn = h("button", { class: "tmenu-btn", "aria-label": "Menu", onclick: () => {
    // o indicador da sala (nome, pessoas, código, trocar) fica dentro do menu no celular
    const room = document.querySelector(".hud-room");
    if (room && room.parentElement !== menuHead) menuHead.appendChild(room);
    menu.classList.toggle("hidden");
  } }, "☰");
  // tocar fora do menu fecha
  document.addEventListener("pointerdown", (e) => {
    if (!menu.classList.contains("hidden") && !menu.contains(e.target as Node) && e.target !== menuBtn) menu.classList.add("hidden");
  }, true);

  // ------------------------------------------------------------------ barra do modo decoração
  const removeBtn = h("button", { class: "btn small", onclick: () => removeBtn.classList.toggle("on", actions.toggleRemove()) }, "🗑️ Modo remover");
  buildBar = h("div", { class: "tbuild hidden" },
    h("span", {}, "Toque no chão para colocar"),
    removeBtn,
    h("button", { class: "btn small primary", onclick: () => actions.stopBuild() }, "✔ Pronto"),
  );
  setInterval(() => {
    const on = actions.building();
    buildBar!.classList.toggle("hidden", !on);
    document.body.classList.toggle("building", on);
    if (!on) removeBtn.classList.remove("on");
  }, 250);

  // aviso de orientação (o jogo funciona em pé, mas deitado fica melhor)
  const rotate = h("div", { class: "trotate" }, "📱↻ Dica: deite o celular para ver mais do mapa");
  setTimeout(() => rotate.remove(), 7000);

  r.append(joy, pad, menuBtn, menu, buildBar, rotate);
}

export const isIOS =
  typeof navigator !== "undefined" &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && (navigator.maxTouchPoints ?? 0) > 1));

/** Aberto como app (ícone na tela de início): já é tela cheia. */
export function isStandalone() {
  return window.matchMedia?.("(display-mode: fullscreen), (display-mode: standalone)").matches || (navigator as any).standalone === true;
}

export function canFullscreen() {
  const el = document.documentElement as any;
  return !!(el.requestFullscreen ?? el.webkitRequestFullscreen) && !/iPhone|iPod/.test(navigator.userAgent);
}

function isFull() {
  return !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
}

export function fullscreen(force?: boolean) {
  const el = document.documentElement as any;
  const req = el.requestFullscreen ?? el.webkitRequestFullscreen;
  if (!isFull() && req) {
    try {
      Promise.resolve(req.call(el, { navigationUI: "hide" }))
        .then(() => (screen.orientation as any)?.lock?.("landscape").catch(() => {}))
        .catch(() => {});
    } catch {
      /* navegador sem suporte */
    }
  } else if (isFull() && !force) document.exitFullscreen?.().catch(() => {});
}

/**
 * Celular: entra em tela cheia no primeiro toque (o navegador só permite depois de um toque).
 * No iPhone o Safari não deixa sites ficarem em tela cheia; lá mostramos como instalar o jogo
 * na tela de início, que abre sem as barras do navegador.
 */
export function initAutoFullscreen() {
  if (!isTouch || isStandalone()) return;
  if (canFullscreen()) {
    const go = () => {
      if (!isFull()) fullscreen(true);
    };
    document.addEventListener("pointerup", go, true);
    return;
  }
  if (isIOS) {
    let seen = false;
    try {
      seen = localStorage.getItem("mw.iosTip") === "1";
    } catch {
      /* sem storage */
    }
    if (seen) return;
    const tip = h("div", { class: "ios-tip" },
      h("b", {}, "📲 Jogar em tela cheia no iPhone"),
      h("span", {}, "Toque em ", h("b", {}, "Compartilhar ⬆️"), " → ", h("b", {}, "Adicionar à Tela de Início"), ". Depois abra o MELI WORLD pelo ícone: ele abre sem as abas e barras do Safari."),
      h("button", { class: "btn small primary", onclick: () => {
        tip.remove();
        try {
          localStorage.setItem("mw.iosTip", "1");
        } catch {
          /* sem storage */
        }
      } }, "Entendi"),
    );
    document.body.appendChild(tip);
  }
}
