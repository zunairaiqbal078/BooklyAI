import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { calendarController } from "./calendar.controller.js";
import { calendarQuerySchema } from "./calendar.schema.js";

export const calendarRouter = Router();

calendarRouter.get(
  "/",
  requireAuth,
  validateRequest(calendarQuerySchema, "query"),
  asyncHandler((req, res) => calendarController.getRange(req, res)),
);
