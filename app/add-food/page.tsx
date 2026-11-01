"use client";

import * as React from "react";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { foodUnderstandingService } from "@/lib/services/food-understanding-service";
import { nutritionCalculationService } from "@/lib/nutrition/calculation-service";
import { diaryService, MealCategory } from "@/lib/services/diary-service";
import { savedFoodsService, SavedFoodItem } from "@/lib/services/saved-foods-service";
import { DEFAULT_NUTRITION_TARGETS, NutritionGoals } from "@/lib/services/goal-service";
import { authService } from "@/lib/services/auth-service";
import { getLocalTodayDateString } from "@/lib/date/date-service";
import { InterpretedMeal } from "@/lib/services/types";
import { waterService } from "@/lib/services/water-service";
import { nutritionGoalEngine, PostMealEncouragement } from "@/lib/services/nutrition-goal-engine";
import { weightService } from "@/lib/services/weight-service";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Flame,
  Scale,
  ShieldCheck,
  Send,
  Edit3,
  ArrowRight,
  RotateCcw,
  LayoutDashboard,
  BookOpen,
  Bookmark,
  Search,
  Plus,
  Minus,
  FileText,
  Droplets,
  Dumbbell,
  Activity,
  Footprints,
} from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  early_morning: "Early Morning (6:00–7:30 AM)",
  breakfast: "Breakfast (8:00–9:30 AM)",
  mid_morning_snack: "Mid-Morning Snack (10:30–11:30 AM)",
  lunch: "Lunch (12:30–2:00 PM)",
  evening_snack: "Evening Snack (4:30–5:30 PM)",
  pre_workout: "Pre-Workout (30–45 mins before gym)",
  post_workout: "Post-Workout (Within 60 mins after gym)",
  dinner: "Dinner (Preferred cutoff: 7:00 PM IST)",
  other: "Other / Snacks (Anytime)",
};

