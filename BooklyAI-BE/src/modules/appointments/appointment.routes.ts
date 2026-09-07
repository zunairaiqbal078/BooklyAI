import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { reviewController } from "../reviews/review.controller.js";
import { createReviewSchema } from "../reviews/review.schema.js";
import { appointmentController } from "./appointment.controller.js";
import {
  appointmentIdParamSchema,
  createAppointmentSchema,
  listAppointmentsQuerySchema,
} from "./appointment.schema.js";

export const appointmentRouter = Router();

appointmentRouter.use(requireAuth);

appointmentRouter.post(
  "/",
  validateRequest(createAppointmentSchema),
  asyncHandler((req, res) => appointmentController.create(req, res)),
);

appointmentRouter.get(
  "/",
  validateRequest(listAppointmentsQuerySchema, "query"),
  asyncHandler((req, res) => appointmentController.list(req, res)),
);

appointmentRouter.get(
  "/:id",
  validateRequest(appointmentIdParamSchema, "params"),
  asyncHandler((req, res) => appointmentController.getById(req, res)),
);

appointmentRouter.patch(
  "/:id/cancel",
  validateRequest(appointmentIdParamSchema, "params"),
  asyncHandler((req, res) => appointmentController.cancel(req, res)),
);

appointmentRouter.patch(
  "/:id/complete",
  validateRequest(appointmentIdParamSchema, "params"),
  asyncHandler((req, res) => appointmentController.complete(req, res)),
);

appointmentRouter.patch(
  "/:id/request-review",
  validateRequest(appointmentIdParamSchema, "params"),
  asyncHandler((req, res) => appointmentController.requestReview(req, res)),
);

appointmentRouter.post(
  "/:id/reviews",
  validateRequest(appointmentIdParamSchema, "params"),
  validateRequest(createReviewSchema, "body"),
  asyncHandler((req, res) => reviewController.createForAppointment(req, res)),
);
