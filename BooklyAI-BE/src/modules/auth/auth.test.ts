import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";

const app = createApp();

function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@booklyai.test`;
}

const createdEmails: string[] = [];

afterAll(async () => {
  if (createdEmails.length > 0) {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  }
  await prisma.$disconnect();
});

describe("Auth API", () => {
  it("registers a customer and sets an HttpOnly cookie", async () => {
    const email = uniqueEmail("customer");
    createdEmails.push(email);

    const response = await request(app).post("/api/auth/register").send({
      name: "Test Customer",
      email,
      password: "SecurePass1!",
      role: "CUSTOMER",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(email);
    expect(response.body.data.user.role).toBe("CUSTOMER");
    expect(response.body.data.user.businessId).toBeNull();
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(response.body.data.token).toBeUndefined();

    const cookie = response.headers["set-cookie"] as string[] | undefined;
    expect(cookie?.[0]).toContain(`${env.AUTH_COOKIE_NAME}=`);
    expect(cookie?.[0]?.toLowerCase()).toContain("httponly");
  });

  it("registers a business with an owned business record", async () => {
    const email = uniqueEmail("business");
    createdEmails.push(email);

    const response = await request(app).post("/api/auth/register").send({
      name: "Owner Name",
      email,
      password: "SecurePass1!",
      role: "BUSINESS",
      businessName: "River Clinic",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.user.role).toBe("BUSINESS");
    expect(response.body.data.user.businessId).toBeTruthy();

    const business = await prisma.business.findUnique({
      where: { ownerId: response.body.data.user.id },
    });
    expect(business?.name).toBe("River Clinic");
    expect(business?.slug).toContain("river-clinic");
  });

  it("rejects business registration without a business name", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Owner",
      email: uniqueEmail("nobiz"),
      password: "SecurePass1!",
      role: "BUSINESS",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("logs in a seeded demo customer and returns /me", async () => {
    const agent = request.agent(app);

    const login = await agent.post("/api/auth/login").send({
      email: "customer@booklyai.dev",
      password: "Demo1234!",
    });

    expect(login.status).toBe(200);
    expect(login.body.data.user.email).toBe("customer@booklyai.dev");

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe("customer@booklyai.dev");
    expect(me.body.data.user.passwordHash).toBeUndefined();
  });

  it("rejects invalid credentials", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "customer@booklyai.dev",
      password: "wrong-password",
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 401 for /me without a cookie", async () => {
    const response = await request(app).get("/api/auth/me");
    expect(response.status).toBe(401);
  });

  it("logs out and clears the session cookie", async () => {
    const agent = request.agent(app);

    await agent.post("/api/auth/login").send({
      email: "customer@booklyai.dev",
      password: "Demo1234!",
    });

    const logout = await agent.post("/api/auth/logout");
    expect(logout.status).toBe(200);

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(401);
  });

  it("rejects duplicate email registration", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Ava",
      email: "customer@booklyai.dev",
      password: "SecurePass1!",
      role: "CUSTOMER",
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("EMAIL_IN_USE");
  });
});
