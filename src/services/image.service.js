import { getSettings } from "../settings.js";

const downloadTimeoutMs = 15000;

/** Última imagem baixada. Cada upload gera um caminho novo, então o cache por caminho nunca fica desatualizado. */
let cached = { reference: null, buffer: null };

/**
 * Monta a URL da imagem a partir do valor do parâmetro.
 * O valor pode ser uma URL completa ou o caminho público devolvido pela API
 * (ex.: /api/arquivos/parametros/<uuid>.png), que é resolvido com API_URL.
 */
const resolveImageUrl = (reference) => {
  if (/^https?:\/\//i.test(reference)) {
    return reference;
  }
  const apiUrl = process.env.API_URL?.trim();
  if (!apiUrl) {
    throw new Error("Configure a variável API_URL para baixar a imagem do lembrete.");
  }
  return new URL(reference, apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`).toString();
};

/**
 * Devolve a imagem configurada em WPP_BOT_REMINDER_IMAGE, baixada da API.
 * Retorna null quando não há imagem configurada ou quando o download falha,
 * para que o lembrete seja enviado apenas com o texto.
 *
 * @returns {Promise<Buffer | null>}
 */
export const getReminderImage = async () => {
  const reference = getSettings().reminderImage;
  if (!reference) {
    return null;
  }
  if (cached.reference === reference) {
    return cached.buffer;
  }

  try {
    const response = await fetch(resolveImageUrl(reference), {
      signal: AbortSignal.timeout(downloadTimeoutMs),
    });
    if (!response.ok) {
      throw new Error(`A API respondeu ${response.status} ao baixar a imagem.`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      throw new Error(`O conteúdo baixado não é uma imagem (${contentType || "sem content-type"}).`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    cached = { reference, buffer };
    return buffer;
  } catch (error) {
    console.error(`Não foi possível baixar a imagem do lembrete (${reference}); o lembrete será enviado só com texto:`, error);
    return null;
  }
};
