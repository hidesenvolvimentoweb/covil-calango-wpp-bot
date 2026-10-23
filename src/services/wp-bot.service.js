import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import pino from "pino";
import dotenv from "dotenv";

import { isMessageReply, isMessageValid, replyToSender } from "./wp-bot.utils.js";

dotenv.config();

const groupTargets = (process.env.WHATSAPP_GROUPS).split(",").map((target) => target.trim()).filter(Boolean);
const reconnectDelayMs = 5000;

const onConnectionUpdate = (update) => {
  const { qr } = update;

  if (qr) {
    qrcode.generate(qr, { small: true });
  }
  if (update.connection === "open") {
    console.info("WhatsApp conectado.");
  }
};

export const getBotGroupJids = async (sock) => {
  const groupJids = groupTargets.filter((target) => target.endsWith("@g.us"));
  const groupNames = groupTargets.filter((target) => !target.endsWith("@g.us"));

  if (groupNames.length > 0) {
    const groups = Object.values(await sock.groupFetchAllParticipating());
    for (const groupName of groupNames) {
      const group = groups.find((candidate) => candidate.subject === groupName);
      if (group) {
        groupJids.push(group.id);
      } else {
        console.error(`Não encontrei o grupo "${groupName}". Verifique WHATSAPP_GROUPS.`);
      }
    }
  }

  return [...new Set(groupJids)];
};

const onMessageUpsert = async (msgUpdate, sock, getGroupJids) => {
  const msg = msgUpdate.messages?.[0];
  if (!msg?.key?.remoteJid || !isMessageValid(msgUpdate, msg.key.remoteJid, sock)) {
    return;
  }

  const groupJids = await getGroupJids();
  const jid = msg.key.remoteJid;
  if (!groupJids.includes(jid)) {
    return;
  }

  if (isMessageReply(msg, sock)) {
    await replyToSender(msg, sock);
    return;
  }

};

export const startBot = async (onConnected) => {
  while (true) {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(process.env.SESSION_PATH || "./auth_info");
      const { version } = await fetchLatestBaileysVersion();
      const sock = makeWASocket({
        version,
        syncFullHistory: false,
        auth: state,
        logger: pino({ level: "warn" }),
      });
      let groupLookup;
      const getGroupJids = () => groupLookup ??= getBotGroupJids(sock);

      sock.ev.on("creds.update", saveCreds);
      sock.ev.on("messages.upsert", (update) => {
        onMessageUpsert(update, sock, getGroupJids).catch((error) => {
          console.error("Erro ao processar mensagem:", error);
        });
      });

      await new Promise((resolve, reject) => {
        sock.ev.on("connection.update", (update) => {
          onConnectionUpdate(update);

          if (update.connection === "open") {
            onConnected(sock);
          }

          if (update.connection === "close") {
            onConnected(null);
            const statusCode = update.lastDisconnect?.error?.output?.statusCode;
            if (statusCode === 401) {
              const error = new Error("Sessão do WhatsApp expirada ou não autenticada. Apague a sessão e autentique novamente pelo QR code.");
              error.code = "WHATSAPP_UNAUTHENTICATED";
              reject(error);
              return;
            }
            resolve();
          }
        });
      });

      console.warn(`Conexão encerrada. Nova tentativa em ${reconnectDelayMs / 1000} segundos.`);
    } catch (error) {
      if (error?.code === "WHATSAPP_UNAUTHENTICATED") {
        throw error;
      }
      console.error("Falha na conexão com o WhatsApp; nova tentativa em 5 segundos:", error);
    }

    await new Promise((resolve) => setTimeout(resolve, reconnectDelayMs));
  }
};
