# Multiplayer com salas (Render grátis + banco Neon grátis)

## Como funciona

- **Salas públicas de até 30 pessoas.** A **Sala 1** fica sempre aberta. Quando ela lota, o servidor abre a Sala 2, depois a 3, e assim por diante. Salas vazias fecham sozinhas.
- **Salas privadas com código.** Na tela inicial, clique em *Criar*. O jogo mostra um código (ex.: `K7QXM`) no canto da tela; mande para os amigos, que entram em *Tenho um código*.
- **O mundo é um só.** Seu personagem, casa, MeliCoins, itens, o Balcão de Anúncios e o Mercado Pago valem em todas as salas. Cada sala tem sua própria operação, NPCs e inimigos.
- **Uma sala por vez.** Se você abrir o jogo em outra sala com o mesmo personagem, a sessão antiga é encerrada (sem perder nada).
- **Trocar de sala:** clique em *trocar* no indicador da sala (canto inferior direito).
- Para mudar a lotação, use a variável `ROOM_MAX` no Render (padrão `30`).

## Passo a passo (uma vez só, ~15 minutos)

### 1. Banco de dados grátis (Neon)
O disco do Render grátis é apagado quando o servidor reinicia, então o progresso precisa ficar num banco externo.
1. Entre em **neon.tech** e crie uma conta (pode ser com o GitHub).
2. Crie um projeto (ex.: `meli-world`, região *São Paulo* se houver, senão *US East*).
3. Na tela do projeto, clique em **Connect** e copie a **connection string**. Ela começa com `postgresql://` e termina com `?sslmode=require`.
   Guarde-a: é a senha do banco. **Não** coloque no código nem no GitHub.

### 2. Servidor grátis (Render)
1. Suba esta versão no GitHub (o `render.yaml` precisa estar na **raiz** do repositório).
2. Entre em **render.com** com a conta do GitHub.
3. **New → Blueprint** → escolha o repositório `Meli-World` → *Connect*.
4. O Render pede o valor de `DATABASE_URL`: cole a connection string do Neon. Clique em **Apply**.
5. Espere o deploy terminar (5–10 min na primeira vez). O endereço fica parecido com
   `https://meli-world-xxxx.onrender.com`. Abra `…/api/health`: deve aparecer `"ok":true` e `"repo":"postgres"`.

**Pronto: esse endereço já é o jogo multiplayer.** Mande o link para os colegas.

### 3. (Opcional) GitHub Pages também multiplayer
Se quiser que o link do GitHub Pages também mostre as salas:
1. No GitHub: **Settings → Secrets and variables → Actions → New repository secret**
   - Nome: `GAME_SERVER_URL`
   - Valor: o endereço do Render trocando `https` por `wss`, ex.: `wss://meli-world-xxxx.onrender.com`
2. **Actions → Deploy cliente no GitHub Pages → Run workflow** (ou faça qualquer commit).

## Limites do plano grátis
- O Render grátis **dorme após ~15 min sem ninguém**. O primeiro acesso depois disso demora ~1 minuto; a tela inicial mostra "Acordando o servidor…" e libera o modo solo enquanto espera.
- 512 MB de RAM: aguenta várias salas com folga para um time; para muitos jogadores ao mesmo tempo, considere um plano pago.
- Confira os limites atuais em render.com/pricing e neon.tech/pricing — eles mudam.

## Rodar o multiplayer no seu PC (teste)
`iniciar.bat` (ou `npm install` e `npm run dev`) → abra `http://localhost:5173`. Sem `DATABASE_URL`, o progresso fica em SQLite na pasta `server/data`.
