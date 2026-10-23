import schedule from "node-schedule";
import { startBot, getBotGroupJids } from "./services/wp-bot.service.js";
import { sendReminderToAllFromGroup } from "./services/wp-bot.utils.js";
import { messages } from "./messages.js";

process.on("uncaughtException", (err) => console.error(messages.logs.uncaughtException, err));
process.on("unhandledRejection", (reason, promise) => console.error(messages.logs.unhandledRejection, reason));

const reminderSchedule = process.env.SCHEDULE_JOB_PERIODICITY || "0 9 * * *";
const reminderJob = schedule.scheduleJob(reminderSchedule, async () => {
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
  } catch (err) {
    console.error(messages.logs.taskError, err);
  }
});

if (!reminderJob) {
  throw new Error(`Agendamento inválido em SCHEDULE_JOB_PERIODICITY: "${reminderSchedule}"`);
}

let sock;
startBot((connectedSocket) => {
  sock = connectedSocket;
}).catch((error) => {
  console.error(messages.logs.botStopped, error);
  reminderJob.cancel();
  process.exitCode = 1;
});
