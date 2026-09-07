import type { BusinessCategory, Prisma } from "@prisma/client";
import { prisma } from "../../config/database.js";
import type { AuthUser } from "../../types/index.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../../utils/app-error.js";
import { slugify } from "../../utils/slug.js";
import type {
  CompleteOnboardingInput,
  CreateServiceInput,
  ReplaceHoursInput,
  UpdateMyBusinessInput,
  UpdateServiceInput,
} from "./business.schema.js";

const publicSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  category: true,
  city: true,
  address: true,
  coverImageUrl: true,
  timezone: true,
  isPublished: true,
  onboardingComplete: true,
  ratingAvg: true,
  reviewCount: true,
  createdAt: true,
} satisfies Prisma.BusinessSelect;

function mapBusiness(
  row: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    category: BusinessCategory;
    city: string | null;
    address: string | null;
    coverImageUrl: string | null;
    timezone: string;
    isPublished: boolean;
    onboardingComplete: boolean;
    ratingAvg: number;
    reviewCount: number;
    createdAt: Date;
  },
  extras?: { activeServiceCount?: number },
) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: row.category,
    city: row.city,
    address: row.address,
    coverImageUrl: row.coverImageUrl,
    timezone: row.timezone,
    isPublished: row.isPublished,
    onboardingComplete: row.onboardingComplete,
    ratingAvg: row.ratingAvg,
    reviewCount: row.reviewCount,
    createdAt: row.createdAt.toISOString(),
    ...(extras?.activeServiceCount !== undefined
      ? { activeServiceCount: extras.activeServiceCount }
      : {}),
  };
}

function assertOwner(user: AuthUser): string {
  if (user.role !== "BUSINESS" || !user.businessId) {
    throw new ForbiddenError("Only business owners can manage a business profile.");
  }
  return user.businessId;
}

function assertHoursValid(hours: CompleteOnboardingInput["hours"]) {
  for (const rule of hours) {
    if (rule.startTime >= rule.endTime) {
      throw new ValidationError("Each hours row must end after it starts.");
    }
  }
}

export class BusinessService {
  async list() {
    const businesses = await prisma.business.findMany({
      where: { isPublished: true, onboardingComplete: true },
      orderBy: { name: "asc" },
      select: {
        ...publicSelect,
        _count: { select: { services: { where: { isActive: true } } } },
      },
    });

    return businesses.map((b) =>
      mapBusiness(b, { activeServiceCount: b._count.services }),
    );
  }

  async getById(id: string) {
    const business = await prisma.business.findUnique({
      where: { id },
      select: publicSelect,
    });

    if (!business) {
      throw new NotFoundError("Business not found.");
    }

    return mapBusiness(business);
  }

  async listServices(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!business) {
      throw new NotFoundError("Business not found.");
    }

