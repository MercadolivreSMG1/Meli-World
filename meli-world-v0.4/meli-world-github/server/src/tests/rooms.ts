/**
 * Teste das salas: duas instâncias do World ligadas ao mesmo Hub (mundo compartilhado).
 * Rode com: npx tsx src/tests/rooms.ts  (na pasta server)
 */
import { TILE } from "../../../shared/src";
import { MemoryRepo } from "../db/repo";
import { Hub } from "../game/Hub";
import { World } from "../game/World";

let failures = 0;
function check(cond: boolean, label: string) {
  console.log(`${cond ? "  ok " : "FAIL "} ${label}`);
  if (!cond) failures++;
}

async function main() {
  const repo = new MemoryRepo();
  const hub = new Hub(repo);
  await hub.start();
  const inbox: Record<string, { room: number; type: string; msg: any }[]> = {};
  const mk = (n: number) =>
    new World(repo, {
      send: (sid, type, msg) => (inbox[sid] ||= []).push({ room: n, type, msg }),
      broadcast: () => {},
    }, hub);
  const w1 = mk(1);
  const w2 = mk(2);
  const evicted: string[] = [];
  hub.onEvict = (_w, sid) => evicted.push(sid);
  check(w1.economy === w2.economy, "as duas salas usam a mesma economia");

  const a = await w1.join("a1", { token: "token-AAAAAAAA", name: "Ana" });
  const b = await w2.join("b1", { token: "token-BBBBBBBB", name: "Beto" });
  check(hub.online() === 2, "2 jogadores online somando as salas");

  // lote comprado na sala 1 aparece na sala 2
  a.rec.coins = 5000;
  a.rec.xp = 99999;
  a.level = 30;
  const plot = w1.map.plots.find((p) => w1.economy.plots.get(p.id)!.owner === "")!;
  a.x = (plot.x + 5) * TILE;
  a.y = (plot.y + 11) * TILE;
  w1.plotOp("a1", { op: "buy", plotId: plot.id });
  check(w2.economy.plots.get(plot.id)!.owner === a.id, "lote comprado na Sala 1 é da Ana também na Sala 2");

  // Balcão: anúncio na sala 1, compra na sala 2
  const board = w1.map.props.find((x) => x.kind === "market_board")!;
  for (const p of [a, b]) {
    p.x = (board.x + 1) * TILE;
    p.y = (board.y + 3) * TILE;
  }
  a.rec.inventory.coxinha = 2;
  w1.marketOp("a1", { op: "list", itemId: "coxinha", qty: 2, price: 30 });
  const l = w1.economy.market.find((x) => x.sellerId === a.id)!;
  b.rec.coins = 100;
  const before = a.rec.coins;
  w2.marketOp("b1", { op: "buy", id: l.id });
  check((b.rec.inventory.coxinha ?? 0) === 2, "Beto (Sala 2) comprou o anúncio da Ana (Sala 1)");
  check(a.rec.coins === before + 30, "Ana recebeu o pagamento mesmo estando em outra sala");
  check((inbox.a1 ?? []).some((m) => m.room === 1 && m.type === "toast"), "aviso da venda chegou na sala certa");

  // mesmo personagem entrando em outra sala: a sessão antiga é encerrada e salva antes
  a.rec.coins = 777;
  const a2 = await w2.join("a2", { token: "token-AAAAAAAA", name: "Ana" });
  check(!w1.players.has("a1") && w2.players.has("a2"), "Ana saiu da Sala 1 ao entrar na Sala 2");
  check(evicted.includes("a1"), "a conexão antiga foi avisada/encerrada");
  check(a2.rec.coins === 777, "progresso salvo e carregado na nova sala");

  // sala encerrada sai do Hub
  w1.dispose();
  check(!hub.worlds.has(w1), "sala encerrada saiu do Hub");
  w2.tick(50);
  await hub.stop();
  console.log(failures ? `\n${failures} FALHA(S)` : "\nSalas OK!");
  process.exit(failures ? 1 : 0);
}
main();
