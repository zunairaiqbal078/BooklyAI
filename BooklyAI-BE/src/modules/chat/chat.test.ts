import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../config/database.js";

const app = createApp();
const BUSINESS_ID = "33333333-3333-4333-8333-333333333333";
const SERVICE_ID = "44444444-4444-4444-8444-444444444441";

const createdAppointmentIds: string[] = [];
const createdSessionIds: string[] = [];

afterAll(async () => {
  if (createdAppointmentIds.length > 0) {
    await prisma.appointment.deleteMany({ where: { id: { in: createdAppointmentIds } } });
  }
  if (createdSessionIds.length > 0) {
    await prisma.chatMessage.deleteMany({ where: { sessionId: { in: createdSessionIds } } });
    await prisma.aiInteraction.deleteMany({ where: { sessionId: { in: createdSessionIds } } });
    await prisma.chatSession.deleteMany({ where: { id: { in: createdSessionIds } } });
  }
  await prisma.$disconnect();
});

async function loginAsCustomer() {
  const agent = request.agent(app);
  const login = await agent.post("/api/auth/login").send({
    email: "customer@booklyai.dev",
    password: "Demo1234!",
  });
  expect(login.status).toBe(200);
  return agent;
}

function nextOpenDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 3);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d.toISOString().slice(0, 10);
}

describe("Chat orchestration", () => {
  it("runs a multi-turn booking flow with backend slots and confirmation", async () => {
    const agent = await loginAsCustomer();
    const date = nextOpenDate();

    const first = await agent.post("/api/chat/messages").send({
      message: `I need a general consultation on ${date}`,
    });

    expect(first.status).toBe(200);
    expect(first.body.data.sessionId).toBeTruthy();
    createdSessionIds.push(first.body.data.sessionId);

    const firstMeta = first.body.data.assistantMessage.metadata;
    expect(firstMeta.type).toBe("slots");
    expect(Array.isArray(firstMeta.slots)).toBe(true);
    expect(firstMeta.slots.length).toBeGreaterThan(0);

    const slot = firstMeta.slots[0] as string;

    const second = await agent.post("/api/chat/messages").send({
      sessionId: first.body.data.sessionId,
      message: slot,
    });
    expect(second.status).toBe(200);
    expect(second.body.data.assistantMessage.metadata.type).toBe("confirmation");

    const third = await agent.post("/api/chat/messages").send({
      sessionId: first.body.data.sessionId,
      message: "Yes, confirm it",
    });
    expect(third.status).toBe(200);
    expect(third.body.data.assistantMessage.metadata.type).toBe("appointment");
    createdAppointmentIds.push(third.body.data.assistantMessage.metadata.appointment.id);

    const history = await agent.get(
      `/api/chat/sessions/${first.body.data.sessionId}/messages`,
    );
    expect(history.status).toBe(200);
    expect(history.body.data.messages.length).toBeGreaterThanOrEqual(6);
  });

  it("books through the fallback form endpoint", async () => {
    const agent = await loginAsCustomer();
    const date = nextOpenDate();

    const availability = await agent.get("/api/availability").query({
      businessId: BUSINESS_ID,
      date,
      serviceId: SERVICE_ID,
    });
    expect(availability.status).toBe(200);
    const slots = availability.body.data.slots as string[];
    // Prefer a late slot to reduce collision with the multi-turn test.
    const time = slots[Math.min(slots.length - 1, 8)]!;

    const booked = await agent.post("/api/chat/book").send({
      businessId: BUSINESS_ID,
      serviceId: SERVICE_ID,
      date,
      time,
    });

    expect(booked.status).toBe(201);
    expect(booked.body.data.assistantMessage.metadata.type).toBe("appointment");
    createdAppointmentIds.push(booked.body.data.assistantMessage.metadata.appointment.id);
    createdSessionIds.push(booked.body.data.sessionId);
  });

  it("lists upcoming appointments via chat", async () => {
    const agent = await loginAsCustomer();
    const response = await agent.post("/api/chat/messages").send({
      message: "Show my upcoming appointments",
    });
    expect(response.status).toBe(200);
    expect(response.body.data.assistantMessage.metadata.type).toBe("appointment_list");
    createdSessionIds.push(response.body.data.sessionId);
  });
});
