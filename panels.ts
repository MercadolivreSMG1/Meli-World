/** Painéis: inventário, missões, habilidades, mapa, ajuda, quadro de missões, conclusão e level up. */
import type { Profile } from "@shared/index";
import {
  getWorld, ITEMS, MISSION_BY_ID, MISSIONS, NPC_BY_ID, PERKS, SKILLS, TILE, TILE_MINIMAP, PROP_DEFS,
} from "@shared/index";
import { renderPortrait } from "../art/character";
import { net } from "../net/Net";
import { store } from "../store";
import { iconUrl } from "../game/Textures";
import { clear, h, root } from "./dom";

let openPanel: { id: string; close: () => void } | null = null;

export function anyModalOpen() {
  return !!document.querySelector(".modal-bg");
}

export function openModal(id: string, title: string, content: HTMLElement, opts: { wide?: boolean; onClose?: () => void; noBackdropClose?: boolean } = {}) {
  if (openPanel) openPanel.close();
  const bg = h("div", { class: "modal-bg", onclick: (e: Event) => {
    if (e.target === bg && !opts.noBackdropClose) close();
  } });
  const panel = h("div", { class: "panel modal" + (opts.wide ? " wide" : "") },
    h("div", { class: "panel-title" }, title, h("button", { class: "close", onclick: () => close() }, "✕")),
    content,
  );
  bg.appendChild(panel);
  root().appendChild(bg);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    bg.remove();
    if (openPanel?.id === id) openPanel = null;
    opts.onClose?.();
  };
  openPanel = { id, close };
  return close;
}

export function closePanel() {
  if (openPanel) {
    openPanel.close();
    return true;
  }
  return false;
}

export function togglePanel(id: string) {
  if (openPanel?.id === id) return closePanel();
  const p = store.profile;
  if (!p) return;
  if (id === "inv") showInventory(p);
  else if (id === "missions") showMissions(p);
  else if (id === "skills") showSkills(p);
  else if (id === "map") showMap();
  else if (id === "help") showHelp();
}

export function refreshOpenPanel() {
  const p = store.profile;
  if (!openPanel || !p) return;
  const id = openPanel.id;
  if (id === "inv" || id === "missions" || id === "skills") {
    openPanel.close();
    togglePanel(id);
  }
}

// ------------------------------------------------------------------ inventário
function showInventory(p: Profile) {
  const grid = h("div", { class: "inv-grid" });
  for (const it of p.inventory) {
    const def = ITEMS[it.id];
    if (!def) continue;
    const equipped = def.equip ? (def.equip === "weapon" || def.equip === "armor" ? (p.equipped as any)[def.equip] === it.id : !!(p.equipped as any)[def.equip]) : false;
    grid.appendChild(
      h("div", { class: "inv-item" + (equipped ? " equipped" : "") },
        h("img", { src: iconUrl(it.id, 4) }),
        h("div", { class: "inv-info" },
          h("b", {}, def.name, it.qty > 1 ? ` x${it.qty}` : ""),
          h("small", {}, def.desc),
          def.equip
            ? h("button", { class: "btn small", onclick: () => net.send("action", { type: "equip", itemId: it.id }) }, equipped ? "Desequipar" : "Equipar")
            : def.consumable
              ? h("button", { class: "btn small", onclick: () => net.send("action", { type: "use", itemId: it.id }) }, "Usar")
              : null,
        ),
      ),
    );
  }
  if (!grid.children.length) grid.appendChild(h("div", { class: "muted" }, "Inventário vazio."));
  openModal("inv", "Inventário", h("div", {}, grid));
}

// ------------------------------------------------------------------ missões
function showMissions(p: Profile) {
  const active = h("div", { class: "mission-list" });
  for (const m of p.activeMissions) {
    const def = MISSION_BY_ID[m.id];
    if (!def) continue;
    const giver = NPC_BY_ID[def.giver]?.name ?? "Quadro de Missões";
    active.appendChild(
      h("div", { class: "mission" + (def.special ? " special" : "") },
        h("div", { class: "mission-head" }, h("b", {}, def.title), h("span", { class: "muted" }, ` · ${giver} · +${def.rewards.xp} XP`)),
        h("div", { class: "mission-sum" }, def.summary),
        ...def.objectives.map((o) => {
          const v = m.progress[o.id] ?? 0;
          return h("div", { class: "tracker-obj" + (v >= o.count ? " done" : "") }, `${v >= o.count ? "✔" : "•"} ${o.text} (${v}/${o.count})`);
        }),
        h("button", { class: "btn small ghost", onclick: () => net.send("mission", { op: "abandon", id: m.id }) }, "Abandonar"),
      ),
    );
  }
  if (!p.activeMissions.length) active.appendChild(h("div", { class: "muted" }, "Nenhuma missão ativa."));
  const avail = h("div", { class: "mission-list" });
  for (const id of p.availableMissions) {
    const def = MISSION_BY_ID[id];
    if (!def) continue;
    const giver = def.giver === "board" ? "Quadro de Missões (hall do administrativo)" : NPC_BY_ID[def.giver]?.name;
    avail.appendChild(h("div", { class: "mission small" + (def.special ? " special" : "") }, h("b", {}, def.title), h("span", { class: "muted" }, ` — fale com ${giver}`)));
  }
  const done = h("div", { class: "muted" }, `${p.completedMissions.length} missões concluídas: ` + p.completedMissions.map((id) => MISSION_BY_ID[id]?.title ?? id).join(" · "));
  openModal("missions", "Missões", h("div", {}, h("h3", {}, "Ativas"), active, h("h3", {}, "Disponíveis"), avail, h("h3", {}, "Concluídas"), done), { wide: true });
}

