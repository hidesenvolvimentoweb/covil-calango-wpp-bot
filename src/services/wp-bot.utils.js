import fs from "fs";
import { normalizeMessageContent } from "@whiskeysockets/baileys";
import { generateByPrompt } from "./ia.service.js";
import { analyzeOrderIntent } from "./order-intent.service.js";
import { fetchOrderStatus } from "./order-scraper.service.js";
import { appendTurn, getHistory } from "./conversation.service.js";
import { getReminderMessage, messages } from "../messages.js";
import { getSettings } from "../settings.js";

const sentMessages = new Set();

const getMessageText = (msg) => {
  const content = normalizeMessageContent(msg?.message);
  return content?.conversation
    || content?.extendedTextMessage?.text
    || content?.imageMessage?.caption
    || "";
};

/**
 * Indica se o JID pertence a uma conversa privada (não é grupo).
 *
 * @param {string} jid - JID da conversa
 */
export const isPrivateJid = (jid) => jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid");

/**
 * Chave que identifica a conversa para fins de histórico e agrupamento de mensagens.
 * No privado é o próprio JID; em grupos é o JID do grupo mais o participante,
 * para que a conversa de cada pessoa não se misture.
 *
 * @param {object} msg - Mensagem recebida do Baileys
 */
export const getConversationKey = (msg) => {
  const jid = msg.key.remoteJid;
  return isPrivateJid(jid) ? jid : `${jid}:${msg.key.participant || jid}`;
};

const decideReply = async (text, jid, history) => {
  if (!getSettings().orderLookup.enabled) {
    return generateByPrompt(text, history);
  }

  const intent = await analyzeOrderIntent(text, history);
  if (!intent.isOrderQuery) {
    return generateByPrompt(text, history);
  }
  if (!isPrivateJid(jid)) {
    return messages.replies.orderLookupOnlyInPrivate;
  }
  if (!intent.identifier) {
    return messages.replies.orderIdentifierMissing;
  }

  console.info(messages.logs.orderIntentDetected(intent.identifier));
  try {
    const order = await fetchOrderStatus(intent.identifier);
    return order ? messages.replies.orderStatus(order) : messages.replies.orderNotFound(intent.identifier);
  } catch (error) {
    console.error(messages.logs.orderLookupError(intent.identifier), error);
    return messages.replies.orderLookupUnavailable;
  }
};

/**
 * Monta a resposta para o texto recebido, usando o histórico da conversa como contexto.
 * Se a consulta de pedidos estiver habilitada, a IA classifica a mensagem antes:
 * quando é uma pergunta sobre pedido, o scraper consulta o painel externo e a resposta
 * é montada com os dados reais; caso contrário, a IA responde normalmente.
 * O turno (texto e resposta) é gravado no histórico, exceto quando a resposta é o erro genérico.
 *
 * @param {string} text - Texto enviado pelo usuário
 * @param {string} jid - JID da conversa de origem
 * @param {string} [conversationKey] - Chave do histórico (padrão: o próprio JID)
 * @returns {Promise<string>}
 */
export const buildReply = async (text, jid, conversationKey = jid) => {
  const history = getHistory(conversationKey);
  const reply = await decideReply(text, jid, history);
  if (reply !== messages.replies.genericErrorReply) {
    appendTurn(conversationKey, text, reply);
  }
  return reply;
};

/**
 * Obtém o JID do grupo de acordo com o nome informado, caso não exista, retorna null
 *
 * @param {string} nome - Nome do grupo, em string.
 * @param {object} sock - Instância atual do socket Baileys
 * @returns {string} - o id, caso encontre, ou null.
 */
export const getJIDByName = async (nome, sock) => {
  const groups = await sock.groupFetchAllParticipating();
  const group = Object.values(groups).find(g => g.subject === nome);
  return group ? group.id : null;
};

/**
 * Responde a um lote de mensagens de uma mesma conversa com uma única resposta,
 * citando a última mensagem recebida. Os textos do lote são enviados juntos à IA.
 *
 * @param {object | object[]} batch - Mensagem ou lote de mensagens recebidas do Baileys
 * @param {object} sock - Instância atual do socket Baileys
 */
