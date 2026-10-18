/** Tipos compartilhados entre cliente e servidor. */

export type Dir = "down" | "up" | "left" | "right";

export const ANIMS = [
  "idle", "walk", "run", "carry", "carryIdle", "push", "scan", "interact", "sit", "celebrate", "work",
] as const;
export type AnimName = (typeof ANIMS)[number];

export type Island = "A" | "B" | "C" | "D";
export type PackageSize = "sortable" | "volumoso" | "oversize";
export type LabelType = "normal" | "branca" | "buffer" | "promessa";
export type PackageIssue = "" | "danificado" | "sem_etiqueta" | "caso_ps" | "liquido" | "erro_etiquetagem" | "receita_federal";
export type BakerLevel = "inferior" | "meio" | "superior";

export interface PackageData {
  id: string;
  route: string; // ex.: "A2"
  island: Island;
  level: BakerLevel;
  size: PackageSize;
  weightKg: number;
  dims: [number, number, number]; // mm
  labelType: LabelType;
  labelDate: "ontem" | "hoje" | "amanha";
  issue: PackageIssue;
  cep: string;
  bairro: string;
  labeled: boolean; // já passou pela etiquetagem
  rts: boolean; // retorno à estação (RTS)
}

export type CarryKind = "" | "pkg" | "baker";

export type InteractKind = "prop" | "npc" | "vehicle" | "baker" | "belt" | "plot";

export interface InteractRequest {
  kind: InteractKind;
  id: string;
}

export interface InputMessage {
  x: number;
  y: number;
  dir: Dir;
  moving: boolean;
  run: boolean;
  seq: number;
}

export interface ItemStack {
  id: string;
  qty: number;
}

export interface MissionProgress {
  id: string;
  progress: Record<string, number>;
  startedAt: number; // minuto de jogo absoluto
  deadline?: number; // minuto absoluto (missões cronometradas)
}

export interface Profile {
  id: string;
  name: string;
  level: number;
  xp: number;
  xpToNext: number;
  xpThisLevel: number;
  title: string;
  energy: number;
  battery: number;
  skillPoints: number;
  coins: number;
  hp: number;
  maxHp: number;
  savings: number;
  homePlot: string;
  /** rota do baker que o jogador está empurrando ("" = nenhum) */
  pushing: string;
  skills: Record<string, number>;
  perks: string[];
  inventory: ItemStack[];
  equipped: { epiVest: boolean; safetyShoes: boolean; coletor: boolean; weapon?: string; armor?: string };
  clockedIn: boolean;
  activeMissions: MissionProgress[];
  completedMissions: string[];
  availableMissions: string[];
  stats: Record<string, number>;
  carrying: PackageData[];
  history: { ts: number; type: string; text: string }[];
}

export interface DialogChoice {
  id: string;
  text: string;
}

export interface DialogMessage {
  npcId: string;
  name: string;
  role: string;
  lines: string[];
  choices: DialogChoice[];
}

export interface ToastMessage {
  text: string;
  kind: "info" | "good" | "bad" | "xp" | "warn";
}

export interface FxMessage {
  x: number;
  y: number;
  text: string;
  color: string;
}

/** Mini-jogos operacionais (rodam no cliente com dados gerados pelo servidor). */
export type MinigameKind =
  | "receiving" // recebimento LH: checklist + ordem de escaneamento
  | "labeling" // etiquetagem: onde colar a etiqueta
  | "fishing" // pesca na esteira
  | "containerize" // conteinerização: nível no baker
  | "goleiro" // triagem em gaiolas
  | "ps" // problem solver: incidências
  | "audit" // auditoria de baker
  | "volumosos" // classificação sortable/volumoso/oversize
  | "loading" // carregamento do veículo
  | "aduana" // recontagem
  | "sorter" // otimizar layout (Índio)
  | "training" // quiz
  | "setup" // setup de baker (QR + sacas)
  | "kpi"; // painel de indicadores (somente leitura)

export interface MinigameOpen {
  token: string;
  kind: MinigameKind;
  title: string;
  data: unknown;
}

export interface MinigameResult {
  token: string;
  result: unknown;
}

export interface ChatMessage {
  from: string;
  text: string;
  sid: string;
}
