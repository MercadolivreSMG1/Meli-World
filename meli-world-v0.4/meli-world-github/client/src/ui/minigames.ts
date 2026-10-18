/**
 * Interfaces dos mini-jogos operacionais. O cliente só coleta escolhas; o servidor pontua.
 */
import type { MinigameOpen } from "@shared/index";
import { ISLAND_COLORS, ROUTE_BY_ID, WAVE_NAMES, MAX_CARRY } from "@shared/index";
import { net } from "../net/Net";
import { store } from "../store";
import { clear, h } from "./dom";
import { openModal } from "./panels";

let active: { token: string; done: boolean; close: () => void; cleanup?: () => void } | null = null;

export function minigameOpen() {
  return !!active;
}

function submit(result: unknown) {
  if (!active || active.done) return;
  active.done = true;
  net.send("minigame", { token: active.token, result });
  const a = active;
  active = null;
  a.cleanup?.();
  a.close();
}

export function openMinigame(m: MinigameOpen) {
  if (active) {
    active.done = true;
    active.close();
  }
  const builders: Record<string, (d: any) => HTMLElement> = {
    receiving, labeling, fishing, containerize, goleiro, ps, audit, volumosos, loading, aduana, sorter, training, setup, kpi,
  };
  const state = { token: m.token, done: false, close: () => {}, cleanup: undefined as undefined | (() => void) };
  active = state;
  const content = (builders[m.kind] ?? (() => h("div", {}, "Mini-jogo desconhecido")))(m.data);
  const wide = !["containerize", "aduana"].includes(m.kind);
  state.close = openModal("minigame", m.title, h("div", { class: `mg mg-${m.kind}` }, content), {
    wide,
    noBackdropClose: true,
    onClose: () => {
      if (!state.done) {
        state.done = true;
        net.send("minigameCancel");
      }
      state.cleanup?.();
      if (active === state) active = null;
    },
  });
}

function setCleanup(fn: () => void) {
  if (active) active.cleanup = fn;
}

const footer = (...children: (HTMLElement | null)[]) => h("div", { class: "row end mg-footer" }, ...children);

// ----------------------------------------------------------------------------- Recebimento
function receiving(d: any) {
  const order: string[] = [];
  let decision = "";
  const list = h("div", { class: "order-list" });
  const steps = h("div", { class: "steps" });
  const refresh = () => {
    clear(list);
    order.forEach((id, i) => list.appendChild(h("div", { class: "order-item" }, `${i + 1}. ${d.steps.find((s: any) => s.id === id).label}`)));
    clear(steps);
    for (const s of d.steps)
      if (!order.includes(s.id)) steps.appendChild(h("button", { class: "btn step", onclick: () => {
        order.push(s.id);
        refresh();
      } }, s.label));
  };
  refresh();
  const sealMatch = d.seal === d.sealYms;
  const dec = h("div", { class: "decisions" },
    ...d.decisions.map((x: any) => h("label", { class: "radio" }, h("input", { type: "radio", name: "dec", onchange: () => (decision = x.id) }), x.label)),
  );
  return h("div", {},
    h("div", { class: "card-row" },
      h("div", { class: "card" }, h("small", {}, "Motorista"), h("b", {}, d.driver)),
      h("div", { class: "card" }, h("small", {}, "Lacre no caminhão"), h("b", { class: "mono" }, d.seal)),
      h("div", { class: "card" }, h("small", {}, "Lacre no YMS"), h("b", { class: "mono" + (sealMatch ? "" : " bad") }, d.sealYms)),
      h("div", { class: "card" }, h("small", {}, "HUs no romaneio / físicas"), h("b", {}, `${d.romaneio} / ${d.hus}`)),
    ),
    h("p", { class: "hint" }, "Clique nas etapas na ORDEM correta do recebimento. Depois, decida como finalizar."),
    h("div", { class: "cols" }, h("div", {}, h("h4", {}, "Etapas"), steps), h("div", {}, h("h4", {}, "Sua ordem"), list, h("button", { class: "btn small ghost", onclick: () => {
      order.pop();
      refresh();
    } }, "Desfazer"))),
    h("h4", {}, "Finalização"),
    dec,
    footer(h("button", { class: "btn primary", onclick: () => submit({ order, decision }) }, "Finalizar recebimento")),
  );
}

