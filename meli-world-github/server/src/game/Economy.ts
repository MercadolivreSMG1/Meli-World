/**
 * Economia do MELI WORLD: MeliCoins (M$), lojas da praça, Balcão de Anúncios (marketplace entre
 * jogadores), Mercado Pago (Cofrinho e transferências) e casa própria (lotes, construção, decoração).
 */
import {
  DECORS, getWorld, HOUSE_FOOT, HOUSE_TIERS, ITEMS, sellPrice, setHouseSolid, SHOPS, TILE, distToRect, INTERACT_RANGE,
} from "../../../shared/src";
import type { Listing, PlayerEntity, PlotState } from "./entities";
import type { World } from "./World";

const MAX_LISTINGS = 8;
const NPC_SELLERS = ["Loja Oficial SMG1", "Dona Zefa", "Seu Tião", "Ferreira", "Neide", "Vendedor Platinum", "LojaTop", "MercaShop"];

export class Economy {
  readonly map = getWorld();
  plots = new Map<string, PlotState>();
  market: Listing[] = [];
  payouts: Record<string, { coins: number; sold: string[] }> = {};
  private seq = 0;
  private acc = 0;
  private dirty = false;

  constructor(private w: World) {
    for (const p of this.map.plots) this.plots.set(p.id, { id: p.id, owner: "", ownerName: "", tier: 0, decor: [] });
    // casas dos líderes (vizinhança viva)
    const npcHomes: [string, string, number, [string, number, number][]][] = [
      ["L1A", "Índio", 3, [["poste", 1, 6], ["arvore", 8, 6], ["estatua_van", 2, 7]]],
      ["L1C", "Letícia", 2, [["canteiro", 1, 6], ["canteiro", 2, 6], ["banco", 6, 7]]],
      ["L2B", "Mateus Ferrari", 2, [["churrasqueira", 8, 6], ["caixa_correio", 7, 8]]],
      ["L3F", "Ramon", 3, [["piscina", 1, 6], ["poste", 8, 6]]],
      ["L4D", "Dai", 2, [["horta", 1, 7], ["arvore", 8, 7]]],
    ];
    for (const [id, name, tier, decor] of npcHomes) {
      const st = this.plots.get(id);
      if (!st) continue;
      st.owner = `npc:${name}`;
      st.ownerName = name;
      st.tier = tier;
      st.decor = decor.map(([kind, x, y]) => ({ kind, x, y }));
    }
    for (const p of this.map.plots) setHouseSolid(this.map, p, (this.plots.get(p.id)?.tier ?? 0) > 0);
    this.refillNpcListings();
  }

  async load() {
    const repo = this.w.repo;
    const plots = (await repo.kvGet("plots")) as PlotState[] | null;
    if (Array.isArray(plots))
      for (const st of plots) {
        if (!this.plots.has(st.id)) continue;
        this.plots.set(st.id, st);
        const def = this.map.plots.find((p) => p.id === st.id)!;
        setHouseSolid(this.map, def, st.tier > 0);
      }
    const market = (await repo.kvGet("market")) as Listing[] | null;
    if (Array.isArray(market)) this.market = market;
    const pay = (await repo.kvGet("payouts")) as Economy["payouts"] | null;
    if (pay && typeof pay === "object") this.payouts = pay;
    this.seq = this.market.length + 100;
    this.refillNpcListings();
  }

  async save() {
    if (!this.dirty) return;
    this.dirty = false;
    const repo = this.w.repo;
    await repo.kvSet("plots", [...this.plots.values()]);
    await repo.kvSet("market", this.market);
    await repo.kvSet("payouts", this.payouts);
  }

  private touch() {
    this.dirty = true;
  }

  // ================================================================== Lojas
  shopData(p: PlayerEntity, shopId: string) {
    const shop = SHOPS[shopId];
    if (!shop) return;
    this.w.out.send(p.sid, "shop", {
      id: shopId, name: shop.name, vendor: shop.vendor, coins: this.w.coins(p), level: p.level,
      items: shop.items.map((id) => ({ id, name: ITEMS[id].name, desc: ITEMS[id].desc, price: ITEMS[id].price ?? 0, minLevel: ITEMS[id].minLevel ?? 0 })),
      sell: Object.entries(p.rec.inventory)
        .filter(([id, q]) => q > 0 && ITEMS[id] && !["coletor", "colete", "botina", "cracha_tl"].includes(id) && !id.startsWith("medalha"))
        .map(([id, qty]) => ({ id, name: ITEMS[id].name, qty, price: sellPrice(id, shop.buyBonus) })),
    });
  }

