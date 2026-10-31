import { diaryService, MealCategory } from "./diary-service";
import { NutrientValues } from "./types";
import { getLocalTodayDateString } from "../date/date-service";
import { authService } from "./auth-service";

export interface PlannedMealItem {
  id: string;
  foodName: string;
  quantity: number;
  unit: string;
  mealCategory: MealCategory;
  scheduledTime: string; // e.g. "08:30"
  nutrients: NutrientValues;
  isLoggedAsEaten: boolean;
}

export interface DayMealPlan {
  id: string;
  planDate: string; // YYYY-MM-DD
  title: string;
  items: PlannedMealItem[];
  totalPlannedNutrients: NutrientValues;
}

const STORAGE_MEAL_PLANS_KEY = "sarveswar_meal_plans";

class MealPlanService {
  private plans: DayMealPlan[] = [];

  constructor() {
    this.loadFromStorage();
    if (typeof window !== "undefined") {
      window.addEventListener("sarveswar-auth-changed", () => {
        this.loadFromStorage();
      });
    }
  }

  private getStorageKey(userId?: string): string {
    const id = userId || (typeof window !== "undefined" ? authService.getCurrentUserId() : "usr-sarveswar-primary");
    if (id === "usr-sarveswar-primary" || id === "sarveswar") {
      return STORAGE_MEAL_PLANS_KEY;
    }
    return `${STORAGE_MEAL_PLANS_KEY}_${id}`;
  }

