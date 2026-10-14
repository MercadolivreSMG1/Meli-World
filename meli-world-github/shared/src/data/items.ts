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
};

/** Lojas do Centro Logístico. */
export const SHOPS: Record<string, { name: string; vendor: string; items: string[]; buyBonus: number }> = {
  equip: { name: "Arsenal do Galpão", vendor: "Ferreira", buyBonus: 1, items: ["regua", "espada_papelao", "fita_chicote", "sabre_scanner", "martelo_palete", "capacete_aco", "colete_kevlar", "armadura_baker", "energetico", "kit_socorros"] },
  food: { name: "Lanchonete da Zefa", vendor: "Dona Zefa", buyBonus: 1, items: ["coxinha", "pao_queijo", "cafe", "agua", "marmita", "energetico", "bateria"] },
  home: { name: "Casa & Construção do Tião", vendor: "Seu Tião", buyBonus: 1, items: ["decor_arvore", "decor_canteiro", "decor_banco", "decor_poste", "decor_caixa_correio", "decor_cerca_viva", "decor_horta", "decor_rede", "decor_churrasqueira", "decor_estatua_van", "decor_piscina"] },
  sell: { name: "Compra & Venda", vendor: "Neide", buyBonus: 1.25, items: [] },
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
