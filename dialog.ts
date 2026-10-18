/** Caixa de diálogo estilo RPG com retrato do NPC, digitação e escolhas. */
import type { DialogMessage } from "@shared/index";
import { renderPortrait } from "../art/character";
import { net } from "../net/Net";
import { h, root } from "./dom";

export const lookProvider: { npc: (id: string) => string | null } = { npc: () => null };

let current: HTMLElement | null = null;
let advance: (() => void) | null = null;

export function dialogOpen() {
  return !!current;
}

export function dialogAdvance() {
  advance?.();
}

export function closeDialog() {
  current?.remove();
  current = null;
  advance = null;
}

function portraitFor(npcId: string): HTMLElement {
  const look = npcId ? lookProvider.npc(npcId) : null;
  if (!look) return h("div", { class: "dlg-portrait empty" });
  try {
    const full = renderPortrait(JSON.parse(look), { epiVest: false, safetyShoes: true, coletor: false }).toCanvas();
    const c = document.createElement("canvas");
    c.width = 96;
    c.height = 96;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(full, 0, 1, 16, 16, 0, 0, 96, 96);
    return h("div", { class: "dlg-portrait" }, c);
  } catch {
    return h("div", { class: "dlg-portrait empty" });
  }
}

export function showDialog(d: DialogMessage, onChoice?: (id: string) => void) {
  closeDialog();
  let i = 0;
  const text = h("div", { class: "dlg-text" });
  const choices = h("div", { class: "dlg-choices" });
  const hint = h("div", { class: "dlg-hint" }, "Clique ou E para continuar");
  let typing: number | null = null;
  const showLine = () => {
    const line = d.lines[i] ?? "";
    text.textContent = "";
    let k = 0;
    if (typing) clearInterval(typing);
    typing = window.setInterval(() => {
      k += 2;
      text.textContent = line.slice(0, k);
      if (k >= line.length && typing) {
        clearInterval(typing);
        typing = null;
      }
    }, 16);
    const last = i >= d.lines.length - 1;
    choices.innerHTML = "";
    hint.style.display = last ? "none" : "";
    if (last) {
      const list = d.choices.length ? d.choices : [{ id: "bye", text: "Ok!" }];
      list.forEach((c, n) =>
        choices.appendChild(
          h("button", { class: "btn choice", onclick: () => {
            closeDialog();
            if (onChoice) onChoice(c.id);
            else if (c.id !== "bye") net.send("dialog", { npcId: d.npcId, choice: c.id });
          } }, `${n + 1}. ${c.text}`),
        ),
      );
    }
  };
  advance = () => {
    const line = d.lines[i] ?? "";
    if (typing) {
      clearInterval(typing);
      typing = null;
      text.textContent = line;
      return;
    }
    if (i < d.lines.length - 1) {
      i++;
      showLine();
    } else {
      const first = choices.querySelector("button") as HTMLButtonElement | null;
      if (d.choices.length <= 1 && first) first.click();
    }
  };
  const box = h("div", { class: "dialog panel", onclick: (e: Event) => {
    if ((e.target as HTMLElement).tagName !== "BUTTON") advance?.();
  } },
    portraitFor(d.npcId),
    h("div", { class: "dlg-body" },
      h("div", { class: "dlg-name" }, d.name, h("span", { class: "dlg-role" }, d.role)),
      text,
      choices,
      hint,
    ),
  );
  current = box;
  root().appendChild(box);
  showLine();
}

/** Atalhos numéricos para escolhas. */
export function dialogChoose(n: number) {
  const btns = current?.querySelectorAll<HTMLButtonElement>(".dlg-choices button");
  btns?.[n]?.click();
}
