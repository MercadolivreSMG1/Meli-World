/**
 * Guia de missões: transforma cada objetivo em um ALVO no mapa (onde ir) + uma dica curta.
 * O cliente resolve o alvo para coordenadas e desenha trilha, seta e marcador.
 */
import type { ObjectiveDef } from "../data/missions";

export type GuideTarget =
  | { type: "prop"; kind: string; data?: string }
  | { type: "npc"; id: string }
  | { type: "point"; name: string }
  | { type: "dynamic"; what: DynamicTarget; enemy?: string };

export type DynamicTarget =
  | "belt" | "carried_baker" | "pending_baker" | "closed_baker" | "van_for_baker" | "van_ready" | "van_aduana"
  | "lh_docked" | "plot_free" | "plot_own" | "rep" | "enemy_zone" | "kpi";

export interface GuideStep {
  target: GuideTarget;
  where: string; // texto curto: "Galpão · ao lado da porta do administrativo"
}

export function objectiveGuide(obj: ObjectiveDef): GuideStep {
  const f = obj.filter ?? {};
  switch (obj.type) {
    case "clock_in": return { target: { type: "prop", kind: "timeclock" }, where: "Portaria, ao lado da catraca" };
    case "talk": return { target: { type: "npc", id: String(f.npc ?? "") }, where: "Siga a trilha até a pessoa" };
    case "equip_epi": return { target: { type: "prop", kind: "locker" }, where: "Galpão · armários azuis ao lado da porta do administrativo" };
    case "charge": return { target: { type: "prop", kind: "charger" }, where: "Galpão · carregador de coletores perto dos armários" };
    case "briefing": return { target: { type: "prop", kind: "briefing_board" }, where: "Galpão · ponto do Tier 1, embaixo do telão" };
    case "training_pass": return { target: { type: "prop", kind: "training_screen" }, where: "Administrativo · sala de treinamento" };
    case "receive_lh": return { target: { type: "dynamic", what: "lh_docked" }, where: "Docas de recebimento (fundo do galpão, à esquerda)" };
    case "label": return { target: { type: "prop", kind: "label_table" }, where: "Galpão · mesas de etiquetagem ao lado do flowrack" };
    case "fish_correct": return { target: { type: "dynamic", what: "belt" }, where: "Esteira · fique na faixa amarela da sua ilha" };
    case "containerize": return { target: { type: "dynamic", what: "carried_baker" }, where: "Baker da rota do pacote (ou pesque um na esteira)" };
    case "goleiro_correct": return { target: { type: "prop", kind: "goleiro" }, where: "Fim da esteira · estação do goleiro" };
    case "ps_resolve": return { target: { type: "prop", kind: "ps_desk" }, where: "Galpão · mesa vermelha do PS" };
    case "audit_fix": return { target: { type: "dynamic", what: "pending_baker" }, where: "Baker pendente (marcado com !) ou mesa de auditoria" };
    case "baker_closed": return { target: { type: "dynamic", what: "belt" }, where: "Ilhas · complete os bakers quase cheios" };
    case "setup_baker": return { target: { type: "prop", kind: "setup_station" }, where: "Galpão · Preparação de carrinhos" };
    case "traslado":
    case "load_van": return { target: { type: "dynamic", what: "van_for_baker" }, where: "Pegue um baker fechado (✔) e leve até a van da rota" };
    case "dispatch": return { target: { type: "dynamic", what: "van_ready" }, where: "Docas de expedição" };
    case "aduana": return { target: { type: "dynamic", what: "van_aduana" }, where: "Van em aduana na doca" };
    case "volumosos_correct": return { target: { type: "prop", kind: "volumosos" }, where: "Galpão · área de volumosos" };
    case "sorter_optimize": return { target: { type: "prop", kind: "sorter_panel" }, where: "Galpão · painel do Sorter (ao lado da máquina colorida)" };
    case "kpi_view": return { target: { type: "dynamic", what: "kpi" }, where: "Telão do galpão ou painel do hall" };
    case "assign_rep": return { target: { type: "dynamic", what: "rep" }, where: "Qualquer REP trabalhando no galpão" };
    case "eat": return { target: { type: "prop", kind: "counter" }, where: "Refeitório · buffet" };
    case "kill": return { target: { type: "dynamic", what: "enemy_zone", enemy: f.enemy ? String(f.enemy) : undefined }, where: "Zona de Extravio (sudeste, depois da avenida)" };
    case "deliver": return { target: { type: "npc", id: "ranieri" }, where: "Entregue ao Ranieri" };
    case "buy_plot": return { target: { type: "dynamic", what: "plot_free" }, where: "Bairro Vila Logística · placa de um lote à venda" };
    case "build_house":
    case "place_decor":
    case "rest_home": return { target: { type: "dynamic", what: "plot_own" }, where: "O seu lote no Bairro Vila Logística" };
    case "shop_buy": return { target: { type: "point", name: "lojas" }, where: "Praça do Centro Logístico · lojas" };
    case "shop_sell": return { target: { type: "npc", id: "neide" }, where: "Praça · Compra & Venda da Neide" };
    case "market_list":
    case "market_buy":
    case "market_sold": return { target: { type: "prop", kind: "market_board" }, where: "Praça · Balcão de Anúncios" };
    case "mp_deposit":
    case "mp_transfer": return { target: { type: "prop", kind: "mp_terminal" }, where: "Agência Mercado Pago (Centro Logístico)" };
    case "visit": return { target: { type: "point", name: String(f.zone ?? "spawn") }, where: "" };
    default: return { target: { type: "point", name: "spawn" }, where: "" };
  }
}
