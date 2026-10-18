/**
 * Mini-jogos: o servidor gera os dados + gabarito; o cliente só envia as escolhas.
 * A pontuação é sempre calculada aqui (servidor autoritativo).
 */
import {
  classifySize, correctGoleiroBin, describeIssue, GOLEIRO_BINS, ISLANDS, PackageData, QUIZ, Rng,
  ROUTE_BY_ID, ROUTES, shuffle, pick, randInt,
} from "../../../shared/src";

export interface Built {
  title: string;
  data: unknown;
  answer: unknown;
}

export interface Score {
  correct: number;
  total: number;
  pass: boolean;
  detail?: unknown;
}

// ---------------------------------------------------------------- Recebimento LH
export const RECEIVING_STEPS = [
  { id: "motor", label: "Motorista desliga o caminhão e entrega a chave" },
  { id: "calcos", label: "Colocar calços nas rodas" },
  { id: "romaneio", label: "Conferir quantidade de HUs no romaneio" },
  { id: "lacre", label: "Auditar o lacre no YMS" },
  { id: "qr_doca", label: "Escanear o QR da doca" },
  { id: "qr_transp", label: "Escanear o QR do transportador" },
  { id: "hus", label: "Escanear cada HU" },
  { id: "sobra", label: "Verificar se sobrou pacote solto no caminhão" },
];

export function buildReceiving(rng: Rng, truck: { seal: string; sealOk: boolean; hus: number; driver: string }): Built {
  const steps = shuffle(rng, RECEIVING_STEPS.map((s) => ({ ...s })));
  const romaneio = truck.sealOk ? truck.hus : truck.hus + 1;
  return {
    title: "Recebimento de Line Haul",
    data: {
      steps,
      driver: truck.driver,
      seal: truck.seal,
      sealYms: truck.sealOk ? truck.seal : truck.seal.slice(0, -2) + String(randInt(rng, 10, 99)),
      hus: truck.hus,
      romaneio,
      decisions: [
        { id: "ok", label: "Tudo confere: finalizar recebimento" },
        { id: "divergencia", label: "Finalizar com divergências e avisar o TL" },
      ],
    },
    answer: { order: RECEIVING_STEPS.map((s) => s.id), decision: truck.sealOk ? "ok" : "divergencia" },
  };
}

export function scoreReceiving(answer: any, result: any): Score {
  const order: string[] = Array.isArray(result?.order) ? result.order : [];
  let correct = 0;
  answer.order.forEach((id: string, i: number) => {
    if (order[i] === id) correct++;
  });
  const decisionOk = result?.decision === answer.decision;
  const total = answer.order.length + 1;
  const c = correct + (decisionOk ? 1 : 0);
  return { correct: c, total, pass: c >= total - 2 && decisionOk, detail: { decisionOk } };
}

// ---------------------------------------------------------------- Etiquetagem
export function buildLabeling(rng: Rng, pkgs: PackageData[]): Built {
  const answer: Record<string, string> = {};
  const items = pkgs.map((p) => {
    const hasOld = rng() < 0.3;
    const spots = shuffle(rng, [
      { id: "s1", kind: "ship", label: "Sobre a shipping label" },
      { id: "s2", kind: "logo", label: "Sobre o logo do Mercado Livre" },
      { id: "s3", kind: "free", label: "Área livre da face superior" },
      ...(hasOld ? [{ id: "s4", kind: "old", label: "Por cima da etiqueta antiga" }] : []),
    ]);
    const damaged = p.issue === "danificado" || p.issue === "liquido";
    answer[p.id] = damaged ? "separar" : hasOld ? "s4" : "s3";
    return {
      id: p.id,
      route: p.route,
      bairro: p.bairro,
      cep: p.cep,
      damaged,
      issue: p.issue,
      desc: damaged ? describeIssue(p) : "",
      hasOld,
      // o cliente desenha a caixa com shipping label, logo e etiqueta antiga nas posições dos spots;
      // o jogador precisa reconhecer visualmente onde colar (os textos só aparecem como dica no hover)
      spots: spots.map(({ id, kind }) => ({ id, kind })),
    };
  });
  return { title: "Etiquetagem e indução", data: { items }, answer };
}

