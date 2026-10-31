import { describe, it, expect } from "vitest";
import { mealPlanService } from "@/lib/services/meal-plan-service";
import { diaryService } from "@/lib/services/diary-service";

describe("MealPlanService (Planned vs. Consumed Isolation)", () => {
  const planDate = "2026-11-05";

  it("ensures planned meals do not count as consumed food intake", () => {
    // Initial intake on planDate
    const initialTotals = diaryService.getDailyTotals(planDate);
    expect(initialTotals.calories).toBe(0);

    // Add a planned item
    mealPlanService.addPlannedItem(planDate, {
      foodName: "High Protein Lunch",
      quantity: 1,
      unit: "serving",
      mealCategory: "lunch",
      scheduledTime: "13:00",
      nutrients: { calories: 600, protein: 45, carbs: 60, fat: 12, fibre: 5 },
    });

    // Verification: consumed totals must still be 0!
    const consumedAfterPlan = diaryService.getDailyTotals(planDate);
    expect(consumedAfterPlan.calories).toBe(0);
    expect(consumedAfterPlan.protein).toBe(0);
  });

  it("logs a planned meal as eaten only after explicit action and exactly once", () => {
    const plan = mealPlanService.getPlanForDate(planDate);
    expect(plan).toBeDefined();

    const itemToLog = plan?.items[0];
    expect(itemToLog).toBeDefined();
    expect(itemToLog?.isLoggedAsEaten).toBe(false);

    // Execute Log as Eaten
    const success = mealPlanService.logPlannedItemAsEaten(plan!.id, itemToLog!.id, planDate);
    expect(success).toBe(true);

    // Consumed totals now reflect the logged food
    const consumedTotals = diaryService.getDailyTotals(planDate);
    expect(consumedTotals.calories).toBe(600);
    expect(consumedTotals.protein).toBe(45);

    // Item is flagged as eaten
    expect(itemToLog?.isLoggedAsEaten).toBe(true);

    // Calling it again should not duplicate
    const secondCall = mealPlanService.logPlannedItemAsEaten(plan!.id, itemToLog!.id, planDate);
    expect(secondCall).toBe(false);
    expect(diaryService.getDailyTotals(planDate).calories).toBe(600); // Unchanged!
  });
});