  shop(p: PlayerEntity, msg: { op?: string; shop?: string; itemId?: string; qty?: number }) {
    const shop = SHOPS[String(msg.shop)];
    const id = String(msg.itemId ?? "");
    const def = ITEMS[id];
    if (!shop) return;
    if (!this.nearShop(p, String(msg.shop))) return this.w.toast(p, "Chegue mais perto da loja.", "warn");
    const qty = Math.max(1, Math.min(20, Math.floor(Number(msg.qty) || 1)));
    if (msg.op === "buy") {
      if (!def || !shop.items.includes(id) || !def.price) return;
      if (def.minLevel && p.level < def.minLevel) return this.w.toast(p, `Requer nível ${def.minLevel}.`, "warn");
      const cost = def.price * qty;
      if (this.w.coins(p) < cost) return this.w.toast(p, `MeliCoins insuficientes (${cost} M$).`, "bad");
      this.w.addCoins(p, -cost);
      p.rec.inventory[id] = (p.rec.inventory[id] ?? 0) + qty;
      this.w.emit(p, { type: "shop_buy", shop: String(msg.shop) });
      this.w.toast(p, `Comprou ${qty}x ${def.name} por ${cost} M$.`, "good");
    } else if (msg.op === "sell") {
      if (!def || !(p.rec.inventory[id] >= qty)) return;
      if (p.rec.equipped.weapon === id && p.rec.inventory[id] - qty <= 0) p.rec.equipped.weapon = "";
      if (p.rec.equipped.armor === id && p.rec.inventory[id] - qty <= 0) p.rec.equipped.armor = "";
      const gain = sellPrice(id, shop.buyBonus) * qty;
      this.w.takeItem(p, id, qty);
      this.w.addCoins(p, gain);
      this.w.emit(p, { type: "shop_sell", amount: qty });
      this.w.toast(p, `Vendeu ${qty}x ${def.name} por ${gain} M$.`, "good");
    }
    p.equipJson = JSON.stringify(p.rec.equipped);
    p.profileDirty = true;
    p.dirty = true;
    this.shopData(p, String(msg.shop));
  }

  private nearShop(p: PlayerEntity, shopId: string) {
    const stall = this.map.props.find((x) => x.kind === "stall" && x.data === shopId);
    const vendor = [...this.w.npcs.list.values()].find((n) => n.id === { equip: "ferreira", food: "zefa", home: "tiao", sell: "neide" }[shopId]);
    if (stall && distToRect(p.x, p.y, stall.x, stall.y, stall.w, stall.h) < INTERACT_RANGE + 40) return true;
    return !!vendor && Math.hypot(vendor.x - p.x, vendor.y - p.y) < 80;
  }

  // ================================================================== Balcão de Anúncios
  marketData(p: PlayerEntity) {
    this.w.out.send(p.sid, "market", {
      coins: this.w.coins(p),
      listings: this.market.map((l) => ({ ...l, mine: l.sellerId === p.id, name: ITEMS[l.itemId]?.name ?? l.itemId, ref: (ITEMS[l.itemId]?.price ?? sellPrice(l.itemId) * 3) * l.qty })),
      inventory: Object.entries(p.rec.inventory)
        .filter(([id, q]) => q > 0 && ITEMS[id] && !["coletor", "colete", "botina", "cracha_tl"].includes(id) && !id.startsWith("medalha"))
        .map(([id, qty]) => ({ id, name: ITEMS[id].name, qty, suggested: ITEMS[id].price ?? sellPrice(id) * 3 })),
    });
  }

