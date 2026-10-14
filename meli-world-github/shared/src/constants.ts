/** Constantes globais do jogo (compartilhadas entre cliente e servidor). */
export const TILE = 16;
export const MAP_W = 232;
export const MAP_H = 176;
/** Largura da área original do SVC (o resto do mapa é a expansão). */
export const SVC_W = 112;
export const SVC_H = 86;

export const SERVER_TICK_MS = 50; // 20 Hz
export const CLIENT_SEND_MS = 50;

export const WALK_SPEED = 64; // px/s
export const RUN_MULT = 1.65;
export const CARRY_MULT = 0.9;
export const PUSH_MULT = 0.72;
export const TIRED_MULT = 0.7;

/** Hitbox dos pés do personagem (relativa ao ponto x,y = centro dos pés). */
export const FEET_W = 10;
export const FEET_H = 6;

export const INTERACT_RANGE = 26; // px

/** Relógio do jogo: minutos de jogo por segundo real. 0.5 => um dia de jogo dura 48 min reais. */
export const GAME_MIN_PER_SEC = 0.5;
export const DAY_START_MIN = 5 * 60 + 40; // o mundo nasce às 05:40

export const MAX_CARRY = 3; // "com carrinho: no máximo 3 pacotes no braço"
export const MAX_ENERGY = 100;
export const MIN_BATTERY_TO_START = 85; // WI Recepção: bateria do coletor >= 85%

export const DEFAULT_PORT = 2567;
