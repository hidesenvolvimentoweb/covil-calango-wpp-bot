import { timingSafeEqual } from "node:crypto";
import { HttpError } from "../errors/http-error.js";
import { messages } from "../../messages.js";

const BEARER_PREFIX = "Bearer ";

const isSameToken = (received, expected) => {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
};

/**
 * Exige o cabeçalho "Authorization: Bearer <token>" com o token configurado em WPP_BOT_API_TOKEN.
 *
 * @param {string} apiToken - Token esperado
 */
export const requireApiToken = (apiToken) => (req, res, next) => {
  const header = req.get("authorization") ?? "";
  const token = header.startsWith(BEARER_PREFIX) ? header.slice(BEARER_PREFIX.length).trim() : "";

  if (!token || !isSameToken(token, apiToken)) {
    next(new HttpError(401, messages.api.unauthorized));
    return;
  }
  next();
};
