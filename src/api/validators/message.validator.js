import { HttpError } from "../errors/http-error.js";
import { normalizePhone } from "../../services/messaging.service.js";
import { messages } from "../../messages.js";

export const MAX_MESSAGE_LENGTH = 4096;

/**
 * Valida o corpo de POST /api/v1/messages e devolve os dados já normalizados.
 *
 * @param {object} body - Corpo da requisição ({ phone, message })
 * @returns {{ phone: string, message: string }}
 */
export const validateSendMessage = (body) => {
  const { phone, message } = body ?? {};

  if (typeof phone !== "string" && typeof phone !== "number") {
    throw new HttpError(400, messages.api.phoneRequired);
  }
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    throw new HttpError(400, messages.api.phoneInvalid);
  }

  if (typeof message !== "string" || !message.trim()) {
    throw new HttpError(400, messages.api.messageRequired);
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new HttpError(400, messages.api.messageTooLong(MAX_MESSAGE_LENGTH));
  }

  return { phone: normalizedPhone, message: message.trim() };
};
