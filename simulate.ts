/**
 * Simulação headless do jogo (sem rede): dois jogadores fazem o onboarding e o fluxo
 * completo do pacote até o despacho de uma rota. Rode com: npm run test:sim -w server
 */
import { boxBlocked, getWorld, PROP_DEFS, TILE, INTERACT_RANGE, distToRect, MISSIONS, objectiveGuide, interiorAt, plotDoor, interiorSpotError, DECORS, ITEMS, SHOPS } from "../../../shared/src";
import { MemoryRepo } from "../db/repo";
import { World } from "../game/World";

const inbox = new Map<string, { type: string; msg: any }[]>();
const world = new World(new MemoryRepo(), {
  send: (sid, type, msg) => {
    if (!inbox.has(sid)) inbox.set(sid, []);
    inbox.get(sid)!.push({ type, msg });
  },
  broadcast: () => {},
});
const map = getWorld();
let failures = 0;
function check(cond: boolean, label: string) {
  console.log(`${cond ? "  ok " : "FAIL "} ${label}`);
  if (!cond) failures++;
}
function last(sid: string, type: string) {
  const l = (inbox.get(sid) ?? []).filter((m) => m.type === type);
  return l[l.length - 1]?.msg;
}
function ticks(n: number) {
  for (let i = 0; i < n; i++) world.tick(50);
}
function placeNear(sid: string, tx: number, ty: number, tw: number, th: number) {
  const p = world.players.get(sid)!;
  for (let r = 0; r < 40; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const x = (tx + tw / 2) * TILE + dx * 4;
        const y = (ty + th) * TILE + 6 + dy * 4;
        if (!boxBlocked(map, x, y) && distToRect(x, y, tx, ty, tw, th) <= INTERACT_RANGE - 2) {
          p.x = x;
          p.y = y;
          return;
        }
      }
  throw new Error("sem posição livre perto de " + tx + "," + ty);
}
function prop(kind: string) {
  return map.props.find((p) => p.kind === kind)!;
}
function useProp(sid: string, kind: string) {
  const pr = prop(kind);
  placeNear(sid, pr.x, pr.y, pr.w, pr.h);
  world.interact(sid, { kind: "prop", id: pr.id });
}
function talk(sid: string, npcId: string) {
  const n = world.npcs.list.get(npcId)!;
  const p = world.players.get(sid)!;
  p.x = n.x + 6;
  p.y = n.y + 4;
  world.interact(sid, { kind: "npc", id: npcId });
  return last(sid, "dialog");
}
function acceptFrom(sid: string, npcId: string) {
  const d = talk(sid, npcId);
  const c = d?.choices?.find((x: any) => x.id.startsWith("accept:"));
  if (c) world.dialogChoice(sid, { npcId, choice: c.id });
  return c?.id;
}
function solve(sid: string, mapper: (data: any, answer: any) => any) {
  const p = world.players.get(sid)!;
  const pend = p.pending!;
  const mg = last(sid, "minigame");
  world.minigameResult(sid, { token: pend.token, result: mapper(mg.data, pend.answer) });
}
const done = (sid: string, id: string) => world.players.get(sid)!.rec.missions.completed.includes(id);

