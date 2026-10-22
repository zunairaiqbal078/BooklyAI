import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { staffController } from "./staff.controller.js";
import {
  createStaffSchema,
  updateStaffSchema,
  createStaffLeaveSchema,
} from "./staff.schema.js";

const staffIdParamSchema = z.object({
  id: z.string().uuid("Invalid staff ID"),
});

const staffLeaveParamSchema = z.object({
  id: z.string().uuid("Invalid staff ID"),
  leaveId: z.string().uuid("Invalid leave ID"),
});

export const staffRouter = Router();

staffRouter.use(requireAuth, requireRole("BUSINESS"));

staffRouter.get(
  "/",
  asyncHandler((req, res) => staffController.list(req, res)),
);

staffRouter.post(
  "/",
  validateRequest(createStaffSchema, "body"),
  asyncHandler((req, res) => staffController.create(req, res)),
);

staffRouter.get(
  "/:id",
  validateRequest(staffIdParamSchema, "params"),
  asyncHandler((req, res) => staffController.getById(req, res)),
);

staffRouter.patch(
  "/:id",
  validateRequest(staffIdParamSchema, "params"),
  validateRequest(updateStaffSchema, "body"),
  asyncHandler((req, res) => staffController.update(req, res)),
);

staffRouter.delete(
  "/:id",
  validateRequest(staffIdParamSchema, "params"),
  asyncHandler((req, res) => staffController.delete(req, res)),
);

staffRouter.post(
  "/:id/leaves",
  validateRequest(staffIdParamSchema, "params"),
  validateRequest(createStaffLeaveSchema, "body"),
  asyncHandler((req, res) => staffController.addLeave(req, res)),
);

staffRouter.get(
  "/:id/leaves",
  validateRequest(staffIdParamSchema, "params"),
  asyncHandler((req, res) => staffController.listLeaves(req, res)),
);

staffRouter.delete(
  "/:id/leaves/:leaveId",
  validateRequest(staffLeaveParamSchema, "params"),
  asyncHandler((req, res) => staffController.deleteLeave(req, res)),
);
