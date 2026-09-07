import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
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
