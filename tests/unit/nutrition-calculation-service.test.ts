import { describe, it, expect } from "vitest";
import { nutritionCalculationService } from "@/lib/nutrition/calculation-service";
import { VERIFIED_FOOD_DATABASE } from "@/lib/nutrition/data-provider";

describe("NutritionCalculationService (Pure Deterministic Calculation)", () => {
  it("calculates exact contribution from per-100g values", () => {
    // 150g of cooked rice (130 kcal, 2.69g protein per 100g)
    const per100g = VERIFIED_FOOD_DATABASE["cooked white rice"].per100g;
    const result = nutritionCalculationService.calculateNutrients(per100g, 150);

    expect(result.calories).toBe(195); // 130 * 1.5 = 195
    expect(result.protein).toBe(4.0); // 2.69 * 1.5 = 4.035 -> 4.0
    expect(result.carbs).toBe(42.3); // 28.17 * 1.5 = 42.255 -> 42.3
    expect(result.fat).toBe(0.4); // 0.28 * 1.5 = 0.42 -> 0.4
  });

  it("distinguishes raw vs cooked records and prevents conflation", () => {
    const rawRecord = VERIFIED_FOOD_DATABASE["raw chicken breast"].per100g;
    const cookedRecord = VERIFIED_FOOD_DATABASE["grilled chicken breast"].per100g;

    const raw100g = nutritionCalculationService.calculateNutrients(rawRecord, 100);
    const cooked100g = nutritionCalculationService.calculateNutrients(cookedRecord, 100);

    // Raw chicken has more moisture (~75%), so 100g raw yields less protein than 100g cooked
    expect(raw100g.calories).toBe(120);
    expect(raw100g.protein).toBe(22.5);

    expect(cooked100g.calories).toBe(165);
    expect(cooked100g.protein).toBe(31.0);
  });

  it("accounts for cooking oil fat contributions", async () => {
    // 150g grilled chicken + 5g olive oil
    const meal = await nutritionCalculationService.computeParsedMeal({
      mealCategory: "lunch",
      consumedAtIso: "2026-10-29T13:00:00+05:30",
      items: [
        {
          name: "Grilled chicken breast",
          quantity: 150,
          unit: "g",
          preparationMethod: "grilled",
          isCooked: true,
          addedFatsOrSugars: [
            {
              name: "Olive oil",
              quantity: 5,
              unit: "g",
              isCookingFat: true,
            },
          ],
          confidence: "verified",
          ambiguities: [],
        },
      ],
    });

    // 150g grilled chicken: 165 * 1.5 = ~248 kcal, ~5.4g fat
    // 5g olive oil: 884 * 0.05 = ~44 kcal, 5.0g fat
    // Total fat should be ~10.4g, calories ~292
    expect(meal.items).toHaveLength(1);
    expect(meal.totalNutrients.calories).toBeGreaterThanOrEqual(285);
    expect(meal.totalNutrients.fat).toBeGreaterThanOrEqual(10.0);
    expect(meal.totalNutrients.protein).toBeGreaterThanOrEqual(46.0);
  });

  it("handles density conversions for whole milk (330 ml)", () => {
    const conversion = nutritionCalculationService.convertToGrams("whole milk", 330, "ml");
    // 330 * 1.03 = 339.9g
    expect(conversion.grams).toBe(339.9);
    expect(conversion.isEstimate).toBe(false);
  });

  it("handles piece weights for boiled eggs", () => {
    const conversion = nutritionCalculationService.convertToGrams("boiled egg", 2, "piece");
    // 2 eggs * 50g = 100g
    expect(conversion.grams).toBe(100);
    expect(conversion.isEstimate).toBe(false);
  });

  it("preserves missing nutrients as null/unknown and never converts to zero", () => {
    const mockRecord = {
      calories: 100,
      protein: 5,
      carbs: 10,
      fat: 2,
      fibre: 1,
      // vitamins missing
    };

    const calculated = nutritionCalculationService.calculateNutrients(mockRecord, 100);
    expect(calculated.vitaminD).toBeNull();
    expect(calculated.vitaminB12).toBeNull();
  });

  it("authoritatively prioritizes user explicit nutrients from paragraph input", async () => {
    // 200 g grilled chicken breast with explicit nutrients: 330 kcal, 62 g protein, 0 g carbs, 7 g fat, 0 g fibre, 0 ml water
    const meal = await nutritionCalculationService.computeParsedMeal({
      mealCategory: "lunch",
      consumedAtIso: "2026-10-29T13:15:00+05:30",
      items: [
        {
          name: "Grilled chicken breast",
          quantity: 200,
          unit: "g",
          preparationMethod: "grilled",
          isCooked: true,
          confidence: "verified",
          explicitNutrients: {
            calories: 330,
            protein: 62,
            carbs: 0,
            fat: 7,
            fibre: 0,
            waterMl: 0,
          },
        },
      ],
    });

    expect(meal.items).toHaveLength(1);
    expect(meal.items[0].sourceConfidence).toBe("verified");
    expect(meal.totalNutrients.calories).toBe(330);
    expect(meal.totalNutrients.protein).toBe(62);
    expect(meal.totalNutrients.carbs).toBe(0);
    expect(meal.totalNutrients.fat).toBe(7);
    expect(meal.totalNutrients.fibre).toBe(0);
    expect(meal.totalNutrients.waterMl).toBe(0);
  });
});
