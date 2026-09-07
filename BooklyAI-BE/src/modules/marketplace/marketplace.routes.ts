import { Router } from "express";
import { validateRequest } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { marketplaceController } from "./marketplace.controller.js";
import {
  marketplaceListQuerySchema,
  marketplaceSlugParamSchema,
} from "./marketplace.schema.js";

/** Public discovery — no auth required to browse. Booking still requires login. */
export const marketplaceRouter = Router();

marketplaceRouter.get(
  "/cities",
  asyncHandler((req, res) => marketplaceController.listCities(req, res)),
);

marketplaceRouter.get(
  "/businesses",
  validateRequest(marketplaceListQuerySchema, "query"),
  asyncHandler((req, res) => marketplaceController.list(req, res)),
);

marketplaceRouter.get(
  "/businesses/:slug",
  validateRequest(marketplaceSlugParamSchema, "params"),
  asyncHandler((req, res) => marketplaceController.getBySlug(req, res)),
);
