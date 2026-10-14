/**
 * Simulação headless do jogo (sem rede): dois jogadores fazem o onboarding e o fluxo
 * completo do pacote até o despacho de uma rota. Rode com: npm run test:sim -w server
 */
import { boxBlocked, getWorld, PROP_DEFS, TILE, INTERACT_RANGE, distToRect } from "../../../shared/src";
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
  await world.join("A", { token: "token-AAAAAAAA", name: "Ericlis", look: {} });
  await world.join("B", { token: "token-BBBBBBBB", name: "Colega" });
  check(world.players.size === 2, "dois jogadores conectados");
  ticks(5);

  // ---------------- onboarding
  check(acceptFrom("A", "antonio") === "accept:primeiro_dia", "Seu Antônio oferece 'Primeiro dia'");
  useProp("A", "timeclock");
  talk("A", "livia");
  check(done("A", "primeiro_dia"), "missão primeiro_dia concluída");
  check(acceptFrom("A", "livia") === "accept:sem_epi", "Lívia oferece 'Sem EPI'");
  useProp("A", "locker");
  useProp("A", "charger");
  check(done("A", "sem_epi"), "missão sem_epi concluída (EPI + coletor 100%)");
  acceptFrom("A", "livia");
  useProp("A", "briefing_board");
  check(done("A", "tier1"), "Tier 1 concluído");
  acceptFrom("A", "livia");
  useProp("A", "training_screen");
  solve("A", (_d, a) => ({ answers: a.answers }));
  check(done("A", "treinamento"), "treinamento aprovado");
  check(acceptFrom("A", "iago") === "accept:primeiro_pacote", "Iago oferece 'Do flowrack ao baker'");

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
