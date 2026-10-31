"use client";

import * as React from "react";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { recipeService, RecipeItem } from "@/lib/services/recipe-service";
import { diaryService, MealCategory } from "@/lib/services/diary-service";
import { getLocalTodayDateString } from "@/lib/date/date-service";
import {
  Bookmark,
  Heart,
  Clock,
  Sparkles,
  Utensils,
  PlusCircle,
  Trash2,
  CheckCircle2,
  Check,
} from "lucide-react";

export default function RecipesPage() {
  const [recipes, setRecipes] = React.useState<RecipeItem[]>([]);
  const [activeCategory, setActiveCategory] = React.useState<string>("all");
  const [actionNotice, setActionNotice] = React.useState<string | null>(null);

  const loadRecipes = React.useCallback(() => {
    setRecipes([...recipeService.getRecipes()]);
  }, []);

  React.useEffect(() => {
    loadRecipes();

    const handleUpdate = () => loadRecipes();
    window.addEventListener("sarveswar-recipes-updated", handleUpdate);
    window.addEventListener("sarveswar-auth-changed", handleUpdate);
    return () => {
      window.removeEventListener("sarveswar-recipes-updated", handleUpdate);
      window.removeEventListener("sarveswar-auth-changed", handleUpdate);
    };
  }, [loadRecipes]);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleToggleFav = (id: string) => {
    recipeService.toggleFavourite(id);
    loadRecipes();
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Remove "${name}" from your saved recipes?`)) {
      recipeService.deleteRecipe(id);
      loadRecipes();
      showNotice(`Removed "${name}" from saved recipes.`);
    }
  };

  const handleLogToDiary = (recipe: RecipeItem) => {
    const today = getLocalTodayDateString();
    const cat: MealCategory =
      recipe.category === "breakfast"
        ? "breakfast"
        : recipe.category === "snack" || recipe.category === "drink"
        ? "evening_snack"
        : "lunch";

    diaryService.addEntry({
      diaryDate: today,
      mealCategory: cat,
      foodName: recipe.name,
      quantity: recipe.servings || 1,
      unit: "serving",
      preparationMethod: "Saved recipe",
      isCooked: true,
      confidenceLabel: "verified",
      calories: recipe.nutrientsPerServing.calories,
      proteinG: recipe.nutrientsPerServing.protein,
      carbsG: recipe.nutrientsPerServing.carbs,
      fatG: recipe.nutrientsPerServing.fat,
      fibreG: recipe.nutrientsPerServing.fibre,
      consumedAt: new Date().toISOString(),
    });

    showNotice(`Logged "${recipe.name}" directly to today's Food Diary!`);
  };

  const filtered = recipes.filter((r) => {
    if (activeCategory === "all") return true;
    if (activeCategory === "favourites") return r.isFavourite;
    if (activeCategory === "saved_from_ai") return r.source === "saved_from_ai";
    return r.category === activeCategory;
  });

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navigation />

      <main className="flex-1 max-w-5xl mx-auto p-4 md:p-8 pb-24 md:pb-8">
        <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-semibold mb-1">
              <Bookmark className="w-4 h-4" />
              <span>Recipe & Food Library</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
              Saved Recipes & Meals
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Your personal library of favorite, high-protein, and AI-recommended recipes. 1-click log directly to your Food Diary anytime.
            </p>
          </div>

          <Link
            href="/recommendations"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium shadow transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>Discover with AI</span>
          </Link>
        </header>

        {actionNotice && (
          <div className="mb-6 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {[
            { id: "all", label: `All (${recipes.length})` },
            { id: "favourites", label: "Favourites" },
            { id: "saved_from_ai", label: "Saved from AI" },
            { id: "breakfast", label: "Breakfast" },
            { id: "main", label: "Mains" },
            { id: "drink", label: "Shakes & Drinks" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeCategory === tab.id
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Bookmark className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No recipes in this view.</p>
            <p className="text-xs text-slate-500 mt-1">
              Ask AI for meal ideas in AI Recommendations and click &ldquo;Save to Recipes&rdquo; to add them here!
            </p>
            <Link
              href="/recommendations"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ask AI Recommendations</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((recipe) => (
              <Card key={recipe.id} className="border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs uppercase font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                        {recipe.category}
                      </span>
                      {recipe.source === "saved_from_ai" && (
                        <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                          Saved from AI
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleFav(recipe.id)}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Toggle Favourite"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            recipe.isFavourite ? "fill-red-500 text-red-500" : "text-slate-400"
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => handleDelete(recipe.id, recipe.name)}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-600"
                        title="Delete recipe"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <CardTitle className="text-lg">{recipe.name}</CardTitle>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {recipe.prepTimeMinutes + recipe.cookTimeMinutes} mins
                    </span>
                    <span>•</span>
                    <span>{recipe.servings} serving</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Nutrients banner */}
                  <div className="grid grid-cols-4 gap-1 p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Calories</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {recipe.nutrientsPerServing.calories}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Protein</span>
                      <span className="font-bold text-emerald-600">
                        {recipe.nutrientsPerServing.protein}g
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Carbs</span>
                      <span className="font-bold text-blue-600">
                        {recipe.nutrientsPerServing.carbs}g
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Fat</span>
                      <span className="font-bold text-amber-600">
                        {recipe.nutrientsPerServing.fat}g
                      </span>
                    </div>
                  </div>

                  {/* Ingredients list */}
                  <div className="text-xs space-y-1">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Ingredients:</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-400">
                      {recipe.ingredients.map((ing, idx) => (
                        <li key={idx}>
                          {ing.name} ({ing.quantity} {ing.unit})
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Instructions */}
                  <div className="text-xs space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Preparation:</span>
                    <ol className="list-decimal pl-4 space-y-0.5 text-slate-600 dark:text-slate-400">
                      {recipe.instructions.map((inst, idx) => (
                        <li key={idx}>{inst}</li>
                      ))}
                    </ol>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => handleLogToDiary(recipe)}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Log to Food Diary</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
