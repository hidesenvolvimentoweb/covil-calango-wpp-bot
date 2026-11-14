import { sendTextToPhone } from "../../services/messaging.service.js";
import { validateSendMessage } from "../validators/message.validator.js";
import { messages } from "../../messages.js";

/**
 * Cria o controller de mensagens.
 *
 * @param {() => object|null} getSocket - Devolve o socket do WhatsApp conectado (ou null)
 */
export const createMessageController = (getSocket) => ({
  /**
   * POST /api/v1/messages
   * Envia uma mensagem de texto para o número informado.
   * 201 Created com os dados da mensagem enviada.
   */
  send: async (req, res) => {
    const { phone, message } = validateSendMessage(req.body);
    const sent = await sendTextToPhone(getSocket(), phone, message);

    console.info(messages.logs.apiMessageSent(phone));
    res.status(201)
      .location(`${req.baseUrl}/${encodeURIComponent(sent.id ?? "")}`)
      .json({
        id: sent.id,
        phone,
        to: sent.to,
        status: "SENT",
        sentAt: new Date().toISOString(),
      });
  },
});
