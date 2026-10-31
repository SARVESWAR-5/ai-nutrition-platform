"use client";

import * as React from "react";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { weightService, WeightMeasurement } from "@/lib/services/weight-service";
import { getLocalTodayDateString } from "@/lib/date/date-service";
import { Scale, Plus, TrendingDown, Target, Info } from "lucide-react";

export default function WeightTrackerPage() {
  const [measurements, setMeasurements] = React.useState<WeightMeasurement[]>([]);
  const [weight, setWeight] = React.useState<string>("");
  const [waist, setWaist] = React.useState<string>("");
  const [bodyFat, setBodyFat] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");
  const [date, setDate] = React.useState<string>(getLocalTodayDateString());

  const loadData = React.useCallback(() => {
    const list = weightService.getAllMeasurements();
    setMeasurements([...list]);
  }, []);

  React.useEffect(() => {
    loadData();
    const handleAuth = () => loadData();
    const handleWeight = () => loadData();
    window.addEventListener("sarveswar-auth-changed", handleAuth);
    window.addEventListener("sarveswar-weight-updated", handleWeight);
    return () => {
      window.removeEventListener("sarveswar-auth-changed", handleAuth);
      window.removeEventListener("sarveswar-weight-updated", handleWeight);
    };
  }, [loadData]);

  const handleLogWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const wNum = parseFloat(weight);
    if (wNum > 0) {
      weightService.logMeasurement({
        measuredDate: date,
        weightKg: wNum,
        waistCm: waist ? parseFloat(waist) : undefined,
        bodyFatPct: bodyFat ? parseFloat(bodyFat) : undefined,
        notes: notes.trim() ? notes : undefined,
      });
      loadData();
      setNotes("");
    }
  };

  const stats = React.useMemo(() => {
    return weightService.getProgressStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measurements]);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navigation />

      <main className="flex-1 max-w-4xl mx-auto p-4 md:p-8 pb-24 md:pb-8">
        <header className="mb-6">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-semibold mb-1">
            <Scale className="w-4 h-4" />
            <span>Body Composition & Progress</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
            Weight & Measurement History
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Track body weight, waist circumference, and reference BMI trends.
          </p>
        </header>

        {/* Operating policy notice: never attribute weight changes without clinical evidence */}
        <div className="mb-6 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Health Integrity Notice:</strong> Daily weight fluctuations are predominantly water retention and digestive mass. BMI is presented as a general reference measure, not an exact diagnostic assessment of lean muscle mass.
          </span>
        </div>

        {/* Top Progress Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Weight</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.currentWeight !== null ? stats.currentWeight : "—"}
            </span>
            {stats.currentWeight !== null && <span className="text-xs text-slate-500 ml-1">kg</span>}
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Target Weight</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.targetWeight !== null ? stats.targetWeight : "—"}
            </span>
            {stats.targetWeight !== null && <span className="text-xs text-slate-500 ml-1">kg</span>}
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">7-Day Moving Avg</span>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {stats.movingAverageKg !== null ? stats.movingAverageKg : "—"}
            </span>
            {stats.movingAverageKg !== null && <span className="text-xs text-slate-500 ml-1">kg</span>}
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Reference BMI</span>
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {stats.bmi !== null ? stats.bmi : "—"}
            </span>
            <span className="text-[10px] text-slate-400 block">
              {stats.bmi !== null ? "Normal range" : "Awaiting first log"}
            </span>
          </div>
        </div>

        {/* Log Measurement Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Record New Measurement</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogWeight} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Waist (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={waist}
                  onChange={(e) => setWaist(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Body Fat (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>

              <div className="md:col-span-3">
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>

              <div className="flex items-end">
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span>Save Record</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* History table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Measurement History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-100 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Weight</th>
                    <th className="px-4 py-3">Waist</th>
                    <th className="px-4 py-3">Body Fat</th>
                    <th className="px-4 py-3">BMI</th>
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {measurements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        No weight measurements recorded yet for this account. Record your first measurement above to start tracking!
                      </td>
                    </tr>
                  ) : (
                    measurements.map((m) => {
                      const { bmi } = weightService.calculateBmi(m.weightKg);
                      return (
                        <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{m.measuredDate}</td>
                          <td className="px-4 py-3 font-bold text-emerald-600">{m.weightKg} kg</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{m.waistCm ? `${m.waistCm} cm` : "—"}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{m.bodyFatPct ? `${m.bodyFatPct}%` : "—"}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{bmi}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{m.notes || "—"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