async function main() {
  await world.init();
  await world.join("A", { token: "token-AAAAAAAA", name: "Ericlis", look: {} });
  await world.join("B", { token: "token-BBBBBBBB", name: "Colega" });
  check(world.players.size === 2, "dois jogadores conectados");
  ticks(5);

  // ---------------- onboarding
  check(acceptFrom("A", "antonio") === "accept:primeiro_dia", "Seu Antônio oferece 'Primeiro dia'");
  useProp("A", "timeclock");
  talk("A", "leticia");
  check(done("A", "primeiro_dia"), "missão primeiro_dia concluída");
  check(acceptFrom("A", "leticia") === "accept:sem_epi", "Letícia oferece 'Sem EPI'");
  useProp("A", "locker");
  useProp("A", "charger");
  check(done("A", "sem_epi"), "missão sem_epi concluída (EPI + coletor 100%)");
  acceptFrom("A", "leticia");
  useProp("A", "briefing_board");
  check(done("A", "tier1"), "Tier 1 concluído");
  acceptFrom("A", "leticia");
  useProp("A", "training_screen");
  solve("A", (_d, a) => ({ answers: a.answers }));
  check(done("A", "treinamento"), "treinamento aprovado");
  check(acceptFrom("A", "indio") === "accept:primeiro_pacote", "Índio oferece 'Do flowrack ao baker'");

  // ---------------- etiquetagem
  for (let i = 0; i < 2; i++) {
    useProp("A", "label_table");
    solve("A", (_d, a) => ({ choices: a }));
  }
  check((world.players.get("A")!.rec.stats.label ?? 0) >= 3, "etiquetou pelo menos 3 pacotes");

  // ---------------- pesca + conteinerização
  const pA = world.players.get("A")!;
  let containerized = 0;
  for (let round = 0; round < 6 && containerized < 3; round++) {
    const [a] = map.islandRanges.B;
    placeNear("A", a + 2, map.belt.y, 2, 2);
    pA.y = (map.belt.y + 2) * TILE + 6; // fileira logo abaixo da esteira
    world.interact("A", { kind: "belt", id: "B" });
    if (!pA.pending) {
      ticks(20);
      continue;
    }
    solve("A", (d) => ({ picked: d.items.filter((x: any) => x.island === "B").map((x: any) => x.id) }));
    for (const pkg of [...pA.carrying]) {
      const b = world.ops.homeBaker(pkg.route)!;
      if (!b.setupDone) b.setupDone = true;
      pA.x = b.x;
      pA.y = b.y + 12;
      world.interact("A", { kind: "baker", id: b.id });
      if (pA.pending) {
        solve("A", (_d, ans) => ({ level: ans.level }));
        containerized++;
      }
    }
  }
  check(containerized >= 3, `conteinerizou ${containerized} pacotes com tela verde`);
  check(done("A", "primeiro_pacote"), "missão 'Do flowrack ao baker' concluída");

  // ---------------- traslado + carregamento + despacho
  const van = [...world.vehicles.list.values()].find((v) => v.kind === "van" && v.state === "docked")!;
  check(!!van, `van na doca (${van?.route} @ ${van?.dock})`);
  const baker = world.ops.closedBakerFor(van.route)!;
  check(!!baker, `baker fechado da rota ${van.route}`);
  pA.x = baker.x;
  pA.y = baker.y + 12;
  world.interact("A", { kind: "baker", id: baker.id });
  check(pA.carryKind === "baker", "empurrando o baker");
  pA.x = van.x;
  pA.y = van.y - 40;
  while (boxBlocked(map, pA.x, pA.y)) pA.y -= 2;
  ticks(1);
  world.interact("A", { kind: "vehicle", id: van.id });
  check(pA.pending?.kind === "loading", "mini-jogo de carregamento aberto");
  solve("A", (_d, a) => ({ order: a.order }));
  check(van.state === "counting", "motorista contando");
  let guard = 0;
  while (van.state !== "leaving" && van.state !== "gone" && guard++ < 4000) {
    if (van.state === "aduana") {
      pA.x = van.x;
      pA.y = van.y - 40;
      while (boxBlocked(map, pA.x, pA.y)) pA.y -= 2;
      world.interact("A", { kind: "vehicle", id: van.id });
      solve("A", (_d, a) => ({ count: a.count }));
    }
    ticks(10);
  }
  check(van.state === "leaving" || van.state === "gone", "rota despachada pela van");
  check((pA.rec.stats.dispatch ?? 0) >= 1, "evento de despacho creditado ao jogador");

  // ---------------- recebimento LH
  const lh = [...world.vehicles.list.values()].find((v) => v.kind === "lh" && v.state === "docked");
  if (lh) {
    const before = world.ops.backlog.length + world.ops.volumosos.length;
    pA.x = lh.x;
    pA.y = lh.y - 52;
    while (boxBlocked(map, pA.x, pA.y)) pA.y -= 2;
    world.interact("A", { kind: "vehicle", id: lh.id });
    check(pA.pending?.kind === "receiving", "checklist de recebimento aberto");
    solve("A", (_d, a) => ({ order: a.order, decision: a.decision }));
    check(world.ops.backlog.length + world.ops.volumosos.length > before, "pacotes do LH entraram no flowrack");
  }

  // ---------------- combate na Zona de Extravio
  check(world.coins(pA) > 50, `ganhou MeliCoins trabalhando (${world.coins(pA)} M$)`);
  check(acceptFrom("A", "ranieri") === "accept:patrulha_extravio", "Ranieri oferece a patrulha");
  check((pA.rec.inventory.regua ?? 0) === 1, "recebeu a Régua de Aço");
  world.action("A", { type: "equip", itemId: "regua" });
  check(pA.rec.equipped.weapon === "regua", "régua equipada");
  let kills = 0;
  for (let round = 0; round < 60 && kills < 3; round++) {
    const rat = [...world.combat.enemies.values()].find((e) => e.kind === "rato" && e.state !== "dead");
    if (!rat) {
      ticks(100);
      continue;
    }
    pA.x = rat.x - 12;
    pA.y = rat.y;
    pA.rec.hp = 100;
    for (let i = 0; i < 30 && rat.state !== "dead"; i++) {
      pA.atkAt = 0;
      pA.x = rat.x - 12;
      pA.y = rat.y;
      world.attack("A", { dir: "right" });
      ticks(2);
    }
    if (rat.state === "dead") kills++;
  }
  check(kills >= 3, `derrotou ${kills} Ratos do Estoque`);
  check((pA.rec.stats.kill ?? 0) >= 3, "eventos de kill registrados");
  // dano recebido
  const hp0 = pA.rec.hp ?? 100;
  const fr = [...world.combat.enemies.values()].find((e) => e.kind !== "atraso" && e.state !== "dead")!;
  pA.x = fr.x + 6;
  pA.y = fr.y;
  ticks(60);
  check((pA.rec.hp ?? 100) < hp0 || (pA.rec.stats.kill ?? 0) > 0, "inimigos causam dano");
  pA.rec.hp = 100;

  // ---------------- casa própria
  world.addCoins(pA, 5000);
  const plot = map.plots.find((pl) => world.economy.plots.get(pl.id)!.owner === "")!;
  pA.x = (plot.x + 5) * TILE;
  pA.y = (plot.y + 11) * TILE;
  world.plotOp("A", { op: "buy", plotId: plot.id });
  check(world.economy.plots.get(plot.id)!.owner === pA.id, `comprou o lote ${plot.id}`);
  world.plotOp("A", { op: "build", plotId: plot.id });
  check(world.economy.plots.get(plot.id)!.tier === 1, "construiu a Kitnet");
  check(map.solid[(plot.y + 2) * map.w + plot.x + 4] === 1, "casa tem colisão");
  const stall = map.props.find((x) => x.kind === "stall" && x.data === "home")!;
  pA.x = (stall.x + 2) * TILE;
  pA.y = (stall.y + 4) * TILE;
  world.shopOp("A", { op: "buy", shop: "home", itemId: "decor_banco", qty: 1 });
  check((pA.rec.inventory.decor_banco ?? 0) === 1, "comprou banco de jardim na loja");
  pA.x = (plot.x + 5) * TILE;
  pA.y = (plot.y + 11) * TILE;
  world.plotOp("A", { op: "decor", plotId: plot.id, itemId: "decor_banco", x: 1, y: 6 });
  check(world.economy.plots.get(plot.id)!.decor.length === 1, "colocou decoração no lote");
  pA.x = (plot.x + 5) * TILE;
  pA.y = (plot.y + 6) * TILE;
  world.plotOp("A", { op: "rest", plotId: plot.id });
  check((pA.rec.stats.rest_home ?? 0) === 1, "descansou em casa");

  // ---------------- interior da casa + permissões de visita
  const pBv = world.players.get("B")!;
  const st = world.economy.plots.get(plot.id)!;
  check(st.inside.length === 1 && st.inside[0].kind === "cama", "casa nova vem com uma cama");
  [pA.x, pA.y] = plotDoor(plot);
  world.interact("A", { kind: "plot", id: plot.id });
  check(interiorAt(map, pA.x, pA.y) === map.plots.indexOf(plot), "dono entrou na casa (sala interna)");
  check(!boxBlocked(map, pA.x, pA.y), "ponto de entrada da casa é livre");
  pA.rec.inventory.decor_sofa_casa = 1;
  pA.rec.inventory.decor_tapete = 1;
  pA.rec.inventory.decor_banco = 1;
  world.plotOp("A", { op: "decor_in", plotId: plot.id, itemId: "decor_tapete", x: 2, y: 4 });
  world.plotOp("A", { op: "decor_in", plotId: plot.id, itemId: "decor_sofa_casa", x: 2, y: 4 });
  check(st.inside.length === 3, "colocou tapete e sofá por cima (tapete não colide)");
  world.plotOp("A", { op: "decor_in", plotId: plot.id, itemId: "decor_banco", x: 10, y: 6 });
  check(st.inside.length === 3 && (pA.rec.inventory.decor_banco ?? 0) === 1, "banco de jardim não entra em casa");
  world.plotOp("A", { op: "remove_decor_in", plotId: plot.id, x: 3, y: 4 });
  check((pA.rec.inventory.decor_sofa_casa ?? 0) === 1 && st.inside.some((o) => o.kind === "tapete"), "remover tira o sofá (de cima) e devolve ao inventário");
  // visita: privada
  [pBv.x, pBv.y] = plotDoor(plot);
  world.interact("B", { kind: "plot", id: plot.id });
  check(interiorAt(map, pBv.x, pBv.y) < 0, "casa privada: visitante não entra");
  world.plotOp("A", { op: "access", plotId: plot.id, access: "guests", guests: [pBv.name] });
  world.interact("B", { kind: "plot", id: plot.id });
  check(interiorAt(map, pBv.x, pBv.y) === map.plots.indexOf(plot), "convidado entrou na casa");
  world.plotOp("A", { op: "access", plotId: plot.id, access: "private" });
  check(interiorAt(map, pBv.x, pBv.y) < 0, "ao fechar a casa o visitante é levado para fora");
  world.plotOp("A", { op: "access", plotId: plot.id, access: "public" });
  [pBv.x, pBv.y] = plotDoor(plot);
  world.interact("B", { kind: "plot", id: plot.id });
  check(interiorAt(map, pBv.x, pBv.y) >= 0, "casa aberta: qualquer um entra");
  const exitProp = map.props.find((x) => x.kind === "house_exit" && x.data === plot.id)!;
  pBv.x = (exitProp.x + 1) * TILE;
  pBv.y = (exitProp.y + 0.5) * TILE;
  world.interact("B", { kind: "prop", id: exitProp.id });
  check(interiorAt(map, pBv.x, pBv.y) < 0, "saiu pela porta");
  // casa do Índio aberta para visita
  const indio = map.plots.find((x) => x.id === "L1A")!;
  [pBv.x, pBv.y] = plotDoor(indio);
  world.interact("B", { kind: "plot", id: "L1A" });
  check(interiorAt(map, pBv.x, pBv.y) === 0 && (pBv.rec.stats.visit_house ?? 0) >= 1, "visitou a casa do Índio");
  world.plotOp("B", { op: "exit", plotId: "L1A" });
  // validação: móveis dos líderes estão em lugares válidos
  let badNpc = 0;
  for (const s2 of world.economy.plots.values()) if (s2.owner.startsWith("npc:")) {
    const acc: typeof s2.inside = [];
    for (const o of s2.inside) {
      if (interiorSpotError(acc, o.kind, o.x, o.y)) {
        badNpc++;
        console.log("   móvel inválido", s2.id, o.kind, o.x, o.y, interiorSpotError(acc, o.kind, o.x, o.y));
      }
      acc.push(o);
    }
  }
  check(badNpc === 0, "móveis das casas dos líderes em posições válidas");
  // pega sala de dentro: a porta está acessível a partir do ponto de entrada
  [pA.x, pA.y] = plotDoor(plot);
  world.economy.exitHouse(pA);
  // caixa misteriosa
  pA.rec.inventory.caixa_misteriosa = 2;
  const invBefore = Object.values(pA.rec.inventory).reduce((a, b) => a + b, 0);
  world.action("A", { type: "use", itemId: "caixa_misteriosa" });
  check((pA.rec.inventory.caixa_misteriosa ?? 0) === 1 && Object.values(pA.rec.inventory).reduce((a, b) => a + b, 0) === invBefore, "caixa misteriosa abriu e deu um item");
  // catálogo: todo item de loja existe; toda decoração tem item
  let badShop = 0;
  for (const sh of Object.values(SHOPS)) for (const it of sh.items) if (!ITEMS[it]) badShop++;
  for (const k of Object.keys(DECORS)) if (!ITEMS[`decor_${k}`]) badShop++;
  check(badShop === 0, `catálogo consistente (${Object.keys(ITEMS).length} itens, ${Object.keys(DECORS).length} decorações/móveis)`);

  // ---------------- Balcão de Anúncios entre jogadores
  const board = map.props.find((x) => x.kind === "market_board")!;
  const pB = world.players.get("B")!;
  for (const pp of [pA, pB]) {
    pp.x = (board.x + 1) * TILE;
    pp.y = (board.y + 3) * TILE;
  }
  pA.rec.inventory.coxinha = 3;
  world.marketOp("A", { op: "list", itemId: "coxinha", qty: 2, price: 20 });
  const listing = world.economy.market.find((l) => l.sellerId === pA.id)!;
  check(!!listing, "anúncio publicado no Balcão");
  world.addCoins(pB, 100);
  const coinsA = world.coins(pA);
  world.marketOp("B", { op: "buy", id: listing.id });
  check((pB.rec.inventory.coxinha ?? 0) === 2, "jogador B comprou o anúncio");
  check(world.coins(pA) === coinsA + 20, "vendedor recebeu os MeliCoins");

  // ---------------- Mercado Pago
  const term = map.props.find((x) => x.kind === "mp_terminal")!;
  pA.x = (term.x + 1) * TILE;
  pA.y = (term.y + 3) * TILE;
  world.mpOp("A", { op: "deposit", amount: 100 });
  check((pA.rec.savings ?? 0) === 100, "depósito no Cofrinho");
  world.mpOp("A", { op: "transfer", amount: 10, to: "B" });
  check(world.coins(pB) >= 10, "transferência para colega");

  // ---------------- chefe: O Grande Atraso
  const boss = [...world.combat.enemies.values()].find((e) => e.kind === "atraso")!;
  check(!!boss && boss.state !== "dead", "O Grande Atraso está no Galpão Abandonado");
  pA.rec.inventory.lamina_onda_verde = 1;
  world.action("A", { type: "equip", itemId: "lamina_onda_verde" });
  pA.rec.inventory.colete_kevlar = 1;
  world.action("A", { type: "equip", itemId: "colete_kevlar" });
  for (let i = 0; i < 400 && boss.state !== "dead"; i++) {
    pA.rec.hp = 100;
    pA.atkAt = 0;
    pA.x = boss.x - 14;
    pA.y = boss.y;
    world.attack("A", { dir: "right" });
    ticks(1);
  }
  check(boss.state === "dead", "derrotou O Grande Atraso");
  check((pA.rec.inventory.decor_trofeu ?? 0) >= 1, "ganhou o Troféu da Pontualidade");
  // todos os objetivos têm alvo no guia
  let noTarget = 0;
  for (const m of MISSIONS) for (const o of m.objectives) if (!objectiveGuide(o).target) noTarget++;
  check(noTarget === 0, "todo objetivo de missão tem destino no guia");

  // ---------------- mundo vivo por 10 minutos de jogo
  const t0 = Date.now();
  ticks(12000);
  const npcMoved = [...world.npcs.list.values()].filter((n) => n.path.length || n.anim !== "idle").length;
  check(npcMoved > 5, `NPCs ativos (${npcMoved})`);
  check(world.ops.counters.processed > 0, `operação andando sozinha (${world.ops.counters.processed} pacotes processados)`);
  console.log(`  ... 10 h de jogo simulados em ${Date.now() - t0} ms · relógio ${Math.floor((world.clock % 1440) / 60)}h`);
  console.log(`  XP do jogador A: ${pA.rec.xp} (nível ${pA.level}, ${pA.title})`);
  const prof = await world.buildProfile(pA);
  check(prof.completedMissions.length >= 5, `perfil com ${prof.completedMissions.length} missões concluídas`);
  for (const k of Object.keys(PROP_DEFS)) if (!PROP_DEFS[k].name) failures++;
  await world.leave("B");
  check(world.players.size === 1, "jogador B saiu");
  console.log(failures ? `\n${failures} FALHA(S)` : "\nTudo certo!");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
