import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { serviceController } from "./service.controller.js";
import { listServicesQuerySchema } from "./service.schema.js";

export const serviceRouter = Router();

serviceRouter.get(
  "/",
  requireAuth,
  validateRequest(listServicesQuerySchema, "query"),
  asyncHandler((req, res) => serviceController.list(req, res)),
);
