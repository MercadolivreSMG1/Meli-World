/** Lojas, Balcão de Anúncios, Mercado Pago, lotes/casa e imobiliária. */
import { HOUSE_TIERS, ITEMS } from "@shared/index";
import { net } from "../net/Net";
import { iconUrl } from "../game/Textures";
import { clear, h } from "./dom";
import { openModal } from "./panels";

const add = (el: HTMLElement, ...items: (Node | string | null | false | undefined)[]) => {
  for (const it of items) if (it) el.append(it);
};
const coin = (n: number) => `${n.toLocaleString("pt-BR")} M$`;

let currentClose: (() => void) | null = null;
let currentKind = "";
/** aba ativa por janela (sobrevive às atualizações vindas do servidor) */
const tabs: Record<string, string> = {};

function isOpen(kind: string) {
  return currentKind === kind && !!document.querySelector(`.commerce-${kind}`);
}

function show(kind: string, title: string, body: HTMLElement) {
  if (isOpen(kind)) {
    const host = document.querySelector(`.commerce-${kind}`)!;
    host.replaceWith(body);
    body.classList.add(`commerce-${kind}`);
    return;
  }
  body.classList.add(`commerce-${kind}`);
  currentClose = openModal(kind, title, body, {
    wide: true,
    onClose: () => {
      if (currentKind === kind) currentKind = "";
    },
  });
  currentKind = kind;
}

export function closeCommerce() {
  currentClose?.();
}

// ------------------------------------------------------------------------------ lojas
export function showShop(d: any) {
  const key = "shop:" + d.id;
  if (!isOpen("shop")) tabs[key] = d.items.length ? "buy" : "sell";
  let tab = (tabs[key] ?? (d.items.length ? "buy" : "sell")) as "buy" | "sell";
  const body = h("div", {});
  const render = () => {
    clear(body);
    body.append(
      h("div", { class: "shop-head" }, h("span", {}, `${d.vendor} · `, h("b", {}, d.name)), h("span", { class: "coins-pill" }, h("img", { src: iconUrl("coins") }), coin(d.coins))),
      h("div", { class: "tabs" },
        d.items.length ? h("button", { class: "tab" + (tab === "buy" ? " on" : ""), onclick: () => ((tab = "buy"), (tabs[key] = tab), render()) }, "Comprar") : null,
        h("button", { class: "tab" + (tab === "sell" ? " on" : ""), onclick: () => ((tab = "sell"), (tabs[key] = tab), render()) }, "Vender"),
      ),
    );
    const grid = h("div", { class: "shop-grid" });
    if (tab === "buy")
      for (const it of d.items) {
        const locked = it.minLevel && d.level < it.minLevel;
        grid.appendChild(
          h("div", { class: "shop-item" + (locked ? " locked" : "") },
            h("img", { src: iconUrl(it.id, 3) }),
            h("div", { class: "si-info" }, h("b", {}, it.name), h("small", {}, it.desc), locked ? h("small", { class: "bad" }, `Requer nível ${it.minLevel}`) : null),
            h("div", { class: "si-buy" },
              h("span", { class: "price" }, coin(it.price)),
              h("button", { class: "btn small primary", disabled: locked || d.coins < it.price ? "disabled" : undefined, onclick: () => net.send("shop", { op: "buy", shop: d.id, itemId: it.id, qty: 1 }) }, "Comprar"),
            ),
          ),
        );
      }
    else {
      if (!d.sell.length) grid.appendChild(h("div", { class: "muted" }, "Nada para vender."));
      for (const it of d.sell)
        grid.appendChild(
          h("div", { class: "shop-item" },
            h("img", { src: iconUrl(it.id, 3) }),
            h("div", { class: "si-info" }, h("b", {}, `${it.name} x${it.qty}`), h("small", {}, `${coin(it.price)} cada`)),
            h("div", { class: "si-buy" },
              h("button", { class: "btn small", onclick: () => net.send("shop", { op: "sell", shop: d.id, itemId: it.id, qty: 1 }) }, "Vender 1"),
              it.qty > 1 ? h("button", { class: "btn small ghost", onclick: () => net.send("shop", { op: "sell", shop: d.id, itemId: it.id, qty: it.qty }) }, "Todos") : null,
            ),
          ),
        );
    }
    body.appendChild(grid);
    if (d.id === "sell") body.appendChild(h("p", { class: "hint" }, "A Neide paga 25% a mais pelos itens que as outras lojas."));
  };
  render();
  show("shop", d.name, body);
}

