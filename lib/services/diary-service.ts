import { NutrientValues } from "./types";
import { getLocalTodayDateString } from "../date/date-service";
import { authService } from "./auth-service";
import { cloudSyncService } from "./cloud-sync-service";

export type MealCategory =
  | "early_morning"
  | "breakfast"
  | "mid_morning_snack"
  | "lunch"
  | "evening_snack"
  | "pre_workout"
  | "post_workout"
  | "dinner"
  | "other";

export interface FoodLogItem {
  id: string;
  diaryDate: string; // YYYY-MM-DD in Asia/Kolkata
  mealCategory: MealCategory;
  foodName: string;
  quantity: number;
  unit: string;
  preparationMethod: string;
  isCooked: boolean;
  confidenceLabel: "verified" | "estimated";
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
  consumedAt: string; // ISO string
  idempotencyKey?: string;
  notes?: string;
}

const STORAGE_DIARY_KEY = "sarveswar_diary_entries";
const STORAGE_WATER_KEY = "sarveswar_water_logs";

/**
 * DiaryService: State & persistence engine.
 * Starts with 0 entries and 0 water by default so daily intake begins fresh at 0.
 * Persists user logged entries to localStorage when running in browser.
 */
class DiaryService {
  private entries: FoodLogItem[] = [];
  private waterLogs: Record<string, number> = {};

  constructor() {
    this.entries = [];
    this.waterLogs = {};
    this.loadFromStorage();

    if (typeof window !== "undefined") {
      window.addEventListener("sarveswar-auth-changed", () => {
        this.loadFromStorage();
      });
    }
  }

  private getStorageKeys(userId?: string): { diaryKey: string; waterKey: string } {
    const id = userId || (typeof window !== "undefined" ? authService.getCurrentUserId() : "usr-sarveswar5-primary");
    if (id === "usr-sarveswar-primary" || id === "sarveswar" || id === "sarveswar5" || id === "usr-sarveswar5-primary") {
      return {
        diaryKey: STORAGE_DIARY_KEY,
        waterKey: STORAGE_WATER_KEY,
      };
    }
    return {
      diaryKey: `${STORAGE_DIARY_KEY}_${id}`,
      waterKey: `${STORAGE_WATER_KEY}_${id}`,
    };
  }

  private loadFromStorage(userId?: string) {
    if (typeof window !== "undefined") {
      try {
        const { diaryKey, waterKey } = this.getStorageKeys(userId);
        const storedEntries = window.localStorage.getItem(diaryKey);
        if (storedEntries) {
          const parsed = JSON.parse(storedEntries);
          if (Array.isArray(parsed)) {
            this.entries = parsed;
          } else {
            this.entries = [];
          }
        } else {
          this.entries = [];
        }

        const storedWater = window.localStorage.getItem(waterKey);
        if (storedWater) {
          const parsedWater = JSON.parse(storedWater);
          if (parsedWater && typeof parsedWater === "object") {
            this.waterLogs = parsedWater;
          } else {
            this.waterLogs = {};
          }
        } else {
          this.waterLogs = {};
        }
      } catch (err) {
        console.warn("Could not load diary from localStorage:", err);
      }
    }
  }

  private saveToStorage(userId?: string) {
    if (typeof window !== "undefined") {
      try {
        const { diaryKey, waterKey } = this.getStorageKeys(userId);
        window.localStorage.setItem(diaryKey, JSON.stringify(this.entries));
        window.localStorage.setItem(waterKey, JSON.stringify(this.waterLogs));
        window.dispatchEvent(new CustomEvent("sarveswar-diary-updated"));
      } catch (err) {
        console.warn("Could not save diary to localStorage:", err);
      }
    }
  }

  public getEntriesForDate(dateStr: string): FoodLogItem[] {
    this.loadFromStorage();
    return this.entries.filter((e) => e.diaryDate === dateStr);
  }

  public getWaterForDate(dateStr: string): number {
    this.loadFromStorage();
    return this.waterLogs[dateStr] || 0;
  }

  public logWater(dateStr: string, ml: number): number {
    this.loadFromStorage();
    this.waterLogs[dateStr] = Math.max(0, (this.waterLogs[dateStr] || 0) + ml);
    this.saveToStorage();
    return this.waterLogs[dateStr];
  }

  public setWater(dateStr: string, ml: number): number {
    this.loadFromStorage();
    this.waterLogs[dateStr] = Math.max(0, ml);
    this.saveToStorage();
    return this.waterLogs[dateStr];
  }

  public addEntry(entry: Omit<FoodLogItem, "id">): FoodLogItem {
    this.loadFromStorage();
    const newEntry: FoodLogItem = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
    this.entries.push(newEntry);
    this.saveToStorage();

    if (typeof window !== "undefined") {
      const currentUserId = authService.getCurrentUserId();
      cloudSyncService.pushFoodEntry(currentUserId, newEntry).catch(() => {});
    }

    return newEntry;
  }

