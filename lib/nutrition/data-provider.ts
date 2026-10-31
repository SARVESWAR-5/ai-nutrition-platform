import { NutrientValues } from "../services/types";
import fixtures from "../../supabase/seed/fixtures.json";

export interface FoodCompositionRecord {
  source: "USDA" | "IFCT" | "CUSTOM";
  sourceId: string;
  name: string;
  preparationState: "raw" | "cooked";
  ediblePortionPct: number;
  retrievalTimestamp: string;
  per100g: NutrientValues;
}

/**
 * Curated Indian & Global Food Database for local verified nutrition.
 * Aligned with USDA FoodData Central and published nutritional science.
 * Unknown values are preserved as null/undefined (Unknown is NOT zero).
 */
export const VERIFIED_FOOD_DATABASE: Record<string, FoodCompositionRecord> = {
  // 1. Grilled chicken breast
  "grilled chicken breast": {
    source: "USDA",
    sourceId: "171477",
    name: "Chicken breast, grilled/cooked",
    preparationState: "cooked",
    ediblePortionPct: 100,
    retrievalTimestamp: "2026-10-29T00:00:00.000Z",
    per100g: {
      calories: 165,
      protein: 31.02,
      carbs: 0,
      fat: 3.57,
      fibre: 0,
      sugars: 0,
      cholesterol: 85,
      sodium: 74,
      potassium: 256,
      iron: 1.04,
    },
  },

  // 2. Raw chicken breast
  "raw chicken breast": {
    source: "USDA",
    sourceId: "171077",
    name: "Chicken breast, raw",
    preparationState: "raw",
    ediblePortionPct: 100,
    retrievalTimestamp: "2026-10-29T00:00:00.000Z",
    per100g: {
      calories: 120,
      protein: 22.5,
      carbs: 0,
      fat: 2.62,
      fibre: 0,
      sugars: 0,
      cholesterol: 73,
      sodium: 65,
      potassium: 334,
      iron: 0.72,
    },
  },

  // 3. Cooked white rice
  "cooked white rice": {
    source: "USDA",
    sourceId: "168878",
    name: "White rice, cooked",
    preparationState: "cooked",
    ediblePortionPct: 100,
    retrievalTimestamp: "2026-10-29T00:00:00.000Z",
    per100g: {
      calories: 130,
      protein: 2.69,
      carbs: 28.17,
      fat: 0.28,
      fibre: 0.4,
      sugars: 0.05,
      sodium: 1,
      potassium: 35,
      iron: 1.2,
    },
  },

  // 4. Whole boiled egg (1 large egg is ~50g edible)
  "boiled egg": {
    source: "USDA",
    sourceId: "173424",
    name: "Egg, whole, hard-boiled",
    preparationState: "cooked",
    ediblePortionPct: 100,
    retrievalTimestamp: "2026-10-29T00:00:00.000Z",
    per100g: {
      calories: 155,
      protein: 12.58,
      carbs: 1.12,
      fat: 10.61,
      fibre: 0,
      sugars: 1.12,
      cholesterol: 373,
      sodium: 124,
      potassium: 126,
      iron: 1.19,
    },
  },

  // 5. Bread slice (1 standard slice is ~28g)
  "bread slice": {
    source: "USDA",
    sourceId: "172685",
    name: "White bread",
    preparationState: "cooked",
    ediblePortionPct: 100,
    retrievalTimestamp: "2026-10-29T00:00:00.000Z",
    per100g: {
      calories: 265,
      protein: 8.85,
      carbs: 49.2,
      fat: 3.2,
      fibre: 2.7,
      sugars: 5.67,
      sodium: 491,
      calcium: 144,
      iron: 3.64,
    },
  },

  // 6. Banana (1 medium banana is ~118g)
  "banana": {
    source: "USDA",
    sourceId: "173944",
    name: "Banana, raw",
    preparationState: "raw",
    ediblePortionPct: 100,
    retrievalTimestamp: "2026-10-29T00:00:00.000Z",
    per100g: {
      calories: 89,
      protein: 1.09,
      carbs: 22.84,
      fat: 0.33,
      fibre: 2.6,
      sugars: 12.23,
      potassium: 358,
      vitaminC: 8.7,
    },
  },

  // 7. Whole milk
  "whole milk": {
    source: "USDA",
    sourceId: "171265",
    name: "Milk, whole, 3.25% milkfat",
    preparationState: "raw",
    ediblePortionPct: 100,
    retrievalTimestamp: "2026-10-29T00:00:00.000Z",
    per100g: {
      calories: 61,
      protein: 3.15,
      carbs: 4.78,
      fat: 3.27,
      fibre: 0,
      sugars: 5.05,
      calcium: 113,
      potassium: 132,
      vitaminD: 1.3,
    },
  },

  // 8. Almonds
  "almonds": {
    source: "USDA",
    sourceId: "170567",
    name: "Almonds, raw",
    preparationState: "raw",
    ediblePortionPct: 100,
    retrievalTimestamp: "2026-10-29T00:00:00.000Z",
    per100g: {
      calories: 579,
      protein: 21.15,
      carbs: 21.55,
      fat: 49.93,
      fibre: 12.5,
      sugars: 4.35,
      magnesium: 270,
      vitaminE: 25.63,
    },
  },

  // 9. Olive oil
  "olive oil": {
    source: "USDA",
    sourceId: "171413",
    name: "Olive oil, cooking",
    preparationState: "raw",
    ediblePortionPct: 100,
    retrievalTimestamp: "2026-10-29T00:00:00.000Z",
    per100g: {
      calories: 884,
      protein: 0,
      carbs: 0,
      fat: 100,
      fibre: 0,
      sugars: 0,
      saturatedFat: 13.8,
      monounsaturatedFat: 73.0,
      polyunsaturatedFat: 10.5,
    },
  },

  // 10. Plain Dosa (1 medium dosa ~80g)
  "plain dosa": {
    source: "CUSTOM",
    sourceId: "IND-DOSA-01",
    name: "Dosa, plain, prepared on tawa with minimal oil",
    preparationState: "cooked",
    ediblePortionPct: 100,
    retrievalTimestamp: "2026-10-29T00:00:00.000Z",
    per100g: {
      calories: 168,
      protein: 3.9,
      carbs: 29.5,
      fat: 3.7,
      fibre: 1.8,
      sodium: 180,
    },
  },

  // 11. Sambar
  "sambar": {
    source: "CUSTOM",
    sourceId: "IND-SAMBAR-01",
    name: "Sambar, toor dal and mixed vegetables",
    preparationState: "cooked",
    ediblePortionPct: 100,
    retrievalTimestamp: "2026-10-29T00:00:00.000Z",
    per100g: {
      calories: 54,
      protein: 2.8,
      carbs: 8.2,
      fat: 1.1,
      fibre: 2.1,
      sodium: 240,
    },
  },

  // 12. Coconut chutney
  "coconut chutney": {
    source: "CUSTOM",
    sourceId: "IND-CHUTNEY-01",
    name: "Coconut chutney, freshly ground",
    preparationState: "raw",
    ediblePortionPct: 100,
    retrievalTimestamp: "2026-10-29T00:00:00.000Z",
    per100g: {
      calories: 220,
      protein: 2.9,
      carbs: 6.8,
      fat: 20.4,
      fibre: 4.5,
      sodium: 150,
    },
  },

  // 13. Chapati / Roti (1 standard chapati is ~35g)
  "chapati / roti": {
    source: "CUSTOM",
    sourceId: "IND-ROTI-01",
    name: "Whole wheat chapati / roti (without ghee)",
    preparationState: "cooked",
    ediblePortionPct: 100,
    retrievalTimestamp: "2026-10-29T00:00:00.000Z",
    per100g: {
      calories: 297,
      protein: 9.6,
      carbs: 60.1,
      fat: 1.7,
      fibre: 9.5,
      sodium: 120,
    },
  },

  // 14. Paneer curry
  "paneer curry": {
    source: "CUSTOM",
    sourceId: "IND-PANEER-01",
    name: "Paneer curry / Paneer masala",
    preparationState: "cooked",
    ediblePortionPct: 100,
    retrievalTimestamp: "2026-10-29T00:00:00.000Z",
    per100g: {
      calories: 195,
      protein: 8.5,
      carbs: 6.2,
      fat: 15.1,
      fibre: 1.4,
      calcium: 210,
      sodium: 290,
    },
  },

  // 15. Mixed vegetables
  "mixed vegetables": {
    source: "USDA",
    sourceId: "170427",
    name: "Vegetables, mixed, cooked",
    preparationState: "cooked",
    ediblePortionPct: 100,
    retrievalTimestamp: "2026-10-29T00:00:00.000Z",
    per100g: {
      calories: 65,
      protein: 2.6,
      carbs: 13.1,
      fat: 0.3,
      fibre: 4.2,
      sugars: 4.0,
      vitaminA: 420,
      vitaminC: 12.0,
    },
  },
};

/**
 * NutritionDataProvider: Retrieves verified food data from USDA or curated verified database.
 */
export class NutritionDataProvider {
  private cache: Map<string, FoodCompositionRecord> = new Map();

  constructor() {
    // Populate cache with built-in verified items
    for (const [key, item] of Object.entries(VERIFIED_FOOD_DATABASE)) {
      this.cache.set(key.toLowerCase(), item);
    }
  }

  /**
   * Looks up nutritional profile by food name and preparation state.
   */
  public async lookupFood(foodName: string, preferredState?: "raw" | "cooked"): Promise<FoodCompositionRecord | null> {
    const query = foodName.toLowerCase().trim();

    // Direct match
    if (this.cache.has(query)) {
      return this.cache.get(query)!;
    }

    // Partial substring match
    for (const [key, record] of this.cache.entries()) {
      if (query.includes(key) || key.includes(query)) {
        if (!preferredState || record.preparationState === preferredState) {
          return record;
        }
      }
    }

    // Fallback: match any state
    for (const [key, record] of this.cache.entries()) {
      if (query.includes(key) || key.includes(query)) {
        return record;
      }
    }

    return null;
  }
}

export const nutritionDataProvider = new NutritionDataProvider();
