import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { chatController } from "./chat.controller.js";
import {
  chatMessageSchema,
  createSessionSchema,
  fallbackBookSchema,
  sessionIdParamSchema,
} from "./chat.schema.js";

export const chatRouter = Router();

chatRouter.use(requireAuth);

chatRouter.post(
  "/sessions",
  validateRequest(createSessionSchema),
  asyncHandler((req, res) => chatController.createSession(req, res)),
);

chatRouter.get(
  "/sessions/:id/messages",
  validateRequest(sessionIdParamSchema, "params"),
  asyncHandler((req, res) => chatController.listMessages(req, res)),
);

chatRouter.post(
  "/messages",
  validateRequest(chatMessageSchema),
  asyncHandler((req, res) => chatController.sendMessage(req, res)),
);

chatRouter.post(
  "/book",
  validateRequest(fallbackBookSchema),
  asyncHandler((req, res) => chatController.bookFromForm(req, res)),
);
