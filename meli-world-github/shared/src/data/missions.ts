/**
 * Catálogo de missões. Para criar uma nova missão basta adicionar um objeto aqui:
 * os objetivos reagem a eventos (GameEvent) emitidos pelo servidor.
 */

export type EventType =
  | "clock_in" | "equip_epi" | "charge" | "briefing" | "training_pass" | "talk" | "receive_lh" | "label"
  | "fish_correct" | "containerize" | "goleiro_correct" | "ps_resolve" | "audit_fix" | "baker_closed"
  | "setup_baker" | "traslado" | "load_van" | "dispatch" | "aduana" | "volumosos_correct" | "sorter_optimize"
  | "visit" | "kpi_view" | "assign_rep" | "eat"
  | "kill" | "deliver" | "buy_plot" | "build_house" | "place_decor" | "shop_buy" | "shop_sell" | "market_list"
  | "market_buy" | "market_sold" | "mp_deposit" | "mp_transfer" | "rest_home";

export interface GameEvent {
  type: EventType;
  amount?: number;
  [k: string]: string | number | boolean | undefined;
}

export interface ObjectiveDef {
  id: string;
  type: EventType;
  count: number;
  text: string;
  filter?: Record<string, string | number | boolean>;
}

export interface MissionDef {
  id: string;
  title: string;
  giver: string; // id do NPC ou "board"
  summary: string;
  intro: string[]; // falas ao oferecer
  outro: string[]; // falas ao concluir
  objectives: ObjectiveDef[];
  requires?: { level?: number; missions?: string[] };
  timeLimit?: number; // minutos de jogo
  daily?: boolean;
  special?: boolean;
  startEvent?: "backlog_surge" | "sector_chaos" | "wave_rush";
  /** itens entregues ao aceitar (ex.: arma inicial) */
  startItems?: [string, number][];
  rewards: { xp: number; coins?: number; items?: [string, number][]; perk?: string; skillPoints?: number };
}

