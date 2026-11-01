import { NutrientValues, UserNutritionGoals } from "./types";
import { DEFAULT_NUTRITION_TARGETS } from "./goal-service";
import { llmClient } from "../llm/client";

export interface NutrientGoalProgress {
  nutrient: string;
  target: number;
  consumed: number;
  remaining: number;
  excess: number;
  percentComplete: number;
  unit: string;
}

export interface MacroCalorieDistribution {
  proteinCalories: number;
  carbsCalories: number;
  fatCalories: number;
  totalMacroCalories: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  discrepancyKcal: number;
  explanation: string;
}

export interface DailyInsightSummary {
  date: string;
  status: "on_track" | "protein_low" | "fat_high" | "exceeded" | "balanced";
  headline: string;
  bulletPoints: string[];
  aiAnalysisText: string;
  source: "deterministic_rules" | "gemini_ai";
}

export interface NutrientExcessAudit {
  isDayExceeded: boolean;
  excessCalories: number;
  excessFatGrams: number;
  potentialBodyFatGrams: number; // excessCalories / 7.7
  exceededNutrients: Array<{
    nutrient: string;
    target: number;
    consumed: number;
    excessAmount: number;
    unit: string;
  }>;
  fulfilledNutrients: string[];
  remaining: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fibre: number;
  };
  workoutOffset: {
    walkingMinutes: number;
    walkingSteps: number;
    runningMinutes: number;
    gymMinutes: number;
  };
}

export interface PostMealEncouragement {
  headline: string;
  subheadline: string;
  motivationMessage: string;
  fulfilledBadge?: string;
  fatScienceExplanation?: string;
  audit: NutrientExcessAudit;
}

export class NutritionGoalEngine {
  /**
   * Calculates progress for all primary nutrients given confirmed daily intake and targets.
   * Exceeded amounts are shown explicitly as excess rather than negative remaining.
   */
  public calculateProgress(
    consumed: NutrientValues,
    waterConsumedMl: number = 0,
    targets: UserNutritionGoals = DEFAULT_NUTRITION_TARGETS
  ): Record<string, NutrientGoalProgress> {
    const calc = (name: string, consumedVal: number, targetVal: number, unit: string): NutrientGoalProgress => {
      const remaining = Math.max(0, targetVal - consumedVal);
      const excess = Math.max(0, consumedVal - targetVal);
      const percentComplete = targetVal > 0 ? Math.min(100, Math.round((consumedVal / targetVal) * 100)) : 0;

      return {
        nutrient: name,
        target: Math.round(targetVal),
        consumed: Math.round(consumedVal * 10) / 10,
        remaining: Math.round(remaining * 10) / 10,
        excess: Math.round(excess * 10) / 10,
        percentComplete,
        unit,
      };
    };

    return {
      calories: calc("Calories", consumed.calories || 0, targets.calories, "kcal"),
      protein: calc("Protein", consumed.protein || 0, targets.protein, "g"),
      carbs: calc("Carbohydrates", consumed.carbs || 0, targets.carbs, "g"),
      fat: calc("Fat", consumed.fat || 0, targets.fat, "g"),
      fibre: calc("Fibre", consumed.fibre || 0, targets.fibre, "g"),
      water: calc("Water", waterConsumedMl, targets.waterMl, "ml"),
    };
  }

  /**
   * Computes the 4-4-9 macronutrient calorie distribution and explains discrepancies
   * resulting from fibre subtraction, Atwater general factors vs specific food factors, and rounding.
   */
  public calculateMacroCalories(consumed: NutrientValues): MacroCalorieDistribution {
    const proteinCalories = Math.round((consumed.protein || 0) * 4);
    const carbsCalories = Math.round((consumed.carbs || 0) * 4);
    const fatCalories = Math.round((consumed.fat || 0) * 9);
    const totalMacroCalories = proteinCalories + carbsCalories + fatCalories;

    const loggedCalories = consumed.calories || 0;
    const discrepancyKcal = Math.abs(loggedCalories - totalMacroCalories);

    const safeTotal = totalMacroCalories > 0 ? totalMacroCalories : 1;
    const proteinPct = Math.round((proteinCalories / safeTotal) * 100);
    const carbsPct = Math.round((carbsCalories / safeTotal) * 100);
    const fatPct = Math.round((fatCalories / safeTotal) * 100);

    let explanation = "Macronutrient calories calculated using standard Atwater factors (4 kcal/g protein, 4 kcal/g carbs, 9 kcal/g fat).";
    if (discrepancyKcal > 10) {
      explanation += ` Difference of ${discrepancyKcal} kcal compared to database total is normal due to dietary fibre (which contributes ~2 kcal/g rather than 4), specific heat of combustion factors in whole foods, and integer label rounding.`;
    }

    return {
      proteinCalories,
      carbsCalories,
      fatCalories,
      totalMacroCalories,
      proteinPct,
      carbsPct,
      fatPct,
      discrepancyKcal,
      explanation,
    };
  }

