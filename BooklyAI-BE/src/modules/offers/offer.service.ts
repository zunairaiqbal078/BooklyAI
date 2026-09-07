import { prisma } from "../../config/database.js";
import type { AuthUser } from "../../types/index.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../../utils/app-error.js";
import type { CreateOfferInput, UpdateOfferInput } from "./offer.schema.js";

function assertOwner(user: AuthUser): string {
  if (user.role !== "BUSINESS" || !user.businessId) {
    throw new ForbiddenError("Only business owners can manage offers.");
  }
  return user.businessId;
}

const offerSelect = {
  id: true,
  businessId: true,
  serviceId: true,
  title: true,
  description: true,
  priceCents: true,
  imageUrl: true,
  isActive: true,
  createdAt: true,
  service: { select: { id: true, name: true } },
} as const;

export class OfferService {
  async listMine(user: AuthUser) {
    const businessId = assertOwner(user);
    const offers = await prisma.offer.findMany({
      where: { businessId, isActive: true },
      orderBy: { createdAt: "desc" },
      select: offerSelect,
    });
    return offers.map(mapOffer);
  }

  async create(user: AuthUser, input: CreateOfferInput) {
    const businessId = assertOwner(user);
    const service = await prisma.service.findFirst({
      where: { id: input.serviceId, businessId },
      select: { id: true },
    });
    if (!service) {
      throw new NotFoundError("Service not found for your business.");
    }

    const offer = await prisma.offer.create({
      data: {
        businessId,
        serviceId: input.serviceId,
        title: input.title,
        description: input.description ?? null,
        priceCents: input.priceCents ?? null,
        imageUrl: input.imageUrl ?? null,
        isActive: true,
      },
      select: offerSelect,
    });
    return mapOffer(offer);
  }

  async update(user: AuthUser, offerId: string, input: UpdateOfferInput) {
    const businessId = assertOwner(user);
    const existing = await prisma.offer.findFirst({
      where: { id: offerId, businessId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundError("Offer not found.");
    }

    if (input.serviceId) {
      const service = await prisma.service.findFirst({
        where: { id: input.serviceId, businessId },
        select: { id: true },
      });
      if (!service) {
        throw new ValidationError("Service not found for your business.");
      }
    }

    const offer = await prisma.offer.update({
      where: { id: offerId },
      data: {
        ...(input.serviceId !== undefined ? { serviceId: input.serviceId } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.priceCents !== undefined ? { priceCents: input.priceCents } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      select: offerSelect,
    });
    return mapOffer(offer);
  }

  async delete(user: AuthUser, offerId: string) {
    const businessId = assertOwner(user);
    const existing = await prisma.offer.findFirst({
      where: { id: offerId, businessId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundError("Offer not found.");
    }

    await prisma.offer.delete({ where: { id: offerId } });
  }
}

function mapOffer(row: {
  id: string;
  businessId: string;
  serviceId: string;
  title: string;
  description: string | null;
  priceCents: number | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  service: { id: string; name: string };
}) {
  return {
    id: row.id,
    businessId: row.businessId,
    serviceId: row.serviceId,
    serviceName: row.service.name,
    title: row.title,
    description: row.description,
    priceCents: row.priceCents,
    imageUrl: row.imageUrl,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  };
}

export const offerService = new OfferService();