export function scoreMap(answer: Record<string, string>, result: any): Score {
  const choices: Record<string, string> = result?.choices ?? {};
  let correct = 0;
  const wrong: string[] = [];
  for (const [id, a] of Object.entries(answer)) {
    if (choices[id] === a) correct++;
    else wrong.push(id);
  }
  const total = Object.keys(answer).length;
  return { correct, total, pass: correct === total, detail: { wrong } };
}

// ---------------------------------------------------------------- Pesca
export function buildFishing(rng: Rng, island: string, onBelt: PackageData[], slow: number, highlight: boolean): Built {
  const items = onBelt.slice(0, 14).map((p) => ({
    id: p.id,
    island: p.issue || p.labelType !== "normal" ? "?" : p.island,
    route: p.route,
    weight: p.weightKg,
  }));
  // completa com "fantasmas" de outras ilhas para manter o ritmo
  while (items.length < 12) {
    const r = pick(rng, ROUTES);
    items.push({ id: `ghost${items.length}${Math.floor(rng() * 1e6)}`, island: r.island, route: r.id, weight: 1 });
  }
  return { title: `Pesca · Ilha ${island}`, data: { island, items: shuffle(rng, items), speed: Math.max(0.6, 1 - slow), highlight }, answer: { island } };
}

// ---------------------------------------------------------------- Conteinerização (escolha de nível)
export function buildContainerize(p: PackageData, bakerRoute: string): Built {
  return {
    title: "Conteinerização",
    data: { pkg: { id: p.id, route: p.route, bairro: p.bairro, level: p.level, size: p.size }, baker: bakerRoute, levels: ["superior", "meio", "inferior"] },
    answer: { level: p.level },
  };
}

// ---------------------------------------------------------------- Goleiro
export function buildGoleiro(pile: PackageData[]): Built {
  const items = pile.slice(0, 6);
  const answer: Record<string, string> = {};
  for (const p of items) answer[p.id] = correctGoleiroBin(p);
  return {
    title: "Goleiro · triagem",
    data: {
      bins: GOLEIRO_BINS,
      items: items.map((p) => ({ id: p.id, route: p.route, desc: describeIssue(p), labelType: p.labelType, labelDate: p.labelDate, issue: p.issue })),
    },
    answer,
  };
}

// ---------------------------------------------------------------- PS / incidências
export const PS_INCIDENTS: { id: string; desc: string; correct: string }[] = [
  { id: "excesso_outra_aberta", desc: "Pacote de outra rota encontrado no baker. A rota certa AINDA NÃO saiu.", correct: "carregar_rota_certa" },
  { id: "excesso_outra_saiu", desc: "Pacote de outra rota encontrado. A rota certa JÁ SAIU.", correct: "reatribuir_proxima" },
  { id: "excesso_mesma", desc: "Pacote a mais da mesma rota, fora da lista.", correct: "incluir_rota" },
  { id: "duplicado", desc: "Pacote duplicado na rota.", correct: "segregar_duplicado" },
  { id: "dano_com", desc: "Caixa danificada, mas o produto está íntegro (dá para reembalar).", correct: "reparar_registrar" },
  { id: "dano_sem", desc: "Produto danificado sem solução.", correct: "status_danificado" },
  { id: "nao_cabe", desc: "Volume não cabe no veículo da rota.", correct: "reatribuir_baker" },
  { id: "faltante", desc: "Pacote faltante na contagem do baker.", correct: "buscar_vizinhos" },
];

