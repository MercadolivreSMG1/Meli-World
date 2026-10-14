/** Experiência, níveis, cargos e habilidades. */

export const MAX_LEVEL = 30;

export function xpForLevel(level: number): number {
  // XP necessário para ir de `level` para `level+1`
  return Math.round(80 + (level - 1) * 55 + Math.pow(level - 1, 1.6) * 6);
}

export function levelFromXp(totalXp: number): { level: number; into: number; need: number } {
  let level = 1;
  let rest = totalXp;
  while (level < MAX_LEVEL && rest >= xpForLevel(level)) {
    rest -= xpForLevel(level);
    level++;
  }
  return { level, into: rest, need: xpForLevel(level) };
}

export const TITLES: [number, string][] = [
  [1, "Colaborador recém-contratado"],
  [3, "REP I"],
  [6, "REP II"],
  [9, "REP III"],
  [12, "REP Multifuncional"],
  [15, "Problem Solver"],
  [19, "Analista de Operações"],
  [23, "Team Leader"],
  [28, "Team Leader Sênior"],
];

export function titleFor(level: number, perks: string[] = []): string {
  let t = TITLES[0][1];
  for (const [lv, name] of TITLES) if (level >= lv) t = name;
  // Team Leader exige liderança comprovada (as 3 missões especiais)
  if (level >= 23 && perks.length < 3) t = "Analista de Operações";
  return t;
}

export interface SkillDef {
  id: string;
  name: string;
  desc: string;
  max: number;
}

export const SKILLS: SkillDef[] = [
  { id: "sorting", name: "Sorting", desc: "+8% XP em pesca/conteinerização por nível. A esteira do mini-jogo fica mais lenta.", max: 5 },
  { id: "qualidade", name: "Qualidade", desc: "+10% XP em goleiro, PS e auditoria por nível. Dicas nos mini-jogos.", max: 5 },
  { id: "expedicao", name: "Expedição", desc: "+10% XP em carregamento/traslado. Dicas no carregamento.", max: 5 },
  { id: "agilidade", name: "Agilidade", desc: "+4% de velocidade por nível. Corrida gasta menos energia.", max: 5 },
  { id: "automacao", name: "Automação", desc: "Chance de o pacote seguinte já vir pré-classificado (+bônus).", max: 5 },
  { id: "lideranca", name: "Liderança", desc: "Jogadores próximos ganham +3% XP por nível seu. Requisito para TL.", max: 5 },
];

export const PERKS: Record<string, { name: string; desc: string }> = {
  automacao_pro_max: {
    name: "Automatização PRO MAX",
    desc: "Seu coletor destaca a sua ilha na pesca e 25% das conteinerizações rendem um pacote extra classificado automaticamente.",
  },
  operacao_sob_controle: {
    name: "Operação sob Controle",
    desc: "Regenera energia 2x mais rápido e o painel mostra gargalos em tempo real.",
  },
  expedicao_relampago: {
    name: "Expedição Relâmpago",
    desc: "Empurra bakers 20% mais rápido e o carregamento tem 1 erro perdoado.",
  },
};

export function speedMultiplier(skills: Record<string, number>): number {
  return 1 + 0.04 * (skills.agilidade ?? 0);
}
