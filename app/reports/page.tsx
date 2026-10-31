"use client";

import * as React from "react";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  progressAnalysisService,
  ProgressReport,
} from "@/lib/services/analytics-service";
import { exportService } from "@/lib/services/export-service";
import {
  FileText,
  Download,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Lightbulb,
} from "lucide-react";

export default function ReportsPage() {
  const [report, setReport] = React.useState<ProgressReport | null>(null);
  const [reportType, setReportType] = React.useState<"today" | "7_days" | "30_days">("today");
  const [isGenerating, setIsGenerating] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const requested = params.get("type");
      if (requested === "7_days" || requested === "30_days" || requested === "today") {
        setReportType(requested);
      }
    }
  }, []);

  const loadReport = React.useCallback(async () => {
    setIsGenerating(true);
    try {
      const res = await progressAnalysisService.generateReport(reportType);
      setReport(res);
    } finally {
      setIsGenerating(false);
    }
  }, [reportType]);

  React.useEffect(() => {
    loadReport();
    const handleAuth = () => loadReport();
    window.addEventListener("sarveswar-auth-changed", handleAuth);
    return () => window.removeEventListener("sarveswar-auth-changed", handleAuth);
  }, [loadReport]);

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navigation />

      <main className="flex-1 max-w-5xl mx-auto p-4 md:p-8 pb-24 md:pb-8">
        <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-semibold mb-1">
              <FileText className="w-4 h-4" />
              <span>Nutrition Reports & Data Export</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
              End-of-Day & Progress Reports
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Evidence-based daily and periodic nutrition analysis and full data sovereignty via CSV downloads.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setReportType("today")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                reportType === "today" ? "bg-purple-600 text-white" : "text-slate-600 dark:text-slate-400"
              }`}
            >
              End-of-Day Report
            </button>
            <button
              onClick={() => setReportType("7_days")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                reportType === "7_days" ? "bg-purple-600 text-white" : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Weekly Report
            </button>
            <button
              onClick={() => setReportType("30_days")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                reportType === "30_days" ? "bg-purple-600 text-white" : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Monthly Report
            </button>
          </div>
        </header>

        {/* CSV Data Export Panel */}
        <Card className="mb-8 border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-xs uppercase">
              <Download className="w-4 h-4" />
              <span>Data Export & Backup</span>
            </div>
            <CardTitle className="text-base">Export Your Records (CSV Format)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              Download your complete unmanipulated health records anytime for external backup, doctor review, or spreadsheet analysis.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadFile("food_logs.csv", exportService.generateFoodLogsCsv())}
                className="flex items-center justify-center gap-2 text-xs"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Food Logs CSV</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadFile("daily_totals.csv", exportService.generateDailyTotalsCsv())}
                className="flex items-center justify-center gap-2 text-xs"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Daily Totals CSV</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadFile("exercise_sessions.csv", exportService.generateExerciseCsv())}
                className="flex items-center justify-center gap-2 text-xs"
              >
                <Download className="w-3.5 h-3.5 text-orange-600" />
                <span>Workouts CSV</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadFile("weight_measurements.csv", exportService.generateWeightCsv())}
                className="flex items-center justify-center gap-2 text-xs"
              >
                <Download className="w-3.5 h-3.5 text-purple-600" />
                <span>Weight & Body CSV</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Progress Report */}
        {report && (
          <div className="space-y-6">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs font-semibold uppercase">
                  <Sparkles className="w-4 h-4" />
                  <span>{report.periodDescription}</span>
                </div>
                <CardTitle className="text-xl mt-1">{report.title}</CardTitle>
                <p className="text-xs text-slate-500">
                  Synthesized from confirmed database records in Asia/Kolkata.
                </p>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* 1. Executive Summary */}
                <div>
                  <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">1. Executive Summary</h3>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    {report.summary}
                  </p>
                </div>

                {/* 2. Successful Habits & Areas to Improve */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/10">
                    <h4 className="text-xs font-bold uppercase text-emerald-800 dark:text-emerald-300 mb-3 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Successful Habits</span>
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                      {report.successfulHabits.map((h, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/10">
                    <h4 className="text-xs font-bold uppercase text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Areas for Improvement</span>
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                      {report.areasForImprovement.map((a, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-600 font-bold">•</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 3. Data-Supported Trends */}
                <div>
                  <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">3. Data-Supported Trends</h3>
                  <div className="space-y-1.5">
                    {report.supportedTrends.map((t, i) => (
                      <p key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                        <span className="text-blue-500">→</span>
                        <span>{t}</span>
                      </p>
                    ))}
                  </div>
                </div>

                {/* 4. Recommendations for Next Period */}
                <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/30 dark:bg-purple-950/10">
                  <h4 className="text-xs font-bold uppercase text-purple-900 dark:text-purple-300 mb-2 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-purple-600" />
                    <span>Next Period Recommendations</span>
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    {report.nextPeriodRecommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-purple-600 font-bold">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 5. Uncertainty & Missing Records Notes */}
                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
                  <div className="font-semibold flex items-center gap-1 text-slate-600 dark:text-slate-400">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Uncertainty & Incomplete Day Disclaimers:</span>
                  </div>
                  {report.uncertaintyNotes.map((u, i) => (
                    <p key={i}>• {u}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