  marketOp(p: PlayerEntity, msg: { op?: string; id?: string; itemId?: string; qty?: number; price?: number }) {
    if (msg.op === "browse") return this.marketData(p);
    if (msg.op === "list") {
      const id = String(msg.itemId ?? "");
      const qty = Math.max(1, Math.floor(Number(msg.qty) || 1));
      const price = Math.max(1, Math.min(99999, Math.floor(Number(msg.price) || 0)));
      if (!ITEMS[id] || !(p.rec.inventory[id] >= qty)) return this.w.toast(p, "Você não tem esse item.", "bad");
      if (this.market.filter((l) => l.sellerId === p.id).length >= MAX_LISTINGS) return this.w.toast(p, `Máximo de ${MAX_LISTINGS} anúncios ativos.`, "warn");
      if (p.rec.equipped.weapon === id && p.rec.inventory[id] - qty <= 0) p.rec.equipped.weapon = "";
      if (p.rec.equipped.armor === id && p.rec.inventory[id] - qty <= 0) p.rec.equipped.armor = "";
      this.w.takeItem(p, id, qty);
      this.market.push({ id: `A${++this.seq}`, sellerId: p.id, sellerName: p.name, itemId: id, qty, price, ts: Date.now() });
      this.w.emit(p, { type: "market_list" });
      this.w.toast(p, `Anúncio publicado: ${qty}x ${ITEMS[id].name} por ${price} M$.`, "good");
      this.w.out.broadcast("chat", { from: "Balcão", text: `${p.name} anunciou ${qty}x ${ITEMS[id].name} por ${price} M$`, sid: "" });
    } else if (msg.op === "cancel") {
      const i = this.market.findIndex((l) => l.id === msg.id && l.sellerId === p.id);
      if (i < 0) return;
      const [l] = this.market.splice(i, 1);
      p.rec.inventory[l.itemId] = (p.rec.inventory[l.itemId] ?? 0) + l.qty;
      this.w.toast(p, "Anúncio cancelado; item de volta ao inventário.", "info");
    } else if (msg.op === "buy") {
      const i = this.market.findIndex((l) => l.id === msg.id);
      if (i < 0) return this.w.toast(p, "Esse anúncio já foi vendido.", "warn");
      const l = this.market[i];
      if (l.sellerId === p.id) return this.w.toast(p, "Você não pode comprar o próprio anúncio.", "warn");
      if (this.w.coins(p) < l.price) return this.w.toast(p, "MeliCoins insuficientes.", "bad");
      this.market.splice(i, 1);
      this.w.addCoins(p, -l.price);
      p.rec.inventory[l.itemId] = (p.rec.inventory[l.itemId] ?? 0) + l.qty;
      this.paySeller(l, p.name);
      this.w.emit(p, { type: "market_buy" });
      this.w.toast(p, `Compra aprovada! ${l.qty}x ${ITEMS[l.itemId]?.name} de ${l.sellerName}.`, "good");
    }
    this.touch();
    p.profileDirty = true;
    p.dirty = true;
    p.equipJson = JSON.stringify(p.rec.equipped);
    this.marketData(p);
  }

  private paySeller(l: Listing, buyerName: string) {
    if (l.sellerId.startsWith("npc:")) return;
    const seller = this.w.playerById(l.sellerId);
    const text = `${l.qty}x ${ITEMS[l.itemId]?.name ?? l.itemId} para ${buyerName} (+${l.price} M$)`;
    if (seller) {
      this.w.addCoins(seller, l.price);
      this.w.emit(seller, { type: "market_sold" });
      this.w.toast(seller, `Vendido no Balcão: ${text}`, "xp");
      this.w.history(seller, "venda", `Vendeu ${text}`);
    } else {
      const po = (this.payouts[l.sellerId] ||= { coins: 0, sold: [] });
      po.coins += l.price;
      po.sold.push(text);
    }
    this.touch();
  }

  /** Repasses de vendas feitas enquanto o vendedor estava offline. */
  applyPayouts(p: PlayerEntity) {
    const po = this.payouts[p.id];
    if (!po) return;
    delete this.payouts[p.id];
    this.w.addCoins(p, po.coins);
    for (const _ of po.sold) this.w.emit(p, { type: "market_sold" });
    this.w.toast(p, `Enquanto você estava fora, o Balcão vendeu: ${po.sold.slice(0, 3).join("; ")}${po.sold.length > 3 ? "…" : ""} (+${po.coins} M$)`, "xp");
    this.touch();
  }