  private loadFromStorage() {
    if (typeof window !== "undefined") {
      try {
        const id = authService.getCurrentUserId();
        const key = this.getStorageKey(id);
        const stored = window.localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            this.plans = parsed;
            return;
          }
        }

        if (id === "usr-sarveswar-primary" || id === "sarveswar") {
          const today = getLocalTodayDateString();
          const d = new Date(today);
          d.setDate(d.getDate() + 1);
          const tomorrow = d.toISOString().split("T")[0];

          this.plans = [
            {
              id: "plan-tomorrow",
              planDate: tomorrow,
              title: "Sarveswar's Balanced Gym Day Plan",
              items: [
                {
                  id: "item-plan-1",
                  foodName: "3 Boiled Eggs & 2 Slices of Bread",
                  quantity: 1,
                  unit: "serving",
                  mealCategory: "breakfast",
                  scheduledTime: "08:30",
                  nutrients: { calories: 380, protein: 24, carbs: 28, fat: 17, fibre: 2 },
                  isLoggedAsEaten: false,
                },
                {
                  id: "item-plan-2",
                  foodName: "200g Rice with 180g Grilled Chicken",
                  quantity: 1,
                  unit: "serving",
                  mealCategory: "lunch",
                  scheduledTime: "13:00",
                  nutrients: { calories: 550, protein: 58, carbs: 56, fat: 8, fibre: 2 },
                  isLoggedAsEaten: false,
                },
                {
                  id: "item-plan-3",
                  foodName: "330ml Whole Milk with 30g Almonds & Walnuts",
                  quantity: 1,
                  unit: "serving",
                  mealCategory: "evening_snack",
                  scheduledTime: "17:00",
                  nutrients: { calories: 375, protein: 17, carbs: 22, fat: 26, fibre: 4 },
                  isLoggedAsEaten: false,
                },
                {
                  id: "item-plan-4",
                  foodName: "4-Egg Bhurji with 2 Chapatis (Before 7 PM)",
                  quantity: 1,
                  unit: "serving",
                  mealCategory: "dinner",
                  scheduledTime: "18:45",
                  nutrients: { calories: 510, protein: 34, carbs: 42, fat: 23, fibre: 6 },
                  isLoggedAsEaten: false,
                },
              ],
              totalPlannedNutrients: {
                calories: 1815,
                protein: 133,
                carbs: 148,
                fat: 74,
                fibre: 14,
              },
            },
          ];
          window.localStorage.setItem(key, JSON.stringify(this.plans));
        } else {
          this.plans = [];
        }
      } catch (err) {
        console.warn("Could not load meal plans from localStorage:", err);
      }
    } else {
      const today = getLocalTodayDateString();
      const d = new Date(today);
      d.setDate(d.getDate() + 1);
      const tomorrow = d.toISOString().split("T")[0];
      this.plans = [
        {
          id: "plan-tomorrow",
          planDate: tomorrow,
          title: "Balanced Gym Day Plan",
          items: [
            {
              id: "item-plan-1",
              foodName: "3 Boiled Eggs & 2 Slices of Bread",
              quantity: 1,
              unit: "serving",
              mealCategory: "breakfast",
              scheduledTime: "08:30",
              nutrients: { calories: 380, protein: 24, carbs: 28, fat: 17, fibre: 2 },
              isLoggedAsEaten: false,
            },
          ],
          totalPlannedNutrients: { calories: 380, protein: 24, carbs: 28, fat: 17, fibre: 2 },
        },
      ];
    }
  }

  private saveToStorage() {
    if (typeof window !== "undefined") {
      try {
        const key = this.getStorageKey();
        window.localStorage.setItem(key, JSON.stringify(this.plans));
      } catch (err) {
        console.warn("Could not save meal plans to localStorage:", err);
      }
    }
  }

  public getPlanForDate(dateStr: string): DayMealPlan | undefined {
    return this.plans.find((p) => p.planDate === dateStr);
  }

  public getAllPlans(): DayMealPlan[] {
    return this.plans;
  }

  public addPlannedItem(dateStr: string, item: Omit<PlannedMealItem, "id" | "isLoggedAsEaten">): PlannedMealItem {
    let plan = this.getPlanForDate(dateStr);
    if (!plan) {
      plan = {
        id: `plan-${Date.now()}`,
        planDate: dateStr,
        title: `Meal Plan for ${dateStr}`,
        items: [],
        totalPlannedNutrients: { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 },
      };
      this.plans.push(plan);
    }

    const newItem: PlannedMealItem = {
      ...item,
      id: `pitem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      isLoggedAsEaten: false,
    };

    plan.items.push(newItem);
    this.recalculatePlanTotals(plan);
    return newItem;
  }

  /**
   * Logs a planned meal as eaten after explicit confirmation.
   * Transmits item to diaryService and flags it as eaten.
   */
  public logPlannedItemAsEaten(planId: string, itemId: string, targetDate?: string): boolean {
    const plan = this.plans.find((p) => p.id === planId);
    if (!plan) return false;

    const item = plan.items.find((i) => i.id === itemId);
    if (!item || item.isLoggedAsEaten) return false;

    const logDate = targetDate || plan.planDate;

    // Save to diary
    diaryService.addEntry({
      diaryDate: logDate,
      mealCategory: item.mealCategory,
      foodName: item.foodName,
      quantity: item.quantity,
      unit: item.unit,
      preparationMethod: "As planned",
      isCooked: true,
      confidenceLabel: "verified",
      calories: item.nutrients.calories,
      proteinG: item.nutrients.protein,
      carbsG: item.nutrients.carbs,
      fatG: item.nutrients.fat,
      fibreG: item.nutrients.fibre,
      consumedAt: `${logDate}T${item.scheduledTime}:00+05:30`,
    });

    item.isLoggedAsEaten = true;
    return true;
  }

  private recalculatePlanTotals(plan: DayMealPlan) {
    const totals: NutrientValues = { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };
    for (const item of plan.items) {
      totals.calories += item.nutrients.calories;
      totals.protein = Math.round((totals.protein + item.nutrients.protein) * 10) / 10;
      totals.carbs = Math.round((totals.carbs + item.nutrients.carbs) * 10) / 10;
      totals.fat = Math.round((totals.fat + item.nutrients.fat) * 10) / 10;
      totals.fibre = Math.round((totals.fibre + item.nutrients.fibre) * 10) / 10;
    }
    plan.totalPlannedNutrients = totals;
  }
}

export const mealPlanService = new MealPlanService();
