/**
 * Rotas do SMG1 (fictícias). Cada ilha (rua) agrupa 4 rotas = 4 bakers ao lado da esteira.
 * Onda: rotas mais distantes saem primeiro (Onda 1 = branca, 2 = amarela, 3 = verde).
 */
import type { Island } from "../types";

export interface RouteDef {
  id: string;
  island: Island;
  bairro: string;
  cepPrefix: string;
  distanceKm: number;
  wave: 1 | 2 | 3;
  spr: number; // pacotes por rota (meta do baker antes de fechar)
}

export const ISLANDS: Island[] = ["A", "B", "C", "D"];

export const ISLAND_COLORS: Record<Island, string> = {
  A: "#e5533d",
  B: "#3483fa",
  C: "#3fae5a",
  D: "#9b59d0",
};

export const WAVE_COLORS: Record<number, string> = { 1: "#f4f4f4", 2: "#ffe600", 3: "#38c172" };
export const WAVE_NAMES: Record<number, string> = { 1: "Onda 1 (branca)", 2: "Onda 2 (amarela)", 3: "Onda 3 (verde)" };

const RAW: [string, string, number][] = [
  ["Jardim das Flores", "08010", 21], ["Vila Esperança", "08020", 18], ["Parque do Carmo", "08030", 12], ["Centro Velho", "08040", 6],
  ["Morro Azul", "08110", 24], ["Jardim Primavera", "08120", 15], ["Vila Industrial", "08130", 9], ["Bela Vista", "08140", 5],
  ["Recanto Verde", "08210", 26], ["Cidade Nova", "08220", 16], ["Jardim Paulista", "08230", 11], ["Vila Mariana", "08240", 7],
  ["Alto da Serra", "08310", 23], ["Lagoa Seca", "08320", 17], ["Parque Industrial", "08330", 10], ["Vila Operária", "08340", 4],
];

export const ROUTES: RouteDef[] = RAW.map(([bairro, cep, km], i) => {
  const island = ISLANDS[Math.floor(i / 4)];
  const n = (i % 4) + 1;
  const wave: 1 | 2 | 3 = km >= 18 ? 1 : km >= 10 ? 2 : 3;
  return { id: `${island}${n}`, island, bairro, cepPrefix: cep, distanceKm: km, wave, spr: 10 + ((i * 7) % 5) };
});

export const ROUTE_BY_ID: Record<string, RouteDef> = Object.fromEntries(ROUTES.map((r) => [r.id, r]));
