import { NutrientValues, InterpretedFoodItem, InterpretedMeal } from "../services/types";
import { FoodCompositionRecord, nutritionDataProvider } from "./data-provider";
import { ParsedFoodItem, ParsedMealDescription } from "../services/food-understanding-service";

/**
 * Standard gram weight equivalents for common household measurements and units.
 */
export const UNIT_WEIGHT_GRAMS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  tsp: 5,
  teaspoon: 5,
  tbsp: 15,
  tablespoon: 15,
  cup: 240,
  katori: 150,
  plate: 350,
};

/**
 * Specific piece weights for discrete food items (in grams).
 */
export const ITEM_PIECE_WEIGHTS_GRAMS: Record<string, number> = {
  egg: 50,
  "boiled egg": 50,
  banana: 118,
  bread: 28,
  "bread slice": 28,
  slice: 28,
  dosa: 80,
  "plain dosa": 80,
  chapati: 35,
  roti: 35,
  "chapati / roti": 35,
};

/**
 * Densities for liquid-to-gram conversion (g/ml).
 */
export const LIQUID_DENSITIES_G_PER_ML: Record<string, number> = {
  water: 1.0,
  milk: 1.03,
  "whole milk": 1.03,
  oil: 0.92,
  "olive oil": 0.92,
  ghee: 0.91,
};

export class NutritionCalculationService {
  /**
   * Converts any quantity and unit into edible grams.
   */
  public convertToGrams(foodName: string, quantity: number, unit: string): { grams: number; isEstimate: boolean } {
    const u = unit.toLowerCase().trim();
    const name = foodName.toLowerCase().trim();

    // Direct gram weights
    if (u === "g" || u === "gram" || u === "grams") {
      return { grams: quantity, isEstimate: false };
    }

    if (u === "kg") {
      return { grams: quantity * 1000, isEstimate: false };
    }

    // Millilitres with density
    if (u === "ml" || u === "millilitre" || u === "milliliter") {
      let density = 1.0;
      for (const [key, d] of Object.entries(LIQUID_DENSITIES_G_PER_ML)) {
        if (name.includes(key)) {
          density = d;
          break;
        }
      }
      return { grams: Math.round(quantity * density * 10) / 10, isEstimate: false };
    }

    // Discrete items (piece / slice)
    if (u === "piece" || u === "slice" || u === "unit") {
      for (const [key, w] of Object.entries(ITEM_PIECE_WEIGHTS_GRAMS)) {
        if (name.includes(key) || key.includes(name)) {
          return { grams: quantity * w, isEstimate: false };
        }
      }
      // Fallback estimate for unknown piece
      return { grams: quantity * 80, isEstimate: true };
    }

    // Household measurements (cup, katori, tsp, tbsp, plate)
    if (UNIT_WEIGHT_GRAMS[u]) {
      return { grams: quantity * UNIT_WEIGHT_GRAMS[u], isEstimate: true };
    }

    // Default fallback
    return { grams: quantity * 100, isEstimate: true };
  }

  /**
   * Deterministically calculates nutrient contribution for a given gram weight:
   * contribution = (per100g * grams) / 100
   * Unknown values remain null/undefined (Unknown is NOT zero).
   */
  public calculateNutrients(per100g: NutrientValues, grams: number): NutrientValues {
    const factor = grams / 100;

    const roundVal = (val: number | null | undefined, decimals = 1): number | null => {
      if (val === null || val === undefined) return null;
      const mult = Math.pow(10, decimals);
      return Math.round(val * factor * mult) / mult;
    };

    return {
      calories: Math.round((per100g.calories || 0) * factor),
      protein: roundVal(per100g.protein, 1) ?? 0,
      carbs: roundVal(per100g.carbs, 1) ?? 0,
      fat: roundVal(per100g.fat, 1) ?? 0,
      fibre: roundVal(per100g.fibre, 1) ?? 0,
      sugars: roundVal(per100g.sugars, 1),
      addedSugars: roundVal(per100g.addedSugars, 1),
      saturatedFat: roundVal(per100g.saturatedFat, 1),
      monounsaturatedFat: roundVal(per100g.monounsaturatedFat, 1),
      polyunsaturatedFat: roundVal(per100g.polyunsaturatedFat, 1),
      transFat: roundVal(per100g.transFat, 1),
      cholesterol: roundVal(per100g.cholesterol, 0),
      sodium: roundVal(per100g.sodium, 0),
      potassium: roundVal(per100g.potassium, 0),
      calcium: roundVal(per100g.calcium, 0),
      iron: roundVal(per100g.iron, 2),
      magnesium: roundVal(per100g.magnesium, 0),
      zinc: roundVal(per100g.zinc, 2),
      phosphorus: roundVal(per100g.phosphorus, 0),
      vitaminA: roundVal(per100g.vitaminA, 0),
      vitaminC: roundVal(per100g.vitaminC, 1),
      vitaminD: roundVal(per100g.vitaminD, 1),
      vitaminE: roundVal(per100g.vitaminE, 2),
      vitaminK: roundVal(per100g.vitaminK, 1),
      thiamin: roundVal(per100g.thiamin, 3),
      riboflavin: roundVal(per100g.riboflavin, 3),
      niacin: roundVal(per100g.niacin, 3),
      vitaminB6: roundVal(per100g.vitaminB6, 3),
      folate: roundVal(per100g.folate, 0),
      vitaminB12: roundVal(per100g.vitaminB12, 3),
    };
  }

