export const messages = {
  replies: {
    genericErrorReply: "Ops, algo deu errado!",
    orderLookupOnlyInPrivate: "Para consultar um pedido, me chame no privado que eu verifico para você. 🙂",
    orderIdentifierMissing: "Claro! Me informe o número do pedido para eu consultar o andamento.",
    orderNotFound: (identifier) => `Não encontrei nenhum pedido com o identificador *${identifier}*. Confira o número e me envie novamente.`,
    orderLookupUnavailable: "Não consegui consultar o pedido agora. Tente novamente em alguns minutos.",
    orderStatus: ({ number, status, date, details }) => [
      `📦 *Pedido ${number}*`,
      status && `Status: ${status}`,
      date && `Data: ${date}`,
      details && `Detalhes: ${details}`,
    ].filter(Boolean).join("\n"),
  },
  reminders: {
    default: `O Covil do Calango chegou para fortalecer seu deck! 🃏🔥\n\n 🌐 Acesse nossa loja: \n\n https://www.covildocalango.com.br/ \n\n 📸 Siga a gente no Instagram: \n\n https://www.instagram.com/covildocalango/`,
  },
  logs: Object.freeze({
    uncaughtException: "Erro não tratado:",
    unhandledRejection: "Promessa rejeitada sem catch:",
    reminderDisconnected: "Não foi possível enviar o lembrete: WhatsApp desconectado ou grupo não configurado.",
    noGroups: "Não foi possível enviar os lembretes: nenhum grupo configurado ou encontrado.",
    reminderGroupError: (jid) => `Erro ao enviar lembrete para o grupo ${jid}:`,
    taskError: "Erro ao executar tarefa:",
    botStopped: "O bot foi encerrado:",
    orderIntentDetected: (identifier) => `Consulta de pedido detectada. Buscando: ${identifier}`,
    orderLookupError: (identifier) => `Erro ao consultar o pedido ${identifier}:`,
    apiStarted: (port) => `API do bot disponível na porta ${port}.`,
    apiStartError: (port) => `Não foi possível iniciar a API do bot na porta ${port}:`,
    apiTokenMissing: "WPP_BOT_API_TOKEN não definido: a API de envio de mensagens não foi iniciada.",
    apiMessageSent: (phone) => `Mensagem enviada pela API para o número final ${String(phone).slice(-4)}.`,
    apiUnexpectedError: (method, path) => `Erro inesperado na API (${method} ${path}):`,
  }),
  api: Object.freeze({
    unauthorized: "Token de acesso ausente ou inválido.",
    routeNotFound: (method, path) => `Rota ${method} ${path} não encontrada.`,
    invalidJson: "O corpo da requisição não é um JSON válido.",
    payloadTooLarge: "O corpo da requisição excede o tamanho permitido.",
    internalError: "Não foi possível processar a requisição.",
    phoneRequired: "Informe o número de celular (phone).",
    phoneInvalid: "Número de celular inválido. Informe DDD e número, com ou sem DDI.",
    messageRequired: "Informe a mensagem (message).",
    messageTooLong: (max) => `A mensagem deve ter no máximo ${max} caracteres.`,
    whatsappDisconnected: "O WhatsApp do bot está desconectado. Tente novamente em instantes.",
    phoneNotOnWhatsapp: (phone) => `O número ${phone} não possui WhatsApp.`,
  }),
};

export const getReminderMessage = () => messages.reminders.default;

export const setConfiguredMessages = (configured) => {
  messages.reminders.default = configured.reminder;
};