export default function AddFoodPage() {
  const [description, setDescription] = React.useState("");
  const [isParsing, setIsParsing] = React.useState(false);
  const [interpretedMeal, setInterpretedMeal] = React.useState<InterpretedMeal | null>(null);
  const [idempotencyKey, setIdempotencyKey] = React.useState<string>("");
  const [saveStatus, setSaveStatus] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedSummary, setSavedSummary] = React.useState<{
    mealName: string;
    subtracted: { calories: number; protein: number; carbs: number; fat: number; fibre: number; waterMl?: number };
    newRemaining: { calories: number; protein: number; carbs: number; fat: number; fibre: number; waterMl: number };
  } | null>(null);
  const [postMealFeedback, setPostMealFeedback] = React.useState<PostMealEncouragement | null>(null);

  const [targets, setTargets] = React.useState<NutritionGoals>(DEFAULT_NUTRITION_TARGETS);
  const [todayTotals, setTodayTotals] = React.useState({ calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, waterMl: 0 });
  const [todayLogs, setTodayLogs] = React.useState(diaryService.getEntriesForDate(getLocalTodayDateString()));

  // Feature 08: Personal Food Library & Memory state
  const [entryMode, setEntryMode] = React.useState<"ai" | "library">("ai");
  const [libraryFoods, setLibraryFoods] = React.useState<SavedFoodItem[]>([]);
  const [librarySearch, setLibrarySearch] = React.useState("");
  const [selectedSavedFood, setSelectedSavedFood] = React.useState<SavedFoodItem | null>(null);
  const [portionMultiplier, setPortionMultiplier] = React.useState(1.0);
  const [targetCategory, setTargetCategory] = React.useState<MealCategory>("lunch");

  // Load configured user targets and daily totals
  const refreshDayStatus = React.useCallback(() => {
    const today = getLocalTodayDateString();
    const dt = diaryService.getDailyTotals(today);
    const water = waterService.getTotalWaterForDate(today);
    setTodayTotals({ ...dt, waterMl: water });
    setTodayLogs(diaryService.getEntriesForDate(today));
    setLibraryFoods(savedFoodsService.getSavedFoods());

    if (typeof window !== "undefined") {
      const id = authService.getCurrentUserId();
      const isSarveswar = id === "usr-sarveswar-primary" || id === "sarveswar";
      const targetsKey = isSarveswar ? "sarveswar_nutrition_targets" : `sarveswar_nutrition_targets_${id}`;
      const savedTargets = localStorage.getItem(targetsKey);
      if (savedTargets) {
        try {
          setTargets(JSON.parse(savedTargets));
        } catch (e) {
          console.warn("Could not parse saved targets:", e);
        }
      }
    }
  }, []);

  React.useEffect(() => {
    refreshDayStatus();

    const handleUpdate = () => refreshDayStatus();
    window.addEventListener("sarveswar-diary-updated", handleUpdate);
    window.addEventListener("sarveswar-targets-updated", handleUpdate);
    window.addEventListener("sarveswar-saved-foods-updated", handleUpdate);
    window.addEventListener("sarveswar-water-updated", handleUpdate);
    window.addEventListener("sarveswar-auth-changed", handleUpdate);

    // Midnight auto-rollover listener
    const midnightInterval = setInterval(() => {
      refreshDayStatus();
    }, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshDayStatus();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("sarveswar-diary-updated", handleUpdate);
      window.removeEventListener("sarveswar-targets-updated", handleUpdate);
      window.removeEventListener("sarveswar-saved-foods-updated", handleUpdate);
      window.removeEventListener("sarveswar-water-updated", handleUpdate);
      window.removeEventListener("sarveswar-auth-changed", handleUpdate);
      clearInterval(midnightInterval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshDayStatus]);

  // Remaining calculation: target minus consumed
  const currentRemaining = React.useMemo(() => {
    const waterTarget = targets.waterMl || 3000;
    return {
      calories: Math.max(0, targets.calories - todayTotals.calories),
      protein: Math.max(0, Math.round((targets.protein - todayTotals.protein) * 10) / 10),
      carbs: Math.max(0, Math.round((targets.carbs - todayTotals.carbs) * 10) / 10),
      fat: Math.max(0, Math.round((targets.fat - todayTotals.fat) * 10) / 10),
      fibre: Math.max(0, Math.round((targets.fibre - todayTotals.fibre) * 10) / 10),
      waterMl: Math.max(0, waterTarget - (todayTotals.waterMl || 0)),
    };
  }, [targets, todayTotals]);

  // Presets from user requirements for 1-click test
  const presets = [
    "I ate 200 g of grilled chicken breast at 1:15 PM. It contains 330 kcal, 62 g protein, 0 g carbohydrates, 7 g fat, 0 g fibre, and 0 ml water.",
    "I ate 200 g of grilled chicken breast at 1:15 PM for lunch. It contains 330 kcal, 62 g protein, 0 g carbohydrates, 7 g fat, and 0 g fibre.",
    "I ate 150 g grilled chicken breast for lunch at 1 PM, cooked with one teaspoon of olive oil.",
    "For breakfast at 8 AM, two boiled eggs, two slices of bread and one banana.",
    "At 1 PM, 200 g cooked rice, 150 g grilled chicken, 100 g vegetables.",
    "I drank 330 ml whole milk mixed with 30 g powdered almonds and walnuts at 7 AM.",
    "Two dosas with sambar at 8:30 AM.",
    "Yesterday at 7 PM, two chapatis with 150 g paneer curry.",
  ];

  const handleParse = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!description.trim()) return;

    setIsParsing(true);
    setSaveStatus("idle");
    setSavedSummary(null);

    try {
      const parsed = await foodUnderstandingService.parseDescription(description);
      const computed = await nutritionCalculationService.computeParsedMeal(parsed);
      setInterpretedMeal(computed);
      setIdempotencyKey(`idem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
    } catch (err) {
      console.error("Error parsing meal:", err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmAndSave = () => {
    if (!interpretedMeal) return;
    setSaveStatus("saving");

    const today = getLocalTodayDateString();
    const mealCat = (interpretedMeal.mealCategory as MealCategory) || "lunch";

    // Deterministic persistence: add each item directly to the diary
    for (const item of interpretedMeal.items) {
      diaryService.addEntry({
        diaryDate: today,
        mealCategory: mealCat,
        foodName: item.name,
        quantity: item.quantity,
        unit: item.unit,
        preparationMethod: item.preparationMethod || "cooked",
        isCooked: item.isCooked ?? true,
        confidenceLabel: item.sourceConfidence,
        calories: item.nutrients.calories,
        proteinG: item.nutrients.protein,
        carbsG: item.nutrients.carbs,
        fatG: item.nutrients.fat,
        fibreG: item.nutrients.fibre,
        consumedAt: interpretedMeal.loggedAt || new Date().toISOString(),
        idempotencyKey,
      });

      // Feature 08: Auto-save confirmed food to personal food library / memory
      savedFoodsService.saveFood({
        name: item.name,
        defaultQuantity: item.quantity,
        unit: item.unit,
        preparationMethod: item.preparationMethod || "cooked",
        isCooked: item.isCooked ?? true,
        nutrientsPerServing: item.nutrients,
      });
    }

    // Water logging if extracted from food or explicit nutrients
    if (interpretedMeal.totalNutrients.waterMl && interpretedMeal.totalNutrients.waterMl > 0) {
      waterService.logWater(today, interpretedMeal.totalNutrients.waterMl);
    }

    // Refresh new totals
    const newTotals = diaryService.getDailyTotals(today);
    const newWater = waterService.getTotalWaterForDate(today);
    const waterTarget = targets.waterMl || 3000;
    const newRem = {
      calories: Math.max(0, targets.calories - newTotals.calories),
      protein: Math.max(0, Math.round((targets.protein - newTotals.protein) * 10) / 10),
      carbs: Math.max(0, Math.round((targets.carbs - newTotals.carbs) * 10) / 10),
      fat: Math.max(0, Math.round((targets.fat - newTotals.fat) * 10) / 10),
      fibre: Math.max(0, Math.round((targets.fibre - newTotals.fibre) * 10) / 10),
      waterMl: Math.max(0, waterTarget - newWater),
    };

    const mealNameStr = interpretedMeal.items.map((i) => i.name).join(", ");
    setSavedSummary({
      mealName: mealNameStr,
      subtracted: {
        calories: interpretedMeal.totalNutrients.calories,
        protein: interpretedMeal.totalNutrients.protein,
        carbs: interpretedMeal.totalNutrients.carbs,
        fat: interpretedMeal.totalNutrients.fat,
        fibre: interpretedMeal.totalNutrients.fibre,
        waterMl: interpretedMeal.totalNutrients.waterMl ?? undefined,
      },
      newRemaining: newRem,
    });

    const userWeight = weightService.getLatestMeasurement()?.weightKg || 75;
    const encouragement = nutritionGoalEngine.getPostMealEncouragement(newTotals, targets, mealNameStr, userWeight);
    setPostMealFeedback(encouragement);

    setSaveStatus("saved");
    refreshDayStatus();
  };

  const handleResetForNext = () => {
    setDescription("");
    setInterpretedMeal(null);
    setSaveStatus("idle");
    setSavedSummary(null);
    setPostMealFeedback(null);
  };

  const handleLogSavedFood = (food: SavedFoodItem, multiplier: number, category: MealCategory) => {
    const today = getLocalTodayDateString();
    const cals = Math.round(food.nutrientsPerServing.calories * multiplier);
    const protein = Math.round(food.nutrientsPerServing.protein * multiplier * 10) / 10;
    const carbs = Math.round(food.nutrientsPerServing.carbs * multiplier * 10) / 10;
    const fat = Math.round(food.nutrientsPerServing.fat * multiplier * 10) / 10;
    const fibre = Math.round(food.nutrientsPerServing.fibre * multiplier * 10) / 10;
    const qty = Math.round(food.defaultQuantity * multiplier * 10) / 10;

    diaryService.addEntry({
      diaryDate: today,
      mealCategory: category,
      foodName: food.name,
      quantity: qty,
      unit: food.unit,
      preparationMethod: food.preparationMethod,
      isCooked: food.isCooked,
      confidenceLabel: "verified",
      calories: cals,
      proteinG: protein,
      carbsG: carbs,
      fatG: fat,
      fibreG: fibre,
      consumedAt: new Date().toISOString(),
    });

    savedFoodsService.recordUsage(food.id);

    const newTotals = diaryService.getDailyTotals(today);
    const newWater = waterService.getTotalWaterForDate(today);
    const waterTarget = targets.waterMl || 3000;
    const newRem = {
      calories: Math.max(0, targets.calories - newTotals.calories),
      protein: Math.max(0, Math.round((targets.protein - newTotals.protein) * 10) / 10),
      carbs: Math.max(0, Math.round((targets.carbs - newTotals.carbs) * 10) / 10),
      fat: Math.max(0, Math.round((targets.fat - newTotals.fat) * 10) / 10),
      fibre: Math.max(0, Math.round((targets.fibre - newTotals.fibre) * 10) / 10),
      waterMl: Math.max(0, waterTarget - newWater),
    };

    const savedMealStr = `${food.name} (${qty} ${food.unit})`;
    setSavedSummary({
      mealName: savedMealStr,
      subtracted: { calories: cals, protein, carbs, fat, fibre },
      newRemaining: newRem,
    });

    const userWeight = weightService.getLatestMeasurement()?.weightKg || 75;
    const encouragement = nutritionGoalEngine.getPostMealEncouragement(newTotals, targets, savedMealStr, userWeight);
    setPostMealFeedback(encouragement);

    setSelectedSavedFood(null);
    setPortionMultiplier(1.0);
    refreshDayStatus();
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navigation />

      <main className="flex-1 max-w-4xl mx-auto p-4 md:p-8 pb-24 md:pb-8">
        <header className="mb-6">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-semibold mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Natural-Language Food Entry</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
            Log What You Ate in Plain Words
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Tell the AI what you ate. It interprets dishes and calculates exact grams, then automatically subtracts from your daily target balance.
          </p>
        </header>

        {/* Live Target Balance Bar (Remaining to Eat Today) */}
        <div className="mb-6 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-slate-500">Live Daily Target Tracker</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Consumed: <strong className="text-slate-900 dark:text-white">{todayTotals.calories} kcal</strong> (Starts at 0) • Remaining balance counts down as you log food.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700"
            >
              <span>View Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center">
            <div className="p-2.5 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
              <span className="text-[10px] uppercase font-bold text-orange-600 block">Remaining Calories</span>
              <span className="text-lg font-black text-slate-900 dark:text-white">{currentRemaining.calories}</span>
              <span className="text-[10px] text-slate-400 block">of {targets.calories} kcal</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block">Remaining Protein</span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{currentRemaining.protein}g</span>
              <span className="text-[10px] text-slate-400 block">of {targets.protein}g</span>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
              <span className="text-[10px] uppercase font-bold text-blue-600 block">Remaining Carbs</span>
              <span className="text-lg font-black text-blue-600 dark:text-blue-400">{currentRemaining.carbs}g</span>
              <span className="text-[10px] text-slate-400 block">of {targets.carbs}g</span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
              <span className="text-[10px] uppercase font-bold text-amber-600 block">Remaining Fat</span>
              <span className="text-lg font-black text-amber-600 dark:text-amber-400">{currentRemaining.fat}g</span>
              <span className="text-[10px] text-slate-400 block">of {targets.fat}g</span>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
              <span className="text-[10px] uppercase font-bold text-purple-600 block">Remaining Fibre</span>
              <span className="text-lg font-black text-purple-600 dark:text-purple-400">{currentRemaining.fibre}g</span>
              <span className="text-[10px] text-slate-400 block">of {targets.fibre}g</span>
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/30 col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-cyan-600 block">Remaining Water</span>
              <span className="text-lg font-black text-cyan-600 dark:text-cyan-400">{currentRemaining.waterMl} ml</span>
              <span className="text-[10px] text-slate-400 block">of {targets.waterMl || 3000} ml</span>
            </div>
          </div>
        </div>

        {/* Saved Subtraction Confirmation Banner */}
        {savedSummary && (
          <div className="mb-6 p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-500 shadow-md animate-fade-in">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-base font-extrabold text-emerald-950 dark:text-emerald-100">
                    Food Confirmed &amp; Subtracted from Today&apos;s Target!
                  </h3>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 w-fit">
                    Atomic Log Saved
                  </span>
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-200 mt-1">
                  Logged: <span className="font-bold">{savedSummary.mealName}</span>
                </p>

                {/* Subtracted row */}
                <div className="mt-3 p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Nutrients Deducted from Target:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block">Calories:</span>
                      <strong className="text-red-600 dark:text-red-400 font-bold">-{savedSummary.subtracted.calories} kcal</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Protein:</span>
                      <strong className="text-red-600 dark:text-red-400 font-bold">-{savedSummary.subtracted.protein}g</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Carbs:</span>
                      <strong className="text-red-600 dark:text-red-400 font-bold">-{savedSummary.subtracted.carbs}g</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Fat:</span>
                      <strong className="text-red-600 dark:text-red-400 font-bold">-{savedSummary.subtracted.fat}g</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Fibre:</span>
                      <strong className="text-red-600 dark:text-red-400 font-bold">-{savedSummary.subtracted.fibre}g</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Water:</span>
                      <strong className="text-cyan-600 dark:text-cyan-400 font-bold">
                        {savedSummary.subtracted.waterMl !== undefined ? `+${savedSummary.subtracted.waterMl} ml` : "0 ml"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* New Remaining Balance */}
                <div className="mt-2 text-xs font-medium text-emerald-900 dark:text-emerald-100 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>🎯 <strong>New Remaining Balance:</strong></span>
                  <span><strong>{savedSummary.newRemaining.calories}</strong> kcal</span>
                  <span>• <strong>{savedSummary.newRemaining.protein}g</strong> Protein</span>
                  <span>• <strong>{savedSummary.newRemaining.carbs}g</strong> Carbs</span>
                  <span>• <strong>{savedSummary.newRemaining.fat}g</strong> Fat</span>
                  <span>• <strong>{savedSummary.newRemaining.waterMl} ml</strong> Water</span>
                </div>

                {/* Feature: Post-Meal Encouragement & Motivation */}
                {postMealFeedback && (
                  <div className="mt-4 space-y-3">
                    {/* Encouragement text */}
                    <div className="p-3.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-emerald-300 dark:border-emerald-700 shadow-sm">
                      <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Daily Goal Progress &amp; Motivation:</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                        {postMealFeedback.motivationMessage}
                      </p>
                    </div>

                    {/* Fulfilled Nutrients Celebration Badge */}
                    {postMealFeedback.fulfilledBadge && (
                      <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-300 dark:border-blue-700 text-xs font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-2 shadow-sm">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>{postMealFeedback.fulfilledBadge}</span>
                      </div>
                    )}

                    {/* Exceeded Nutrient & Day Flag with Compensatory Workout */}
                    {postMealFeedback.audit.isDayExceeded && (
                      <div className="p-4 rounded-xl bg-amber-50/90 dark:bg-amber-950/60 border-2 border-amber-500 text-amber-950 dark:text-amber-100 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-black text-sm text-amber-900 dark:text-amber-300 uppercase tracking-wide">
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span>⚠️ Limit Exceeded • Day Flagged</span>
                          </div>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-red-600 text-white shadow-sm">
                            Day Flagged
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                          {postMealFeedback.subheadline}
                        </p>

                        {/* Exceeded Nutrients Badges */}
                        <div className="flex flex-wrap gap-2">
                          {postMealFeedback.audit.exceededNutrients.map((n, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 text-xs font-extrabold"
                            >
                              ⚠️ {n.nutrient} exceeded by +{n.excessAmount} {n.unit}
                            </span>
                          ))}
                        </div>

                        {/* Excess Fat Science explanation */}
                        <div className="p-3 rounded-lg bg-white/95 dark:bg-slate-900/95 border border-amber-200 dark:border-amber-800 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                          <strong className="text-amber-900 dark:text-amber-300 block mb-1">
                            🧬 Metabolic Science: Excess Nutrients &amp; Adipose Fat Conversion
                          </strong>
                          {postMealFeedback.fatScienceExplanation}
                        </div>

                        {/* Compensatory Workout Offset */}
                        <div className="pt-2 border-t border-amber-200 dark:border-amber-800/60">
                          <div className="text-xs font-black uppercase text-amber-900 dark:text-amber-300 flex items-center gap-1.5 mb-2">
                            <Activity className="w-4 h-4 text-orange-600" />
                            <span>Compensatory Workout Offset to Burn Excess (+{postMealFeedback.audit.excessCalories} kcal):</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div className="p-2.5 rounded-lg bg-orange-100/70 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 flex items-center gap-2">
                              <Footprints className="w-4 h-4 text-orange-600 shrink-0" />
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">
                                  {postMealFeedback.audit.workoutOffset.walkingMinutes} Mins Walk
                                </span>
                                <span className="text-[10px] text-slate-500">~{postMealFeedback.audit.workoutOffset.walkingSteps.toLocaleString()} brisk steps</span>
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-red-100/70 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center gap-2">
                              <Flame className="w-4 h-4 text-red-600 shrink-0" />
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">
                                  {postMealFeedback.audit.workoutOffset.runningMinutes} Mins Jogging
                                </span>
                                <span className="text-[10px] text-slate-500">8.5 METs cardio pace</span>
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-purple-100/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center gap-2">
                              <Dumbbell className="w-4 h-4 text-purple-600 shrink-0" />
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">
                                  {postMealFeedback.audit.workoutOffset.gymMinutes} Mins Gym Training
                                </span>
                                <span className="text-[10px] text-slate-500">5.5 METs hypertrophy load</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Action Navigation */}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link
                    href="/reports?type=today"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View End-of-Day Report</span>
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>View Updated Dashboard</span>
                  </Link>
                  <Link
                    href="/diary"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Open Food Diary</span>
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetForNext}
                    className="text-xs flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Log Another Food</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mode Selector: AI Natural Language vs Personal Food Library (Feature 08) */}
        <div className="flex items-center gap-2 mb-6 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setEntryMode("ai")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              entryMode === "ai"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Natural Language AI</span>
          </button>
          <button
            type="button"
            onClick={() => setEntryMode("library")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              entryMode === "library"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 text-blue-600" />
            <span>Personal Food Library &amp; Memory ({libraryFoods.length})</span>
          </button>
        </div>

        {/* Feature 08: Personal Food Library & Memory Mode */}
        {entryMode === "library" ? (
          <div className="space-y-6 mb-8 animate-fade-in">
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Quick Select from Saved Foods</span>
                  <span className="text-xs font-normal text-slate-500">Persistent database storage</span>
                </CardTitle>
                <div className="relative mt-2">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {libraryFoods
                    .filter((f) => f.name.toLowerCase().includes(librarySearch.toLowerCase()))
                    .map((food) => {
                      const isSelected = selectedSavedFood?.id === food.id;
                      return (
                        <div
                          key={food.id}
                          onClick={() => {
                            setSelectedSavedFood(food);
                            setPortionMultiplier(1.0);
                          }}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{food.name}</h4>
                            <span className="text-[10px] text-slate-400">{food.timesUsed}x</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {food.defaultQuantity} {food.unit} • {food.preparationMethod}
                          </p>
                          <div className="mt-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {food.nutrientsPerServing.calories} kcal • {food.nutrientsPerServing.protein}g P
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Selected Food Quantity & Portion Stepper */}
                {selectedSavedFood && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 mt-4 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                          Adjust Quantity: {selectedSavedFood.name}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Base serving: {selectedSavedFood.defaultQuantity} {selectedSavedFood.unit}
                        </p>
                      </div>

                      {/* Multiplier buttons */}
                      <div className="flex items-center gap-2">
                        {[0.5, 1.0, 1.5, 2.0].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPortionMultiplier(m)}
                            className={`px-2.5 py-1 rounded text-xs font-bold ${
                              portionMultiplier === m
                                ? "bg-emerald-600 text-white"
                                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            {m}x
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs">
                      <div>
                        <span className="text-slate-500 block">Logging Quantity:</span>
                        <strong className="text-slate-900 dark:text-white">
                          {Math.round(selectedSavedFood.defaultQuantity * portionMultiplier * 10) / 10}{" "}
                          {selectedSavedFood.unit}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Calculated Calories:</span>
                        <strong className="text-orange-600 font-bold">
                          {Math.round(selectedSavedFood.nutrientsPerServing.calories * portionMultiplier)} kcal
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Calculated Protein:</span>
                        <strong className="text-emerald-600 font-bold">
                          {Math.round(selectedSavedFood.nutrientsPerServing.protein * portionMultiplier * 10) / 10}g
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Meal Category:</span>
                        <select
                          value={targetCategory}
                          onChange={(e) => setTargetCategory(e.target.value as MealCategory)}
                          className="mt-0.5 p-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        >
                          <option value="early_morning">Early Morning</option>
                          <option value="breakfast">Breakfast</option>
                          <option value="mid_morning_snack">Mid-Morning Snack</option>
                          <option value="lunch">Lunch</option>
                          <option value="evening_snack">Evening Snack</option>
                          <option value="pre_workout">Pre-Workout</option>
                          <option value="post_workout">Post-Workout</option>
                          <option value="dinner">Dinner</option>
                          <option value="other">Other / Snack</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSavedFood(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleLogSavedFood(selectedSavedFood, portionMultiplier, targetCategory)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        <span>Log to Diary &amp; Deduct from Target</span>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Input Card (Natural Language) */}
        {entryMode === "ai" && (
          <>
            <Card className="mb-6 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Describe Your Meal</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleParse} className="space-y-4">
              <div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500 transition-all"
                  required
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Quick Test Presets:</span>
                  {presets.slice(0, 4).map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setDescription(p)}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors font-medium"
                    >
                      {i === 0 ? "Ex 1 (Paragraph w/ Nutrients)" : i === 1 ? "Ex 2 (Lunch Brackets)" : `Preset ${i + 1}`}
                    </button>
                  ))}
                </div>

                <Button type="submit" disabled={isParsing || !description.trim()} className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  {isParsing ? "Interpreting Nutrition..." : "Interpret Nutrition"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Interpreted Nutrition Card & Explicit Confirmation Gate */}
        {interpretedMeal && (
          <div className="space-y-6 animate-fade-in">
            <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50/20 dark:bg-emerald-950/10">
              <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {CATEGORY_LABELS[interpretedMeal.mealCategory] || interpretedMeal.mealCategory.replace("_", " ")} • {interpretedMeal.loggedAt}
                    </span>
                  </div>
                  <CardTitle className="text-xl mt-1">Interpreted Nutrition Breakdown</CardTitle>
                </div>
                <div className="flex items-center gap-2 mt-2 md:mt-0 text-xs text-slate-500 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Unconfirmed — Click Confirm to Deduct from Daily Target</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Total Nutrients Banner */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div>
                    <span className="text-[11px] uppercase font-bold text-slate-500 block">Total Calories</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {interpretedMeal.totalNutrients.calories}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">kcal</span>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase font-bold text-slate-500 block">Protein</span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {interpretedMeal.totalNutrients.protein}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">g</span>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase font-bold text-slate-500 block">Carbs</span>
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                      {interpretedMeal.totalNutrients.carbs}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">g</span>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase font-bold text-slate-500 block">Fat</span>
                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                      {interpretedMeal.totalNutrients.fat}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">g</span>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase font-bold text-slate-500 block">Fibre</span>
                    <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                      {interpretedMeal.totalNutrients.fibre}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">g</span>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase font-bold text-slate-500 block">Water</span>
                    <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400">
                      {interpretedMeal.totalNutrients.waterMl || 0}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">ml</span>
                  </div>
                </div>

                {/* Subtraction Preview Box */}
                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <span>💡 Subtraction Preview:</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    If you confirm, your remaining calories will decrease from <strong>{currentRemaining.calories} kcal</strong> to{" "}
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {Math.max(0, currentRemaining.calories - interpretedMeal.totalNutrients.calories)} kcal
                    </strong>, and remaining protein from <strong>{currentRemaining.protein}g</strong> to{" "}
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {Math.max(0, Math.round((currentRemaining.protein - interpretedMeal.totalNutrients.protein) * 10) / 10)}g
                    </strong>.
                  </p>
                </div>

                {/* Items Breakdown Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Parsed Food Items ({interpretedMeal.items.length})
                  </h4>

                  <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                    {interpretedMeal.items.map((item, idx) => (
                      <div key={idx} className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2 text-sm">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{item.name}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                item.sourceConfidence === "verified"
                                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                                  : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                              }`}
                            >
                              {item.sourceConfidence.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {item.quantity} {item.unit} • {item.preparationMethod} ({item.isCooked ? "Cooked" : "Raw"})
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400 self-end md:self-auto">
                          <span>
                            <strong className="text-slate-900 dark:text-white">{item.nutrients.calories}</strong> kcal
                          </span>
                          <span>
                            <strong className="text-emerald-600">{item.nutrients.protein}g</strong> P
                          </span>
                          <span>
                            <strong className="text-blue-600">{item.nutrients.carbs}g</strong> C
                          </span>
                          <span>
                            <strong className="text-amber-600">{item.nutrients.fat}g</strong> F
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Explicit Confirmation Gate */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-500">
                    <p>
                      Idempotency Key:{" "}
                      <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{idempotencyKey}</code>
                    </p>
                    <p>Clicking confirm saves to your diary and subtracts from today&apos;s daily budget.</p>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setInterpretedMeal(null)}
                      disabled={saveStatus === "saving"}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleConfirmAndSave}
                      disabled={saveStatus === "saving" || saveStatus === "saved"}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      {saveStatus === "saving" ? (
                        "Saving & Subtracted..."
                      ) : saveStatus === "saved" ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          Saved to Diary!
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Confirm &amp; Deduct from Target
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </>
    )}

        {/* Confirmed Entries of the day */}
        <div className="mt-8">
          <h3 className="text-sm font-semibold uppercase text-slate-500 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Confirmed Food Logs Added Today ({todayLogs.length})</span>
          </h3>

          {todayLogs.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                No food logged yet today. Your daily intake starts clean at <strong>0g</strong> across all nutrients!
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Type what you ate above or pick a quick test preset to log your first meal.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                      {log.mealCategory.replace("_", " ")}
                    </span>
                    <span className="text-xs text-slate-500">
                      {log.consumedAt.includes("T") ? log.consumedAt.substring(11, 16) : ""} IST
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {log.foodName} ({log.quantity} {log.unit} • {log.preparationMethod})
                  </div>
                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                    {log.calories} kcal • {log.proteinG}g Protein • {log.carbsG}g Carbs • {log.fatG}g Fat • {log.fibreG}g Fibre
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
