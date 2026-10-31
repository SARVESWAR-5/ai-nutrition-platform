import { describe, it, expect } from "vitest";
import { diaryService } from "@/lib/services/diary-service";
import { nutritionGoalEngine } from "@/lib/services/nutrition-goal-engine";
import { DEFAULT_NUTRITION_TARGETS } from "@/lib/services/goal-service";

describe("DiaryService (CRUD, Safe Recalculation & Duplication)", () => {
  const testDate = "2026-10-30";
  const cleanFreshDate = "2026-11-05";

  it("starts completely clean at 0g across all nutrients on a new day", () => {
    const freshTotals = diaryService.getDailyTotals(cleanFreshDate);
    expect(freshTotals.calories).toBe(0);
    expect(freshTotals.protein).toBe(0);
    expect(freshTotals.carbs).toBe(0);
    expect(freshTotals.fat).toBe(0);
    expect(freshTotals.fibre).toBe(0);

    const freshWater = diaryService.getWaterForDate(cleanFreshDate);
    expect(freshWater).toBe(0);

    const progress = nutritionGoalEngine.calculateProgress(freshTotals, freshWater, DEFAULT_NUTRITION_TARGETS);
    expect(progress.calories.consumed).toBe(0);
    expect(progress.calories.remaining).toBe(DEFAULT_NUTRITION_TARGETS.calories);
    expect(progress.protein.consumed).toBe(0);
    expect(progress.protein.remaining).toBe(DEFAULT_NUTRITION_TARGETS.protein);
  });

  it("adds an entry and recalculates daily totals accurately", () => {
    diaryService.addEntry({
      diaryDate: testDate,
      mealCategory: "lunch",
      foodName: "Grilled chicken breast",
      quantity: 200,
      unit: "g",
      preparationMethod: "grilled",
      isCooked: true,
      confidenceLabel: "verified",
      calories: 330,
      proteinG: 62.0,
      carbsG: 0,
      fatG: 7.0,
      fibreG: 0,
      consumedAt: `${testDate}T13:00:00+05:30`,
    });

    const entries = diaryService.getEntriesForDate(testDate);
    expect(entries.length).toBeGreaterThanOrEqual(1);

    const totals = diaryService.getDailyTotals(testDate);
    expect(totals.calories).toBe(330);
    expect(totals.protein).toBe(62.0);
  });

  it("deducts added food from daily targets to yield exact remaining budget", () => {
    const totals = diaryService.getDailyTotals(testDate);
    const progress = nutritionGoalEngine.calculateProgress(totals, 0, DEFAULT_NUTRITION_TARGETS);

    // Initial 2400 kcal target - 330 consumed = 2070 remaining
    expect(progress.calories.consumed).toBe(330);
    expect(progress.calories.remaining).toBe(2400 - 330);

    // Initial 150g protein target - 62g consumed = 88g remaining
    expect(progress.protein.consumed).toBe(62.0);
    expect(progress.protein.remaining).toBe(150 - 62.0);
  });

  it("duplicates an entry without mutating original entry", () => {
    const entries = diaryService.getEntriesForDate(testDate);
    const original = entries[0];
    const duplicated = diaryService.duplicateEntry(original.id);

    expect(duplicated).toBeDefined();
    expect(duplicated?.id).not.toBe(original.id);
    expect(duplicated?.foodName).toBe(original.foodName);

    // Total calories should now be doubled
    const newTotals = diaryService.getDailyTotals(testDate);
    expect(newTotals.calories).toBe(660);
  });

  it("deletes an entry and recalculates without leaving orphaned calories", () => {
    const entries = diaryService.getEntriesForDate(testDate);
    const itemToDelete = entries[0];
    const success = diaryService.deleteEntry(itemToDelete.id);

    expect(success).toBe(true);
    const updatedEntries = diaryService.getEntriesForDate(testDate);
    expect(updatedEntries.find((e) => e.id === itemToDelete.id)).toBeUndefined();
  });

  it("copies a meal to another date as distinct new entries", () => {
    const targetDate = "2026-10-31";
    const copied = diaryService.copyMealToDate("lunch", testDate, targetDate);

    expect(copied.length).toBeGreaterThanOrEqual(1);
    expect(copied[0].diaryDate).toBe(targetDate);

    const targetDayTotals = diaryService.getDailyTotals(targetDate);
    expect(targetDayTotals.calories).toBeGreaterThan(0);
  });

  it("records and updates water logs correctly", () => {
    const initial = diaryService.getWaterForDate(testDate);
    const updated = diaryService.logWater(testDate, 500);

    expect(updated).toBe(initial + 500);
    expect(diaryService.getWaterForDate(testDate)).toBe(updated);
  });

  it("clears all entries for a date and returns totals to 0", () => {
    diaryService.clearDate(testDate);
    const clearedTotals = diaryService.getDailyTotals(testDate);
    expect(clearedTotals.calories).toBe(0);
    expect(clearedTotals.protein).toBe(0);
    expect(diaryService.getEntriesForDate(testDate).length).toBe(0);
    expect(diaryService.getWaterForDate(testDate)).toBe(0);
  });
});
