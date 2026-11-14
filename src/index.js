import dotenv from "dotenv";
import schedule from "node-schedule";
import { startBot, getBotGroupJids, invalidateGroupCache } from "./services/wp-bot.service.js";
import { sendReminderToAllFromGroup } from "./services/wp-bot.utils.js";
import { messages } from "./messages.js";
import { createPool, loadSettings } from "./database.js";
import { getSettings, setSettings } from "./settings.js";
import { startApiServer } from "./api/server.js";

dotenv.config();

process.on("uncaughtException", (error) => console.error(messages.logs.uncaughtException, error));
process.on("unhandledRejection", (reason) => console.error(messages.logs.unhandledRejection, reason));

let sock;
let reminderJob;
let settingsReloadTimer;

const sendReminders = async () => {
  if (!sock) {
    console.error(messages.logs.reminderDisconnected);
    return;
  }

  try {
    const jids = await getBotGroupJids(sock);
    if (jids.length === 0) {
      console.error(messages.logs.noGroups);
      return;
    }

    for (const jid of jids) {
      try {
        await sendReminderToAllFromGroup(jid, sock);
      } catch (error) {
        console.error(messages.logs.reminderGroupError(jid), error);
      }
    }
  } catch (error) {
    console.error(messages.logs.taskError, error);
  }
};

const validateSchedule = (expression) => {
  const probe = schedule.scheduleJob(expression, () => {});
  if (!probe) {
    throw new Error(`Agendamento inválido: "${expression}"`);
  }
  probe.cancel();
};

const applySchedule = (expression) => {
  const nextJob = schedule.scheduleJob(expression, sendReminders);
  if (!nextJob) {
    throw new Error(`Agendamento inválido: "${expression}"`);
  }
  reminderJob?.cancel();
  reminderJob = nextJob;
};

const reloadSettings = async (pool) => {
  try {
    const nextSettings = await loadSettings(pool);
    const currentSettings = getSettings();

    if (nextSettings.scheduleJobPeriodicity !== currentSettings.scheduleJobPeriodicity) {
      validateSchedule(nextSettings.scheduleJobPeriodicity);
      applySchedule(nextSettings.scheduleJobPeriodicity);
    }

    if (nextSettings.whatsappGroups !== currentSettings.whatsappGroups) {
      invalidateGroupCache();
    }

    setSettings(nextSettings);
  } catch (error) {
    console.error("Não foi possível recarregar as configurações do PostgreSQL:", error);
  }
};

const start = async () => {
  const pool = createPool();
  try {
    await pool.query("SELECT 1");
    setSettings(await loadSettings(pool));
    validateSchedule(getSettings().scheduleJobPeriodicity);
    applySchedule(getSettings().scheduleJobPeriodicity);
  } catch (error) {
    console.error("Falha ao iniciar o banco de dados:", error);
    reminderJob?.cancel();
    await pool.end();
    process.exitCode = 1;
    return;
  }

  settingsReloadTimer = setInterval(() => reloadSettings(pool), 30000);

  const apiServer = startApiServer(() => sock);

  startBot((connectedSocket) => {
    sock = connectedSocket;
  }).catch(async (error) => {
    console.error(messages.logs.botStopped, error);
    reminderJob?.cancel();
    clearInterval(settingsReloadTimer);
    apiServer?.close();
    await pool.end();
    process.exitCode = 1;
  });
};

start().catch((error) => {
  console.error("Falha ao iniciar o bot:", error);
  process.exitCode = 1;
});
