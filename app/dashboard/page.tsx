"use client";

import * as React from "react";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { diaryService, FoodLogItem } from "@/lib/services/diary-service";
import { nutritionGoalEngine, DailyInsightSummary } from "@/lib/services/nutrition-goal-engine";
import { DEFAULT_NUTRITION_TARGETS, NutritionGoals, goalService } from "@/lib/services/goal-service";
import { preferencesService, formatTime12h, UserPreferences, MealCutoffs, DEFAULT_USER_PREFERENCES } from "@/lib/services/preferences-service";
import { authService, UserSession } from "@/lib/services/auth-service";
import { cloudSyncService } from "@/lib/services/cloud-sync-service";
import { getLocalTodayDateString } from "@/lib/date/date-service";
import { weightService } from "@/lib/services/weight-service";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import {
  LayoutDashboard,
  Sparkles,
  PlusCircle,
  Droplet,
  RefreshCw,
  Flame,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Target,
  BookOpen,
  Settings2,
  SlidersHorizontal,
  X,
  Activity,
  Footprints,
  Dumbbell,
} from "lucide-react";

const MACRO_COLORS = ["#10b981", "#3b82f6", "#f59e0b"]; // Protein, Carbs, Fat

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = React.useState<string>(getLocalTodayDateString());
  const [waterAmount, setWaterAmount] = React.useState<number>(0);
  const [refreshingInsights, setRefreshingInsights] = React.useState(false);
  const [insights, setInsights] = React.useState<DailyInsightSummary | null>(null);
  const [currentUser, setCurrentUser] = React.useState<UserSession | null>(null);
  const [targets, setTargets] = React.useState<NutritionGoals>(DEFAULT_NUTRITION_TARGETS);
  const [dailyTotals, setDailyTotals] = React.useState({ calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 });
  const [todayEntries, setTodayEntries] = React.useState<FoodLogItem[]>([]);
  const [notice, setNotice] = React.useState<string | null>(null);

  // User-Prompted Preferences & Dynamic Meal Cutoffs State (initial state uses constant defaults to prevent SSR hydration mismatch)
  const [preferences, setPreferences] = React.useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [prefPrompt, setPrefPrompt] = React.useState("");
  const [prefPromptFeedback, setPrefPromptFeedback] = React.useState<string | null>(null);
  const [isEditingCutoffs, setIsEditingCutoffs] = React.useState(false);
  const [newAvoidInput, setNewAvoidInput] = React.useState("");

  // Load configured targets and daily numbers
  const refreshData = React.useCallback(() => {
    const totals = diaryService.getDailyTotals(selectedDate);
    const water = diaryService.getWaterForDate(selectedDate);
    const entries = diaryService.getEntriesForDate(selectedDate);
    setDailyTotals(totals);
    setWaterAmount(water);
    setTodayEntries([...entries]);

    if (typeof window !== "undefined") {
      const id = authService.getCurrentUserId();
      const isSarveswar = id === "usr-sarveswar-primary" || id === "sarveswar";
      const targetsKey = isSarveswar ? "sarveswar_nutrition_targets" : `sarveswar_nutrition_targets_${id}`;
      const stored = localStorage.getItem(targetsKey);
      if (stored) {
        try {
          setTargets(JSON.parse(stored));
        } catch (e) {
          console.warn("Could not load stored targets:", e);
        }
      } else {
        setTargets(goalService.getGoalForDate(selectedDate));
      }
    }
  }, [selectedDate]);

  React.useEffect(() => {
    // Hydrate client preferences safely after mount
    setCurrentUser(authService.getCurrentUser());
    setPreferences(preferencesService.getPreferences());
    refreshData();

    // Trigger non-blocking cloud synchronization for multi-device harmony
    const activeId = authService.getCurrentUserId();
    if (activeId) {
      cloudSyncService.fullSync(activeId).then(() => {
        setPreferences(preferencesService.getPreferences());
        refreshData();
      });
    }

    const handleUpdate = () => refreshData();
    const handlePrefsUpdate = () => {
      setPreferences(preferencesService.getPreferences());
    };
    const handleAuthUpdate = () => {
      setCurrentUser(authService.getCurrentUser());
      setPreferences(preferencesService.getPreferences());
      refreshData();
    };

    window.addEventListener("sarveswar-diary-updated", handleUpdate);
    window.addEventListener("sarveswar-targets-updated", handleUpdate);
    window.addEventListener("sarveswar-preferences-updated", handlePrefsUpdate);
    window.addEventListener("sarveswar-auth-changed", handleAuthUpdate);

    // Midnight auto-rollover listener: checks if the date in Asia/Kolkata rolled past 12:00 AM midnight
    const midnightInterval = setInterval(() => {
      const currentToday = getLocalTodayDateString();
      if (currentToday !== selectedDate) {
        setSelectedDate(currentToday);
      }
    }, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const currentToday = getLocalTodayDateString();
        if (currentToday !== selectedDate) {
          setSelectedDate(currentToday);
        } else {
          refreshData();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("sarveswar-diary-updated", handleUpdate);
      window.removeEventListener("sarveswar-targets-updated", handleUpdate);
      window.removeEventListener("sarveswar-preferences-updated", handlePrefsUpdate);
      window.removeEventListener("sarveswar-auth-changed", handleAuthUpdate);
      clearInterval(midnightInterval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshData, selectedDate]);

  // Calculate goal progress with active targets
  const progress = React.useMemo(() => {
    return nutritionGoalEngine.calculateProgress(dailyTotals, waterAmount, targets);
  }, [dailyTotals, waterAmount, targets]);

  // Goal completion check
  const isAllGoalsMet = React.useMemo(() => {
    return (
      progress.calories.consumed >= progress.calories.target * 0.95 &&
      progress.protein.consumed >= progress.protein.target * 0.95
    );
  }, [progress]);

  // Nutrient excess & compensatory workout audit
  const excessAudit = React.useMemo(() => {
    const userWeight = weightService.getLatestMeasurement()?.weightKg || 75;
    return nutritionGoalEngine.calculateExcessAndCompensatoryWorkouts(dailyTotals, targets, userWeight);
  }, [dailyTotals, targets]);

  // Macro calorie split & discrepancy
  const macroCalc = React.useMemo(() => {
    return nutritionGoalEngine.calculateMacroCalories(dailyTotals);
  }, [dailyTotals]);

  // Load AI Insights
  const loadInsights = React.useCallback(async () => {
    setRefreshingInsights(true);
    try {
      const result = await nutritionGoalEngine.generateDailyInsights(
        selectedDate,
        dailyTotals,
        waterAmount,
        targets,
        {
          preferredDinnerCutoff: preferences.cutoffs.dinner,
          foodsAvoided: preferences.foodsAvoided,
        }
      );
      setInsights(result);
    } finally {
      setRefreshingInsights(false);
    }
  }, [selectedDate, dailyTotals, waterAmount, targets, preferences]);

  React.useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  // Preference Handlers
  const handleApplyPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prefPrompt.trim()) return;
    const result = preferencesService.applyPrompt(prefPrompt);
    setPreferences({ ...result.preferences });
    if (result.summary.length > 0) {
      setPrefPromptFeedback(`Updated: ${result.summary.join(" • ")}`);
    } else {
      setPrefPromptFeedback("Preferences interpreted and saved successfully.");
    }
    setPrefPrompt("");
    showNotice("Your meal cutoffs & dietary preferences updated!");
    setTimeout(() => setPrefPromptFeedback(null), 5000);
  };

  const handleCutoffChange = (cat: keyof MealCutoffs, time24: string) => {
    const updated = preferencesService.savePreferences({
      cutoffs: {
        ...preferences.cutoffs,
        [cat]: time24,
      },
    });
    setPreferences({ ...updated });
    showNotice(`Updated ${cat.replace("_", " ")} cutoff to ${formatTime12h(time24)}.`);
  };

  const handleAddAvoided = (food: string) => {
    if (!food.trim()) return;
    const updated = preferencesService.addAvoidedFood(food);
    setPreferences({ ...updated });
    setNewAvoidInput("");
    showNotice(`Added "${food}" to your avoided foods list.`);
  };

  const handleRemoveAvoided = (food: string) => {
    const updated = preferencesService.removeAvoidedFood(food);
    setPreferences({ ...updated });
    showNotice(`Removed "${food}" from your avoided foods list.`);
  };

  const handleQuickAddWater = (ml: number) => {
    const newTotal = diaryService.logWater(selectedDate, ml);
    setWaterAmount(newTotal);
    showNotice(`Logged +${ml}ml water.`);
  };

  const handleResetDay = () => {
    if (confirm("Reset today's logged food and water back to 0?")) {
      diaryService.clearDate(selectedDate);
      refreshData();
      showNotice("Today has been reset to 0g across all nutrients.");
    }
  };

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  // Chart data: Target vs Consumed
  const targetVsConsumedData = [
    { name: "Calories", target: progress.calories.target, consumed: progress.calories.consumed },
    { name: "Protein (g)", target: progress.protein.target, consumed: progress.protein.consumed },
    { name: "Carbs (g)", target: progress.carbs.target, consumed: progress.carbs.consumed },
    { name: "Fat (g)", target: progress.fat.target, consumed: progress.fat.consumed },
    { name: "Fibre (g)", target: progress.fibre.target, consumed: progress.fibre.consumed },
  ];

  // Chart data: Macro calorie distribution
  const macroPieData = [
    { name: "Protein", value: macroCalc.proteinCalories, pct: macroCalc.proteinPct },
    { name: "Carbs", value: macroCalc.carbsCalories, pct: macroCalc.carbsPct },
    { name: "Fat", value: macroCalc.fatCalories, pct: macroCalc.fatPct },
  ];

  // 7-Day Trend mockup
  const trendData = [
    { day: "Oct 23", calories: 2320, protein: 148 },
    { day: "Oct 24", calories: 2410, protein: 152 },
    { day: "Oct 25", calories: 2380, protein: 145 },
    { day: "Oct 26", calories: 2450, protein: 155 },
    { day: "Oct 27", calories: 2290, protein: 142 },
    { day: "Oct 28", calories: 2390, protein: 150 },
    { day: "Today", calories: dailyTotals.calories, protein: dailyTotals.protein },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navigation />

      <main className="flex-1 max-w-6xl mx-auto p-4 md:p-8 pb-24 md:pb-8">
        {/* Header */}
        <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-semibold mb-1">
              <LayoutDashboard className="w-4 h-4" />
              <span>Nutrition Overview</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
              {currentUser ? `Welcome back, ${currentUser.name}` : "Today's Nutrition Dashboard"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live deterministic tracking • Asia/Kolkata
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDay}
              className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 hover:text-red-600"
              title="Reset all food logs and water for today to 0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Today to 0</span>
            </Button>
            <Link
              href="/add-food"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Food</span>
            </Link>
            <Link
              href="/recommendations"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 text-sm font-medium transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ask AI</span>
            </Link>
          </div>
        </header>

        {notice && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 animate-fade-in">
            {notice}
          </div>
        )}

        {/* Feature 06: Celebratory Success Screen when Daily Goals are Met */}
        {isAllGoalsMet && (
          <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-amber-500/15 to-emerald-500/10 border-2 border-emerald-500 shadow-lg text-slate-900 dark:text-white flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-3xl shadow shrink-0">
              🏆
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-black uppercase tracking-wider mb-1">
                Milestone Complete
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Daily nutrition goals achieved!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Outstanding consistency! You have fulfilled today&apos;s calorie ({progress.calories.consumed} / {progress.calories.target} kcal) and protein ({progress.protein.consumed}g / {progress.protein.target}g) targets.
              </p>
            </div>
          </div>
        )}

        {/* Feature: Fulfilled Nutrient Goal Notification */}
        {excessAudit.fulfilledNutrients.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-300 dark:border-blue-700 text-xs font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-2 shadow-sm animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>🎯 Daily Goal Fulfilled: {excessAudit.fulfilledNutrients.join(", ")} reached 100% target!</span>
          </div>
        )}

        {/* Feature: Nutrient Limit Exceeded, Day Flagged & Compensatory Workout Offset */}
        {excessAudit.isDayExceeded ? (
          <div className="mb-6 p-5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/60 border-2 border-amber-500 text-amber-950 dark:text-amber-100 shadow-sm space-y-3 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 dark:border-amber-800/80 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <h3 className="text-base font-extrabold text-amber-900 dark:text-amber-300">
                  ⚠️ Nutrient Limit Exceeded • Day Flagged
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase px-2.5 py-1 rounded bg-red-600 text-white shadow-sm">
                  Day Flagged
                </span>
                <span className="text-xs font-bold text-amber-800 dark:text-amber-200">
                  +{excessAudit.excessCalories} kcal surplus
                </span>
              </div>
            </div>

            {/* Exceeded Nutrients Badges */}
            <div className="flex flex-wrap gap-2 pt-1">
              {excessAudit.exceededNutrients.map((n, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 text-xs font-extrabold"
                >
                  ⚠️ {n.nutrient} exceeded by +{n.excessAmount} {n.unit}
                </span>
              ))}
            </div>

            {/* Excess Fat Science explanation */}
            <div className="p-3 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-amber-200 dark:border-amber-800 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <strong className="text-amber-900 dark:text-amber-300 block mb-1">
                🧬 Metabolic Science: Excess Nutrients &amp; Adipose Fat Conversion
              </strong>
              All macronutrients (fats, carbs, protein) consumed above daily metabolic expenditure are converted and stored as adipose body fat (1 kg body fat ≈ 7,700 kcal). Dietary fat is stored with highest metabolic efficiency (97–98%). Your surplus of +{excessAudit.excessCalories} kcal equals ~<strong>{excessAudit.potentialBodyFatGrams}g</strong> potential body fat accumulation unless expended through physical exercise.
            </div>

            {/* Compensatory Workout Offset */}
            <div className="pt-2 border-t border-amber-200 dark:border-amber-800/60">
              <div className="text-xs font-black uppercase text-amber-900 dark:text-amber-300 flex items-center gap-1.5 mb-2">
                <Activity className="w-4 h-4 text-orange-600" />
                <span>Compensatory Workout Offset to Burn Excess (+{excessAudit.excessCalories} kcal):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-orange-100/70 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 flex items-center gap-2.5">
                  <Footprints className="w-5 h-5 text-orange-600 shrink-0" />
                  <div>
                    <span className="font-extrabold text-slate-900 dark:text-white block">
                      {excessAudit.workoutOffset.walkingMinutes} Mins Brisk Walk
                    </span>
                    <span className="text-[11px] text-slate-500">~{excessAudit.workoutOffset.walkingSteps.toLocaleString()} steps at 3.5 METs</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-red-100/70 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center gap-2.5">
                  <Flame className="w-5 h-5 text-red-600 shrink-0" />
                  <div>
                    <span className="font-extrabold text-slate-900 dark:text-white block">
                      {excessAudit.workoutOffset.runningMinutes} Mins Jogging
                    </span>
                    <span className="text-[11px] text-slate-500">8.5 METs cardio burn</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-purple-100/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center gap-2.5">
                  <Dumbbell className="w-5 h-5 text-purple-600 shrink-0" />
                  <div>
                    <span className="font-extrabold text-slate-900 dark:text-white block">
                      {excessAudit.workoutOffset.gymMinutes} Mins Gym Training
                    </span>
                    <span className="text-[11px] text-slate-500">5.5 METs strength session</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : progress.calories.excess > 0 ? (
          <div className="mb-6 p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 flex items-center gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <span className="font-bold">Accurate Calorie Surplus Tracking:</span> You have consumed{" "}
              <strong className="text-blue-700 dark:text-blue-300">+{progress.calories.excess} kcal</strong> beyond your baseline target.
            </div>
          </div>
        ) : null}

        {/* Live Daily Remaining Balance Card (The Core Countdown Feature) */}
        <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white shadow-md border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-800 gap-2">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-200">
                Live Daily Nutrition Countdown
              </h2>
            </div>
            <div className="text-xs text-slate-400">
              Target: <span className="text-white font-bold">{targets.calories} kcal</span> • Consumed:{" "}
              <span className="text-emerald-400 font-bold">{progress.calories.consumed} kcal</span> • Remaining:{" "}
              <span className="text-orange-400 font-bold">{progress.calories.remaining} kcal</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-1">
            {/* Calories countdown */}
            {progress.calories.excess > 0 ? (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-700/80">
                <span className="text-[10px] uppercase font-black text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Calories Exceeded</span>
                </span>
                <div className="text-2xl font-black text-red-400 mt-0.5">
                  +{progress.calories.excess} <span className="text-xs font-normal text-red-300">kcal over</span>
                </div>
                <div className="text-[10px] text-red-300 mt-1 font-extrabold uppercase">
                  ⚠️ Day Flagged
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <span className="text-[10px] uppercase font-bold text-orange-400 block">Remaining Calories</span>
                <div className="text-2xl font-black text-white mt-0.5">
                  {progress.calories.remaining} <span className="text-xs font-normal text-slate-400">kcal</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {progress.calories.consumed} kcal eaten of {targets.calories}
                </div>
              </div>
            )}

            {/* Protein countdown */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block">Remaining Protein</span>
                {progress.protein.consumed >= progress.protein.target && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Fulfilled
                  </span>
                )}
              </div>
              <div className="text-2xl font-black text-emerald-400 mt-0.5">
                {progress.protein.remaining} <span className="text-xs font-normal text-slate-400">g</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {progress.protein.consumed}g eaten of {targets.protein}g
              </div>
            </div>

            {/* Carbs countdown */}
            <div className={`p-3 rounded-xl border ${progress.carbs.excess > 0 ? "bg-amber-950/40 border-amber-700/60" : "bg-slate-800/80 border-slate-700/60"}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-blue-400 block">Remaining Carbs</span>
                {progress.carbs.excess > 0 && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    +{progress.carbs.excess}g Over
                  </span>
                )}
              </div>
              <div className="text-2xl font-black text-blue-400 mt-0.5">
                {progress.carbs.remaining} <span className="text-xs font-normal text-slate-400">g</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {progress.carbs.consumed}g eaten of {targets.carbs}g
              </div>
            </div>

            {/* Fat countdown */}
            {progress.fat.excess > 0 ? (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-700/80">
                <span className="text-[10px] uppercase font-black text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Fat Exceeded</span>
                </span>
                <div className="text-2xl font-black text-red-400 mt-0.5">
                  +{progress.fat.excess} <span className="text-xs font-normal text-red-300">g over</span>
                </div>
                <div className="text-[10px] text-red-300 mt-1 font-extrabold uppercase">
                  ⚠️ Limit Exceeded
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <span className="text-[10px] uppercase font-bold text-amber-400 block">Remaining Fat</span>
                <div className="text-2xl font-black text-amber-400 mt-0.5">
                  {progress.fat.remaining} <span className="text-xs font-normal text-slate-400">g</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {progress.fat.consumed}g eaten of {targets.fat}g
                </div>
              </div>
            )}

            {/* Fibre countdown */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <span className="text-[10px] uppercase font-bold text-purple-400 block">Remaining Fibre</span>
              <div className="text-2xl font-black text-purple-400 mt-0.5">
                {progress.fibre.remaining} <span className="text-xs font-normal text-slate-400">g</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {progress.fibre.consumed}g eaten of {targets.fibre}g
              </div>
            </div>

            {/* Water countdown */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <span className="text-[10px] uppercase font-bold text-cyan-400 block">Remaining Water</span>
              <div className="text-2xl font-black text-cyan-400 mt-0.5">
                {progress.water.remaining} <span className="text-xs font-normal text-slate-400">ml</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {progress.water.consumed}ml drunk of {targets.waterMl || 3000}ml
              </div>
            </div>
          </div>
        </div>

        {/* AI Nutrition Insights Section */}
        <Card className="mb-8 border-purple-200 dark:border-purple-900/60 bg-gradient-to-r from-purple-50/60 via-white to-emerald-50/40 dark:from-purple-950/20 dark:via-slate-900 dark:to-emerald-950/10 shadow-sm">
          <CardHeader className="py-4 px-6 flex flex-row items-center justify-between border-b border-purple-100 dark:border-purple-900/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base">Today&apos;s AI Nutrition Insights</CardTitle>
                <span className="text-[11px] text-slate-500">
                  {insights?.source === "gemini_ai" ? "Enhanced by Google Gemini" : "Deterministic Rule Engine (Fallback Safe)"}
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={loadInsights}
              disabled={refreshingInsights}
              className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingInsights ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </CardHeader>

          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-3 leading-relaxed">
              &ldquo;{insights?.aiAnalysisText}&rdquo;
            </p>

            {insights?.bulletPoints && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 pt-3 border-t border-purple-100/60 dark:border-purple-900/40">
                {insights.bulletPoints.map((bp, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{bp}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Primary Macro Cards with Progress Bars */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
          {/* Calories */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-xs text-slate-500 uppercase font-semibold">
              <span>Calories</span>
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{progress.calories.consumed}</span>
              <span className="text-xs text-slate-400"> / {progress.calories.target} kcal</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
              <div
                className="bg-orange-500 h-full rounded-full transition-all"
                style={{ width: `${progress.calories.percentComplete}%` }}
              />
            </div>
            <div className="mt-2 text-[11px] font-medium text-slate-600 dark:text-slate-400">
              {progress.calories.excess > 0 ? (
                <span className="text-red-500 font-semibold">Exceeded by {progress.calories.excess} kcal</span>
              ) : (
                <span>{progress.calories.remaining} kcal remaining</span>
              )}
            </div>
          </div>

          {/* Protein */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs text-slate-500 uppercase font-semibold block">Protein</span>
            <div className="mt-2">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {progress.protein.consumed}g
              </span>
              <span className="text-xs text-slate-400"> / {progress.protein.target}g</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{ width: `${progress.protein.percentComplete}%` }}
              />
            </div>
            <div className="mt-2 text-[11px] font-medium text-slate-600 dark:text-slate-400">
              {progress.protein.remaining > 0 ? `${progress.protein.remaining}g remaining` : "Target reached!"}
            </div>
          </div>

          {/* Carbs */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs text-slate-500 uppercase font-semibold block">Carbs</span>
            <div className="mt-2">
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {progress.carbs.consumed}g
              </span>
              <span className="text-xs text-slate-400"> / {progress.carbs.target}g</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
              <div
                className="bg-blue-500 h-full rounded-full transition-all"
                style={{ width: `${progress.carbs.percentComplete}%` }}
              />
            </div>
            <div className="mt-2 text-[11px] font-medium text-slate-600 dark:text-slate-400">
              {progress.carbs.remaining}g remaining
            </div>
          </div>

          {/* Fat */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs text-slate-500 uppercase font-semibold block">Fat</span>
            <div className="mt-2">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {progress.fat.consumed}g
              </span>
              <span className="text-xs text-slate-400"> / {progress.fat.target}g</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
              <div
                className="bg-amber-500 h-full rounded-full transition-all"
                style={{ width: `${progress.fat.percentComplete}%` }}
              />
            </div>
            <div className="mt-2 text-[11px] font-medium text-slate-600 dark:text-slate-400">
              {progress.fat.remaining}g remaining
            </div>
          </div>

          {/* Fibre */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs text-slate-500 uppercase font-semibold block">Fibre</span>
            <div className="mt-2">
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                {progress.fibre.consumed}g
              </span>
              <span className="text-xs text-slate-400"> / {progress.fibre.target}g</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
              <div
                className="bg-purple-500 h-full rounded-full transition-all"
                style={{ width: `${progress.fibre.percentComplete}%` }}
              />
            </div>
            <div className="mt-2 text-[11px] font-medium text-slate-600 dark:text-slate-400">
              {progress.fibre.remaining}g remaining
            </div>
          </div>

          {/* Water */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 uppercase font-semibold">
              <span>Water</span>
              <Droplet className="w-4 h-4 text-cyan-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400">
                {progress.water.consumed}
              </span>
              <span className="text-xs text-slate-400"> / {progress.water.target}ml</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
              <div
                className="bg-cyan-500 h-full rounded-full transition-all"
                style={{ width: `${progress.water.percentComplete}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
              <span>{progress.water.remaining}ml left</span>
              <button
                onClick={() => handleQuickAddWater(250)}
                className="font-bold text-cyan-600 hover:underline"
              >
                +250ml
              </button>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Chart 1: Target vs Consumed */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Target vs. Consumed Intake</CardTitle>
              <p className="text-xs text-slate-500">Deterministic comparison (0 if no meals logged yet)</p>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={targetVsConsumedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="target" fill="#cbd5e1" name="Target" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="consumed" fill="#10b981" name="Consumed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Chart 2: 4-4-9 Macro Calorie Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">4-4-9 Macro Energy Split</CardTitle>
              <p className="text-xs text-slate-500">Atwater energy factors (4 kcal/g Protein &amp; Carbs, 9 kcal/g Fat)</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="h-64 w-full sm:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={macroPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {macroPieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={MACRO_COLORS[index % MACRO_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="w-full sm:w-1/2 space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      Protein ({macroCalc.proteinPct}%)
                    </span>
                    <span className="font-bold">{macroCalc.proteinCalories} kcal</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      Carbohydrates ({macroCalc.carbsPct}%)
                    </span>
                    <span className="font-bold">{macroCalc.carbsCalories} kcal</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      Fats ({macroCalc.fatPct}%)
                    </span>
                    <span className="font-bold">{macroCalc.fatCalories} kcal</span>
                  </div>

                  <p className="text-[11px] text-slate-500 pt-1 leading-snug">
                    {macroCalc.explanation}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* USER-PROMPTED PREFERENCES: Meal Cutoffs & Dietary Constraints */}
        <Card className="mb-8 border-purple-200 dark:border-purple-900/60 shadow-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-50/60 to-slate-50/60 dark:from-purple-950/30 dark:to-slate-900/30 p-5 border-b border-purple-100 dark:border-purple-900/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span>My Meal Cutoffs &amp; Dietary Constraints</span>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Prompt or customize your preferred cutoffs for all meals and foods you avoid. Enforced across Food Diary, AI recommendations, and reports.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingCutoffs(!isEditingCutoffs)}
                className="text-xs rounded-xl border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-950/60 gap-1.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{isEditingCutoffs ? "Close Cutoff Editor" : "Edit All Cutoffs"}</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-5">
            {/* Natural-Language Prompt Box */}
            <div className="p-4 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 space-y-2">
              <label className="block text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Prompt Your Preferred Cutoffs &amp; Avoided Foods in Plain English:</span>
              </label>
              <form onSubmit={handleApplyPrompt} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={prefPrompt}
                  onChange={(e) => setPrefPrompt(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <Button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shrink-0 gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Interpret &amp; Apply</span>
                </Button>
              </form>

              {prefPromptFeedback && (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{prefPromptFeedback}</span>
                </div>
              )}
            </div>

            {/* Active Cutoffs Summary Grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span>Configured Meal Cutoff Timers (Enforced in Food Diary):</span>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 text-xs">
                {/* Early Morning */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Early Morning</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatTime12h(preferences.cutoffs.early_morning)}
                  </span>
                </div>

                {/* Breakfast */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Breakfast</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatTime12h(preferences.cutoffs.breakfast)}
                  </span>
                </div>

                {/* Mid-Morning */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Mid-Morning</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatTime12h(preferences.cutoffs.mid_morning_snack)}
                  </span>
                </div>

                {/* Lunch */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Lunch</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatTime12h(preferences.cutoffs.lunch)}
                  </span>
                </div>

                {/* Evening Snack */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Evening Snack</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatTime12h(preferences.cutoffs.evening_snack)}
                  </span>
                </div>

                {/* Pre-Workout */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Pre-Workout</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatTime12h(preferences.cutoffs.pre_workout)}
                  </span>
                </div>

                {/* Post-Workout */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Post-Workout</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatTime12h(preferences.cutoffs.post_workout)}
                  </span>
                </div>

                {/* Dinner */}
                <div className="p-2.5 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800">
                  <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 block">
                    Dinner (Cutoff)
                  </span>
                  <span className="font-extrabold text-purple-900 dark:text-purple-200">
                    {formatTime12h(preferences.cutoffs.dinner)}
                  </span>
                </div>

                {/* Other */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Other / Late Snacks</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatTime12h(preferences.cutoffs.other)}
                  </span>
                </div>
              </div>
            </div>

            {/* Inline Editor (When toggled open) */}
            {isEditingCutoffs && (
              <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 space-y-4 animate-in fade-in">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Adjust Specific Meal Cutoff Times:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Breakfast Cutoff</label>
                    <input
                      type="time"
                      value={preferences.cutoffs.breakfast}
                      onChange={(e) => handleCutoffChange("breakfast", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Lunch Cutoff</label>
                    <input
                      type="time"
                      value={preferences.cutoffs.lunch}
                      onChange={(e) => handleCutoffChange("lunch", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Dinner Cutoff</label>
                    <input
                      type="time"
                      value={preferences.cutoffs.dinner}
                      onChange={(e) => handleCutoffChange("dinner", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/40 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Evening Snack Cutoff</label>
                    <input
                      type="time"
                      value={preferences.cutoffs.evening_snack}
                      onChange={(e) => handleCutoffChange("evening_snack", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Mid-Morning Cutoff</label>
                    <input
                      type="time"
                      value={preferences.cutoffs.mid_morning_snack}
                      onChange={(e) => handleCutoffChange("mid_morning_snack", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Pre-Workout Cutoff</label>
                    <input
                      type="time"
                      value={preferences.cutoffs.pre_workout}
                      onChange={(e) => handleCutoffChange("pre_workout", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Post-Workout Cutoff</label>
                    <input
                      type="time"
                      value={preferences.cutoffs.post_workout}
                      onChange={(e) => handleCutoffChange("post_workout", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Other Snack Cutoff</label>
                    <input
                      type="time"
                      value={preferences.cutoffs.other}
                      onChange={(e) => handleCutoffChange("other", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Excluded Foods Chips */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                Foods Avoided / Excluded from Recommendations:
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {preferences.foodsAvoided.map((item) => (
                  <div
                    key={item}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAvoided(item)}
                      className="hover:text-red-500 transition-colors"
                      title={`Remove ${item}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Inline Add Food Input */}
                <div className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    value={newAvoidInput}
                    onChange={(e) => setNewAvoidInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newAvoidInput.trim()) {
                        e.preventDefault();
                        handleAddAvoided(newAvoidInput.trim());
                      }
                    }}
                    className="px-3 py-1 rounded-full border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500 w-36"
                  />
                  {newAvoidInput.trim() && (
                    <button
                      type="button"
                      onClick={() => handleAddAvoided(newAvoidInput.trim())}
                      className="px-2.5 py-1 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                    >
                      Add
                    </button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature 04: Today's Logged Meal Entries directly on Dashboard */}
        <Card className="mb-8 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>Today&apos;s Logged Meal Entries ({todayEntries.length})</span>
              </CardTitle>
              <p className="text-xs text-slate-500">Live entries driving your consumed and remaining totals</p>
            </div>
            <Link
              href="/add-food"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>+ Add Food</span>
            </Link>
          </CardHeader>
          <CardContent>
            {todayEntries.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  No meals logged yet today (Starts at 0g across all nutrients)
                </p>
                <p className="text-slate-400 mt-0.5">
                  Click &ldquo;Add Food&rdquo; to type what you ate in natural language.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {todayEntries.map((entry) => (
                  <div key={entry.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{entry.foodName}</span>
                      <span className="text-slate-400 ml-2">
                        ({entry.quantity} {entry.unit} • {entry.mealCategory.replace("_", " ")})
                      </span>
                    </div>
                    <div className="font-semibold text-slate-700 dark:text-slate-300 self-end sm:self-auto">
                      <span className="text-slate-900 dark:text-white font-bold">{entry.calories} kcal</span> •{" "}
                      <span className="text-emerald-600 font-bold">{entry.proteinG}g P</span> •{" "}
                      <span className="text-blue-600 font-bold">{entry.carbsG}g C</span> •{" "}
                      <span className="text-amber-600 font-bold">{entry.fatG}g F</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 7-Day Trend Chart */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">7-Day Intake Consistency</CardTitle>
              <p className="text-xs text-slate-500">Tracking calorie and protein compliance over time</p>
            </div>
            <Link
              href="/diary"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>Open Food Diary</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="calories"
                    stroke="#f97316"
                    strokeWidth={2}
                    name="Calories (kcal)"
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="protein"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Protein (g)"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
