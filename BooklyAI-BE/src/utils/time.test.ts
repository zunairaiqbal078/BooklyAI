import { describe, expect, it } from "vitest";
import {
  addMinutes,
  combineDateAndTimeUtc,
  minutesToHm,
  parseHmToMinutes,
  rangesOverlap,
} from "./time.js";

describe("time utils", () => {
  it("parses and formats HH:mm", () => {
    expect(parseHmToMinutes("09:30")).toBe(570);
    expect(minutesToHm(570)).toBe("09:30");
  });

  it("combines date and time in UTC", () => {
    const date = combineDateAndTimeUtc("2026-09-08", "15:30");
    expect(date.toISOString()).toBe("2026-09-08T15:30:00.000Z");
    expect(addMinutes(date, 45).toISOString()).toBe("2026-09-08T16:15:00.000Z");
  });

  it("detects overlapping ranges", () => {
    const aStart = combineDateAndTimeUtc("2026-09-08", "15:00");
    const aEnd = combineDateAndTimeUtc("2026-09-08", "16:00");
    const bStart = combineDateAndTimeUtc("2026-09-08", "15:30");
    const bEnd = combineDateAndTimeUtc("2026-09-08", "16:30");
    const cStart = combineDateAndTimeUtc("2026-09-08", "16:00");
    const cEnd = combineDateAndTimeUtc("2026-09-08", "17:00");

    expect(rangesOverlap(aStart, aEnd, bStart, bEnd)).toBe(true);
    expect(rangesOverlap(aStart, aEnd, cStart, cEnd)).toBe(false);
  });
});