  /**
   * Sums multiple nutrient records together deterministically.
   */
  public sumNutrients(records: NutrientValues[]): NutrientValues {
    const total: NutrientValues = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fibre: 0,
      waterMl: 0,
      sodium: 0,
      potassium: 0,
      iron: 0,
      calcium: 0,
    };

    for (const r of records) {
      total.calories += r.calories || 0;
      total.protein = Math.round((total.protein + (r.protein || 0)) * 10) / 10;
      total.carbs = Math.round((total.carbs + (r.carbs || 0)) * 10) / 10;
      total.fat = Math.round((total.fat + (r.fat || 0)) * 10) / 10;
      total.fibre = Math.round((total.fibre + (r.fibre || 0)) * 10) / 10;
      if (r.waterMl !== null && r.waterMl !== undefined) total.waterMl = (total.waterMl || 0) + r.waterMl;
      if (r.sodium !== null && r.sodium !== undefined) total.sodium = (total.sodium || 0) + r.sodium;
      if (r.potassium !== null && r.potassium !== undefined) total.potassium = (total.potassium || 0) + r.potassium;
      if (r.iron !== null && r.iron !== undefined) total.iron = Math.round(((total.iron || 0) + r.iron) * 100) / 100;
      if (r.calcium !== null && r.calcium !== undefined) total.calcium = (total.calcium || 0) + r.calcium;
    }

    return total;
  }

  /**
   * Computes interpreted food items with verified nutrition lookup and added fats/cooking oils.
   */
  public async computeParsedMeal(parsedMeal: ParsedMealDescription): Promise<InterpretedMeal> {
    const interpretedItems: InterpretedFoodItem[] = [];

    for (const item of parsedMeal.items) {
      const { grams, isEstimate } = this.convertToGrams(item.name, item.quantity, item.unit);

      // Preferred preparation state
      const prefState = item.isCooked ? "cooked" : "raw";
      const record = await nutritionDataProvider.lookupFood(item.name, prefState);

      let itemNutrients: NutrientValues;
      let confidence: "verified" | "estimated" = isEstimate || item.confidence === "estimated" ? "estimated" : "verified";

      // If user provided authoritative explicit nutrients in their text, use them directly
      if (item.explicitNutrients) {
        confidence = "verified";
        itemNutrients = {
          calories: item.explicitNutrients.calories,
          protein: item.explicitNutrients.protein,
          carbs: item.explicitNutrients.carbs,
          fat: item.explicitNutrients.fat,
          fibre: item.explicitNutrients.fibre,
          waterMl: item.explicitNutrients.waterMl,
        };
      } else if (record) {
        itemNutrients = this.calculateNutrients(record.per100g, grams);
      } else {
        // Fallback estimate for unknown foods
        confidence = "estimated";
        itemNutrients = {
          calories: Math.round(grams * 1.5),
          protein: Math.round(grams * 0.05 * 10) / 10,
          carbs: Math.round(grams * 0.2 * 10) / 10,
          fat: Math.round(grams * 0.05 * 10) / 10,
          fibre: Math.round(grams * 0.02 * 10) / 10,
        };
      }

      // Add nutrients from added fats / oils (e.g., olive oil cooking fat)
      if (item.addedFatsOrSugars && item.addedFatsOrSugars.length > 0) {
        for (const fat of item.addedFatsOrSugars) {
          const fatGrams = this.convertToGrams(fat.name, fat.quantity, fat.unit).grams;
          const fatRecord = await nutritionDataProvider.lookupFood(fat.name, "raw");
          if (fatRecord) {
            const fatNutrients = this.calculateNutrients(fatRecord.per100g, fatGrams);
            itemNutrients = this.sumNutrients([itemNutrients, fatNutrients]);
          }
        }
      }

      // Add nutrients from discrete ingredients (e.g., mixed nuts in milk)
      if (item.ingredients && item.ingredients.length > 0 && item.name.includes("milk")) {
        for (const ing of item.ingredients) {
          if (ing.name.toLowerCase() !== "whole milk") {
            const ingGrams = this.convertToGrams(ing.name, ing.quantity, ing.unit).grams;
            const ingRecord = await nutritionDataProvider.lookupFood(ing.name, "raw");
            if (ingRecord) {
              const ingNutrients = this.calculateNutrients(ingRecord.per100g, ingGrams);
              itemNutrients = this.sumNutrients([itemNutrients, ingNutrients]);
            }
          }
        }
      }

      interpretedItems.push({
        id: `item-${Math.random().toString(36).substring(2, 9)}`,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        preparationMethod: item.preparationMethod || "cooked",
        isCooked: item.isCooked ?? true,
        sourceConfidence: confidence,
        ambiguities: item.ambiguities,
        nutrients: itemNutrients,
      });
    }

    const totalNutrients = this.sumNutrients(interpretedItems.map((i) => i.nutrients));

    return {
      mealCategory: parsedMeal.mealCategory,
      loggedAt: parsedMeal.consumedAtIso,
      items: interpretedItems,
      totalNutrients,
    };
  }
}

export const nutritionCalculationService = new NutritionCalculationService();
