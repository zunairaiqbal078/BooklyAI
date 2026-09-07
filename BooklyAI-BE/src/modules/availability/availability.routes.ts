import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { availabilityController } from "./availability.controller.js";
import { availabilityQuerySchema } from "./availability.schema.js";

export const availabilityRouter = Router();

availabilityRouter.get(
  "/",
  requireAuth,
  validateRequest(availabilityQuerySchema, "query"),
  asyncHandler((req, res) => availabilityController.getSlots(req, res)),
);
