import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { corsOptions } from "./config/cors.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { apiRateLimiter } from "./middleware/rate-limit.middleware.js";
import { requestLogger } from "./middleware/request-logger.middleware.js";
import { appointmentRouter } from "./modules/appointments/appointment.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { availabilityRouter } from "./modules/availability/availability.routes.js";
import { businessRouter } from "./modules/businesses/business.routes.js";
import { calendarRouter } from "./modules/calendar/calendar.routes.js";
import { chatRouter } from "./modules/chat/chat.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { marketplaceRouter } from "./modules/marketplace/marketplace.routes.js";
import { offerRouter } from "./modules/offers/offer.routes.js";
import { serviceRouter } from "./modules/services/service.routes.js";
import {
  ensureUploadsDir,
  UPLOADS_DIR,
} from "./modules/uploads/upload.middleware.js";
import { uploadRouter } from "./modules/uploads/upload.routes.js";
import { sendError } from "./utils/api-response.js";

export function createApp() {
  const app = express();
  ensureUploadsDir();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  // Allow FE (other origin) to load uploaded images in <img>.
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors(corsOptions));
  app.use(express.json({ limit: "32kb" }));
  app.use(cookieParser());
  app.use(requestLogger);
  app.use(apiRateLimiter);

  app.use("/uploads", express.static(UPLOADS_DIR));

  app.use("/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/appointments", appointmentRouter);
  app.use("/api/availability", availabilityRouter);
  app.use("/api/calendar", calendarRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/marketplace", marketplaceRouter);
  app.use("/api/businesses", businessRouter);
  app.use("/api/offers", offerRouter);
  app.use("/api/services", serviceRouter);
  app.use("/api/uploads", uploadRouter);

  app.use((_req, res) => {
    sendError(res, 404, "NOT_FOUND", "Route not found.");
  });

  app.use(errorHandler);

  return app;
}
