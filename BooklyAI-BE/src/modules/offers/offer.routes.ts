import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { offerController } from "./offer.controller.js";
import {
  createOfferSchema,
  offerIdParamSchema,
  updateOfferSchema,
} from "./offer.schema.js";

export const offerRouter = Router();

offerRouter.use(requireAuth, requireRole("BUSINESS"));

offerRouter.get(
  "/",
  asyncHandler((req, res) => offerController.listMine(req, res)),
);

offerRouter.post(
  "/",
  validateRequest(createOfferSchema, "body"),
  asyncHandler((req, res) => offerController.create(req, res)),
);

offerRouter.patch(
  "/:id",
  validateRequest(offerIdParamSchema, "params"),
  validateRequest(updateOfferSchema, "body"),
  asyncHandler((req, res) => offerController.update(req, res)),
);

offerRouter.delete(
  "/:id",
  validateRequest(offerIdParamSchema, "params"),
  asyncHandler((req, res) => offerController.delete(req, res)),
);
