"use client";

import * as React from "react";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { goalService, GoalRevision, DEFAULT_NUTRITION_TARGETS } from "@/lib/services/goal-service";
import { getLocalTodayDateString } from "@/lib/date/date-service";
import { History, ShieldAlert, ArrowRight, Target, PlusCircle, CheckCircle2, Calendar } from "lucide-react";

export default function GoalsPage() {
  const [revisions, setRevisions] = React.useState<GoalRevision[]>([]);
  const [showForm, setShowForm] = React.useState(false);
  const [savedNotice, setSavedNotice] = React.useState<string | null>(null);

  // Form State
  const [effectiveFrom, setEffectiveFrom] = React.useState(getLocalTodayDateString());
  const [goalType, setGoalType] = React.useState<"maintenance" | "bulking" | "cutting" | "recomposition">("recomposition");
  const [reason, setReason] = React.useState("Scheduled phase transition");
  const [calories, setCalories] = React.useState(2400);
  const [protein, setProtein] = React.useState(150);
  const [carbs, setCarbs] = React.useState(290);
  const [fat, setFat] = React.useState(70);
  const [fibre, setFibre] = React.useState(35);
  const [waterMl, setWaterMl] = React.useState(3000);

  const loadData = React.useCallback(() => {
    setRevisions(goalService.getAllRevisions());
  }, []);

  React.useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener("sarveswar-targets-updated", handleUpdate);
    return () => window.removeEventListener("sarveswar-targets-updated", handleUpdate);
  }, [loadData]);

  const handleApplyPreset = (type: "maintenance" | "bulking" | "cutting" | "recomposition") => {
    setGoalType(type);
    if (type === "cutting") {
      setCalories(1900);
      setProtein(165);
      setCarbs(175);
      setFat(55);
      setFibre(35);
      setReason("Cutting Phase: -500 kcal deficit, high protein to preserve muscle");
    } else if (type === "bulking") {
      setCalories(2800);
      setProtein(150);
      setCarbs(370);
      setFat(80);
      setFibre(35);
      setReason("Bulking Phase: +400 kcal lean surplus to build muscle");
    } else if (type === "maintenance") {
      setCalories(2400);
      setProtein(135);
      setCarbs(300);
      setFat(75);
      setFibre(35);
      setReason("Maintenance Phase: 0 kcal delta, stable body weight");
    } else {
      setCalories(2400);
      setProtein(150);
      setCarbs(290);
      setFat(70);
      setFibre(35);
      setReason("Body Recomposition: High protein, moderate energy");
    }
  };

  const handleSaveRevision = (e: React.FormEvent) => {
    e.preventDefault();
    goalService.addGoalRevision({
      effectiveFrom,
      goalType,
      reason,
      targets: {
        calories,
        protein,
        carbs,
        fat,
        fibre,
        waterMl,
      },
    });

    setSavedNotice(`New goal scheduled effective from ${effectiveFrom}! Historical food logs prior to this date remain unchanged.`);
    setTimeout(() => setSavedNotice(null), 5000);
    setShowForm(false);
    loadData();
  };

  const activeGoal = revisions[0]?.targets || DEFAULT_NUTRITION_TARGETS;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navigation />

      <main className="flex-1 max-w-5xl mx-auto p-4 md:p-8 pb-24 md:pb-8">
        <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-semibold mb-1">
              <Target className="w-4 h-4" />
              <span>Nutrition Targets &amp; Historical Accuracy</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
              Goals &amp; Historical Revisions
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Feature 09: Goals have effective dates. Changing goals never recalculates or overwrites past days.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowForm(!showForm)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{showForm ? "Close Form" : "Schedule New Goal Revision"}</span>
            </Button>
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition-colors"
            >
              <span>Multi-Goal Calculator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {savedNotice && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{savedNotice}</span>
          </div>
        )}

        {/* Feature 09: New Goal Revision Form */}
        {showForm && (
          <Card className="mb-8 border-emerald-300 dark:border-emerald-800 shadow-md animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Apply New Goal with Effective Date (Feature 09)</span>
              </CardTitle>
              <p className="text-xs text-slate-500">
                Choose an effective date (e.g. today or next month). Past historical logs retain their old goals.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveRevision} className="space-y-4">
                {/* Objective Presets */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Quick Objective:</span>
                  {(["maintenance", "bulking", "cutting", "recomposition"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleApplyPreset(t)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-colors ${
                        goalType === t
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Effective Date (Starting From) *
                    </label>
                    <input
                      type="date"
                      value={effectiveFrom}
                      onChange={(e) => setEffectiveFrom(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Reason / Phase Description *
                    </label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Started winter bulk, or switched to aggressive cut..."
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500">Calories (kcal)</label>
                    <input
                      type="number"
                      value={calories}
                      onChange={(e) => setCalories(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500">Protein (g)</label>
                    <input
                      type="number"
                      value={protein}
                      onChange={(e) => setProtein(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500">Carbs (g)</label>
                    <input
                      type="number"
                      value={carbs}
                      onChange={(e) => setCarbs(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500">Fat (g)</label>
                    <input
                      type="number"
                      value={fat}
                      onChange={(e) => setFat(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500">Fibre (g)</label>
                    <input
                      type="number"
                      value={fibre}
                      onChange={(e) => setFibre(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500">Water (ml)</label>
                    <input
                      type="number"
                      value={waterMl}
                      onChange={(e) => setWaterMl(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                    Save Goal Revision
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Current Active Goals Summary */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 uppercase font-semibold">Calories</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {activeGoal.calories}
            </p>
            <span className="text-[11px] text-slate-500">kcal/day</span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 uppercase font-semibold">Protein</span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {activeGoal.protein}g
            </p>
            <span className="text-[11px] text-slate-500">Preserve muscle</span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 uppercase font-semibold">Carbs</span>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {activeGoal.carbs}g
            </p>
            <span className="text-[11px] text-slate-500">Fuel for gym</span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 uppercase font-semibold">Fat</span>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {activeGoal.fat}g
            </p>
            <span className="text-[11px] text-slate-500">Hormonal health</span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 uppercase font-semibold">Fibre</span>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
              {activeGoal.fibre}g
            </p>
            <span className="text-[11px] text-slate-500">Gut health</span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 uppercase font-semibold">Water</span>
            <p className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
              {activeGoal.waterMl}
            </p>
            <span className="text-[11px] text-slate-500">ml/day</span>
          </div>
        </div>

        {/* Feature 09: Immutable Audit Timeline */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-slate-500" />
              <CardTitle>Goal Revision Timeline ({revisions.length} Revisions Recorded)</CardTitle>
            </div>
            <p className="text-xs text-slate-500">
              Each revision is indexed by its effective date. Historical diaries always display the exact target that was active during that specific timeframe.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revisions.map((h) => (
                <div
                  key={h.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 uppercase">
                        {h.goalType}
                      </span>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        Effective From: {h.effectiveFrom}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">Created: {h.createdAt.substring(0, 10)}</span>
                  </div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-3">{h.reason}</p>
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                    <span>Calories: <strong className="text-slate-900 dark:text-white">{h.targets.calories} kcal</strong></span>
                    <span>Protein: <strong className="text-emerald-600">{h.targets.protein}g</strong></span>
                    <span>Carbs: <strong className="text-blue-600">{h.targets.carbs}g</strong></span>
                    <span>Fat: <strong className="text-amber-600">{h.targets.fat}g</strong></span>
                    <span>Fibre: <strong className="text-purple-600">{h.targets.fibre}g</strong></span>
                    <span>Water: <strong className="text-cyan-600">{h.targets.waterMl}ml</strong></span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Feature 09 Guarantee:</strong> Past food logs take snapshots of confirmed nutrient values. Updating your targets today will not recalculate or alter yesterday&apos;s confirmed dietary intake.
              </span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
