import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database.js";
import { NotFoundError } from "../../utils/app-error.js";
import type { MarketplaceListQuery } from "./marketplace.schema.js";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export class MarketplaceService {
  async list(query: MarketplaceListQuery) {
    const where: Prisma.BusinessWhereInput = {
      isPublished: true,
      onboardingComplete: true,
      ...(query.category ? { category: query.category } : {}),
      ...(query.city
        ? { city: { equals: query.city, mode: "insensitive" } }
        : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { description: { contains: query.q, mode: "insensitive" } },
              { city: { contains: query.q, mode: "insensitive" } },
              {
                services: {
                  some: {
                    isActive: true,
                    name: { contains: query.q, mode: "insensitive" },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const businesses = await prisma.business.findMany({
      where,
      orderBy: [{ ratingAvg: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        category: true,
        city: true,
        address: true,
        coverImageUrl: true,
        timezone: true,
        ratingAvg: true,
        reviewCount: true,
        services: {
          where: { isActive: true },
          orderBy: { name: "asc" },
          take: 3,
          select: {
            id: true,
            name: true,
            durationMin: true,
            priceCents: true,
            imageUrl: true,
          },
        },
        offers: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 2,
          select: {
            id: true,
            title: true,
            imageUrl: true,
            priceCents: true,
            serviceId: true,
          },
        },
        _count: { select: { services: { where: { isActive: true } } } },
      },
    });

    return businesses.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description,
      category: b.category,
      city: b.city,
      address: b.address,
      coverImageUrl: b.coverImageUrl,
      timezone: b.timezone,
      ratingAvg: b.ratingAvg,
      reviewCount: b.reviewCount,
      activeServiceCount: b._count.services,
      sampleServices: b.services,
      sampleOffers: b.offers,
    }));
  }

  async getBySlug(slug: string) {
    const business = await prisma.business.findFirst({
      where: { slug, isPublished: true, onboardingComplete: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        category: true,
        city: true,
        address: true,
        coverImageUrl: true,
        timezone: true,
        ratingAvg: true,
        reviewCount: true,
        services: {
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            businessId: true,
            name: true,
            description: true,
            durationMin: true,
            priceCents: true,
            imageUrl: true,
          },
        },
        offers: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            businessId: true,
            serviceId: true,
            title: true,
            description: true,
            priceCents: true,
            imageUrl: true,
            service: { select: { id: true, name: true } },
          },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            customer: { select: { name: true } },
            service: { select: { id: true, name: true } },
          },
        },
        availabilityRules: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
          select: {
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            slotMin: true,
          },
        },
      },
    });

    if (!business) {
      throw new NotFoundError("Business not found.");
    }

    const { availabilityRules, services, offers, reviews, ...rest } = business;
    return {
      business: {
        ...rest,
        hours: availabilityRules.map((rule) => ({
          ...rule,
          dayLabel: DAY_LABELS[rule.dayOfWeek] ?? String(rule.dayOfWeek),
        })),
        reviewTeaser:
          rest.reviewCount > 0
            ? `${rest.ratingAvg.toFixed(1)} · ${rest.reviewCount} review${rest.reviewCount === 1 ? "" : "s"}`
            : "New on BooklyAI",
      },
      services,
      offers: offers.map((offer) => ({
        id: offer.id,
        businessId: offer.businessId,
        serviceId: offer.serviceId,
        serviceName: offer.service.name,
        title: offer.title,
        description: offer.description,
        priceCents: offer.priceCents,
        imageUrl: offer.imageUrl,
      })),
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
        customerName: review.customer.name,
        serviceId: review.service.id,
        serviceName: review.service.name,
      })),
    };
  }

  async listCities() {
    const rows = await prisma.business.findMany({
      where: {
        isPublished: true,
        onboardingComplete: true,
        city: { not: null },
      },
      distinct: ["city"],
      select: { city: true },
      orderBy: { city: "asc" },
    });
    return rows.map((r) => r.city!).filter(Boolean);
  }
}

export const marketplaceService = new MarketplaceService();
