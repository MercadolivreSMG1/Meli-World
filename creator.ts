/** Criador de personagem completo, com prévia animada em tempo real. */
import type { AnimName, Appearance } from "@shared/index";
import {
  CLOTH_COLORS, colorKeyCount, EYE_COLORS, HAIR_COLORS, LABELS, mulberry32, OPTIONS, randomAppearance, SKIN_TONES,
} from "@shared/index";
import { ANIM_FRAMES, renderPortrait } from "../art/character";
import { clear, h, root } from "./dom";

const NICE: Record<string, string> = {
  bone_aba_reta: "Boné aba reta", bone: "Boné", black_power: "Black power", rabo_cavalo: "Rabo de cavalo",
  medio: "Médio", nenhum: "Nenhum", nenhuma: "Nenhuma", sorrisao: "Sorrisão", seguranca: "Segurança",
  relogio: "Relógio", lider: "Colete de líder", refletivo: "Colete refletivo", calca: "Calça", sapatenis: "Sapatênis",
  tenis: "Tênis", uniforme: "Uniforme MELI", xadrez: "Camisa xadrez", social: "Camisa social", regata: "Regata",
  moletom: "Moletom", camiseta: "Camiseta", polo: "Polo", trancas: "Tranças", chanel: "Chanel", franja: "Franja",
  serio: "Sério", pontudo: "Pontudo", sonolentos: "Sonolentos", sorridentes: "Sorridentes", puxados: "Puxados",
  cavanhaque: "Cavanhaque", costeleta: "Costeleta", chevron: "Chevron", bandana: "Bandana", capacete: "Capacete",
  touca: "Touca", escuro: "Escuro (sol)", pochete: "Pochete", fone: "Fone de ouvido", colar: "Colar", brincos: "Brincos",
  jaqueta: "Jaqueta", magro: "Magro", forte: "Forte", baixo: "Baixo", alto: "Alto", quadrado: "Quadrado",
};

export function nice(v: string): string {
  return NICE[v] ?? v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " ");
}

const TABS: { id: string; name: string; keys: string[] }[] = [
  { id: "corpo", name: "Corpo", keys: ["skin", "height", "body"] },
  { id: "rosto", name: "Rosto", keys: ["face", "eyes", "eyeColor", "brows", "nose", "mouth"] },
  { id: "cabelo", name: "Cabelo", keys: ["hair", "hairColor", "beard", "mustache", "facialColor"] },
  { id: "roupas", name: "Roupas", keys: ["top", "topColor", "vest", "vestColor", "bottom", "bottomColor", "shoes", "shoesColor"] },
  { id: "acess", name: "Acessórios", keys: ["hat", "hatColor", "glasses", "badge", "backpack", "backpackColor", "accessory"] },
];

function paletteFor(key: string): readonly string[] {
  if (key === "skin") return SKIN_TONES;
  if (key === "eyeColor") return EYE_COLORS;
  if (key === "hairColor" || key === "facialColor") return HAIR_COLORS;
  return CLOTH_COLORS;
}

export interface CreatorOptions {
  look: Appearance;
  name: string;
  mode: "new" | "edit";
  onDone: (look: Appearance, name: string) => void;
  onCancel?: () => void;
}

