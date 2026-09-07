import { prisma } from "../../config/database.js";
import { NotFoundError } from "../../utils/app-error.js";

export class BusinessService {
  async list() {
    const businesses = await prisma.business.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        timezone: true,
        _count: { select: { services: { where: { isActive: true } } } },
      },
    });

    return businesses.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description,
      timezone: b.timezone,
      activeServiceCount: b._count.services,
    }));
  }

  async getById(id: string) {
    const business = await prisma.business.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        timezone: true,
        createdAt: true,
      },
    });

    if (!business) {
      throw new NotFoundError("Business not found.");
    }

    return {
      ...business,
      createdAt: business.createdAt.toISOString(),
    };
  }

  async listServices(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!business) {
      throw new NotFoundError("Business not found.");
    }

    const services = await prisma.service.findMany({
      where: { businessId, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        businessId: true,
        name: true,
        description: true,
        durationMin: true,
      },
    });

    return services;
  }
}

export const businessService = new BusinessService();
