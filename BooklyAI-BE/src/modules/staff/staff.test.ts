import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../config/database.js";
import { combineDateAndTimeUtc } from "../../utils/time.js";

const app = createApp();

const BUSINESS_ID = "33333333-3333-4333-8333-333333333333";
const SERVICE_ID = "44444444-4444-4444-8444-444444444441";

const cleanupStaffIds: string[] = [];
const cleanupAppointmentIds: string[] = [];

afterAll(async () => {
  if (cleanupAppointmentIds.length > 0) {
    await prisma.appointment.deleteMany({
      where: { id: { in: cleanupAppointmentIds } },
    });
  }
  if (cleanupStaffIds.length > 0) {
    await prisma.staffLeave.deleteMany({
      where: { staffId: { in: cleanupStaffIds } },
    });
    await prisma.staffAvailabilityRule.deleteMany({
      where: { staffId: { in: cleanupStaffIds } },
    });
    await prisma.staffMember.deleteMany({
      where: { id: { in: cleanupStaffIds } },
    });
  }
  await prisma.$disconnect();
});

async function loginAsBusiness() {
  const agent = request.agent(app);
  const login = await agent.post("/api/auth/login").send({
    email: "business@booklyai.dev",
    password: "Demo1234!",
  });
  expect(login.status).toBe(200);
  return agent;
}

async function loginAsCustomer() {
  const agent = request.agent(app);
  const login = await agent.post("/api/auth/login").send({
    email: "customer@booklyai.dev",
    password: "Demo1234!",
  });
  expect(login.status).toBe(200);
  return agent;
}

function nextWeekday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 3);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d.toISOString().slice(0, 10);
}

describe("Staff Management & Staff-Scoped Concurrency", () => {
  let staffAId: string;
  let staffBId: string;

  it("creates a new staff member with custom permissions", async () => {
    const bizAgent = await loginAsBusiness();

    const res = await bizAgent.post("/api/staff").send({
      name: "Dr. Maya Lin",
      email: "maya.lin@example.com",
      title: "Senior Dermatologist",
      permissions: ["VIEW_CALENDAR", "CHAT_CLIENTS", "MANAGE_CALENDAR"],
      serviceIds: [SERVICE_ID],
      workingHours: [
        { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
        { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
        { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" },
        { dayOfWeek: 4, startTime: "09:00", endTime: "17:00" },
        { dayOfWeek: 5, startTime: "09:00", endTime: "17:00" },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.staff.name).toBe("Dr. Maya Lin");
    expect(res.body.data.staff.permissions).toContain("VIEW_CALENDAR");
    expect(res.body.data.staff.permissions).toContain("CHAT_CLIENTS");

    staffAId = res.body.data.staff.id;
    cleanupStaffIds.push(staffAId);
  });

  it("lists staff members for the business", async () => {
    const bizAgent = await loginAsBusiness();
    const res = await bizAgent.get("/api/staff");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const names = res.body.data.staff.map((s: { name: string }) => s.name);
    expect(names).toContain("Dr. Maya Lin");
  });

  it("adds and lists leaves for a staff member", async () => {
    const bizAgent = await loginAsBusiness();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 10);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 3);

    const addLeaveRes = await bizAgent.post(`/api/staff/${staffAId}/leaves`).send({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      reason: "Annual Conference",
      status: "APPROVED",
    });

    expect(addLeaveRes.status).toBe(201);
    expect(addLeaveRes.body.data.leave.reason).toBe("Annual Conference");

    const listLeavesRes = await bizAgent.get(`/api/staff/${staffAId}/leaves`);
    expect(listLeavesRes.status).toBe(200);
    expect(listLeavesRes.body.data.leaves.length).toBeGreaterThan(0);
  });

  it("forbids customers from accessing staff management", async () => {
    const custAgent = await loginAsCustomer();
    const res = await custAgent.post("/api/staff").send({
      name: "Hacker Staff",
    });
    expect(res.status).toBe(403);
  });

  it("allows two appointments for DIFFERENT staff at the same time", async () => {
    const bizAgent = await loginAsBusiness();

    // Create Staff B
    const createB = await bizAgent.post("/api/staff").send({
      name: "Dr. Ethan Cole",
      title: "Holistic Physician",
      permissions: ["VIEW_CALENDAR"],
      serviceIds: [SERVICE_ID],
    });
    expect(createB.status).toBe(201);
    staffBId = createB.body.data.staff.id;
    cleanupStaffIds.push(staffBId);

    const custAgent = await loginAsCustomer();
    const date = nextWeekday();
    const startTime1 = combineDateAndTimeUtc(date, "11:00").toISOString();

    // 1. Book Staff A at 11:00
    const bookStaffA = await custAgent.post("/api/appointments").send({
      businessId: BUSINESS_ID,
      serviceId: SERVICE_ID,
      staffId: staffAId,
      startTime: startTime1,
      notes: "Session with Dr. Maya",
    });
    expect(bookStaffA.status).toBe(201);
    expect(bookStaffA.body.data.appointment.staffId).toBe(staffAId);
    cleanupAppointmentIds.push(bookStaffA.body.data.appointment.id);

    // 2. Book Staff B at the EXACT SAME TIME 11:00 (Must succeed because different staff!)
    const bookStaffB = await custAgent.post("/api/appointments").send({
      businessId: BUSINESS_ID,
      serviceId: SERVICE_ID,
      staffId: staffBId,
      startTime: startTime1,
      notes: "Session with Dr. Ethan",
    });
    expect(bookStaffB.status).toBe(201);
    expect(bookStaffB.body.data.appointment.staffId).toBe(staffBId);
    cleanupAppointmentIds.push(bookStaffB.body.data.appointment.id);
  });

  it("rejects overlapping booking for the SAME staff member with 409 Conflict", async () => {
    const custAgent = await loginAsCustomer();
    const date = nextWeekday();
    const startTime1 = combineDateAndTimeUtc(date, "11:00").toISOString();

    // Attempt to book Staff A AGAIN at 11:00 -> Hard rejection!
    const conflictRes = await custAgent.post("/api/appointments").send({
      businessId: BUSINESS_ID,
      serviceId: SERVICE_ID,
      staffId: staffAId,
      startTime: startTime1,
      notes: "Double-booking attempt with Dr. Maya",
    });

    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.error.code).toBe("APPOINTMENT_CONFLICT");
  });
});
