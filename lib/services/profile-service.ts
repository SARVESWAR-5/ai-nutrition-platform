import { z } from "zod";

/**
 * Zod validation schema for User Profile
 */
export const UserProfileSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required"),
  age: z.number().int().min(14, "Age must be at least 14").max(120, "Age must be valid"),
  sex: z.enum(["male", "female", "other"]),
  heightCm: z.number().positive("Height must be positive"),
  currentWeightKg: z.number().positive("Weight must be positive"),
  targetWeightKg: z.number().positive().optional(),
  fitnessGoal: z.enum(["fat_loss", "muscle_gain", "recomposition", "maintenance", "target_weight"]),
  activityLevel: z.enum(["sedentary", "light", "moderate", "very_active", "extra_active"]),
  gymFrequency: z.string().default("4-5 days/week"),
  workoutType: z.string().default("Strength training & cardio"),
  dailyStepTarget: z.number().int().positive().default(10000),
  dietaryPreferences: z.array(z.string()).default([]),
  foodAllergies: z.array(z.string()).default([]),
  foodsAvoided: z.array(z.string()).default(["whey protein"]),
  mealSchedule: z.record(z.string(), z.string()).default({
    breakfast: "08:30",
    lunch: "13:00",
    dinner: "19:00",
  }),
  wakeTime: z.string().default("06:30"),
  sleepTime: z.string().default("23:00"),
  preferredDinnerCutoff: z.string().default("19:00"),
  foodBudget: z.string().default("Moderate PG/Student budget"),
  cookingAbility: z.enum(["home_food", "cook", "pg_food", "mess", "restaurants"]).default("home_food"),
  timezone: z.string().default("Asia/Kolkata"),
  onboardingCompleted: z.boolean().default(false),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

/**
 * Natural-Language AI Parser for Excluded Foods and Allergens.
 * Parses conversational user prompts like:
 * - "I don't eat whey protein and squid"
 * - "Strictly exclude whey protein, squid, and pork"
 * - "No whey protein, squid or peanuts"
 * Returns an array of clean, normalized food names to exclude.
 */
export function parseExcludedFoodsPrompt(prompt: string): string[] {
  if (!prompt || !prompt.trim()) return [];

  const cleaned = prompt
    .replace(/^(i don't eat|i do not eat|i avoid|do not eat|don't eat|please exclude|strictly exclude|exclude|no)\s+/i, "")
    .replace(/(from my diet|from recommendations|from meal plan|please)$/i, "");

  const items = cleaned
    .split(/,|;|\band\b|\bor\b|&/i)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 1 && !["the", "any", "all", "some", "foods", "items"].includes(t));

  return Array.from(new Set(items));
}

/**
 * Default Profile Template for Sarveswar
 * Pre-configured with confirmed metrics, foods avoided (whey protein and squid), and home-made food context.
 */
export const SARVESWAR_PROFILE_DEFAULTS: Partial<UserProfile> = {
  name: "Sarveswar",
  age: 21,
  sex: "male",
  heightCm: 175.5,
  currentWeightKg: 75.0,
  targetWeightKg: 75.0,
  fitnessGoal: "recomposition",
  activityLevel: "moderate", // Regular gym workouts
  gymFrequency: "5 days/week",
  workoutType: "Strength training & gym workouts",
  dailyStepTarget: 10000,
  dietaryPreferences: ["High protein", "Indian cuisine", "Home cooked"],
  foodAllergies: [],
  foodsAvoided: ["whey protein", "squid"], // Whey protein and squid strictly excluded
  mealSchedule: {
    breakfast: "08:30",
    lunch: "13:00",
    dinner: "19:00",
  },
  wakeTime: "06:30",
  sleepTime: "23:00",
  preferredDinnerCutoff: "19:00",
  foodBudget: "Home-made and practical food budget",
  cookingAbility: "home_food", // Home-made food
  timezone: "Asia/Kolkata",
  onboardingCompleted: true,
};

/**
 * Activity Level Multipliers for Mifflin-St Jeor TDEE calculation
 */
export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2, // Little or no exercise
  light: 1.375, // Light exercise 1-3 days/week
  moderate: 1.55, // Moderate exercise / gym 3-5 days/week (Sarveswar default)
  very_active: 1.725, // Hard exercise 6-7 days/week
  extra_active: 1.9, // Very hard exercise / physical job
} as const;

