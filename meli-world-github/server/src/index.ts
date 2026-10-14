/** Servidor MELI WORLD: HTTP (Express) + WebSocket (Colyseus) na mesma porta. */
import cors from "cors";
import express from "express";
import fs from "fs";
import http from "http";
import path from "path";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { DEFAULT_PORT } from "../../shared/src";
import { createRepo } from "./db/repo";
import { WorldRoom } from "./rooms/WorldRoom";

const PORT = Number(process.env.PORT || DEFAULT_PORT);
const repo = createRepo();
WorldRoom.repo = repo;

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true, repo: repo.kind, time: Date.now() }));
app.get("/api/leaderboard", async (_req, res) => res.json(await repo.leaderboard(10)));

// Em produção o servidor também entrega o cliente compilado (npm run build).
const dist = path.resolve(__dirname, "..", "..", "client", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("/", (_req, res) => res.sendFile(path.join(dist, "index.html")));
  console.log(`[http] servindo cliente de ${dist}`);
}

const server = http.createServer(app);
const gameServer = new Server({ transport: new WebSocketTransport({ server }) });
gameServer.define("world", WorldRoom);

gameServer.listen(PORT).then(() => {
  console.log(`\n  MELI WORLD — LOGISTICS LIFE`);
  console.log(`  Servidor multiplayer em ws://localhost:${PORT}  (persistência: ${repo.kind})\n`);
});
// Ctrl+C: o Colyseus faz o graceful shutdown sozinho (chama onDispose -> salva todos os jogadores).