// ----------------------------------------------------------------------------- Etiquetagem
function boxCanvas(item: any, chosen: string | null): HTMLCanvasElement {
  const c = h("canvas", { width: 260, height: 180, class: "box-canvas" }) as HTMLCanvasElement;
  const g = c.getContext("2d")!;
  g.fillStyle = "#c48a52";
  g.fillRect(20, 20, 220, 140);
  g.fillStyle = "#d9a36c";
  g.fillRect(20, 20, 220, 10);
  g.fillStyle = "#e8d7a8";
  g.fillRect(124, 20, 12, 140);
  if (item.damaged) {
    g.fillStyle = item.issue === "liquido" ? "rgba(60,120,200,0.45)" : "rgba(60,30,10,0.35)";
    g.beginPath();
    g.ellipse(70, 120, 40, 22, 0.3, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#5c3a20";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(170, 40);
    g.lineTo(190, 70);
    g.lineTo(175, 95);
    g.stroke();
  }
  const quads = [[30, 34], [140, 34], [30, 98], [140, 98]];
  item.spots.forEach((s: any, i: number) => {
    const [x, y] = quads[i];
    if (s.kind === "ship") {
      g.fillStyle = "#ffffff";
      g.fillRect(x + 4, y + 4, 84, 50);
      g.fillStyle = "#222";
      for (let k = 0; k < 30; k++) g.fillRect(x + 10 + k * 2.4, y + 10, k % 3 ? 1 : 2, 22);
      g.font = "bold 8px monospace";
      g.fillText("SHIPPING LABEL", x + 10, y + 46);
    } else if (s.kind === "logo") {
      g.fillStyle = "#ffe600";
      g.beginPath();
      g.ellipse(x + 46, y + 30, 32, 20, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#2d3277";
      g.font = "bold 13px sans-serif";
      g.fillText("LOGO", x + 28, y + 35);
    } else if (s.kind === "old") {
      g.fillStyle = "rgba(255,255,255,0.75)";
      g.fillRect(x + 12, y + 10, 64, 40);
      g.fillStyle = "#999";
      g.font = "bold 10px monospace";
      g.fillText("ROTA ANTIGA", x + 16, y + 34);
    }
    if (chosen === s.id) {
      g.fillStyle = "#ffe600";
      g.fillRect(x + 20, y + 14, 56, 30);
      g.fillStyle = "#2d3277";
      g.font = "bold 14px monospace";
      g.fillText(item.route, x + 32, y + 35);
    }
    g.strokeStyle = "rgba(255,255,255,0.35)";
    g.setLineDash([4, 4]);
    g.strokeRect(x, y, 96, 58);
    g.setLineDash([]);
  });
  return c;
}

function labeling(d: any) {
  const choices: Record<string, string> = {};
  let idx = 0;
  const wrap = h("div", {});
  const render = () => {
    clear(wrap);
    if (idx >= d.items.length) {
      wrap.append(h("p", {}, "Todos os pacotes foram tratados."), footer(h("button", { class: "btn primary", onclick: () => submit({ choices }) }, "Induzir na esteira")));
      return;
    }
    const it = d.items[idx];
    const canvas = boxCanvas(it, choices[it.id] ?? null);
    canvas.onclick = (e) => {
      const r = canvas.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 260;
      const y = ((e.clientY - r.top) / r.height) * 180;
      const q = (x > 135 ? 1 : 0) + (y > 95 ? 2 : 0);
      const spot = it.spots[q];
      if (!spot) return;
      choices[it.id] = spot.id;
      idx++;
      render();
    };
    wrap.append(
      h("p", { class: "hint" }, `Pacote ${idx + 1}/${d.items.length} · Etiqueta impressa: `, h("b", { class: "tag" }, it.route), ` (${it.bairro}). Clique onde colar a etiqueta na face superior.`),
      canvas,
      footer(h("button", { class: "btn danger", onclick: () => {
        choices[it.id] = "separar";
        idx++;
        render();
      } }, "Separar para o PS (danificado / vazando)")),
    );
  };
  render();
  return wrap;
}

// ----------------------------------------------------------------------------- Pesca
function fishing(d: any) {
  const free = Math.max(0, MAX_CARRY - (store.profile?.carrying.length ?? 0));
  const W = 640;
  const Hh = 120;
  const c = h("canvas", { width: W, height: Hh, class: "belt-canvas" }) as HTMLCanvasElement;
  const g = c.getContext("2d")!;
  const items = d.items.map((it: any, i: number) => ({ ...it, x: -60 - i * 70, picked: false }));
  const picked: string[] = [];
  const info = h("div", { class: "hint" });
  const speed = 95 * (d.speed ?? 1);
  let last = performance.now();
  let raf = 0;
  let finished = false;
  const mine = active;
  const updateInfo = () => {
    info.textContent = `Sua ilha: ${d.island} · Pegos: ${picked.length}/${free} · Clique só nos pacotes da letra ${d.island}!`;
  };
  updateInfo();
  const loop = (t: number) => {
    if (!mine || mine.done || active !== mine) return;
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    g.fillStyle = "#2f3238";
    g.fillRect(0, 0, W, Hh);
    for (let x = ((t / 10) % 20) - 20; x < W; x += 20) {
      g.fillStyle = "#3d4148";
      g.fillRect(x, 10, 8, Hh - 20);
    }
    g.fillStyle = "#e8c33a";
    g.fillRect(0, 0, W, 6);
    g.fillRect(0, Hh - 6, W, 6);
    // zona da ilha
    g.fillStyle = "rgba(255,230,0,0.08)";
    g.fillRect(120, 6, 400, Hh - 12);
    let alive = false;
    for (const it of items) {
      if (it.picked) continue;
      it.x += speed * dt;
      if (it.x < W + 40) alive = true;
      if (it.x < -50 || it.x > W + 40) continue;
      const col = it.island === "?" ? "#777" : ISLAND_COLORS[it.island as "A"] ?? "#999";
      g.fillStyle = "#c48a52";
      g.fillRect(it.x - 24, 34, 48, 52);
      g.fillStyle = "#d9a36c";
      g.fillRect(it.x - 24, 34, 48, 8);
      g.fillStyle = "#fff";
      g.fillRect(it.x - 16, 50, 32, 26);
      g.fillStyle = col;
      g.font = "bold 20px monospace";
      g.textAlign = "center";
      g.fillText(it.island === "?" ? "!" : it.island, it.x, 70);
      if (d.highlight && it.island === d.island) {
        g.strokeStyle = "#5fffb0";
        g.lineWidth = 3;
        g.strokeRect(it.x - 27, 31, 54, 58);
      }
    }
    if (!alive && !finished) {
      finished = true;
      submit({ picked });
      return;
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  c.onclick = (e) => {
    const r = c.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * Hh;
    if (y < 30 || y > 92) return;
    for (const it of items) {
      if (it.picked || Math.abs(it.x - x) > 26) continue;
      if (picked.length >= free && it.island === d.island) {
        info.textContent = "Mãos cheias! Máximo de 3 pacotes.";
        return;
      }
      it.picked = true;
      picked.push(it.id);
      updateInfo();
      if (picked.length >= free + 2) {
        finished = true;
        submit({ picked });
      }
      return;
    }
  };
  setCleanup(() => cancelAnimationFrame(raf));
  return h("div", {}, info, c, footer(h("button", { class: "btn", onclick: () => {
    finished = true;
    submit({ picked });
  } }, "Parar de pescar")));
}

// ----------------------------------------------------------------------------- Conteinerização
function containerize(d: any) {
  const levels = ["superior", "meio", "inferior"];
  const screen = h("div", { class: "coletor green" },
    h("div", { class: "coletor-head" }, "Logistics · Separação"),
    h("div", { class: "coletor-big" }, "✔ VERDE"),
    h("div", {}, `Pacote ${d.pkg.id}`),
    h("div", {}, `Rota ${d.pkg.route} · ${d.pkg.bairro}`),
    h("div", { class: "coletor-level" }, `Nível: ${String(d.pkg.level).toUpperCase()}`),
  );
  const hideAt = setTimeout(() => {
    const lv = screen.querySelector(".coletor-level");
    if (lv) lv.textContent = "Nível: (memorize!)";
  }, 1600);
  setCleanup(() => clearTimeout(hideAt));
  const baker = h("div", { class: "baker-ui" },
    h("div", { class: "baker-qr" }, `QR ${d.baker}`),
    ...levels.map((lv) => h("button", { class: "shelf", onclick: () => submit({ level: lv }) }, lv.charAt(0).toUpperCase() + lv.slice(1))),
  );
  return h("div", { class: "cont" }, screen, baker, h("p", { class: "hint" }, "Coloque o pacote no nível que o coletor indicou."));
}

// ----------------------------------------------------------------------------- Goleiro
function goleiro(d: any) {
  const choices: Record<string, string> = {};
  const rows = d.items.map((it: any) => {
    const sel = h("div", { class: "bins" });
    for (const b of d.bins)
      sel.appendChild(
        h("button", { class: "btn bin", onclick: (e: Event) => {
          choices[it.id] = b.id;
          sel.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
          (e.target as HTMLElement).classList.add("on");
        } }, b.label),
      );
    return h("div", { class: "triage" }, h("div", { class: "triage-pkg" }, h("b", {}, it.route), " · ", it.desc), sel);
  });
  return h("div", {}, h("p", { class: "hint" }, "Etiqueta branca: data de hoje/passada → reinduzir; futura → D+1. Danificado/caso PS → PS. Receita Federal → custódia."), ...rows,
    footer(h("button", { class: "btn primary", onclick: () => submit({ choices }) }, "Concluir triagem")));
}

// ----------------------------------------------------------------------------- PS
function ps(d: any) {
  const choices: Record<string, string> = {};
  const rows = d.cases.map((c: any) => {
    const sel = h("select", { class: "input", onchange: (e: Event) => (choices[c.id] = (e.target as HTMLSelectElement).value) },
      h("option", { value: "" }, "— escolha o tratamento —"),
      ...d.options.map((o: any) => h("option", { value: o.id }, o.label)),
    );
    return h("div", { class: "triage" }, h("div", { class: "triage-pkg" }, h("b", {}, `Rota ${c.route}`), " · ", c.desc), sel);
  });
  return h("div", {}, ...rows, footer(h("button", { class: "btn primary", onclick: () => submit({ choices }) }, "Registrar tratativas")));
}

// ----------------------------------------------------------------------------- Auditoria
function audit(d: any) {
  const flagged = new Set<string>();
  const list = h("div", { class: "audit-list" },
    ...d.items.map((it: any) =>
      h("label", { class: "audit-item" },
        h("input", { type: "checkbox", onchange: (e: Event) => ((e.target as HTMLInputElement).checked ? flagged.add(it.id) : flagged.delete(it.id)) }),
        h("span", { class: "mono" }, it.id), " ", h("b", { class: "tag" }, it.route), ` ${it.bairro} · CEP ${it.cep}`,
      ),
    ),
  );
  return h("div", {}, h("p", { class: "hint" }, `Este é o baker da rota `, h("b", { class: "tag" }, d.baker), ` (${d.bairro}). Marque os pacotes que NÃO pertencem a ele.`), list,
    footer(h("button", { class: "btn primary", onclick: () => submit({ flagged: [...flagged] }) }, "Reposicionar marcados")));
}

// ----------------------------------------------------------------------------- Volumosos
function volumosos(d: any) {
  const choices: Record<string, string> = {};
  const rows = d.items.map((it: any) => {
    const sel = h("div", { class: "bins" });
    for (const o of d.options)
      sel.appendChild(h("button", { class: "btn bin", onclick: (e: Event) => {
        choices[it.id] = o.id;
        sel.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
        (e.target as HTMLElement).classList.add("on");
      } }, o.label));
    return h("div", { class: "triage" }, h("div", { class: "triage-pkg" }, h("b", {}, it.route), ` · ${it.dims.map((x: number) => Math.round(x / 10)).join(" × ")} cm · ${it.weight} kg`), sel);
  });
  return h("div", {}, h("p", { class: "hint" }, "Regra do jogo: sortable até 65 cm e 15 kg · volumoso até 1 m e 30 kg · acima disso, oversize."), ...rows,
    footer(h("button", { class: "btn primary", onclick: () => submit({ choices }) }, "Classificar")));
}

// ----------------------------------------------------------------------------- Carregamento
function loading(d: any) {
  const order: string[] = [];
  const van = h("div", { class: "van-slots" });
  const pool = h("div", { class: "steps" });
  const refresh = () => {
    clear(van);
    van.appendChild(h("div", { class: "van-cab" }, "FUNDO"));
    order.forEach((id, i) => {
      const it = d.items.find((x: any) => x.id === id);
      van.appendChild(h("div", { class: "van-slot" + (it.bulky ? " bulky" : "") }, `${i + 1}º · Parada ${it.stop}${it.bulky ? " · VOLUMOSO" : ""}`));
    });
    van.appendChild(h("div", { class: "van-door" }, "PORTA"));
    clear(pool);
    for (const it of d.items)
      if (!order.includes(it.id))
        pool.appendChild(h("button", { class: "btn step" + (it.bulky ? " bulky" : ""), onclick: () => {
          order.push(it.id);
          refresh();
        } }, `Parada ${it.stop}${it.bulky ? " · VOLUMOSO" : ""}`));
  };
  refresh();
  return h("div", {},
    h("p", { class: "hint" }, `Rota ${d.route} · ${ROUTE_BY_ID[d.route]?.bairro ?? ""}. Carregue do fundo para a porta: volumosos no piso primeiro; depois as paradas mais distantes (número maior).`),
    h("div", { class: "cols" }, h("div", {}, h("h4", {}, "Volumes do baker"), pool), h("div", {}, h("h4", {}, "Baú da van"), van, h("button", { class: "btn small ghost", onclick: () => {
      order.pop();
      refresh();
    } }, "Desfazer"))),
    footer(h("button", { class: "btn primary", onclick: () => submit({ order }) }, "Carregar e chamar contagem")),
  );
}

// ----------------------------------------------------------------------------- Aduana
function aduana(d: any) {
  const c = h("canvas", { width: 420, height: 260, class: "box-canvas" }) as HTMLCanvasElement;
  const g = c.getContext("2d")!;
  g.fillStyle = "#3c4048";
  g.fillRect(0, 0, 420, 260);
  const cols = ["#c48a52", "#b47a45", "#d39b62", "#a86e3c"];
  for (const b of d.boxes) {
    const w = 34 * b.s;
    const x = 10 + b.x * 370;
    const y = 10 + b.y * 210;
    g.fillStyle = cols[b.c];
    g.fillRect(x, y, w, w * 0.8);
    g.fillStyle = "#fff";
    g.fillRect(x + w * 0.2, y + w * 0.25, w * 0.4, w * 0.25);
    g.strokeStyle = "#2b1b17";
    g.strokeRect(x, y, w, w * 0.8);
  }
  const input = h("input", { class: "input", type: "number", min: 0, max: 99, placeholder: "Quantos pacotes?" }) as HTMLInputElement;
  return h("div", {}, h("p", { class: "hint" }, `Recontagem obrigatória da rota ${d.route}. Conte os pacotes (alguns podem estar sobrepostos).`), c,
    footer(input, h("button", { class: "btn primary", onclick: () => submit({ count: Number(input.value) }) }, "Confirmar contagem")));
}

// ----------------------------------------------------------------------------- Sorter
function sorter(d: any) {
  const assign: Record<string, string> = {};
  const loads = h("div", { class: "loads" });
  const refresh = () => {
    clear(loads);
    const load: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (const r of d.routes) if (assign[r.id]) load[assign[r.id]] += r.volume;
    const vals = Object.values(load);
    const diff = Math.max(...vals) - Math.min(...vals);
    for (const isl of d.islands)
      loads.appendChild(h("div", { class: "load" }, h("b", { style: { color: ISLAND_COLORS[isl as "A"] } }, `Ilha ${isl}`), h("div", { class: "bar" }, h("div", { class: "bar-fill", style: { width: Math.min(100, load[isl] / 2) + "%", background: ISLAND_COLORS[isl as "A"] } }), h("span", {}, `${load[isl]} pacotes`))));
    loads.appendChild(h("div", { class: diff <= 40 ? "good" : "bad" }, `Diferença máx.: ${diff} (meta ≤ 40)`));
  };
  const rows = d.routes.map((r: any) => {
    const btns = h("div", { class: "bins" });
    for (const isl of d.islands)
      btns.appendChild(h("button", { class: "btn bin", onclick: (e: Event) => {
        assign[r.id] = isl;
        btns.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
        (e.target as HTMLElement).classList.add("on");
        refresh();
      } }, isl));
    return h("div", { class: "triage" }, h("div", { class: "triage-pkg" }, h("b", {}, `Rota ${r.id}`), ` · ${r.volume} pacotes`), btns);
  });
  refresh();
  return h("div", {}, h("p", { class: "hint" }, d.tip), h("div", { class: "cols" }, h("div", {}, ...rows), loads),
    footer(h("button", { class: "btn primary", onclick: () => submit({ assign }) }, "Aplicar layout no Logistics")));
}

// ----------------------------------------------------------------------------- Treinamento
function training(d: any) {
  const answers: number[] = [];
  let i = 0;
  const wrap = h("div", {});
  const render = () => {
    clear(wrap);
    if (i >= d.questions.length) {
      wrap.append(h("p", {}, "Fim do quiz! Envie para correção."), footer(h("button", { class: "btn primary", onclick: () => submit({ answers }) }, "Enviar respostas")));
      return;
    }
    const q = d.questions[i];
    wrap.append(
      h("div", { class: "quiz-n" }, `Pergunta ${i + 1} de ${d.questions.length}`),
      h("div", { class: "quiz-q" }, q.q),
      ...q.options.map((o: string, k: number) => h("button", { class: "btn quiz-opt", onclick: () => {
        answers[i] = k;
        i++;
        render();
      } }, `${"ABCD"[k]}) ${o}`)),
    );
  };
  render();
  return wrap;
}

// ----------------------------------------------------------------------------- Setup
function setup(d: any) {
  let qr = "";
  const order: string[] = [];
  const qrBtns = h("div", { class: "bins" }, ...d.qrSpots.map((s: any) => h("button", { class: "btn bin", onclick: (e: Event) => {
    qr = s.id;
    qrBtns.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
    (e.target as HTMLElement).classList.add("on");
  } }, s.label)));
  const list = h("div", { class: "order-list" });
  const pool = h("div", { class: "steps" });
  const refresh = () => {
    clear(list);
    order.forEach((id, i) => list.appendChild(h("div", { class: "order-item" }, `${i + 1}. ${d.steps.find((s: any) => s.id === id).label}`)));
    clear(pool);
    for (const s of d.steps) if (!order.includes(s.id)) pool.appendChild(h("button", { class: "btn step", onclick: () => {
      order.push(s.id);
      refresh();
    } }, s.label));
  };
  refresh();
  return h("div", {},
    h("p", { class: "hint" }, `Bakers sem setup: ${d.routes.join(", ")}.`),
    h("h4", {}, "1) Onde colar o QR do baker?"), qrBtns,
    h("h4", {}, "2) Vincular sacas no coletor (ordem)"),
    h("div", { class: "cols" }, pool, list),
    footer(h("button", { class: "btn primary", onclick: () => submit({ qr, order }) }, "Concluir setup")),
  );
}

// ----------------------------------------------------------------------------- KPI (somente leitura)
function kpi(d: any) {
  const c = d.counters;
  const big = (label: string, value: string, cls = "") => h("div", { class: "kpi-card " + cls }, h("b", {}, value), h("small", {}, label));
  const heat = h("div", { class: "heat" },
    ...Object.entries(d.heatmap).map(([isl, v]: [string, any]) =>
      h("div", { class: "heat-col" },
        h("div", { class: "heat-bar", style: { height: Math.min(100, v.belt * 8) + "%", background: ISLAND_COLORS[isl as "A"] } }),
        h("b", {}, `Ilha ${isl}`), h("small", {}, `${v.belt} na esteira · bakers ${v.bakers}% · ${v.pending} pend.`),
      ),
    ),
  );
  const bakers = h("div", { class: "baker-grid" },
    ...d.bakers.filter((b: any) => b.state !== "loaded").slice(0, 32).map((b: any) => h("div", { class: `bk ${b.state}${b.setup ? "" : " nosetup"}`, title: `${b.route} · ${b.state}` }, `${b.route} ${b.fill}/${b.target}`)),
  );
  const vans = h("div", { class: "van-list" },
    ...d.vans.map((v: any) => h("div", { class: "van-row" + (v.minutes > 25 ? " bad" : "") }, `Rota ${v.route} · ${WAVE_NAMES[v.wave] ?? ""} · ${v.state}${v.dock ? " · doca " + v.dock : ""}${v.minutes ? ` · ${v.minutes} min` : ""}`)),
  );
  return h("div", { class: "kpi-panel" },
    d.alert ? h("div", { class: "hud-alert" }, "⚠ " + d.alert) : null,
    h("div", { class: "kpi-cards" },
      big("Telas verdes (Poka Yoke)", `${d.greenRate}%`, d.greenRate >= 98 ? "good" : d.greenRate >= 92 ? "warn" : "bad"),
      big("Flowrack (backlog)", String(d.backlog), d.backlog > 120 ? "bad" : ""),
      big("Na esteira", String(d.onBelt)),
      big("Goleiro", String(d.goleiro), d.goleiro > 20 ? "bad" : ""),
      big("Fila do PS", String(d.ps)),
      big("Volumosos", String(d.volumosos)),
      big("Rotas despachadas", String(c.dispatched)),
      big("Atrasadas (>30 min)", String(c.late), c.late ? "warn" : "good"),
      big("Bakers fechados", String(c.closed)),
      big("Recebidos hoje", String(c.received)),
      big("Erros", String(c.errors), c.errors > 10 ? "warn" : ""),
      big("Alertas de segurança", String(c.safetyStrikes), c.safetyStrikes ? "bad" : "good"),
    ),
    h("h4", {}, "Mapa de calor das ilhas"), heat,
    h("h4", {}, "Bakers"), bakers,
    h("h4", {}, "Flash Parking"), vans,
    d.perkInsight ? h("p", { class: "hint" }, "Operação sob Controle: o maior gargalo agora é a ilha com a barra mais alta.") : null,
    h("p", { class: "muted" }, `Equipe online: ${d.players.map((p: any) => `${p.name} (Nv ${p.level})`).join(", ")}`),
  );
}
