import { describe, it, expect } from "vitest";
import { heuristicFoodParser } from "@/lib/services/food-understanding-service";

describe("FoodUnderstandingService (Natural-Language Examples)", () => {
  const testDate = "2026-10-29";

  it("parses Example 1: Grilled chicken with olive oil for lunch", () => {
    const input = "I ate 150 g grilled chicken breast for lunch at 1 PM, cooked with one teaspoon of olive oil.";
    const result = heuristicFoodParser(input, testDate);

    expect(result.mealCategory).toBe("lunch");
    expect(result.consumedAtIso).toContain("2026-10-29T13:00:00");
    expect(result.items).toHaveLength(1);

    const chicken = result.items[0];
    expect(chicken.name).toContain("chicken breast");
    expect(chicken.quantity).toBe(150);
    expect(chicken.unit).toBe("g");
    expect(chicken.isCooked).toBe(true);
    expect(chicken.addedFatsOrSugars).toBeDefined();
    expect(chicken.addedFatsOrSugars?.[0].name).toBe("Olive oil");
    expect(chicken.addedFatsOrSugars?.[0].quantity).toBe(5);
  });

  it("parses Example 2: Whole milk with powdered mixed nuts at 7 AM", () => {
    const input = "I drank 330 ml whole milk mixed with 30 g powdered almonds, cashews, walnuts and pistachios at 7 AM.";
    const result = heuristicFoodParser(input, testDate);

    expect(result.mealCategory).toBe("early_morning");
    expect(result.consumedAtIso).toContain("2026-10-29T07:00:00");
    expect(result.items).toHaveLength(1);

    const drink = result.items[0];
    expect(drink.quantity).toBe(330);
    expect(drink.unit).toBe("ml");
    expect(drink.ingredients?.length).toBeGreaterThanOrEqual(4);
  });

  it("parses Example 3: Two boiled eggs, two slices of bread, one banana", () => {
    const input = "For breakfast at 8 AM, two boiled eggs, two slices of bread and one banana.";
    const result = heuristicFoodParser(input, testDate);

    expect(result.mealCategory).toBe("breakfast");
    expect(result.consumedAtIso).toContain("2026-10-29T08:00:00");
    expect(result.items).toHaveLength(3);

    const egg = result.items.find((i) => i.name.toLowerCase().includes("egg"));
    expect(egg?.quantity).toBe(2);
    expect(egg?.unit).toBe("piece");

    const bread = result.items.find((i) => i.name.toLowerCase().includes("bread"));
    expect(bread?.quantity).toBe(2);
    expect(bread?.unit).toBe("slice");

    const banana = result.items.find((i) => i.name.toLowerCase().includes("banana"));
    expect(banana?.quantity).toBe(1);
  });

  it("parses Example 4: Cooked rice, grilled chicken, vegetables at 1 PM", () => {
    const input = "At 1 PM, 200 g cooked rice, 150 g grilled chicken, 100 g vegetables.";
    const result = heuristicFoodParser(input, testDate);

    expect(result.mealCategory).toBe("lunch");
    expect(result.items).toHaveLength(3);
    expect(result.items.map((i) => i.name)).toEqual([
      "Cooked white rice",
      "Grilled chicken breast",
      "Mixed vegetables",
    ]);
  });

  it("parses Example 5: Two dosas with sambar and coconut chutney at 8:30 AM", () => {
    const input = "Two dosas with sambar and coconut chutney at 8:30 AM.";
    const result = heuristicFoodParser(input, testDate);

    expect(result.mealCategory).toBe("breakfast");
    expect(result.consumedAtIso).toContain("2026-10-29T08:30:00");
    expect(result.items).toHaveLength(3);
  });

  it("parses Example 6: Homemade chicken biryani at 6:30 PM", () => {
    const input = "At 6:30 PM, 200 g homemade chicken biryani with rice, chicken, oil and spices.";
    const result = heuristicFoodParser(input, testDate);

    expect(result.mealCategory).toBe("dinner");
    expect(result.consumedAtIso).toContain("2026-10-29T18:30:00");
    const biryani = result.items[0];
    expect(biryani.quantity).toBe(200);
    expect(biryani.ingredients?.length).toBeGreaterThan(0);
  });

  it("parses Example 7: Yesterday at 7 PM, two chapatis with 150 g paneer curry", () => {
    const input = "Yesterday at 7 PM, two chapatis with 150 g paneer curry.";
    const result = heuristicFoodParser(input, testDate);

    expect(result.mealCategory).toBe("dinner");
    expect(result.consumedAtIso).toContain("2026-10-28T19:00:00"); // Resolves yesterday
    expect(result.items).toHaveLength(2);
  });

  it("Feature 1: Paragraph form with explicit nutrients extracts authoritative numbers and 1:15 PM time", () => {
    const input =
      "I ate 200 g of grilled chicken breast at 1:15 PM. It contains 330 kcal, 62 g protein, 0 g carbohydrates, 7 g fat, 0 g fibre, and 0 ml water.";
    const result = heuristicFoodParser(input, testDate);

    // Verify time and automatic meal categorization to Lunch (12:30–2:00 PM)
    expect(result.mealCategory).toBe("lunch");
    expect(result.consumedAtIso).toContain("2026-10-29T13:15:00");

    expect(result.items).toHaveLength(1);
    const item = result.items[0];
    expect(item.name).toContain("chicken breast");
    expect(item.quantity).toBe(200);
    expect(item.unit).toBe("g");
    expect(item.confidence).toBe("verified");

    // Verify explicit nutrients extracted
    expect(item.explicitNutrients).toBeDefined();
    expect(item.explicitNutrients?.calories).toBe(330);
    expect(item.explicitNutrients?.protein).toBe(62);
    expect(item.explicitNutrients?.carbs).toBe(0);
    expect(item.explicitNutrients?.fat).toBe(7);
    expect(item.explicitNutrients?.fibre).toBe(0);
    expect(item.explicitNutrients?.waterMl).toBe(0);
  });

  it("Feature 2: Automatic meal categorization maps across all required time brackets", () => {
    // Early Morning: 6:00–7:30 AM
    expect(heuristicFoodParser("Drank warm water at 6:30 AM", testDate).mealCategory).toBe("early_morning");
    expect(heuristicFoodParser("Had soaked almonds at 7:00 AM", testDate).mealCategory).toBe("early_morning");

    // Breakfast: 8:00–9:30 AM
    expect(heuristicFoodParser("Two boiled eggs at 8:15 AM", testDate).mealCategory).toBe("breakfast");
    expect(heuristicFoodParser("Oatmeal at 9:00 AM", testDate).mealCategory).toBe("breakfast");

    // Mid-Morning Snack: 10:30–11:30 AM
    expect(heuristicFoodParser("One apple at 11:00 AM", testDate).mealCategory).toBe("mid_morning_snack");

    // Lunch: 12:30–2:00 PM (including 1:15 PM)
    expect(heuristicFoodParser("Grilled chicken at 1:15 PM", testDate).mealCategory).toBe("lunch");
    expect(heuristicFoodParser("Rice and dal at 12:45 PM", testDate).mealCategory).toBe("lunch");

    // Evening Snack: 4:30–5:30 PM
    expect(heuristicFoodParser("Black coffee and roasted chana at 5:00 PM", testDate).mealCategory).toBe("evening_snack");

    // Dinner: based on cutoff 7:00 PM IST (18:00–20:30)
    expect(heuristicFoodParser("Paneer salad at 7:00 PM", testDate).mealCategory).toBe("dinner");
    expect(heuristicFoodParser("Soup and roti at 6:45 PM", testDate).mealCategory).toBe("dinner");

    // Pre-workout and Post-workout
    expect(heuristicFoodParser("Black coffee pre-workout", testDate).mealCategory).toBe("pre_workout");
    expect(heuristicFoodParser("Protein meal post-workout", testDate).mealCategory).toBe("post_workout");

    // Other: outside standard brackets
    expect(heuristicFoodParser("Handful of almonds at 3:15 PM", testDate).mealCategory).toBe("other");
  });

  it("parses multi-item numbered list with explicit nutrients exactly as user provided", () => {
    const input = `Morning
1. I drank 330 g of milk at breakfast. It contains approximately 200 kcal, 10.5 g protein, 16 g carbohydrates, 11 g fat, 0 g fibre, and 290 ml water.

2. I consumed 10 g of nuts powder at breakfast. It contains approximately 60 kcal, 2 g protein, 2 g carbohydrates, 5 g fat, 1 g fibre, and 0 ml water.

3. I ate 1 egg dosa at breakfast. It contains approximately 180 kcal, 7 g protein, 20 g carbohydrates, 8 g fat, 1 g fibre, and 0 ml water.

4. I ate 2 egg whites at breakfast. It contains approximately 34 kcal, 7 g protein, 0.5 g carbohydrates, 0 g fat, 0 g fibre, and 0 ml water.

5. I ate 100 g of cooked black channa at breakfast. It contains approximately 165 kcal, 9 g protein, 27 g carbohydrates, 2.5 g fat, 8 g fibre, and 0 ml water.

6. I ate 4 cucumber slices at breakfast. It contains approximately 5 kcal, 0.2 g protein, 1 g carbohydrates, 0 g fat, 0.2 g fibre, and 0 ml water.`;

    const result = heuristicFoodParser(input, testDate);

    // Must be classified as Breakfast
    expect(result.mealCategory).toBe("breakfast");

    // Must contain exactly 6 individual parsed items matching the 6 numbered items
    expect(result.items).toHaveLength(6);

    // Item 1: Milk
    const item1 = result.items[0];
    expect(item1.name).toContain("Milk");
    expect(item1.quantity).toBe(330);
    expect(item1.unit).toBe("g");
    expect(item1.explicitNutrients?.calories).toBe(200);
    expect(item1.explicitNutrients?.protein).toBe(10.5);
    expect(item1.explicitNutrients?.carbs).toBe(16);
    expect(item1.explicitNutrients?.fat).toBe(11);
    expect(item1.explicitNutrients?.fibre).toBe(0);
    expect(item1.explicitNutrients?.waterMl).toBe(290);

    // Item 2: Nuts powder
    const item2 = result.items[1];
    expect(item2.name).toContain("Nuts powder");
    expect(item2.quantity).toBe(10);
    expect(item2.unit).toBe("g");
    expect(item2.explicitNutrients?.calories).toBe(60);
    expect(item2.explicitNutrients?.protein).toBe(2);
    expect(item2.explicitNutrients?.carbs).toBe(2);
    expect(item2.explicitNutrients?.fat).toBe(5);
    expect(item2.explicitNutrients?.fibre).toBe(1);

    // Item 3: Egg dosa (NOT plain dosa with sambar and chutney!)
    const item3 = result.items[2];
    expect(item3.name).toBe("Egg dosa");
    expect(item3.quantity).toBe(1);
    expect(item3.explicitNutrients?.calories).toBe(180);
    expect(item3.explicitNutrients?.protein).toBe(7);
    expect(item3.explicitNutrients?.carbs).toBe(20);
    expect(item3.explicitNutrients?.fat).toBe(8);
    expect(item3.explicitNutrients?.fibre).toBe(1);

    // Item 4: Egg whites
    const item4 = result.items[3];
    expect(item4.name).toBe("Egg whites");
    expect(item4.quantity).toBe(2);
    expect(item4.explicitNutrients?.calories).toBe(34);
    expect(item4.explicitNutrients?.protein).toBe(7);
    expect(item4.explicitNutrients?.carbs).toBe(0.5);

    // Item 5: Cooked black channa
    const item5 = result.items[4];
    expect(item5.name).toBe("Cooked black channa");
    expect(item5.quantity).toBe(100);
    expect(item5.unit).toBe("g");
    expect(item5.explicitNutrients?.calories).toBe(165);
    expect(item5.explicitNutrients?.protein).toBe(9);
    expect(item5.explicitNutrients?.carbs).toBe(27);
    expect(item5.explicitNutrients?.fat).toBe(2.5);
    expect(item5.explicitNutrients?.fibre).toBe(8);

    // Item 6: Cucumber slices
    const item6 = result.items[5];
    expect(item6.name).toBe("Cucumber slices");
    expect(item6.quantity).toBe(4);
    expect(item6.explicitNutrients?.calories).toBe(5);
    expect(item6.explicitNutrients?.protein).toBe(0.2);
    expect(item6.explicitNutrients?.carbs).toBe(1);
    expect(item6.explicitNutrients?.fat).toBe(0);
    expect(item6.explicitNutrients?.fibre).toBe(0.2);
  });
});