  /**
   * Generates immediate deterministic insights based on current confirmed database totals.
   * If Gemini is available, refreshes asynchronously with personalized LLM context.
   */
  public async generateDailyInsights(
    dateStr: string,
    consumed: NutrientValues,
    waterConsumedMl: number = 0,
    targets: UserNutritionGoals = DEFAULT_NUTRITION_TARGETS,
    userProfile?: { preferredDinnerCutoff?: string; foodsAvoided?: string[] }
  ): Promise<DailyInsightSummary> {
    const progress = this.calculateProgress(consumed, waterConsumedMl, targets);
    const bullets: string[] = [];

    // 1. Protein analysis
    if (progress.protein.consumed < progress.protein.target * 0.5) {
      bullets.push(`Protein is currently low at ${progress.protein.consumed}g of your ${progress.protein.target}g goal. Prioritize high-protein choices for your remaining meals.`);
    } else if (progress.protein.consumed >= progress.protein.target) {
      bullets.push(`Great job! You have reached your daily protein goal (${progress.protein.consumed}g / ${progress.protein.target}g).`);
    } else {
      bullets.push(`You have ${progress.protein.remaining}g of protein remaining to hit your ${progress.protein.target}g target.`);
    }

    // 2. Fibre analysis
    if (progress.fibre.consumed < progress.fibre.target * 0.4) {
      bullets.push(`Fibre intake could be improved (${progress.fibre.consumed}g logged vs ${progress.fibre.target}g target). Consider vegetables, fruit, or dal.`);
    }

    // 3. Calorie & Dinner cutoff rule
    const dinnerCutoff = userProfile?.preferredDinnerCutoff || "19:00";
    if (progress.calories.excess > 0) {
      bullets.push(`Calorie target exceeded by ${progress.calories.excess} kcal.`);
    } else if (progress.calories.remaining > 400) {
      bullets.push(`You have ${progress.calories.remaining} kcal remaining for dinner. Aim to finish your last meal before ${dinnerCutoff} IST.`);
    } else {
      bullets.push(`Calorie budget is well utilized with ${progress.calories.remaining} kcal remaining.`);
    }

    // 4. Water check
    if (progress.water.consumed < progress.water.target * 0.6) {
      bullets.push(`Water intake is at ${progress.water.consumed}ml. Aim to drink ${progress.water.remaining}ml more today.`);
    }

    const defaultHeadline = progress.calories.excess > 0 ? "Daily Calorie Target Exceeded" : "Daily Nutrition On Track";
    let aiText = bullets.join(" ");

    // Asynchronous Gemini enhancement if available
    if (llmClient.isAvailable()) {
      try {
        const prompt = `Review the following confirmed nutrition totals for Sarveswar on ${dateStr}:
Consumed: Calories ${consumed.calories} kcal (Target ${targets.calories}), Protein ${consumed.protein}g (Target ${targets.protein}g), Carbs ${consumed.carbs}g (Target ${targets.carbs}g), Fat ${consumed.fat}g (Target ${targets.fat}g), Fibre ${consumed.fibre}g (Target ${targets.fibre}g), Water ${waterConsumedMl}ml (Target ${targets.waterMl}ml).
Excluded from all suggestions: whey protein.
Preferred dinner cutoff: ${dinnerCutoff} IST.
Provide a concise, motivating 2-3 sentence nutritional coaching insight.`;

        const geminiText = await llmClient.generateText({
          prompt,
          systemInstruction: "You are an expert personal nutrition coach.",
          model: llmClient.getFastModel(),
          timeoutMs: 4000,
        });

        if (geminiText.trim().length > 0) {
          aiText = geminiText.trim();
          return {
            date: dateStr,
            status: progress.calories.excess > 0 ? "exceeded" : "on_track",
            headline: defaultHeadline,
            bulletPoints: bullets,
            aiAnalysisText: aiText,
            source: "gemini_ai",
          };
        }
      } catch {
        // Fall back gracefully to deterministic analysis
      }
    }

    return {
      date: dateStr,
      status: progress.calories.excess > 0 ? "exceeded" : "on_track",
      headline: defaultHeadline,
      bulletPoints: bullets,
      aiAnalysisText: aiText,
      source: "deterministic_rules",
    };
  }

