"use client";

import * as React from "react";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { mealRecommendationService, RecommendedMeal, RecommendationConversation } from "@/lib/services/recommendation-service";
import { recipeService } from "@/lib/services/recipe-service";
import { diaryService } from "@/lib/services/diary-service";
import { preferencesService, formatTime12h, UserPreferences, DEFAULT_USER_PREFERENCES } from "@/lib/services/preferences-service";
import { getLocalTodayDateString } from "@/lib/date/date-service";
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Utensils,
  ChevronDown,
  ChevronUp,
  Bookmark,
  X,
  Settings2,
} from "lucide-react";

export default function RecommendationsPage() {
  const [conversations, setConversations] = React.useState<RecommendationConversation[]>([]);
  const [activeConvId, setActiveConvId] = React.useState<string>("");
  const [prompt, setPrompt] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [expandedRecipeId, setExpandedRecipeId] = React.useState<string | null>(null);
  const [portionMultipliers, setPortionMultipliers] = React.useState<Record<string, number>>({});
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [preferences, setPreferences] = React.useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [newAvoidInput, setNewAvoidInput] = React.useState("");

  // Load conversations & preferences
  React.useEffect(() => {
    const list = mealRecommendationService.getConversations();
    setConversations([...list]);
    if (list.length > 0 && !activeConvId) {
      setActiveConvId(list[0].id);
    }

    const updatePrefs = () => {
      setPreferences(preferencesService.getPreferences());
    };
    updatePrefs();
    window.addEventListener("sarveswar-preferences-updated", updatePrefs);
    window.addEventListener("sarveswar-auth-changed", updatePrefs);
    return () => {
      window.removeEventListener("sarveswar-preferences-updated", updatePrefs);
      window.removeEventListener("sarveswar-auth-changed", updatePrefs);
    };
  }, [activeConvId]);

  const activeConv = conversations.find((c) => c.id === activeConvId);

  const presets = [
    "Suggest five high-protein dinners under 600 kcal.",
    "Recommend a quick PG-friendly meal I can finish before 7 PM.",
    "I need 50 g more protein and 15 g fibre today. Suggest suitable foods.",
    "Give me high-protein dinner options without whey protein.",
  ];

  const handleCreateNewConv = () => {
    const newConv = mealRecommendationService.createConversation();
    setConversations([...mealRecommendationService.getConversations()]);
    setActiveConvId(newConv.id);
  };

  const handleDeleteConv = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    mealRecommendationService.deleteConversation(id);
    const updated = mealRecommendationService.getConversations();
    setConversations([...updated]);
    if (activeConvId === id && updated.length > 0) {
      setActiveConvId(updated[0].id);
    }
  };

  const handleSendPrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    const currentConvId = activeConvId || handleCreateNewConvReturnId();
    setIsGenerating(true);

    try {
      await mealRecommendationService.getRecommendationsForPrompt(currentConvId, prompt);
      setConversations([...mealRecommendationService.getConversations()]);
      setPrompt("");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateNewConvReturnId = (): string => {
    const newConv = mealRecommendationService.createConversation();
    setConversations([...mealRecommendationService.getConversations()]);
    setActiveConvId(newConv.id);
    return newConv.id;
  };

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Adjust portions live
  const updatePortion = (mealId: string, delta: number) => {
    setPortionMultipliers((prev) => {
      const current = prev[mealId] || 1.0;
      const updated = Math.max(0.5, Math.min(3.0, Math.round((current + delta) * 10) / 10));
      return { ...prev, [mealId]: updated };
    });
  };

  // Save to Saved Recipes Library
  const handleSaveToRecipe = (meal: RecommendedMeal) => {
    const mult = portionMultipliers[meal.id] || 1.0;
    const nameLower = meal.name.toLowerCase();
    const cat =
      nameLower.includes("breakfast") || nameLower.includes("toast") || nameLower.includes("egg")
        ? "breakfast"
        : nameLower.includes("shake") || nameLower.includes("milk") || nameLower.includes("smoothie")
        ? "drink"
        : nameLower.includes("snack") || nameLower.includes("nuts")
        ? "snack"
        : "main";

    recipeService.saveRecipe({
      name: mult !== 1.0 ? `${meal.name} (${mult}x portion)` : meal.name,
      servings: 1,
      prepTimeMinutes: meal.prepTimeMinutes || 10,
      cookTimeMinutes: 15,
      isFavourite: true,
      category: cat,
      source: "saved_from_ai",
      ingredients: meal.ingredients.map((ing) => ({
        name: ing.name,
        quantity: Math.round(ing.quantity * mult * 10) / 10,
        unit: ing.unit,
      })),
      instructions: meal.instructions,
      nutrientsPerServing: {
        calories: Math.round(meal.nutrients.calories * mult),
        protein: Math.round(meal.nutrients.protein * mult * 10) / 10,
        carbs: Math.round(meal.nutrients.carbs * mult * 10) / 10,
        fat: Math.round(meal.nutrients.fat * mult * 10) / 10,
        fibre: Math.round(meal.nutrients.fibre * mult * 10) / 10,
      },
    });

    showStatus(`Saved "${meal.name}" to your Saved Recipes library!`);
  };

  // Log as eaten after explicit confirmation
  const handleLogAsEaten = (meal: RecommendedMeal) => {
    const today = getLocalTodayDateString();
    const mult = portionMultipliers[meal.id] || 1.0;

    diaryService.addEntry({
      diaryDate: today,
      mealCategory: "dinner",
      foodName: `${meal.name} (${mult}x portion)`,
      quantity: mult,
      unit: "serving",
      preparationMethod: "Recommended recipe",
      isCooked: true,
      confidenceLabel: "verified",
      calories: Math.round(meal.nutrients.calories * mult),
      proteinG: Math.round(meal.nutrients.protein * mult * 10) / 10,
      carbsG: Math.round(meal.nutrients.carbs * mult * 10) / 10,
      fatG: Math.round(meal.nutrients.fat * mult * 10) / 10,
      fibreG: Math.round(meal.nutrients.fibre * mult * 10) / 10,
      consumedAt: `${today}T18:45:00+05:30`,
    });

    meal.isLoggedAsEaten = true;
    showStatus(`Confirmed and logged "${meal.name}" as eaten to your Food Diary!`);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navigation />

      <main className="flex-1 max-w-6xl mx-auto p-4 md:p-8 pb-24 md:pb-8 flex flex-col md:flex-row gap-6">
        {/* Sidebar: Conversation List */}
        <aside className="w-full md:w-64 flex-shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">Conversations</h2>
            <Button size="sm" variant="outline" onClick={handleCreateNewConv} className="h-7 text-xs flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </Button>
          </div>

          <div className="space-y-1">
            {conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => setActiveConvId(c.id)}
                className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  c.id === activeConvId
                    ? "bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 font-semibold"
                    : "hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400"
                }`}
              >
                <span className="truncate flex-1">{c.title}</span>
                {conversations.length > 1 && (
                  <button
                    onClick={(e) => handleDeleteConv(c.id, e)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Dynamic & Editable Dietary Constraints Card */}
          <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Active Dietary Constraints</span>
              </span>
              <Link
                href="/dashboard"
                className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 hover:underline"
              >
                Edit in Dashboard
              </Link>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                Excluded Foods (AI avoids):
              </span>
              <div className="flex flex-wrap gap-1">
                {preferences.foodsAvoided.map((food) => (
                  <div
                    key={food}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                  >
                    <span>{food}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = preferencesService.removeAvoidedFood(food);
                        setPreferences({ ...updated });
                        showStatus(`Removed "${food}" from exclusions.`);
                      }}
                      className="hover:text-red-500"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Quick Add Excluded Item */}
              <div className="flex items-center gap-1 mt-1.5">
                <input
                  type="text"
                  value={newAvoidInput}
                  onChange={(e) => setNewAvoidInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newAvoidInput.trim()) {
                      e.preventDefault();
                      const updated = preferencesService.addAvoidedFood(newAvoidInput.trim());
                      setPreferences({ ...updated });
                      setNewAvoidInput("");
                      showStatus(`Excluded "${newAvoidInput.trim()}" from AI recommendations.`);
                    }
                  }}
                  placeholder="+ Add avoided food"
                  className="px-2 py-1 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 w-full"
                />
              </div>
            </div>

            <div className="pt-1.5 border-t border-purple-100 dark:border-purple-900/40 text-[11px] space-y-1">
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1 text-[10px] text-slate-500">
                  <Clock className="w-3 h-3 text-purple-600" />
                  <span>Dinner Cutoff:</span>
                </span>
                <span className="font-bold text-purple-700 dark:text-purple-300">
                  {formatTime12h(preferences.cutoffs.dinner)} IST
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                AI recipes automatically fit before your dinner cutoff and exclude all selected items.
              </p>
            </div>
          </div>
        </aside>

        {/* Conversation Area & Cards */}
        <div className="flex-1 space-y-6">
          <header>
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-sm font-semibold mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Personal AI Recommendations</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
              AI Nutrition Coach & Recipe Finder
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Conversational prompts grounded in your real calorie goals and actual intake.
            </p>
          </header>

          {statusMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Prompt Box */}
          <Card className="border-purple-200 dark:border-purple-900/60 shadow-sm">
            <CardContent className="p-4">
              <form onSubmit={handleSendPrompt} className="space-y-3">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ask anything: 'Suggest five high-protein dinners under 600 kcal', 'PG meals before 7 PM', 'What should I eat with 40g protein left today?'..."
                  rows={3}
                  className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-purple-500"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Presets:</span>
                    {presets.slice(0, 2).map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPrompt(p)}
                        className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        {p.slice(0, 28)}...
                      </button>
                    ))}
                  </div>

                  <Button type="submit" disabled={isGenerating || !prompt.trim()} className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5" />
                    <span>{isGenerating ? "Analyzing..." : "Get Recommendations"}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Active Messages & Cards */}
          <div className="space-y-6">
            {activeConv?.messages.map((msg) => (
              <div key={msg.id} className="space-y-4">
                <div
                  className={`p-3.5 rounded-xl text-sm ${
                    msg.role === "user"
                      ? "bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-white font-medium ml-8"
                      : "bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 text-slate-800 dark:text-slate-200 mr-8"
                  }`}
                >
                  <p>{msg.content}</p>
                </div>

                {/* Render Recommendation Cards */}
                {msg.recommendations && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {msg.recommendations.map((meal) => {
                      const mult = portionMultipliers[meal.id] || 1.0;
                      const cals = Math.round(meal.nutrients.calories * mult);
                      const protein = Math.round(meal.nutrients.protein * mult * 10) / 10;
                      const carbs = Math.round(meal.nutrients.carbs * mult * 10) / 10;
                      const fat = Math.round(meal.nutrients.fat * mult * 10) / 10;
                      const isExpanded = expandedRecipeId === meal.id;

                      return (
                        <Card key={meal.id} className="border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {meal.cookTimeMinutes} mins
                              </span>
                              {meal.estimatedCostInr && (
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  ₹{Math.round(meal.estimatedCostInr * mult)} approx
                                </span>
                              )}
                            </div>
                            <CardTitle className="text-base text-slate-900 dark:text-white">
                              {meal.name}
                            </CardTitle>
                            <p className="text-xs text-slate-500">{meal.description}</p>
                          </CardHeader>

                          <CardContent className="space-y-3">
                            {/* Validation Badge */}
                            <div>
                              {meal.isConstraintSatisfied ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Constraint Verified</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>{meal.constraintViolations[0]}</span>
                                </span>
                              )}
                            </div>

                            {/* Macro Badges */}
                            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs">
                              <span className="font-bold text-slate-900 dark:text-white">{cals} kcal</span>
                              <span className="font-bold text-emerald-600">{protein}g P</span>
                              <span className="text-slate-600 dark:text-slate-400">{carbs}g C</span>
                              <span className="text-slate-600 dark:text-slate-400">{fat}g F</span>
                            </div>

                            {/* Portion Adjuster */}
                            <div className="flex items-center justify-between text-xs py-1 border-t border-slate-100 dark:border-slate-800">
                              <span className="text-slate-500">Portion Size:</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updatePortion(meal.id, -0.25)}
                                  className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold"
                                >
                                  -
                                </button>
                                <span className="font-semibold text-slate-900 dark:text-white">{mult}x</span>
                                <button
                                  onClick={() => updatePortion(meal.id, +0.25)}
                                  className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Expandable Recipe */}
                            {isExpanded && (
                              <div className="text-xs space-y-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 animate-fade-in">
                                <p className="font-bold text-slate-900 dark:text-white">Ingredients:</p>
                                <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-300">
                                  {meal.ingredients.map((ing, idx) => (
                                    <li key={idx}>
                                      {ing.name} — {Math.round(ing.quantity * mult)} {ing.unit}
                                    </li>
                                  ))}
                                </ul>

                                <p className="font-bold text-slate-900 dark:text-white pt-1">Instructions:</p>
                                <ol className="list-decimal pl-4 space-y-0.5 text-slate-600 dark:text-slate-300">
                                  {meal.instructions.map((inst, idx) => (
                                    <li key={idx}>{inst}</li>
                                  ))}
                                </ol>
                              </div>
                            )}

                            {/* Card Actions */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedRecipeId(isExpanded ? null : meal.id)}
                                className="h-7 text-xs flex items-center gap-1"
                              >
                                {isExpanded ? (
                                  <>
                                    <span>Hide Recipe</span>
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </>
                                ) : (
                                  <>
                                    <span>View Recipe</span>
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </>
                                )}
                              </Button>

                              <div className="flex items-center gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSaveToRecipe(meal)}
                                  className="h-7 text-xs flex items-center gap-1 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                                >
                                  <Bookmark className="w-3.5 h-3.5" />
                                  <span>Save to Recipes</span>
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleLogAsEaten(meal)}
                                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  Log as Eaten
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
