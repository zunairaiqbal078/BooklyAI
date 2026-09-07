import { prisma } from "../../config/database.js";
import type { ListServicesQuery } from "./service.schema.js";

/** Catalog of bookable offerings (optionally filtered by business). */
export class ServiceCatalogService {
  async list(query: ListServicesQuery) {
    return prisma.service.findMany({
      where: {
        isActive: true,
        ...(query.businessId ? { businessId: query.businessId } : {}),
      },
      orderBy: [{ businessId: "asc" }, { name: "asc" }],
      select: {
        id: true,
        businessId: true,
        name: true,
        description: true,
        durationMin: true,
        priceCents: true,
      },
    });
  }
}

export const serviceCatalogService = new ServiceCatalogService();
