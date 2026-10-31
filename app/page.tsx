import Link from "next/link";
import { Utensils, Sparkles, Activity, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12 flex flex-col items-center text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-medium mb-6">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        Deterministic Engine + Google Gemini AI
      </div>

      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
        Personal AI Nutrition Platform
      </h1>

      <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mb-8">
        Precision nutrition and fitness analytics powered by deterministic calculations,
        USDA verified data, and Google Gemini AI natural-language understanding.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left my-8">
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 mb-4">
            <Utensils className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">Natural-Language Food Entry</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Log complex meals in one description. Ingredients, weights, and cooking oils are parsed and deterministically calculated.
          </p>
        </div>

        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 mb-4">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">AI Recommendations</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Ask for high-protein meals, PG-friendly options, or macro-filling dinners grounded strictly in your real goals.
          </p>
        </div>

        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 mb-4">
            <Activity className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">Deterministic Tracking</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Authoritative arithmetic, Mifflin-St Jeor energy targets, water and gym tracking with full historical safety.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 mt-6">
        <Link
          href="/login"
          className="px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold shadow-lg hover:shadow-emerald-600/25 transition-all flex items-center gap-2"
        >
          <span>Sign In &amp; Fresh Setup</span>
        </Link>
        <p className="text-xs text-slate-500">
          New user? Create your account and begin personal onboarding.
        </p>
      </div>

      <footer className="mt-16 pt-8 border-t border-slate-200 dark:border-slate-800 w-full flex items-center justify-between text-xs text-slate-500">
        <span>Personal AI Nutrition Platform • Asia/Kolkata</span>
        <Link
          href="/admin"
          className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors"
        >
          Admin Portal
        </Link>
      </footer>
    </main>
  );
}
