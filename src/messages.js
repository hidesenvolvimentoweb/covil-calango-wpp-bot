export const messages = Object.freeze({
  replies: Object.freeze({
    empty: "Opa, não entendi sua mensagem!",
    unrecognized: "Desculpe, não entendi",
    aiError: "Ops, algo deu errado!",
  }),
  reminders: Object.freeze({
    default: `O Covil do Calango chegou para fortalecer seu deck! 🃏🔥\n\n 🌐 Acesse nossa loja: \n\n https://www.covildocalango.com.br/ \n\n 📸 Siga a gente no Instagram: \n\n https://www.instagram.com/covildocalango/`,
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
