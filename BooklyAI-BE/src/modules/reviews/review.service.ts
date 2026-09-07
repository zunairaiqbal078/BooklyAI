import { prisma } from "../../config/database.js";
import type { AuthUser } from "../../types/index.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../utils/app-error.js";
import type { CreateReviewInput } from "./review.schema.js";

export class ReviewService {
  async createForAppointment(
    user: AuthUser,
    appointmentId: string,
    input: CreateReviewInput,
  ) {
    if (user.role !== "CUSTOMER") {
      throw new ForbiddenError("Only customers can leave reviews.");
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { review: { select: { id: true } } },
    });

    if (!appointment) {
      throw new NotFoundError("Appointment not found.");
    }
    if (appointment.customerId !== user.id) {
      throw new ForbiddenError("You can only review your own appointments.");
    }
    if (appointment.status !== "COMPLETED") {
      throw new ValidationError("You can only review completed appointments.");
    }
    if (appointment.review) {
      throw new ConflictError("ALREADY_REVIEWED", "This appointment already has a review.");
    }

    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          businessId: appointment.businessId,
          serviceId: appointment.serviceId,
          customerId: user.id,
          appointmentId: appointment.id,
          rating: input.rating,
          comment: input.comment ?? null,
        },
        select: {
          id: true,
          businessId: true,
          serviceId: true,
          customerId: true,
          appointmentId: true,
          rating: true,
          comment: true,
          createdAt: true,
          customer: { select: { name: true } },
          service: { select: { name: true } },
        },
      });

      const agg = await tx.review.aggregate({
        where: { businessId: appointment.businessId },
        _avg: { rating: true },
        _count: { _all: true },
      });

      await tx.business.update({
        where: { id: appointment.businessId },
        data: {
          ratingAvg: agg._avg.rating ?? 0,
          reviewCount: agg._count._all,
        },
      });

      return created;
    });

    return {
      id: review.id,
      businessId: review.businessId,
      serviceId: review.serviceId,
      serviceName: review.service.name,
      customerId: review.customerId,
      customerName: review.customer.name,
      appointmentId: review.appointmentId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
    };
  }
}

export const reviewService = new ReviewService();
