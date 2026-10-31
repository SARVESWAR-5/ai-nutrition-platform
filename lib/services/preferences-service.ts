"use client";

import { MealCategory } from "./diary-service";
import { authService } from "./auth-service";
import { cloudSyncService } from "./cloud-sync-service";

export interface MealCutoffs {
  early_morning: string; // "07:30"
  breakfast: string; // "09:30"
  mid_morning_snack: string; // "11:30"
  lunch: string; // "14:00"
  evening_snack: string; // "17:30"
  pre_workout: string; // "17:00"
  post_workout: string; // "19:00"
  dinner: string; // "19:00"
  other: string; // "21:30"
}

export interface UserPreferences {
  cutoffs: MealCutoffs;
  foodsAvoided: string[];
  dietaryNotes?: string;
}

const STORAGE_PREFS_KEY = "sarveswar_user_preferences";
const STORAGE_PROFILE_KEY = "sarveswar_user_profile";

export const DEFAULT_MEAL_CUTOFFS: MealCutoffs = {
  early_morning: "07:30",
  breakfast: "09:30",
  mid_morning_snack: "11:30",
  lunch: "14:00",
  evening_snack: "17:30",
  pre_workout: "17:00",
  post_workout: "19:00",
  dinner: "19:00",
  other: "21:30",
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  cutoffs: DEFAULT_MEAL_CUTOFFS,
  foodsAvoided: ["whey protein", "squid"],
  dietaryNotes: "Home food context • Limited cooking • Gym workout schedule",
};

/**
 * Converts 24-hour time "19:00" into friendly 12-hour format "07:00 PM".
 */
export function formatTime12h(time24: string): string {
  if (!time24 || !time24.includes(":")) return time24;
  const [hStr, mStr] = time24.split(":");
  let hours = parseInt(hStr, 10);
  const minutes = mStr.slice(0, 2);
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hDisplay = hours < 10 ? `0${hours}` : `${hours}`;
  return `${hDisplay}:${minutes} ${ampm}`;
}

/**
 * Normalizes user prompt time like "7:00pm", "7pm", "19:00", "08:30 am" to "HH:MM" 24h format.
 */
export function parseTimeTo24h(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase();

  // Pattern like "7:30 pm", "07:00pm", "7pm", "7:00 am"
  const ampmMatch = cleaned.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const mins = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
    const isPm = ampmMatch[3] === "pm";

    if (isPm && hours < 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;

    const hh = hours < 10 ? `0${hours}` : `${hours}`;
    const mm = mins < 10 ? `0${mins}` : `${mins}`;
    return `${hh}:${mm}`;
  }

  // Pattern like "19:00", "07:30"
  const m24 = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const hh = parseInt(m24[1], 10) < 10 ? `0${parseInt(m24[1], 10)}` : m24[1];
    return `${hh}:${m24[2]}`;
  }

  return null;
}

/**
 * Natural language AI parser for user prompt specifications.
 * Supports inputs such as:
 * - "My dinner cutoff time is 7:00pm, breakfast cutoff is 9:30am, and I don't take whey protein and squid"
 * - "Dinner cutoff 8:00pm, lunch cutoff 2pm, avoid peanuts and whey protein"
 */
