import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/api-response.js";
import { marketplaceService } from "./marketplace.service.js";
import type { MarketplaceListQuery } from "./marketplace.schema.js";

export class MarketplaceController {
  async list(req: Request, res: Response): Promise<void> {
    const query = (req.validatedQuery ?? req.query) as MarketplaceListQuery;
    const businesses = await marketplaceService.list(query);
    sendSuccess(res, { businesses });
  }

  async getBySlug(req: Request, res: Response): Promise<void> {
    const params = (req.validatedParams ?? req.params) as { slug: string };
    const payload = await marketplaceService.getBySlug(params.slug);
    sendSuccess(res, payload);
  }

  async listCities(_req: Request, res: Response): Promise<void> {
    const cities = await marketplaceService.listCities();
    sendSuccess(res, { cities });
  }
}

export const marketplaceController = new MarketplaceController();
