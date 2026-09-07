import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";

const app = createApp();

describe("Authorization guards", () => {
  it("blocks unauthenticated appointment access", async () => {
    const response = await request(app).get("/api/appointments");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("blocks unauthenticated chat access", async () => {
    const response = await request(app).post("/api/chat/messages").send({
      message: "Book something",
    });
    expect(response.status).toBe(401);
  });

  it("allows business owners to ask the assistant for schedule insights", async () => {
    const agent = request.agent(app);
    const login = await agent.post("/api/auth/login").send({
      email: "business@booklyai.dev",
      password: "Demo1234!",
    });
    expect(login.status).toBe(200);

    const chat = await agent.post("/api/chat/messages").send({
      message: "How many upcoming appointments do I have?",
    });
    expect(chat.status).toBe(200);
    expect(chat.body.data.assistantMessage.content.toLowerCase()).toMatch(
      /upcoming|summary|appointment/,
    );
  });

  it("blocks business owners from booking via the chat form", async () => {
    const agent = request.agent(app);
    const login = await agent.post("/api/auth/login").send({
      email: "business@booklyai.dev",
      password: "Demo1234!",
    });
    expect(login.status).toBe(200);

    const book = await agent.post("/api/chat/book").send({
      businessId: "33333333-3333-4333-8333-333333333333",
      serviceId: "44444444-4444-4444-8444-444444444441",
      date: "2099-01-05",
      time: "10:00",
    });
    expect(book.status).toBe(403);
  });
});
