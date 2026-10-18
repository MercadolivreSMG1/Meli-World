/** Itens do inventário. */
export interface WeaponStats {
  dmg: number;
  range: number; // px
  cd: number; // segundos entre golpes
}

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  icon: string; // id do ícone procedural
  consumable?: { energy?: number; battery?: number; hp?: number };
  equip?: "epiVest" | "safetyShoes" | "coletor" | "weapon" | "armor";
  weapon?: WeaponStats;
  armor?: number; // redução de dano (0..1)
  decor?: string; // id do DECOR que o item vira quando colocado no lote
  mystery?: boolean; // caixa misteriosa (abre um item aleatório)
  price?: number; // preço de compra nas lojas (M$)
  sell?: number; // quanto as lojas pagam
  minLevel?: number;
  stack: number;
}

export const ITEMS: Record<string, ItemDef> = {
  coletor: { id: "coletor", name: "Coletor (HH)", desc: "Handheld para escanear pacotes, bakers e QRs. Mantenha a bateria ≥ 85% no início do turno.", icon: "coletor", equip: "coletor", stack: 1 },
  colete: { id: "colete", name: "Colete refletivo", desc: "EPI obrigatório no galpão e no pátio.", icon: "colete", equip: "epiVest", stack: 1 },
  botina: { id: "botina", name: "Calçado de segurança", desc: "EPI obrigatório. Protege contra quedas de volumes.", icon: "botina", equip: "safetyShoes", stack: 1 },
  luvas: { id: "luvas", name: "Luvas", desc: "Ajudam no manuseio de volumosos (+XP em volumosos).", icon: "luvas", stack: 1 },
  cafe: { id: "cafe", name: "Café", desc: "Recupera 25 de energia.", icon: "cafe", consumable: { energy: 25 }, price: 6, sell: 2, stack: 20 },
  marmita: { id: "marmita", name: "Marmita", desc: "Refeição completa: recupera 70 de energia e 30 de vida.", icon: "marmita", consumable: { energy: 70, hp: 30 }, price: 22, sell: 7, stack: 10 },
  agua: { id: "agua", name: "Água", desc: "Hidratação: recupera 10 de energia.", icon: "agua", consumable: { energy: 10 }, price: 3, sell: 1, stack: 20 },
  bateria: { id: "bateria", name: "Bateria extra", desc: "Troca rápida: coletor volta a 100%.", icon: "bateria", consumable: { battery: 100 }, price: 20, sell: 6, stack: 5 },
  etiquetas: { id: "etiquetas", name: "Rolo de etiquetas", desc: "Insumo da etiquetagem.", icon: "etiquetas", stack: 10 },
  medalha_automacao: { id: "medalha_automacao", name: "Medalha Automatização PRO MAX", desc: "Entregue pelo Índio. Prova de que você destravou a operação.", icon: "medalha", stack: 1 },
  medalha_controle: { id: "medalha_controle", name: "Medalha Operação sob Controle", desc: "Entregue pela Letícia.", icon: "medalha", stack: 1 },
  medalha_relampago: { id: "medalha_relampago", name: "Medalha Expedição Relâmpago", desc: "Entregue pelo Mateus Ferrari.", icon: "medalha", stack: 1 },
  cracha_tl: { id: "cracha_tl", name: "Crachá de Liderança", desc: "Você foi reconhecido como referência da operação.", icon: "cracha", stack: 1 },

  // ---------------------------------------------------------------- Armas (Arsenal do Galpão)
  regua: { id: "regua", name: "Régua de Aço", desc: "Arma inicial. Leve e rápida.", icon: "regua", equip: "weapon", weapon: { dmg: 4, range: 20, cd: 0.42 }, price: 30, sell: 10, stack: 1 },
  espada_papelao: { id: "espada_papelao", name: "Espada de Papelão Reforçado", desc: "Papelão onda tripla. Surpreendentemente afiada.", icon: "espada_papelao", equip: "weapon", weapon: { dmg: 6, range: 22, cd: 0.48 }, price: 70, sell: 25, stack: 1 },
  fita_chicote: { id: "fita_chicote", name: "Chicote de Fita Adesiva", desc: "Alcance longo. Gruda nos inimigos.", icon: "fita_chicote", equip: "weapon", weapon: { dmg: 7, range: 32, cd: 0.62 }, price: 150, sell: 50, minLevel: 3, stack: 1 },
  sabre_scanner: { id: "sabre_scanner", name: "Sabre-Scanner", desc: "Um coletor com lâmina de laser verde. Bip!", icon: "sabre_scanner", equip: "weapon", weapon: { dmg: 11, range: 24, cd: 0.46 }, price: 340, sell: 120, minLevel: 6, stack: 1 },
  martelo_palete: { id: "martelo_palete", name: "Martelo de Palete", desc: "Lento, pesado e devastador.", icon: "martelo_palete", equip: "weapon", weapon: { dmg: 19, range: 23, cd: 0.95 }, price: 560, sell: 200, minLevel: 9, stack: 1 },
  lamina_onda_verde: { id: "lamina_onda_verde", name: "Lâmina da Onda Verde", desc: "Lendária. Forjada no Flash Parking quando nenhuma rota atrasou.", icon: "lamina_onda_verde", equip: "weapon", weapon: { dmg: 26, range: 28, cd: 0.42 }, sell: 600, stack: 1 },
  // ---------------------------------------------------------------- Armaduras
  capacete_aco: { id: "capacete_aco", name: "Capacete de Aço", desc: "Reduz 12% do dano recebido.", icon: "capacete_aco", equip: "armor", armor: 0.12, price: 90, sell: 30, stack: 1 },
  colete_kevlar: { id: "colete_kevlar", name: "Colete Kevlar Logístico", desc: "Reduz 28% do dano recebido.", icon: "colete_kevlar", equip: "armor", armor: 0.28, price: 260, sell: 90, minLevel: 4, stack: 1 },
  armadura_baker: { id: "armadura_baker", name: "Armadura de Baker", desc: "Grade de baker soldada no corpo. Reduz 40% do dano.", icon: "armadura_baker", equip: "armor", armor: 0.4, price: 700, sell: 240, minLevel: 9, stack: 1 },
  // ---------------------------------------------------------------- Comida e cura
  energetico: { id: "energetico", name: "Energético Logístico", desc: "Recupera 40 de vida e 15 de energia.", icon: "energetico", consumable: { hp: 40, energy: 15 }, price: 25, sell: 8, stack: 20 },
  kit_socorros: { id: "kit_socorros", name: "Kit de Primeiros Socorros", desc: "Recupera 100 de vida.", icon: "kit_socorros", consumable: { hp: 100 }, price: 60, sell: 20, stack: 10 },
  coxinha: { id: "coxinha", name: "Coxinha", desc: "Recupera 30 de energia e 15 de vida.", icon: "coxinha", consumable: { energy: 30, hp: 15 }, price: 12, sell: 4, stack: 20 },
  pao_queijo: { id: "pao_queijo", name: "Pão de queijo", desc: "Recupera 20 de energia.", icon: "pao_queijo", consumable: { energy: 20 }, price: 8, sell: 3, stack: 30 },
  // ---------------------------------------------------------------- Loot da Zona de Extravio
  pacote_extraviado: { id: "pacote_extraviado", name: "Pacote extraviado", desc: "Um pacote perdido. Devolva ao Ranieri ou venda.", icon: "pacote_extraviado", sell: 15, stack: 50 },
  chip_bugado: { id: "chip_bugado", name: "Chip bugado", desc: "Resto de um Bug do Sistema. A TI paga bem.", icon: "chip_bugado", sell: 10, stack: 50 },
  cartao_clonado: { id: "cartao_clonado", name: "Cartão clonado", desc: "Prova de fraude. Entregue ao Ranieri (Prevenção) ou venda.", icon: "cartao_clonado", sell: 28, stack: 50 },
  rabo_rato: { id: "rabo_rato", name: "Fita roída", desc: "O Rato do Estoque deixou para trás.", icon: "rabo_rato", sell: 4, stack: 50 },
  // ---------------------------------------------------------------- Decoração da casa (Casa & Construção)
  decor_arvore: { id: "decor_arvore", name: "Árvore em vaso", desc: "Decoração para o lote.", icon: "decor_arvore", decor: "arvore", price: 35, sell: 12, stack: 10 },
  decor_canteiro: { id: "decor_canteiro", name: "Canteiro de flores", desc: "Decoração para o lote.", icon: "decor_canteiro", decor: "canteiro", price: 18, sell: 6, stack: 20 },
  decor_banco: { id: "decor_banco", name: "Banco de jardim", desc: "Decoração para o lote.", icon: "decor_banco", decor: "banco", price: 45, sell: 15, stack: 10 },
  decor_poste: { id: "decor_poste", name: "Poste de luz", desc: "Ilumina o lote à noite.", icon: "decor_poste", decor: "poste", price: 40, sell: 14, stack: 10 },
  decor_caixa_correio: { id: "decor_caixa_correio", name: "Caixa de correio amarela", desc: "Para receber as suas próprias encomendas.", icon: "decor_caixa_correio", decor: "caixa_correio", price: 30, sell: 10, stack: 5 },
  decor_churrasqueira: { id: "decor_churrasqueira", name: "Churrasqueira", desc: "Sexta-feira no SMG1.", icon: "decor_churrasqueira", decor: "churrasqueira", price: 130, sell: 45, stack: 5 },
  decor_piscina: { id: "decor_piscina", name: "Piscina", desc: "Ocupa 2x2.", icon: "decor_piscina", decor: "piscina", price: 420, sell: 150, minLevel: 6, stack: 2 },
  decor_estatua_van: { id: "decor_estatua_van", name: "Estátua da Van", desc: "Homenagem à última milha.", icon: "decor_estatua_van", decor: "estatua_van", price: 260, sell: 90, stack: 2 },
  decor_cerca_viva: { id: "decor_cerca_viva", name: "Cerca viva", desc: "Decoração para o lote.", icon: "decor_cerca_viva", decor: "cerca_viva", price: 20, sell: 7, stack: 30 },
  decor_rede: { id: "decor_rede", name: "Rede de descanso", desc: "Ocupa 2x1.", icon: "decor_rede", decor: "rede", price: 90, sell: 30, stack: 3 },
  decor_horta: { id: "decor_horta", name: "Horta", desc: "Ocupa 2x1.", icon: "decor_horta", decor: "horta", price: 60, sell: 20, stack: 5 },
  decor_trofeu: { id: "decor_trofeu", name: "Troféu da Pontualidade", desc: "Prova de que você derrotou O Grande Atraso.", icon: "decor_trofeu", decor: "trofeu", sell: 300, stack: 1 },

  // ---------------------------------------------------------------- Armas novas
  grampeador: { id: "grampeador", name: "Grampeador Sônico", desc: "Fraco, mas o mais rápido do galpão.", icon: "grampeador", equip: "weapon", weapon: { dmg: 8, range: 18, cd: 0.3 }, price: 220, sell: 75, minLevel: 4, stack: 1 },
  tesoura_industrial: { id: "tesoura_industrial", name: "Tesoura Industrial", desc: "Corta fita, stretch e Fraudador.", icon: "tesoura_industrial", equip: "weapon", weapon: { dmg: 13, range: 22, cd: 0.52 }, price: 420, sell: 140, minLevel: 5, stack: 1 },
  lanca_coletor: { id: "lanca_coletor", name: "Lança-Coletor", desc: "Alcance enorme. Escaneia e espeta.", icon: "lanca_coletor", equip: "weapon", weapon: { dmg: 12, range: 38, cd: 0.7 }, price: 520, sell: 170, minLevel: 7, stack: 1 },
  espada_onda_branca: { id: "espada_onda_branca", name: "Espada da Onda Branca", desc: "Forjada para as rotas mais distantes.", icon: "espada_onda_branca", equip: "weapon", weapon: { dmg: 16, range: 26, cd: 0.5 }, price: 820, sell: 280, minLevel: 8, stack: 1 },
  machado_fita: { id: "machado_fita", name: "Machado de Fita Dupla", desc: "Dano altíssimo, golpe lento.", icon: "machado_fita", equip: "weapon", weapon: { dmg: 24, range: 24, cd: 0.9 }, price: 1150, sell: 380, minLevel: 11, stack: 1 },
  // ---------------------------------------------------------------- Armaduras novas
  colete_turbo: { id: "colete_turbo", name: "Colete Refletivo Turbo", desc: "Reduz 20% do dano. Brilha no escuro.", icon: "colete_turbo", equip: "armor", armor: 0.2, price: 160, sell: 55, minLevel: 3, stack: 1 },
  uniforme_platinum: { id: "uniforme_platinum", name: "Uniforme Platinum", desc: "Reduz 34% do dano. Para quem bate meta.", icon: "uniforme_platinum", equip: "armor", armor: 0.34, price: 480, sell: 160, minLevel: 7, stack: 1 },
  capa_mp: { id: "capa_mp", name: "Capa Mercado Pago", desc: "Reduz 50% do dano. Protegida por criptografia.", icon: "capa_mp", equip: "armor", armor: 0.5, price: 1600, sell: 520, minLevel: 12, stack: 1 },
  // ---------------------------------------------------------------- Comidas novas
  acai: { id: "acai", name: "Açaí na tigela", desc: "Recupera 40 de energia e 20 de vida.", icon: "acai", consumable: { energy: 40, hp: 20 }, price: 18, sell: 6, stack: 20 },
  pastel: { id: "pastel", name: "Pastel de feira", desc: "Recupera 25 de energia e 10 de vida.", icon: "pastel", consumable: { energy: 25, hp: 10 }, price: 10, sell: 3, stack: 20 },
  cafe_leite: { id: "cafe_leite", name: "Café com leite", desc: "Recupera 30 de energia.", icon: "cafe_leite", consumable: { energy: 30 }, price: 8, sell: 2, stack: 20 },
  brigadeiro: { id: "brigadeiro", name: "Brigadeiro", desc: "Recupera 15 de energia e 5 de vida.", icon: "brigadeiro", consumable: { energy: 15, hp: 5 }, price: 5, sell: 2, stack: 30 },
  feijoada: { id: "feijoada", name: "Feijoada de quarta", desc: "Recupera 100 de energia e 50 de vida.", icon: "feijoada", consumable: { energy: 100, hp: 50 }, price: 45, sell: 15, stack: 10 },
  suco_detox: { id: "suco_detox", name: "Suco detox", desc: "Recupera 20 de energia e 30 de vida.", icon: "suco_detox", consumable: { energy: 20, hp: 30 }, price: 15, sell: 5, stack: 20 },
  // ---------------------------------------------------------------- Loot e colecionáveis
  etiqueta_dourada: { id: "etiqueta_dourada", name: "Etiqueta Dourada", desc: "Raríssima. Colecionadores pagam caro no Balcão.", icon: "etiqueta_dourada", sell: 80, stack: 50 },
  engrenagem_sorter: { id: "engrenagem_sorter", name: "Engrenagem do Sorter", desc: "Peça do antigo cross belt. A manutenção compra.", icon: "engrenagem_sorter", sell: 30, stack: 50 },
  caixa_misteriosa: { id: "caixa_misteriosa", name: "Caixa Lacrada Misteriosa", desc: "Use para abrir: pode vir qualquer coisa!", icon: "caixa_misteriosa", mystery: true, price: 90, sell: 30, stack: 20 },
};

