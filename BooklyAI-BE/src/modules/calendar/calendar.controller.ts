import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/api-response.js";
import type { CalendarQuery } from "./calendar.schema.js";
import { calendarService } from "./calendar.service.js";

export class CalendarController {
  async getRange(req: Request, res: Response): Promise<void> {
    const result = await calendarService.getRange(
      req.user!,
      (req.validatedQuery ?? req.query) as CalendarQuery,
    );
    sendSuccess(res, result);
  }
}

export const calendarController = new CalendarController();
