import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/api-response.js";
import type { CreateAppointmentInput, ListAppointmentsQuery } from "./appointment.schema.js";
import { appointmentService } from "./appointment.service.js";

export class AppointmentController {
  async create(req: Request, res: Response): Promise<void> {
    const appointment = await appointmentService.create(
      req.user!,
      req.body as CreateAppointmentInput,
    );
    sendSuccess(res, { appointment }, 201);
  }

  async list(req: Request, res: Response): Promise<void> {
    const appointments = await appointmentService.list(
      req.user!,
      (req.validatedQuery ?? {}) as ListAppointmentsQuery,
    );
    sendSuccess(res, { appointments });
  }

  async getById(req: Request, res: Response): Promise<void> {
    const params = (req.validatedParams ?? req.params) as { id: string };
    const appointment = await appointmentService.getById(req.user!, params.id);
    sendSuccess(res, { appointment });
  }

  async cancel(req: Request, res: Response): Promise<void> {
    const params = (req.validatedParams ?? req.params) as { id: string };
    const appointment = await appointmentService.cancel(req.user!, params.id);
    sendSuccess(res, { appointment });
  }
}

export const appointmentController = new AppointmentController();