/** Gera itens de decoração (quintal e interior) a partir de uma tabela compacta. */
const DECOR_ITEMS: [string, string, number, number?][] = [
  // [kind, nome, preço, nível mínimo]
  ["balanco", "Balanço", 120], ["arvore_natal", "Árvore de Natal", 90], ["varal", "Varal", 35], ["bicicleta", "Bicicleta", 140],
  ["moto_meli", "Moto de entrega", 380, 5], ["fogueira", "Fogueira", 50], ["caixa_dagua", "Caixa d'água", 70], ["placa_meli", "Placa \"Lar Logístico\"", 40],
  ["cama", "Cama de solteiro", 90], ["cama_casal", "Cama de casal", 260, 4], ["sofa_casa", "Sofá", 180], ["poltrona", "Poltrona", 85],
  ["mesa_centro", "Mesa de centro", 60], ["mesa_jantar", "Mesa de jantar", 150], ["cadeira_casa", "Cadeira", 30], ["tv_casa", "TV de LED", 320, 3],
  ["estante", "Estante de livros", 110], ["tapete", "Tapete", 70], ["tapete_meli", "Tapete amarelo MELI", 95], ["geladeira", "Geladeira", 240],
  ["fogao", "Fogão", 180], ["pia", "Pia de cozinha", 150], ["armario", "Armário", 120], ["guarda_roupa", "Guarda-roupa", 170],
  ["planta_casa", "Costela-de-adão", 45], ["quadro_meli", "Quadro do SMG1", 75], ["luminaria", "Luminária de pé", 55],
  ["computador_gamer", "Setup gamer", 650, 6], ["aquario", "Aquário", 300, 4], ["piano", "Piano", 900, 8], ["vaso_flores", "Vaso de flores", 25],
  ["gato_galpao", "Gatinho do Galpão", 200], ["cachorro", "Caramelo (vira-lata)", 200], ["cofre", "Cofre", 260], ["esteira_mini", "Mini-esteira decorativa", 340, 5],
  ["baker_decor", "Baker de colecionador", 280, 4], ["fliperama", "Fliperama", 480, 6], ["banheira", "Banheira", 520, 7],
];
for (const [kind, name, price, minLevel] of DECOR_ITEMS) {
  const id = `decor_${kind}`;
  ITEMS[id] = { id, name, desc: "Decoração para a sua casa.", icon: id, decor: kind, price, sell: Math.round(price / 3), minLevel, stack: 10 };
}

