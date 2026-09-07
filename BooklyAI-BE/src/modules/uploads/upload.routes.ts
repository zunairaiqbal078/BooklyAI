import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { uploadController } from "./upload.controller.js";
import { uploadImageMiddleware } from "./upload.middleware.js";

export const uploadRouter = Router();

uploadRouter.use(requireAuth, requireRole("BUSINESS"));

uploadRouter.post(
  "/image",
  (req, res, next) => {
    uploadImageMiddleware(req, res, (err) => {
      if (err) {
        next(err);
        return;
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    uploadController.uploadImage(req, res);
  }),
);