// ------------------------------------------------------------------ habilidades / perfil
function showSkills(p: Profile) {
  const list = h("div", { class: "skills" });
  for (const s of SKILLS) {
    const lv = p.skills[s.id] ?? 0;
    list.appendChild(
      h("div", { class: "skill" },
        h("div", { class: "skill-head" }, h("b", {}, s.name), h("span", { class: "pips" }, ...Array.from({ length: s.max }, (_, i) => h("i", { class: i < lv ? "on" : "" })))),
        h("small", {}, s.desc),
        h("button", { class: "btn small", disabled: p.skillPoints <= 0 || lv >= s.max ? "disabled" : undefined, onclick: () => net.send("action", { type: "skill", skill: s.id }) }, "+1"),
      ),
    );
  }
  const perks = h("div", { class: "perks" },
    ...(p.perks.length
      ? p.perks.map((id) => h("div", { class: "perk" }, h("b", {}, PERKS[id]?.name ?? id), h("small", {}, PERKS[id]?.desc ?? "")))
      : [h("div", { class: "muted" }, "Habilidades especiais são liberadas nas missões especiais do Índio, da Letícia e do Mateus Ferrari.")]),
  );
  const st = p.stats;
  const stats = h("div", { class: "stats" },
    ...[
      ["Pacotes etiquetados", st.label], ["Pescados", st.fish_correct], ["Telas verdes", st.green], ["Telas laranja", st.orange],
      ["Triagens no goleiro", st.goleiro_correct], ["Incidências PS", st.ps_resolve], ["Auditorias (pacotes)", st.audit_fix],
      ["Bakers fechados", st.baker_closed], ["Rotas despachadas", st.dispatch], ["LH recebidos", st.receive_lh],
    ].map(([k, v]) => h("div", {}, h("span", {}, String(k)), h("b", {}, String(v ?? 0)))),
  );
  const hist = h("div", { class: "history" }, ...p.history.map((e) => h("div", {}, h("small", {}, new Date(e.ts).toLocaleString("pt-BR")), " ", e.text)));
  openModal("skills", `Perfil · ${p.name} · ${p.title}`, h("div", { class: "cols" },
    h("div", {}, h("h3", {}, `Habilidades (${p.skillPoints} pontos)`), list, h("h3", {}, "Habilidades especiais"), perks),
    h("div", {}, h("h3", {}, "Estatísticas"), stats, h("h3", {}, "Histórico"), hist),
  ), { wide: true });
}

// ------------------------------------------------------------------ mapa
let mapBase: HTMLCanvasElement | null = null;
export const mapProvider: { entities: () => { x: number; y: number; color: string; label?: string; me?: boolean }[] } = { entities: () => [] };

