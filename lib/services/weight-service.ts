import { getLocalTodayDateString } from "../date/date-service";
import { SARVESWAR_PROFILE_DEFAULTS } from "./profile-service";
import { authService } from "./auth-service";
import { cloudSyncService } from "./cloud-sync-service";

export interface WeightMeasurement {
  id: string;
  measuredDate: string; // YYYY-MM-DD
  weightKg: number;
  waistCm?: number;
  bodyFatPct?: number;
  notes?: string;
  loggedAt: string;
}

const STORAGE_WEIGHT_KEY = "sarveswar_weight_logs";

const DEFAULT_SARVESWAR_MEASUREMENTS: WeightMeasurement[] = [
  { id: "wt-1", measuredDate: "2026-10-15", weightKg: 75.8, waistCm: 84.0, loggedAt: "2026-10-15T07:00:00+05:30" },
  { id: "wt-2", measuredDate: "2026-10-18", weightKg: 75.6, waistCm: 83.8, loggedAt: "2026-10-18T07:00:00+05:30" },
  { id: "wt-3", measuredDate: "2026-10-22", weightKg: 75.3, waistCm: 83.5, loggedAt: "2026-10-22T07:00:00+05:30" },
  { id: "wt-4", measuredDate: "2026-10-25", weightKg: 75.1, waistCm: 83.2, loggedAt: "2026-10-25T07:00:00+05:30" },
  { id: "wt-5", measuredDate: "2026-10-29", weightKg: 75.0, waistCm: 83.0, bodyFatPct: 15.5, notes: "Target weight hit with good strength.", loggedAt: "2026-10-29T07:00:00+05:30" },
];

class WeightService {
  private measurements: WeightMeasurement[] = [];

  constructor() {
    this.loadFromStorage();
    if (typeof window !== "undefined") {
      window.addEventListener("sarveswar-auth-changed", () => {
        this.loadFromStorage();
      });
    }
  }

  private getStorageKey(userId?: string): string {
    const id = userId || (typeof window !== "undefined" ? authService.getCurrentUserId() : "usr-sarveswar5-primary");
    if (id === "usr-sarveswar-primary" || id === "sarveswar" || id === "sarveswar5" || id === "usr-sarveswar5-primary") {
      return STORAGE_WEIGHT_KEY;
    }
    return `${STORAGE_WEIGHT_KEY}_${id}`;
  }

  private loadFromStorage() {
    if (typeof window !== "undefined") {
      try {
        const id = authService.getCurrentUserId();
        const key = this.getStorageKey(id);
        const stored = window.localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            this.measurements = parsed;
            return;
          }
        }

        // If Sarveswar or default session, seed historical demo measurements
        if (
          id === "usr-sarveswar-primary" ||
          id === "sarveswar" ||
          id === "sarveswar5" ||
          id === "usr-sarveswar5-primary"
        ) {
          this.measurements = [...DEFAULT_SARVESWAR_MEASUREMENTS];
          window.localStorage.setItem(key, JSON.stringify(this.measurements));
        } else {
          // Any new registered user starts completely fresh with 0 entries!
          this.measurements = [];
        }
      } catch (e) {
        console.warn("Could not load measurements from storage:", e);
      }
    } else {
      this.measurements = [...DEFAULT_SARVESWAR_MEASUREMENTS];
    }
  }

  private saveToStorage() {
    if (typeof window !== "undefined") {
      try {
        const id = authService.getCurrentUserId();
        const key = this.getStorageKey(id);
        window.localStorage.setItem(key, JSON.stringify(this.measurements));
        window.dispatchEvent(new CustomEvent("sarveswar-weight-updated"));
      } catch (e) {
        console.warn("Could not save measurements:", e);
      }
    }
  }

  public getAllMeasurements(): WeightMeasurement[] {
    this.loadFromStorage();
    return [...this.measurements].sort((a, b) => b.measuredDate.localeCompare(a.measuredDate));
  }

  public logMeasurement(m: Omit<WeightMeasurement, "id" | "loggedAt">): WeightMeasurement {
    this.loadFromStorage();
    const newRecord: WeightMeasurement = {
      ...m,
      id: `wt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      loggedAt: new Date().toISOString(),
    };
    this.measurements.unshift(newRecord);
    this.saveToStorage();

    if (typeof window !== "undefined") {
      const currentUserId = authService.getCurrentUserId();
      cloudSyncService.pushWeightMeasurement(currentUserId, newRecord).catch(() => {});
    }

    return newRecord;
  }

  /**
   * Calculates Body Mass Index (BMI) as a reference measure.
   * BMI = weight_kg / (height_m)^2
   */
  public calculateBmi(weightKg: number, heightCm: number = SARVESWAR_PROFILE_DEFAULTS.heightCm || 175.5): {
    bmi: number;
    category: "underweight" | "normal" | "overweight" | "obese";
  } {
    const heightM = heightCm / 100;
    const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;

    let category: "underweight" | "normal" | "overweight" | "obese" = "normal";
    if (bmi < 18.5) category = "underweight";
    else if (bmi < 24.9) category = "normal";
    else if (bmi < 29.9) category = "overweight";
    else category = "obese";

    return { bmi, category };
  }

  /**
   * Computes moving average and delta against target weight.
   */
  public getProgressStats(targetWeightKg: number = SARVESWAR_PROFILE_DEFAULTS.targetWeightKg || 75.0) {
    this.loadFromStorage();
    const records = this.getAllMeasurements();
    if (records.length === 0) {
      // Check user's profile if they entered their weight during onboarding
      if (typeof window !== "undefined") {
        try {
          const id = authService.getCurrentUserId();
          const profileStr =
            localStorage.getItem(`sarveswar_user_profile_${id}`) ||
            (id === "usr-sarveswar-primary" ? localStorage.getItem("sarveswar_user_profile") : null);
          if (profileStr) {
            const p = JSON.parse(profileStr);
            if (p.currentWeightKg) {
              const currentW = Number(p.currentWeightKg);
              const targetW = Number(p.targetWeightKg) || targetWeightKg;
              const { bmi } = this.calculateBmi(currentW, Number(p.heightCm) || 175.5);
              return {
                currentWeight: currentW,
                targetWeight: targetW,
                movingAverageKg: currentW,
                deltaKg: Math.round((currentW - targetW) * 10) / 10,
                bmi,
                latestDate: null,
                isNewUser: true,
              };
            }
          }
        } catch {}
      }

      // If no measurements and no profile weight, return null/placeholder
      return {
        currentWeight: null as number | null,
        targetWeight: targetWeightKg,
        movingAverageKg: null as number | null,
        deltaKg: null as number | null,
        bmi: null as number | null,
        latestDate: null,
        isNewUser: true,
      };
    }

    const latest = records[0];
    const deltaKg = Math.round((latest.weightKg - targetWeightKg) * 10) / 10;
    const { bmi } = this.calculateBmi(latest.weightKg);

    // Calculate 7-day average from latest records
    const recent = records.slice(0, 3);
    const avg = Math.round((recent.reduce((acc, r) => acc + r.weightKg, 0) / recent.length) * 10) / 10;

    return {
      currentWeight: latest.weightKg,
      targetWeight: targetWeightKg,
      movingAverageKg: avg,
      deltaKg,
      bmi,
      latestDate: latest.measuredDate,
      isNewUser: false,
    };
  }

  public getUserMeasurements(userId: string): WeightMeasurement[] {
    if (typeof window === "undefined") return [];
    try {
      const key = this.getStorageKey(userId);
      const stored = window.localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }
}

export const weightService = new WeightService();
