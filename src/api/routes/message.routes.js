import { Router } from "express";
import { asyncHandler } from "../middlewares/async-handler.middleware.js";
import { createMessageController } from "../controllers/message.controller.js";

/**
 * Rotas do recurso /messages.
 *
 * @param {() => object|null} getSocket - Devolve o socket do WhatsApp conectado (ou null)
 */
export const createMessageRoutes = (getSocket) => {
  const router = Router();
  const controller = createMessageController(getSocket);

  router.post("/", asyncHandler(controller.send));

  return router;
};
