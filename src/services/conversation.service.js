/**
 * Histórico de conversas em memória, usado para dar contexto à IA.
 * Cada conversa é identificada por uma chave (JID no privado, JID + participante em grupos)
 * e guarda os últimos turnos no formato aceito pelo modelo ({ role, content }).
 * O histórico é perdido ao reiniciar o processo.
 */
export const conversationOptions = {
  maxMessages: 20,
  ttlMs: 30 * 60 * 1000,
  sweepIntervalMs: 5 * 60 * 1000,
};

const conversations = new Map();

const isExpired = (conversation, now) => now - conversation.updatedAt > conversationOptions.ttlMs;

/**
 * Devolve uma cópia do histórico da conversa, do mais antigo ao mais recente.
 *
 * @param {string} key - Chave da conversa
 * @returns {Array<{ role: "user" | "assistant", content: string }>}
 */
export const getHistory = (key) => {
  const conversation = conversations.get(key);
  if (!conversation) {
    return [];
  }
  if (isExpired(conversation, Date.now())) {
    conversations.delete(key);
    return [];
  }
  return [...conversation.messages];
};

/**
 * Registra um turno (mensagem do usuário e resposta do bot) na conversa.
 *
 * @param {string} key - Chave da conversa
 * @param {string} userText - Texto enviado pelo usuário
 * @param {string} assistantText - Resposta enviada pelo bot
 */
export const appendTurn = (key, userText, assistantText) => {
  const now = Date.now();
  const current = conversations.get(key);
  const previous = current && !isExpired(current, now) ? current.messages : [];
  const messages = [
    ...previous,
    { role: "user", content: userText },
    { role: "assistant", content: assistantText },
  ].slice(-conversationOptions.maxMessages);
  conversations.set(key, { messages, updatedAt: now });
};

export const clearConversations = () => conversations.clear();

const sweep = () => {
  const now = Date.now();
  for (const [key, conversation] of conversations) {
    if (isExpired(conversation, now)) {
      conversations.delete(key);
    }
  }
};

setInterval(sweep, conversationOptions.sweepIntervalMs).unref();
