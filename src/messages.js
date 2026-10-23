export const messages = Object.freeze({
  replies: Object.freeze({
    empty: "Opa, não entendi sua mensagem!",
    unrecognized: "Desculpe, não entendi",
    aiError: "Ops, algo deu errado!",
  }),
  reminders: Object.freeze({
    default: "Fala, Duelistas! YUGINHO JOTAPINHO Passando pra avisar que SÁBADO tem torneio! Lembre-se de colocar o nome na lista pra mostrar pra galera que o torneio vai bombar!",
  }),
  logs: Object.freeze({
    uncaughtException: "Erro não tratado:",
    unhandledRejection: "Promessa rejeitada sem catch:",
    reminderDisconnected: "Não foi possível enviar o lembrete: WhatsApp desconectado ou grupo não configurado.",
    noGroups: "Não foi possível enviar os lembretes: nenhum grupo configurado ou encontrado.",
    reminderGroupError: (jid) => `Erro ao enviar lembrete para o grupo ${jid}:`,
    taskError: "❌ Erro ao executar tarefa:",
    botStopped: "O bot foi encerrado:",
  }),
});

export const getReminderMessage = () => messages.reminders.default;
