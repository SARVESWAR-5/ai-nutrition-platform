import { describe, it, expect } from "vitest";
import { mealRecommendationService } from "@/lib/services/recommendation-service";
import { SARVESWAR_PROFILE_DEFAULTS } from "@/lib/services/profile-service";

describe("MealRecommendationService & Validation Pipeline", () => {
  it("provides allow-listed retrieval tools scoped to user context", () => {
    const totals = mealRecommendationService.get_today_totals();
    expect(totals).toBeDefined();

    const goals = mealRecommendationService.get_goals();
    expect(goals.calories).toBe(2400);

    const constraints = mealRecommendationService.get_profile_constraints();
    expect(constraints.name).toBe("Sarveswar");
    expect(constraints.dinnerCutoff).toBe("19:00");
    expect(constraints.foodsAvoided).toContain("whey protein");
  });

  it("strictly enforces whey protein exclusion in validation pipeline", async () => {
    const proposalWithWhey = {
      id: "test-whey-shake",
      name: "Whey Protein Shake",
      description: "Quick shake",
      prepTimeMinutes: 2,
      cookTimeMinutes: 0,
      ingredients: [
        { name: "Whey protein powder", quantity: 30, unit: "g" },
        { name: "Whole milk", quantity: 250, unit: "ml" },
      ],
      instructions: ["Shake and drink"],
      fitExplanation: "Quick protein",
    };

    const validated = await mealRecommendationService.validateAndCalculateRecommendation(proposalWithWhey);

    expect(validated.isConstraintSatisfied).toBe(false);
    expect(validated.constraintViolations.length).toBeGreaterThan(0);
    expect(validated.constraintViolations.some((v) => v.includes("Whey protein is strictly excluded"))).toBe(true);
  });

  it("strictly enforces squid exclusion in validation pipeline", async () => {
    const proposalWithSquid = {
      id: "test-squid-dish",
      name: "Stir-fried Squid with Rice",
      description: "Seafood dinner",
      prepTimeMinutes: 10,
      cookTimeMinutes: 10,
      ingredients: [
        { name: "Fresh squid rings", quantity: 150, unit: "g" },
        { name: "Steamed rice", quantity: 150, unit: "g" },
      ],
      instructions: ["Stir-fry squid with spices"],
      fitExplanation: "High protein seafood",
    };

    const validated = await mealRecommendationService.validateAndCalculateRecommendation(proposalWithSquid);
    expect(validated.isConstraintSatisfied).toBe(false);
    expect(validated.constraintViolations.some((v) => v.includes("Squid is strictly excluded"))).toBe(true);
  });

  it("flags meals that exceed user-specified calorie limits", async () => {
    const highCalMeal = {
      id: "test-heavy-biryani",
      name: "Heavy Dum Biryani",
      description: "Large portion",
      prepTimeMinutes: 10,
      cookTimeMinutes: 30,
      ingredients: [
        { name: "Cooked white rice", quantity: 300, unit: "g" },
        { name: "Grilled chicken breast", quantity: 200, unit: "g" },
        { name: "Olive oil", quantity: 25, unit: "g" },
      ],
      instructions: ["Cook and serve"],
      fitExplanation: "Filling meal",
    };

    // Stated user constraint: under 600 kcal
    const validated = await mealRecommendationService.validateAndCalculateRecommendation(highCalMeal, {
      maxCalories: 600,
    });

    expect(validated.nutrients.calories).toBeGreaterThan(600);
    expect(validated.isConstraintSatisfied).toBe(false);
    expect(validated.constraintViolations.some((v) => v.includes("exceeds requested calorie limit of 600 kcal"))).toBe(true);
  });

  it("confirms meals that satisfy constraints", async () => {
    const validMeal = {
      id: "test-egg-chapatis",
      name: "4-Egg Bhurji with 2 Chapatis",
      description: "PG budget dinner",
      prepTimeMinutes: 5,
      cookTimeMinutes: 15,
      ingredients: [
        { name: "Boiled egg", quantity: 4, unit: "piece" },
        { name: "Chapati / Roti", quantity: 2, unit: "piece" },
      ],
      instructions: ["Cook and serve"],
      fitExplanation: "Fits dinner cutoff",
    };

    const validated = await mealRecommendationService.validateAndCalculateRecommendation(validMeal, {
      maxCalories: 600,
      minProtein: 25,
    });

    expect(validated.nutrients.calories).toBeLessThanOrEqual(600);
    expect(validated.nutrients.protein).toBeGreaterThanOrEqual(25);
    expect(validated.isConstraintSatisfied).toBe(true);
    expect(validated.constraintViolations).toHaveLength(0);
  });

  it("starts clean new conversations without inheriting old constraints", () => {
    const conv1 = mealRecommendationService.createConversation("Thread 1");
    const conv2 = mealRecommendationService.createConversation("Thread 2");

    expect(conv1.id).not.toBe(conv2.id);
    expect(conv2.messages).toHaveLength(0);
  });
});
