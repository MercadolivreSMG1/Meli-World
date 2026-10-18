# MELI WORLD — LOGISTICS LIFE

RPG 2D multiplayer de mundo aberto, em pixel art, que se passa num Service Center do Mercado Livre (SMG1).
Você começa como colaborador recém-contratado, aprende o fluxo real de um pacote no SVC e cresce na carreira
até Team Leader. A arte é inspirada em jogos de fazenda como Stardew Valley.

![Mapa do SMG1](docs/img/mapa.png)

## Como rodar (Windows, macOS ou Linux)

Requisito: **Node.js 20 ou 22** (https://nodejs.org).

```bash
cd meli-world
npm install
npm run dev
```

Depois abra **http://localhost:5173** no navegador.
O `npm run dev` sobe o servidor multiplayer (porta 2567) e o cliente Vite (porta 5173) juntos.

> No Windows, se preferir, dê dois cliques em `iniciar.bat`.

### Jogando com colegas (multiplayer real)

1. Rode `npm run dev` na sua máquina.
2. Descubra seu IP na rede (`ipconfig` no Windows), por exemplo `10.0.0.25`.
3. Os colegas abrem `http://10.0.0.25:5173`. Todos entram no **mesmo mundo**: mesma esteira, mesmos bakers e mesmas vans.
4. Se não conectar, libere as portas 5173 e 2567 no firewall.

### Produção (uma porta só)

```bash
npm run build      # compila o cliente em client/dist
npm start          # o servidor entrega o jogo e o WebSocket em http://SEU_HOST:2567
```

Variáveis de ambiente: `PORT` (padrão 2567), `DATA_DIR` (onde fica o banco), `DB=json` (força o fallback em JSON)
e `VITE_SERVER_URL` (no build do cliente, se o servidor estiver em outro endereço).

### Modo solo (sem servidor)

Se não houver servidor multiplayer acessível, o jogo entra sozinho no **modo solo**. O motor do jogo roda no próprio navegador e o progresso fica salvo nele. Com isso, dá para publicar só no **GitHub Pages**, de graça.

### Hospedar na internet

Veja o [DEPLOY.md](DEPLOY.md): Render/Railway/Fly.io com Docker, ou cliente no GitHub Pages com o servidor separado.

### Testes

```bash
npm run test:sim -w server
```

Esse teste roda o jogo inteiro sem rede. Dois jogadores fazem o onboarding e depois o fluxo completo do pacote:
etiquetagem, pesca, conteinerização, traslado, carregamento, contagem/aduana, despacho e recebimento de LH.
Por fim, o teste simula 10 horas de jogo com o mundo rodando sozinho.

## Controles

| Tecla | Ação |
|---|---|
| WASD / setas | Andar |
| Shift | Correr (gasta energia; proibido empurrando baker) |
| E / Espaço | Interagir, falar ou avançar diálogo |
| F / clique | Atacar (com a arma equipada) |
| Q | Soltar baker ou devolver pacote |
| C / X | Comemorar / sentar |
| 1–0 | Usar ou equipar itens da hotbar |
| I · J · K · M · H | Inventário · Missões · Perfil e habilidades · Mapa · Ajuda |
| Enter | Chat |

## O que já está no jogo

### Novidades da versão 0.4 — salas multiplayer

- **Salas públicas de até 30 pessoas** (a próxima abre sozinha quando uma lota) e **salas privadas com código** para jogar com os amigos.
- O personagem, a casa, os MeliCoins e o Balcão de Anúncios são **os mesmos em todas as salas**.
- Banco **PostgreSQL** opcional (`DATABASE_URL`) para hospedar de graça no Render + Neon sem perder progresso.
- Passo a passo completo em [MULTIPLAYER.md](MULTIPLAYER.md).

### Novidades da versão 0.3

- **Entrar dentro da casa:** chegue na porta da sua casa e aperte **E**. Lá dentro, o botão **🏠 Minha casa** abre o painel com as abas Casa, Quintal, Interior e Visitas. Saia pela porta (E no capacho).
- **Mobiliar o interior:** 30 móveis novos (cama, cama de casal, sofá, TV, estante, tapetes, geladeira, fogão, pia, aquário, piano, setup gamer, fliperama, banheira, Gatinho do Galpão, Caramelo, Baker de colecionador…) na nova loja **Móveis da Vila (Rosa)**, na praça. Tapetes ficam por baixo dos outros móveis. Limite por casa: Kitnet 18, Casa 32, Sobrado 50.
- **Visitas com permissão:** na aba Visitas, escolha 🔒 Privada, 👥 Só convidados (lista de nomes) ou 🌐 Aberta. Se você fechar a casa, quem estiver lá sem permissão vai para fora. As casas do Índio, Letícia, Mateus, Ramon e Dai são abertas para visita.
- **Mais itens (97 no total):** 5 armas novas (Grampeador Sônico, Tesoura Industrial, Lança-Coletor, Espada da Onda Branca, Machado de Fita Dupla), 3 armaduras (Colete Turbo, Uniforme Platinum, Capa Mercado Pago), 6 comidas (açaí, pastel, café com leite, brigadeiro, feijoada, suco detox), 8 decorações de quintal (balanço, árvore de Natal, varal, bicicleta, moto de entrega, fogueira, caixa d'água, placa) e loot novo (Etiqueta Dourada, Engrenagem do Sorter).
- **Caixa Lacrada Misteriosa:** compre na Neide ou ganhe dos inimigos; use pelo inventário e receba um item aleatório (alguns raríssimos).
- **Missões novas:** Café na casa do Índio, Decorador de Interiores (Dai) e Caixa Lacrada (Lucas).

### Novidades da versão 0.2
- **Guia de missões:** trilha dourada no chão até o próximo objetivo, seta na borda da tela com a distância, marcador sobre o alvo e minimapa. Clique numa missão do painel para rastreá-la.
- **Mundo vasto**, ligado pela Avenida Mercado Pago:
  - **Centro Logístico:** praça com 4 lojas, Balcão de Anúncios, Agência Mercado Pago, Imobiliária e o prédio do FBM.
  - **Bairro Vila Logística:** 24 lotes, com casas dos líderes na vizinhança.
  - **Zona de Extravio:** floresta, lago, ruínas e o Galpão Abandonado.
- **MeliCoins (M$):** ganhos no trabalho, nas missões e nos combates.
  - **Lojas:** armas, comida e decoração; a Neide compra o loot.
  - **Balcão de Anúncios:** comércio entre jogadores. Clientes NPC também compram anúncios com preço justo, e quem vende offline recebe o dinheiro ao voltar.
  - **Mercado Pago:** Cofrinho que rende 2% por dia e transferência entre colegas.
- **Casa própria:**
  - Compre um lote e construa uma Kitnet, depois evolua para Casa e Sobrado.
  - Decore o quintal com 12 tipos de itens.
  - Descanse em casa para recuperar energia e vida; a casa vira o seu ponto de retorno.
- **Combate:**
  - 6 armas, da Régua de Aço à Lâmina da Onda Verde, e 3 armaduras.
  - Inimigos temáticos: Rato do Estoque, Caixa Mímica, Bug do Sistema e Fraudador.
  - Chefe **O Grande Atraso**, que invoca ratos.
  - Barra de vida; se for nocauteado, perde 10% das M$ e volta para casa.
- **Liderança real do SMG1:**
  - Team Leaders: Índio, Letícia e Mateus Ferrari.
  - TL Sêniors: Dai, Jaderson e Ranieri.
  - Supervisores: Ramon e Lucas.
  - Cada um tem rotina, falas e missões próprias.

### Base do jogo

- **Multiplayer autoritativo (Colyseus).** O servidor valida movimento e colisão e calcula a pontuação de todos os mini-jogos. Os jogadores se veem em tempo real, com chat e balões de fala.
- **Mundo aberto** (232×176 tiles, 4× maior), com o SVC SMG1 no centro da história:
  - Galpão principal: recebimento com 3 docas, volumosos, etiquetagem com flowrack, esteira animada com 4 ilhas e 16 bakers, Sorter cross belt, goleiro com gaiolas de triagem, PS, auditoria, custódia, EPI e carregadores, stage zones e 7 docas de expedição.
  - Prédio administrativo: salas dos TLs, dos TL Sêniors e dos Supervisores, treinamento, quadro de missões e painel de indicadores.
  - Refeitório, área de descanso, jardim, portaria com relógio de ponto, estacionamento, pátio de LH, Flash Parking com vagas por onda e rua com trânsito.
- **Criador de personagem em 8 camadas** (corpo, rosto, cabelo, roupa, calça, calçado, acessórios, equipamentos). São 29 itens personalizáveis (18 de forma, com 92 variações, mais 10 de cor e o crachá), com prévia animada nas 4 direções. Cada personagem tem 10 animações: parado, andar, correr, carregar, empurrar, coletor, interagir, sentar, comemorar e trabalhar. Os EPIs aparecem por cima do visual.
- **NPCs com personalidade, rotina por horário (pathfinding A\*), falas e missões:** Índio, Letícia, Mateus Ferrari, TL Sênior, Supervisora, PS, Portaria e 8 REPs que trabalham pelo galpão.
- **Operação viva.** Caminhões LH chegam, a esteira anda, REPs NPC pescam com pequena taxa de erro, bakers fecham, vans são chamadas por onda, motoristas contam pacotes (e às vezes erram, o que leva à aduana) e as rotas saem pelo portão. Os KPIs são de verdade: % de telas verdes, backlog, goleiro, rotas despachadas e rotas atrasadas acima de 30 min.
- **14 mini-jogos baseados nas WIs do SVC:**
  - recebimento LH;
  - etiquetagem (onde colar a etiqueta);
  - pesca;
  - conteinerização com Poka Yoke (tela verde, laranja ou vermelha);
  - goleiro (8 destinos);
  - incidências de PS;
  - auditoria de baker;
  - volumosos;
  - carregamento do veículo;
  - aduana;
  - otimização de layout do Sorter;
  - quiz de treinamento;
  - setup de baker (QR e sacas);
  - painel de KPIs.
- **Progressão:** XP, 30 níveis e plano de carreira (de recém-contratado até TL Sênior), 6 habilidades, 3 habilidades especiais e 37 missões. Isso inclui o onboarding, as missões especiais **AUTOMATIZAÇÃO PRO MAX**, **OPERAÇÃO SOB CONTROLE** e **EXPEDIÇÃO RELÂMPAGO**, e missões diárias.
- **Sistemas de sobrevivência leves:** energia (refeitório, café, sentar), bateria do coletor (carregador) e EPI obrigatório no galpão.
- **Persistência.** Ficam salvos personagem, posição, inventário, XP, habilidades, missões, estatísticas e histórico. O banco padrão é SQLite, com fallback automático para JSON.
- **Ciclo dia/noite e turnos A, B e C**, com o Tier 1 no início de cada turno.

## Banco de dados: sugestões

| Etapa | Recomendação | Por quê |
|---|---|---|
| Agora (piloto) | **SQLite** via `better-sqlite3` (já implementado) | Não precisa instalar nada: é só um arquivo, e aguenta dezenas de jogadores |
| Produção | **PostgreSQL** com Prisma ou Drizzle | Concorrência, backups, consultas de ranking e relatórios |
| Escala horizontal | **Redis** com `RedisPresence` e `RedisDriver` do Colyseus | Várias instâncias e salas por SVC |
| Analytics | Exportar o `history` para BigQuery | Painéis de aprendizado e engajamento |

Toda a persistência passa pela interface `Repo` (`server/src/db/repo.ts`). Para trocar de banco, basta implementá-la.

## Como expandir

| Quero… | Onde mexer |
|---|---|
| Nova missão | `shared/src/data/missions.ts`: os objetivos reagem a eventos como `containerize`, `dispatch` etc. |
| Novo NPC ou mudar rotina e falas | `shared/src/data/npcs.ts` |
| Novas perguntas de treinamento | `shared/src/data/training.ts` |
| Novas rotas/ilhas | `shared/src/data/routes.ts` |
| Mudar o mapa | `shared/src/map/world.ts` (gerado por código, igual no cliente e no servidor) |
| Novo objeto do cenário | `shared/src/map/props.ts` (definição) e `client/src/art/props.ts` (arte) |
| Novo mini-jogo | `server/src/game/minigames.ts` (dados e gabarito) e `client/src/ui/minigames.ts` (interface) |
| Trocar a arte procedural por spritesheets desenhadas | `client/src/art/*`: mantenha o layout do sheet (4 linhas × 28 quadros de 16×32) |

Detalhes da arquitetura estão em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Conteúdo e fontes

Os processos, termos e regras vêm das One Pages e WIs do **Centro de Serviço (SVC)** da Wiki interna:

- **Sorting:** classificação, ordenação automática (cross belt) e volumosos.
- **Recebimento e despacho:** recepção, preparação e despacho.
- **Pós-entrega e inventário:** RTS e inventário.

Exemplos do que entrou no jogo: tela verde antes de colocar o pacote, bateria do coletor ≥ 85%, ondas do Flash Parking (branca, amarela e verde), permanência de 30 min, aduana após duas contagens erradas e limites de peso.
Os NPCs marcados com (*) têm nomes fictícios. Basta trocá-los em `npcs.ts`.
