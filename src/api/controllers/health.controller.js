/**
 * Cria o controller de saúde da API.
 *
 * @param {() => object|null} getSocket - Devolve o socket do WhatsApp conectado (ou null)
 */
export const createHealthController = (getSocket) => ({
  /**
   * GET /api/v1/health
   * 200 quando o WhatsApp está conectado; 503 quando não está (a API continua no ar).
   */
  check: (req, res) => {
    const whatsappConnected = Boolean(getSocket());
    res.status(whatsappConnected ? 200 : 503).json({
      status: whatsappConnected ? "UP" : "DOWN",
      whatsapp: whatsappConnected ? "CONNECTED" : "DISCONNECTED",
    });
  },
});