export function openCreator(opts: CreatorOptions) {
  const look: Appearance = { ...opts.look };
  let dir = "down";
  let anim: AnimName = "walk";
  let epi = false;
  let tab = TABS[0].id;
  let frame = 0;

  const preview = h("canvas", { class: "creator-preview", width: 16 * 9, height: 32 * 9 });
  const pctx = preview.getContext("2d")!;
  pctx.imageSmoothingEnabled = false;
  const thumbs = h("div", { class: "creator-thumbs" });
  const body = h("div", { class: "creator-options" });
  const tabsEl = h("div", { class: "tabs" });
  const nameInput = h("input", { class: "input", maxlength: 18, placeholder: "Seu nome no crachá", value: opts.name }) as HTMLInputElement;

  const draw = () => {
    const b = renderPortrait(look, { epiVest: epi, safetyShoes: epi, coletor: epi }, dir, anim, frame % ANIM_FRAMES[anim]);
    const c = b.toCanvas();
    pctx.clearRect(0, 0, preview.width, preview.height);
    pctx.imageSmoothingEnabled = false;
    pctx.drawImage(c, 0, 0, preview.width, preview.height);
  };
  const drawThumbs = () => {
    clear(thumbs);
    for (const d of ["down", "left", "up", "right"]) {
      const c = renderPortrait(look, { epiVest: epi, safetyShoes: epi, coletor: false }, d, "idle", 0).toCanvas(3);
      c.className = "thumb" + (d === dir ? " on" : "");
      c.onclick = () => {
        dir = d;
        drawThumbs();
        draw();
      };
      thumbs.appendChild(c);
    }
  };
  const timer = window.setInterval(() => {
    frame++;
    draw();
  }, 140);

  const renderTabs = () => {
    clear(tabsEl);
    for (const t of TABS)
      tabsEl.appendChild(
        h("button", { class: "tab" + (t.id === tab ? " on" : ""), onclick: () => {
          tab = t.id;
          renderTabs();
          renderOptions();
        } }, t.name),
      );
  };

  const renderOptions = () => {
    clear(body);
    const t = TABS.find((x) => x.id === tab)!;
    for (const key of t.keys) {
      const row = h("div", { class: "opt-row" }, h("div", { class: "opt-label" }, LABELS[key] ?? key));
      if (key === "badge") {
        row.appendChild(
          h("button", { class: "btn small" + (look.badge ? " on" : ""), onclick: () => {
            look.badge = !look.badge;
            renderOptions();
            update();
          } }, look.badge ? "Com crachá" : "Sem crachá"),
        );
      } else if (colorKeyCount(key) > 0) {
        const sw = h("div", { class: "swatches" });
        paletteFor(key).forEach((col, i) => {
          sw.appendChild(
            h("button", {
              class: "swatch" + ((look as any)[key] === i ? " on" : ""), style: { background: col }, title: col, onclick: () => {
                (look as any)[key] = i;
                renderOptions();
                update();
              },
            }),
          );
        });
        row.appendChild(sw);
      } else {
        const list = (OPTIONS as any)[key] as readonly string[];
        const cur = (look as any)[key] as string;
        const idx = list.indexOf(cur);
        const set = (d: number) => {
          (look as any)[key] = list[(idx + d + list.length) % list.length];
          renderOptions();
          update();
        };
        row.appendChild(
          h("div", { class: "stepper" },
            h("button", { class: "btn small", onclick: () => set(-1) }, "◀"),
            h("span", { class: "stepper-val" }, nice(cur)),
            h("button", { class: "btn small", onclick: () => set(1) }, "▶"),
          ),
        );
      }
      body.appendChild(row);
    }
  };

  const update = () => {
    draw();
    drawThumbs();
  };

  const animSel = h("div", { class: "anim-buttons" },
    ...([["walk", "Andar"], ["run", "Correr"], ["carry", "Carregar"], ["push", "Empurrar"], ["scan", "Coletor"], ["celebrate", "Comemorar"], ["sit", "Sentar"], ["work", "Trabalhar"], ["idle", "Parado"]] as [AnimName, string][]).map(([a, label]) =>
      h("button", { class: "btn small", onclick: () => {
        anim = a;
        frame = 0;
        draw();
      } }, label),
    ),
  );

  const close = () => {
    window.clearInterval(timer);
    overlay.remove();
  };

  const overlay = h("div", { class: "modal-bg creator-bg" },
    h("div", { class: "panel creator" },
      h("div", { class: "panel-title" }, opts.mode === "new" ? "Crie seu personagem" : "Espelho · personalizar visual"),
      h("div", { class: "creator-grid" },
        h("div", { class: "creator-left" },
          preview,
          thumbs,
          animSel,
          h("div", { class: "row" },
            h("button", { class: "btn", onclick: () => {
              Object.assign(look, randomAppearance(mulberry32((Math.random() * 1e9) | 0)));
              renderOptions();
              update();
            } }, "Aleatório"),
            h("button", { class: "btn", onclick: (e: Event) => {
              epi = !epi;
              (e.target as HTMLElement).classList.toggle("on", epi);
              update();
            } }, "Ver com EPI"),
          ),
        ),
        h("div", { class: "creator-right" },
          opts.mode === "new" ? h("div", { class: "opt-row" }, h("div", { class: "opt-label" }, "Nome"), nameInput) : null,
          tabsEl,
          body,
        ),
      ),
      h("div", { class: "row end" },
        opts.mode === "edit" ? h("button", { class: "btn", onclick: () => {
          close();
          opts.onCancel?.();
        } }, "Cancelar") : null,
        h("button", { class: "btn primary", onclick: () => {
          const name = nameInput.value.trim();
          if (opts.mode === "new" && name.length < 2) {
            nameInput.focus();
            nameInput.classList.add("shake");
            setTimeout(() => nameInput.classList.remove("shake"), 400);
            return;
          }
          close();
          opts.onDone(look, name || opts.name);
        } }, opts.mode === "new" ? "Entrar no SMG1 →" : "Salvar visual"),
      ),
    ),
  );
  root().appendChild(overlay);
  renderTabs();
  renderOptions();
  update();
  if (opts.mode === "new") setTimeout(() => nameInput.focus(), 50);
}
