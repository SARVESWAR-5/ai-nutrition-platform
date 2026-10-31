/**
 * Core Domain Models and Nutrition Types
 */

export interface NutrientValues {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
  waterMl?: number | null;
  sugars?: number | null;
  addedSugars?: number | null;
  saturatedFat?: number | null;
  monounsaturatedFat?: number | null;
  polyunsaturatedFat?: number | null;
  transFat?: number | null;
  cholesterol?: number | null;
  sodium?: number | null;
  potassium?: number | null;
  calcium?: number | null;
  iron?: number | null;
  magnesium?: number | null;
  zinc?: number | null;
  phosphorus?: number | null;
  vitaminA?: number | null;
  vitaminC?: number | null;
  vitaminD?: number | null;
  vitaminE?: number | null;
  vitaminK?: number | null;
  thiamin?: number | null;
  riboflavin?: number | null;
  niacin?: number | null;
  vitaminB6?: number | null;
  folate?: number | null;
  vitaminB12?: number | null;
}

export interface UserNutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
  waterMl: number;
  effectiveFrom: string;
}

export interface InterpretedFoodItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  preparationMethod?: string;
  isCooked: boolean;
  rawGramsEquivalent?: number;
  ingredients?: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
  addedFatsOrSugars?: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
  sourceConfidence: "verified" | "estimated";
  ambiguities?: string[];
  nutrients: NutrientValues;
}

export interface InterpretedMeal {
  mealCategory: "early_morning" | "breakfast" | "mid_morning_snack" | "lunch" | "evening_snack" | "pre_workout" | "post_workout" | "dinner" | "other";
  loggedAt: string;
  items: InterpretedFoodItem[];
  totalNutrients: NutrientValues;
}