export interface BodybuildingGoalProtocol {
  key: "maintenance" | "fat_loss" | "muscle_gain" | "recomposition" | "target_weight";
  label: string;
  sublabel: string;
  badge: string;
  calories: number;
  calorieDelta: number; // e.g. -500 or +400 or 0
  proteinGrams: number;
  proteinPerKg: number; // e.g. 2.2 or 2.0
  carbsGrams: number;
  fatGrams: number;
  fibreGrams: number;
  waterMl: number;
  scientificFormulaNotes: string;
  targetWeightMeta?: {
    currentWeightKg: number;
    targetWeightKg: number;
    weightDeltaKg: number;
    action: "reduce" | "gain" | "maintain";
    estimatedWeeks: number;
    weeklyRateKg: number;
    targetPaceDescription: string;
  };
}

export interface BodybuildingProtocolsComparison {
  bmr: number;
  maintenanceTdee: number;
  currentWeightKg: number;
  targetWeightKg?: number;
  targetWeightAnalysis?: {
    currentWeightKg: number;
    targetWeightKg: number;
    weightDeltaKg: number;
    action: "reduce" | "gain" | "maintain";
    estimatedWeeks: number;
    weeklyRateKg: number;
    targetPaceDescription: string;
  };
  protocols: {
    maintenance: BodybuildingGoalProtocol;
    fat_loss: BodybuildingGoalProtocol;
    muscle_gain: BodybuildingGoalProtocol;
    recomposition: BodybuildingGoalProtocol;
    target_weight: BodybuildingGoalProtocol;
  };
}

/**
 * Bodybuilding Evidence-Based Multi-Goal Protocol Engine.
 * Automatically recalculates exact target grams across:
 * 1. Target Weight Achievement (Dynamic Deficit/Surplus/Equilibrium based on Target Weight)
 * 2. Normal Maintenance Baseline (TDEE)
 * 3. Weight Loss (Cutting: -500 kcal deficit, 2.2g/kg protein to prevent muscle wasting)
 * 4. Weight Gain (Bulking: +400 kcal clean surplus, 2.0g/kg protein for maximum hypertrophy)
 * 5. Body Recomposition (TDEE, 2.1g/kg protein)
 */
