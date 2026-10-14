/**
 * Conta especial: quem entra com o nome "IndioZada" recebe tudo no máximo
 * (nível 30, habilidades e perks completos, todas as armas/armaduras, missões concluídas,
 * MeliCoins de sobra e um Sobrado decorado no Bairro Vila Logística).
 * Para mudar ou adicionar nomes, edite MAXED_NAMES.
 */
import { ITEMS, MAX_LEVEL, MISSIONS, PERKS, SKILLS, setHouseSolid, titleFor, xpForLevel, levelFromXp } from "../../../shared/src";
import type { PlayerEntity } from "./entities";
import type { World } from "./World";

export const MAXED_NAMES = ["indiozada"];

export function isMaxedName(name: string): boolean {
  return MAXED_NAMES.includes(name.trim().toLowerCase());
}

export function grantMax(w: World, p: PlayerEntity) {
  const r = p.rec;
  let xp = 0;
  for (let l = 1; l < MAX_LEVEL; l++) xp += xpForLevel(l);
  r.xp = Math.max(r.xp, xp);
  for (const s of SKILLS) r.skills[s.id] = s.max;
  r.perks = Object.keys(PERKS);
  r.skillPoints = 0;
  r.energy = 100;
  r.hp = 100;
  r.battery = 100;
  r.coins = Math.max(r.coins ?? 0, 999_999);
  r.savings = Math.max(r.savings ?? 0, 500_000);
  // todos os itens (armas, armaduras, EPIs, comidas, decorações…)
  for (const d of Object.values(ITEMS)) r.inventory[d.id] = Math.max(r.inventory[d.id] ?? 0, d.stack > 1 ? Math.min(d.stack, 20) : 1);
  r.equipped = { epiVest: true, safetyShoes: true, coletor: true, weapon: "lamina_onda_verde", armor: "armadura_baker" };
  // missões permanentes concluídas (diárias continuam disponíveis)
  r.missions.active = r.missions.active.filter((m) => MISSIONS.find((x) => x.id === m.id)?.daily);
  for (const m of MISSIONS) if (!m.daily && !r.missions.completed.includes(m.id)) r.missions.completed.push(m.id);
  r.clockedInDay = Math.floor(w.clock / 1440) + 1;
  // casa: Sobrado decorado
  let plot = w.economy.ownPlot(p);
  if (!plot) plot = [...w.economy.plots.values()].find((st) => !st.owner);
  if (plot) {
    plot.owner = p.id;
    plot.ownerName = p.name;
    plot.tier = 3;
    if (!plot.decor.length)
      plot.decor = [
        { kind: "piscina", x: 1, y: 6 },
        { kind: "estatua_van", x: 8, y: 6 },
        { kind: "trofeu", x: 7, y: 6 },
        { kind: "poste", x: 8, y: 8 },
        { kind: "churrasqueira", x: 3, y: 7 },
        { kind: "canteiro", x: 1, y: 2 },
        { kind: "canteiro", x: 8, y: 2 },
      ];
    r.homePlot = plot.id;
    const def = w.map.plots.find((d) => d.id === plot!.id);
    if (def) setHouseSolid(w.map, def, true);
  }
  p.level = levelFromXp(r.xp).level;
  p.title = titleFor(p.level, r.perks);
  p.equipJson = JSON.stringify(r.equipped);
  p.profileDirty = true;
  p.dirty = true;
  w.toast(p, "Conta IndioZada: nível máximo, todas as habilidades, itens, missões e um Sobrado no Bairro Vila Logística!", "xp");
}
