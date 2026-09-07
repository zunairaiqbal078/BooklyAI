import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, AppointmentStatus, ChatRole, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

/** Stable demo UUIDs so docs and local scripts can reference the same rows. */
const IDS = {
  customer: "11111111-1111-4111-8111-111111111111",
  businessOwner: "22222222-2222-4222-8222-222222222222",
  business: "33333333-3333-4333-8333-333333333333",
  serviceConsultation: "44444444-4444-4444-8444-444444444441",
  serviceFollowUp: "44444444-4444-4444-8444-444444444442",
  aptUpcoming: "55555555-5555-4555-8555-555555555551",
  aptToday: "55555555-5555-4555-8555-555555555552",
  aptCompleted: "55555555-5555-4555-8555-555555555553",
  aptCancelled: "55555555-5555-4555-8555-555555555554",
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
  await prisma.appointment.deleteMany();
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
      timezone: "UTC",
    },
  });

  const consultation = await prisma.service.create({
    data: {
      id: IDS.serviceConsultation,
      businessId: business.id,
      name: "General consultation",
      description: "45-minute first visit or general check-in.",
      durationMin: 45,
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

  const tomorrowAfternoon = atLocalDay(now, 1, 15, 30);
  const todayMorning = atLocalDay(now, 0, 10, 0);
  const lastWeek = atLocalDay(now, -7, 14, 0);
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
    ],
  });

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
      model: "mistral-small-latest",
      intent: "book_appointment",
      success: true,
      latencyMs: 412,
      metadata: { confidence: 0.91, source: "seed" },
    },
  });

  console.info("Seed complete.");
  console.info("Demo customer: customer@booklyai.dev / Demo1234!");
  console.info("Demo business: business@booklyai.dev / Demo1234!");
  console.info(`Business: ${business.name} (${business.slug})`);
}

seed()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
