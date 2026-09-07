import "dotenv/config";
import bcrypt from "bcryptjs";
import {
  PrismaClient,
  AppointmentStatus,
  BusinessCategory,
  ChatRole,
  UserRole,
} from "@prisma/client";

const prisma = new PrismaClient();

/** Stable demo UUIDs so docs and local scripts can reference the same rows. */
const IDS = {
  customer: "11111111-1111-4111-8111-111111111111",
  businessOwner: "22222222-2222-4222-8222-222222222222",
  business: "33333333-3333-4333-8333-333333333333",
  serviceConsultation: "44444444-4444-4444-8444-444444444441",
  serviceFollowUp: "44444444-4444-4444-8444-444444444442",
  salonOwner: "22222222-2222-4222-8222-222222222223",
  salonBusiness: "33333333-3333-4333-8333-333333333334",
  serviceHaircut: "44444444-4444-4444-8444-444444444443",
  serviceColor: "44444444-4444-4444-8444-444444444444",
  aptUpcoming: "55555555-5555-4555-8555-555555555551",
  aptToday: "55555555-5555-4555-8555-555555555552",
  aptCompleted: "55555555-5555-4555-8555-555555555553",
  aptCancelled: "55555555-5555-4555-8555-555555555554",
  aptSalonCompleted1: "55555555-5555-4555-8555-555555555555",
  aptSalonCompleted2: "55555555-5555-4555-8555-555555555556",
  aptWellnessCompleted2: "55555555-5555-4555-8555-555555555557",
  customer2: "11111111-1111-4111-8111-111111111112",
  offerWellness1: "99999999-9999-4999-8999-999999999991",
  offerWellness2: "99999999-9999-4999-8999-999999999992",
  offerSalon1: "99999999-9999-4999-8999-999999999993",
  offerSalon2: "99999999-9999-4999-8999-999999999994",
  review1: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  review2: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
  review3: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
  review4: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4",
  chatSession: "66666666-6666-4666-8666-666666666666",
  msg1: "77777777-7777-4777-8777-777777777771",
  msg2: "77777777-7777-4777-8777-777777777772",
  msg3: "77777777-7777-4777-8777-777777777773",
  msg4: "77777777-7777-4777-8777-777777777774",
  aiInteraction: "88888888-8888-4888-8888-888888888888",
} as const;

const DEMO_PASSWORD = "Demo1234!";

