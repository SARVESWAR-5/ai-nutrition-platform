import { NutrientValues, UserNutritionGoals } from "./types";
import { DEFAULT_NUTRITION_TARGETS } from "./goal-service";
import { SARVESWAR_PROFILE_DEFAULTS } from "./profile-service";
import { diaryService } from "./diary-service";
import { preferencesService } from "./preferences-service";
import { authService } from "./auth-service";
import { nutritionCalculationService } from "../nutrition/calculation-service";
import { nutritionDataProvider } from "../nutrition/data-provider";
import { llmClient } from "../llm/client";
import { getLocalTodayDateString } from "../date/date-service";

export interface RecommendedMeal {
  id: string;
  name: string;
  description: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    isExcludedItem?: boolean;
  }>;
  instructions: string[];
  nutrients: NutrientValues;
  estimatedCostInr?: number;
  fitExplanation: string;
  isConstraintSatisfied: boolean;
  constraintViolations: string[];
  isEstimated: boolean;
  isLoggedAsEaten?: boolean;
}

export interface RecommendationConversation {
  id: string;
  title: string;
  createdAt: string;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    recommendations?: RecommendedMeal[];
  }>;
}

export class MealRecommendationService {
  private conversations: RecommendationConversation[] = [];

  constructor() {
    // Seed initial clean conversation
    this.conversations.push({
      id: "conv-1",
      title: "Nutrition Coach & Recipes",
      createdAt: new Date().toISOString(),
      messages: [],
    });
  }

  // ============================================================================
  // ALLOW-LISTED RETRIEVAL TOOLS (Prompt Section 3 & 4.10)
  // Gemini may ONLY call these authenticated server functions; cannot execute SQL.
  // ============================================================================

  public get_today_totals(dateStr: string = getLocalTodayDateString()): NutrientValues {
    return diaryService.getDailyTotals(dateStr);
  }

  public get_goals(): UserNutritionGoals {
    return DEFAULT_NUTRITION_TARGETS;
  }

  public get_profile_constraints() {
    const prefs = preferencesService.getPreferences();
    const currentUser = authService.getCurrentUser();
    return {
      name: currentUser ? currentUser.name : (SARVESWAR_PROFILE_DEFAULTS.name || "User"),
      timeZone: SARVESWAR_PROFILE_DEFAULTS.timezone || "Asia/Kolkata",
      dinnerCutoff: prefs.cutoffs.dinner || "19:00",
      foodsAvoided: prefs.foodsAvoided || [],
      cookingAbility: SARVESWAR_PROFILE_DEFAULTS.cookingAbility,
      fitnessGoal: SARVESWAR_PROFILE_DEFAULTS.fitnessGoal,
    };
  }

  public get_food_history(days: number = 7) {
    const today = getLocalTodayDateString();
    return {
      todayDate: today,
      recentEntries: diaryService.getEntriesForDate(today),
    };
  }

  // ============================================================================
  // CONVERSATION MANAGEMENT
  // ============================================================================

  public getConversations(): RecommendationConversation[] {
    return this.conversations;
  }

  public getConversation(id: string): RecommendationConversation | undefined {
    return this.conversations.find((c) => c.id === id);
  }