  private refillNpcListings() {
    const npc = this.market.filter((l) => l.sellerId.startsWith("npc:"));
    const pool = Object.values(ITEMS).filter((d) => d.price && !d.minLevel);
    for (let i = npc.length; i < 7; i++) {
      const d = pool[Math.floor(Math.random() * pool.length)];
      const qty = d.stack > 1 ? 1 + Math.floor(Math.random() * 4) : 1;
      const seller = NPC_SELLERS[Math.floor(Math.random() * NPC_SELLERS.length)];
      this.market.push({ id: `A${++this.seq}`, sellerId: `npc:${seller}`, sellerName: seller, itemId: d.id, qty, price: Math.round(d.price! * qty * (0.8 + Math.random() * 0.35)), ts: Date.now() });
    }
  }

  // ================================================================== Mercado Pago
  mpData(p: PlayerEntity) {
    this.w.out.send(p.sid, "mp", {
      coins: this.w.coins(p), savings: Math.floor(p.rec.savings ?? 0),
      players: [...this.w.players.values()].filter((o) => o !== p).map((o) => ({ sid: o.sid, name: o.name })),
    });
  }

  mpOp(p: PlayerEntity, msg: { op?: string; amount?: number; to?: string }) {
    const amount = Math.max(1, Math.floor(Number(msg.amount) || 0));
    if (msg.op === "deposit") {
      if (this.w.coins(p) < amount) return this.w.toast(p, "Saldo insuficiente.", "bad");
      this.w.addCoins(p, -amount);
      p.rec.savings = (p.rec.savings ?? 0) + amount;
      this.w.emit(p, { type: "mp_deposit" });
      this.w.toast(p, `Guardou ${amount} M$ no Cofrinho. Rende 2% por dia de jogo.`, "good");
    } else if (msg.op === "withdraw") {
      const have = Math.floor(p.rec.savings ?? 0);
      const a = Math.min(have, amount);
      if (a <= 0) return;
      p.rec.savings = have - a;
      this.w.addCoins(p, a);
      this.w.toast(p, `Resgatou ${a} M$ do Cofrinho.`, "good");
    } else if (msg.op === "transfer") {
      const to = this.w.players.get(String(msg.to));
      if (!to || to === p) return this.w.toast(p, "Colega não encontrado (precisa estar online).", "warn");
      if (this.w.coins(p) < amount) return this.w.toast(p, "Saldo insuficiente.", "bad");
      this.w.addCoins(p, -amount);
      this.w.addCoins(to, amount);
      this.w.emit(p, { type: "mp_transfer" });
      this.w.toast(p, `Pix MeliCoins enviado: ${amount} M$ para ${to.name}.`, "good");
      this.w.toast(to, `Você recebeu ${amount} M$ de ${p.name} pelo Mercado Pago!`, "xp");
    }
    p.profileDirty = true;
    p.dirty = true;
    this.mpData(p);
  }

  /** Rendimento diário do Cofrinho. */
  applyYield(p: PlayerEntity, day: number) {
    const last = p.rec.savingsDay ?? day;
    if (day > last && (p.rec.savings ?? 0) > 0) {
      const before = p.rec.savings ?? 0;
      p.rec.savings = Math.floor(before * Math.pow(1.02, Math.min(30, day - last)));
      const gain = p.rec.savings - before;
      if (gain > 0) this.w.toast(p, `Cofrinho Mercado Pago rendeu +${gain} M$!`, "xp");
    }
    p.rec.savingsDay = day;
  }

  // ================================================================== Lotes e casas
  plotDef(id: string) {
    return this.map.plots.find((p) => p.id === id);
  }

  ownPlot(p: PlayerEntity) {
    for (const st of this.plots.values()) if (st.owner === p.id) return st;
    return undefined;
  }

  plotInfo(p: PlayerEntity, id: string) {
    const def = this.plotDef(id);
    const st = this.plots.get(id);
    if (!def || !st) return;
    this.w.out.send(p.sid, "plot", {
      id, price: def.price, minLevel: def.minLevel, owner: st.owner, ownerName: st.ownerName, mine: st.owner === p.id,
      tier: st.tier, tiers: HOUSE_TIERS, coins: this.w.coins(p), level: p.level, hasPlot: !!this.ownPlot(p),
      decorItems: Object.entries(p.rec.inventory).filter(([iid, q]) => q > 0 && ITEMS[iid]?.decor).map(([iid, qty]) => ({ id: iid, name: ITEMS[iid].name, qty, decor: ITEMS[iid].decor })),
      decor: st.decor,
    });
  }

