/**
 * NPCs principais: personalidade, rotina (agenda por hora do jogo), falas e missões.
 * Nomes marcados com (*) são fictícios e podem ser trocados pelos nomes reais da equipe.
 */
import { Appearance, DEFAULT_APPEARANCE } from "../appearance";

export interface ScheduleEntry {
  from: number; // hora (0-24, aceita fração)
  point: string; // id de ponto do mapa
  activity: "work" | "talk" | "eat" | "sit" | "walk" | "scan" | "patrol";
  label: string;
}

export interface NpcDef {
  id: string;
  name: string;
  role: string;
  personality: string;
  look: Appearance;
  epi: boolean;
  schedule: ScheduleEntry[];
  greetings: string[];
  lines: string[];
  tips: string[];
  ambient?: boolean;
}

const look = (o: Partial<Appearance>): Appearance => ({ ...DEFAULT_APPEARANCE, ...o });

export const NPCS: NpcDef[] = [
  {
    id: "iago", name: "Iago", role: "Team Leader · Automação & Tecnologia",
    personality: "Inteligente, estratégico, criativo, bem-humorado e exigente com os processos.",
    look: look({ skin: 5, hair: "topete", hairColor: 0, glasses: "quadrado", beard: "cavanhaque", facialColor: 0, top: "polo", topColor: 1, vest: "lider", vestColor: 1, bottom: "cargo", bottomColor: 14, shoes: "botas", shoesColor: 4, accessory: "relogio", brows: "grossas", mouth: "sorrisao" }),
    epi: true,
    schedule: [
      { from: 0, point: "tl_iago", activity: "work", label: "Analisando o dashboard da madrugada" },
      { from: 5.8, point: "tl_iago", activity: "work", label: "Preparando o layout no Logistics" },
      { from: 6.2, point: "briefing", activity: "talk", label: "Conduzindo o Tier 1" },
      { from: 6.8, point: "sorter", activity: "scan", label: "Monitorando o Sorter" },
      { from: 9.5, point: "ilhaB", activity: "patrol", label: "Rodando as ilhas" },
      { from: 11.5, point: "refeitorio", activity: "eat", label: "Almoçando" },
      { from: 12.5, point: "sorter", activity: "scan", label: "Ajustando o cross belt" },
      { from: 15, point: "tl_iago", activity: "work", label: "Criando automações" },
      { from: 17, point: "goleiro", activity: "patrol", label: "Caçando gargalos no goleiro" },
      { from: 20, point: "tl_iago", activity: "work", label: "Fechando o relatório do turno" },
    ],
    greetings: ["E aí! Bora automatizar alguma coisa hoje?", "Fala, fera! Dado na mão e processo na veia.", "Opa! Se tiver gargalo, me chama que a gente resolve."],
    lines: [
      "Se dá pra fazer duas vezes, dá pra automatizar.",
      "Indicador sem ação é só um número bonito.",
      "O cross belt desvia sozinho… mas quem garante a qualidade é a gente.",
      "Tela verde é o melhor som do galpão. Tá, não é som, mas você entendeu.",
    ],
    tips: [
      "No Sorter, sortable é de 10 a 1000 mm e de 0,04 a 15 kg. Fora disso, nem induz!",
      "Envelope, cilindro ou item abaixo de 40 g vai na bandeja do Sorter.",
      "No read vai para a mesa de ajuda. Rejeito vai direto para a guarda, sem reinduzir.",
      "Sorting dinâmico renomeia as rotas com prefixo e equilibra as ilhas: espinha de peixe ou balanceado.",
    ],
  },
  {
    id: "livia", name: "Lívia", role: "Team Leader · Organização & Qualidade",
    personality: "Organizada, firme, acolhedora e obcecada por qualidade.",
    look: look({ skin: 2, hair: "longo", hairColor: 2, eyes: "grandes", eyeColor: 2, brows: "arqueadas", top: "camiseta", topColor: 18, vest: "lider", vestColor: 1, bottom: "jeans", bottomColor: 1, shoes: "botas", shoesColor: 10, accessory: "brincos", badge: true, mouth: "sorriso" }),
    epi: true,
    schedule: [
      { from: 0, point: "tl_livia", activity: "work", label: "Planejando a escala" },
      { from: 5.8, point: "epi", activity: "patrol", label: "Checando EPIs e insumos" },
      { from: 6.2, point: "briefing", activity: "talk", label: "Tier 1 do turno" },
      { from: 6.8, point: "etiquetagem", activity: "patrol", label: "Acompanhando a etiquetagem" },
      { from: 9, point: "ilhaC", activity: "patrol", label: "Distribuindo o time nas ilhas" },
      { from: 11, point: "refeitorio", activity: "eat", label: "Almoçando" },
      { from: 12, point: "ps", activity: "work", label: "Revisando incidências com o PS" },
      { from: 14.5, point: "ilhaA", activity: "patrol", label: "Checando bakers pendentes" },
      { from: 17.5, point: "tl_livia", activity: "work", label: "Atualizando os indicadores de qualidade" },
    ],
    greetings: ["Oi! Tudo em ordem por aí?", "Bom te ver! Lembrou do EPI?", "Oi, oi! Organização primeiro, velocidade depois."],
    lines: [
      "Um lugar para cada coisa e cada coisa no seu lugar. Inclusive o pacote.",
      "Layout bem feito no começo do turno evita incêndio no fim.",
      "Qualidade não é etapa, é jeito de trabalhar.",
      "Se o baker não fechou sozinho, tem motivo. Vamos descobrir?",
    ],
    tips: [
      "Etiqueta de rota nunca em cima da shipping label nem do logo do Mercado Livre.",
      "Etiquete um pacote por vez: assim não troca etiqueta.",
      "Induza com a etiqueta para cima e sem empilhar pacotes.",
      "No setup, o QR vai protegido e legível no meio da prateleira de cima do baker.",
    ],
  },
  {
    id: "marcos", name: "Marcos Veloz", role: "Team Leader · Expedição & Agilidade",
    personality: "Rápido, competitivo, animado e sempre de olho no relógio.",
    look: look({ skin: 1, hair: "curto", hairColor: 3, hat: "bone_aba_reta", hatColor: 5, top: "uniforme", topColor: 0, vest: "lider", vestColor: 1, bottom: "jogger", bottomColor: 4, shoes: "tenis", shoesColor: 5, beard: "curta", facialColor: 3, mouth: "sorrisao" }),
    epi: true,
    schedule: [
      { from: 0, point: "tl_marcos", activity: "work", label: "Conferindo as ondas do dia" },
      { from: 5.8, point: "flash", activity: "patrol", label: "Organizando o Flash Parking" },
      { from: 6.2, point: "briefing", activity: "talk", label: "Tier 1" },
      { from: 6.8, point: "expedicao", activity: "patrol", label: "Puxando a Onda 1" },
      { from: 10, point: "stage", activity: "scan", label: "Buscador: localizando bakers adicionais" },
      { from: 12, point: "refeitorio", activity: "eat", label: "Almoço relâmpago" },
      { from: 12.7, point: "expedicao", activity: "patrol", label: "Carregamento da Onda 2" },
      { from: 16, point: "flash", activity: "patrol", label: "Controlando tempo de permanência" },
      { from: 19, point: "tl_marcos", activity: "work", label: "Relatório de expedição" },
    ],
    greetings: ["Fala, fera! Bora que a van não espera!", "E aí! Hoje a gente bate recorde de saída.", "Opa! Rápido, mas seguro, combinado?"],
    lines: [
      "Rotas mais distantes saem primeiro. Simples assim.",
      "No pátio é 10 km/h; perto da operação, 5 km/h. Agilidade não é pressa.",
      "Volumoso vai no piso do veículo. Sempre.",
      "Sem 'Já carreguei tudo' não tem check-out no YMS.",
    ],
    tips: [
      "Ondas do Flash Parking: 1 = branca, 2 = amarela, 3 = verde.",
      "Tempo máximo de permanência no MLB: 30 minutos.",
      "Contagem errada duas vezes: aduana automática. Não dá para pular.",
      "Rebocador puxa até 10 carrinhos a 4,5 km/h.",
    ],
  },
  {
    id: "rafael", name: "Rafael (*)", role: "Team Leader Sênior",
    personality: "Calmo, analítico, mentor da liderança.",
    look: look({ skin: 6, hair: "raspado", hairColor: 0, beard: "cheia", facialColor: 0, top: "social", topColor: 3, vest: "jaqueta", vestColor: 1, bottom: "calca", bottomColor: 4, shoes: "sapatenis", shoesColor: 10, glasses: "redondo" }),
    epi: true,
    schedule: [
      { from: 0, point: "tls", activity: "work", label: "Planejamento semanal" },
      { from: 7, point: "stage", activity: "patrol", label: "Gemba walk" },
      { from: 9, point: "tls", activity: "work", label: "1:1 com os TLs" },
      { from: 12, point: "refeitorio", activity: "eat", label: "Almoço" },
      { from: 13, point: "sup", activity: "talk", label: "Reunião com a supervisão" },
      { from: 15, point: "sorting", activity: "patrol", label: "Gemba walk" },
      { from: 17, point: "tls", activity: "work", label: "Plano de ação" },
    ],
    greetings: ["Olá. Como está o seu dia?", "Bom te ver. O que os indicadores te contam hoje?"],
    lines: ["Liderar é desenvolver gente.", "Gemba: o lugar onde as coisas acontecem. Vá até lá."],
    tips: ["Inspeção a cada 1 hora: baixe a lista de pacotes faltantes e investigue os que estão há mais de 1 h desde o inbound."],
  },
  {
    id: "carla", name: "Carla (*)", role: "Supervisora do SVC",
    personality: "Visionária, exigente e justa.",
    look: look({ skin: 4, hair: "coque", hairColor: 1, top: "social", topColor: 2, vest: "jaqueta", vestColor: 4, bottom: "saia", bottomColor: 4, shoes: "sapatenis", shoesColor: 4, glasses: "quadrado", accessory: "colar" }),
    epi: true,
    schedule: [
      { from: 0, point: "sup", activity: "work", label: "Revisando o plano do site" },
      { from: 8, point: "hall", activity: "talk", label: "Conversando com o time" },
      { from: 9, point: "sup", activity: "work", label: "Reunião regional" },
      { from: 12, point: "refeitorio", activity: "eat", label: "Almoço" },
      { from: 13, point: "sup", activity: "talk", label: "Reunião com a liderança" },
      { from: 16, point: "briefing", activity: "patrol", label: "Visita ao galpão" },
      { from: 17, point: "sup", activity: "work", label: "Fechamento do dia" },
    ],
    greetings: ["Olá! Cada pacote é uma promessa a um cliente.", "Oi! Como posso te ajudar?"],
    lines: ["Segurança, qualidade e produtividade — nessa ordem.", "Excelência operacional é consistência, todo dia."],
    tips: ["Rota crítica não é liberada sem autorização do supervisor."],
  },
  {
    id: "juca", name: "Juca (*)", role: "Problem Solver (PS)",
    personality: "Paciente, detalhista e cheio de histórias.",
    look: look({ skin: 7, hair: "black_power", hairColor: 0, top: "moletom", topColor: 6, bottom: "cargo", bottomColor: 10, shoes: "botas", shoesColor: 10, accessory: "fone", mustache: "grosso", facialColor: 0 }),
    epi: true,
    schedule: [
      { from: 0, point: "ps", activity: "work", label: "Tratando incidências" },
      { from: 11.5, point: "cafe", activity: "eat", label: "Pausa para o café" },
      { from: 12.2, point: "ps", activity: "work", label: "Tratando incidências" },
      { from: 16, point: "goleiro", activity: "scan", label: "Recolhendo Casos PS do goleiro" },
      { from: 17, point: "ps", activity: "work", label: "Tratando incidências" },
    ],
    greetings: ["Opa! Trouxe pepino ou veio ajudar?", "Fala aí! Na mesa do PS tudo tem solução."],
    lines: ["Pacote danificado com solução: repara, registra e volta pra rota.", "Duplicado? Vem pra mim que eu resolvo."],
    tips: ["Danificado sem solução: status 'Danificado', abre o baker, reescaneia e fecha. O motorista não leva."],
  },
  {
    id: "antonio", name: "Seu Antônio (*)", role: "Portaria & YMS",
    personality: "Simpático, pontual e guardião dos lacres.",
    look: look({ skin: 8, hair: "social", hairColor: 7, mustache: "grosso", facialColor: 7, top: "social", topColor: 1, bottom: "calca", bottomColor: 4, shoes: "sapatenis", shoesColor: 4, hat: "nenhum" }),
    epi: true,
    schedule: [
      { from: 0, point: "guarita", activity: "work", label: "Registrando Gate In/Out no YMS" },
      { from: 10, point: "portaria", activity: "patrol", label: "Recebendo motoristas" },
      { from: 10.5, point: "guarita", activity: "work", label: "Auditando lacres" },
      { from: 13, point: "cafe", activity: "eat", label: "Cafezinho" },
      { from: 13.5, point: "guarita", activity: "work", label: "Controle de acesso" },
    ],
    greetings: ["Bom dia, bom dia! Bateu o ponto?", "Opa! Tudo certo? Lacre conferido é carga protegida."],
    lines: ["Gate Out é pelo app, viu? QR impresso não vale.", "Em 30 anos de portaria, nunca vi um dia igual ao outro."],
    tips: ["Se o LH tem dois destinos, coloca lacre novo antes de o caminhão sair."],
  },
];

/** REPs ambientes (aparência gerada por seed). */
export const AMBIENT_REPS: { id: string; name: string; post: string; label: string }[] = [
  { id: "rep_bia", name: "Bia", post: "etiquetagem", label: "Etiquetando e induzindo" },
  { id: "rep_kaua", name: "Kauã", post: "ilhaA", label: "Pescando na ilha A" },
  { id: "rep_lari", name: "Lari", post: "ilhaB", label: "Pescando na ilha B" },
  { id: "rep_thiago", name: "Thiago", post: "ilhaC", label: "Pescando na ilha C" },
  { id: "rep_nanda", name: "Nanda", post: "ilhaD", label: "Pescando na ilha D" },
  { id: "rep_wesley", name: "Wesley", post: "goleiro", label: "Goleiro" },
  { id: "rep_gabi", name: "Gabi", post: "stage", label: "Traslado de bakers" },
  { id: "rep_duda", name: "Duda", post: "recebimento", label: "Recebimento de HUs" },
];

export const NPC_BY_ID: Record<string, NpcDef> = Object.fromEntries(NPCS.map((n) => [n.id, n]));
