# Etapa 1: Build
FROM node:20-alpine AS build

# Define diretório de trabalho
WORKDIR /app

# Copia apenas os arquivos de dependência
COPY package*.json ./

# Instala dependências de produção
RUN npm ci --omit=dev

# Copia o restante do código
COPY . .

# Etapa 2: Runtime
FROM node:20-alpine

WORKDIR /app

# Copia arquivos da etapa anterior
COPY --from=build /app /app

# Cria diretório de autenticação dinâmico
ENV SESSION_PATH=/app/auth_info

# Cria diretório e define permissões seguras
RUN mkdir -p ${SESSION_PATH} && \
    addgroup -S app && adduser -S app -G app && \
    chown -R app:app /app

USER app

# Variáveis de ambiente padrão (podem ser sobrescritas)
ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=America/Sao_Paulo

# Expõe a porta do servidor Express
EXPOSE ${PORT}

# Mostra variáveis de ambiente úteis no log
RUN echo 'Container Baileys configurado com sucesso!'

# Comando de inicialização dinâmico
CMD ["node", "src/index.js"]
