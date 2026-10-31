"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Bookmark, ArrowRight } from "lucide-react";

export default function MealPlannerPage() {
  const router = useRouter();

  React.useEffect(() => {
    // Automatically redirect to Saved Recipes
    router.replace("/recipes");
  }, [router]);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navigation />

      <main className="flex-1 max-w-3xl mx-auto p-4 md:p-8 flex items-center justify-center">
        <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-md">
          <Bookmark className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Redirecting to Saved Recipes</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Meal plans have been merged into Saved Recipes so you can save recipes directly from AI and reuse them anytime.
          </p>
          <Link
            href="/recipes"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
          >
            <span>Go to Saved Recipes</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
