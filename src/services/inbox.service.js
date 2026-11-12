/**
 * Agrupa mensagens recebidas em sequência numa mesma conversa.
 * Ao chegar uma mensagem, o bot espera `debounceMs`; se outras chegarem nesse intervalo,
 * a espera recomeça e todas são entregues juntas ao handler, numa única chamada.
 * Enquanto um lote está sendo processado, novas mensagens ficam pendentes e só são
 * entregues depois que a resposta sair, para que nunca haja duas respostas em paralelo
 * na mesma conversa.
 */
export const inboxOptions = {
  debounceMs: 4000,
};

const buffers = new Map();

const flush = async (key, buffer, handler) => {
  buffer.timer = undefined;
  if (buffer.processing || buffer.pending.length === 0) {
    return;
  }

  const batch = buffer.pending;
  buffer.pending = [];
  buffer.processing = true;
  try {
    await handler(batch);
  } catch (error) {
    console.error(`Erro ao processar mensagens da conversa ${key}:`, error);
  } finally {
    buffer.processing = false;
    if (buffer.pending.length > 0) {
      schedule(key, buffer, handler);
    } else {
      buffers.delete(key);
    }
  }
};

const schedule = (key, buffer, handler) => {
  clearTimeout(buffer.timer);
  buffer.timer = setTimeout(() => flush(key, buffer, handler), inboxOptions.debounceMs);
};

/**
 * Enfileira uma mensagem da conversa. O handler recebe o lote de mensagens (array) quando a janela fecha.
 *
 * @param {string} key - Chave da conversa
 * @param {object} msg - Mensagem recebida do Baileys
 * @param {(batch: object[]) => Promise<void>} handler - Função que processa o lote
 */
export const enqueueMessage = (key, msg, handler) => {
  let buffer = buffers.get(key);
  if (!buffer) {
    buffer = { pending: [], timer: undefined, processing: false };
    buffers.set(key, buffer);
  }
  buffer.pending.push(msg);
  schedule(key, buffer, handler);
};
