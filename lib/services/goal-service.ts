import { z } from "zod";
import { UserNutritionGoals } from "./types";
import { authService } from "./auth-service";

/**
 * Zod validation schema for Nutrition Goals
 */
export const NutritionGoalsSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  calories: z.number().positive("Calories must be greater than 0").max(10000),
  protein: z.number().nonnegative("Protein cannot be negative").max(600),
  carbs: z.number().nonnegative("Carbs cannot be negative").max(1500),
  fat: z.number().nonnegative("Fat cannot be negative").max(500),
  fibre: z.number().nonnegative("Fibre cannot be negative").max(150),
  waterMl: z.number().positive("Water target must be positive").max(20000),
  effectiveFrom: z.string().default(() => new Date().toISOString()),
});

export type NutritionGoals = z.infer<typeof NutritionGoalsSchema>;

/**
 * Default Initial Nutrition Targets for Sarveswar
 * User-configurable, not medical advice
 */
export const DEFAULT_NUTRITION_TARGETS: UserNutritionGoals = {
  calories: 2400,
  protein: 150,
  carbs: 290,
  fat: 70,
  fibre: 35,
  waterMl: 3000,
  effectiveFrom: new Date().toISOString(),
};

export interface GoalComparison {
  nutrient: string;
  manualTarget: number;
  calculatedRecommendation: number;
  unit: string;
  variancePct: number;
}

export interface GoalRevision {
  id: string;
  effectiveFrom: string; // YYYY-MM-DD
  goalType: "maintenance" | "bulking" | "cutting" | "recomposition";
  reason: string;
  targets: UserNutritionGoals;
  createdAt: string;
}

const STORAGE_GOAL_REVISIONS_KEY = "sarveswar_goal_revisions";

/**
 * GoalService: Immutable Goal Revisions & Historical Accuracy Engine (Feature 09).
 * Maintains a timeline of goal targets with effective dates.
 * Past dates preserve their original targets; future/new dates apply updated goals.
 */
class GoalService {
  private revisions: GoalRevision[] = [];

  constructor() {
    this.loadFromStorage();
    if (typeof window !== "undefined") {
      window.addEventListener("sarveswar-auth-changed", () => {
        this.loadFromStorage();
      });
    }
  }

  private getStorageKeys(userId?: string): { revisionsKey: string; targetsKey: string } {
    const id = userId || (typeof window !== "undefined" ? authService.getCurrentUserId() : "usr-sarveswar-primary");
    if (id === "usr-sarveswar-primary" || id === "sarveswar") {
      return {
        revisionsKey: STORAGE_GOAL_REVISIONS_KEY,
        targetsKey: "sarveswar_nutrition_targets",
      };
    }
    return {
      revisionsKey: `${STORAGE_GOAL_REVISIONS_KEY}_${id}`,
      targetsKey: `sarveswar_nutrition_targets_${id}`,
    };
  }