function atLocalDay(base: Date, dayOffset: number, hour: number, minute: number): Date {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function seed(): Promise<void> {
  // Wipe in FK-safe order so re-seeding is idempotent for local demos.
  await prisma.aiInteraction.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.review.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.availabilityRule.deleteMany();
  await prisma.service.deleteMany();
  await prisma.business.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const now = new Date();

  const customer = await prisma.user.create({
    data: {
      id: IDS.customer,
      email: "customer@booklyai.dev",
      name: "Ava Chen",
      role: UserRole.CUSTOMER,
      passwordHash,
    },
  });

  const owner = await prisma.user.create({
    data: {
      id: IDS.businessOwner,
      email: "business@booklyai.dev",
      name: "Jordan Blake",
      role: UserRole.BUSINESS,
      passwordHash,
    },
  });

  const business = await prisma.business.create({
    data: {
      id: IDS.business,
      ownerId: owner.id,
      name: "Northside Wellness",
      slug: "northside-wellness",
      description: "Consultations and follow-ups with a calm, unhurried pace.",
      category: BusinessCategory.WELLNESS,
      city: "Austin",
      address: "1200 North Lamar Blvd",
      coverImageUrl:
        "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80",
      timezone: "UTC",
      isPublished: true,
      onboardingComplete: true,
      ratingAvg: 0,
      reviewCount: 0,
    },
  });

  const consultation = await prisma.service.create({
    data: {
      id: IDS.serviceConsultation,
      businessId: business.id,
      name: "General consultation",
      description: "45-minute first visit or general check-in.",
      durationMin: 45,
      priceCents: 9000,
      imageUrl:
        "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
      isActive: true,
    },
  });

  const followUp = await prisma.service.create({
    data: {
      id: IDS.serviceFollowUp,
      businessId: business.id,
      name: "Follow-up",
      description: "30-minute return visit.",
      durationMin: 30,
      priceCents: 6000,
      imageUrl:
        "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80",
      isActive: true,
    },
  });

  // Mon–Fri 09:00–17:00, 30-minute grid (JS dayOfWeek: 1=Mon … 5=Fri).
  await prisma.availabilityRule.createMany({
    data: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      businessId: business.id,
      dayOfWeek,
      startTime: "09:00",
      endTime: "17:00",
      slotMin: 30,
    })),
  });

  const salonOwner = await prisma.user.create({
    data: {
      id: IDS.salonOwner,
      email: "salon@booklyai.dev",
      name: "Maya Ortiz",
      role: UserRole.BUSINESS,
      passwordHash,
    },
  });

  const salon = await prisma.business.create({
    data: {
      id: IDS.salonBusiness,
      ownerId: salonOwner.id,
      name: "Lumen Hair Studio",
      slug: "lumen-hair-studio",
      description: "Modern cuts, color, and blowouts in South Austin.",
      category: BusinessCategory.SALON,
      city: "Austin",
      address: "4800 South Congress Ave",
      coverImageUrl:
        "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80",
      timezone: "UTC",
      isPublished: true,
      onboardingComplete: true,
      ratingAvg: 0,
      reviewCount: 0,
    },
  });

  await prisma.service.createMany({
    data: [
      {
        id: IDS.serviceHaircut,
        businessId: salon.id,
        name: "Signature haircut",
        description: "Cut, wash, and style.",
        durationMin: 45,
        priceCents: 5500,
        imageUrl:
          "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=800&q=80",
        isActive: true,
      },
      {
        id: IDS.serviceColor,
        businessId: salon.id,
        name: "Color refresh",
        description: "Single-process color with gloss.",
        durationMin: 90,
        priceCents: 12000,
        imageUrl:
          "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80",
        isActive: true,
      },
    ],
  });

  await prisma.offer.createMany({
    data: [
      {
        id: IDS.offerWellness1,
        businessId: business.id,
        serviceId: consultation.id,
        title: "New client calm start",
        description: "First consultation with guided intake and pacing tips.",
        priceCents: 7900,
        imageUrl:
          "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
        isActive: true,
      },
      {
        id: IDS.offerWellness2,
        businessId: business.id,
        serviceId: followUp.id,
        title: "2-visit follow-up pack",
        description: "Bundle of two follow-ups at a soft discount.",
        priceCents: 11000,
        imageUrl:
          "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80",
        isActive: true,
      },
      {
        id: IDS.offerSalon1,
        businessId: salon.id,
        serviceId: IDS.serviceHaircut,
        title: "Friday cut special",
        description: "Signature cut with complimentary styling spray.",
        priceCents: 4900,
        imageUrl:
          "https://images.unsplash.com/photo-1599351431202-1e0f11030869?auto=format&fit=crop&w=800&q=80",
        isActive: true,
      },
      {
        id: IDS.offerSalon2,
        businessId: salon.id,
        serviceId: IDS.serviceColor,
        title: "Gloss & glow",
        description: "Color refresh with shine treatment.",
        priceCents: 10900,
        imageUrl:
          "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=800&q=80",
        isActive: true,
      },
    ],
  });

  await prisma.availabilityRule.createMany({
    data: [2, 3, 4, 5, 6].map((dayOfWeek) => ({
      businessId: salon.id,
      dayOfWeek,
      startTime: "10:00",
      endTime: "18:00",
      slotMin: 30,
    })),
  });

  const customer2 = await prisma.user.create({
    data: {
      id: IDS.customer2,
      email: "customer2@booklyai.dev",
      name: "Sam Rivera",
      role: UserRole.CUSTOMER,
      passwordHash,
    },
  });

  const tomorrowAfternoon = atLocalDay(now, 1, 15, 30);
  const todayMorning = atLocalDay(now, 0, 10, 0);
  const lastWeek = atLocalDay(now, -7, 14, 0);
  const twoWeeksAgo = atLocalDay(now, -14, 11, 0);
  const tenDaysAgo = atLocalDay(now, -10, 15, 0);
  const cancelledSlot = atLocalDay(now, 2, 11, 0);

  await prisma.appointment.createMany({
    data: [
      {
        id: IDS.aptUpcoming,
        businessId: business.id,
        customerId: customer.id,
        serviceId: consultation.id,
        startTime: tomorrowAfternoon,
        endTime: new Date(tomorrowAfternoon.getTime() + 45 * 60_000),
        status: AppointmentStatus.CONFIRMED,
        notes: "Seeded upcoming consultation",
      },
      {
        id: IDS.aptToday,
        businessId: business.id,
        customerId: customer.id,
        serviceId: followUp.id,
        startTime: todayMorning,
        endTime: new Date(todayMorning.getTime() + 30 * 60_000),
        status: AppointmentStatus.CONFIRMED,
        notes: "Seeded today's follow-up",
      },
      {
        id: IDS.aptCompleted,
        businessId: business.id,
        customerId: customer.id,
        serviceId: consultation.id,
        startTime: lastWeek,
        endTime: new Date(lastWeek.getTime() + 45 * 60_000),
        status: AppointmentStatus.COMPLETED,
        reviewRequested: true,
      },
      {
        id: IDS.aptWellnessCompleted2,
        businessId: business.id,
        customerId: customer2.id,
        serviceId: followUp.id,
        startTime: twoWeeksAgo,
        endTime: new Date(twoWeeksAgo.getTime() + 30 * 60_000),
        status: AppointmentStatus.COMPLETED,
        reviewRequested: true,
      },
      {
        id: IDS.aptCancelled,
        businessId: business.id,
        customerId: customer.id,
        serviceId: followUp.id,
        startTime: cancelledSlot,
        endTime: new Date(cancelledSlot.getTime() + 30 * 60_000),
        status: AppointmentStatus.CANCELLED,
        notes: "Customer cancelled",
      },
      {
        id: IDS.aptSalonCompleted1,
        businessId: salon.id,
        customerId: customer.id,
        serviceId: IDS.serviceHaircut,
        startTime: tenDaysAgo,
        endTime: new Date(tenDaysAgo.getTime() + 45 * 60_000),
        status: AppointmentStatus.COMPLETED,
        reviewRequested: true,
      },
      {
        id: IDS.aptSalonCompleted2,
        businessId: salon.id,
        customerId: customer2.id,
        serviceId: IDS.serviceColor,
        startTime: twoWeeksAgo,
        endTime: new Date(twoWeeksAgo.getTime() + 90 * 60_000),
        status: AppointmentStatus.COMPLETED,
        reviewRequested: true,
      },
    ],
  });

  await prisma.review.createMany({
    data: [
      {
        id: IDS.review1,
        businessId: business.id,
        serviceId: consultation.id,
        customerId: customer.id,
        appointmentId: IDS.aptCompleted,
        rating: 5,
        comment: "Calm pace and clear next steps. Highly recommend.",
      },
      {
        id: IDS.review2,
        businessId: business.id,
        serviceId: followUp.id,
        customerId: customer2.id,
        appointmentId: IDS.aptWellnessCompleted2,
        rating: 4,
        comment: "Helpful follow-up — easy to book again.",
      },
      {
        id: IDS.review3,
        businessId: salon.id,
        serviceId: IDS.serviceHaircut,
        customerId: customer.id,
        appointmentId: IDS.aptSalonCompleted1,
        rating: 5,
        comment: "Great cut and friendly stylists.",
      },
      {
        id: IDS.review4,
        businessId: salon.id,
        serviceId: IDS.serviceColor,
        customerId: customer2.id,
        appointmentId: IDS.aptSalonCompleted2,
        rating: 4,
        comment: "Color looks natural. Loved the gloss offer.",
      },
    ],
  });

  for (const businessId of [business.id, salon.id]) {
    const agg = await prisma.review.aggregate({
      where: { businessId },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await prisma.business.update({
      where: { id: businessId },
      data: {
        ratingAvg: agg._avg.rating ?? 0,
        reviewCount: agg._count._all,
      },
    });
  }

  const session = await prisma.chatSession.create({
    data: {
      id: IDS.chatSession,
      userId: customer.id,
      title: "Book consultation",
      metadata: { source: "seed" },
    },
  });

  await prisma.chatMessage.createMany({
    data: [
      {
        id: IDS.msg1,
        sessionId: session.id,
        role: ChatRole.USER,
        content: "I need an appointment tomorrow afternoon.",
      },
      {
        id: IDS.msg2,
        sessionId: session.id,
        role: ChatRole.ASSISTANT,
        content: "Sure. What type of consultation do you need?",
        metadata: { intent: "book_appointment", missingFields: ["service"] },
      },
      {
        id: IDS.msg3,
        sessionId: session.id,
        role: ChatRole.USER,
        content: "General consultation.",
      },
      {
        id: IDS.msg4,
        sessionId: session.id,
        role: ChatRole.ASSISTANT,
        content:
          "I have 2:00 PM, 3:30 PM, and 5:00 PM available. Which time works for you?",
        metadata: {
          intent: "book_appointment",
          service: "General consultation",
          offeredSlots: ["14:00", "15:30", "17:00"],
        },
      },
    ],
  });

  await prisma.aiInteraction.create({
    data: {
      id: IDS.aiInteraction,
      userId: customer.id,
      sessionId: session.id,
      model: "openai/gpt-oss-20b",
      intent: "book_appointment",
      success: true,
      latencyMs: 412,
      metadata: { confidence: 0.91, source: "seed" },
    },
  });

  console.info("Seed complete.");
  console.info("Demo customer: customer@booklyai.dev / Demo1234!");
  console.info("Demo business: business@booklyai.dev / Demo1234!");
  console.info("Demo salon: salon@booklyai.dev / Demo1234!");
  console.info(`Business: ${business.name} (${business.slug}) · ${salon.name} (${salon.slug})`);
}

seed()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
