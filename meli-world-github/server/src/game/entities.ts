/** Entidades do mundo (objetos simples — o WorldRoom espelha isso no estado Colyseus). */
import type { AnimName, Appearance, CarryKind, Dir, Equipment, MinigameKind, PackageData } from "../../../shared/src";
import type { PlayerRecord } from "../db/types";

export interface PendingMinigame {
  token: string;
  kind: MinigameKind;
  answer: unknown; // gabarito (fica só no servidor)
  ctx: Record<string, unknown>;
  openedAt: number; // ms
}

export interface PlayerEntity {
  sid: string;
  id: string;
  name: string;
  x: number;
  y: number;
  dir: Dir;
  anim: AnimName;
  look: Appearance;
  lookJson: string;
  equipJson: string;
  level: number;
  title: string;
  carryKind: CarryKind;
  carrying: PackageData[];
  bakerId: string;
  bubble: string;
  bubbleUntil: number;
  moving: boolean;
  running: boolean;
  sitting: boolean;
  actionAnim: AnimName | "";
  actionUntil: number;
  lastMoveAt: number;
  ranWhilePushing: boolean;
  pending: PendingMinigame | null;
  rec: PlayerRecord;
  dirty: boolean;
  profileDirty: boolean;
  lastSave: number;
  cooldowns: Record<string, number>; // chave -> minuto de jogo liberado
  zoneId: string;
  epiWarnAt: number;
  atkAt: number; // ms do último golpe
  atkSeq: number; // contador de golpes (anima no cliente)
  hitAt: number; // ms do último dano recebido
}

export interface NpcEntity {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  dir: Dir;
  anim: AnimName;
  lookJson: string;
  activity: string;
  carry: string;
  path: [number, number][];
  goal: string;
  pauseUntil: number;
  ambient: boolean;
  post: string;
  wanderAt: number;
  phase: number;
  pushingBaker: string;
  assignedUntil: Record<string, number>;
  lastPath: number;
}

export type VehicleState = "arriving" | "waiting" | "to_dock" | "docked" | "counting" | "aduana" | "ready" | "leaving" | "gone";

export interface VehicleEntity {
  id: string;
  kind: "lh" | "van";
  x: number;
  y: number;
  dir: Dir;
  route: string;
  wave: number;
  state: VehicleState;
  label: string;
  load: number;
  path: [number, number][]; // px
  speed: number;
  dock: string;
  dockedAt: number; // minuto de jogo
  countFails: number;
  countAt: number;
  loadedBy: string; // player id
  loadedByName: string;
  packages: number;
  hus: number;
  seal: string;
  sealOk: boolean;
  driver: string;
  spot: number;
}

export type BakerState = "open" | "pending" | "closed" | "moving" | "staged" | "loaded";

export interface BakerEntity {
  id: string;
  route: string;
  island: string;
  x: number; // px (centro)
  y: number; // px (base)
  homeX: number;
  homeY: number;
  packages: PackageData[];
  misplaced: PackageData[];
  target: number;
  state: BakerState;
  pushedBy: string; // sid de jogador ou id de NPC
  setupDone: boolean;
  setupAt: number;
  cycle: number;
  closedAt: number;
}

export interface Outbox {
  send(sid: string, type: string, msg: unknown): void;
  broadcast(type: string, msg: unknown): void;
}

export interface SyncedEquipment extends Equipment {}

export interface EnemyEntity {
  id: string;
  kind: import("../../../shared/src").EnemyKind;
  zone: string;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  hp: number;
  maxHp: number;
  dir: Dir;
  state: "idle" | "chase" | "return" | "dead";
  target: string; // sid
  atkAt: number; // ms
  wanderAt: number;
  wx: number;
  wy: number;
  respawnAt: number;
  flashUntil: number;
  summonAt: number;
  minion: boolean;
}

export interface PlotState {
  id: string;
  owner: string; // player id ("" = à venda; "npc:<nome>" = casa de NPC)
  ownerName: string;
  tier: number; // 0 = sem casa
  decor: { kind: string; x: number; y: number }[];
}

export interface Listing {
  id: string;
  sellerId: string; // "npc:<loja>" para anúncios de NPC
  sellerName: string;
  itemId: string;
  qty: number;
  price: number; // total
  ts: number;
}
