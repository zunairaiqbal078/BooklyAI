import { describe, expect, it } from "vitest";
import { signAccessToken, verifyAccessToken } from "./jwt.js";
import { UnauthorizedError } from "./app-error.js";

describe("jwt helpers", () => {
  it("signs and verifies a payload", () => {
    const token = signAccessToken({ sub: "11111111-1111-4111-8111-111111111111", role: "CUSTOMER" });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe("11111111-1111-4111-8111-111111111111");
    expect(payload.role).toBe("CUSTOMER");
  });

  it("rejects tampered tokens", () => {
    const token = signAccessToken({ sub: "11111111-1111-4111-8111-111111111111", role: "CUSTOMER" });
    expect(() => verifyAccessToken(`${token}x`)).toThrow(UnauthorizedError);
  });
});
