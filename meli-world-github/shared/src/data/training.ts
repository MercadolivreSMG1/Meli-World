/** Perguntas do treinamento — baseadas nas WIs do Centro de Serviço (SVC). */
export interface QuizQuestion {
  q: string;
  correct: string;
  wrong: [string, string, string];
  why: string;
}

export const QUIZ: QuizQuestion[] = [
  { q: "O que fazer antes de colocar o pacote no baker?", correct: "Escanear pacote e baker e ver a tela verde", wrong: ["Colocar e escanear depois", "Escanear só o baker", "Pedir autorização ao TL"], why: "Poka Yoke: só coloque fisicamente depois da tela verde." },
  { q: "Nível mínimo de bateria do coletor no início do recebimento:", correct: "85%", wrong: ["50%", "70%", "100%"], why: "A WI pede bateria ≥ 85%." },
  { q: "Pacote com etiqueta branca e data de hoje:", correct: "Reinduzir no mesmo ciclo", wrong: ["Guardar para D+1", "Descartar", "Entregar ao motorista"], why: "Data de hoje ou passada: reinduz. Data futura: PS/inventário para D+1." },
  { q: "Onde NÃO colar a etiqueta de rota?", correct: "Sobre a shipping label ou o logo", wrong: ["Na lateral da caixa", "Na parte de trás", "Por cima de uma etiqueta antiga"], why: "A shipping label e o logo precisam ficar visíveis." },
  { q: "Tela laranja na conteinerização significa:", correct: "Contêiner errado: releia o pacote", wrong: ["Sucesso", "Pacote danificado", "Rota fechada"], why: "Laranja = contêiner errado. Vermelha = erro de shipment." },
  { q: "A contagem do motorista falhou duas vezes. E agora?", correct: "A rota vai para a aduana", wrong: ["Ele sai mesmo assim", "O baker é descartado", "O PS assina e libera"], why: "Aduana automática, sem possibilidade de pular." },
  { q: "Cor do QR de Flash Parking da Onda 2:", correct: "Amarela", wrong: ["Branca", "Verde", "Vermelha"], why: "Onda 1 branca, Onda 2 amarela, Onda 3 verde." },
  { q: "Tempo máximo de permanência de veículo no MLB:", correct: "30 minutos", wrong: ["20 minutos", "45 minutos", "60 minutos"], why: "MLB: 30 min. MLA/MLC/MCO: 20 min." },
  { q: "Quantos carrinhos um rebocador (tugger) pode puxar?", correct: "Até 10", wrong: ["Até 5", "Até 15", "Até 20"], why: "Até 10 carrinhos a 4,5 km/h." },
  { q: "Peso máximo de um pacote sortable no Sorter:", correct: "15 kg", wrong: ["25 kg", "50 kg", "5 kg"], why: "Sortable: 0,04 a 15 kg e 10 a 1000 mm." },
  { q: "O baker não fechou sozinho. Primeiro passo:", correct: "Auditoria e busca nos bakers vizinhos", wrong: ["Fechamento manual", "Liberar para despacho", "Reetiquetar tudo"], why: "Fechamento manual só como último recurso." },
  { q: "Velocidade máxima de veículos junto à operação:", correct: "5 km/h", wrong: ["10 km/h", "15 km/h", "20 km/h"], why: "Pátio: 10 km/h. Junto à operação: 5 km/h." },
  { q: "Pacote solto (sem HU) escaneado no recebimento vai para:", correct: "Mesa de Ajuda", wrong: ["Direto na esteira", "Descarte", "Outro SVC"], why: "Pacote solto vai para a Mesa de Ajuda." },
  { q: "One Bip é proibido para:", correct: "Pacotes avariados e GM", wrong: ["Linha branca", "Colchões", "Pacotes oversize"], why: "One Bip só para quem não cabe no baker; nunca avariados ou GM." },
  { q: "Como empurrar um baker no traslado?", correct: "Pela lateral, sem correr nem frear com os pés", wrong: ["Correndo para ganhar tempo", "Puxando de costas", "Dois bakers por vez com o pé"], why: "Segurança no traslado." },
  { q: "Na pesca, se a esteira parar, você deve:", correct: "Recolher os pacotes da sua ilha ao alcance", wrong: ["Ir para o intervalo", "Pescar de outras ilhas", "Subir na esteira"], why: "Recolha primeiro os pacotes da sua ilha ao alcance das mãos." },
  { q: "Limite de peso por pessoa para carga no chão:", correct: "15 kg", wrong: ["25 kg", "30 kg", "10 kg"], why: "15 kg no chão; 20 kg com a carga a 75 cm do piso." },
  { q: "No carregamento, os volumosos vão:", correct: "No piso do veículo", wrong: ["Em cima de tudo", "No banco do passageiro", "Fora do veículo"], why: "Volumosos no piso; destinos mais distantes no fundo." },
];
