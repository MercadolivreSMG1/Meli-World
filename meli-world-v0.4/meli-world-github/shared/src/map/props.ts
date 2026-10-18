/** Definição dos objetos do cenário (props). Coordenadas em tiles. */

export type InteractType =
  | "timeclock" | "locker" | "mirror" | "charger" | "kpi" | "missions" | "training" | "flowrack"
  | "label_table" | "sorter_panel" | "goleiro" | "ps_desk" | "audit_desk" | "help_desk" | "volumosos"
  | "custody" | "coffee" | "food" | "seat" | "setup_station" | "briefing"
  | "shop" | "market" | "mp" | "plot" | "realty" | "house_exit";

export interface PropDef {
  w: number;
  h: number;
  /** retângulo sólido relativo [ox, oy, w, h] em tiles; null = atravessável */
  solid: [number, number, number, number] | null;
  interact?: InteractType;
  name: string;
}

export const PROP_DEFS: Record<string, PropDef> = {
  tree: { w: 2, h: 3, solid: [0.5, 2, 1, 1], name: "Árvore" },
  pine: { w: 2, h: 3, solid: [0.5, 2, 1, 1], name: "Pinheiro" },
  bush: { w: 1, h: 1, solid: [0, 0, 1, 1], name: "Arbusto" },
  flowers: { w: 1, h: 1, solid: null, name: "Flores" },
  rock: { w: 1, h: 1, solid: [0, 0, 1, 1], name: "Pedra" },
  lamp: { w: 1, h: 2, solid: [0, 1, 1, 1], name: "Poste" },
  bench: { w: 2, h: 1, solid: [0, 0, 2, 1], interact: "seat", name: "Banco" },
  pergola: { w: 4, h: 3, solid: null, name: "Pergolado" },
  pingpong: { w: 3, h: 2, solid: [0, 0, 3, 2], name: "Mesa de ping-pong" },
  desk: { w: 2, h: 1, solid: [0, 0, 2, 1], name: "Mesa" },
  desk_pc: { w: 2, h: 1, solid: [0, 0, 2, 1], name: "Estação de trabalho" },
  chair: { w: 1, h: 1, solid: null, interact: "seat", name: "Cadeira" },
  meeting_table: { w: 4, h: 2, solid: [0, 0, 4, 2], name: "Mesa de reunião" },
  whiteboard: { w: 3, h: 1, solid: null, name: "Quadro branco" },
  plant: { w: 1, h: 1, solid: [0, 0, 1, 1], name: "Planta" },
  sofa: { w: 3, h: 1, solid: [0, 0, 3, 1], interact: "seat", name: "Sofá" },
  tv: { w: 3, h: 2, solid: null, name: "TV" },
  kpi_board: { w: 3, h: 2, solid: [0, 1, 3, 1], interact: "kpi", name: "Painel de Indicadores" },
  kpi_wall: { w: 4, h: 2, solid: null, interact: "kpi", name: "Painel de Indicadores (telão)" },
  mission_board: { w: 3, h: 2, solid: [0, 1, 3, 1], interact: "missions", name: "Quadro de Missões" },
  training_screen: { w: 4, h: 2, solid: null, interact: "training", name: "Tela de Treinamento" },
  locker: { w: 1, h: 2, solid: [0, 1, 1, 1], interact: "locker", name: "Armário de EPI" },
  mirror: { w: 1, h: 2, solid: [0, 1, 1, 1], interact: "mirror", name: "Espelho (personalizar)" },
  charger: { w: 3, h: 1, solid: [0, 0, 3, 1], interact: "charger", name: "Carregador de coletores" },
  flowrack: { w: 2, h: 6, solid: [0, 0, 2, 6], interact: "flowrack", name: "Flowrack" },
  label_table: { w: 2, h: 2, solid: [0, 0, 2, 2], interact: "label_table", name: "Mesa de Etiquetagem" },
  sorter: { w: 26, h: 4, solid: [0, 0, 26, 4], name: "Sorter Cross Belt" },
  sorter_panel: { w: 2, h: 2, solid: [0, 1, 2, 1], interact: "sorter_panel", name: "Painel do Sorter" },
  goleiro: { w: 2, h: 2, solid: [0, 0, 2, 2], interact: "goleiro", name: "Estação do Goleiro" },
  goleiro_cages: { w: 2, h: 8, solid: [0, 0, 2, 8], name: "Gaiolas de triagem" },
  ps_desk: { w: 3, h: 2, solid: [0, 0, 3, 2], interact: "ps_desk", name: "Problem Solver (PS)" },
  audit_desk: { w: 3, h: 2, solid: [0, 0, 3, 2], interact: "audit_desk", name: "Auditoria" },
  help_desk: { w: 3, h: 2, solid: [0, 0, 3, 2], interact: "help_desk", name: "Mesa de Ajuda" },
  custody: { w: 3, h: 3, solid: [0, 0, 3, 3], interact: "custody", name: "Custódia (Receita Federal)" },
  pallet: { w: 2, h: 2, solid: [0, 0, 2, 2], name: "Palete" },
  pallet_boxes: { w: 2, h: 2, solid: [0, 0, 2, 2], name: "HU (palete com pacotes)" },
  volumosos: { w: 3, h: 2, solid: [0, 0, 3, 2], interact: "volumosos", name: "Área de Volumosos" },
  bulky_stack: { w: 2, h: 2, solid: [0, 0, 2, 2], name: "Volumosos" },
  empty_bakers: { w: 2, h: 2, solid: [0, 0, 2, 2], name: "Bakers vazios" },
  setup_station: { w: 2, h: 1, solid: [0, 0, 2, 1], interact: "setup_station", name: "Preparação de carrinhos" },
  forklift: { w: 2, h: 2, solid: [0, 0, 2, 2], name: "Paleteira" },
  cone: { w: 1, h: 1, solid: null, name: "Cone" },
  counter: { w: 8, h: 1, solid: [0, 0, 8, 1], interact: "food", name: "Buffet do refeitório" },
  coffee: { w: 1, h: 1, solid: [0, 0, 1, 1], interact: "coffee", name: "Máquina de café" },
  microwave: { w: 1, h: 1, solid: [0, 0, 1, 1], name: "Micro-ondas" },
  cafe_table: { w: 2, h: 2, solid: [0, 0, 2, 2], name: "Mesa" },
  water_cooler: { w: 1, h: 1, solid: [0, 0, 1, 1], interact: "coffee", name: "Bebedouro" },
  guard_desk: { w: 2, h: 1, solid: [0, 0, 2, 1], name: "Mesa da portaria" },
  timeclock: { w: 1, h: 1, solid: [0, 0, 1, 1], interact: "timeclock", name: "Relógio de ponto" },
  car: { w: 2, h: 3, solid: [0, 0, 2, 3], name: "Carro" },
  moto: { w: 1, h: 2, solid: [0, 0, 1, 2], name: "Moto" },
  sign: { w: 2, h: 1, solid: null, name: "Placa" },
  passarela: { w: 2, h: 4, solid: null, name: "Passarela" },
  briefing_board: { w: 2, h: 2, solid: [0, 1, 2, 1], interact: "briefing", name: "Ponto do Tier 1" },
  printer: { w: 1, h: 1, solid: [0, 0, 1, 1], name: "Impressora" },
  // ---------------- Centro Logístico, Bairro e Zona de Extravio
  fountain: { w: 3, h: 3, solid: [0, 1, 3, 2], name: "Chafariz" },
  stall: { w: 4, h: 3, solid: [0, 1, 4, 2], interact: "shop", name: "Loja" },
  market_board: { w: 3, h: 2, solid: [0, 1, 3, 1], interact: "market", name: "Balcão de Anúncios" },
  mp_terminal: { w: 2, h: 2, solid: [0, 1, 2, 1], interact: "mp", name: "Terminal Mercado Pago" },
  realty_desk: { w: 3, h: 2, solid: [0, 0, 3, 2], interact: "realty", name: "Imobiliária Lar Logístico" },
  plot_sign: { w: 1, h: 1, solid: [0, 0, 1, 1], interact: "plot", name: "Placa do lote" },
  house_exit: { w: 2, h: 1, solid: null, interact: "house_exit", name: "Porta (sair de casa)" },
  dead_tree: { w: 2, h: 3, solid: [0.5, 2, 1, 1], name: "Árvore seca" },
  ruin_pillar: { w: 1, h: 2, solid: [0, 1, 1, 1], name: "Pilar em ruínas" },
  barrel: { w: 1, h: 1, solid: [0, 0, 1, 1], name: "Barril" },
  crate_stack: { w: 2, h: 2, solid: [0, 0, 2, 2], name: "Caixas abandonadas" },
  mushroom: { w: 1, h: 1, solid: null, name: "Cogumelos" },
  campfire: { w: 1, h: 1, solid: [0, 0, 1, 1], interact: "seat", name: "Fogueira (descanso)" },
  big_sign: { w: 3, h: 2, solid: [1, 1, 1, 1], name: "Placa" },
};

export interface PropInstance {
  id: string;
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  variant?: number;
  data?: string;
}