export function parsePreferencesPrompt(prompt: string): {
  cutoffs: Partial<MealCutoffs>;
  foodsAvoided: string[];
  summary: string[];
} {
  const cutoffs: Partial<MealCutoffs> = {};
  const summary: string[] = [];
  const text = prompt.toLowerCase();

  // 1. Parse Dinner cutoff
  const dinnerMatch = text.match(/dinner\s+(?:cutoff\s*(?:time)?\s*(?:is)?|cutoff\s*:?)\s*([0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm)?)/i);
  if (dinnerMatch) {
    const t = parseTimeTo24h(dinnerMatch[1]);
    if (t) {
      cutoffs.dinner = t;
      summary.push(`Dinner Cutoff set to ${formatTime12h(t)}`);
    }
  }

  // 2. Parse Breakfast cutoff
  const bfastMatch = text.match(/breakfast\s+(?:cutoff\s*(?:time)?\s*(?:is)?|cutoff\s*:?)\s*([0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm)?)/i);
  if (bfastMatch) {
    const t = parseTimeTo24h(bfastMatch[1]);
    if (t) {
      cutoffs.breakfast = t;
      summary.push(`Breakfast Cutoff set to ${formatTime12h(t)}`);
    }
  }

  // 3. Parse Lunch cutoff
  const lunchMatch = text.match(/lunch\s+(?:cutoff\s*(?:time)?\s*(?:is)?|cutoff\s*:?)\s*([0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm)?)/i);
  if (lunchMatch) {
    const t = parseTimeTo24h(lunchMatch[1]);
    if (t) {
      cutoffs.lunch = t;
      summary.push(`Lunch Cutoff set to ${formatTime12h(t)}`);
    }
  }

  // 4. Parse Mid-morning snack cutoff
  const midMorningMatch = text.match(/(?:mid[- ]?morning|morning snack)\s+(?:cutoff\s*(?:time)?\s*(?:is)?|cutoff\s*:?)\s*([0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm)?)/i);
  if (midMorningMatch) {
    const t = parseTimeTo24h(midMorningMatch[1]);
    if (t) {
      cutoffs.mid_morning_snack = t;
      summary.push(`Mid-Morning Snack Cutoff set to ${formatTime12h(t)}`);
    }
  }

  // 5. Parse Evening snack cutoff
  const eveningMatch = text.match(/(?:evening\s*snack|tea\s*time)\s+(?:cutoff\s*(?:time)?\s*(?:is)?|cutoff\s*:?)\s*([0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm)?)/i);
  if (eveningMatch) {
    const t = parseTimeTo24h(eveningMatch[1]);
    if (t) {
      cutoffs.evening_snack = t;
      summary.push(`Evening Snack Cutoff set to ${formatTime12h(t)}`);
    }
  }

  // 6. Parse Pre-workout & Post-workout cutoff
  const preWorkoutMatch = text.match(/pre[- ]?workout\s+(?:cutoff\s*(?:time)?\s*(?:is)?|cutoff\s*:?)\s*([0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm)?)/i);
  if (preWorkoutMatch) {
    const t = parseTimeTo24h(preWorkoutMatch[1]);
    if (t) {
      cutoffs.pre_workout = t;
      summary.push(`Pre-Workout Cutoff set to ${formatTime12h(t)}`);
    }
  }

  const postWorkoutMatch = text.match(/post[- ]?workout\s+(?:cutoff\s*(?:time)?\s*(?:is)?|cutoff\s*:?)\s*([0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm)?)/i);
  if (postWorkoutMatch) {
    const t = parseTimeTo24h(postWorkoutMatch[1]);
    if (t) {
      cutoffs.post_workout = t;
      summary.push(`Post-Workout Cutoff set to ${formatTime12h(t)}`);
    }
  }

  // 7. Parse Avoided / Excluded Foods
  const avoided: string[] = [];
  const avoidPatterns = [
    /(?:i don't take|i don't eat|i avoid|no|strictly exclude|exclude|avoid)\s+([^.]+)/gi,
  ];

  for (const pat of avoidPatterns) {
    const match = pat.exec(text);
    if (match && match[1]) {
      const phrase = match[1]
        .split(/(?:,|\band\b|\bor\b|&)/i)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 1 && !["cutoff", "time", "food", "plan", "diet", "meals"].includes(s));

      for (const item of phrase) {
        if (!avoided.includes(item)) {
          avoided.push(item);
          summary.push(`Excluded: "${item}"`);
        }
      }
    }
  }

  return {
    cutoffs,
    foodsAvoided: avoided,
    summary,
  };
}

class PreferencesService {
  private preferences: UserPreferences = DEFAULT_USER_PREFERENCES;

  constructor() {
    this.loadFromStorage();
    if (typeof window !== "undefined") {
      window.addEventListener("sarveswar-auth-changed", () => {
        this.loadFromStorage();
      });
    }
  }

  private getStorageKeys(userId?: string): { prefsKey: string; profileKey: string } {
    const id = userId || (typeof window !== "undefined" ? authService.getCurrentUserId() : "usr-sarveswar-primary");
    if (id === "usr-sarveswar-primary" || id === "sarveswar") {
      return {
        prefsKey: STORAGE_PREFS_KEY,
        profileKey: STORAGE_PROFILE_KEY,
      };
    }
    return {
      prefsKey: `${STORAGE_PREFS_KEY}_${id}`,
      profileKey: `${STORAGE_PROFILE_KEY}_${id}`,
    };
  }

