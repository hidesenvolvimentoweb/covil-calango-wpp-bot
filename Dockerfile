FROM node:20-bookworm-slim

ENV NODE_ENV=production \
    SESSION_PATH=/app/auth_info \
    TZ=America/Sao_Paulo \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev \
    && npx playwright install --with-deps --only-shell chromium \
    && chmod -R o+rX /ms-playwright \
    && rm -rf /var/lib/apt/lists/*

COPY --chown=node:node . .
RUN mkdir -p /app/auth_info && chown node:node /app/auth_info

USER node

CMD ["npm", "start"]
