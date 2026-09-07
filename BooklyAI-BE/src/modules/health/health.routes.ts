import { Router } from "express";
import { sendSuccess } from "../../utils/api-response.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  sendSuccess(res, {
    status: "ok",
    service: "booklyai-api",
    phase: 9,
  });
});
