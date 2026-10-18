# Como hospedar o MELI WORLD

> **Quer o multiplayer com salas de graça (Render + Neon)?** Siga o [MULTIPLAYER.md](MULTIPLAYER.md).

O jogo tem duas partes:

| Parte | O que é | Onde pode ficar |
|---|---|---|
| **Cliente** | HTML/JS/CSS estáticos (`client/dist`) | Qualquer hospedagem estática: GitHub Pages, Netlify, Vercel, o próprio servidor |
| **Servidor** | Node.js + WebSocket (Colyseus) + banco SQLite | Um host que rode Node: Render, Railway, Fly.io, VM, Fury… |

> O GitHub Pages **só** serve arquivos estáticos. Ele não roda o servidor multiplayer.
> Para isso existe o **modo solo**: sem servidor, o jogo inteiro roda no navegador.

---

## Opção 0 — GitHub Pages no modo solo (sem servidor, grátis)

Neste modo, o mesmo motor do servidor roda dentro do navegador.
- **O que funciona:** missões, NPCs, operação viva e mini-jogos.
- **Onde fica o progresso:** no `localStorage` de cada navegador.
- **O que não tem:** cada pessoa joga sozinha.

1. Suba o projeto para um repositório no GitHub.
2. Vá em **Settings → Pages → Source: GitHub Actions**.
3. Faça push na branch `main`. O workflow `.github/workflows/pages.yml` compila e publica o jogo.
4. Acesse `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

O jogo detecta sozinho que não há servidor e entra no modo solo. Não precisa configurar nenhum secret.
Se depois você subir um servidor e cadastrar o `GAME_SERVER_URL`, a tela inicial passa a oferecer **Multiplayer** ou **Solo**.

> **Atenção ao progresso:** limpar os dados do navegador, usar aba anônima ou trocar de computador ou navegador começa o progresso do zero.

---

## Opção A — tudo num lugar só (mais simples)

O servidor já entrega o cliente compilado na mesma porta. Use o `Dockerfile` do projeto.

**Render (render.com)**
1. Suba o projeto para um repositório no GitHub.
2. No Render: **New → Blueprint** e escolha o repositório. O `render.yaml` já configura tudo.
3. Pronto: o jogo fica em `https://meli-world.onrender.com` (ou parecido) e os colegas só abrem o link.

**Railway ou Fly.io:** crie o app a partir do repositório; os dois detectam o `Dockerfile`.
- Porta: `2567`
- Volume persistente montado em `/data`

**Qualquer VM com Docker**
```bash
docker build -t meli-world .
docker run -d -p 80:2567 -v meli-data:/data meli-world
```

**Sem Docker**
```bash
npm install
npm run build
npm start   # http://SEU_HOST:2567
```

> **Atenção à persistência:** o progresso dos jogadores fica em SQLite, dentro de `DATA_DIR`. Sem um disco ou volume persistente, os dados somem a cada deploy ou reinício. Planos gratuitos costumam não ter disco e "dormir" sem uso. Confira os planos atuais do provedor.

---

## Opção B — cliente no GitHub Pages + servidor em outro lugar

1. Hospede o servidor como na Opção A e anote o endereço, por exemplo `wss://meli-world.onrender.com`.
2. No GitHub: **Settings → Secrets and variables → Actions → New secret**
   - Nome: `GAME_SERVER_URL`
   - Valor: `wss://meli-world.onrender.com`
3. **Settings → Pages → Source: GitHub Actions.**
4. Faça push na branch `main`. O workflow `.github/workflows/pages.yml` compila e publica.
5. O jogo fica em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

---

## Antes de publicar: atenção

O jogo usa termos e regras tirados das WIs internas do SVC, além da marca e do nome de colegas.

- **Repositório:** prefira um repositório **privado**.
- **Público-alvo interno:** se o jogo for para o time, o caminho mais seguro é hospedar internamente (por exemplo no **Fury**, atrás do login corporativo), com acesso restrito.
- **Em caso de dúvida:** confirme com Segurança da Informação ou com o time dono das WIs antes de deixar o jogo aberto na internet.
