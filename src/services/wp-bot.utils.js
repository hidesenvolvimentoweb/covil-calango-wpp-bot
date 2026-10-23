import fs from "fs";
import { generateByPrompt } from "./ia.service.js";
import { getReminderMessage, messages } from "../messages.js";

const sentMessages = new Set();

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
 * Responde a uma mensagem respondida pelo bot. marcando quem respondeu.
 *
 * @param {object} msg - Mensagem recebida do Baileys (msgUpdate.messages[0])
 * @param {object} sock - Instância atual do socket Baileys
 */
export const replyToSender = async (msg, sock) => {
  const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
  await sendAndTrack(sock, msg.key.remoteJid, {
    text: text ? await generateByPrompt(text) : messages.replies.empty,
    contextInfo: {
      stanzaId: msg.key.id,
      participant: msg.key.participant || msg.key.remoteJid,
      quotedMessage: msg.message,
    },
  });
}

/**
 * Verifica se a mensagem é válida para ser respondida.
 * Ela só deve ser válida, caso exista, caso o tipo dela seja "notify" e caso não tenha sido enviada pelo próprio Bot.
 * Serve para evitar que responda ou execute alguma ação indevida ou desnecessária.
 *
 * @param {object} msgUpdate - Mensagem recebida do Baileys (msgUpdate)
 * @param {object} from - A pessoa que está enviando a mensagem
 * @param {object} sock - Instância atual do socket Baileys
 */
export const isMessageValid = (msgUpdate, from, sock) => {
  const msg = msgUpdate.messages?.[0];
  const messageExists = () => {
    return msg?.message && (msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption) || "";
  }
  if (messageExists() && msgUpdate.type === "notify") {
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
  const metadata = await sock.groupMetadata(jid);
  const mentionedJid = metadata.participants.map(p => p.id);

  await sendAndTrack(sock, jid, {
    image: fs.readFileSync("./src/images/yugi-feliz.jfif"),
    caption: getReminderMessage(),
    contextInfo: { mentionedJid }
  });
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
