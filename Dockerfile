FROM node:20-alpine

ENV NODE_ENV=production \
    SESSION_PATH=/app/auth_info \
    TZ=America/Sao_Paulo

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --chown=node:node . .
RUN mkdir -p /app/auth_info && chown node:node /app/auth_info

USER node

CMD ["npm", "start"]