    return prisma.service.findMany({
      where: { businessId, isActive: true },
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
    });
  }

  async getMine(user: AuthUser) {
    const businessId = assertOwner(user);
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        ...publicSelect,
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
            isActive: true,
          },
        },
        availabilityRules: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            slotMin: true,
          },
        },
      },
    });

    if (!business) {
      throw new NotFoundError("Business profile not found.");
    }

    const { services, availabilityRules, ...rest } = business;
    return {
      business: mapBusiness(rest),
      services,
      hours: availabilityRules,
    };
  }

  async updateMine(user: AuthUser, input: UpdateMyBusinessInput) {
    const businessId = assertOwner(user);
    const data: Prisma.BusinessUpdateInput = {};

    if (input.name !== undefined) {
      data.name = input.name;
      data.slug = await this.uniqueSlug(input.name, businessId);
    }
    if (input.description !== undefined) data.description = input.description;
    if (input.category !== undefined) data.category = input.category;
    if (input.city !== undefined) data.city = input.city;
    if (input.address !== undefined) data.address = input.address;
    if (input.coverImageUrl !== undefined) data.coverImageUrl = input.coverImageUrl;
    if (input.timezone !== undefined) data.timezone = input.timezone;
    if (input.isPublished !== undefined) {
      const current = await prisma.business.findUnique({
        where: { id: businessId },
        select: { onboardingComplete: true },
      });
      if (input.isPublished && !current?.onboardingComplete) {
        throw new ValidationError("Finish onboarding before publishing.");
      }
      data.isPublished = input.isPublished;
    }

    const business = await prisma.business.update({
      where: { id: businessId },
      data,
      select: publicSelect,
    });

    return mapBusiness(business);
  }

  async completeOnboarding(user: AuthUser, input: CompleteOnboardingInput) {
    const businessId = assertOwner(user);
    assertHoursValid(input.hours);

    const slug = await this.uniqueSlug(input.name, businessId);

    const business = await prisma.$transaction(async (tx) => {
      await tx.service.deleteMany({
        where: {
          businessId,
          appointments: { none: {} },
        },
      });
      await tx.service.updateMany({
        where: { businessId },
        data: { isActive: false },
      });
      await tx.availabilityRule.deleteMany({ where: { businessId } });

      if (input.services.length > 0) {
        await tx.service.createMany({
          data: input.services.map((service) => ({
            businessId,
            name: service.name,
            description: service.description ?? null,
            durationMin: service.durationMin,
            priceCents: service.priceCents ?? null,
            imageUrl: service.imageUrl ?? null,
            isActive: true,
          })),
        });
      }

      await tx.availabilityRule.createMany({
        data: input.hours.map((rule) => ({
          businessId,
          dayOfWeek: rule.dayOfWeek,
          startTime: rule.startTime,
          endTime: rule.endTime,
          slotMin: rule.slotMin,
        })),
      });

      return tx.business.update({
        where: { id: businessId },
        data: {
          name: input.name,
          slug,
          description: input.description ?? null,
          category: input.category,
          city: input.city,
          address: input.address ?? null,
          timezone: input.timezone,
          coverImageUrl: input.coverImageUrl ?? null,
          onboardingComplete: true,
          isPublished: input.publish,
        },
        select: publicSelect,
      });
    });

    return mapBusiness(business);
  }

  async createService(user: AuthUser, input: CreateServiceInput) {
    const businessId = assertOwner(user);
    return prisma.service.create({
      data: {
        businessId,
        name: input.name,
        description: input.description ?? null,
        durationMin: input.durationMin,
        priceCents: input.priceCents ?? null,
        imageUrl: input.imageUrl ?? null,
        isActive: true,
      },
      select: {
        id: true,
        businessId: true,
        name: true,
        description: true,
        durationMin: true,
        priceCents: true,
        imageUrl: true,
        isActive: true,
      },
    });
  }

  async updateService(user: AuthUser, serviceId: string, input: UpdateServiceInput) {
    const businessId = assertOwner(user);
    const existing = await prisma.service.findFirst({
      where: { id: serviceId, businessId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundError("Service not found.");
    }

    return prisma.service.update({
      where: { id: serviceId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.durationMin !== undefined ? { durationMin: input.durationMin } : {}),
        ...(input.priceCents !== undefined ? { priceCents: input.priceCents } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      select: {
        id: true,
        businessId: true,
        name: true,
        description: true,
        durationMin: true,
        priceCents: true,
        imageUrl: true,
        isActive: true,
      },
    });
  }

  async deleteService(user: AuthUser, serviceId: string) {
    const businessId = assertOwner(user);
    const existing = await prisma.service.findFirst({
      where: { id: serviceId, businessId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundError("Service not found.");
    }

    await prisma.$transaction([
      prisma.service.update({
        where: { id: serviceId },
        data: { isActive: false },
      }),
      prisma.offer.updateMany({
        where: { serviceId, businessId },
        data: { isActive: false },
      }),
    ]);
  }

  async replaceHours(user: AuthUser, input: ReplaceHoursInput) {
    const businessId = assertOwner(user);
    assertHoursValid(input.hours);

    await prisma.$transaction(async (tx) => {
      await tx.availabilityRule.deleteMany({ where: { businessId } });
      await tx.availabilityRule.createMany({
        data: input.hours.map((rule) => ({
          businessId,
          dayOfWeek: rule.dayOfWeek,
          startTime: rule.startTime,
          endTime: rule.endTime,
          slotMin: rule.slotMin,
        })),
      });
    });

    return prisma.availabilityRule.findMany({
      where: { businessId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      select: {
        id: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        slotMin: true,
      },
    });
  }

  private async uniqueSlug(name: string, excludeId: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let attempt = 0;
    while (attempt < 20) {
      const existing = await prisma.business.findFirst({
        where: { slug: candidate, NOT: { id: excludeId } },
        select: { id: true },
      });
      if (!existing) return candidate;
      attempt += 1;
      candidate = `${base}-${attempt + 1}`;
    }
    return `${base}-${Date.now().toString(36)}`;
  }
}

export const businessService = new BusinessService();
