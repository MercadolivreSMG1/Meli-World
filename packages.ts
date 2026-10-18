/** Geração de pacotes e regras operacionais (baseadas nas WIs do SVC). */
import { ROUTES, ROUTE_BY_ID } from "../data/routes";
import { Rng, pick, randInt } from "../rng";
import type { BakerLevel, PackageData, PackageIssue, PackageSize } from "../types";

let counter = 0;

export function newPackageId(rng: Rng): string {
  counter = (counter + 1) % 1e6;
  return "MLB" + (4_000_000_000 + Math.floor(rng() * 900_000_000) + counter).toString();
}

export interface PackageGenOptions {
  issueRate?: number;
  volumosoRate?: number;
  rtsRate?: number;
}

export function generatePackage(rng: Rng, opts: PackageGenOptions = {}): PackageData {
  const route = pick(rng, ROUTES);
  const volumoso = rng() < (opts.volumosoRate ?? 0.12);
  let size: PackageSize = volumoso ? "volumoso" : "sortable";
  if (volumoso && rng() < 0.25) size = "oversize";
  const dims: [number, number, number] =
    size === "sortable"
      ? [randInt(rng, 60, 600), randInt(rng, 40, 400), randInt(rng, 10, 300)]
      : size === "volumoso"
        ? [randInt(rng, 700, 1000), randInt(rng, 400, 800), randInt(rng, 300, 700)]
        : [randInt(rng, 1100, 2000), randInt(rng, 600, 1200), randInt(rng, 400, 1000)];
  const weightKg =
    size === "sortable" ? Math.round((0.05 + rng() * 9) * 10) / 10 : size === "volumoso" ? randInt(rng, 12, 28) : randInt(rng, 30, 70);
  let issue: PackageIssue = "";
  if (rng() < (opts.issueRate ?? 0.1)) {
    issue = pick(rng, ["danificado", "sem_etiqueta", "caso_ps", "liquido", "erro_etiquetagem"] as const);
  }
  const r = rng();
  const labelType = r < 0.85 ? "normal" : r < 0.93 ? "branca" : r < 0.97 ? "buffer" : "promessa";
  const levelRoll = rng();
  const level: BakerLevel = levelRoll < 0.34 ? "inferior" : levelRoll < 0.67 ? "meio" : "superior";
  return {
    id: newPackageId(rng),
    route: route.id,
    island: route.island,
    level: size === "sortable" ? level : "inferior",
    size,
    weightKg,
    dims,
    labelType,
    labelDate: pick(rng, ["ontem", "hoje", "hoje", "amanha"] as const),
    issue,
    cep: `${route.cepPrefix}-${String(randInt(rng, 0, 999)).padStart(3, "0")}`,
    bairro: route.bairro,
    labeled: false,
    rts: rng() < (opts.rtsRate ?? 0.05),
  };
}

/** Pacote com problema não pode ser conteinerizado: precisa de goleiro/PS. */
export function needsTreatment(p: PackageData): boolean {
  return p.issue !== "" || p.labelType !== "normal";
}

/** Sortable para o Sorter/Cross Belt: 10–1000 mm e 0,04–15 kg. */
export function isSorterSortable(p: PackageData): boolean {
  const max = Math.max(...p.dims);
  const min = Math.min(...p.dims);
  return min >= 10 && max <= 1000 && p.weightKg >= 0.04 && p.weightKg <= 15;
}

/** Classificação correta para o mini-jogo de volumosos. */
export function classifySize(p: PackageData): PackageSize {
  const max = Math.max(...p.dims);
  if (max > 1000 || p.weightKg > 30) return "oversize";
  if (max > 650 || p.weightKg > 15) return "volumoso";
  return "sortable";
}

/** Destino correto do goleiro (WI Pesca/Goleiro). */
export type GoleiroBin =
  | "reinduzir" // não pescado / etiqueta branca de hoje ou atrasada
  | "danificado"
  | "sem_etiqueta"
  | "etiqueta_branca_futura"
  | "erro_etiquetagem"
  | "buffer"
  | "caso_ps"
  | "custodia";

export const GOLEIRO_BINS: { id: GoleiroBin; label: string }[] = [
  { id: "reinduzir", label: "Reinduzir (mesmo ciclo)" },
  { id: "danificado", label: "Danificado → PS" },
  { id: "sem_etiqueta", label: "Sem etiqueta → Etiquetagem" },
  { id: "etiqueta_branca_futura", label: "Etiqueta branca futura → D+1" },
  { id: "erro_etiquetagem", label: "Erro de etiquetagem" },
  { id: "buffer", label: "BUFFER (próximo ciclo)" },
  { id: "caso_ps", label: "Caso PS" },
  { id: "custodia", label: "Custódia (Receita Federal)" },
];

export function correctGoleiroBin(p: PackageData): GoleiroBin {
  if (p.issue === "receita_federal") return "custodia";
  if (p.issue === "danificado" || p.issue === "liquido") return "danificado";
  if (p.issue === "sem_etiqueta") return "sem_etiqueta";
  if (p.issue === "erro_etiquetagem") return "erro_etiquetagem";
  if (p.issue === "caso_ps") return "caso_ps";
  if (p.labelType === "buffer") return "buffer";
  if (p.labelType === "branca") return p.labelDate === "amanha" ? "etiqueta_branca_futura" : "reinduzir";
  return "reinduzir";
}

export function describeIssue(p: PackageData): string {
  const parts: string[] = [];
  if (p.issue === "danificado") parts.push("caixa amassada e rasgada");
  if (p.issue === "liquido") parts.push("vazando líquido");
  if (p.issue === "sem_etiqueta") parts.push("sem etiqueta de rota");
  if (p.issue === "caso_ps") parts.push("tela vermelha: SVC incorreto");
  if (p.issue === "erro_etiquetagem") parts.push("etiqueta de rota cruzada");
  if (p.issue === "receita_federal") parts.push("aviso: Receita Federal");
  if (p.labelType === "branca") parts.push(`etiqueta branca (data: ${p.labelDate})`);
  if (p.labelType === "buffer") parts.push("etiqueta BUFFER");
  if (p.labelType === "promessa") parts.push("etiqueta Promessa");
  if (p.rts) parts.push("RTS");
  return parts.length ? parts.join(", ") : "pacote OK";
}

export function routeLabel(routeId: string): string {
  const r = ROUTE_BY_ID[routeId];
  return r ? `${r.id} · ${r.bairro}` : routeId;
}
