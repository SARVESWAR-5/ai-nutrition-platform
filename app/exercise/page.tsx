"use client";

import * as React from "react";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  exerciseService,
  ExerciseSession,
  ExerciseType,
} from "@/lib/services/exercise-service";
import { getLocalTodayDateString } from "@/lib/date/date-service";
import { Dumbbell, Plus, Flame, Clock, Trash2, Info } from "lucide-react";

export default function ExerciseTrackerPage() {
  const [selectedDate, setSelectedDate] = React.useState<string>(getLocalTodayDateString());
  const [sessions, setSessions] = React.useState<ExerciseSession[]>([]);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<ExerciseType>("strength_training");
  const [duration, setDuration] = React.useState<number | "">("");
  const [steps, setSteps] = React.useState<number | "">("");
  const [notes, setNotes] = React.useState("");

  const loadSessions = React.useCallback(() => {
    setSessions([...exerciseService.getSessionsForDate(selectedDate)]);
  }, [selectedDate]);

  React.useEffect(() => {
    loadSessions();
    const handleAuth = () => loadSessions();
    window.addEventListener("sarveswar-auth-changed", handleAuth);
    return () => window.removeEventListener("sarveswar-auth-changed", handleAuth);
  }, [loadSessions]);

  const handleLogExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const durNum = typeof duration === "number" ? duration : Number(duration) || 0;
    const stepNum = typeof steps === "number" ? steps : Number(steps) || 0;
    exerciseService.logSession({
      sessionDate: selectedDate,
      exerciseName: name,
      activityType: type,
      durationMinutes: durNum > 0 ? durNum : 30,
      steps: stepNum > 0 ? stepNum : undefined,
      notes: notes.trim() ? notes : undefined,
    });
    loadSessions();
    setName("");
    setDuration("");
    setSteps("");
    setNotes("");
  };

  const handleDelete = (id: string) => {
    exerciseService.deleteSession(id);
    loadSessions();
  };

  const summary = React.useMemo(() => {
    const totalMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const totalCalories = sessions.reduce((acc, s) => acc + s.estimatedCaloriesBurned, 0);
    const totalSteps = sessions.reduce((acc, s) => acc + (s.steps || 0), 0);
    return {
      sessionCount: sessions.length,
      totalMinutes,
      totalCalories,
      totalSteps,
    };
  }, [sessions]);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navigation />

      <main className="flex-1 max-w-4xl mx-auto p-4 md:p-8 pb-24 md:pb-8">
        <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-semibold mb-1">
              <Dumbbell className="w-4 h-4" />
              <span>Exercise & Fitness Tracker</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
              Workouts & Activity Logging
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Strength training, gym sets, and daily steps.
            </p>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold"
          />
        </header>

        {/* Operating policy notice: no double-counting with Mifflin-St Jeor PAL */}
        <div className="mb-6 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Calculation Rule:</strong> Exercise calories are MET estimates and are not automatically added to your food allowance to avoid double-counting activity already accounted for in your Mifflin-St Jeor TDEE multiplier.
          </span>
        </div>

        {/* Daily Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Active Time</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{summary.totalMinutes}</span>
            <span className="text-xs text-slate-500 ml-1">mins</span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Estimated Burn</span>
            <span className="text-2xl font-black text-orange-600 dark:text-orange-400">~{summary.totalCalories}</span>
            <span className="text-xs text-slate-500 ml-1">kcal</span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Daily Steps</span>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{summary.totalSteps}</span>
            <span className="text-xs text-slate-500 ml-1">steps</span>
          </div>
        </div>

        {/* Log Workout Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Record a Workout Session</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogExercise} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Session Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Activity Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ExerciseType)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                >
                  <option value="strength_training">Strength Training (Gym)</option>
                  <option value="walking">Walking</option>
                  <option value="running">Running / Jogging</option>
                  <option value="cycling">Cycling</option>
                  <option value="swimming">Swimming</option>
                  <option value="cardio">Cardio / Circuit</option>
                  <option value="sports">Sports / Badminton</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value === "" ? "" : Number(e.target.value))}
                  min={5}
                  max={300}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Steps (Optional)</label>
                <input
                  type="number"
                  value={steps}
                  onChange={(e) => setSteps(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>

              <div className="flex items-end">
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span>Log Workout</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Sessions list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workouts Recorded for this Date ({sessions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 italic">No exercise logged for this date.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {sessions.map((session) => (
                  <div key={session.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">{session.exerciseName}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                          {session.activityType.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {session.durationMinutes} mins
                        </span>
                        {session.steps && <span>• {session.steps} steps</span>}
                        {session.notes && <span>• {session.notes}</span>}
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-3">
                      <div className="text-right">
                        <span className="text-xs font-bold text-orange-600 dark:text-orange-400 block">
                          ~{session.estimatedCaloriesBurned} kcal
                        </span>
                        <span className="text-[10px] text-slate-400 block">Estimated (MET)</span>
                      </div>

                      <button
                        onClick={() => handleDelete(session.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500"
                        title="Delete workout"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
