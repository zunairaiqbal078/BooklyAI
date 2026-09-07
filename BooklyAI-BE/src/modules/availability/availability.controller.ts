import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/api-response.js";
import type { AvailabilityQuery } from "./availability.schema.js";
import { availabilityService } from "./availability.service.js";

export class AvailabilityController {
  async getSlots(req: Request, res: Response): Promise<void> {
    const query = (req.validatedQuery ?? req.query) as AvailabilityQuery;
    const result = await availabilityService.getSlots(query);
    sendSuccess(res, result);
  }
}

export const availabilityController = new AvailabilityController();