export const MISSIONS: MissionDef[] = [
  // ------------------------------------------------ Onboarding
  {
    id: "primeiro_dia", title: "Primeiro dia no SMG1", giver: "antonio",
    summary: "Bata o ponto na portaria e procure a Letícia, Team Leader, na sala dos TLs.",
    intro: ["Bom dia! Você é o novo REP, né? Seja bem-vindo ao SMG1!", "Primeiro passo: bata o ponto ali no relógio. Depois procure a Letícia na sala dos Team Leaders, no prédio administrativo."],
    outro: ["Pronto, agora você é oficialmente do time!"],
    objectives: [
      { id: "ponto", type: "clock_in", count: 1, text: "Bater o ponto na portaria" },
      { id: "leticia", type: "talk", count: 1, text: "Falar com a Letícia (sala dos TLs)", filter: { npc: "leticia" } },
    ],
    rewards: { xp: 40, items: [["cafe", 1]] },
  },
  {
    id: "sem_epi", title: "Sem EPI, sem operação", giver: "leticia", requires: { missions: ["primeiro_dia"] },
    summary: "Pegue colete refletivo e calçado de segurança no armário de EPI e carregue o coletor até 85% ou mais.",
    intro: ["Oi! Que bom te ver por aqui. Antes de qualquer coisa: segurança.", "No galpão ninguém entra sem colete refletivo e calçado de segurança. Os armários ficam logo depois da porta do administrativo.", "E pegue um coletor no carregador. A WI pede bateria de pelo menos 85% para começar o turno!"],
    outro: ["Agora sim, com cara de operação!"],
    objectives: [
      { id: "epi", type: "equip_epi", count: 1, text: "Vestir os EPIs (armário de EPI)" },
      { id: "bat", type: "charge", count: 1, text: "Coletor com bateria ≥ 85% (carregador)" },
    ],
    rewards: { xp: 50, items: [["agua", 2]] },
  },
  {
    id: "tier1", title: "Briefing Operacional (Tier 1)", giver: "leticia", requires: { missions: ["sem_epi"] },
    summary: "Vá ao ponto do Tier 1, perto do telão de indicadores, e participe do briefing do turno.",
    intro: ["Todo turno começa com o Tier 1: alinhamos layout, insumos, pessoas e metas.", "Vai lá no ponto do Tier 1, ao lado do telão, e interaja com o quadro."],
    outro: ["Briefing feito! Você já sabe as metas do dia."],
    objectives: [{ id: "b", type: "briefing", count: 1, text: "Participar do Tier 1 (quadro do briefing)" }],
    rewards: { xp: 40 },
  },
  {
    id: "treinamento", title: "Treinamento de integração", giver: "leticia", requires: { missions: ["tier1"] },
    summary: "Faça o quiz na sala de treinamento e acerte pelo menos 4 de 6 perguntas.",
    intro: ["Último passo da integração: treinamento! A sala fica no administrativo.", "São perguntas rápidas sobre as WIs do SVC. Acertando 4 de 6 você está liberado."],
    outro: ["Aprovado! Agora procura o Índio, ele vai te ensinar a mexer na esteira."],
    objectives: [{ id: "q", type: "training_pass", count: 1, text: "Ser aprovado no treinamento" }],
    rewards: { xp: 80, items: [["marmita", 1]] },
  },
  {
    id: "primeiro_pacote", title: "Do flowrack ao baker", giver: "indio", requires: { missions: ["treinamento"] },
    summary: "Etiquete e induza pacotes, pesque na sua ilha e conteinerize com tela verde.",
    intro: ["E aí, novato! Aqui é o Índio. Vou te mostrar o caminho do pacote.", "1) Etiquetagem: pega o pacote do flowrack, cola a etiqueta (nunca em cima da shipping label!) e induz na esteira.", "2) Pesca: na sua ilha, pega só os pacotes com a sua letra.", "3) Conteinerização: escaneia o pacote, escaneia o QR do baker e só coloca quando a tela ficar VERDE."],
    outro: ["Mandou bem! Esse é o coração do SVC."],
    objectives: [
      { id: "l", type: "label", count: 3, text: "Etiquetar e induzir 3 pacotes" },
      { id: "f", type: "fish_correct", count: 3, text: "Pescar 3 pacotes da ilha certa" },
      { id: "c", type: "containerize", count: 3, text: "Conteinerizar 3 pacotes com tela verde", filter: { green: true } },
    ],
    rewards: { xp: 120 },
  },
  // ------------------------------------------------ Índio (automação, tecnologia, produtividade)
  {
    id: "pesca_certeira", title: "Pesca certeira", giver: "indio", requires: { missions: ["primeiro_pacote"] },
    summary: "Pesque 15 pacotes corretos na esteira.",
    intro: ["Pesca é ritmo: um pacote por vez, os pesados embaixo e nada no chão.", "Pesca 15 pacotes certos pra mim."],
    outro: ["Isso aí, ritmo de cross belt!"],
    objectives: [{ id: "f", type: "fish_correct", count: 15, text: "Pescar 15 pacotes corretos" }],
    rewards: { xp: 120 },
  },
  {
    id: "poka_yoke", title: "Poka Yoke 100% verde", giver: "indio", requires: { missions: ["primeiro_pacote"] },
    summary: "Conteinerize 20 pacotes com tela verde. O KPI é % de telas verdes!",
    intro: ["Sabe o Poka Yoke? A cor da tela do coletor não deixa você errar.", "Verde: pode colocar. Laranja: contêiner errado, relê o pacote. Vermelha: erro de shipment.", "Quero 20 telas verdes."],
    outro: ["Indicador lindo. Assim que eu gosto!"],
    objectives: [{ id: "c", type: "containerize", count: 20, text: "20 conteinerizações com tela verde", filter: { green: true } }],
    rewards: { xp: 150, items: [["cafe", 2]] },
  },
  {
    id: "gargalo", title: "Caçando o gargalo", giver: "indio", requires: { level: 3, missions: ["primeiro_pacote"] },
    summary: "Olhe os indicadores, ajude o goleiro e otimize o layout no painel do Sorter.",
    intro: ["Tem pacote sobrando no fim da esteira… isso é sintoma de gargalo.", "Dá uma olhada no painel de indicadores, faz a triagem do goleiro e depois otimiza o layout no painel do Sorter."],
    outro: ["Gargalo identificado e tratado. Você tem olho de processo!"],
    objectives: [
      { id: "k", type: "kpi_view", count: 1, text: "Analisar o painel de indicadores" },
      { id: "g", type: "goleiro_correct", count: 8, text: "Triar 8 pacotes no goleiro" },
      { id: "s", type: "sorter_optimize", count: 1, text: "Otimizar layout no painel do Sorter" },
    ],
    rewards: { xp: 180, skillPoints: 1 },
  },
  {
    id: "corrigir_sorting", title: "Erro de sorting não passa", giver: "indio", requires: { level: 2, missions: ["primeiro_pacote"] },
    summary: "Audite bakers pendentes e reposicione 5 pacotes no lugar certo.",
    intro: ["Baker que não fecha sozinho tem pacote errado ou faltando.", "Faz auditoria na mesa de auditoria ou direto no baker pendente e reposiciona 5 pacotes."],
    outro: ["Auditoria impecável."],
    objectives: [{ id: "a", type: "audit_fix", count: 5, text: "Reposicionar 5 pacotes em auditoria" }],
    rewards: { xp: 160 },
  },
  {
    id: "automatizacao_pro_max", title: "AUTOMATIZAÇÃO PRO MAX", giver: "indio", special: true,
    requires: { level: 5, missions: ["gargalo"] }, startEvent: "backlog_surge",
    summary: "A operação está acumulando pacotes! Ajude o Índio a recuperar a eficiência.",
    intro: ["Alerta vermelho! Chegaram dois LH juntos e a esteira está acumulando.", "Vamos fazer do jeito certo: dados primeiro, depois automação, depois execução.", "Analisa o mapa de calor no painel, otimiza o layout do Sorter, limpa o goleiro, conteineriza e audita o que ficou pendente. Bora?"],
    outro: ["AUTOMATIZAÇÃO PRO MAX! A esteira voltou a respirar.", "Toma, essa habilidade é sua: seu coletor agora trabalha junto com você."],
    objectives: [
      { id: "k", type: "kpi_view", count: 1, text: "Analisar o mapa de calor (painel de indicadores)" },
      { id: "s", type: "sorter_optimize", count: 1, text: "Otimizar layout no painel do Sorter" },
      { id: "g", type: "goleiro_correct", count: 10, text: "Triar 10 pacotes no goleiro" },
      { id: "c", type: "containerize", count: 25, text: "25 conteinerizações verdes", filter: { green: true } },
      { id: "a", type: "audit_fix", count: 3, text: "Reposicionar 3 pacotes em auditoria" },
    ],
    rewards: { xp: 500, perk: "automacao_pro_max", items: [["medalha_automacao", 1]], skillPoints: 1 },
  },
  // ------------------------------------------------ Letícia (organização, gestão, qualidade)
  {
    id: "setup_turno", title: "Setup do turno", giver: "leticia", requires: { missions: ["primeiro_pacote"] },
    summary: "Prepare 4 bakers: QR legível na prateleira de cima e sacas vinculadas.",
    intro: ["Layout bem montado é metade do turno ganho.", "Na estação de Preparação de carrinhos, faça o setup de 4 bakers: QR colado no meio da prateleira de cima e sacas vinculadas no coletor."],
    outro: ["Setup perfeito. Organização é tudo!"],
    objectives: [{ id: "s", type: "setup_baker", count: 4, text: "Fazer o setup de 4 bakers" }],
    rewards: { xp: 100 },
  },
  {
    id: "distribuir_reps", title: "Distribuir o time", giver: "leticia", requires: { level: 2, missions: ["setup_turno"] },
    summary: "Converse com 3 REPs e direcione cada um para a atividade certa.",
    intro: ["Faltou gente na ilha C e sobrou na etiquetagem.", "Fala com 3 REPs pelo galpão e direciona cada um para onde está o gargalo."],
    outro: ["Time bem distribuído, produtividade lá em cima."],
    objectives: [{ id: "r", type: "assign_rep", count: 3, text: "Direcionar 3 REPs" }],
    rewards: { xp: 120 },
  },
  {
    id: "fechar_bakers", title: "Rota fechada é rota pronta", giver: "leticia", requires: { level: 2, missions: ["primeiro_pacote"] },
    summary: "Ajude a fechar 3 bakers (completos ou depois da auditoria).",
    intro: ["Baker fecha sozinho quando está completo. Se não fechar: auditoria, busca nos vizinhos e só por último o fechamento manual.", "Me ajuda a fechar 3 bakers?"],
    outro: ["Rotas fechadas, expedição agradece!"],
    objectives: [{ id: "b", type: "baker_closed", count: 3, text: "Fechar 3 bakers" }],
    rewards: { xp: 140 },
  },
  {
    id: "operacao_sob_controle", title: "OPERAÇÃO SOB CONTROLE", giver: "leticia", special: true,
    requires: { level: 5, missions: ["setup_turno", "fechar_bakers"] }, startEvent: "sector_chaos", timeLimit: 45,
    summary: "Reorganize o setor antes do fim da janela operacional (45 min de jogo).",
    intro: ["Preciso de você agora. O setor das ilhas virou bagunça: bakers pendentes, goleiro lotado e time desencontrado.", "A janela operacional fecha em 45 minutos. Vamos colocar tudo sob controle?"],
    outro: ["OPERAÇÃO SOB CONTROLE! Janela cumprida.", "Você tem perfil de liderança, viu? Essa habilidade é sua."],
    objectives: [
      { id: "r", type: "assign_rep", count: 2, text: "Direcionar 2 REPs" },
      { id: "a", type: "audit_fix", count: 4, text: "Reposicionar 4 pacotes em auditoria" },
      { id: "g", type: "goleiro_correct", count: 6, text: "Triar 6 pacotes no goleiro" },
      { id: "b", type: "baker_closed", count: 2, text: "Fechar 2 bakers" },
      { id: "s", type: "setup_baker", count: 2, text: "Setup de 2 bakers" },
    ],
    rewards: { xp: 500, perk: "operacao_sob_controle", items: [["medalha_controle", 1]], skillPoints: 1 },
  },
  // ------------------------------------------------ Mateus Ferrari (expedição, agilidade)
  {
    id: "traslado_seguro", title: "Traslado seguro", giver: "mateus", requires: { missions: ["primeiro_pacote"] },
    summary: "Leve 3 bakers fechados até a doca do veículo da rota, sem correr.",
    intro: ["Fala, fera! Mateus Ferrari, expedição. Aqui é agilidade, mas com segurança.", "Baker se empurra pela lateral, nunca correndo e nunca freando com o pé.", "Leva 3 bakers fechados até a doca da van da rota."],
    outro: ["Rápido e seguro. É isso!"],
    objectives: [{ id: "t", type: "traslado", count: 3, text: "Trasladar 3 bakers com segurança", filter: { safe: true } }],
    rewards: { xp: 120 },
  },
  {
    id: "onda_amarela", title: "Onda amarela", giver: "mateus", requires: { level: 2, missions: ["traslado_seguro"] },
    summary: "Despache 2 rotas da Onda 2 (QR amarelo no para-brisa).",
    intro: ["No Flash Parking cada onda tem sua cor: 1 branca, 2 amarela, 3 verde.", "Despacha 2 rotas da onda amarela pra mim."],
    outro: ["Onda amarela fora do pátio!"],
    objectives: [{ id: "d", type: "dispatch", count: 2, text: "Despachar 2 rotas da Onda 2", filter: { wave: 2 } }],
    rewards: { xp: 160 },
  },
  {
    id: "aduana", title: "Contagem que não fecha", giver: "mateus", requires: { level: 2, missions: ["traslado_seguro"] },
    summary: "Quando a contagem do motorista falha duas vezes, a rota vai para a aduana. Faça uma recontagem.",
    intro: ["Se o motorista erra a contagem duas vezes, a rota cai na aduana. Não dá pra pular!", "Quando acontecer, faz a recontagem com calma."],
    outro: ["Aduana resolvida sem drama."],
    objectives: [{ id: "a", type: "aduana", count: 1, text: "Fazer 1 recontagem de aduana" }],
    rewards: { xp: 100 },
  },
  {
    id: "expedicao_relampago", title: "EXPEDIÇÃO RELÂMPAGO", giver: "mateus", special: true,
    requires: { level: 5, missions: ["traslado_seguro", "onda_amarela"] }, startEvent: "wave_rush", timeLimit: 50,
    summary: "Uma onda inteira chegou de uma vez. Carregue e despache 3 rotas no prazo de permanência.",
    intro: ["Chegou todo mundo junto no Flash Parking! Tempo máximo de permanência é 30 minutos por veículo.", "Carrega e despacha 3 rotas dentro do prazo: rotas mais distantes primeiro, volumosos no piso, e confirma o 'Já carreguei tudo'!"],
    outro: ["EXPEDIÇÃO RELÂMPAGO! Pátio limpo e ninguém estourou o tempo.", "Toma essa habilidade: agora você voa com o baker (com segurança, hein)."],
    objectives: [
      { id: "t", type: "traslado", count: 3, text: "Trasladar 3 bakers com segurança", filter: { safe: true } },
      { id: "l", type: "load_van", count: 3, text: "Carregar 3 veículos" },
      { id: "d", type: "dispatch", count: 3, text: "Despachar 3 rotas no prazo", filter: { late: false } },
    ],
    rewards: { xp: 550, perk: "expedicao_relampago", items: [["medalha_relampago", 1]], skillPoints: 1 },
  },
  // ------------------------------------------------ Outros NPCs
  {
    id: "recebimento_lh", title: "Recebimento de Line Haul", giver: "antonio", requires: { missions: ["sem_epi"] },
    summary: "Receba um caminhão LH numa doca de recebimento seguindo o checklist.",
    intro: ["Chegou LH do FBM! Na doca, o motorista desliga o caminhão, entrega a chave e calça as rodas.", "Depois: confere o romaneio, audita o lacre no YMS, e escaneia QR da doca, QR do transportador e cada HU. Nada de digitar na mão!"],
    outro: ["Recebimento redondinho. Lacre conferido, HUs no sistema."],
    objectives: [{ id: "r", type: "receive_lh", count: 1, text: "Receber 1 caminhão LH" }],
    rewards: { xp: 120 },
  },
  {
    id: "ps_por_um_dia", title: "Problem Solver por um dia", giver: "juca", requires: { level: 3, missions: ["primeiro_pacote"] },
    summary: "Trate 5 incidências na mesa do PS e ajude o goleiro.",
    intro: ["Opa! Juca, do PS. Aqui caem os pepinos: danificado, duplicado, faltante, excesso de rota…", "Resolve 5 incidências comigo e tria 5 no goleiro."],
    outro: ["Você leva jeito pra PS!"],
    objectives: [
      { id: "p", type: "ps_resolve", count: 5, text: "Resolver 5 incidências no PS" },
      { id: "g", type: "goleiro_correct", count: 5, text: "Triar 5 pacotes no goleiro" },
    ],
    rewards: { xp: 180, items: [["luvas", 1]] },
  },
  {
    id: "volumosos", title: "Peso certo, jeito certo", giver: "juca", requires: { missions: ["primeiro_pacote"] },
    summary: "Classifique 8 pacotes na área de volumosos (sortable, volumoso ou oversize).",
    intro: ["Volumoso tem regra: TV e espelho sempre na vertical, acima de 55\" são duas pessoas.", "Limite por pessoa: 15 kg com a carga no chão, 20 kg a 75 cm do piso. Classifica 8 pra mim?"],
    outro: ["Coluna agradece!"],
    objectives: [{ id: "v", type: "volumosos_correct", count: 8, text: "Classificar 8 volumes" }],
    rewards: { xp: 120 },
  },
  {
    id: "visao_de_dono", title: "Visão de dono", giver: "jaderson", requires: { level: 8 },
    summary: "Acompanhe os indicadores e entregue resultado: 5 bakers fechados e 5 rotas despachadas.",
    intro: ["Sou o Jaderson, TL Sênior. Quem cresce aqui pensa como dono.", "Olha o painel, entende o dia e entrega: 5 bakers fechados e 5 rotas despachadas."],
    outro: ["Isso é visão de dono. Vou falar de você com a supervisão."],
    objectives: [
      { id: "k", type: "kpi_view", count: 1, text: "Analisar indicadores" },
      { id: "b", type: "baker_closed", count: 5, text: "Fechar 5 bakers" },
      { id: "d", type: "dispatch", count: 5, text: "Despachar 5 rotas" },
    ],
    rewards: { xp: 300, skillPoints: 1 },
  },
  {
    id: "reconhecimento", title: "Reconhecimento", giver: "ramon", requires: { missions: ["automatizacao_pro_max", "operacao_sob_controle", "expedicao_relampago"] },
    summary: "Converse com o Supervisor Ramon.",
    intro: ["Índio, Letícia e Mateus só falam de você.", "Automatização, controle e agilidade: é isso que a gente procura numa liderança. Passa aqui na minha sala."],
    outro: ["Parabéns! Aqui está seu crachá de liderança. O caminho para Team Leader está aberto."],
    objectives: [{ id: "t", type: "talk", count: 1, text: "Falar com o Supervisor Ramon", filter: { npc: "ramon" } }],
    rewards: { xp: 800, items: [["cracha_tl", 1]], skillPoints: 2 },
  },
  // ------------------------------------------------ Diárias (quadro de missões)
  {
    id: "diaria_sorting", title: "[Diária] Meta de sorting", giver: "board", daily: true, requires: { missions: ["primeiro_pacote"] },
    summary: "Conteinerize 10 pacotes com tela verde hoje.", intro: [], outro: [],
    objectives: [{ id: "c", type: "containerize", count: 10, text: "10 conteinerizações verdes", filter: { green: true } }],
    rewards: { xp: 90 },
  },
  {
    id: "diaria_expedicao", title: "[Diária] Rota na rua", giver: "board", daily: true, requires: { missions: ["traslado_seguro"] },
    summary: "Despache 1 rota hoje.", intro: [], outro: [],
    objectives: [{ id: "d", type: "dispatch", count: 1, text: "Despachar 1 rota" }],
    rewards: { xp: 90 },
  },
  {
    id: "diaria_qualidade", title: "[Diária] Qualidade em dia", giver: "board", daily: true, requires: { missions: ["primeiro_pacote"] },
    summary: "Tria 5 pacotes no goleiro hoje.", intro: [], outro: [],
    objectives: [{ id: "g", type: "goleiro_correct", count: 5, text: "Triar 5 pacotes no goleiro" }],
    rewards: { xp: 80 },
  },
  {
    id: "diaria_recebimento", title: "[Diária] Doca girando", giver: "board", daily: true, requires: { missions: ["recebimento_lh"] },
    summary: "Receba 1 LH e etiquete 5 pacotes.", intro: [], outro: [],
    objectives: [
      { id: "r", type: "receive_lh", count: 1, text: "Receber 1 LH" },
      { id: "l", type: "label", count: 5, text: "Etiquetar 5 pacotes" },
    ],
    rewards: { xp: 100 },
  },
  // ------------------------------------------------ Ranieri: Zona de Extravio (combate)
  {
    id: "patrulha_extravio", title: "Patrulha na Zona de Extravio", giver: "ranieri", requires: { missions: ["treinamento"] },
    startItems: [["regua", 1], ["energetico", 2]],
    summary: "Equipe a Régua de Aço e limpe a orla da Zona de Extravio: 3 Ratos do Estoque e 2 Caixas Mímicas.",
    intro: ["Fala, guerreiro! Ranieri, segurança e operações externas.", "Depois da avenida, no sudeste, fica a Zona de Extravio: pacote perdido vira bicho por lá.", "Toma essa Régua de Aço e dois energéticos. Equipe a arma (clique nela na hotbar) e ataque com F ou clique do mouse."],
    outro: ["Mandou bem! A orla está mais segura. Volta lá sempre que quiser farmar MeliCoins."],
    objectives: [
      { id: "r", type: "kill", count: 3, text: "Derrotar 3 Ratos do Estoque", filter: { enemy: "rato" } },
      { id: "c", type: "kill", count: 2, text: "Derrotar 2 Caixas Mímicas", filter: { enemy: "caixa_mimica" } },
    ],
    rewards: { xp: 160, coins: 120 },
  },
  {
    id: "pacotes_perdidos", title: "Pacotes perdidos, clientes tristes", giver: "ranieri", requires: { missions: ["patrulha_extravio"] },
    summary: "Recupere 5 pacotes extraviados na Zona de Extravio e entregue ao Ranieri.",
    intro: ["Cada pacote extraviado é um cliente esperando. Os bichos da Zona carregam vários.", "Traz 5 pra mim que eu devolvo para o fluxo."],
    outro: ["5 pacotes de volta para a rota! Isso é cliente feliz."],
    objectives: [{ id: "d", type: "deliver", count: 5, text: "Entregar 5 pacotes extraviados ao Ranieri", filter: { item: "pacote_extraviado" } }],
    rewards: { xp: 220, coins: 220, items: [["kit_socorros", 1]] },
  },
  {
    id: "caca_fraudadores", title: "Prevenção de Perdas", giver: "ranieri", requires: { level: 4, missions: ["patrulha_extravio"] },
    summary: "Derrote 4 Fraudadores nas Ruínas do Antigo XD e no Galpão Abandonado.",
    intro: ["Tem Fraudador desviando encomenda nas Ruínas do Antigo XD.", "Derruba 4 deles. Cuidado: batem forte. Compra um colete no Arsenal do Galpão antes."],
    outro: ["Prevenção de Perdas agradece! Leva esse Colete Kevlar, você mereceu."],
    objectives: [{ id: "f", type: "kill", count: 4, text: "Derrotar 4 Fraudadores", filter: { enemy: "fraudador" } }],
    rewards: { xp: 320, coins: 300, items: [["colete_kevlar", 1]] },
  },
  {
    id: "grande_atraso", title: "O GRANDE ATRASO", giver: "ranieri", special: true, requires: { level: 7, missions: ["caca_fraudadores"] },
    summary: "Entre no Galpão Abandonado e derrote O Grande Atraso, o chefe da Zona de Extravio.",
    intro: ["Agora é sério. No fundo do Galpão Abandonado vive O Grande Atraso: um relógio gigante feito de rotas que estouraram o prazo.", "Ele invoca Ratos do Estoque. Leve kits de socorro, a melhor arma que puder e, se der, chame os colegas."],
    outro: ["O GRANDE ATRASO FOI DERROTADO! Hoje nenhuma rota sai atrasada.", "Essa Lâmina da Onda Verde é sua. E o troféu fica lindo na sua casa."],
    objectives: [{ id: "b", type: "kill", count: 1, text: "Derrotar O Grande Atraso", filter: { enemy: "atraso" } }],
    rewards: { xp: 900, coins: 1000, skillPoints: 2 },
  },
  // ------------------------------------------------ Dai: casa própria
  {
    id: "casa_propria", title: "Casa própria", giver: "dai", requires: { level: 3, missions: ["treinamento"] },
    summary: "Compre um lote no Bairro Vila Logística (placa do lote) e construa sua Kitnet.",
    intro: ["Quem cresce aqui também cria raízes!", "No Bairro Vila Logística, ao sul da rua principal, tem lotes à venda. Interaja com a placa do lote para comprar.", "Depois é só construir sua Kitnet. A cama vira seu ponto de retorno e recupera energia e vida."],
    outro: ["Casa nova! Que orgulho. Toma uma caixa de correio amarela para inaugurar."],
    objectives: [
      { id: "l", type: "buy_plot", count: 1, text: "Comprar um lote" },
      { id: "c", type: "build_house", count: 1, text: "Construir a casa" },
    ],
    rewards: { xp: 400, coins: 100, items: [["decor_caixa_correio", 1]] },
  },
  {
    id: "lar_doce_lar", title: "Lar doce lar", giver: "dai", requires: { missions: ["casa_propria"] },
    summary: "Decore seu lote com 3 itens (Casa & Construção, na praça) e descanse na sua cama.",
    intro: ["Agora deixa com a sua cara! Seu Tião, na praça do Centro Logístico, vende decoração.", "Coloque 3 itens no seu lote e depois descanse na sua casa."],
    outro: ["Ficou lindo! Casa arrumada, cabeça tranquila."],
    objectives: [
      { id: "d", type: "place_decor", count: 3, text: "Colocar 3 decorações no lote" },
      { id: "r", type: "rest_home", count: 1, text: "Descansar na sua casa" },
    ],
    rewards: { xp: 180, coins: 120 },
  },
  // ------------------------------------------------ Lucas: comércio entre jogadores
  {
    id: "empreendedor", title: "Empreendedor do Mercado", giver: "lucas", requires: { missions: ["treinamento"] },
    summary: "Compre algo numa loja da praça e publique um anúncio no Balcão de Anúncios.",
    intro: ["Aqui todo mundo é um pouco Mercado Livre!", "Na praça do Centro Logístico tem lojas e o Balcão de Anúncios, onde qualquer um vende para qualquer um.", "Compra alguma coisa numa loja e publica um anúncio seu no Balcão."],
    outro: ["Seu primeiro anúncio está no ar! Quando alguém comprar, o dinheiro cai direto na sua conta."],
    objectives: [
      { id: "b", type: "shop_buy", count: 1, text: "Comprar um item numa loja da praça" },
      { id: "l", type: "market_list", count: 1, text: "Publicar um anúncio no Balcão" },
    ],
    rewards: { xp: 120, coins: 80 },
  },
  {
    id: "primeira_venda", title: "Primeira venda", giver: "lucas", requires: { missions: ["empreendedor"] },
    summary: "Venda um item pelo Balcão de Anúncios (para outro jogador ou cliente) e compre um anúncio de alguém.",
    intro: ["Agora o ciclo completo: vende e compra. É assim que o marketplace gira!"],
    outro: ["Vendedor e comprador, os dois lados do Mercado Livre. Show!"],
    objectives: [
      { id: "s", type: "market_sold", count: 1, text: "Ter um anúncio vendido" },
      { id: "b", type: "market_buy", count: 1, text: "Comprar um anúncio no Balcão" },
    ],
    rewards: { xp: 200, coins: 150 },
  },
  // ------------------------------------------------ Jaderson: Mercado Pago
  {
    id: "cofrinho", title: "Dinheiro rendendo", giver: "jaderson", requires: { missions: ["treinamento"] },
    summary: "Na Agência Mercado Pago, guarde MeliCoins no Cofrinho (rende todo dia).",
    intro: ["Meta batida dá MeliCoins. Mas dinheiro parado não rende!", "Vai na Agência Mercado Pago, no Centro Logístico, e guarda uma grana no Cofrinho: rende 2% por dia de jogo."],
    outro: ["Cofrinho rendendo! Dá para transferir MeliCoins para colegas pelo terminal também."],
    objectives: [{ id: "c", type: "mp_deposit", count: 1, text: "Depositar no Cofrinho Mercado Pago" }],
    rewards: { xp: 90, coins: 60 },
  },
  {
    id: "diaria_patrulha", title: "[Diária] Patrulha", giver: "board", daily: true, requires: { missions: ["patrulha_extravio"] },
    summary: "Derrote 6 inimigos na Zona de Extravio hoje.", intro: [], outro: [],
    objectives: [{ id: "k", type: "kill", count: 6, text: "Derrotar 6 inimigos" }],
    rewards: { xp: 130, coins: 110 },
  },
];

export const MISSION_BY_ID: Record<string, MissionDef> = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));
