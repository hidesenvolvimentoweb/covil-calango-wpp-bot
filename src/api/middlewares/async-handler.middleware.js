/**
 * Encaminha para o middleware de erros as rejeições de handlers assíncronos
 * (o Express 4 não faz isso sozinho).
 *
 * @param {Function} handler - Handler (req, res, next) assíncrono
 */
export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};