  private loadFromStorage(): void {
    if (typeof window === "undefined") return;

    try {
      const id = authService.getCurrentUserId();
      const isSarveswar = id === "usr-sarveswar-primary" || id === "sarveswar";
      const { prefsKey, profileKey } = this.getStorageKeys(id);

      const stored = localStorage.getItem(prefsKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.preferences = {
          cutoffs: { ...DEFAULT_MEAL_CUTOFFS, ...(parsed.cutoffs || {}) },
          foodsAvoided: Array.isArray(parsed.foodsAvoided) ? parsed.foodsAvoided : isSarveswar ? DEFAULT_USER_PREFERENCES.foodsAvoided : [],
          dietaryNotes: parsed.dietaryNotes || (isSarveswar ? DEFAULT_USER_PREFERENCES.dietaryNotes : ""),
        };
        return;
      }

      // Check if user profile has stored dinner cutoff or avoided foods
      const profileStr = localStorage.getItem(profileKey);
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        this.preferences = {
          cutoffs: {
            ...DEFAULT_MEAL_CUTOFFS,
            dinner: profile.preferredDinnerCutoff || "19:00",
          },
          foodsAvoided: Array.isArray(profile.foodsAvoided) ? profile.foodsAvoided : isSarveswar ? DEFAULT_USER_PREFERENCES.foodsAvoided : [],
          dietaryNotes: isSarveswar ? DEFAULT_USER_PREFERENCES.dietaryNotes : "",
        };
        this.savePreferences(this.preferences);
        return;
      }

      // Brand new user default: clean slate without Sarveswar's exclusions
      this.preferences = isSarveswar
        ? DEFAULT_USER_PREFERENCES
        : {
            cutoffs: DEFAULT_MEAL_CUTOFFS,
            foodsAvoided: [],
            dietaryNotes: "Custom diet & fitness schedule",
          };
    } catch {
      this.preferences = DEFAULT_USER_PREFERENCES;
    }
  }

  public getPreferences(): UserPreferences {
    this.loadFromStorage();
    return this.preferences;
  }

  public savePreferences(updates: Partial<UserPreferences>): UserPreferences {
    this.loadFromStorage();

    this.preferences = {
      ...this.preferences,
      ...updates,
      cutoffs: {
        ...this.preferences.cutoffs,
        ...(updates.cutoffs || {}),
      },
      foodsAvoided: updates.foodsAvoided ? Array.from(new Set(updates.foodsAvoided)) : this.preferences.foodsAvoided,
    };

    if (typeof window !== "undefined") {
      try {
        const { prefsKey, profileKey } = this.getStorageKeys();
        localStorage.setItem(prefsKey, JSON.stringify(this.preferences));

        // Sync to cloud
        const currentUserId = authService.getCurrentUserId();
        cloudSyncService.pushPreferences(currentUserId, this.preferences).catch(() => {});

        // Sync with user profile for system-wide harmony
        const profileStr = localStorage.getItem(profileKey);
        if (profileStr) {
          const profile = JSON.parse(profileStr);
          profile.preferredDinnerCutoff = this.preferences.cutoffs.dinner;
          profile.foodsAvoided = this.preferences.foodsAvoided;
          localStorage.setItem(profileKey, JSON.stringify(profile));
        }

        window.dispatchEvent(new CustomEvent("sarveswar-preferences-updated"));
      } catch (err) {
        console.warn("Failed to save preferences:", err);
      }
    }

    return this.preferences;
  }

  /**
   * Evaluates whether a food item logged in a meal category crossed the user's preferred cutoff.
   */
  public checkCutoffCompliance(
    category: MealCategory,
    consumedAtIsoOrTime: string
  ): {
    isPastCutoff: boolean;
    cutoffTime24: string;
    cutoffTime12: string;
    consumedTime24: string;
    consumedTime12: string;
    minutesLate: number;
  } {
    this.loadFromStorage();
    const cutoff24 = this.preferences.cutoffs[category] || "23:59";
    const cutoff12 = formatTime12h(cutoff24);

    // Extract HH:MM from ISO string or time string
    let consumed24 = "12:00";
    if (consumedAtIsoOrTime.includes("T")) {
      consumed24 = consumedAtIsoOrTime.slice(11, 16);
    } else if (consumedAtIsoOrTime.includes(":")) {
      consumed24 = parseTimeTo24h(consumedAtIsoOrTime) || "12:00";
    }

    const consumed12 = formatTime12h(consumed24);

    // Calculate minutes difference
    const [cutH, cutM] = cutoff24.split(":").map((n) => parseInt(n, 10));
    const [actH, actM] = consumed24.split(":").map((n) => parseInt(n, 10));

    const cutoffTotalMins = cutH * 60 + cutM;
    const actualTotalMins = actH * 60 + actM;

    const minutesLate = actualTotalMins - cutoffTotalMins;
    const isPastCutoff = minutesLate > 0;

    return {
      isPastCutoff,
      cutoffTime24: cutoff24,
      cutoffTime12: cutoff12,
      consumedTime24: consumed24,
      consumedTime12: consumed12,
      minutesLate: Math.max(0, minutesLate),
    };
  }

  /**
   * Applies natural-language user prompt directly.
   */
  public applyPrompt(prompt: string): {
    preferences: UserPreferences;
    summary: string[];
  } {
    const parsed = parsePreferencesPrompt(prompt);
    const updated = this.savePreferences({
      cutoffs: {
        ...this.preferences.cutoffs,
        ...parsed.cutoffs,
      },
      foodsAvoided: parsed.foodsAvoided.length > 0
        ? Array.from(new Set([...this.preferences.foodsAvoided, ...parsed.foodsAvoided]))
        : this.preferences.foodsAvoided,
    });

    return {
      preferences: updated,
      summary: parsed.summary,
    };
  }

  public removeAvoidedFood(food: string): UserPreferences {
    const clean = food.trim().toLowerCase();
    const filtered = this.preferences.foodsAvoided.filter((f) => f.toLowerCase() !== clean);
    return this.savePreferences({ foodsAvoided: filtered });
  }

  public addAvoidedFood(food: string): UserPreferences {
    const clean = food.trim().toLowerCase();
    if (!clean) return this.preferences;
    return this.savePreferences({
      foodsAvoided: [...this.preferences.foodsAvoided, clean],
    });
  }
}

export const preferencesService = new PreferencesService();