  plotOp(p: PlayerEntity, msg: { op?: string; plotId?: string; itemId?: string; x?: number; y?: number }) {
    const id = String(msg.plotId ?? "");
    const def = this.plotDef(id);
    const st = this.plots.get(id);
    if (!def || !st) return;
    if (msg.op !== "info") {
      const cx = (def.x + 5) * TILE;
      const cy = (def.y + 5) * TILE;
      if (Math.hypot(p.x - cx, p.y - cy) > 14 * TILE) return this.w.toast(p, "Vá até o lote para fazer isso.", "warn");
    }
    switch (msg.op) {
      case "info":
        return this.plotInfo(p, id);
      case "buy": {
        if (st.owner) return this.w.toast(p, "Esse lote já tem dono.", "warn");
        if (this.ownPlot(p)) return this.w.toast(p, "Você já tem um lote. (Um por pessoa!)", "warn");
        if (p.level < def.minLevel) return this.w.toast(p, `Requer nível ${def.minLevel}.`, "warn");
        if (this.w.coins(p) < def.price) return this.w.toast(p, `Faltam ${def.price - this.w.coins(p)} M$ para este lote.`, "bad");
        this.w.addCoins(p, -def.price);
        st.owner = p.id;
        st.ownerName = p.name;
        st.tier = 0;
        st.decor = [];
        p.rec.homePlot = id;
        this.w.emit(p, { type: "buy_plot" });
        this.w.toast(p, `Lote ${id} é seu! Agora construa a casa pela placa do lote.`, "xp");
        this.w.history(p, "lote", `Comprou o lote ${id}`);
        break;
      }
      case "build": {
        if (st.owner !== p.id) return;
        const next = HOUSE_TIERS.find((t) => t.tier === st.tier + 1);
        if (!next) return this.w.toast(p, "Sua casa já está no nível máximo.", "info");
        if (p.level < next.minLevel) return this.w.toast(p, `${next.name} requer nível ${next.minLevel}.`, "warn");
        if (this.w.coins(p) < next.price) return this.w.toast(p, `Faltam ${next.price - this.w.coins(p)} M$ para a ${next.name}.`, "bad");
        // não deixa ninguém preso dentro da área da casa
        for (const o of this.w.players.values()) {
          const tx = o.x / TILE;
          const ty = o.y / TILE;
          if (tx >= def.x + HOUSE_FOOT.dx && tx < def.x + HOUSE_FOOT.dx + HOUSE_FOOT.w && ty >= def.y + HOUSE_FOOT.dy && ty < def.y + HOUSE_FOOT.dy + HOUSE_FOOT.h + 0.5) {
            o.x = (def.x + 5) * TILE;
            o.y = (def.y + 11) * TILE;
            this.w.out.send(o.sid, "correct", { x: o.x, y: o.y });
          }
        }
        this.w.addCoins(p, -next.price);
        st.tier = next.tier;
        st.decor = st.decor.filter((d) => !this.overlapsHouse(def, d.x, d.y, DECORS[d.kind]?.w ?? 1, DECORS[d.kind]?.h ?? 1));
        setHouseSolid(this.map, def, true);
        this.w.emit(p, { type: "build_house" });
        this.w.toast(p, `${next.name} construída! Interaja com a porta para descansar.`, "xp");
        this.w.out.broadcast("chat", { from: "Vila Logística", text: `${p.name} construiu uma ${next.name} no lote ${id}!`, sid: "" });
        break;
      }
      case "decor": {
        if (st.owner !== p.id) return;
        const iid = String(msg.itemId ?? "");
        const kind = ITEMS[iid]?.decor;
        const dd = kind ? DECORS[kind] : undefined;
        if (!dd || !(p.rec.inventory[iid] > 0)) return this.w.toast(p, "Você não tem mais esse item.", "warn");
        const x = Math.floor(Number(msg.x));
        const y = Math.floor(Number(msg.y));
        if (!(x >= 1 && y >= 1 && x + dd.w - 1 <= 8 && y + dd.h - 1 <= 8)) return this.w.toast(p, "Fora da área do quintal.", "warn");
        if (st.tier > 0 && this.overlapsHouse(def, x, y, dd.w, dd.h)) return this.w.toast(p, "Aí fica a casa!", "warn");
        if (y + dd.h - 1 >= 8 && x <= 5 && x + dd.w - 1 >= 4) return this.w.toast(p, "Deixe o caminho do portão livre.", "warn");
        for (const o of st.decor) {
          const od = DECORS[o.kind] ?? { w: 1, h: 1 };
          if (x < o.x + od.w && x + dd.w > o.x && y < o.y + od.h && y + dd.h > o.y) return this.w.toast(p, "Já tem algo nesse lugar.", "warn");
        }
        if (st.decor.length >= 30) return this.w.toast(p, "Limite de 30 decorações por lote.", "warn");
        st.decor.push({ kind, x, y } as { kind: string; x: number; y: number });
        this.w.takeItem(p, iid, 1);
        this.w.emit(p, { type: "place_decor" });
        break;
      }
      case "remove_decor": {
        if (st.owner !== p.id) return;
        const x = Math.floor(Number(msg.x));
        const y = Math.floor(Number(msg.y));
        const i = st.decor.findIndex((o) => {
          const od = DECORS[o.kind] ?? { w: 1, h: 1 };
          return x >= o.x && x < o.x + od.w && y >= o.y && y < o.y + od.h;
        });
        if (i < 0) return;
        const [o] = st.decor.splice(i, 1);
        const iid = Object.values(ITEMS).find((d) => d.decor === o.kind)?.id;
        if (iid) p.rec.inventory[iid] = (p.rec.inventory[iid] ?? 0) + 1;
        break;
      }
      case "rest": {
        if (st.owner !== p.id || st.tier <= 0) return;
        const hx = (def.x + 5) * TILE;
        const hy = (def.y + HOUSE_FOOT.dy + HOUSE_FOOT.h + 1) * TILE;
        if (Math.hypot(p.x - hx, p.y - hy) > 64) return this.w.toast(p, "Chegue até a porta da sua casa.", "warn");
        p.rec.energy = 100;
        p.rec.hp = 100;
        p.rec.homePlot = id;
        this.w.emit(p, { type: "rest_home" });
        this.w.toast(p, "Que descanso! Energia e vida cheias. Sua casa agora é seu ponto de retorno.", "good");
        p.actionAnim = "sit";
        p.actionUntil = Date.now() + 2500;
        break;
      }
    }
    this.touch();
    p.profileDirty = true;
    p.dirty = true;
    this.plotInfo(p, id);
  }

