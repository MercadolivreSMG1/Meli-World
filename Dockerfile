# MELI WORLD — imagem única: servidor multiplayer + cliente compilado na mesma porta
FROM node:22-slim

WORKDIR /app
COPY package.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=2567
ENV DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 2567

CMD ["npm", "start"]
