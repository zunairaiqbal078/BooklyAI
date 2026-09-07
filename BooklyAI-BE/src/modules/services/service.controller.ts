import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/api-response.js";
import type { ListServicesQuery } from "./service.schema.js";
import { serviceCatalogService } from "./service.service.js";

export class ServiceController {
  async list(req: Request, res: Response): Promise<void> {
    const services = await serviceCatalogService.list(
      (req.validatedQuery ?? {}) as ListServicesQuery,
    );
    sendSuccess(res, { services });
  }
}

export const serviceController = new ServiceController();