export const PS_OPTIONS = [
  { id: "carregar_rota_certa", label: "Carregar na rota certa" },
  { id: "reatribuir_proxima", label: "Reatribuir à rota próxima" },
  { id: "incluir_rota", label: "PS inclui o pacote na rota" },
  { id: "segregar_duplicado", label: "Segregar duplicado no PS" },
  { id: "reparar_registrar", label: "Reparar, registrar e voltar à rota" },
  { id: "status_danificado", label: "Status 'Danificado' → abrir, reescanear e fechar o baker" },
  { id: "reatribuir_baker", label: "Separação → reatribuir → escanear novo baker" },
  { id: "buscar_vizinhos", label: "Procurar nos bakers vizinhos; se não achar, registrar faltante" },
];

export function buildPs(rng: Rng, queue: PackageData[]): Built {
  const cases = [];
  const answer: Record<string, string> = {};
  const n = 4;
  for (let i = 0; i < n; i++) {
    const p = queue[i];
    let inc;
    if (p && (p.issue === "danificado" || p.issue === "liquido")) inc = PS_INCIDENTS[rng() < 0.6 ? 4 : 5];
    else inc = pick(rng, PS_INCIDENTS);
    const id = p ? p.id : `case${i}${Math.floor(rng() * 1e6)}`;
    answer[id] = inc.correct;
    cases.push({ id, desc: inc.desc, route: p ? p.route : pick(rng, ROUTES).id });
  }
  return { title: "Problem Solver · incidências", data: { cases, options: PS_OPTIONS }, answer };
}

// ---------------------------------------------------------------- Auditoria
export function buildAudit(rng: Rng, bakerRoute: string, packages: PackageData[], misplaced: PackageData[]): Built {
  const sample = shuffle(rng, [...packages.slice(-8), ...misplaced]).map((p) => ({ id: p.id, route: p.route, bairro: p.bairro, cep: p.cep }));
  return {
    title: `Auditoria do baker ${bakerRoute}`,
    data: { baker: bakerRoute, bairro: ROUTE_BY_ID[bakerRoute]?.bairro, items: sample },
    answer: { wrong: misplaced.map((p) => p.id) },
  };
}

export function scoreAudit(answer: { wrong: string[] }, result: any): Score & { fixed: string[]; falsePos: number } {
  const flagged: string[] = Array.isArray(result?.flagged) ? result.flagged : [];
  const fixed = flagged.filter((id) => answer.wrong.includes(id));
  const falsePos = flagged.length - fixed.length;
  return { correct: fixed.length, total: answer.wrong.length, pass: fixed.length === answer.wrong.length && falsePos === 0, fixed, falsePos };
}

// ---------------------------------------------------------------- Volumosos
export function buildVolumosos(items: PackageData[]): Built {
  const answer: Record<string, string> = {};
  for (const p of items) answer[p.id] = classifySize(p);
  return {
    title: "Área de volumosos",
    data: {
      items: items.map((p) => ({ id: p.id, dims: p.dims, weight: p.weightKg, route: p.route })),
      options: [
        { id: "sortable", label: "Sortable (vai para a esteira)" },
        { id: "volumoso", label: "Volumoso (One Bip no baker)" },
        { id: "oversize", label: "Oversize (área própria)" },
      ],
    },
    answer,
  };
}

// ---------------------------------------------------------------- Carregamento
export function buildLoading(rng: Rng, route: string, count: number, bulky: number): Built {
  const stops = shuffle(rng, Array.from({ length: Math.min(6, Math.max(4, count)) }, (_, i) => i + 1));
  const items = stops.map((s, i) => ({
    id: `L${i}`,
    stop: s,
    bulky: i < Math.min(2, bulky + 1) && rng() < 0.8,
  }));
  // regra: volumosos primeiro (piso), depois paradas mais distantes (maior nº) para o fundo
  const order = [...items].sort((a, b) => (a.bulky === b.bulky ? b.stop - a.stop : a.bulky ? -1 : 1)).map((i) => i.id);
  return {
    title: `Carregamento · rota ${route}`,
    data: { route, items: shuffle(rng, items) },
    answer: { order },
  };
}