export function calculateBodybuildingProtocols(params: {
  age: number;
  sex: "male" | "female" | "other";
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg?: number;
  activityLevel: keyof typeof ACTIVITY_MULTIPLIERS;
}): BodybuildingProtocolsComparison {
  const { age, sex, heightCm, currentWeightKg, targetWeightKg, activityLevel } = params;

  // 1. Calculate BMR (Mifflin-St Jeor)
  let bmr: number;
  if (sex === "female") {
    bmr = 10 * currentWeightKg + 6.25 * heightCm - 5 * age - 161;
  } else {
    bmr = 10 * currentWeightKg + 6.25 * heightCm - 5 * age + 5;
  }
  const roundedBmr = Math.round(bmr);

  // 2. TDEE
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.55;
  const maintenanceTdee = Math.round(roundedBmr * multiplier);

  // Helper to build macro breakdown with 4-4-9 deterministic math
  const buildProtocol = (
    key: "maintenance" | "fat_loss" | "muscle_gain" | "recomposition" | "target_weight",
    label: string,
    sublabel: string,
    badge: string,
    calorieDelta: number,
    proteinPerKg: number,
    fatPercentage: number,
    scientificNotes: string,
    targetWeightMeta?: BodybuildingGoalProtocol["targetWeightMeta"]
  ): BodybuildingGoalProtocol => {
    const calories = Math.max(1300, maintenanceTdee + calorieDelta);
    const proteinGrams = Math.round(proteinPerKg * currentWeightKg);
    const proteinCalories = proteinGrams * 4;
    const fatCalories = calories * fatPercentage;
    const fatGrams = Math.round(fatCalories / 9);
    const remainingCarbCalories = Math.max(100, calories - (proteinCalories + fatGrams * 9));
    const carbsGrams = Math.round(remainingCarbCalories / 4);
    const fibreGrams = Math.max(30, Math.round((calories / 1000) * 14));
    const waterMl = Math.round((currentWeightKg * 35 + 500) / 100) * 100;

    return {
      key,
      label,
      sublabel,
      badge,
      calories,
      calorieDelta,
      proteinGrams,
      proteinPerKg,
      carbsGrams,
      fatGrams,
      fibreGrams,
      waterMl,
      scientificFormulaNotes: scientificNotes,
      targetWeightMeta,
    };
  };

  const maintenance = buildProtocol(
    "maintenance",
    "Normal Maintenance",
    "Baseline energy equilibrium",
    "Baseline (0 kcal)",
    0,
    2.0,
    0.25,
    "Calculated at 100% of TDEE. Maintains weight & steady muscularity with 2.0g/kg protein."
  );

  const fat_loss = buildProtocol(
    "fat_loss",
    "Weight Loss (Cutting)",
    "Targeted fat loss with muscle preservation",
    "Deficit (-500 kcal)",
    -500,
    2.2, // Elevated to 2.2g/kg in deficit
    0.25,
    "Standard bodybuilding cut: -500 kcal/day deficit (~0.5 kg fat loss/week). Protein elevated to 2.2g/kg to shield muscle tissue from catabolism."
  );

  const muscle_gain = buildProtocol(
    "muscle_gain",
    "Weight Gain (Bulking)",
    "Lean muscle hypertrophy & strength surplus",
    "Surplus (+400 kcal)",
    400,
    2.0,
    0.25,
    "Clean bodybuilding bulk: +400 kcal/day surplus. Fuels progressive overload and optimizes protein synthesis without excessive fat deposition."
  );

  const recomposition = buildProtocol(
    "recomposition",
    "Body Recomposition",
    "Simultaneous fat loss & muscle accretion",
    "Recomp (0 kcal)",
    0,
    2.1,
    0.25,
    "Isocaloric protocol with high protein (2.1g/kg) and progressive overload training."
  );

  // Dynamic Target Weight Analysis and Protocol
  const safeTargetWeight = targetWeightKg && targetWeightKg > 20 ? targetWeightKg : currentWeightKg;
  const weightDiff = Math.round((safeTargetWeight - currentWeightKg) * 10) / 10;
  let action: "reduce" | "gain" | "maintain" = "maintain";
  let targetDeltaKcal = 0;
  let targetProteinPerKg = 2.0;
  let estimatedWeeks = 0;
  let weeklyRateKg = 0;
  let targetPaceDescription = "";

  if (weightDiff < -0.2) {
    action = "reduce";
    const deltaAbs = Math.abs(weightDiff);
    weeklyRateKg = 0.5;
    estimatedWeeks = Math.max(1, Math.ceil(deltaAbs / weeklyRateKg));
    targetDeltaKcal = -500;
    targetProteinPerKg = 2.2;
    targetPaceDescription = `Targeting -${deltaAbs} kg weight reduction (~0.5 kg/week healthy fat loss) to reach ${safeTargetWeight} kg in ~${estimatedWeeks} weeks`;
  } else if (weightDiff > 0.2) {
    action = "gain";
    const deltaAbs = weightDiff;
    weeklyRateKg = 0.35;
    estimatedWeeks = Math.max(1, Math.ceil(deltaAbs / weeklyRateKg));
    targetDeltaKcal = 400;
    targetProteinPerKg = 2.0;
    targetPaceDescription = `Targeting +${deltaAbs} kg lean mass gain (~0.35 kg/week clean surplus) to reach ${safeTargetWeight} kg in ~${estimatedWeeks} weeks`;
  } else {
    action = "maintain";
    weeklyRateKg = 0;
    estimatedWeeks = 0;
    targetDeltaKcal = 0;
    targetProteinPerKg = 2.0;
    targetPaceDescription = `Current weight (${currentWeightKg} kg) matches target weight (${safeTargetWeight} kg). Normal maintenance protocol active.`;
  }

  const targetWeightMeta = {
    currentWeightKg,
    targetWeightKg: safeTargetWeight,
    weightDeltaKg: weightDiff,
    action,
    estimatedWeeks,
    weeklyRateKg,
    targetPaceDescription,
  };

  const target_weight = buildProtocol(
    "target_weight",
    action === "reduce"
      ? `Achieving Target Weight (${safeTargetWeight} kg • Reduce)`
      : action === "gain"
      ? `Achieving Target Weight (${safeTargetWeight} kg • Gain)`
      : `Achieving Target Weight (${safeTargetWeight} kg • Maintain)`,
    action === "reduce"
      ? `Reduce ${Math.abs(weightDiff)} kg in ~${estimatedWeeks} wks`
      : action === "gain"
      ? `Gain +${weightDiff} kg in ~${estimatedWeeks} wks`
      : "Target weight maintained",
    action === "reduce"
      ? `Deficit (-500 kcal)`
      : action === "gain"
      ? `Surplus (+400 kcal)`
      : "Baseline (0 kcal)",
    targetDeltaKcal,
    targetProteinPerKg,
    0.25,
    `${targetPaceDescription}. Nutrients deterministically calculated to achieve ${safeTargetWeight} kg.`,
    targetWeightMeta
  );

  return {
    bmr: roundedBmr,
    maintenanceTdee,
    currentWeightKg,
    targetWeightKg: safeTargetWeight,
    targetWeightAnalysis: targetWeightMeta,
    protocols: {
      target_weight,
      maintenance,
      fat_loss,
      muscle_gain,
      recomposition,
    },
  };
}