/** Tabela da Caixa Lacrada Misteriosa: [itemId, peso] */
export const MYSTERY_POOL: [string, number][] = [
  ["coxinha", 20], ["acai", 14], ["kit_socorros", 10], ["energetico", 14], ["etiqueta_dourada", 6], ["decor_gato_galpao", 4],
  ["decor_cachorro", 4], ["decor_arvore_natal", 5], ["decor_fliperama", 2], ["espada_papelao", 6], ["tesoura_industrial", 2],
  ["colete_turbo", 4], ["capa_mp", 0.5], ["lamina_onda_verde", 0.3], ["decor_trofeu", 0.5], ["feijoada", 8],
];

/** Lojas do Centro Logístico. */
export const SHOPS: Record<string, { name: string; vendor: string; items: string[]; buyBonus: number }> = {
  equip: { name: "Arsenal do Galpão", vendor: "Ferreira", buyBonus: 1, items: ["regua", "espada_papelao", "fita_chicote", "grampeador", "sabre_scanner", "tesoura_industrial", "martelo_palete", "lanca_coletor", "espada_onda_branca", "machado_fita", "capacete_aco", "colete_turbo", "colete_kevlar", "uniforme_platinum", "armadura_baker", "capa_mp", "energetico", "kit_socorros"] },
  food: { name: "Lanchonete da Zefa", vendor: "Dona Zefa", buyBonus: 1, items: ["coxinha", "pastel", "pao_queijo", "brigadeiro", "cafe", "cafe_leite", "agua", "suco_detox", "acai", "marmita", "feijoada", "energetico", "bateria"] },
  home: { name: "Casa & Construção do Tião", vendor: "Seu Tião", buyBonus: 1, items: ["decor_arvore", "decor_canteiro", "decor_banco", "decor_poste", "decor_caixa_correio", "decor_cerca_viva", "decor_horta", "decor_rede", "decor_churrasqueira", "decor_estatua_van", "decor_piscina", "decor_balanco", "decor_arvore_natal", "decor_varal", "decor_bicicleta", "decor_moto_meli", "decor_fogueira", "decor_caixa_dagua", "decor_placa_meli"] },
  moveis: { name: "Móveis da Vila", vendor: "Rosa", buyBonus: 1, items: ["decor_cama", "decor_cama_casal", "decor_sofa_casa", "decor_poltrona", "decor_mesa_centro", "decor_mesa_jantar", "decor_cadeira_casa", "decor_tv_casa", "decor_estante", "decor_tapete", "decor_tapete_meli", "decor_geladeira", "decor_fogao", "decor_pia", "decor_armario", "decor_guarda_roupa", "decor_planta_casa", "decor_quadro_meli", "decor_luminaria", "decor_vaso_flores", "decor_computador_gamer", "decor_aquario", "decor_piano", "decor_gato_galpao", "decor_cachorro", "decor_cofre", "decor_esteira_mini", "decor_baker_decor", "decor_fliperama", "decor_banheira"] },
  sell: { name: "Compra & Venda", vendor: "Neide", buyBonus: 1.25, items: ["caixa_misteriosa"] },
};

/** Preço de venda padrão de itens sem `sell` definido. */
export function sellPrice(id: string, bonus = 1): number {
  const d = ITEMS[id];
  if (!d) return 0;
  const base = d.sell ?? (d.price ? Math.floor(d.price / 3) : 2);
  return Math.max(1, Math.round(base * bonus));
}

export const STARTING_ITEMS: [string, number][] = [
  ["cafe", 2],
  ["agua", 2],
];