// ------------------------------------------------------------------------------ Balcão de Anúncios
export function showMarket(d: any) {
  if (!isOpen("market")) tabs.market = "buy";
  let tab = (tabs.market ?? "buy") as "buy" | "sell" | "mine";
  const setTab = (t: "buy" | "sell" | "mine") => {
    tab = t;
    tabs.market = t;
    render();
  };
  const body = h("div", {});
  const render = () => {
    clear(body);
    body.append(
      h("div", { class: "shop-head" }, h("span", {}, "O marketplace dos colegas do SMG1 (e de clientes da cidade)."), h("span", { class: "coins-pill" }, h("img", { src: iconUrl("coins") }), coin(d.coins))),
      h("div", { class: "tabs" },
        h("button", { class: "tab" + (tab === "buy" ? " on" : ""), onclick: () => setTab("buy") }, `Comprar (${d.listings.filter((l: any) => !l.mine).length})`),
        h("button", { class: "tab" + (tab === "sell" ? " on" : ""), onclick: () => setTab("sell") }, "Anunciar"),
        h("button", { class: "tab" + (tab === "mine" ? " on" : ""), onclick: () => setTab("mine") }, `Meus anúncios (${d.listings.filter((l: any) => l.mine).length})`),
      ),
    );
    const grid = h("div", { class: "shop-grid" });
    if (tab === "buy") {
      const list = d.listings.filter((l: any) => !l.mine).sort((a: any, b: any) => a.price - b.price);
      if (!list.length) grid.appendChild(h("div", { class: "muted" }, "Nenhum anúncio no momento."));
      for (const l of list) {
        const deal = l.price < l.ref * 0.95;
        grid.appendChild(
          h("div", { class: "shop-item" },
            h("img", { src: iconUrl(l.itemId, 3) }),
            h("div", { class: "si-info" }, h("b", {}, `${l.qty}x ${l.name}`), h("small", {}, `Vendido por ${l.sellerName}${l.sellerId.startsWith("npc:") ? " (loja)" : " (jogador)"}`), deal ? h("small", { class: "good" }, "Abaixo do preço de loja!") : null),
            h("div", { class: "si-buy" },
              h("span", { class: "price" }, coin(l.price)),
              h("button", { class: "btn small primary", disabled: d.coins < l.price ? "disabled" : undefined, onclick: () => net.send("market", { op: "buy", id: l.id }) }, "Comprar"),
            ),
          ),
        );
      }
    } else if (tab === "sell") {
      if (!d.inventory.length) grid.appendChild(h("div", { class: "muted" }, "Seu inventário não tem itens anunciáveis."));
      for (const it of d.inventory) {
        const qty = h("input", { class: "input tiny", type: "number", min: 1, max: it.qty, value: 1 }) as HTMLInputElement;
        const price = h("input", { class: "input tiny", type: "number", min: 1, value: it.suggested }) as HTMLInputElement;
        qty.addEventListener("input", () => {
          const q = Math.max(1, Math.min(it.qty, Math.floor(Number(qty.value) || 1)));
          price.value = String(it.suggested * q);
        });
        grid.appendChild(
          h("div", { class: "shop-item" },
            h("img", { src: iconUrl(it.id, 3) }),
            h("div", { class: "si-info" }, h("b", {}, `${it.name} (você tem ${it.qty})`), h("small", {}, `Preço de referência: ${coin(it.suggested)} cada. Preços justos vendem mais rápido.`)),
            h("div", { class: "si-buy col" },
              h("label", {}, "Qtd ", qty),
              h("label", {}, "Preço total ", price),
              h("button", { class: "btn small primary", onclick: () => {
                const q = Math.floor(Number(qty.value));
                const pr = Math.floor(Number(price.value));
                if (!(q >= 1 && q <= it.qty) || !(pr >= 1)) {
                  price.classList.add("shake");
                  setTimeout(() => price.classList.remove("shake"), 400);
                  return;
                }
                net.send("market", { op: "list", itemId: it.id, qty: q, price: pr });
              } }, "Publicar"),
            ),
          ),
        );
      }
    } else {
      const list = d.listings.filter((l: any) => l.mine);
      if (!list.length) grid.appendChild(h("div", { class: "muted" }, "Você não tem anúncios ativos."));
      for (const l of list)
        grid.appendChild(
          h("div", { class: "shop-item" },
            h("img", { src: iconUrl(l.itemId, 3) }),
            h("div", { class: "si-info" }, h("b", {}, `${l.qty}x ${l.name}`), h("small", {}, `Anunciado por ${coin(l.price)}`)),
            h("div", { class: "si-buy" }, h("button", { class: "btn small ghost", onclick: () => net.send("market", { op: "cancel", id: l.id }) }, "Cancelar")),
          ),
        );
    }
    body.appendChild(grid);
  };
  render();
  show("market", "Balcão de Anúncios", body);
}

