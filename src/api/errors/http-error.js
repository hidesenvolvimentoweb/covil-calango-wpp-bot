/**
 * Erro com status HTTP associado. Lançado pelos controllers e serviços da API
 * e convertido em resposta JSON pelo middleware de erros.
 */
export class HttpError extends Error {
  /**
   * @param {number} status - Status HTTP da resposta
   * @param {string} message - Mensagem pronta para exibição ao cliente da API
   */
  constructor(status, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}
