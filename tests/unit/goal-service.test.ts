import { describe, it, expect } from "vitest";
import {
  NutritionGoalsSchema,
  DEFAULT_NUTRITION_TARGETS,
  compareTargetsWithRecommendation,
  goalService,
} from "@/lib/services/goal-service";

describe("GoalService & Target Comparison", () => {
  it("matches initial default targets exactly per specification", () => {
    expect(DEFAULT_NUTRITION_TARGETS.calories).toBe(2400);
    expect(DEFAULT_NUTRITION_TARGETS.protein).toBe(150);
    expect(DEFAULT_NUTRITION_TARGETS.carbs).toBe(290);
    expect(DEFAULT_NUTRITION_TARGETS.fat).toBe(70);
    expect(DEFAULT_NUTRITION_TARGETS.fibre).toBe(35);
    expect(DEFAULT_NUTRITION_TARGETS.waterMl).toBe(3000);
  });

  it("validates valid nutrition goals", () => {
    const result = NutritionGoalsSchema.safeParse(DEFAULT_NUTRITION_TARGETS);
    expect(result.success).toBe(true);
  });

  it("rejects negative nutrient targets", () => {
    const invalid = {
      ...DEFAULT_NUTRITION_TARGETS,
      protein: -10,
    };
    const result = NutritionGoalsSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("compares manual targets with calculated recommendation without overwriting", () => {
    const comparisons = compareTargetsWithRecommendation(DEFAULT_NUTRITION_TARGETS, {
      recommendedCalories: 2692,
      macroBreakdown: {
        proteinGrams: 150,
        carbsGrams: 300,
        fatGrams: 84,
        fibreGrams: 38,
      },
    });

    expect(comparisons).toHaveLength(5);
    const calComp = comparisons.find((c) => c.nutrient === "Calories");
    expect(calComp).toBeDefined();
    expect(calComp?.manualTarget).toBe(2400);
    expect(calComp?.calculatedRecommendation).toBe(2692);

    const proteinComp = comparisons.find((c) => c.nutrient === "Protein");
    expect(proteinComp?.manualTarget).toBe(150);
  });

  it("preserves historical goal accuracy when goals change with effective dates (Feature 09)", () => {
    // Schedule a future bulking phase starting in November
    goalService.addGoalRevision({
      effectiveFrom: "2026-11-01",
      goalType: "bulking",
      reason: "Winter Muscle Gain Phase",
      targets: {
        calories: 2800,
        protein: 150,
        carbs: 370,
        fat: 80,
        fibre: 35,
        waterMl: 3000,
      },
    });

    // In October, the baseline 2400 kcal recomposition goal must remain active!
    const octoberGoal = goalService.getGoalForDate("2026-10-15");
    expect(octoberGoal.calories).toBe(2400);
    expect(octoberGoal.protein).toBe(150);

    // In November, the new 2800 kcal bulking goal is active!
    const novemberGoal = goalService.getGoalForDate("2026-11-05");
    expect(novemberGoal.calories).toBe(2800);
    expect(novemberGoal.carbs).toBe(370);
  });
});