// ------------------------------------------------------------------------------ Mercado Pago
export function showMp(d: any) {
  const prevAmount = (document.querySelector(".commerce-mp input[type=number]") as HTMLInputElement | null)?.value;
  const amount = h("input", { class: "input", type: "number", min: 1, value: prevAmount || 50 }) as HTMLInputElement;
  const to = h("select", { class: "input" }, ...(d.players.length ? d.players.map((p: any) => h("option", { value: p.sid }, p.name)) : [h("option", { value: "" }, "Nenhum colega online")])) as HTMLSelectElement;
  const body = h("div", { class: "mp" },
    h("div", { class: "mp-cards" },
      h("div", { class: "kpi-card" }, h("b", {}, coin(d.coins)), h("small", {}, "Saldo em conta")),
      h("div", { class: "kpi-card good" }, h("b", {}, coin(d.savings)), h("small", {}, "Cofrinho (rende 2%/dia)")),
    ),
    h("div", { class: "row" }, h("span", {}, "Valor:"), amount),
    h("div", { class: "row" },
      h("button", { class: "btn primary", onclick: () => net.send("mp", { op: "deposit", amount: Number(amount.value) }) }, "Guardar no Cofrinho"),
      h("button", { class: "btn", onclick: () => net.send("mp", { op: "withdraw", amount: Number(amount.value) }) }, "Resgatar"),
    ),
    h("h4", {}, "Transferir para colega (Pix MeliCoins)"),
    h("div", { class: "row" }, to, h("button", { class: "btn", disabled: d.players.length ? undefined : "disabled", onclick: () => net.send("mp", { op: "transfer", amount: Number(amount.value), to: to.value }) }, "Transferir")),
    h("p", { class: "hint" }, "Dica: Cofrinho protege o seu dinheiro: se você for nocauteado na Zona de Extravio, perde 10% do saldo em conta, mas não do Cofrinho."),
  );
  show("mp", "Mercado Pago", body);
}

// ------------------------------------------------------------------------------ lote / casa
export const plotHooks: { startBuild: (plotId: string, itemId: string, inside: boolean) => void } = { startBuild: () => {} };

const ACCESS_LABEL: Record<string, string> = { private: "🔒 Privada", guests: "👥 Só convidados", public: "🌐 Aberta" };

