/** Ponto de entrada: tela inicial → criador de personagem → conexão → jogo. */
import "./styles.css";
import Phaser from "phaser";
import type { Appearance, Profile } from "@shared/index";
import { renderPortrait } from "./art/character";
import { WorldScene } from "./game/WorldScene";
import { listRooms, net, probeServer, remoteServerConfigured, type RoomTarget, serverUrl } from "./net/Net";
import { bus, store } from "./store";
import { openCreator } from "./ui/creator";
import { closeDialog, dialogAdvance, dialogChoose, dialogOpen, showDialog } from "./ui/dialog";
import { h, root } from "./ui/dom";
import * as Hud from "./ui/hud";
import { minigameOpen, openMinigame } from "./ui/minigames";
import { closePanel, refreshOpenPanel, showBoard, showLevelUp, showMissionComplete, togglePanel } from "./ui/panels";
import { plotHooks, showMarket, showMp, showPlot, showRealty, showShop } from "./ui/commerce";

let scene: WorldScene | null = null;
let mode: "online" | "solo" = "solo";

let target: RoomTarget = { kind: "auto" };

function titleScreen() {
  const r = root();
  const hasChar = store.hasProfile && store.name;
  const look = store.look;
  const portrait = renderPortrait(look, { epiVest: true, safetyShoes: true, coletor: true }, "down", "idle", 0).toCanvas(6);
  /** entra com o personagem salvo, ou cria um antes */
  const go = (t: RoomTarget | null) => {
    if (t) {
      target = t;
      mode = "online";
    }
    el.remove();
    stopRefresh();
    if (hasChar) start(store.look, store.name);
    else openCreator({ look: store.look, name: store.name, mode: "new", onDone: (lk, nm) => start(lk, nm) });
  };
  const roomList = h("div", { class: "room-list" }, h("p", { class: "muted" }, "Carregando salas…"));
  const codeInput = h("input", { class: "input", placeholder: "CÓDIGO", maxlength: "8", style: { width: "110px", textTransform: "uppercase" } }) as HTMLInputElement;
  const nameInput = h("input", { class: "input", placeholder: "Nome da sala (opcional)", maxlength: "28" }) as HTMLInputElement;
  const lobby = h("div", { class: "lobby hidden" },
    h("div", { class: "lobby-head" }, h("b", {}, "Salas públicas"), h("button", { class: "btn small", onclick: () => refresh() }, "↻ Atualizar")),
    roomList,
    h("div", { class: "row center" }, h("button", { class: "btn primary", onclick: () => go({ kind: "auto" }) }, "⚡ Entrar em qualquer sala com vaga")),
    h("div", { class: "lobby-row" },
      h("span", {}, "🔒 Sala privada com amigos:"),
      nameInput,
      h("button", { class: "btn small", onclick: () => go({ kind: "create", roomName: nameInput.value.trim() }) }, "Criar"),
    ),
    h("div", { class: "lobby-row" },
      h("span", {}, "Tenho um código:"),
      codeInput,
      h("button", { class: "btn small", onclick: () => {
        const c = codeInput.value.trim().toUpperCase();
        if (c.length >= 4) go({ kind: "id", id: c });
        else codeInput.focus();
      } }, "Entrar"),
    ),
    h("p", { class: "hint" }, "Seu personagem, sua casa e seus MeliCoins são os mesmos em todas as salas. Cada sala tem até 30 pessoas."),
  );
  let timer: ReturnType<typeof setInterval> | null = null;
  const stopRefresh = () => timer && clearInterval(timer);
  const refresh = async () => {
    const rooms = await listRooms();
    roomList.replaceChildren(
      ...(rooms.length
        ? rooms.map((rm) => {
            const full = rm.clients >= rm.max;
            return h("div", { class: "room-item" + (full ? " full" : "") },
              h("span", { class: "room-name" }, rm.name),
              h("span", { class: "room-count" }, `👥 ${rm.clients}/${rm.max}`),
              h("button", { class: "btn small primary", disabled: full ? "disabled" : undefined, onclick: () => go({ kind: "id", id: rm.id }) }, full ? "Cheia" : "Entrar"),
            );
          })
        : [h("p", { class: "muted" }, "Nenhuma sala aberta agora — clique em “Entrar em qualquer sala” para abrir uma.")]),
    );
  };
  const el = h("div", { class: "title-screen" },
    h("div", { class: "title-card panel" },
      h("div", { class: "logo" }, h("span", { class: "logo-meli" }, "MELI WORLD"), h("span", { class: "logo-sub" }, "LOGISTICS LIFE")),
      h("p", { class: "tagline" }, "Seu primeiro dia no Service Center SMG1 começa agora. Aprenda os processos, cumpra missões e cresça na operação — junto com o seu time."),
      h("div", { class: "mode-line" },
        h("span", { class: "mode-status" }, "Procurando servidor multiplayer…"),
        h("label", { class: "radio mode-pick hidden" }, h("input", { type: "radio", name: "mode", value: "online" }), "Multiplayer (salas com colegas)"),
        h("label", { class: "radio mode-pick hidden" }, h("input", { type: "radio", name: "mode", value: "solo", checked: "checked" }), "Solo (offline, salvo neste navegador)"),
      ),
      hasChar ? h("div", { class: "title-char" }, portrait, h("div", {}, h("b", {}, store.name), h("small", {}, "pronto para o turno"))) : null,
      lobby,
      h("div", { class: "row center" },
        hasChar ? h("button", { class: "btn primary big main-enter", onclick: () => go(null) }, `Entrar como ${store.name}`) : null,
        h("button", { class: "btn big" + (hasChar ? "" : " primary"), onclick: () => {
          el.remove();
          stopRefresh();
          openCreator({ look: store.look, name: store.name, mode: "new", onDone: (lk, nm) => start(lk, nm) });
        } }, hasChar ? "Editar personagem" : "Criar personagem"),
      ),
    ),
  );
  r.appendChild(el);
  const setMode = (m: "online" | "solo") => {
    mode = m;
    lobby.classList.toggle("hidden", m !== "online");
    const main = el.querySelector(".main-enter");
    if (main) main.textContent = m === "online" ? `Entrar como ${store.name} (qualquer sala)` : `Entrar como ${store.name}`;
  };
  el.querySelectorAll<HTMLInputElement>("input[name=mode]").forEach((i) => i.addEventListener("change", () => setMode(i.value as "online" | "solo")));
  const st = el.querySelector(".mode-status")!;
  const found = () => {
    st.textContent = "Servidor multiplayer online! Escolha uma sala ou jogue solo.";
    el.querySelectorAll(".mode-pick").forEach((x) => x.classList.remove("hidden"));
    el.querySelector<HTMLInputElement>("input[value=online]")!.checked = true;
    setMode("online");
    refresh();
    timer = setInterval(refresh, 5000);
  };
  probeServer().then(async (ok) => {
    if (ok) return found();
    if (remoteServerConfigured) {
      // Render grátis "dorme" sem uso: o primeiro acesso acorda o servidor (pode levar ~1 minuto)
      const t0 = Date.now();
      while (Date.now() - t0 < 90_000 && document.body.contains(el)) {
        st.textContent = `Acordando o servidor multiplayer… ${Math.round((Date.now() - t0) / 1000)}s (pode levar até 1 minuto). Enquanto isso dá para jogar solo.`;
        el.querySelectorAll(".mode-pick").forEach((x) => x.classList.remove("hidden"));
        if (await probeServer(8000)) return found();
        await new Promise((res) => setTimeout(res, 2000));
      }
      if (!document.body.contains(el)) return;
      st.textContent = "O servidor multiplayer não respondeu. Jogue no modo solo ou recarregue a página para tentar de novo.";
    } else st.textContent = "Modo solo: o jogo roda inteiro no seu navegador e o progresso fica salvo aqui.";
    setMode("solo");
  });
}