export interface EnergyRecommendation {
  formula: string;
  bmr: number;
  activityMultiplier: number;
  tdee: number;
  goalAdjustmentKcal: number;
  recommendedCalories: number;
  macroBreakdown: {
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    fibreGrams: number;
  };
  assumptions: string[];
}

/**
 * Calculates Mifflin-St Jeor BMR and Energy Recommendation.
 * BMR Formula (Men): 10 × weight (kg) + 6.25 × height (cm) − 5 × age (y) + 5
 * BMR Formula (Women): 10 × weight (kg) + 6.25 × height (cm) − 5 × age (y) − 161
 */
export function calculateMifflinStJeorEnergy(profile: {
  age: number;
  sex: "male" | "female" | "other";
  heightCm: number;
  currentWeightKg: number;
  activityLevel: keyof typeof ACTIVITY_MULTIPLIERS;
  fitnessGoal: "fat_loss" | "muscle_gain" | "recomposition" | "maintenance";
}): EnergyRecommendation {
  const { age, sex, heightCm, currentWeightKg, activityLevel, fitnessGoal } = profile;

  // 1. Calculate Basal Metabolic Rate (BMR)
  let bmr: number;
  if (sex === "female") {
    bmr = 10 * currentWeightKg + 6.25 * heightCm - 5 * age - 161;
  } else {
    // Male or other defaults to male Mifflin-St Jeor formula
    bmr = 10 * currentWeightKg + 6.25 * heightCm - 5 * age + 5;
  }

  // 2. Activity Multiplier
  const activityMultiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.55;
  const tdee = Math.round(bmr * activityMultiplier);

  // 3. Goal Adjustment
  let goalAdjustmentKcal = 0;
  if (fitnessGoal === "fat_loss") {
    goalAdjustmentKcal = -400; // Moderate 400 kcal deficit
  } else if (fitnessGoal === "muscle_gain") {
    goalAdjustmentKcal = +300; // Clean 300 kcal surplus
  } else {
    goalAdjustmentKcal = 0; // Maintenance or Recomposition
  }

  const recommendedCalories = Math.max(1200, Math.round(tdee + goalAdjustmentKcal));

  // 4. Evidence-based Macro recommendations
  // Protein: 2.0g per kg for resistance trained gym individuals
  const proteinGrams = Math.round(Math.min(2.2, 2.0) * currentWeightKg);
  // Fat: 25-30% of total calories (0.9-1.0g per kg)
  const fatCalories = recommendedCalories * 0.28;
  const fatGrams = Math.round(fatCalories / 9);
  // Carbs: Remaining calories
  const remainingCaloriesForCarbs = recommendedCalories - (proteinGrams * 4 + fatGrams * 9);
  const carbsGrams = Math.max(50, Math.round(remainingCaloriesForCarbs / 4));
  // Fibre: 14g per 1000 kcal
  const fibreGrams = Math.round((recommendedCalories / 1000) * 14);

  return {
    formula: "Mifflin-St Jeor (1990) + PAL Factor",
    bmr: Math.round(bmr),
    activityMultiplier,
    tdee,
    goalAdjustmentKcal,
    recommendedCalories,
    macroBreakdown: {
      proteinGrams,
      carbsGrams,
      fatGrams,
      fibreGrams,
    },
    assumptions: [
      `BMR calculated using 10 × ${currentWeightKg}kg + 6.25 × ${heightCm}cm − 5 × ${age}y ${sex === "female" ? "- 161" : "+ 5"}`,
      `Physical Activity Level (PAL) of ${activityMultiplier} for ${activityLevel.replace("_", " ")} activity`,
      `Goal adjustment of ${goalAdjustmentKcal >= 0 ? "+" : ""}${goalAdjustmentKcal} kcal for ${fitnessGoal.replace("_", " ")}`,
      `Protein targeted at 2.0g/kg body weight for regular resistance training`,
      `Fibre estimated at standard guideline of 14g per 1,000 kcal`,
    ],
  };
}

export function getUserProfileData(userId?: string) {
  if (!userId || typeof window === "undefined") return null;
  try {
    const isSarveswar =
      userId === "usr-sarveswar-primary" ||
      userId === "sarveswar" ||
      userId === "sarveswar5" ||
      userId === "usr-sarveswar5-primary";
    const profileKey = isSarveswar ? "sarveswar_user_profile" : `sarveswar_user_profile_${userId}`;
    const stored = localStorage.getItem(profileKey);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return null;
}
