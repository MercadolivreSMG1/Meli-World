# Arquitetura — MELI WORLD

```
meli-world/
├── shared/   TypeScript puro, usado pelo cliente e pelo servidor
│   └── src/
│       ├── map/        geração determinística do mapa, tiles, props, zonas
│       ├── logic/      física/colisão, A*, pacotes, missões, progressão, relógio, tráfego
│       ├── data/       conteúdo: rotas, NPCs, missões, itens, quiz
│       ├── appearance.ts  opções e validação do criador de personagem
│       └── types.ts       contratos de rede e de domínio
├── server/   Node + Colyseus (autoritativo)
│   └── src/
│       ├── game/       World (lógica pura), Ops (operação do SVC), Vehicles, Npcs, minigames
│       ├── rooms/      WorldRoom (rede) + schema.ts (estado sincronizado)
│       ├── db/         Repo: SQLite (better-sqlite3) ou JSON
│       └── tests/      simulate.ts — o jogo inteiro rodando sem rede
└── client/   Vite + Phaser 3 + HTML/CSS
    └── src/
        ├── art/        pixel art procedural: personagens em camadas, tiles, props, veículos
        ├── game/       WorldScene (render, predição, interação), Textures (cache)
        ├── ui/         criador, HUD, diálogos, painéis, 14 mini-jogos
        └── net/        conexão Colyseus
```

## Por que esta stack

| Escolha | Motivo |
|---|---|
| **Phaser 3 + Vite + TypeScript** | Engine 2D madura, com câmera, animação e tilemaps. O Vite dá hot reload e o TypeScript é compartilhado com o servidor. |
| **Colyseus** (em vez de Socket.IO puro) | Já oferece salas, estado sincronizado por *delta patches* (Schema), reconexão e escala com Redis. Com Socket.IO seria preciso reescrever tudo isso à mão. |
| **Pacote `shared`** | Mapa, colisão e regras são idênticos no cliente (predição) e no servidor (validação). Assim o mapa não precisa trafegar pela rede. |
| **World separado da Room** | Toda a lógica pode ser testada sem rede (`npm run test:sim`). A Room só faz ponte e espelhamento. |
| **Arte procedural em camadas** | Milhares de combinações sem desenhar cada personagem. O layout do spritesheet é fixo, então dá para trocar por arte desenhada à mão depois. |
| **UI em HTML/CSS** | Formulários, listas e mini-jogos ficam mais simples e acessíveis no DOM do que dentro do canvas. |

## Modelo autoritativo

- **Movimento:** o cliente prevê o próprio movimento usando a mesma função de colisão (`moveWithCollision`) e envia a posição a 20 Hz. O servidor confere a velocidade máxima possível (andar, correr, empurrar, cansado) e a colisão. Se a posição for inválida, devolve `correct` com a posição certa.
- **Interações:** o cliente só pede (`interact {kind, id}`). O servidor confere distância, EPI, ponto batido e bateria. Depois abre o mini-jogo com os dados e guarda o gabarito só no servidor.
- **Mini-jogos:** o cliente envia apenas as escolhas, e o servidor pontua. Não existe resposta certa no cliente.
- **Estado público** (Schema, a 20 Hz): jogadores, NPCs, veículos, bakers, esteira (uma string compacta de slots), KPIs e relógio.
- **Estado privado:** perfil, inventário e missões vão por mensagem `profile` só para o dono.

## Fluxo do pacote (simulação)

```
LH na doca ──recebimento──▶ flowrack (backlog) ──etiquetagem──▶ esteira ──pesca──▶ mãos (≤3)
     │                         ▲                                  │                    │
     └─ volumosos ─────────────┼───────── One Bip ───────────▶ baker ◀──conteinerização┘
                               │                                  │ (completo e sem erro)
                  goleiro ◀────┘ sobra da esteira                 ▼
                  PS ◀── danificados/casos               baker FECHADO ──traslado──▶ van na doca
                                                                   ──carregamento──▶ contagem
                                                                   ──(2 erros) aduana──▶ Gate Out
```

REPs NPC trabalham num ritmo base, com taxa de erro, para o mundo não parar. Os jogadores aceleram o fluxo e corrigem os erros.
Há uma rede de segurança: NPCs resolvem o que fica parado tempo demais, como LH sem receber ou van sem baker.

## Missões

`MissionDef` define objetivos do tipo `{ type, count, filter }`. O servidor emite eventos (`emit(player, {type, ...})`)
a cada ação relevante, e o motor puro (`shared/src/logic/missions.ts`) atualiza o progresso.
Missões especiais podem disparar eventos no mundo (`startEvent`) e ter tempo limite em minutos de jogo.

## Próximos passos sugeridos

1. Login com o SSO corporativo (hoje a identidade é um token salvo no navegador).
2. PostgreSQL e Redis para várias instâncias e um "servidor por SVC".
3. Trocar a arte procedural por spritesheets desenhadas, mantendo o mesmo layout.
4. Mais processos das WIs: RTS completo, inventário At Station e Em Trânsito, Mega SVC, linha branca e colchões.
5. Sons e trilha, ranking semanal e conquistas.
6. Painel do líder: acompanhar o aprendizado do time a partir do histórico.
