"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/services/auth-service";
import {
  calculateBodybuildingProtocols,
  parseExcludedFoodsPrompt,
} from "@/lib/services/profile-service";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  UserCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Scale,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  X,
  Plus,
} from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();

  // Step state: 1: Personal Details, 2: Routine & Exclusions, 3: Goal & Nutrition Targets
  const [step, setStep] = React.useState<1 | 2 | 3>(1);

  // Form State - start 100% clean so user adds their own values
  const [formData, setFormData] = React.useState({
    name: "",
    age: "" as number | "",
    sex: "male" as "male" | "female" | "other",
    heightCm: "" as number | "",
    currentWeightKg: "" as number | "",
    targetWeightKg: "" as number | "",
    cookingAbility: "home_food" as "home_food" | "cook" | "pg_food" | "mess" | "restaurants",
    activityLevel: "moderate" as "sedentary" | "light" | "moderate" | "very_active" | "extra_active",
    preferredDinnerCutoff: "19:00",
    foodsAvoided: [] as string[],
    fitnessGoal: "fat_loss" as "fat_loss" | "muscle_gain" | "maintenance" | "recomposition",
  });

  // Natural Language Prompt for Foods Excluded
  const [exclusionPrompt, setExclusionPrompt] = React.useState("");
  const [customTagInput, setCustomTagInput] = React.useState("");

  // Populate user name from authenticated session on mount
  React.useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || "",
      }));
    }
  }, []);

  // Live Bodybuilding Protocols Calculation
  const protocolsData = React.useMemo(() => {
    const ageNum = typeof formData.age === "number" ? formData.age : Number(formData.age) || 25;
    const heightNum = typeof formData.heightCm === "number" ? formData.heightCm : Number(formData.heightCm) || 170;
    const weightNum = typeof formData.currentWeightKg === "number" ? formData.currentWeightKg : Number(formData.currentWeightKg) || 70;

    return calculateBodybuildingProtocols({
      age: ageNum,
      sex: formData.sex,
      heightCm: heightNum,
      currentWeightKg: weightNum,
      activityLevel: formData.activityLevel,
    });
  }, [formData.age, formData.sex, formData.heightCm, formData.currentWeightKg, formData.activityLevel]);

  const activeProtocol = protocolsData.protocols[formData.fitnessGoal];

  // Parse natural language exclusion prompt
  const handleParseExclusionPrompt = () => {
    const extracted = parseExcludedFoodsPrompt(exclusionPrompt);
    if (extracted.length > 0) {
      const merged = Array.from(new Set([...formData.foodsAvoided, ...extracted]));
      setFormData({ ...formData, foodsAvoided: merged });
      setExclusionPrompt("");
    }
  };

  const handleAddCustomTag = () => {
    if (customTagInput.trim()) {
      const merged = Array.from(new Set([...formData.foodsAvoided, customTagInput.trim().toLowerCase()]));
      setFormData({ ...formData, foodsAvoided: merged });
      setCustomTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      foodsAvoided: formData.foodsAvoided.filter((t) => t !== tagToRemove),
    });
  };

  const handleFinishOnboarding = () => {
    if (typeof window !== "undefined") {
      try {
        const id = authService.getCurrentUserId();
        const isSarveswar = id === "usr-sarveswar-primary" || id === "sarveswar";
        const profileKey = isSarveswar ? "sarveswar_user_profile" : `sarveswar_user_profile_${id}`;
        const targetsKey = isSarveswar ? "sarveswar_nutrition_targets" : `sarveswar_nutrition_targets_${id}`;

        localStorage.setItem(profileKey, JSON.stringify(formData));
        if (activeProtocol) {
          localStorage.setItem(
            targetsKey,
            JSON.stringify({
              calories: activeProtocol.calories,
              protein: activeProtocol.proteinGrams,
              carbs: activeProtocol.carbsGrams,
              fat: activeProtocol.fatGrams,
              fibre: activeProtocol.fibreGrams,
              waterMl: activeProtocol.waterMl,
            })
          );
        }
        window.dispatchEvent(new CustomEvent("sarveswar-targets-updated"));
        window.dispatchEvent(new CustomEvent("sarveswar-preferences-updated"));
      } catch (err) {
        console.warn("Could not save onboarding profile:", err);
      }
    }
    authService.completeOnboarding();
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Progress Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold mb-2">
            Step {step} of 3: {step === 1 ? "Personal Profile" : step === 2 ? "Exclusions & Context" : "Nutrition Blueprint"}
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
            Welcome, {formData.name || "User"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Setting up your dedicated personal tracking profile from the beginning.
          </p>

          <div className="flex items-center justify-center gap-2 mt-4">
            <div className={`h-2 rounded-full transition-all ${step >= 1 ? "w-12 bg-emerald-600" : "w-6 bg-slate-200"}`} />
            <div className={`h-2 rounded-full transition-all ${step >= 2 ? "w-12 bg-emerald-600" : "w-6 bg-slate-200"}`} />
            <div className={`h-2 rounded-full transition-all ${step >= 3 ? "w-12 bg-emerald-600" : "w-6 bg-slate-200"}`} />
          </div>
        </div>

        {/* STEP 1: Personal Details */}
        {step === 1 && (
          <Card className="border border-slate-200 dark:border-slate-800 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Personal Details & Physical Metrics</CardTitle>
              <p className="text-xs text-slate-500">All fields are editable anytime.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Age (Years) <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value === "" ? "" : Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-emerald-400 dark:border-emerald-700 bg-emerald-50/20 text-sm font-bold text-emerald-800 dark:text-emerald-300"
                    min={14}
                    max={100}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Sex</label>
                  <select
                    value={formData.sex}
                    onChange={(e) => setFormData({ ...formData, sex: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Height (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.heightCm}
                    onChange={(e) => setFormData({ ...formData, heightCm: e.target.value === "" ? "" : Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Current Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.currentWeightKg}
                    onChange={(e) => setFormData({ ...formData, currentWeightKg: e.target.value === "" ? "" : Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Target Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.targetWeightKg}
                    onChange={(e) => setFormData({ ...formData, targetWeightKg: e.target.value === "" ? "" : Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2"
                >
                  <span>Continue to Routine & Exclusions</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Cooking Context & Natural Language Foods Excluded Prompt */}
        {step === 2 && (
          <Card className="border border-slate-200 dark:border-slate-800 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Dietary Context & Excluded Foods</CardTitle>
              <p className="text-xs text-slate-500">
                Provide your food exclusions via AI prompt so the recommendation engine guarantees 100% exclusion.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Cooking Context */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Cooking Ability / Context</label>
                <select
                  value={formData.cookingAbility}
                  onChange={(e) => setFormData({ ...formData, cookingAbility: e.target.value as any })}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium"
                >
                  <option value="home_food">🏠 Home-made food (Home cooking)</option>
                  <option value="cook">🍳 Can cook own meals</option>
                  <option value="pg_food">🏢 PG / Hostel Food (Limited cooking)</option>
                  <option value="mess">🍲 Mess / Canteen</option>
                  <option value="restaurants">🍽️ Restaurants / Delivery</option>
                </select>
              </div>

              {/* Activity Level */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Gym & Physical Activity</label>
                <select
                  value={formData.activityLevel}
                  onChange={(e) => setFormData({ ...formData, activityLevel: e.target.value as any })}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium"
                >
                  <option value="moderate">Moderate (Regular gym, 3-5 days/week) - 1.55x PAL</option>
                  <option value="light">Light exercise (1-2 days/week) - 1.375x PAL</option>
                  <option value="sedentary">Sedentary (desk job, no gym) - 1.2x PAL</option>
                  <option value="very_active">Very Active (6-7 days/week) - 1.725x PAL</option>
                </select>
              </div>

              {/* Natural Language Exclusion Prompt Box */}
              <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20 space-y-3">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs uppercase">
                  <ShieldAlert className="w-4 h-4" />
                  <span>AI Foods Excluded Prompt</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Type any conversational sentence (e.g. <em>&quot;I don&apos;t eat whey protein and squid&quot;</em>). The AI will extract and enforce them.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={exclusionPrompt}
                    onChange={(e) => setExclusionPrompt(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-rose-500"
                  />
                  <Button
                    type="button"
                    onClick={handleParseExclusionPrompt}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    <span>Extract with AI</span>
                  </Button>
                </div>

                {/* Excluded Badges List */}
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1.5">
                    Currently Enforced Exclusions:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {formData.foodsAvoided.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-rose-950 dark:hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="text-xs font-semibold">
                  ← Back
                </Button>
                <Button
                  type="button"
                  onClick={() => setStep(3)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2"
                >
                  <span>Continue to Nutrition Blueprint</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Goal Selection & Nutrition Blueprint */}
        {step === 3 && (
          <Card className="border border-slate-200 dark:border-slate-800 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Select Your Fitness Goal & Review Blueprint</CardTitle>
              <p className="text-xs text-slate-500">
                Bodybuilding sports nutrition formula automatically calculates your exact grams.
              </p>

              {/* Goal Definitions / Plain English Guide */}
              <div className="p-3 rounded-xl bg-slate-100/90 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs space-y-1.5 mt-3">
                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>What do Cut, Bulk, and Recomp mean?</span>
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                  <p>
                    • <strong className="text-emerald-700 dark:text-emerald-400">Cut (Reduce Fat):</strong> Eat in a -500 kcal deficit to burn fat and reveal muscle definition while shielding muscle with 165g protein.
                  </p>
                  <p>
                    • <strong className="text-blue-700 dark:text-blue-400">Bulk (Build Muscle):</strong> Eat in a +400 kcal surplus to lift heavier weights and grow bigger muscle mass.
                  </p>
                  <p>
                    • <strong className="text-amber-700 dark:text-amber-400">Normal (Maintain):</strong> Eat at 0 kcal delta to stay at the exact same weight.
                  </p>
                  <p>
                    • <strong className="text-purple-700 dark:text-purple-400">Recomp:</strong> Lose fat &amp; build muscle at the same time while keeping scale weight identical.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Goal Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, fitnessGoal: "fat_loss" })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    formData.fitnessGoal === "fat_loss"
                      ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/60 ring-2 ring-emerald-500"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  }`}
                >
                  <span className="font-bold text-xs flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                    <TrendingDown className="w-3.5 h-3.5" /> Weight Loss
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Deficit (Cut)</span>
                  <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 block mt-1">
                    {protocolsData.protocols.fat_loss.calories} kcal
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, fitnessGoal: "muscle_gain" })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    formData.fitnessGoal === "muscle_gain"
                      ? "border-blue-500 bg-blue-50/80 dark:bg-blue-950/60 ring-2 ring-blue-500"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  }`}
                >
                  <span className="font-bold text-xs flex items-center gap-1 text-blue-700 dark:text-blue-300">
                    <TrendingUp className="w-3.5 h-3.5" /> Weight Gain
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Surplus (Bulk)</span>
                  <span className="text-xs font-extrabold text-blue-700 dark:text-blue-400 block mt-1">
                    {protocolsData.protocols.muscle_gain.calories} kcal
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, fitnessGoal: "maintenance" })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    formData.fitnessGoal === "maintenance"
                      ? "border-amber-500 bg-amber-50/80 dark:bg-amber-950/60 ring-2 ring-amber-500"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  }`}
                >
                  <span className="font-bold text-xs flex items-center gap-1 text-amber-700 dark:text-amber-300">
                    <Scale className="w-3.5 h-3.5" /> Normal Count
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Equilibrium</span>
                  <span className="text-xs font-extrabold text-amber-700 dark:text-amber-400 block mt-1">
                    {protocolsData.protocols.maintenance.calories} kcal
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, fitnessGoal: "recomposition" })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    formData.fitnessGoal === "recomposition"
                      ? "border-purple-500 bg-purple-50/80 dark:bg-purple-950/60 ring-2 ring-purple-500"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  }`}
                >
                  <span className="font-bold text-xs flex items-center gap-1 text-purple-700 dark:text-purple-300">
                    <RefreshCw className="w-3.5 h-3.5" /> Recomp
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Dual Goal</span>
                  <span className="text-xs font-extrabold text-purple-700 dark:text-purple-400 block mt-1">
                    {protocolsData.protocols.recomposition.calories} kcal
                  </span>
                </button>
              </div>

              {/* Calculated Targets Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-xl bg-slate-100/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200/60 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Calories</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
                    {activeProtocol.calories}
                  </span>
                  <span className="text-[10px] text-slate-400">kcal/day</span>
                </div>

                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200/60 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Protein</span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                    {activeProtocol.proteinGrams}g
                  </span>
                  <span className="text-[10px] text-slate-400">{activeProtocol.proteinPerKg}g/kg</span>
                </div>

                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200/60 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Carbs</span>
                  <span className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1 block">
                    {activeProtocol.carbsGrams}g
                  </span>
                  <span className="text-[10px] text-slate-400">fuel energy</span>
                </div>

                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200/60 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Fats</span>
                  <span className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
                    {activeProtocol.fatGrams}g
                  </span>
                  <span className="text-[10px] text-slate-400">hormone floor</span>
                </div>

                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200/60 dark:border-slate-700 col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Water</span>
                  <span className="text-xl font-black text-cyan-600 dark:text-cyan-400 mt-1 block">
                    {activeProtocol.waterMl}ml
                  </span>
                  <span className="text-[10px] text-slate-400">daily hydration</span>
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center">
                <Button type="button" variant="outline" onClick={() => setStep(2)} className="text-xs font-semibold">
                  ← Back
                </Button>
                <Button
                  type="button"
                  onClick={handleFinishOnboarding}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-2.5 shadow-md flex items-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Start Tracking My Fresh Profile</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
