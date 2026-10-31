"use client";

import * as React from "react";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { diaryService, FoodLogItem, MealCategory } from "@/lib/services/diary-service";
import { DEFAULT_NUTRITION_TARGETS, NutritionGoals } from "@/lib/services/goal-service";
import { preferencesService, formatTime12h, UserPreferences, DEFAULT_USER_PREFERENCES } from "@/lib/services/preferences-service";
import { authService } from "@/lib/services/auth-service";
import { getLocalTodayDateString } from "@/lib/date/date-service";
import { waterService } from "@/lib/services/water-service";
import {
  BookOpen,
  PlusCircle,
  Trash2,
  Copy,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  RotateCcw,
  FileText,
  AlertCircle,
  Settings2,
} from "lucide-react";

const CATEGORIES: { key: MealCategory; label: string; timeHint: string }[] = [
  { key: "early_morning", label: "Early Morning", timeHint: "6:00 AM - 7:30 AM" },
  { key: "breakfast", label: "Breakfast", timeHint: "8:00 AM - 9:30 AM" },
  { key: "mid_morning_snack", label: "Mid-Morning Snack", timeHint: "10:30 AM - 11:30 AM" },
  { key: "lunch", label: "Lunch", timeHint: "12:30 PM - 2:00 PM" },
  { key: "evening_snack", label: "Evening Snack", timeHint: "4:30 PM - 5:30 PM" },
  { key: "pre_workout", label: "Pre-Workout", timeHint: "30-45 mins before gym" },
  { key: "post_workout", label: "Post-Workout", timeHint: "Within 60 mins after gym" },
  { key: "dinner", label: "Dinner", timeHint: "Preferred cutoff: 7:00 PM IST" },
  { key: "other", label: "Other / Snacks", timeHint: "Anytime" },
];