  /**
   * Evaluates nutrient over-consumption, flags exceeded nutrients & day,
   * calculates equivalent potential adipose body fat gain, and computes compensatory workouts.
   */
  public calculateExcessAndCompensatoryWorkouts(
    consumed: NutrientValues,
    targets: UserNutritionGoals = DEFAULT_NUTRITION_TARGETS,
    userWeightKg: number = 75
  ): NutrientExcessAudit {
    const safeWeight = userWeightKg > 30 ? userWeightKg : 75;

    const remaining = {
      calories: Math.max(0, targets.calories - (consumed.calories || 0)),
      protein: Math.max(0, Math.round((targets.protein - (consumed.protein || 0)) * 10) / 10),
      carbs: Math.max(0, Math.round((targets.carbs - (consumed.carbs || 0)) * 10) / 10),
      fat: Math.max(0, Math.round((targets.fat - (consumed.fat || 0)) * 10) / 10),
      fibre: Math.max(0, Math.round((targets.fibre - (consumed.fibre || 0)) * 10) / 10),
    };

    const exceededNutrients: Array<{
      nutrient: string;
      target: number;
      consumed: number;
      excessAmount: number;
      unit: string;
    }> = [];

    const fulfilledNutrients: string[] = [];

    // Check Calories
    if ((consumed.calories || 0) > targets.calories) {
      exceededNutrients.push({
        nutrient: "Calories",
        target: targets.calories,
        consumed: consumed.calories || 0,
        excessAmount: (consumed.calories || 0) - targets.calories,
        unit: "kcal",
      });
    } else if ((consumed.calories || 0) >= targets.calories * 0.95) {
      fulfilledNutrients.push(`Calories (${targets.calories} kcal)`);
    }

    // Check Protein
    if ((consumed.protein || 0) >= targets.protein) {
      fulfilledNutrients.push(`Protein (${targets.protein}g)`);
      if ((consumed.protein || 0) > targets.protein * 1.25) {
        exceededNutrients.push({
          nutrient: "Protein",
          target: targets.protein,
          consumed: consumed.protein || 0,
          excessAmount: Math.round(((consumed.protein || 0) - targets.protein) * 10) / 10,
          unit: "g",
        });
      }
    }

    // Check Fat
    if ((consumed.fat || 0) > targets.fat) {
      exceededNutrients.push({
        nutrient: "Fat",
        target: targets.fat,
        consumed: consumed.fat || 0,
        excessAmount: Math.round(((consumed.fat || 0) - targets.fat) * 10) / 10,
        unit: "g",
      });
    } else if ((consumed.fat || 0) >= targets.fat * 0.95) {
      fulfilledNutrients.push(`Fat (${targets.fat}g)`);
    }

    // Check Carbs
    if ((consumed.carbs || 0) > targets.carbs) {
      exceededNutrients.push({
        nutrient: "Carbohydrates",
        target: targets.carbs,
        consumed: consumed.carbs || 0,
        excessAmount: Math.round(((consumed.carbs || 0) - targets.carbs) * 10) / 10,
        unit: "g",
      });
    } else if ((consumed.carbs || 0) >= targets.carbs * 0.95) {
      fulfilledNutrients.push(`Carbohydrates (${targets.carbs}g)`);
    }

    // Check Fibre
    if ((consumed.fibre || 0) >= targets.fibre) {
      fulfilledNutrients.push(`Dietary Fibre (${targets.fibre}g)`);
    }

    const excessCalories = Math.max(0, (consumed.calories || 0) - targets.calories);
    const excessFatGrams = Math.max(0, Math.round(((consumed.fat || 0) - targets.fat) * 10) / 10);
    const isDayExceeded = excessCalories > 0 || excessFatGrams > 5;

    // 1 kg human body fat tissue = ~7,700 kcal (7.7 kcal/g)
    const potentialBodyFatGrams = excessCalories > 0 ? Math.round((excessCalories / 7.7) * 10) / 10 : 0;

    // Workouts based on METs formula: kcal/min = (MET * 3.5 * weightKg) / 200
    // Walking (3.5 METs): kcal/min ≈ 4.6
    const walkingKcalPerMin = (3.5 * 3.5 * safeWeight) / 200;
    const runningKcalPerMin = (8.5 * 3.5 * safeWeight) / 200;
    const gymKcalPerMin = (5.5 * 3.5 * safeWeight) / 200;

    const walkingMinutes = excessCalories > 0 ? Math.ceil(excessCalories / walkingKcalPerMin) : 0;
    const walkingSteps = excessCalories > 0 ? Math.round(excessCalories * 22) : 0;
    const runningMinutes = excessCalories > 0 ? Math.ceil(excessCalories / runningKcalPerMin) : 0;
    const gymMinutes = excessCalories > 0 ? Math.ceil(excessCalories / gymKcalPerMin) : 0;

    return {
      isDayExceeded,
      excessCalories,
      excessFatGrams,
      potentialBodyFatGrams,
      exceededNutrients,
      fulfilledNutrients,
      remaining,
      workoutOffset: {
        walkingMinutes,
        walkingSteps,
        runningMinutes,
        gymMinutes,
      },
    };
  }

