import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/api-response.js";
import { offerService } from "./offer.service.js";
import type { CreateOfferInput, UpdateOfferInput } from "./offer.schema.js";

export class OfferController {
  async listMine(req: Request, res: Response): Promise<void> {
    const offers = await offerService.listMine(req.user!);
    sendSuccess(res, { offers });
  }

  async create(req: Request, res: Response): Promise<void> {
    const offer = await offerService.create(req.user!, req.body as CreateOfferInput);
    sendSuccess(res, { offer }, 201);
  }

  async update(req: Request, res: Response): Promise<void> {
    const params = (req.validatedParams ?? req.params) as { id: string };
    const offer = await offerService.update(
      req.user!,
      params.id,
      req.body as UpdateOfferInput,
    );
    sendSuccess(res, { offer });
  }

  async delete(req: Request, res: Response): Promise<void> {
    const params = (req.validatedParams ?? req.params) as { id: string };
    await offerService.delete(req.user!, params.id);
    sendSuccess(res, { deleted: true });
  }
}

export const offerController = new OfferController();