function showMap() {
  const w = getWorld();
  const scale = 5;
  if (!mapBase) {
    mapBase = document.createElement("canvas");
    mapBase.width = w.w * scale;
    mapBase.height = w.worldH * scale;
    const ctx = mapBase.getContext("2d")!;
    for (let y = 0; y < w.worldH; y++)
      for (let x = 0; x < w.w; x++) {
        ctx.fillStyle = TILE_MINIMAP[w.ground[y * w.w + x]] ?? "#000";
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    ctx.fillStyle = "rgba(40,30,25,0.55)";
    for (const p of w.props) {
      const d = PROP_DEFS[p.kind];
      if (d.solid) ctx.fillRect((p.x + d.solid[0]) * scale, (p.y + d.solid[1]) * scale, d.solid[2] * scale, d.solid[3] * scale);
    }
    ctx.fillStyle = "#2f3238";
    ctx.fillRect(w.belt.x0 * scale, w.belt.y * scale, (w.belt.x1 - w.belt.x0 + 1) * scale, 2 * scale);
  }
  const c = document.createElement("canvas");
  c.width = mapBase.width;
  c.height = mapBase.height;
  c.className = "worldmap";
  const ctx = c.getContext("2d")!;
  const draw = () => {
    ctx.drawImage(mapBase!, 0, 0);
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    for (const z of w.zones) {
      if (["galpao", "rua", "admin", "jardim"].includes(z.id)) continue;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      const tx = (z.x + z.w / 2) * scale;
      const ty = (z.y + z.h / 2) * scale;
      const tw = ctx.measureText(z.name).width + 6;
      ctx.fillRect(tx - tw / 2, ty - 8, tw, 13);
      ctx.fillStyle = "#fff";
      ctx.fillText(z.name, tx, ty + 2);
    }
    for (const e of mapProvider.entities()) {
      ctx.fillStyle = e.color;
      const r = e.me ? 5 : 3;
      ctx.beginPath();
      ctx.arc((e.x / TILE) * scale, (e.y / TILE) * scale, r, 0, Math.PI * 2);
      ctx.fill();
      if (e.me) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  };
  draw();
  const t = window.setInterval(draw, 500);
  openModal("map", "Mapa do SMG1", h("div", { class: "map-wrap" }, c, h("div", { class: "legend" },
    h("span", {}, h("i", { style: { background: "#ffe600" } }), "Você"), h("span", {}, h("i", { style: { background: "#3483fa" } }), "Jogadores"),
    h("span", {}, h("i", { style: { background: "#ff8a1f" } }), "NPCs"), h("span", {}, h("i", { style: { background: "#e5533d" } }), "Veículos"),
  )), { wide: true, onClose: () => window.clearInterval(t) });
}

// ------------------------------------------------------------------ ajuda
function showHelp() {
  openModal("help", "Como jogar · MELI WORLD", h("div", { class: "help" },
    h("h3", {}, "Controles"),
    h("p", {}, "WASD/setas: andar · Shift: correr · E/Espaço: interagir · F ou clique: atacar · Q: soltar baker/pacote · C: comemorar · X: sentar · 1–0: usar/equipar itens · Enter: chat · I/J/K/M/H: painéis · Esc: fechar"),
    h("h3", {}, "Para onde ir?"),
    h("p", {}, "Siga a trilha dourada no chão e a seta amarela: elas levam ao próximo passo da missão rastreada (📍 no painel da direita). Clique em outra missão para rastreá-la. O minimapa mostra você, colegas (azul), NPCs (laranja) e inimigos (vermelho)."),
    h("h3", {}, "O mundo"),
    h("ul", {},
      h("li", {}, h("b", {}, "SVC SMG1 (noroeste): "), "a operação logística e as missões dos líderes."),
      h("li", {}, h("b", {}, "Centro Logístico (nordeste): "), "praça com lojas, Balcão de Anúncios, Agência Mercado Pago, imobiliária e o FBM."),
      h("li", {}, h("b", {}, "Bairro Vila Logística (sudoeste): "), "24 lotes para comprar, construir e decorar. Entre na casa pela porta (E), mobilie pelo botão 🏠 Minha casa e escolha quem pode visitar."),
      h("li", {}, h("b", {}, "Zona de Extravio (sudeste): "), "floresta com Ratos do Estoque, Caixas Mímicas, Bugs do Sistema, Fraudadores e o chefe O Grande Atraso, no Galpão Abandonado."),
    ),
    h("h3", {}, "MeliCoins (M$)"),
    h("p", {}, "Você ganha M$ trabalhando no SVC, concluindo missões e derrotando inimigos. Gaste nas lojas, venda para outros jogadores no Balcão de Anúncios e guarde no Cofrinho do Mercado Pago (rende 2% por dia)."),
    h("h3", {}, "O caminho do pacote no SVC"),
    h("ol", {},
      h("li", {}, h("b", {}, "Recebimento: "), "na doca, siga o checklist do LH (chave, calços, romaneio, lacre, QRs, HUs)."),
      h("li", {}, h("b", {}, "Etiquetagem: "), "na mesa, cole a etiqueta de rota em área livre (nunca sobre a shipping label/logo) e induza."),
      h("li", {}, h("b", {}, "Pesca: "), "na esteira da sua ilha (A–D), pegue só os pacotes com a sua letra (máx. 3)."),
      h("li", {}, h("b", {}, "Conteinerização: "), "vá ao baker da rota. Tela VERDE = pode colocar no nível indicado. LARANJA = baker errado."),
      h("li", {}, h("b", {}, "Goleiro/PS/Auditoria: "), "trie o que sobrou, resolva incidências e corrija bakers pendentes."),
      h("li", {}, h("b", {}, "Traslado: "), "baker fechado (faixa verde) → empurre SEM correr até a van da rota na doca."),
      h("li", {}, h("b", {}, "Carregamento: "), "volumosos no piso, paradas mais distantes no fundo; depois contagem do motorista e Gate Out."),
    ),
    h("h3", {}, "Multiplayer"),
    h("p", {}, "Todos os jogadores conectados ao mesmo servidor compartilham o mesmo SVC: a esteira, os bakers e as vans são os mesmos para todos. Combinem quem pesca, quem conteineriza e quem expede!"),
    h("p", { class: "muted" }, "Processos baseados nas One Pages / WIs do Centro de Serviço (SVC). Nomes marcados com (*) são fictícios."),
  ), { wide: true });
}

// ------------------------------------------------------------------ quadro de missões
export function showBoard(data: { available: { id: string; title: string; summary: string; daily: boolean; xp: number }[]; npcMissions: { id: string; title: string; giver: string; summary: string }[] }) {
  const list = h("div", { class: "mission-list" });
  for (const m of data.available)
    list.appendChild(
      h("div", { class: "mission" },
        h("div", { class: "mission-head" }, h("b", {}, m.title), h("span", { class: "muted" }, ` · +${m.xp} XP`)),
        h("div", { class: "mission-sum" }, m.summary),
        h("button", { class: "btn small primary", onclick: (e: Event) => {
          net.send("mission", { op: "accept", id: m.id });
          (e.target as HTMLButtonElement).disabled = true;
          (e.target as HTMLButtonElement).textContent = "Aceita!";
        } }, "Aceitar"),
      ),
    );
  if (!data.available.length) list.appendChild(h("div", { class: "muted" }, "Nenhuma missão do quadro disponível agora. Volte amanhã!"));
  const npc = h("div", { class: "mission-list" }, ...data.npcMissions.map((m) => h("div", { class: "mission small" }, h("b", {}, m.title), h("span", { class: "muted" }, ` — com ${m.giver}: ${m.summary}`))));
  openModal("board", "Quadro de Missões", h("div", {}, h("h3", {}, "Missões do quadro"), list, h("h3", {}, "Procurando você pelo SVC"), npc), { wide: true });
}

// ------------------------------------------------------------------ conclusão e level up
export function showMissionComplete(m: any, npcLook: string | null) {
  let portrait: HTMLElement | null = null;
  if (npcLook) {
    try {
      portrait = renderPortrait(JSON.parse(npcLook), { epiVest: false, safetyShoes: true, coletor: false }, "down", "celebrate", 1).toCanvas(5);
    } catch {
      portrait = null;
    }
  }
  const content = h("div", { class: "complete" + (m.special ? " special" : "") },
    portrait ? h("div", { class: "complete-portrait" }, portrait) : null,
    h("div", {},
      m.npc ? h("div", { class: "dlg-name" }, m.npc.name, h("span", { class: "dlg-role" }, m.npc.role)) : null,
      ...(m.lines ?? []).map((l: string) => h("p", {}, l)),
      h("div", { class: "rewards" },
        h("span", { class: "reward xp" }, `+${m.xp} XP`),
        ...(m.items ?? []).map((i: string) => h("span", { class: "reward" }, i)),
        m.perk ? h("span", { class: "reward perk" }, `Nova habilidade: ${m.perk.name}`) : null,
      ),
      m.perk ? h("small", {}, m.perk.desc) : null,
    ),
  );
  openModal("complete", m.special ? `★ MISSÃO ESPECIAL CONCLUÍDA: ${m.title}` : `Missão concluída: ${m.title}`, content);
}

export function showLevelUp(level: number, title: string) {
  const c = h("div", { class: "levelup" }, h("div", { class: "big" }, `Nível ${level}`), h("div", {}, title), h("small", {}, "Você ganhou pontos de habilidade. Abra o perfil com K."));
  const t = openModal("levelup", "Subiu de nível!", c);
  setTimeout(t, 3500);
}

export function missionGivers(p: Profile | null): Set<string> {
  const s = new Set<string>();
  if (!p) return s;
  for (const id of p.availableMissions) {
    const def = MISSIONS.find((m) => m.id === id);
    if (def && def.giver !== "board") s.add(def.giver);
  }
  return s;
}

export function activeGivers(p: Profile | null): Set<string> {
  const s = new Set<string>();
  if (!p) return s;
  for (const m of p.activeMissions) {
    const def = MISSION_BY_ID[m.id];
    if (def) s.add(def.giver);
    // objetivos "talk" apontam para o NPC alvo
    for (const o of def?.objectives ?? []) if (o.type === "talk" && o.filter?.npc && (m.progress[o.id] ?? 0) < o.count) s.add(String(o.filter.npc));
  }
  return s;
}

export { clear };
