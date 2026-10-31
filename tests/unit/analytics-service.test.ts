import { describe, it, expect, beforeEach } from "vitest";
import { progressAnalysisService } from "@/lib/services/analytics-service";
import { diaryService } from "@/lib/services/diary-service";
import { waterService } from "@/lib/services/water-service";

describe("ProgressAnalysisService (Historical Summaries & Reports)", () => {
  beforeEach(() => {
    const today = new Date().toISOString().split("T")[0];
    diaryService.addEntry({
      diaryDate: today,
      mealCategory: "lunch",
      foodName: "Grilled chicken breast with rice",
      quantity: 200,
      unit: "g",
      preparationMethod: "grilled",
      isCooked: true,
      confidenceLabel: "verified",
      calories: 450,
      proteinG: 45,
      carbsG: 40,
      fatG: 8,
      fibreG: 3,
      consumedAt: `${today}T13:00:00+05:30`,
    });
    waterService.logWater(today, 1500);
  });

  it("calculates 7-day analytical summary without converting missing days to zero", () => {
    const summary = progressAnalysisService.getAnalyticsSummary("7_days");

    expect(summary.range).toBe("7_days");
    expect(summary.averageCalories).toBeGreaterThan(0);
    expect(summary.averageProtein).toBeGreaterThan(0);
  });

  it("generates structured progress report with uncertainty notes", async () => {
    const report = await progressAnalysisService.generateReport("7_days");

    expect(report.title).toContain("Weekly");
    expect(report.successfulHabits.length).toBeGreaterThan(0);
    expect(report.areasForImprovement.length).toBeGreaterThan(0);
    expect(report.supportedTrends.length).toBeGreaterThan(0);
    expect(report.uncertaintyNotes.length).toBeGreaterThan(0);
  });
});
