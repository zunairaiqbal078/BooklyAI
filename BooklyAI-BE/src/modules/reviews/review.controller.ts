import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/api-response.js";
import { reviewService } from "./review.service.js";
import type { CreateReviewInput } from "./review.schema.js";

export class ReviewController {
  async createForAppointment(req: Request, res: Response): Promise<void> {
    const params = (req.validatedParams ?? req.params) as { id: string };
    const review = await reviewService.createForAppointment(
      req.user!,
      params.id,
      req.body as CreateReviewInput,
    );
    sendSuccess(res, { review }, 201);
  }
}

export const reviewController = new ReviewController();