  public addMultipleEntries(newEntries: Omit<FoodLogItem, "id">[]): FoodLogItem[] {
    this.loadFromStorage();
    const created: FoodLogItem[] = newEntries.map((item) => ({
      ...item,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    }));
    this.entries.push(...created);
    this.saveToStorage();

    if (typeof window !== "undefined") {
      const currentUserId = authService.getCurrentUserId();
      created.forEach((item) => {
        cloudSyncService.pushFoodEntry(currentUserId, item).catch(() => {});
      });
    }

    return created;
  }

  public editEntry(id: string, updates: Partial<FoodLogItem>): FoodLogItem | null {
    this.loadFromStorage();
    const idx = this.entries.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    this.entries[idx] = { ...this.entries[idx], ...updates };
    this.saveToStorage();

    if (typeof window !== "undefined") {
      const currentUserId = authService.getCurrentUserId();
      cloudSyncService.pushFoodEntry(currentUserId, this.entries[idx]).catch(() => {});
    }

    return this.entries[idx];
  }

  public deleteEntry(id: string): boolean {
    this.loadFromStorage();
    const initialLen = this.entries.length;
    this.entries = this.entries.filter((e) => e.id !== id);
    const deleted = this.entries.length < initialLen;
    if (deleted) {
      this.saveToStorage();
      if (typeof window !== "undefined") {
        cloudSyncService.deleteFoodEntry(id).catch(() => {});
      }
    }
    return deleted;
  }

  public duplicateEntry(id: string): FoodLogItem | null {
    this.loadFromStorage();
    const original = this.entries.find((e) => e.id === id);
    if (!original) return null;
    const duplicated: FoodLogItem = {
      ...original,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
    this.entries.push(duplicated);
    this.saveToStorage();
    return duplicated;
  }

  public moveEntryCategory(id: string, newCategory: MealCategory): FoodLogItem | null {
    return this.editEntry(id, { mealCategory: newCategory });
  }

  public copyMealToDate(sourceCategory: MealCategory, sourceDate: string, targetDate: string): FoodLogItem[] {
    this.loadFromStorage();
    const mealItems = this.entries.filter((e) => e.diaryDate === sourceDate && e.mealCategory === sourceCategory);
    const newItems: FoodLogItem[] = mealItems.map((item) => ({
      ...item,
      id: `copy-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      diaryDate: targetDate,
      consumedAt: `${targetDate}T12:00:00+05:30`,
    }));
    this.entries.push(...newItems);
    this.saveToStorage();
    return newItems;
  }

  public clearDate(dateStr: string): void {
    this.loadFromStorage();
    this.entries = this.entries.filter((e) => e.diaryDate !== dateStr);
    delete this.waterLogs[dateStr];
    this.saveToStorage();
  }

  public clearAll(): void {
    this.entries = [];
    this.waterLogs = {};
    this.saveToStorage();
  }

  public getDailyTotals(dateStr: string): NutrientValues {
    const dayItems = this.getEntriesForDate(dateStr);
    const totals: NutrientValues = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fibre: 0,
    };

    for (const item of dayItems) {
      totals.calories += item.calories;
      totals.protein = Math.round((totals.protein + item.proteinG) * 10) / 10;
      totals.carbs = Math.round((totals.carbs + item.carbsG) * 10) / 10;
      totals.fat = Math.round((totals.fat + item.fatG) * 10) / 10;
      totals.fibre = Math.round((totals.fibre + item.fibreG) * 10) / 10;
    }

    return totals;
  }

  /**
   * Retrieves food entries for a specific user ID and optional date (used by Admin Inspector & Reports).
   */
  public getEntriesForUser(userId?: string, dateStr?: string): FoodLogItem[] {
    const targetUserId = userId || (typeof window !== "undefined" ? authService.getCurrentUserId() : "usr-sarveswar-primary");
    const { diaryKey } = this.getStorageKeys(targetUserId);
    if (typeof window !== "undefined") {
      try {
        const userSpecific = window.localStorage.getItem(diaryKey);
        if (userSpecific) {
          const parsed: FoodLogItem[] = JSON.parse(userSpecific);
          if (Array.isArray(parsed)) {
            return dateStr ? parsed.filter((e) => e.diaryDate === dateStr) : parsed;
          }
        }
      } catch {}
    }
    // Fallback to active entries only if target matches Sarveswar
    if (targetUserId === "usr-sarveswar-primary" || targetUserId === "sarveswar") {
      return dateStr ? this.getEntriesForDate(dateStr) : this.entries;
    }
    return [];
  }

  /**
   * Calculates nutrient totals for a specific user and date.
   */
  public getUserDailyTotals(userId: string | undefined, dateStr: string): NutrientValues {
    const items = this.getEntriesForUser(userId, dateStr);
    const totals: NutrientValues = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fibre: 0,
    };

    for (const item of items) {
      totals.calories += item.calories;
      totals.protein = Math.round((totals.protein + item.proteinG) * 10) / 10;
      totals.carbs = Math.round((totals.carbs + item.carbsG) * 10) / 10;
      totals.fat = Math.round((totals.fat + item.fatG) * 10) / 10;
      totals.fibre = Math.round((totals.fibre + item.fibreG) * 10) / 10;
    }

    return totals;
  }
}

export const diaryService = new DiaryService();
