import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/api-response.js";
import { businessService } from "./business.service.js";
import type {
  CompleteOnboardingInput,
  CreateServiceInput,
  ReplaceHoursInput,
  UpdateMyBusinessInput,
  UpdateServiceInput,
} from "./business.schema.js";

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

  async getMine(req: Request, res: Response): Promise<void> {
    const payload = await businessService.getMine(req.user!);
    sendSuccess(res, payload);
  }

  async updateMine(req: Request, res: Response): Promise<void> {
    const body = req.body as UpdateMyBusinessInput;
    const business = await businessService.updateMine(req.user!, body);
    sendSuccess(res, { business });
  }

  async completeOnboarding(req: Request, res: Response): Promise<void> {
    const body = req.body as CompleteOnboardingInput;
    const business = await businessService.completeOnboarding(req.user!, body);
    sendSuccess(res, { business });
  }

  async createService(req: Request, res: Response): Promise<void> {
    const body = req.body as CreateServiceInput;
    const service = await businessService.createService(req.user!, body);
    sendSuccess(res, { service }, 201);
  }

  async updateService(req: Request, res: Response): Promise<void> {
    const params = (req.validatedParams ?? req.params) as { id: string };
    const body = req.body as UpdateServiceInput;
    const service = await businessService.updateService(req.user!, params.id, body);
    sendSuccess(res, { service });
  }

  async deleteService(req: Request, res: Response): Promise<void> {
    const params = (req.validatedParams ?? req.params) as { id: string };
    await businessService.deleteService(req.user!, params.id);
    sendSuccess(res, { deleted: true });
  }

  async replaceHours(req: Request, res: Response): Promise<void> {
    const body = req.body as ReplaceHoursInput;
    const hours = await businessService.replaceHours(req.user!, body);
    sendSuccess(res, { hours });
  }
}

export const businessController = new BusinessController();