function overlay(text: string, sub = "", actions: HTMLElement[] = []) {
  document.querySelector(".overlay-msg")?.remove();
  const el = h("div", { class: "overlay-msg" }, h("div", { class: "panel" }, h("h2", {}, text), sub ? h("p", {}, sub) : null, h("div", { class: "row center" }, ...actions)));
  root().appendChild(el);
  return el;
}

async function start(look: Appearance, name: string) {
  store.look = look;
  store.name = name;
  const loading = overlay("Batendo o crachá na catraca…", mode === "online" ? "Conectando ao servidor multiplayer" : "Abrindo o SMG1 no modo solo");
  Hud.initHud();
  wireMessages();
  try {
    if (mode === "online") await net.connect({ token: store.token, name, look }, target);
    else await net.connectLocal({ token: store.token, name, look });
  } catch (e) {
    loading.remove();
    overlay(
      target.kind === "id" ? "Não deu para entrar nessa sala" : "Não foi possível conectar ao servidor",
      target.kind === "id"
        ? `A sala ${target.id} não existe mais, está cheia ou o código está errado. Detalhe: ${(e as Error)?.message ?? e}`
        : `Verifique se o servidor está rodando em ${serverUrl()}. Detalhe: ${(e as Error)?.message ?? e}`,
      [
        h("button", { class: "btn primary", onclick: () => location.reload() }, "Tentar de novo"),
        h("button", { class: "btn", onclick: () => {
          document.querySelector(".overlay-msg")?.remove();
          mode = "solo";
          startGame(look, name);
        } }, "Jogar no modo solo"),
      ],
    );
    return;
  }
  loading.remove();
  launchPhaser();
}

/** Retentativa no modo solo depois de falha de conexão. */
async function startGame(look: Appearance, name: string) {
  await net.connectLocal({ token: store.token, name, look });
  launchPhaser();
}

function launchPhaser() {
  if (net.mode === "solo") Hud.toast("Modo solo: você está sozinho no SMG1, mas os NPCs trabalham com você. Progresso salvo neste navegador.", "info");
  scene = new WorldScene();
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    pixelArt: true,
    roundPixels: true,
    backgroundColor: "#16181d",
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    scene: [scene],
    fps: { target: 60 },
  });
  wireKeys();
}

