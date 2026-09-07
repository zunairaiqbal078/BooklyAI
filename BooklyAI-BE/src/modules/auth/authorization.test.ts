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

  it("blocks business owners from the customer assistant", async () => {
    const agent = request.agent(app);
    const login = await agent.post("/api/auth/login").send({
      email: "business@booklyai.dev",
      password: "Demo1234!",
    });
    expect(login.status).toBe(200);

    const chat = await agent.post("/api/chat/messages").send({
      message: "Book a consultation tomorrow",
    });
    expect(chat.status).toBe(403);
    expect(chat.body.error.code).toBe("FORBIDDEN");
  });
});
