import { HttpError } from "../api/errors/http-error.js";
import { messages } from "../messages.js";

const MIN_PHONE_DIGITS = 10;
const MAX_PHONE_DIGITS = 15;
const LOCAL_PHONE_LENGTHS = [10, 11];

/**
 * Normaliza o número de celular para o formato internacional usado pelo WhatsApp (apenas dígitos, com DDI).
 * Números com DDD e sem DDI (10 ou 11 dígitos) recebem o DDI padrão (DEFAULT_COUNTRY_CODE, padrão 55).
 *
 * @param {string} phone - Número informado (aceita máscara, ex.: "(83) 99999-9999")
 * @returns {string|null} número normalizado ou null quando inválido
 */
export const normalizePhone = (phone) => {
  const digits = String(phone ?? "").replace(/\D/g, "");
  const withCountryCode = LOCAL_PHONE_LENGTHS.includes(digits.length)
    ? `${process.env.DEFAULT_COUNTRY_CODE || "55"}${digits}`
    : digits;

  if (withCountryCode.length < MIN_PHONE_DIGITS || withCountryCode.length > MAX_PHONE_DIGITS) {
    return null;
  }
  return withCountryCode;
};

/**
 * Envia uma mensagem de texto para um número de celular.
 * O WhatsApp é consultado antes para obter o JID real do número (resolve, por exemplo,
 * números brasileiros cadastrados com ou sem o nono dígito).
 *
 * @param {object|null} sock - Socket do Baileys conectado
 * @param {string} phone - Número de celular já normalizado
 * @param {string} text - Texto da mensagem
 * @returns {Promise<{ id: string, to: string }>}
 */
export const sendTextToPhone = async (sock, phone, text) => {
  if (!sock) {
    throw new HttpError(503, messages.api.whatsappDisconnected);
  }

  const [contact] = await sock.onWhatsApp(`${phone}@s.whatsapp.net`) ?? [];
  if (!contact?.exists) {
    throw new HttpError(404, messages.api.phoneNotOnWhatsapp(phone));
  }

  const sent = await sock.sendMessage(contact.jid, { text });
  return { id: sent?.key?.id, to: contact.jid };
};