  private overlapsHouse(def: { x: number; y: number }, x: number, y: number, w: number, h: number) {
    const hx0 = HOUSE_FOOT.dx;
    const hy0 = HOUSE_FOOT.dy;
    const hx1 = hx0 + HOUSE_FOOT.w;
    const hy1 = hy0 + HOUSE_FOOT.h + 1; // varanda
    void def;
    return x < hx1 && x + w > hx0 && y < hy1 && y + h > hy0;
  }

  homeSpawn(p: PlayerEntity): [number, number] | null {
    const st = p.rec.homePlot ? this.plots.get(p.rec.homePlot) : this.ownPlot(p);
    if (!st || st.owner !== p.id || st.tier <= 0) return null;
    const def = this.plotDef(st.id)!;
    return [(def.x + 5) * TILE, (def.y + HOUSE_FOOT.dy + HOUSE_FOOT.h + 1) * TILE + 6];
  }

  // ================================================================== tick
  tick(dt: number) {
    this.acc += dt;
    if (this.acc < 20) return;
    this.acc = 0;
    // clientes NPC compram anúncios com preço justo
    for (const l of [...this.market]) {
      if (l.sellerId.startsWith("npc:")) continue;
      const ref = (ITEMS[l.itemId]?.price ?? sellPrice(l.itemId) * 3) * l.qty;
      const fair = l.price <= ref * 1.4;
      if (fair && Math.random() < (l.price <= ref ? 0.25 : 0.1)) {
        this.market.splice(this.market.indexOf(l), 1);
        this.paySeller(l, ["Cliente de Campinas", "Cliente de Osasco", "Cliente de Guarulhos", "Cliente do Rio"][Math.floor(Math.random() * 4)]);
      }
    }
    // anúncios de NPC giram
    if (Math.random() < 0.3) {
      const npc = this.market.filter((l) => l.sellerId.startsWith("npc:"));
      if (npc.length) this.market.splice(this.market.indexOf(npc[Math.floor(Math.random() * npc.length)]), 1);
    }
    this.refillNpcListings();
    this.touch();
    this.save().catch(() => {});
  }
}