export function scoreOrder(answer: { order: string[] }, result: any, tolerance = 0): Score {
  const order: string[] = Array.isArray(result?.order) ? result.order : [];
  let correct = 0;
  answer.order.forEach((id, i) => {
    if (order[i] === id) correct++;
  });
  return { correct, total: answer.order.length, pass: correct >= answer.order.length - tolerance };
}

// ---------------------------------------------------------------- Aduana
export function buildAduana(rng: Rng, route: string): Built {
  const n = randInt(rng, 9, 17);
  const boxes = Array.from({ length: n }, () => ({ x: rng(), y: rng(), s: 0.6 + rng() * 0.6, c: randInt(rng, 0, 3) }));
  return { title: `Aduana · recontagem da rota ${route}`, data: { route, boxes }, answer: { count: n } };
}

// ---------------------------------------------------------------- Sorter / Otimizar layout
export function buildSorter(rng: Rng): Built {
  const routes = shuffle(rng, ROUTES.slice()).slice(0, 8).map((r) => ({ id: r.id, volume: randInt(rng, 20, 90) }));
  return {
    title: "Painel do Sorter · Otimizar layout",
    data: { routes, islands: ISLANDS, tip: "Equilibre o volume entre as ilhas (espinha de peixe): diferença máxima de 40 pacotes entre a ilha mais cheia e a mais vazia." },
    answer: { routes },
  };
}

export function scoreSorter(answer: { routes: { id: string; volume: number }[] }, result: any): Score {
  const assign: Record<string, string> = result?.assign ?? {};
  const load: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
  let assigned = 0;
  for (const r of answer.routes) {
    const isl = assign[r.id];
    if (isl && isl in load) {
      load[isl] += r.volume;
      assigned++;
    }
  }
  const vals = Object.values(load);
  const diff = Math.max(...vals) - Math.min(...vals);
  return { correct: assigned, total: answer.routes.length, pass: assigned === answer.routes.length && diff <= 40, detail: { diff, load } };
}

// ---------------------------------------------------------------- Treinamento
export function buildTraining(rng: Rng): Built {
  const qs = shuffle(rng, QUIZ.slice()).slice(0, 6);
  const answers: number[] = [];
  const questions = qs.map((q) => {
    const opts = shuffle(rng, [q.correct, ...q.wrong]);
    answers.push(opts.indexOf(q.correct));
    return { q: q.q, options: opts, why: q.why };
  });
  return { title: "Treinamento de integração", data: { questions }, answer: { answers } };
}

export function scoreTraining(answer: { answers: number[] }, result: any): Score {
  const got: number[] = Array.isArray(result?.answers) ? result.answers : [];
  let correct = 0;
  answer.answers.forEach((a, i) => {
    if (got[i] === a) correct++;
  });
  return { correct, total: answer.answers.length, pass: correct >= 4 };
}

// ---------------------------------------------------------------- Setup de baker
export function buildSetup(rng: Rng, routes: string[]): Built {
  return {
    title: "Preparação de carrinhos",
    data: {
      routes,
      qrSpots: shuffle(rng, [
        { id: "topo_meio", label: "Meio da prateleira de cima" },
        { id: "topo_canto", label: "Canto da prateleira de cima" },
        { id: "lateral", label: "Lateral do baker" },
        { id: "base", label: "Base, perto das rodas" },
      ]),
      steps: shuffle(rng, [
        { id: "abrir", label: "Abrir 'Preparação de carrinhos' no coletor" },
        { id: "baker", label: "Escanear o QR do baker" },
        { id: "sacas", label: "Escanear cada saca" },
        { id: "fim", label: "Tocar em 'Já atribuí todas'" },
      ]),
    },
    answer: { qr: "topo_meio", order: ["abrir", "baker", "sacas", "fim"] },
  };
}

export function scoreSetup(answer: any, result: any): Score {
  const o = scoreOrder({ order: answer.order }, result);
  const qrOk = result?.qr === answer.qr;
  return { correct: o.correct + (qrOk ? 1 : 0), total: o.total + 1, pass: o.pass && qrOk };
}