export default function DiaryPage() {
  const [selectedDate, setSelectedDate] = React.useState<string>(getLocalTodayDateString());
  const [entries, setEntries] = React.useState<FoodLogItem[]>([]);
  const [targets, setTargets] = React.useState<NutritionGoals>(DEFAULT_NUTRITION_TARGETS);
  const [actionNotice, setActionNotice] = React.useState<string | null>(null);
  const [preferences, setPreferences] = React.useState<UserPreferences>(DEFAULT_USER_PREFERENCES);

  const loadEntries = React.useCallback(() => {
    const data = diaryService.getEntriesForDate(selectedDate);
    setEntries([...data]);
    setPreferences(preferencesService.getPreferences());

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
      }
    }
  }, [selectedDate]);

  React.useEffect(() => {
    loadEntries();

    const handleUpdate = () => loadEntries();
    const handlePrefsUpdate = () => {
      setPreferences(preferencesService.getPreferences());
    };
    const handleAuth = () => {
      loadEntries();
    };

    window.addEventListener("sarveswar-diary-updated", handleUpdate);
    window.addEventListener("sarveswar-targets-updated", handleUpdate);
    window.addEventListener("sarveswar-preferences-updated", handlePrefsUpdate);
    window.addEventListener("sarveswar-auth-changed", handleAuth);

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
          loadEntries();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("sarveswar-diary-updated", handleUpdate);
      window.removeEventListener("sarveswar-targets-updated", handleUpdate);
      window.removeEventListener("sarveswar-preferences-updated", handlePrefsUpdate);
      window.removeEventListener("sarveswar-auth-changed", handleAuth);
      clearInterval(midnightInterval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadEntries, selectedDate]);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleDelete = (id: string) => {
    diaryService.deleteEntry(id);
    loadEntries();
    showNotice("Item deleted and daily totals recalculated.");
  };

  const handleDuplicate = (id: string) => {
    diaryService.duplicateEntry(id);
    loadEntries();
    showNotice("Item duplicated to today's log.");
  };

  const handleMove = (id: string, newCat: MealCategory) => {
    diaryService.moveEntryCategory(id, newCat);
    loadEntries();
    showNotice(`Item moved to ${newCat.replace("_", " ")}.`);
  };

  const handleResetDay = () => {
    if (confirm("Reset all logged meals for this date back to 0?")) {
      diaryService.clearDate(selectedDate);
      loadEntries();
      showNotice("Date reset to 0g across all nutrients.");
    }
  };

  const shiftDate = (offset: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  // Compute day totals directly from current entries
  const dayTotals = React.useMemo(() => {
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, water: 0 };
    for (const item of entries) {
      totals.calories += item.calories;
      totals.protein = Math.round((totals.protein + item.proteinG) * 10) / 10;
      totals.carbs = Math.round((totals.carbs + item.carbsG) * 10) / 10;
      totals.fat = Math.round((totals.fat + item.fatG) * 10) / 10;
      totals.fibre = Math.round((totals.fibre + item.fibreG) * 10) / 10;
    }
    totals.water = waterService.getTotalWaterForDate(selectedDate);
    return totals;
  }, [entries, selectedDate]);

  const remaining = React.useMemo(() => {
    const waterTarget = targets.waterMl || 3000;
    return {
      calories: Math.max(0, targets.calories - dayTotals.calories),
      protein: Math.max(0, Math.round((targets.protein - dayTotals.protein) * 10) / 10),
      carbs: Math.max(0, Math.round((targets.carbs - dayTotals.carbs) * 10) / 10),
      fat: Math.max(0, Math.round((targets.fat - dayTotals.fat) * 10) / 10),
      fibre: Math.max(0, Math.round((targets.fibre - dayTotals.fibre) * 10) / 10),
      water: Math.max(0, waterTarget - dayTotals.water),
    };
  }, [targets, dayTotals]);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navigation />

      <main className="flex-1 max-w-5xl mx-auto p-4 md:p-8 pb-24 md:pb-8">
        {/* Header & Date Controls */}
        <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-semibold mb-1">
              <BookOpen className="w-4 h-4" />
              <span>Food Diary Timeline</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
              Daily Nutrition Diary
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Entries calculate consumed nutrients and subtract from your daily target.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/reports?type=today`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition-colors"
              title="Generate End-of-Day Nutrition Report"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>End-of-Day Report</span>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDay}
              className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 hover:text-red-600"
              title="Reset all food logs for this date to 0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to 0</span>
            </Button>

            <Link
              href="/add-food"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Food</span>
            </Link>

            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <button
                onClick={() => shiftDate(-1)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2 py-0.5 text-xs font-semibold text-slate-900 dark:text-white bg-transparent border-none focus:outline-none"
              />
              <button
                onClick={() => shiftDate(1)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {actionNotice && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            {actionNotice}
          </div>
        )}

        {/* Daily Summary Banner (Consumed + Remaining) */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
          <div>
            <span className="text-[11px] uppercase font-bold text-slate-500 block">Calories</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{dayTotals.calories}</span>
              <span className="text-xs text-slate-500">/ {targets.calories} kcal</span>
            </div>
            <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 block mt-0.5">
              {remaining.calories} kcal remaining
            </span>
          </div>

          <div>
            <span className="text-[11px] uppercase font-bold text-slate-500 block">Protein</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{dayTotals.protein}</span>
              <span className="text-xs text-slate-500">/ {targets.protein}g</span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block mt-0.5">
              {remaining.protein}g remaining
            </span>
          </div>

          <div>
            <span className="text-[11px] uppercase font-bold text-slate-500 block">Carbs</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{dayTotals.carbs}</span>
              <span className="text-xs text-slate-500">/ {targets.carbs}g</span>
            </div>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 block mt-0.5">
              {remaining.carbs}g remaining
            </span>
          </div>

          <div>
            <span className="text-[11px] uppercase font-bold text-slate-500 block">Fat</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{dayTotals.fat}</span>
              <span className="text-xs text-slate-500">/ {targets.fat}g</span>
            </div>
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 block mt-0.5">
              {remaining.fat}g remaining
            </span>
          </div>

          <div>
            <span className="text-[11px] uppercase font-bold text-slate-500 block">Fibre</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{dayTotals.fibre}</span>
              <span className="text-xs text-slate-500">/ {targets.fibre}g</span>
            </div>
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 block mt-0.5">
              {remaining.fibre}g remaining
            </span>
          </div>

          <div>
            <span className="text-[11px] uppercase font-bold text-slate-500 block">Water</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400">{dayTotals.water}</span>
              <span className="text-xs text-slate-500">/ {targets.waterMl || 3000} ml</span>
            </div>
            <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 block mt-0.5">
              {remaining.water} ml remaining
            </span>
          </div>
        </div>

        {entries.length === 0 && (
          <div className="mb-6 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No food logs recorded for this day yet.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Daily intake starts fresh at 0g across all nutrients. Click below to log your meals.
            </p>
            <Link
              href="/add-food"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Log a Meal Now</span>
            </Link>
          </div>
        )}

        {/* Chronological Meal Sections */}
        <div className="space-y-6">
          {CATEGORIES.map((cat) => {
            const catItems = entries.filter((e) => e.mealCategory === cat.key);
            const catCals = catItems.reduce((acc, i) => acc + i.calories, 0);
            const catProtein = Math.round(catItems.reduce((acc, i) => acc + i.proteinG, 0) * 10) / 10;
            const configuredCutoff = preferences.cutoffs[cat.key] || "21:30";

            return (
              <Card key={cat.key} className={catItems.length > 0 ? "border-slate-300 dark:border-slate-700" : "opacity-90"}>
                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{cat.label}</span>
                    <span className="text-[11px] font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                      Preferred Cutoff: {formatTime12h(configuredCutoff)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {catItems.length > 0 && (
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {catCals} kcal • {catProtein}g P
                      </span>
                    )}
                    <Link
                      href="/add-food"
                      className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      title={`Add to ${cat.label}`}
                    >
                      <PlusCircle className="w-4 h-4" />
                    </Link>
                  </div>
                </CardHeader>

                <CardContent className="p-4">
                  {catItems.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">No foods logged in this category yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {catItems.map((item) => {
                        const compliance = preferencesService.checkCutoffCompliance(cat.key, item.consumedAt);

                        return (
                          <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-slate-900 dark:text-white">
                                  {item.foodName}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    item.confidenceLabel === "verified"
                                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                                      : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                                  }`}
                                >
                                  {item.confidenceLabel}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {item.quantity} {item.unit} • {item.preparationMethod} ({item.isCooked ? "Cooked" : "Raw"})
                              </div>

                              {/* Preferred Cutoff Compliance Flag */}
                              <div className="mt-1">
                                {compliance.isPastCutoff ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                    <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span>
                                      Logged at {compliance.consumedTime12} ({compliance.minutesLate}m past your {compliance.cutoffTime12} cutoff)
                                    </span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                    <Clock className="w-3 h-3 text-emerald-500 shrink-0" />
                                    <span>Logged at {compliance.consumedTime12} (On time • before {compliance.cutoffTime12})</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs">
                              <div className="text-right sm:text-left font-medium text-slate-700 dark:text-slate-300">
                                <strong className="text-slate-900 dark:text-white">{item.calories}</strong> kcal •{" "}
                                <span className="text-emerald-600 font-semibold">{item.proteinG}g P</span> •{" "}
                                <span className="text-blue-600 font-semibold">{item.carbsG}g C</span> •{" "}
                                <span className="text-amber-600 font-semibold">{item.fatG}g F</span> •{" "}
                                <span className="text-purple-600 font-semibold">{item.fibreG}g Fib</span>
                              </div>

                              {/* Row Actions */}
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDuplicate(item.id)}
                                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                                  title="Duplicate this food item"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded"
                                  title="Delete food item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
