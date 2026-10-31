import { NutrientValues } from "./types";

export interface SavedFoodItem {
  id: string;
  name: string;
  defaultQuantity: number;
  unit: string;
  preparationMethod: string;
  isCooked: boolean;
  nutrientsPerServing: NutrientValues;
  savedAt: string;
  timesUsed: number;
}

const STORAGE_SAVED_FOODS_KEY = "sarveswar_saved_foods_library";

/**
 * SavedFoodsService: Persistent Personal Food Library & Memory (Feature 08).
 * Stores confirmed foods in persistent storage so the user can quickly reuse them
 * with quantity adjustments instead of typing full descriptions each time.
 */
class SavedFoodsService {
  private library: SavedFoodItem[] = [];

  constructor() {
    this.library = [
      {
        id: "saved-1",
        name: "Boiled Eggs",
        defaultQuantity: 2,
        unit: "piece",
        preparationMethod: "hard-boiled",
        isCooked: true,
        nutrientsPerServing: {
          calories: 155,
          protein: 12.6,
          carbs: 1.1,
          fat: 10.6,
          fibre: 0,
        },
        savedAt: "2026-10-25T08:00:00Z",
        timesUsed: 12,
      },
      {
        id: "saved-2",
        name: "Grilled Chicken Breast",
        defaultQuantity: 150,
        unit: "g",
        preparationMethod: "grilled (with 1 tsp olive oil)",
        isCooked: true,
        nutrientsPerServing: {
          calories: 292,
          protein: 46.5,
          carbs: 0,
          fat: 10.4,
          fibre: 0,
        },
        savedAt: "2026-10-25T13:00:00Z",
        timesUsed: 18,
      },
      {
        id: "saved-3",
        name: "Cooked White Rice",
        defaultQuantity: 200,
        unit: "g",
        preparationMethod: "steamed",
        isCooked: true,
        nutrientsPerServing: {
          calories: 260,
          protein: 5.4,
          carbs: 56.3,
          fat: 0.6,
          fibre: 0.8,
        },
        savedAt: "2026-10-25T13:00:00Z",
        timesUsed: 15,
      },
      {
        id: "saved-4",
        name: "Whole Wheat Bread",
        defaultQuantity: 2,
        unit: "slice",
        preparationMethod: "toasted",
        isCooked: true,
        nutrientsPerServing: {
          calories: 148,
          protein: 5.0,
          carbs: 27.6,
          fat: 1.8,
          fibre: 1.5,
        },
        savedAt: "2026-10-26T08:30:00Z",
        timesUsed: 9,
      },
      {
        id: "saved-5",
        name: "Banana",
        defaultQuantity: 1,
        unit: "piece",
        preparationMethod: "raw",
        isCooked: false,
        nutrientsPerServing: {
          calories: 105,
          protein: 1.3,
          carbs: 27.0,
          fat: 0.4,
          fibre: 3.1,
        },
        savedAt: "2026-10-26T09:00:00Z",
        timesUsed: 14,
      },
      {
        id: "saved-6",
        name: "Whole Milk with Mixed Nuts Powder",
        defaultQuantity: 330,
        unit: "ml",
        preparationMethod: "blended (almonds, cashews, walnuts)",
        isCooked: false,
        nutrientsPerServing: {
          calories: 375,
          protein: 15.5,
          carbs: 21.0,
          fat: 26.5,
          fibre: 2.8,
        },
        savedAt: "2026-10-27T07:30:00Z",
        timesUsed: 10,
      },
    ];

    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_SAVED_FOODS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.library = parsed;
          }
        }
      } catch (err) {
        console.warn("Could not load saved foods library from localStorage:", err);
      }
    }
  }

  private saveToStorage() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_SAVED_FOODS_KEY, JSON.stringify(this.library));
        window.dispatchEvent(new CustomEvent("sarveswar-saved-foods-updated"));
      } catch (err) {
        console.warn("Could not persist saved foods library to localStorage:", err);
      }
    }
  }

  public getSavedFoods(): SavedFoodItem[] {
    this.loadFromStorage();
    return [...this.library].sort((a, b) => b.timesUsed - a.timesUsed);
  }

  public saveFood(item: Omit<SavedFoodItem, "id" | "savedAt" | "timesUsed">): SavedFoodItem {
    this.loadFromStorage();
    // Check if an item with similar name already exists to increment usage instead of duplicate
    const existing = this.library.find((f) => f.name.toLowerCase() === item.name.toLowerCase());
    if (existing) {
      existing.timesUsed += 1;
      existing.defaultQuantity = item.defaultQuantity;
      existing.unit = item.unit;
      existing.nutrientsPerServing = item.nutrientsPerServing;
      this.saveToStorage();
      return existing;
    }

    const newFood: SavedFoodItem = {
      ...item,
      id: `saved-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      savedAt: new Date().toISOString(),
      timesUsed: 1,
    };

    this.library.unshift(newFood);
    this.saveToStorage();
    return newFood;
  }

  public recordUsage(id: string): void {
    this.loadFromStorage();
    const item = this.library.find((f) => f.id === id);
    if (item) {
      item.timesUsed += 1;
      this.saveToStorage();
    }
  }

  public deleteSavedFood(id: string): boolean {
    this.loadFromStorage();
    const initialLen = this.library.length;
    this.library = this.library.filter((f) => f.id !== id);
    const deleted = this.library.length < initialLen;
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }
}

export const savedFoodsService = new SavedFoodsService();
