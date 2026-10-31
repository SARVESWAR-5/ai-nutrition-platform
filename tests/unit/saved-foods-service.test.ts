import { describe, it, expect } from "vitest";
import { savedFoodsService } from "@/lib/services/saved-foods-service";

describe("SavedFoodsService (Personal Food Library & Memory - Feature 08)", () => {
  it("provides pre-configured practical staples in the library", () => {
    const library = savedFoodsService.getSavedFoods();
    expect(library.length).toBeGreaterThanOrEqual(5);

    const chicken = library.find((f) => f.name.toLowerCase().includes("chicken"));
    expect(chicken).toBeDefined();
    expect(chicken?.nutrientsPerServing.protein).toBeGreaterThan(30);
  });

  it("saves confirmed foods and increments usage on reuse", () => {
    const newFood = savedFoodsService.saveFood({
      name: "Paneer Bhurji (200g)",
      defaultQuantity: 200,
      unit: "g",
      preparationMethod: "sautéed with onions and tomatoes",
      isCooked: true,
      nutrientsPerServing: {
        calories: 360,
        protein: 28,
        carbs: 8,
        fat: 24,
        fibre: 2,
      },
    });

    expect(newFood.id).toBeDefined();
    expect(newFood.timesUsed).toBe(1);

    // Reuse
    savedFoodsService.recordUsage(newFood.id);
    const updated = savedFoodsService.getSavedFoods().find((f) => f.id === newFood.id);
    expect(updated?.timesUsed).toBe(2);
  });
});
