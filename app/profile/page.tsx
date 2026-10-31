"use client";

import * as React from "react";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { authService } from "@/lib/services/auth-service";
import {
  SARVESWAR_PROFILE_DEFAULTS,
  calculateBodybuildingProtocols,
  BodybuildingProtocolsComparison,
  BodybuildingGoalProtocol,
  parseExcludedFoodsPrompt,
} from "@/lib/services/profile-service";
import {
  UserCheck,
  Calculator,
  Save,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Scale,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  X,
  Plus,
  LogIn,
} from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = React.useState({
    name: "",
    age: "" as number | "",
    sex: "male" as "male" | "female" | "other",
    heightCm: "" as number | "",
    currentWeightKg: "" as number | "",
    targetWeightKg: "" as number | "",
    fitnessGoal: "fat_loss" as "fat_loss" | "muscle_gain" | "recomposition" | "maintenance",
    activityLevel: "moderate" as "sedentary" | "light" | "moderate" | "very_active" | "extra_active",
    preferredDinnerCutoff: "19:00",
    foodsAvoided: [] as string[],
    cookingAbility: "home_food" as "home_food" | "cook" | "pg_food" | "mess" | "restaurants",
  });

  // Active selected goal protocol for side-by-side comparison
  const [selectedProtocolKey, setSelectedProtocolKey] = React.useState<
    "fat_loss" | "muscle_gain" | "maintenance" | "recomposition"
  >("fat_loss");

  // Dynamic Evidence-Based Bodybuilding Recalculation (live on every keystroke)
  const protocolsData: BodybuildingProtocolsComparison = React.useMemo(() => {
    const ageNum = typeof profile.age === "number" ? profile.age : Number(profile.age) || 25;
    const heightNum = typeof profile.heightCm === "number" ? profile.heightCm : Number(profile.heightCm) || 170;
    const weightNum = typeof profile.currentWeightKg === "number" ? profile.currentWeightKg : Number(profile.currentWeightKg) || 70;

    return calculateBodybuildingProtocols({
      age: ageNum,
      sex: profile.sex,
      heightCm: heightNum,
      currentWeightKg: weightNum,
      activityLevel: profile.activityLevel,
    });
  }, [profile.age, profile.sex, profile.heightCm, profile.currentWeightKg, profile.activityLevel]);

  const normalBaseline = protocolsData.protocols.maintenance;
  const activeProtocol = protocolsData.protocols[selectedProtocolKey];

  // Active manual targets (synchronized with selected protocol)
  const [targets, setTargets] = React.useState({
    calories: activeProtocol.calories,
    protein: activeProtocol.proteinGrams,
    carbs: activeProtocol.carbsGrams,
    fat: activeProtocol.fatGrams,
    fibre: activeProtocol.fibreGrams,
    waterMl: activeProtocol.waterMl,
  });

  const [savedSuccess, setSavedSuccess] = React.useState(false);
  const [exclusionPrompt, setExclusionPrompt] = React.useState("");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const user = authService.getCurrentUser();
        const id = authService.getCurrentUserId();
        const isSarveswar = id === "usr-sarveswar-primary" || id === "sarveswar" || id === "usr-sarveswar5-primary" || id === "sarveswar5";
        const profileKey = isSarveswar ? "sarveswar_user_profile" : `sarveswar_user_profile_${id}`;
        const storedProfile = localStorage.getItem(profileKey);
        if (storedProfile) {
          const parsed = JSON.parse(storedProfile);
          setProfile((prev) => ({ ...prev, ...parsed }));
          if (parsed.fitnessGoal) {
            setSelectedProtocolKey(parsed.fitnessGoal);
          }
        } else if (user) {
          setProfile((prev) => ({
            ...prev,
            name: user.name,
            foodsAvoided: [],
          }));
        }
      } catch (e) {
        console.warn("Could not load stored profile:", e);
      }
    }
  }, []);

  // When selected protocol or weight/age changes, automatically update all macro targets!
  const handleSelectProtocol = (key: "fat_loss" | "muscle_gain" | "maintenance" | "recomposition") => {
    setSelectedProtocolKey(key);
    const p = protocolsData.protocols[key];
    setTargets({
      calories: p.calories,
      protein: p.proteinGrams,
      carbs: p.carbsGrams,
      fat: p.fatGrams,
      fibre: p.fibreGrams,
      waterMl: p.waterMl,
    });
  };

  // Re-sync targets when physical stats change if using automatic sync
  React.useEffect(() => {
    const p = protocolsData.protocols[selectedProtocolKey];
    setTargets({
      calories: p.calories,
      protein: p.proteinGrams,
      carbs: p.carbsGrams,
      fat: p.fatGrams,
      fibre: p.fibreGrams,
      waterMl: p.waterMl,
    });
  }, [protocolsData, selectedProtocolKey]);

  // AI prompt parsing for excluded foods
  const handleExtractExclusionPrompt = () => {
    const extracted = parseExcludedFoodsPrompt(exclusionPrompt);
    if (extracted.length > 0) {
      const merged = Array.from(new Set([...profile.foodsAvoided, ...extracted]));
      setProfile({ ...profile, foodsAvoided: merged });
      setExclusionPrompt("");
    }
  };

  const handleRemoveExclusionTag = (tag: string) => {
    setProfile({
      ...profile,
      foodsAvoided: profile.foodsAvoided.filter((t) => t !== tag),
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      try {
        const id = authService.getCurrentUserId();
        const isSarveswar = id === "usr-sarveswar-primary" || id === "sarveswar";
        const profileKey = isSarveswar ? "sarveswar_user_profile" : `sarveswar_user_profile_${id}`;
        const targetsKey = isSarveswar ? "sarveswar_nutrition_targets" : `sarveswar_nutrition_targets_${id}`;

        localStorage.setItem(profileKey, JSON.stringify(profile));
        localStorage.setItem(targetsKey, JSON.stringify(targets));
        window.dispatchEvent(new CustomEvent("sarveswar-targets-updated"));
        window.dispatchEvent(new CustomEvent("sarveswar-preferences-updated"));
      } catch (err) {
        console.warn("Could not save targets to localStorage:", err);
      }
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navigation />

      <main className="flex-1 max-w-5xl mx-auto p-4 md:p-8 pb-24 md:pb-8">
        <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-semibold mb-1">
              <UserCheck className="w-4 h-4" />
              <span>Profile &amp; Nutrition Goals</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
              User Profile &amp; Calorie Configuration
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Tailored for {profile.name || "you"}. Asia/Kolkata timezone, {profile.preferredDinnerCutoff || "19:00"} dinner cutoff, and custom dietary exclusions.
            </p>
          </div>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors shadow-sm self-start md:self-auto"
          >
            <LogIn className="w-4 h-4 text-emerald-600" />
            <span>Sign In / Start Fresh Account</span>
          </Link>
        </header>

        {savedSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Profile and targets updated successfully</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Your manual targets and excluded food constraints have been saved.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Personal Attributes & Physical Stats */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Personal Details &amp; Physical Metrics</CardTitle>
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Age 21 Confirmed
              </span>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Age (Years)</label>
                <input
                  type="number"
                  value={profile.age}
                  onChange={(e) => setProfile({ ...profile, age: e.target.value === "" ? "" : Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-emerald-400 dark:border-emerald-700 bg-emerald-50/20 dark:bg-emerald-950/20 text-sm font-bold text-emerald-800 dark:text-emerald-300"
                  min={14}
                  max={120}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Sex</label>
                <select
                  value={profile.sex}
                  onChange={(e) => setProfile({ ...profile, sex: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Height (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={profile.heightCm}
                  onChange={(e) => setProfile({ ...profile, heightCm: e.target.value === "" ? "" : Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Current Weight (kg) <span className="text-emerald-500 font-normal">↺ Live recalculation</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={profile.currentWeightKg}
                  onChange={(e) => setProfile({ ...profile, currentWeightKg: e.target.value === "" ? "" : Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border-2 border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/30 text-sm font-black text-emerald-900 dark:text-emerald-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Target Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={profile.targetWeightKg}
                  onChange={(e) => setProfile({ ...profile, targetWeightKg: e.target.value === "" ? "" : Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-semibold"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Routine, Cooking Context & Exclusions */}
          <Card>
            <CardHeader>
              <CardTitle>Fitness Routine, Cooking Ability &amp; Exclusions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Cooking Ability / Context</label>
                  <select
                    value={profile.cookingAbility}
                    onChange={(e) => setProfile({ ...profile, cookingAbility: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-semibold"
                  >
                    <option value="home_food">🏠 Home-made food (Home cooking)</option>
                    <option value="cook">🍳 Can cook own meals</option>
                    <option value="pg_food">🏢 PG / Hostel Food (Limited cooking)</option>
                    <option value="mess">🍲 Mess / Canteen</option>
                    <option value="restaurants">🍽️ Restaurants / Delivery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Activity Level</label>
                  <select
                    value={profile.activityLevel}
                    onChange={(e) => setProfile({ ...profile, activityLevel: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                  >
                    <option value="moderate">Moderate (Regular gym, 3-5 days/week) - 1.55x</option>
                    <option value="light">Light (1-2 days/week) - 1.375x</option>
                    <option value="sedentary">Sedentary (desk job, no gym) - 1.2x</option>
                    <option value="very_active">Very Active (6-7 days/week) - 1.725x</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Preferred Dinner Cutoff</label>
                  <input
                    type="time"
                    value={profile.preferredDinnerCutoff}
                    onChange={(e) => setProfile({ ...profile, preferredDinnerCutoff: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-semibold"
                  />
                </div>
              </div>

              {/* Natural Language Foods Excluded Prompt Box */}
              <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20 space-y-3">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs uppercase">
                  <ShieldAlert className="w-4 h-4" />
                  <span>AI Foods Excluded Prompt</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Type any exclusions in plain English (e.g. <em>&quot;I don&apos;t eat whey protein and squid&quot;</em>). The AI will extract and permanently exclude them from all meal recommendations.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={exclusionPrompt}
                    onChange={(e) => setExclusionPrompt(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-rose-500"
                  />
                  <Button
                    type="button"
                    onClick={handleExtractExclusionPrompt}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    <span>Extract with AI</span>
                  </Button>
                </div>

                {/* Excluded Badges List */}
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1.5">
                    Currently Enforced Exclusions:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {profile.foodsAvoided.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveExclusionTag(tag)}
                          className="hover:text-rose-950 dark:hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Interactive Bodybuilding Protocol Selector & Side-by-Side Comparison */}
          <Card className="border-emerald-300 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/50 via-white to-blue-50/30 dark:from-emerald-950/20 dark:via-slate-900 dark:to-blue-950/10 shadow-sm">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                    <Calculator className="w-4 h-4" />
                    <span>Evidence-Based Bodybuilding Formulas</span>
                  </div>
                  <CardTitle className="text-xl md:text-2xl mt-1">
                    Goal-Specific Protocols &amp; Side-by-Side Comparison
                  </CardTitle>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Click any goal to compare against your <strong>Normal Baseline</strong>. All grams (Protein, Carbs, Fat, Fibre, Water) update in real-time.
                  </p>
                </div>

                <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-medium">BMR</span>
                    <span className="text-base font-bold text-slate-800 dark:text-slate-200">{protocolsData.bmr} kcal</span>
                  </div>
                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1" />
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-medium">Maintenance TDEE</span>
                    <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{protocolsData.maintenanceTdee} kcal</span>
                  </div>
                </div>
              </div>

              {/* Goal Definitions / Plain English Guide */}
              <div className="p-3.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs space-y-1.5 mt-2">
                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Bodybuilding Terms Explained in Plain English:</span>
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-slate-600 dark:text-slate-300">
                  <p>
                    • <strong className="text-emerald-700 dark:text-emerald-400">Cut (Reducing Fat):</strong> Eating in a -500 kcal deficit to burn body fat and get lean/shredded while shielding muscle with elevated protein (165g).
                  </p>
                  <p>
                    • <strong className="text-blue-700 dark:text-blue-400">Bulk (Gaining Muscle):</strong> Eating in a +400 kcal surplus to lift heavier weights and grow bigger muscle tissue and overall size.
                  </p>
                  <p>
                    • <strong className="text-amber-700 dark:text-amber-400">Normal (Maintenance):</strong> Eating at energy equilibrium (0 kcal delta) to stay at the exact same body weight.
                  </p>
                  <p>
                    • <strong className="text-purple-700 dark:text-purple-400">Recomp (Body Recomposition):</strong> Losing body fat and building muscle simultaneously while keeping scale weight unchanged.
                  </p>
                </div>
              </div>

              {/* Goal Selection Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleSelectProtocol("fat_loss")}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    selectedProtocolKey === "fat_loss"
                      ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/60 ring-2 ring-emerald-500 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <TrendingDown className="w-4 h-4 text-emerald-600" /> Weight Loss
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300">
                      Cut (Reduce Fat)
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Burn fat &amp; reveal muscle</span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-2">
                    {protocolsData.protocols.fat_loss.calories} kcal (-500)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectProtocol("muscle_gain")}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    selectedProtocolKey === "muscle_gain"
                      ? "border-blue-500 bg-blue-50/80 dark:bg-blue-950/60 ring-2 ring-blue-500 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-blue-600" /> Weight Gain
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/80 text-blue-700 dark:text-blue-300">
                      Bulk (Build Size)
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Grow muscle &amp; lift heavier</span>
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400 mt-2">
                    {protocolsData.protocols.muscle_gain.calories} kcal (+400)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectProtocol("maintenance")}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    selectedProtocolKey === "maintenance"
                      ? "border-amber-500 bg-amber-50/80 dark:bg-amber-950/60 ring-2 ring-amber-500 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-amber-600" /> Normal Count
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/80 text-amber-700 dark:text-amber-300">
                      Maintain Weight
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Stay at current bodyweight</span>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 mt-2">
                    {protocolsData.protocols.maintenance.calories} kcal (0)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectProtocol("recomposition")}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    selectedProtocolKey === "recomposition"
                      ? "border-purple-500 bg-purple-50/80 dark:bg-purple-950/60 ring-2 ring-purple-500 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <RefreshCw className="w-4 h-4 text-purple-600" /> Recomp
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/80 text-purple-700 dark:text-purple-300">
                      Lose Fat + Build Muscle
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Transform body shape</span>
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-400 mt-2">
                    {protocolsData.protocols.recomposition.calories} kcal (0)
                  </span>
                </button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Side-by-Side Comparison Grid */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                      <th className="px-4 py-3.5 font-semibold text-slate-700 dark:text-slate-300">Metric / Nutrient</th>
                      <th className="px-4 py-3.5 font-bold text-slate-700 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-800/90">
                        Normal Baseline (Maintenance)
                      </th>
                      <th className="px-4 py-3.5 font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/50">
                        {activeProtocol.label} Target
                      </th>
                      <th className="px-4 py-3.5 font-semibold text-slate-600 dark:text-slate-400">Adjustment &amp; Science</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {/* Calories */}
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">Daily Calories</td>
                      <td className="px-4 py-3 font-medium bg-slate-50/40 dark:bg-slate-900/40">
                        <span className="text-base font-bold text-slate-900 dark:text-white">{normalBaseline.calories}</span> kcal
                      </td>
                      <td className="px-4 py-3 bg-emerald-50/30 dark:bg-emerald-950/30">
                        <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{activeProtocol.calories}</span> kcal
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {activeProtocol.calorieDelta === 0 ? (
                          <span className="text-slate-500 font-medium">Equilibrium (0 kcal delta)</span>
                        ) : activeProtocol.calorieDelta < 0 ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                            {activeProtocol.calorieDelta} kcal deficit (~0.5 kg fat loss/week)
                          </span>
                        ) : (
                          <span className="text-blue-700 dark:text-blue-400 font-bold">
                            +{activeProtocol.calorieDelta} kcal surplus (hypertrophy without excess fat)
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Protein */}
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        Protein (g)
                        <span className="block text-[11px] text-slate-400 font-normal">Muscle preservation</span>
                      </td>
                      <td className="px-4 py-3 font-medium bg-slate-50/40 dark:bg-slate-900/40">
                        <span className="text-base font-bold text-slate-900 dark:text-white">{normalBaseline.proteinGrams}g</span>
                        <span className="text-xs text-slate-400 ml-1">({normalBaseline.proteinPerKg}g/kg)</span>
                      </td>
                      <td className="px-4 py-3 bg-emerald-50/30 dark:bg-emerald-950/30">
                        <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{activeProtocol.proteinGrams}g</span>
                        <span className="text-xs text-emerald-700 dark:text-emerald-400 ml-1">({activeProtocol.proteinPerKg}g/kg)</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                        {activeProtocol.key === "fat_loss" ? (
                          <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                            +{activeProtocol.proteinGrams - normalBaseline.proteinGrams}g elevated protein — Shields muscle from catabolism during deficit
                          </span>
                        ) : (
                          <span>2.0g/kg optimal threshold for muscle protein synthesis (MPS)</span>
                        )}
                      </td>
                    </tr>

                    {/* Carbohydrates */}
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        Carbohydrates (g)
                        <span className="block text-[11px] text-slate-400 font-normal">Workout fuel</span>
                      </td>
                      <td className="px-4 py-3 font-medium bg-slate-50/40 dark:bg-slate-900/40">
                        <span className="text-base font-bold text-slate-900 dark:text-white">{normalBaseline.carbsGrams}g</span>
                      </td>
                      <td className="px-4 py-3 bg-emerald-50/30 dark:bg-emerald-950/30">
                        <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400">{activeProtocol.carbsGrams}g</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                        {activeProtocol.carbsGrams > normalBaseline.carbsGrams ? (
                          <span className="text-blue-600 font-medium">
                            +{activeProtocol.carbsGrams - normalBaseline.carbsGrams}g surplus to fuel progressive overload &amp; glycogen replenishment
                          </span>
                        ) : activeProtocol.carbsGrams < normalBaseline.carbsGrams ? (
                          <span className="text-amber-600 font-medium">
                            {activeProtocol.carbsGrams - normalBaseline.carbsGrams}g calibrated reduction while maintaining lifting energy
                          </span>
                        ) : (
                          <span>Equilibrium carbohydrate fuel</span>
                        )}
                      </td>
                    </tr>

                    {/* Fats */}
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        Fats (g)
                        <span className="block text-[11px] text-slate-400 font-normal">Hormonal health</span>
                      </td>
                      <td className="px-4 py-3 font-medium bg-slate-50/40 dark:bg-slate-900/40">
                        <span className="text-base font-bold text-slate-900 dark:text-white">{normalBaseline.fatGrams}g</span>
                        <span className="text-xs text-slate-400 ml-1">(25%)</span>
                      </td>
                      <td className="px-4 py-3 bg-emerald-50/30 dark:bg-emerald-950/30">
                        <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400">{activeProtocol.fatGrams}g</span>
                        <span className="text-xs text-amber-700 dark:text-amber-400 ml-1">(25%)</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                        Preserves essential testosterone, endocrine function &amp; fat-soluble vitamin absorption
                      </td>
                    </tr>

                    {/* Fibre & Water */}
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">Fibre &amp; Water</td>
                      <td className="px-4 py-3 font-medium bg-slate-50/40 dark:bg-slate-900/40">
                        {normalBaseline.fibreGrams}g fibre / {normalBaseline.waterMl}ml
                      </td>
                      <td className="px-4 py-3 bg-emerald-50/30 dark:bg-emerald-950/30 font-bold text-slate-800 dark:text-slate-200">
                        {activeProtocol.fibreGrams}g fibre / {activeProtocol.waterMl}ml
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                        14g fibre / 1,000 kcal guideline; 35ml water / kg + 500ml workout allowance
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Daily Nutrition Targets (FIXED CONTRAST & DYNAMIC VALUES) */}
          <Card className="border border-slate-200 dark:border-slate-800">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Active Configured Targets (Driving Diary &amp; Gauges)
                </CardTitle>
                <p className="text-xs text-slate-500">
                  These numbers are authoritative. Every value updates dynamically when selecting a goal or editing physical stats.
                </p>
              </div>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center gap-2 text-xs md:text-sm py-2 px-4 shadow-sm">
                <Save className="w-4 h-4" />
                <span>Save All Targets</span>
              </Button>
            </CardHeader>
            <CardContent>
              {/* High-Contrast Inputs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <div className="p-3.5 rounded-xl border-2 border-emerald-500 bg-white dark:bg-slate-900 shadow-sm">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Daily Calories
                  </label>
                  <input
                    type="number"
                    value={targets.calories}
                    onChange={(e) => setTargets({ ...targets, calories: Number(e.target.value) })}
                    className="w-full text-xl font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] text-slate-500 font-semibold block mt-1">kcal/day</span>
                </div>

                <div className="p-3.5 rounded-xl border-2 border-emerald-500 bg-white dark:bg-slate-900 shadow-sm">
                  <label className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-1">
                    Protein Target
                  </label>
                  <input
                    type="number"
                    value={targets.protein}
                    onChange={(e) => setTargets({ ...targets, protein: Number(e.target.value) })}
                    className="w-full text-xl font-black text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-400 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-1">grams/day</span>
                </div>

                <div className="p-3.5 rounded-xl border-2 border-blue-500 bg-white dark:bg-slate-900 shadow-sm">
                  <label className="block text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase mb-1">
                    Carbohydrates
                  </label>
                  <input
                    type="number"
                    value={targets.carbs}
                    onChange={(e) => setTargets({ ...targets, carbs: Number(e.target.value) })}
                    className="w-full text-xl font-black text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-400 dark:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold block mt-1">grams/day</span>
                </div>

                <div className="p-3.5 rounded-xl border-2 border-amber-500 bg-white dark:bg-slate-900 shadow-sm">
                  <label className="block text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase mb-1">
                    Healthy Fats
                  </label>
                  <input
                    type="number"
                    value={targets.fat}
                    onChange={(e) => setTargets({ ...targets, fat: Number(e.target.value) })}
                    className="w-full text-xl font-black text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-400 dark:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold block mt-1">grams/day</span>
                </div>

                <div className="p-3.5 rounded-xl border-2 border-purple-500 bg-white dark:bg-slate-900 shadow-sm">
                  <label className="block text-[11px] font-bold text-purple-700 dark:text-purple-400 uppercase mb-1">
                    Dietary Fibre
                  </label>
                  <input
                    type="number"
                    value={targets.fibre}
                    onChange={(e) => setTargets({ ...targets, fibre: Number(e.target.value) })}
                    className="w-full text-xl font-black text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-lg border border-purple-400 dark:border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold block mt-1">grams/day</span>
                </div>

                <div className="p-3.5 rounded-xl border-2 border-cyan-500 bg-white dark:bg-slate-900 shadow-sm">
                  <label className="block text-[11px] font-bold text-cyan-700 dark:text-cyan-400 uppercase mb-1">
                    Daily Water
                  </label>
                  <input
                    type="number"
                    value={targets.waterMl}
                    onChange={(e) => setTargets({ ...targets, waterMl: Number(e.target.value) })}
                    className="w-full text-xl font-black text-cyan-800 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-cyan-400 dark:border-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold block mt-1">ml/day</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </main>
    </div>
  );
}
