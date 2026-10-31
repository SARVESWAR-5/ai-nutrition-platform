import { NutrientValues } from "./types";
import { nutritionCalculationService } from "../nutrition/calculation-service";
import { nutritionDataProvider } from "../nutrition/data-provider";

export interface RecipeItem {
  id: string;
  name: string;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  isFavourite: boolean;
  category: "breakfast" | "main" | "snack" | "drink";
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
  instructions: string[];
  nutrientsPerServing: NutrientValues;
  source?: "default" | "saved_from_ai" | "custom";
}

const STORAGE_RECIPES_KEY = "sarveswar_saved_recipes";

const DEFAULT_RECIPES: RecipeItem[] = [
  {
    id: "recipe-milk-nuts-shake",
    name: "High-Calorie Nut & Milk Shake (PG-Friendly)",
    servings: 1,
    prepTimeMinutes: 5,
    cookTimeMinutes: 0,
    isFavourite: true,
    category: "drink",
    source: "default",
    ingredients: [
      { name: "Whole milk", quantity: 330, unit: "ml" },
      { name: "Almonds", quantity: 15, unit: "g" },
      { name: "Cashews", quantity: 15, unit: "g" },
    ],
    instructions: [
      "Grind 15g almonds and 15g cashews into a fine powder.",
      "Mix thoroughly into 330ml chilled whole milk.",
      "Drink at 7 AM or post-workout.",
    ],
    nutrientsPerServing: {
      calories: 375,
      protein: 15.5,
      carbs: 21.0,
      fat: 26.5,
      fibre: 2.8,
    },
  },
  {
    id: "recipe-scrambled-eggs-toast",
    name: "Quick 3-Egg Scramble on Whole Wheat Toast",
    servings: 1,
    prepTimeMinutes: 5,
    cookTimeMinutes: 10,
    isFavourite: true,
    category: "breakfast",
    source: "default",
    ingredients: [
      { name: "Boiled egg", quantity: 3, unit: "piece" },
      { name: "Bread slice", quantity: 2, unit: "slice" },
      { name: "Olive oil", quantity: 5, unit: "g" },
    ],
    instructions: [
      "Toast 2 slices of bread until golden crisp.",
      "Scramble 3 whole eggs in a pan with 1 tsp olive oil and black pepper.",
      "Serve hot.",
    ],
    nutrientsPerServing: {
      calories: 425,
      protein: 24.5,
      carbs: 28.5,
      fat: 24.0,
      fibre: 1.5,
    },
  },
];

class RecipeService {
  private recipes: RecipeItem[] = [...DEFAULT_RECIPES];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(STORAGE_RECIPES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.recipes = parsed;
            return;
          }
        }
      } catch (err) {
        console.warn("Could not load recipes from localStorage:", err);
      }
    }
  }

  private saveToStorage() {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_RECIPES_KEY, JSON.stringify(this.recipes));
        window.dispatchEvent(new CustomEvent("sarveswar-recipes-updated"));
      } catch (err) {
        console.warn("Could not save recipes to localStorage:", err);
      }
    }
  }

  public getRecipes(): RecipeItem[] {
    this.loadFromStorage();
    return this.recipes;
  }

  public getRecipe(id: string): RecipeItem | undefined {
    this.loadFromStorage();
    return this.recipes.find((r) => r.id === id);
  }

  public saveRecipe(recipe: Omit<RecipeItem, "id">): RecipeItem {
    this.loadFromStorage();
    const newRecipe: RecipeItem = {
      ...recipe,
      id: `recipe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      isFavourite: recipe.isFavourite ?? false,
      source: recipe.source || "saved_from_ai",
    };
    this.recipes.unshift(newRecipe);
    this.saveToStorage();
    return newRecipe;
  }

  public deleteRecipe(id: string): boolean {
    this.loadFromStorage();
    const initLen = this.recipes.length;
    this.recipes = this.recipes.filter((r) => r.id !== id);
    const deleted = this.recipes.length < initLen;
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  public toggleFavourite(id: string): boolean {
    this.loadFromStorage();
    const r = this.getRecipe(id);
    if (!r) return false;
    r.isFavourite = !r.isFavourite;
    this.saveToStorage();
    return r.isFavourite;
  }
}

export const recipeService = new RecipeService();
