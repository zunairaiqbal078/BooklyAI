import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/api-response.js";
import { businessService } from "./business.service.js";

export class BusinessController {
  async list(_req: Request, res: Response): Promise<void> {
    const businesses = await businessService.list();
    sendSuccess(res, { businesses });
  }

  async getById(req: Request, res: Response): Promise<void> {
    const params = (req.validatedParams ?? req.params) as { id: string };
    const business = await businessService.getById(params.id);
    sendSuccess(res, { business });
  }

  async listServices(req: Request, res: Response): Promise<void> {
    const params = (req.validatedParams ?? req.params) as { id: string };
    const services = await businessService.listServices(params.id);
    sendSuccess(res, { services });
  }
}

export const businessController = new BusinessController();
