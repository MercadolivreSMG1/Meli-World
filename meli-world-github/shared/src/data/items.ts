/** Itens do inventário. */
export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  icon: string; // id do ícone procedural
  consumable?: { energy?: number; battery?: number };
  equip?: "epiVest" | "safetyShoes" | "coletor";
  stack: number;
}

export const ITEMS: Record<string, ItemDef> = {
  coletor: { id: "coletor", name: "Coletor (HH)", desc: "Handheld para escanear pacotes, bakers e QRs. Mantenha a bateria ≥ 85% no início do turno.", icon: "coletor", equip: "coletor", stack: 1 },
  colete: { id: "colete", name: "Colete refletivo", desc: "EPI obrigatório no galpão e no pátio.", icon: "colete", equip: "epiVest", stack: 1 },
  botina: { id: "botina", name: "Calçado de segurança", desc: "EPI obrigatório. Protege contra quedas de volumes.", icon: "botina", equip: "safetyShoes", stack: 1 },
  luvas: { id: "luvas", name: "Luvas", desc: "Ajudam no manuseio de volumosos (+XP em volumosos).", icon: "luvas", stack: 1 },
  cafe: { id: "cafe", name: "Café", desc: "Recupera 25 de energia.", icon: "cafe", consumable: { energy: 25 }, stack: 20 },
  marmita: { id: "marmita", name: "Marmita", desc: "Refeição completa: recupera 70 de energia.", icon: "marmita", consumable: { energy: 70 }, stack: 10 },
  agua: { id: "agua", name: "Água", desc: "Hidratação: recupera 10 de energia.", icon: "agua", consumable: { energy: 10 }, stack: 20 },
  bateria: { id: "bateria", name: "Bateria extra", desc: "Troca rápida: coletor volta a 100%.", icon: "bateria", consumable: { battery: 100 }, stack: 5 },
  etiquetas: { id: "etiquetas", name: "Rolo de etiquetas", desc: "Insumo da etiquetagem.", icon: "etiquetas", stack: 10 },
  medalha_automacao: { id: "medalha_automacao", name: "Medalha Automatização PRO MAX", desc: "Entregue pelo Iago. Prova de que você destravou a operação.", icon: "medalha", stack: 1 },
  medalha_controle: { id: "medalha_controle", name: "Medalha Operação sob Controle", desc: "Entregue pela Lívia.", icon: "medalha", stack: 1 },
  medalha_relampago: { id: "medalha_relampago", name: "Medalha Expedição Relâmpago", desc: "Entregue pelo Marcos Veloz.", icon: "medalha", stack: 1 },
  cracha_tl: { id: "cracha_tl", name: "Crachá de Liderança", desc: "Você foi reconhecido como referência da operação.", icon: "cracha", stack: 1 },
};

export const STARTING_ITEMS: [string, number][] = [
  ["cafe", 2],
  ["agua", 2],
];
