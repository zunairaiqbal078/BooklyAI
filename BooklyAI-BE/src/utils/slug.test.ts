import { describe, expect, it } from "vitest";
import { slugify } from "./slug.js";

describe("slugify", () => {
  it("normalizes business names", () => {
    expect(slugify("Northside Wellness")).toBe("northside-wellness");
    expect(slugify("  Hello!!! World  ")).toBe("hello-world");
  });

  it("falls back when empty", () => {
    expect(slugify("!!!")).toBe("business");
  });
});