let lastPanelSig = "";
const deferred: (() => void)[] = [];
/** Mostra popups do servidor só quando não há mini-jogo/modal aberto (para não cancelar nada). */
function whenFree(fn: () => void) {
  if (!minigameOpen() && !document.querySelector(".modal-bg")) fn();
  else deferred.push(fn);
}
setInterval(() => {
  while (deferred.length && !minigameOpen() && !document.querySelector(".modal-bg") && !dialogOpen()) deferred.shift()!();
}, 400);

function wireMessages() {
  net.on("welcome", (m) => {
    store.sid = m.sid;
    store.playerId = m.id;
    if (m.room) Hud.setRoom(m.room, () => net.room?.state?.players?.size ?? 0);
  });
  net.on("profile", (p: Profile) => {
    store.profile = p;
    bus.emit("profile", p);
    const me = net.room?.state?.players?.get?.(net.sid);
    Hud.updateStatus(p, scene?.clock ?? 0, me?.look ?? JSON.stringify(store.look), me?.equip ?? "{}");
    const sig = JSON.stringify([p.inventory, p.equipped, p.activeMissions, p.skills, p.skillPoints, p.perks, p.completedMissions.length]);
    if (sig !== lastPanelSig) {
      lastPanelSig = sig;
      refreshOpenPanel();
    }
  });
  net.on("toast", (m) => Hud.toast(m.text, m.kind));
  net.on("dialog", (d) => {
    if (minigameOpen()) return;
    whenFree(() => showDialog(d));
  });
  net.on("minigame", (m) => {
    closeDialog();
    openMinigame(m);
  });
  net.on("chat", (m) => Hud.addChat(m.from, m.text, !m.sid));
  net.on("levelUp", (m) => {
    whenFree(() => showLevelUp(m.level, m.title));
    net.send("action", { type: "celebrate" });
  });
  net.on("missionComplete", (m) => {
    const look = m.npc ? net.room?.state?.npcs?.get?.(m.npc.id)?.look ?? null : null;
    whenFree(() => {
      closeDialog();
      showMissionComplete(m, look);
    });
    net.send("action", { type: "celebrate" });
  });
  net.on("board", (m) => showBoard(m));
  net.on("shop", (m) => !minigameOpen() && showShop(m));
  net.on("market", (m) => !minigameOpen() && showMarket(m));
  net.on("mp", (m) => !minigameOpen() && showMp(m));
  net.on("plot", (m) => !minigameOpen() && !scene?.plotLayer?.buildItem && showPlot(m));
  net.on("realty", (m) => !minigameOpen() && showRealty(m));
  net.on("hurt", () => Hud.hurtFlash());
  plotHooks.startBuild = (plotId, itemId, inside) => scene?.plotLayer.startBuild(plotId, itemId, inside);
  net.on("openCreator", () => {
    const me = net.room?.state?.players?.get?.(net.sid);
    let look = store.look;
    try {
      if (me?.look) look = JSON.parse(me.look);
    } catch {
      /* usa o salvo */
    }
    openCreator({
      look, name: store.name, mode: "edit", onDone: (lk) => {
        store.look = lk;
        net.send("appearance", { look: lk });
        scene?.previewLook(lk);
      },
    });
  });
  net.on("disconnect", () => {
    overlay("Conexão encerrada", "Você saiu do turno ou o servidor reiniciou.", [h("button", { class: "btn primary", onclick: () => location.reload() }, "Reconectar")]);
  });
}

function wireKeys() {
  window.addEventListener("keydown", (e) => {
    if (Hud.isTyping()) return;
    const k = e.key.toLowerCase();
    if (e.repeat && k !== "escape") return;
    if (k === "escape") {
      if (scene?.plotLayer?.buildItem) scene.plotLayer.stopBuild();
      else if (document.querySelector(".modal-bg")) closePanel();
      else if (dialogOpen()) closeDialog();
      return;
    }
    if (document.querySelector(".modal-bg") && dialogOpen()) closeDialog();
    if (dialogOpen()) {
      if (k === "e" || k === " " || k === "enter") {
        e.preventDefault();
        dialogAdvance();
      } else if (/^[1-9]$/.test(k)) dialogChoose(Number(k) - 1);
      return;
    }
    const modal = !!document.querySelector(".modal-bg");
    const panels: Record<string, string> = { i: "inv", j: "missions", k: "skills", m: "map", h: "help" };
    if (panels[k] && !minigameOpen() && !document.querySelector(".creator")) {
      togglePanel(panels[k]);
      return;
    }
    if (modal) return;
    if (k === "e" || k === " ") {
      e.preventDefault();
      scene?.interact();
    } else if (k === "f") scene?.attack();
    else if (k === "q") net.send("action", { type: "drop" });
    else if (k === "c") net.send("action", { type: "celebrate" });
    else if (k === "x") net.send("action", { type: "sit" });
    else if (/^[0-9]$/.test(k)) Hud.useHotbarKey(k === "0" ? 9 : Number(k) - 1);
  });
}

titleScreen();
