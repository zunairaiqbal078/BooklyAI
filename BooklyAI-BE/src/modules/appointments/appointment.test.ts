import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../config/database.js";
import { addMinutes, combineDateAndTimeUtc } from "../../utils/time.js";

const app = createApp();

const BUSINESS_ID = "33333333-3333-4333-8333-333333333333";
const SERVICE_ID = "44444444-4444-4444-8444-444444444441";

const createdAppointmentIds: string[] = [];

afterAll(async () => {
  if (createdAppointmentIds.length > 0) {
    await prisma.appointment.deleteMany({
      where: { id: { in: createdAppointmentIds } },
    });
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

async function loginAsBusiness() {
  const agent = request.agent(app);
  const login = await agent.post("/api/auth/login").send({
    email: "business@booklyai.dev",
    password: "Demo1234!",
  });
  expect(login.status).toBe(200);
  return agent;
}

/** Next weekday (Mon–Fri) at least 2 days ahead, for open seed hours. */
function nextOpenDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 2);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d.toISOString().slice(0, 10);
}

describe("Appointments & availability", () => {
  it("returns real availability slots for a business day", async () => {
    const agent = await loginAsCustomer();
    const date = nextOpenDate();

    const response = await agent.get("/api/availability").query({
      businessId: BUSINESS_ID,
      date,
      serviceId: SERVICE_ID,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.date).toBe(date);
    expect(Array.isArray(response.body.data.slots)).toBe(true);
    expect(response.body.data.slots.length).toBeGreaterThan(0);
    expect(response.body.data.slots[0]).toMatch(/^\d{2}:\d{2}$/);
  });

  it("creates an appointment and rejects overlapping bookings", async () => {
    const agent = await loginAsCustomer();
    const date = nextOpenDate();

    const availability = await agent.get("/api/availability").query({
      businessId: BUSINESS_ID,
      date,
      serviceId: SERVICE_ID,
    });

    const slot = availability.body.data.slots[0] as string;
    expect(slot).toBeTruthy();

    const startTime = combineDateAndTimeUtc(date, slot).toISOString();

    const created = await agent.post("/api/appointments").send({
      businessId: BUSINESS_ID,
      serviceId: SERVICE_ID,
      startTime,
    });

    expect(created.status).toBe(201);
    expect(created.body.data.appointment.status).toBe("CONFIRMED");
    expect(created.body.data.appointment.service).toBe("General consultation");
    createdAppointmentIds.push(created.body.data.appointment.id);

    const conflict = await agent.post("/api/appointments").send({
      businessId: BUSINESS_ID,
      serviceId: SERVICE_ID,
      startTime,
    });

    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe("APPOINTMENT_CONFLICT");
  });

  it("lists appointments for the customer and forbids business-owner booking", async () => {
    const customer = await loginAsCustomer();
    const list = await customer.get("/api/appointments");
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.data.appointments)).toBe(true);

    const business = await loginAsBusiness();
    const attempt = await business.post("/api/appointments").send({
      businessId: BUSINESS_ID,
      serviceId: SERVICE_ID,
      startTime: addMinutes(new Date(), 48 * 60).toISOString(),
    });
    expect(attempt.status).toBe(403);
  });

  it("allows the customer to cancel their appointment", async () => {
    const agent = await loginAsCustomer();
    const date = nextOpenDate();

    const availability = await agent.get("/api/availability").query({
      businessId: BUSINESS_ID,
      date,
      serviceId: SERVICE_ID,
    });

    // Use a later slot so we don't collide with the previous test's booking.
    const slots = availability.body.data.slots as string[];
    const slot = slots[Math.min(2, slots.length - 1)]!;
    const startTime = combineDateAndTimeUtc(date, slot).toISOString();

    const created = await agent.post("/api/appointments").send({
      businessId: BUSINESS_ID,
      serviceId: SERVICE_ID,
      startTime,
    });
    expect(created.status).toBe(201);
    const id = created.body.data.appointment.id as string;
    createdAppointmentIds.push(id);

    const cancelled = await agent.patch(`/api/appointments/${id}/cancel`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.appointment.status).toBe("CANCELLED");
  });

  it("returns a role-aware calendar range", async () => {
    const agent = await loginAsCustomer();
    const from = new Date();
    from.setUTCDate(from.getUTCDate() - 14);
    const to = new Date();
    to.setUTCDate(to.getUTCDate() + 14);

    const response = await agent.get("/api/calendar").query({
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data.appointments)).toBe(true);
  });

  it("lists businesses and services", async () => {
    const agent = await loginAsCustomer();
    const businesses = await agent.get("/api/businesses");
    expect(businesses.status).toBe(200);
    expect(businesses.body.data.businesses.length).toBeGreaterThan(0);

    const services = await agent.get(`/api/businesses/${BUSINESS_ID}/services`);
    expect(services.status).toBe(200);
    expect(services.body.data.services.some((s: { name: string }) => s.name.includes("consultation"))).toBe(
      true,
    );
  });

  it("prevents a customer from reading another customer's appointment", async () => {
    const email = `other.${Date.now()}@booklyai.test`;
    const register = await request(app).post("/api/auth/register").send({
      name: "Other Customer",
      email,
      password: "SecurePass1!",
      role: "CUSTOMER",
    });
    expect(register.status).toBe(201);

    const otherAgent = request.agent(app);
    await otherAgent.post("/api/auth/login").send({
      email,
      password: "SecurePass1!",
    });

    const seededId = "55555555-5555-4555-8555-555555555551";
    const response = await otherAgent.get(`/api/appointments/${seededId}`);
    expect(response.status).toBe(403);

    await prisma.user.delete({ where: { email } });
  });
});