export const replyToSender = async (batch, sock) => {
  const msgs = Array.isArray(batch) ? batch : [batch];
  const last = msgs[msgs.length - 1];
  const jid = last.key.remoteJid;
  const text = msgs.map(getMessageText).filter(Boolean).join("\n");

  await sendAndTrack(sock, jid, {
    text: text ? await buildReply(text, jid, getConversationKey(last)) : messages.replies.genericErrorReply,
    contextInfo: {
      stanzaId: last.key.id,
      participant: last.key.participant || jid,
      quotedMessage: last.message,
    },
  });
}

/**
 * Verifica se a mensagem é válida para ser respondida.
 * Ela só deve ser válida, caso exista, caso o tipo do evento seja "notify" e caso não tenha sido enviada pelo próprio Bot.
 * Serve para evitar que responda ou execute alguma ação indevida ou desnecessária.
 *
 * @param {object} msg - Mensagem recebida do Baileys (um item de msgUpdate.messages)
 * @param {string} type - Tipo do evento (msgUpdate.type)
 * @param {object} sock - Instância atual do socket Baileys
 */
export const isMessageValid = (msg, type, sock) => {
  const from = msg?.key?.remoteJid;
  if (from && getMessageText(msg) && type === "notify") {
    const fromMe = msg.key.fromMe || msg.participant === sock.user?.id || from === sock.user?.id;
    return !fromMe && !from.endsWith("@broadcast") && !from.includes("status");
  }
  return false;
}

/**
 * Verifica se uma mensagem é resposta (reply) a uma mensagem enviada pelo bot.
 *
 * @param {object} msg - Mensagem recebida do Baileys (msgUpdate.messages[0])
 * @param {object} sock - Instância atual do socket Baileys
 */
export const isMessageReply = (msg) => {
  const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
  if (!contextInfo?.stanzaId) return false;

  // se o id citado for de uma mensagem enviada pelo bot
  return sentMessages.has(contextInfo.stanzaId);
};

/**
 * Envia uma mensagem em um grupo, marcando todos os participantes.
 *
 * @param {string} jid - JID do grupo
 * @param {object} sock - Instância atual do socket Baileys
 */
export const sendReminderToAllFromGroup = async (jid, sock) => {
  const content = {
    image: fs.readFileSync("./src/images/covil-calango-post.png"),
    caption: getReminderMessage(),
  };

  if (getSettings().mentionAllOnReminder) {
    const metadata = await sock.groupMetadata(jid);
    content.contextInfo = { mentionedJid: metadata.participants.map((participant) => participant.id) };
  }

  await sendAndTrack(sock, jid, content);
}

/**
 * Envia uma mensagem em um grupo, marcando todos os participantes.
 *
 * @param {string} jid - JID do grupo
 * @param {object} sock - Instância atual do socket Baileys
 * @param {object} content - Objeto referente a mensagem, com os atributos necessários
 */
export const sendMessageToAllFromGroup = async (jid, sock, content) => {

  const metadata = await sock.groupMetadata(jid);
  const mentionedJid = metadata.participants.map(p => p.id);

  await sendAndTrack(sock, jid, {
    ...content,
    contextInfo: { mentionedJid }
  });
}

/**
 * Envia uma mensagem em um grupo.
 *
 * @param {string} jid - JID do grupo
 * @param {object} sock - Instância atual do socket Baileys
 * @param {object} content - Objeto referente a mensagem, com os atributos necessários
 */
export const sendMessageToGroup = async (jid, sock, content) => {
  await sendAndTrack(sock, jid, content);
}

/**
 * Envia uma mensagem em um grupo, e guarda a mensagem enviada em uma lista para consulta posterior.
 *
 * @param {string} jid - JID do grupo
 * @param {object} sock - Instância atual do socket Baileys
 * @param {object} content - Objeto referente a mensagem, com os atributos necessários
 */
export const sendAndTrack = async (sock, jid, content) => {
  const sent = await sock.sendMessage(jid, content);
  if (sent?.key?.id) {
    sentMessages.add(sent.key.id);
  }
  return sent;
};
