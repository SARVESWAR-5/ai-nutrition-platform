import { describe, it, expect } from "vitest";
import { waterService } from "@/lib/services/water-service";

describe("WaterService (Hydration Tracking)", () => {
  const testDate = "2026-11-01";

  it("logs water intake and calculates daily totals", () => {
    waterService.logWater(testDate, 250);
    waterService.logWater(testDate, 500);

    const total = waterService.getTotalWaterForDate(testDate);
    expect(total).toBe(750);
  });

  it("calculates hydration progress against target", () => {
    const progress = waterService.getWaterProgress(testDate, 3000);
    expect(progress.target).toBe(3000);
    expect(progress.consumed).toBe(750);
    expect(progress.remaining).toBe(2250);
    expect(progress.percentComplete).toBe(25);
  });

  it("deletes a water log entry and updates total", () => {
    const logs = waterService.getWaterLogsForDate(testDate);
    const idToDelete = logs[0].id;

    const success = waterService.deleteWaterLog(idToDelete);
    expect(success).toBe(true);

    const newTotal = waterService.getTotalWaterForDate(testDate);
    expect(newTotal).toBe(500);
  });
});
