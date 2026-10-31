import { describe, it, expect } from "vitest";
import {
  DEFAULT_TIMEZONE,
  getLocalTodayDateString,
  toLocalDateString,
  toLocalTimeString,
} from "@/lib/date/date-service";

describe("DateService", () => {
  it("uses Asia/Kolkata by default", () => {
    expect(DEFAULT_TIMEZONE).toBe("Asia/Kolkata");
  });

  it("formats date strings in Asia/Kolkata correctly across UTC day boundary", () => {
    // 2026-10-28 20:00:00 UTC is 2026-10-29 01:30:00 in Asia/Kolkata (+5:30)
    const utcDate = new Date("2026-10-28T20:00:00.000Z");
    const localDate = toLocalDateString(utcDate);
    expect(localDate).toBe("2026-10-29");

    const localTime = toLocalTimeString(utcDate);
    expect(localTime).toBe("1:30 AM");
  });

  it("preserves correct daytime conversion", () => {
    // 2026-10-29 07:30:00 UTC is 2026-10-29 13:00:00 in Asia/Kolkata (1:00 PM)
    const lunchUtc = new Date("2026-10-29T07:30:00.000Z");
    expect(toLocalDateString(lunchUtc)).toBe("2026-10-29");
    expect(toLocalTimeString(lunchUtc)).toBe("1:00 PM");
  });

  it("retrieves today's date formatted as YYYY-MM-DD", () => {
    const today = getLocalTodayDateString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
