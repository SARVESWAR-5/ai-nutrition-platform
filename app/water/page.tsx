"use client";

import * as React from "react";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { waterService, WaterLogRecord } from "@/lib/services/water-service";
import { getLocalTodayDateString } from "@/lib/date/date-service";
import { Droplet, Plus, Trash2, CheckCircle2 } from "lucide-react";

export default function WaterTrackerPage() {
  const [selectedDate, setSelectedDate] = React.useState<string>(getLocalTodayDateString());
  const [logs, setLogs] = React.useState<WaterLogRecord[]>([]);
  const [customMl, setCustomMl] = React.useState<string>("250");

  const loadLogs = React.useCallback(() => {
    setLogs([...waterService.getWaterLogsForDate(selectedDate)]);
  }, [selectedDate]);

  React.useEffect(() => {
    loadLogs();
    const handleAuth = () => loadLogs();
    window.addEventListener("sarveswar-auth-changed", handleAuth);
    return () => window.removeEventListener("sarveswar-auth-changed", handleAuth);
  }, [loadLogs]);

  const handleQuickAdd = (ml: number) => {
    waterService.logWater(selectedDate, ml);
    loadLogs();
  };

  const handleCustomAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const ml = parseInt(customMl, 10);
    if (ml > 0) {
      waterService.logWater(selectedDate, ml);
      loadLogs();
      setCustomMl("250");
    }
  };

  const handleDelete = (id: string) => {
    waterService.deleteWaterLog(id);
    loadLogs();
  };

  const progress = React.useMemo(() => {
    const consumed = logs.reduce((acc, l) => acc + l.amountMl, 0);
    const target = 3000;
    const remaining = Math.max(0, target - consumed);
    const excess = Math.max(0, consumed - target);
    const percent = target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0;
    return { target, consumed, remaining, excess, percentComplete: percent };
  }, [logs]);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navigation />

      <main className="flex-1 max-w-4xl mx-auto p-4 md:p-8 pb-24 md:pb-8">
        <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 text-sm font-semibold mb-1">
              <Droplet className="w-4 h-4" />
              <span>Hydration Tracker</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
              Daily Water Intake
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Plain water is logged separately from beverages to prevent double-counting.
            </p>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold"
          />
        </header>

        {/* Progress Card */}
        <Card className="mb-6 border-cyan-200 dark:border-cyan-900 bg-gradient-to-br from-cyan-50/50 to-transparent dark:from-cyan-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <span className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-300">Intake Progress</span>
              <CardTitle className="text-2xl mt-1">
                {progress.consumed} / {progress.target} ml
              </CardTitle>
            </div>
            <span className="text-3xl font-black text-cyan-600 dark:text-cyan-400">
              {progress.percentComplete}%
            </span>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden mt-2">
              <div
                className="bg-cyan-500 h-full rounded-full transition-all"
                style={{ width: `${progress.percentComplete}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {progress.remaining > 0 ? `${progress.remaining} ml remaining to hit target.` : "Daily water goal reached!"}
            </p>
          </CardContent>
        </Card>

        {/* Quick Add Presets */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Quick Add Water</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[150, 250, 330, 500].map((ml) => (
                <button
                  key={ml}
                  onClick={() => handleQuickAdd(ml)}
                  className="p-3 rounded-xl border border-cyan-200 dark:border-cyan-800 bg-cyan-50/40 hover:bg-cyan-100/60 dark:bg-cyan-950/30 dark:hover:bg-cyan-900/40 text-cyan-900 dark:text-cyan-200 font-bold text-center transition-colors"
                >
                  <span className="text-lg block">+{ml} ml</span>
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 block font-normal">
                    {ml === 150 ? "Small glass" : ml === 250 ? "Standard cup" : ml === 330 ? "Can/Mug" : "Bottle"}
                  </span>
                </button>
              ))}
            </div>

            <form onSubmit={handleCustomAdd} className="flex items-center gap-3 pt-2">
              <input
                type="number"
                value={customMl}
                onChange={(e) => setCustomMl(e.target.value)}
                placeholder="Custom ml"
                className="w-32 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold"
                min={50}
                max={5000}
              />
              <Button type="submit" size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                <span>Add Custom Amount</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* History of logs today */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logged Water Entries ({logs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 italic">No water logged for this date.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Droplet className="w-4 h-4 text-cyan-500" />
                      <span className="font-semibold text-slate-900 dark:text-white">+{log.amountMl} ml</span>
                      <span className="text-xs text-slate-400">
                        {log.loggedAt.includes("T") ? log.loggedAt.substring(11, 16) : ""} IST
                      </span>
                    </div>

                    <button
                      onClick={() => handleDelete(log.id)}
                      className="p-1 text-slate-400 hover:text-red-500"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
