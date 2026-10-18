/** Servidor MELI WORLD: HTTP (Express) + WebSocket (Colyseus) na mesma porta. */
import cors from "cors";
import express from "express";
import fs from "fs";
import http from "http";
import path from "path";
import { matchMaker, Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { DEFAULT_PORT } from "../../shared/src";
import { createRepo } from "./db/repo";
import { Hub } from "./game/Hub";
import { ROOM_MAX, WorldRoom } from "./rooms/WorldRoom";

const PORT = Number(process.env.PORT || DEFAULT_PORT);
const repo = createRepo();
WorldRoom.repo = repo;
// um só mundo persistente (lotes, Balcão, Mercado Pago) compartilhado por todas as salas
const hub = new Hub(repo);
WorldRoom.hub = hub;
hub.onEvict = (world, sid) => {
  for (const r of WorldRoom.rooms.values()) if (r.world === world) r.evict(sid);
};

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req: any, res: any) => res.json({ ok: true, repo: repo.kind, time: Date.now(), online: hub.online(), roomMax: ROOM_MAX }));
// salas públicas (as privadas não aparecem aqui: entra-se pelo código)
app.get("/api/rooms", async (_req: any, res: any) => {
  const list = await matchMaker.query({ name: "world" });
  res.json(
    list
      .filter((r: any) => !r.private)
      .map((r: any) => ({ id: r.roomId, name: r.metadata?.name ?? "Sala", clients: r.clients, max: r.maxClients }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name, "pt-BR", { numeric: true })),
  );
});
app.get("/api/leaderboard", async (_req: any, res: any) => res.json(await repo.leaderboard(10)));

// Em produção o servidor também entrega o cliente compilado (npm run build).
const dist = path.resolve(__dirname, "..", "..", "client", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("/", (_req: any, res: any) => res.sendFile(path.join(dist, "index.html")));
  console.log(`[http] servindo cliente de ${dist}`);
}

const server = http.createServer(app);
const gameServer = new Server({ transport: new WebSocketTransport({ server }) });
gameServer.define("world", WorldRoom);

hub
  .start()
  .then(() => gameServer.listen(PORT))
  .then(async () => {
    // a Sala 1 fica sempre aberta; as outras nascem quando a anterior lota e somem quando esvaziam
    await matchMaker.createRoom("world", { persistent: true });
    console.log(`\n  MELI WORLD — LOGISTICS LIFE`);
    console.log(`  Servidor multiplayer em ws://localhost:${PORT}  (persistência: ${repo.kind}, até ${ROOM_MAX} por sala)\n`);
  });
// Ctrl+C: o Colyseus faz o graceful shutdown sozinho (chama onDispose -> salva todos os jogadores).
