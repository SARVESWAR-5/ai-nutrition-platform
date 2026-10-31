import { describe, it, expect } from "vitest";
import { nutritionGoalEngine } from "@/lib/services/nutrition-goal-engine";
import { DEFAULT_NUTRITION_TARGETS } from "@/lib/services/goal-service";

describe("NutritionGoalEngine (Deterministic Calculations)", () => {
  it("calculates remaining and exceeded targets correctly without negative remaining", () => {
    // Consumed calories: 2550 (exceeds 2400 target by 150)
    // Consumed protein: 120 (target 150, remaining 30)
    const consumed = {
      calories: 2550,
      protein: 120,
      carbs: 250,
      fat: 60,
      fibre: 25,
    };

    const progress = nutritionGoalEngine.calculateProgress(consumed, 2000, DEFAULT_NUTRITION_TARGETS);

    // Calories: exceeded
    expect(progress.calories.consumed).toBe(2550);
    expect(progress.calories.remaining).toBe(0); // Never negative!
    expect(progress.calories.excess).toBe(150);

    // Protein: remaining
    expect(progress.protein.consumed).toBe(120);
    expect(progress.protein.remaining).toBe(30);
    expect(progress.protein.excess).toBe(0);
    expect(progress.protein.percentComplete).toBe(80); // 120 / 150 = 80%

    // Water
    expect(progress.water.consumed).toBe(2000);
    expect(progress.water.remaining).toBe(1000);
  });

  it("calculates 4-4-9 macro calorie distribution and flags discrepancy", () => {
    const consumed = {
      calories: 2000,
      protein: 150, // 150 * 4 = 600 kcal
      carbs: 200, // 200 * 4 = 800 kcal
      fat: 60, // 60 * 9 = 540 kcal
      fibre: 30,
    };

    const distribution = nutritionGoalEngine.calculateMacroCalories(consumed);

    expect(distribution.proteinCalories).toBe(600);
    expect(distribution.carbsCalories).toBe(800);
    expect(distribution.fatCalories).toBe(540);
    expect(distribution.totalMacroCalories).toBe(1940);
    // Discrepancy: 2000 logged vs 1940 macro sum = 60 kcal
    expect(distribution.discrepancyKcal).toBe(60);
    expect(distribution.explanation).toContain("Atwater");
  });

  it("produces deterministic daily insights with Sarveswar profile rules", async () => {
    const consumed = {
      calories: 1800,
      protein: 60, // Low protein (< 50% of 150g target)
      carbs: 220,
      fat: 55,
      fibre: 10, // Low fibre
    };

    const insight = await nutritionGoalEngine.generateDailyInsights(
      "2026-10-29",
      consumed,
      1500,
      DEFAULT_NUTRITION_TARGETS,
      { preferredDinnerCutoff: "19:00", foodsAvoided: ["whey protein"] }
    );

    expect(insight.bulletPoints.length).toBeGreaterThan(0);
    expect(insight.bulletPoints.some((b) => b.includes("Protein is currently low"))).toBe(true);
    expect(insight.bulletPoints.some((b) => b.includes("19:00"))).toBe(true); // Preferred cutoff respected
  });
});
