import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { businessController } from "./business.controller.js";
import {
  businessIdParamSchema,
  completeOnboardingSchema,
  createServiceSchema,
  replaceHoursSchema,
  serviceIdParamSchema,
  updateMyBusinessSchema,
  updateServiceSchema,
} from "./business.schema.js";

export const businessRouter = Router();

businessRouter.use(requireAuth);

businessRouter.get(
  "/me",
  requireRole("BUSINESS"),
  asyncHandler((req, res) => businessController.getMine(req, res)),
);

businessRouter.patch(
  "/me",
  requireRole("BUSINESS"),
  validateRequest(updateMyBusinessSchema, "body"),
  asyncHandler((req, res) => businessController.updateMine(req, res)),
);

businessRouter.post(
  "/me/onboarding",
  requireRole("BUSINESS"),
  validateRequest(completeOnboardingSchema, "body"),
  asyncHandler((req, res) => businessController.completeOnboarding(req, res)),
);

businessRouter.post(
  "/me/services",
  requireRole("BUSINESS"),
  validateRequest(createServiceSchema, "body"),
  asyncHandler((req, res) => businessController.createService(req, res)),
);

businessRouter.patch(
  "/me/services/:id",
  requireRole("BUSINESS"),
  validateRequest(serviceIdParamSchema, "params"),
  validateRequest(updateServiceSchema, "body"),
  asyncHandler((req, res) => businessController.updateService(req, res)),
);

businessRouter.delete(
  "/me/services/:id",
  requireRole("BUSINESS"),
  validateRequest(serviceIdParamSchema, "params"),
  asyncHandler((req, res) => businessController.deleteService(req, res)),
);

businessRouter.put(
  "/me/hours",
  requireRole("BUSINESS"),
  validateRequest(replaceHoursSchema, "body"),
  asyncHandler((req, res) => businessController.replaceHours(req, res)),
);

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
