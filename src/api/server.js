import express from "express";
import { createMessageRoutes } from "./routes/message.routes.js";
import { createHealthController } from "./controllers/health.controller.js";
import { requireApiToken } from "./middlewares/auth.middleware.js";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler.middleware.js";
import { messages } from "../messages.js";

const DEFAULT_PORT = 3000;

/**
 * Monta a aplicação Express da API do bot.
 *
 * Rotas (prefixo /api/v1):
 * - GET  /health   → estado da API e da conexão com o WhatsApp (público)
 * - POST /messages → envia uma mensagem de texto para um número (exige Bearer token)
 *
 * @param {object} options
 * @param {() => object|null} options.getSocket - Devolve o socket do WhatsApp conectado (ou null)
 * @param {string} options.apiToken - Token exigido no cabeçalho Authorization
 */
export const createApp = ({ getSocket, apiToken }) => {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));

  const v1 = express.Router();
  v1.get("/health", createHealthController(getSocket).check);
  v1.use("/messages", requireApiToken(apiToken), createMessageRoutes(getSocket));

  app.use("/api/v1", v1);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};

/**
 * Inicia a API HTTP do bot. Sem WPP_BOT_API_TOKEN a API não sobe, para não expor
 * o envio de mensagens sem autenticação; o restante do bot continua funcionando.
 *
 * @param {() => object|null} getSocket - Devolve o socket do WhatsApp conectado (ou null)
 * @returns {import("node:http").Server|null}
 */
export const startApiServer = (getSocket) => {
  const apiToken = process.env.WPP_BOT_API_TOKEN?.trim();
  if (!apiToken) {
    console.warn(messages.logs.apiTokenMissing);
    return null;
  }

  const port = Number(process.env.WPP_BOT_API_PORT) || DEFAULT_PORT;
  const server = createApp({ getSocket, apiToken }).listen(port, () => {
    console.info(messages.logs.apiStarted(port));
  });
  server.on("error", (error) => console.error(messages.logs.apiStartError(port), error));
  return server;
};
