import { describe, it, expect } from "vitest";
import {
  UserProfileSchema,
  SARVESWAR_PROFILE_DEFAULTS,
  calculateMifflinStJeorEnergy,
  calculateBodybuildingProtocols,
  parseExcludedFoodsPrompt,
} from "@/lib/services/profile-service";

describe("ProfileService & Bodybuilding Evidence-Based Formulas", () => {
  it("has Sarveswar defaults aligned with specifications", () => {
    expect(SARVESWAR_PROFILE_DEFAULTS.name).toBe("Sarveswar");
    expect(SARVESWAR_PROFILE_DEFAULTS.age).toBe(21);
    expect(SARVESWAR_PROFILE_DEFAULTS.sex).toBe("male");
    expect(SARVESWAR_PROFILE_DEFAULTS.heightCm).toBe(175.5);
    expect(SARVESWAR_PROFILE_DEFAULTS.currentWeightKg).toBe(75.0);
    expect(SARVESWAR_PROFILE_DEFAULTS.timezone).toBe("Asia/Kolkata");
    expect(SARVESWAR_PROFILE_DEFAULTS.preferredDinnerCutoff).toBe("19:00");
    expect(SARVESWAR_PROFILE_DEFAULTS.foodsAvoided).toContain("whey protein");
    expect(SARVESWAR_PROFILE_DEFAULTS.foodsAvoided).toContain("squid");
    expect(SARVESWAR_PROFILE_DEFAULTS.cookingAbility).toBe("home_food");
  });

  it("validates profile schema successfully with age 21", () => {
    const result = UserProfileSchema.safeParse({
      ...SARVESWAR_PROFILE_DEFAULTS,
      age: 21,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.age).toBe(21);
      expect(result.data.foodsAvoided).toContain("whey protein");
      expect(result.data.foodsAvoided).toContain("squid");
    }
  });

  it("accurately parses conversational natural-language excluded foods prompts", () => {
    const prompt1 = "I don't eat whey protein and squid";
    const extracted1 = parseExcludedFoodsPrompt(prompt1);
    expect(extracted1).toContain("whey protein");
    expect(extracted1).toContain("squid");

    const prompt2 = "Strictly exclude whey protein, squid, and pork from recommendations";
    const extracted2 = parseExcludedFoodsPrompt(prompt2);
    expect(extracted2).toContain("whey protein");
    expect(extracted2).toContain("squid");
    expect(extracted2).toContain("pork");
  });

  it("accurately calculates Mifflin-St Jeor BMR and TDEE for age 21", () => {
    // For 75 kg, 175.5 cm, 21 years old male:
    // BMR = 10 * 75 + 6.25 * 175.5 - 5 * 21 + 5
    // BMR = 750 + 1096.875 - 105 + 5 = 1746.875 -> ~1747 kcal
    const energy = calculateMifflinStJeorEnergy({
      age: 21,
      sex: "male",
      heightCm: 175.5,
      currentWeightKg: 75.0,
      activityLevel: "moderate", // 1.55 multiplier
      fitnessGoal: "recomposition",
    });

    expect(energy.bmr).toBe(1747);
    expect(energy.activityMultiplier).toBe(1.55);
    expect(energy.tdee).toBe(2708);
    expect(energy.recommendedCalories).toBe(2708);
    expect(energy.macroBreakdown.proteinGrams).toBe(150); // 2.0g per kg * 75kg = 150g
    expect(energy.assumptions.length).toBeGreaterThan(0);
    expect(energy.formula).toContain("Mifflin-St Jeor");
  });

  it("dynamically calculates multi-goal bodybuilding protocols with normal baseline comparison", () => {
    const protocolsData = calculateBodybuildingProtocols({
      age: 21,
      sex: "male",
      heightCm: 175.5,
      currentWeightKg: 75.0,
      activityLevel: "moderate",
    });

    expect(protocolsData.bmr).toBe(1747);
    expect(protocolsData.maintenanceTdee).toBe(2708);

    // 1. Normal Maintenance Baseline
    const normal = protocolsData.protocols.maintenance;
    expect(normal.calories).toBe(2708);
    expect(normal.calorieDelta).toBe(0);
    expect(normal.proteinGrams).toBe(150); // 2.0g/kg * 75kg
    expect(normal.proteinPerKg).toBe(2.0);

    // 2. Weight Loss (Cutting)
    const cut = protocolsData.protocols.fat_loss;
    expect(cut.calories).toBe(2208); // 2708 - 500
    expect(cut.calorieDelta).toBe(-500);
    expect(cut.proteinGrams).toBe(165); // 2.2g/kg * 75kg (elevated to protect muscle)
    expect(cut.proteinPerKg).toBe(2.2);
    expect(cut.carbsGrams).toBeLessThan(normal.carbsGrams);

    // 3. Weight Gain (Bulking)
    const bulk = protocolsData.protocols.muscle_gain;
    expect(bulk.calories).toBe(3108); // 2708 + 400
    expect(bulk.calorieDelta).toBe(400);
    expect(bulk.proteinGrams).toBe(150); // 2.0g/kg
    expect(bulk.carbsGrams).toBeGreaterThan(normal.carbsGrams);
  });

  it("dynamically calculates Achieving Target Weight criteria based on targetWeightKg", () => {
    // Case 1: Target Weight < Current Weight (Weight Reduction / Deficit)
    const cutData = calculateBodybuildingProtocols({
      age: 21,
      sex: "male",
      heightCm: 175.5,
      currentWeightKg: 75.0,
      targetWeightKg: 70.0,
      activityLevel: "moderate",
    });

    const cutTarget = cutData.protocols.target_weight;
    expect(cutTarget).toBeDefined();
    expect(cutTarget.targetWeightMeta?.action).toBe("reduce");
    expect(cutTarget.targetWeightMeta?.weightDeltaKg).toBe(-5);
    expect(cutTarget.calorieDelta).toBe(-500);
    expect(cutTarget.calories).toBe(2208); // 2708 - 500
    expect(cutTarget.proteinPerKg).toBe(2.2); // elevated to preserve lean tissue
    expect(cutTarget.proteinGrams).toBe(165);
    expect(cutTarget.targetWeightMeta?.weeklyRateKg).toBe(0.5);
    expect(cutTarget.targetWeightMeta?.estimatedWeeks).toBe(10); // 5 / 0.5 = 10 weeks

    // Case 2: Target Weight > Current Weight (Weight Gain / Surplus)
    const bulkData = calculateBodybuildingProtocols({
      age: 21,
      sex: "male",
      heightCm: 175.5,
      currentWeightKg: 75.0,
      targetWeightKg: 82.0,
      activityLevel: "moderate",
    });

    const bulkTarget = bulkData.protocols.target_weight;
    expect(bulkTarget).toBeDefined();
    expect(bulkTarget.targetWeightMeta?.action).toBe("gain");
    expect(bulkTarget.targetWeightMeta?.weightDeltaKg).toBe(7);
    expect(bulkTarget.calorieDelta).toBe(400);
    expect(bulkTarget.calories).toBe(3108); // 2708 + 400
    expect(bulkTarget.proteinPerKg).toBe(2.0);
    expect(bulkTarget.proteinGrams).toBe(150);
    expect(bulkTarget.targetWeightMeta?.weeklyRateKg).toBe(0.35);
    expect(bulkTarget.targetWeightMeta?.estimatedWeeks).toBe(20); // Math.ceil(7 / 0.35) = 20 weeks

    // Case 3: Target Weight === Current Weight (Maintenance)
    const maintainData = calculateBodybuildingProtocols({
      age: 21,
      sex: "male",
      heightCm: 175.5,
      currentWeightKg: 75.0,
      targetWeightKg: 75.0,
      activityLevel: "moderate",
    });

    const maintainTarget = maintainData.protocols.target_weight;
    expect(maintainTarget).toBeDefined();
    expect(maintainTarget.targetWeightMeta?.action).toBe("maintain");
    expect(maintainTarget.targetWeightMeta?.weightDeltaKg).toBe(0);
    expect(maintainTarget.calorieDelta).toBe(0);
    expect(maintainTarget.calories).toBe(2708);
    expect(maintainTarget.proteinPerKg).toBe(2.0);
    expect(maintainTarget.targetWeightMeta?.estimatedWeeks).toBe(0);
  });
});