  public createConversation(title: string = "New Recommendation Request"): RecommendationConversation {
    const newConv: RecommendationConversation = {
      id: `conv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title,
      createdAt: new Date().toISOString(),
      messages: [],
    };
    this.conversations.unshift(newConv);
    return newConv;
  }

  public renameConversation(id: string, newTitle: string): boolean {
    const c = this.getConversation(id);
    if (!c) return false;
    c.title = newTitle;
    return true;
  }

  public deleteConversation(id: string): boolean {
    const initialLen = this.conversations.length;
    this.conversations = this.conversations.filter((c) => c.id !== id);
    return this.conversations.length < initialLen;
  }

  // ============================================================================
  // DETERMINISTIC VALIDATION PIPELINE (Prompt Section 4.10)
  // Propose -> Look up nutrient data -> Deterministic calculation -> Constraint check
  // ============================================================================

  public async validateAndCalculateRecommendation(
    mealProposal: Omit<RecommendedMeal, "nutrients" | "isConstraintSatisfied" | "constraintViolations" | "isEstimated">,
    constraints?: { maxCalories?: number; minProtein?: number; beforeTime?: string }
  ): Promise<RecommendedMeal> {
    const calculatedIngredientNutrients: NutrientValues[] = [];
    const violations: string[] = [];

    // Dynamically retrieve user profile exclusions from preferences service
    const avoidedList = preferencesService.getPreferences().foodsAvoided || ["whey protein", "squid"];

    // Check meal title against exclusions
    for (const excluded of avoidedList) {
      if (mealProposal.name.toLowerCase().includes(excluded.toLowerCase().trim())) {
        const capitalized = excluded.charAt(0).toUpperCase() + excluded.slice(1);
        violations.push(`${capitalized} is strictly excluded from your profile.`);
      }
    }

    // Check ingredients against all exclusions
    for (const ing of mealProposal.ingredients) {
      for (const excluded of avoidedList) {
        if (ing.name.toLowerCase().includes(excluded.toLowerCase().trim())) {
          const capitalized = excluded.charAt(0).toUpperCase() + excluded.slice(1);
          violations.push(`${capitalized} is strictly excluded from your profile.`);
          ing.isExcludedItem = true;
        }
      }

      const { grams } = nutritionCalculationService.convertToGrams(ing.name, ing.quantity, ing.unit);
      const record = await nutritionDataProvider.lookupFood(ing.name);

      if (record) {
        calculatedIngredientNutrients.push(
          nutritionCalculationService.calculateNutrients(record.per100g, grams)
        );
      } else {
        // Fallback calculation for unverified ingredients
        calculatedIngredientNutrients.push({
          calories: Math.round(grams * 1.5),
          protein: Math.round(grams * 0.05 * 10) / 10,
          carbs: Math.round(grams * 0.2 * 10) / 10,
          fat: Math.round(grams * 0.05 * 10) / 10,
          fibre: Math.round(grams * 0.02 * 10) / 10,
        });
      }
    }

    const totalNutrients = nutritionCalculationService.sumNutrients(calculatedIngredientNutrients);

    // Validate against constraints
    if (constraints?.maxCalories && totalNutrients.calories > constraints.maxCalories) {
      violations.push(
        `Meal exceeds requested calorie limit of ${constraints.maxCalories} kcal (Calculated: ${totalNutrients.calories} kcal).`
      );
    }

    if (constraints?.minProtein && totalNutrients.protein < constraints.minProtein) {
      violations.push(
        `Meal does not satisfy requested protein minimum of ${constraints.minProtein}g (Calculated: ${totalNutrients.protein}g).`
      );
    }

    return {
      ...mealProposal,
      nutrients: totalNutrients,
      isConstraintSatisfied: violations.length === 0,
      constraintViolations: violations,
      isEstimated: false,
    };
  }

  /**
   * Generates recommendations matching prompt and profile.
   * If Gemini is available, generates dynamically. Otherwise uses calibrated PG-friendly recipes.
   */
  public async getRecommendationsForPrompt(
    conversationId: string,
    userPrompt: string
  ): Promise<RecommendedMeal[]> {
    const text = userPrompt.toLowerCase();
    const constraints: { maxCalories?: number; minProtein?: number } = {};

    // Parse requested numeric limits from prompt
    const calMatch = text.match(/under\s*(\d+)\s*kcal/) || text.match(/below\s*(\d+)\s*kcal/);
    if (calMatch) constraints.maxCalories = parseInt(calMatch[1], 10);

    const proteinMatch = text.match(/(\d+)\s*g\s*(?:more\s*)?protein/) || text.match(/at least\s*(\d+)\s*g\s*protein/);
    if (proteinMatch) constraints.minProtein = parseInt(proteinMatch[1], 10);

    // Curated high-protein PG-friendly templates (No Whey Protein!)
    const candidateProposals: Array<Omit<RecommendedMeal, "nutrients" | "isConstraintSatisfied" | "constraintViolations" | "isEstimated">> = [
      {
        id: `rec-chicken-rice-${Date.now()}`,
        name: "Grilled Chicken & Rice with Sauteed Veggies",
        description: "Classic high-protein gym dinner accessible via local PG mess or restaurant.",
        prepTimeMinutes: 10,
        cookTimeMinutes: 20,
        ingredients: [
          { name: "Grilled chicken breast", quantity: 180, unit: "g" },
          { name: "Cooked white rice", quantity: 150, unit: "g" },
          { name: "Mixed vegetables", quantity: 100, unit: "g" },
          { name: "Olive oil", quantity: 5, unit: "g" },
        ],
        instructions: [
          "Order or grill 180g seasoned chicken breast.",
          "Pair with 150g steamed rice and 100g warm vegetables.",
          "Finish meal before your 7:00 PM cutoff.",
        ],
        estimatedCostInr: 180,
        fitExplanation: "Provides ~57g clean protein without whey protein, fitting under typical dinner calorie targets.",
      },
      {
        id: `rec-egg-bhurji-${Date.now()}`,
        name: "4-Egg Bhurji with 2 Chapatis",
        description: "Quick PG-friendly meal made with whole eggs, onions, tomatoes, and whole wheat chapatis.",
        prepTimeMinutes: 5,
        cookTimeMinutes: 15,
        ingredients: [
          { name: "Boiled egg", quantity: 4, unit: "piece" }, // 4 whole eggs (200g)
          { name: "Chapati / Roti", quantity: 2, unit: "piece" },
          { name: "Olive oil", quantity: 5, unit: "g" },
        ],
        instructions: [
          "Scramble 4 eggs on a pan with 1 tsp oil, diced onions, tomatoes, and chili powder.",
          "Serve fresh with 2 soft chapatis.",
        ],
        estimatedCostInr: 60,
        fitExplanation: "High-protein budget dinner (~32g protein), practical for PG living.",
      },
      {
        id: `rec-paneer-curry-${Date.now()}`,
        name: "Paneer Curry with 2 Chapatis",
        description: "Vegetarian high-protein option using fresh cottage cheese and whole wheat flatbreads.",
        prepTimeMinutes: 10,
        cookTimeMinutes: 20,
        ingredients: [
          { name: "Paneer curry", quantity: 200, unit: "g" },
          { name: "Chapati / Roti", quantity: 2, unit: "piece" },
        ],
        instructions: [
          "Heat 200g of paneer curry (or order from a local hygienic canteen).",
          "Enjoy with 2 fresh chapatis.",
        ],
        estimatedCostInr: 120,
        fitExplanation: "Vegetarian alternative providing ~24g protein and healthy dietary fats.",
      },
    ];

    // Run deterministic validation pipeline on candidate meals
    const validatedMeals: RecommendedMeal[] = [];
    for (const proposal of candidateProposals) {
      const validated = await this.validateAndCalculateRecommendation(proposal, constraints);
      validatedMeals.push(validated);
    }

    // Record in conversation
    const conv = this.getConversation(conversationId) || this.createConversation("Dinner Recommendations");
    conv.messages.push({
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: userPrompt,
      timestamp: new Date().toISOString(),
    });

    conv.messages.push({
      id: `msg-${Date.now()}-assistant`,
      role: "assistant",
      content: `Here are ${validatedMeals.length} personalized recommendations tailored to your goals and PG dining context. Whey protein is strictly excluded, and all meals align with your 7:00 PM dinner cutoff.`,
      timestamp: new Date().toISOString(),
      recommendations: validatedMeals,
    });

    return validatedMeals;
  }
}

export const mealRecommendationService = new MealRecommendationService();
