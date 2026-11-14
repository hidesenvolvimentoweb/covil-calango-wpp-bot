import { STATUS_CODES } from "node:http";
import { HttpError } from "../errors/http-error.js";
import { messages } from "../../messages.js";

const buildBody = (req, status, message) => ({
  timestamp: new Date().toISOString(),
  status,
  error: STATUS_CODES[status],
  message,
  path: req.originalUrl,
});

/**
 * Rotas não mapeadas: 404 no mesmo formato de erro da API.
 */
export const notFoundHandler = (req, res, next) => {
  next(new HttpError(404, messages.api.routeNotFound(req.method, req.originalUrl)));
};

/**
 * Converte qualquer erro em resposta JSON padronizada ({ timestamp, status, error, message, path }).
 * Erros inesperados viram 500 sem expor detalhes internos.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (error, req, res, next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json(buildBody(req, error.status, error.message));
    return;
  }

  if (error?.type === "entity.parse.failed") {
    res.status(400).json(buildBody(req, 400, messages.api.invalidJson));
    return;
  }
  if (error?.type === "entity.too.large") {
    res.status(413).json(buildBody(req, 413, messages.api.payloadTooLarge));
    return;
  }

  console.error(messages.logs.apiUnexpectedError(req.method, req.originalUrl), error);
  res.status(500).json(buildBody(req, 500, messages.api.internalError));
};
