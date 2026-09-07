import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { businessController } from "./business.controller.js";
import { businessIdParamSchema } from "./business.schema.js";

export const businessRouter = Router();

businessRouter.use(requireAuth);

businessRouter.get(
  "/",
  asyncHandler((req, res) => businessController.list(req, res)),
);

businessRouter.get(
  "/:id/services",
  validateRequest(businessIdParamSchema, "params"),
  asyncHandler((req, res) => businessController.listServices(req, res)),
);

businessRouter.get(
  "/:id",
  validateRequest(businessIdParamSchema, "params"),
  asyncHandler((req, res) => businessController.getById(req, res)),
);
