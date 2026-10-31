"use client";

import * as React from "react";
import { Navigation } from "@/components/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  progressAnalysisService,
  DateFilterRange,
  AnalyticsSummary,
} from "@/lib/services/analytics-service";
import { diaryService, FoodLogItem } from "@/lib/services/diary-service";
import { goalService } from "@/lib/services/goal-service";
import { UserNutritionGoals } from "@/lib/services/types";
import { getLocalTodayDateString } from "@/lib/date/date-service";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { LineChart as ChartIcon, Calendar, CheckCircle2, AlertCircle, Clock, BookOpen } from "lucide-react";

export default function AnalyticsPage() {
  const [range, setRange] = React.useState<DateFilterRange>("7_days");
  const [summary, setSummary] = React.useState<AnalyticsSummary | null>(null);

  // Feature 10: Historical Date & Month Explorer
  const [historyDate, setHistoryDate] = React.useState<string>(getLocalTodayDateString());
  const [historicalEntries, setHistoricalEntries] = React.useState<FoodLogItem[]>([]);
  const [historicalTotals, setHistoricalTotals] = React.useState({ calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 });
  const [historicalGoal, setHistoricalGoal] = React.useState<UserNutritionGoals>(goalService.getGoalForDate(getLocalTodayDateString()));

  React.useEffect(() => {
    const load = () => {
      const res = progressAnalysisService.getAnalyticsSummary(range);
      setSummary(res);
    };
    load();
    window.addEventListener("sarveswar-auth-changed", load);
    return () => window.removeEventListener("sarveswar-auth-changed", load);
  }, [range]);

  // Load exact entries and goals for selected historical date
  React.useEffect(() => {
    const loadHistory = () => {
      const entries = diaryService.getEntriesForDate(historyDate);
      const totals = diaryService.getDailyTotals(historyDate);
      const goal = goalService.getGoalForDate(historyDate);

      setHistoricalEntries(entries);
      setHistoricalTotals(totals);
      setHistoricalGoal(goal);
    };
    loadHistory();
    window.addEventListener("sarveswar-auth-changed", loadHistory);
    return () => window.removeEventListener("sarveswar-auth-changed", loadHistory);
  }, [historyDate]);

  const macroBarData = summary
    ? [
        { name: "Protein (g)", value: summary.averageProtein, target: 150 },
        { name: "Carbs (g)", value: summary.averageCarbs, target: 290 },
        { name: "Fat (g)", value: summary.averageFat, target: 70 },
        { name: "Fibre (g)", value: summary.averageFibre, target: 35 },
      ]
    : [];

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navigation />

      <main className="flex-1 max-w-5xl mx-auto p-4 md:p-8 pb-24 md:pb-8">
        <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-semibold mb-1">
              <ChartIcon className="w-4 h-4" />
              <span>Historical Analytics &amp; Complete Database</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
              Intake &amp; Consistency Trends
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Review daily nutrition compliance over selectable periods or inspect exact historical dates.
            </p>
          </div>

          {/* Date range filter buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs font-semibold">
            {(
              [
                { key: "today", label: "Today" },
                { key: "yesterday", label: "Yesterday" },
                { key: "7_days", label: "Last 7 Days" },
                { key: "30_days", label: "Last 30 Days" },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                onClick={() => setRange(f.key)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  range === f.key
                    ? "bg-emerald-600 text-white"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </header>

        {summary && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Avg Daily Calories</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">{summary.averageCalories}</span>
                <span className="text-xs text-slate-500 ml-1">kcal</span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Avg Protein</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{summary.averageProtein}g</span>
                <span className="text-[10px] text-slate-400 block">{summary.targetProteinHitPct}% target compliance</span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Avg Fibre</span>
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{summary.averageFibre}g</span>
                <span className="text-[10px] text-slate-400 block">Target: 35g</span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Avg Water</span>
                <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400">{summary.averageWaterMl}</span>
                <span className="text-xs text-slate-500 ml-1">ml/day</span>
              </div>
            </div>

            {/* Average Nutrients vs Targets */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-base">Average Daily Intake vs Target (Period Average)</CardTitle>
                <p className="text-xs text-slate-500">Unlogged days are not assumed to be zero</p>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={macroBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#10b981" name="Your Average" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="target" fill="#cbd5e1" name="Target" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Feature 10: Complete Historical Date Explorer & Applied Goals */}
            <Card className="mb-8 border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span>Historical Date Explorer &amp; Applied Goals (Feature 10)</span>
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    Select any past date to see exact foods consumed, review goals applied at that time, and compare daily totals.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-850 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Date:</span>
                  <input
                    type="date"
                    value={historyDate}
                    onChange={(e) => setHistoryDate(e.target.value)}
                    className="px-2 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Active Goals on that Date vs Consumed Totals */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Nutrition Totals vs. Applied Goals on {historyDate}:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500 block font-semibold">Calories</span>
                      <strong className="text-base font-black text-slate-900 dark:text-white">
                        {historicalTotals.calories}
                      </strong>
                      <span className="text-slate-400 block text-[11px]">/ {historicalGoal.calories} kcal</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500 block font-semibold">Protein</span>
                      <strong className="text-base font-black text-emerald-600">
                        {historicalTotals.protein}g
                      </strong>
                      <span className="text-slate-400 block text-[11px]">/ {historicalGoal.protein}g</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500 block font-semibold">Carbs</span>
                      <strong className="text-base font-black text-blue-600">
                        {historicalTotals.carbs}g
                      </strong>
                      <span className="text-slate-400 block text-[11px]">/ {historicalGoal.carbs}g</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500 block font-semibold">Fat</span>
                      <strong className="text-base font-black text-amber-600">
                        {historicalTotals.fat}g
                      </strong>
                      <span className="text-slate-400 block text-[11px]">/ {historicalGoal.fat}g</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 col-span-2 sm:col-span-1">
                      <span className="text-slate-500 block font-semibold">Fibre</span>
                      <strong className="text-base font-black text-purple-600">
                        {historicalTotals.fibre}g
                      </strong>
                      <span className="text-slate-400 block text-[11px]">/ {historicalGoal.fibre}g</span>
                    </div>
                  </div>
                </div>

                {/* Foods Consumed on that Date */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Exact Foods Consumed on {historyDate} ({historicalEntries.length})</span>
                  </h4>

                  {historicalEntries.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                      No food logs recorded on {historyDate}.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                      {historicalEntries.map((item) => (
                        <div key={item.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">{item.foodName}</span>
                            <span className="text-slate-400 ml-2">
                              ({item.quantity} {item.unit} • {item.mealCategory.replace("_", " ")})
                            </span>
                          </div>
                          <div className="font-semibold text-slate-600 dark:text-slate-400">
                            {item.calories} kcal • {item.proteinG}g Protein • {item.carbsG}g Carbs • {item.fatG}g Fat
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