  private loadFromStorage() {
    if (typeof window !== "undefined") {
      try {
        const id = authService.getCurrentUserId();
        const isSarveswar = id === "usr-sarveswar-primary" || id === "sarveswar";
        const { revisionsKey, targetsKey } = this.getStorageKeys(id);

        const stored = localStorage.getItem(revisionsKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.revisions = parsed;
            return;
          }
        }

        // Check if targets were saved during onboarding
        const storedTargets = localStorage.getItem(targetsKey);
        if (storedTargets) {
          try {
            const t = JSON.parse(storedTargets);
            this.revisions = [
              {
                id: `goal-rev-${id}`,
                effectiveFrom: t.effectiveFrom || "2026-10-01",
                goalType: "recomposition",
                reason: "Initial Onboarding Targets",
                targets: { ...t, effectiveFrom: t.effectiveFrom || "2026-10-01" },
                createdAt: new Date().toISOString(),
              },
            ];
            return;
          } catch {}
        }

        if (isSarveswar) {
          this.revisions = [
            {
              id: "goal-rev-1",
              effectiveFrom: "2026-10-01",
              goalType: "recomposition",
              reason: "Initial baseline targets for Sarveswar (Body Recomposition)",
              targets: {
                calories: 2400,
                protein: 150,
                carbs: 290,
                fat: 70,
                fibre: 35,
                waterMl: 3000,
                effectiveFrom: "2026-10-01",
              },
              createdAt: "2026-10-01T00:00:00Z",
            },
          ];
        } else {
          // Generic clean baseline for new user
          this.revisions = [
            {
              id: `goal-rev-${id}`,
              effectiveFrom: new Date().toISOString().split("T")[0],
              goalType: "maintenance",
              reason: "Default Baseline Nutrition Targets",
              targets: {
                calories: 2000,
                protein: 120,
                carbs: 230,
                fat: 65,
                fibre: 30,
                waterMl: 2500,
                effectiveFrom: new Date().toISOString().split("T")[0],
              },
              createdAt: new Date().toISOString(),
            },
          ];
        }
      } catch (e) {
        console.warn("Could not load goal revisions:", e);
      }
    } else {
      this.revisions = [
        {
          id: "goal-rev-1",
          effectiveFrom: "2026-10-01",
          goalType: "recomposition",
          reason: "Initial baseline targets for Sarveswar (Body Recomposition)",
          targets: {
            calories: 2400,
            protein: 150,
            carbs: 290,
            fat: 70,
            fibre: 35,
            waterMl: 3000,
            effectiveFrom: "2026-10-01",
          },
          createdAt: "2026-10-01T00:00:00Z",
        },
      ];
    }
  }

  private saveToStorage() {
    if (typeof window !== "undefined") {
      try {
        const { revisionsKey } = this.getStorageKeys();
        localStorage.setItem(revisionsKey, JSON.stringify(this.revisions));
        window.dispatchEvent(new CustomEvent("sarveswar-targets-updated"));
      } catch (e) {
        console.warn("Could not save goal revisions:", e);
      }
    }
  }

  public getAllRevisions(): GoalRevision[] {
    this.loadFromStorage();
    return [...this.revisions].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  }

  /**
   * Retrieves the goal active on a specific historical date (Feature 09).
   * Finds the latest goal whose effectiveFrom <= targetDate.
   * Ensures older food logs are never recalculated with newer goals.
   */
  public getGoalForDate(dateStr: string): UserNutritionGoals {
    this.loadFromStorage();
    const sorted = [...this.revisions].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
    let active = sorted[0]?.targets || DEFAULT_NUTRITION_TARGETS;

    for (const rev of sorted) {
      if (rev.effectiveFrom <= dateStr) {
        active = rev.targets;
      } else {
        break;
      }
    }
    return active;
  }

  /**
   * Records a new goal revision with an effective date (Feature 09).
   */
  public addGoalRevision(params: {
    effectiveFrom: string;
    goalType: "maintenance" | "bulking" | "cutting" | "recomposition";
    reason: string;
    targets: Omit<UserNutritionGoals, "effectiveFrom">;
  }): GoalRevision {
    this.loadFromStorage();
    const newRev: GoalRevision = {
      id: `goal-rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      effectiveFrom: params.effectiveFrom,
      goalType: params.goalType,
      reason: params.reason,
      targets: {
        ...params.targets,
        effectiveFrom: params.effectiveFrom,
      },
      createdAt: new Date().toISOString(),
    };

    this.revisions.push(newRev);
    this.saveToStorage();

    const today = new Date().toISOString().split("T")[0];
    if (params.effectiveFrom <= today) {
      if (typeof window !== "undefined") {
        const { targetsKey } = this.getStorageKeys();
        localStorage.setItem(targetsKey, JSON.stringify(newRev.targets));
      }
    }

    return newRev;
  }
}

export const goalService = new GoalService();

/**
 * Compares user-configured manual targets against Mifflin-St Jeor recommendations.
 * Ensures the user sees transparent comparison without automatic overwriting.
 */
export function compareTargetsWithRecommendation(
  manual: UserNutritionGoals,
  recommended: {
    recommendedCalories: number;
    macroBreakdown: {
      proteinGrams: number;
      carbsGrams: number;
      fatGrams: number;
      fibreGrams: number;
    };
  }
): GoalComparison[] {
  const comparisons: GoalComparison[] = [
    {
      nutrient: "Calories",
      manualTarget: manual.calories,
      calculatedRecommendation: recommended.recommendedCalories,
      unit: "kcal",
      variancePct: Math.round(((manual.calories - recommended.recommendedCalories) / recommended.recommendedCalories) * 100),
    },
    {
      nutrient: "Protein",
      manualTarget: manual.protein,
      calculatedRecommendation: recommended.macroBreakdown.proteinGrams,
      unit: "g",
      variancePct: Math.round(((manual.protein - recommended.macroBreakdown.proteinGrams) / recommended.macroBreakdown.proteinGrams) * 100),
    },
    {
      nutrient: "Carbohydrates",
      manualTarget: manual.carbs,
      calculatedRecommendation: recommended.macroBreakdown.carbsGrams,
      unit: "g",
      variancePct: Math.round(((manual.carbs - recommended.macroBreakdown.carbsGrams) / recommended.macroBreakdown.carbsGrams) * 100),
    },
    {
      nutrient: "Fat",
      manualTarget: manual.fat,
      calculatedRecommendation: recommended.macroBreakdown.fatGrams,
      unit: "g",
      variancePct: Math.round(((manual.fat - recommended.macroBreakdown.fatGrams) / recommended.macroBreakdown.fatGrams) * 100),
    },
    {
      nutrient: "Fibre",
      manualTarget: manual.fibre,
      calculatedRecommendation: recommended.macroBreakdown.fibreGrams,
      unit: "g",
      variancePct: Math.round(((manual.fibre - recommended.macroBreakdown.fibreGrams) / recommended.macroBreakdown.fibreGrams) * 100),
    },
  ];

  return comparisons;
}