export function showPlot(d: any) {
  const body = h("div", { class: "plot" });
  const tierName = (t: number) => HOUSE_TIERS.find((x) => x.tier === t)?.name ?? "Terreno";
  const enterBtn = () =>
    d.tier > 0 && d.canEnter && !d.amInside
      ? h("button", { class: "btn primary", onclick: () => net.send("plot", { op: "enter", plotId: d.id }) }, "🚪 Entrar na casa")
      : d.amInside
        ? h("button", { class: "btn", onclick: () => (closeCommerce(), net.send("plot", { op: "exit", plotId: d.id })) }, "🚪 Sair da casa")
        : null;
  if (!d.owner) {
    add(body,
      h("p", {}, `Lote ${d.id} à venda no Bairro Vila Logística.`),
      h("div", { class: "mp-cards" }, h("div", { class: "kpi-card" }, h("b", {}, coin(d.price)), h("small", {}, "Preço do lote")), h("div", { class: "kpi-card" }, h("b", {}, `Nível ${d.minLevel}`), h("small", {}, "Requisito"))),
      d.hasPlot ? h("p", { class: "warn" }, "Você já tem um lote (um por pessoa).") : null,
      h("div", { class: "row end" },
        h("button", { class: "btn primary", disabled: d.hasPlot || d.coins < d.price || d.level < d.minLevel ? "disabled" : undefined, onclick: () => net.send("plot", { op: "buy", plotId: d.id }) }, `Comprar por ${coin(d.price)}`),
      ),
      d.coins < d.price ? h("p", { class: "hint" }, `Você tem ${coin(d.coins)}. Trabalhe no SVC, faça missões e derrote inimigos para juntar MeliCoins.`) : null,
    );
    return show("plot", `Lote ${d.id}`, body);
  }
  if (!d.mine) {
    add(body,
      h("p", {}, `Este lote é de ${d.ownerName}. ${d.tier ? `Tem uma ${tierName(d.tier)}.` : "Ainda é um terreno."}`),
      d.tier ? h("p", {}, `Visitas: `, h("b", {}, ACCESS_LABEL[d.access] ?? "🔒 Privada")) : null,
      d.tier && !d.canEnter ? h("p", { class: "muted" }, `A casa está fechada para você. Peça para ${d.ownerName} te adicionar como convidado(a) ou abrir a casa.`) : null,
      h("div", { class: "row end" }, enterBtn()),
    );
    return show("plot", `Lote ${d.id}`, body);
  }

  const key = "plot:" + d.id;
  if (!isOpen("plot")) tabs[key] = d.amInside ? "in" : "casa";
  let tab = tabs[key] ?? "casa";
  const next = d.tiers.find((t: any) => t.tier === d.tier + 1);
  const render = () => {
    clear(body);
    add(body,
      h("div", { class: "shop-head" }, h("b", {}, `Seu lote ${d.id} · ${tierName(d.tier)}`), h("span", { class: "coins-pill" }, h("img", { src: iconUrl("coins") }), coin(d.coins))),
      h("div", { class: "tabs" },
        ...([["casa", "🏠 Casa"], ["out", "🌳 Quintal"], ["in", "🛋️ Interior"], ["visitas", "👥 Visitas"]] as [string, string][]).map(([k, label]) =>
          h("button", { class: "tab" + (tab === k ? " on" : ""), onclick: () => ((tab = k), (tabs[key] = k), render()) }, label)),
      ),
    );
    if (tab === "casa") {
      add(body,
        next
          ? h("div", { class: "shop-item" },
              h("div", { class: "si-info" }, h("b", {}, d.tier ? `Evoluir para ${next.name}` : `Construir ${next.name}`), h("small", {}, next.desc), h("small", {}, `Requer nível ${next.minLevel} · até ${[0, 18, 32, 50][next.tier]} móveis dentro`)),
              h("div", { class: "si-buy" }, h("span", { class: "price" }, coin(next.price)), h("button", { class: "btn small primary", disabled: d.coins < next.price || d.level < next.minLevel ? "disabled" : undefined, onclick: () => net.send("plot", { op: "build", plotId: d.id }) }, d.tier ? "Evoluir" : "Construir")),
            )
          : h("p", { class: "good" }, "Sua casa está no nível máximo!"),
        d.tier
          ? h("div", { class: "row" },
              enterBtn(),
              h("button", { class: "btn", onclick: () => net.send("plot", { op: "rest", plotId: d.id }) }, "😴 Descansar (energia e vida cheias)"),
            )
          : h("p", { class: "muted" }, "Construa a casa para poder entrar, mobiliar e receber visitas."),
      );
    }
    const list = (where: "in" | "out") => {
      const items = d.decorItems.filter((it: any) => it.where === "any" || it.where === where);
      if (where === "in" && !d.tier) return h("p", { class: "muted" }, "Construa a casa primeiro.");
      return items.length
        ? h("div", { class: "shop-grid" }, ...items.map((it: any) =>
            h("div", { class: "shop-item" }, h("img", { src: iconUrl(it.id, 3) }), h("div", { class: "si-info" }, h("b", {}, `${it.name} x${it.qty}`)),
              h("div", { class: "si-buy" }, h("button", { class: "btn small primary", disabled: where === "in" && !d.amInside ? "disabled" : undefined, onclick: () => {
                closeCommerce();
                plotHooks.startBuild(d.id, it.id, where === "in");
              } }, "Colocar")),
            ),
          ))
        : h("p", { class: "muted" }, where === "in" ? "Você não tem móveis. Compre na Móveis da Vila (Rosa), na praça do Centro Logístico." : "Você não tem decorações de quintal. Compre na Casa & Construção do Seu Tião, na praça.");
    };
    if (tab === "out") add(body, list("out"), h("p", { class: "hint" }, `${d.decor.length} decoração(ões) no quintal. No modo decoração, o botão direito do mouse remove um item.`));
    if (tab === "in")
      add(body,
        d.tier && !d.amInside ? h("p", { class: "warn" }, "Entre na casa para mobiliar.", " ", enterBtn()) : null,
        list("in"),
        h("p", { class: "hint" }, `${d.inside.length}/${d.insideMax} móveis. Tapetes podem ficar por baixo de outros móveis. Botão direito remove (o de cima primeiro).`),
      );
    if (tab === "visitas") {
      const input = h("input", { class: "input", type: "text", placeholder: "Nomes separados por vírgula (ex.: Leticia, IndioZada)", value: (d.guests ?? []).join(", "), maxlength: "300" }) as HTMLInputElement;
      const save = (access: string) => net.send("plot", { op: "access", plotId: d.id, access, guests: input.value.split(",").map((x) => x.trim()).filter(Boolean) });
      add(body,
        h("p", {}, "Quem pode entrar na sua casa? Atual: ", h("b", {}, ACCESS_LABEL[d.access] ?? "🔒 Privada")),
        h("div", { class: "row" },
          ...(["private", "guests", "public"] as const).map((a) => h("button", { class: "btn" + (d.access === a ? " primary" : ""), onclick: () => save(a) }, ACCESS_LABEL[a])),
        ),
        h("label", { class: "field" }, h("span", {}, "Convidados (usado em “Só convidados”)"), input),
        h("div", { class: "row end" }, h("button", { class: "btn small", onclick: () => save(d.access === "private" ? "guests" : d.access) }, "Salvar convidados")),
        h("p", { class: "hint" }, "Ao fechar a casa, quem estiver lá dentro sem permissão é levado para fora. As casas dos líderes (Índio, Letícia, Mateus, Ramon, Dai) são abertas para visita!"),
      );
    }
  };
  render();
  show("plot", `Lote ${d.id}`, body);
}

export function showRealty(d: any) {
  const grid = h("div", { class: "baker-grid realty" },
    ...d.plots.map((p: any) => h("div", { class: "bk " + (p.mine ? "closed" : p.ownerName ? "" : "open") }, `${p.id}`, h("small", {}, p.mine ? "Seu" : p.ownerName ? p.ownerName : `${p.price} M$ · Nv${p.minLevel}`))),
  );
  show("realty", "Imobiliária Lar Logístico", h("div", {},
    h("p", {}, "Lotes do Bairro Vila Logística (ao sul da rua principal, à esquerda da avenida). Para comprar, vá até a placa do lote."),
    grid,
    h("p", { class: "hint" }, `Seu saldo: ${coin(d.coins)} · Seu nível: ${d.level}. Kitnet ${HOUSE_TIERS[0].price} M$ · Casa ${HOUSE_TIERS[1].price} M$ · Sobrado ${HOUSE_TIERS[2].price} M$.`),
  ));
}

export function itemName(id: string) {
  return ITEMS[id]?.name ?? id;
}