  /**
   * Generates instant post-meal encouragement message with remaining goals, fulfilled badges,
   * flags, and workout offset if limit exceeded.
   */
  public getPostMealEncouragement(
    consumed: NutrientValues,
    targets: UserNutritionGoals = DEFAULT_NUTRITION_TARGETS,
    mealName?: string,
    userWeightKg: number = 75
  ): PostMealEncouragement {
    const audit = this.calculateExcessAndCompensatoryWorkouts(consumed, targets, userWeightKg);

    let headline = "Meal Successfully Logged!";
    if (mealName) {
      headline = `${mealName} Successfully Logged!`;
    }

    let subheadline = "Great consistency! Keep up the momentum toward your daily target.";
    let motivationMessage = `Further remaining to achieve today's goal: ${audit.remaining.calories} kcal, ${audit.remaining.protein}g Protein, ${audit.remaining.carbs}g Carbs, ${audit.remaining.fat}g Fat.`;

    let fulfilledBadge: string | undefined;
    if (audit.fulfilledNutrients.length > 0) {
      fulfilledBadge = `🎯 Goal Fulfilled: ${audit.fulfilledNutrients.join(", ")} reached 100% target!`;
    }

    let fatScienceExplanation: string | undefined;

    if (audit.isDayExceeded) {
      headline = "⚠️ Daily Nutrient Limit Exceeded (Day Flagged)";
      subheadline = `You have exceeded your target budget by +${audit.excessCalories} kcal (${audit.potentialBodyFatGrams}g potential adipose fat gain).`;
      motivationMessage = `Extra Compensatory Workout to Burn Excess: ${audit.workoutOffset.walkingMinutes} mins brisk walk (~${audit.workoutOffset.walkingSteps.toLocaleString()} steps), ${audit.workoutOffset.runningMinutes} mins jogging, or ${audit.workoutOffset.gymMinutes} mins gym strength workout.`;
      fatScienceExplanation = `Excess Caloric Storage Science: All macronutrients (dietary fats, carbohydrates, and protein) ingested in excess of daily metabolic expenditure are converted and stored as adipose body fat. While dietary fat is stored directly with 97–98% metabolic efficiency, surplus carbs and protein spare fat burning and undergo conversion (1 kg adipose body fat ≈ 7,700 kcal). Your surplus of +${audit.excessCalories} kcal represents ~${audit.potentialBodyFatGrams}g potential body fat accumulation.`;
    } else {
      fatScienceExplanation = "Metabolic Balance: Consumed nutrients are directly fueling muscle recovery, protein synthesis, and vital metabolic activity within your daily target budget.";
    }

    return {
      headline,
      subheadline,
      motivationMessage,
      fulfilledBadge,
      fatScienceExplanation,
      audit,
    };
  }
}

export const nutritionGoalEngine = new NutritionGoalEngine();
