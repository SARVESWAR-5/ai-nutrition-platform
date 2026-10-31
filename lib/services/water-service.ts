import { DEFAULT_NUTRITION_TARGETS } from "./goal-service";
import { authService } from "./auth-service";

export interface WaterLogRecord {
  id: string;
  dateStr: string;
  amountMl: number;
  loggedAt: string;
}

const STORAGE_WATER_RECORDS_KEY = "sarveswar_water_records";

class WaterService {
  private logs: WaterLogRecord[] = [];

  constructor() {
    this.logs = [];
    this.loadFromStorage();
    if (typeof window !== "undefined") {
      window.addEventListener("sarveswar-auth-changed", () => {
        this.loadFromStorage();
      });
    }
  }

  private getStorageKey(userId?: string): string {
    const id = userId || (typeof window !== "undefined" ? authService.getCurrentUserId() : "usr-sarveswar-primary");
    if (id === "usr-sarveswar-primary" || id === "sarveswar") {
      return STORAGE_WATER_RECORDS_KEY;
    }
    return `${STORAGE_WATER_RECORDS_KEY}_${id}`;
  }

  private loadFromStorage() {
    if (typeof window !== "undefined") {
      try {
        const key = this.getStorageKey();
        const stored = window.localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            this.logs = parsed;
          } else {
            this.logs = [];
          }
        } else {
          this.logs = [];
        }
      } catch (err) {
        console.warn("Could not load water records from localStorage:", err);
      }
    }
  }

  private saveToStorage() {
    if (typeof window !== "undefined") {
      try {
        const key = this.getStorageKey();
        window.localStorage.setItem(key, JSON.stringify(this.logs));
      } catch (err) {
        console.warn("Could not save water records to localStorage:", err);
      }
    }
  }

  public getWaterLogsForDate(dateStr: string): WaterLogRecord[] {
    this.loadFromStorage();
    return this.logs.filter((l) => l.dateStr === dateStr);
  }

  public getTotalWaterForDate(dateStr: string): number {
    return this.getWaterLogsForDate(dateStr).reduce((acc, l) => acc + l.amountMl, 0);
  }

  public logWater(dateStr: string, amountMl: number): WaterLogRecord {
    if (amountMl <= 0) throw new Error("Water amount must be positive");
    this.loadFromStorage();
    const record: WaterLogRecord = {
      id: `w-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      dateStr,
      amountMl,
      loggedAt: new Date().toISOString(),
    };
    this.logs.push(record);
    this.saveToStorage();
    return record;
  }

  public deleteWaterLog(id: string): boolean {
    this.loadFromStorage();
    const initialLen = this.logs.length;
    this.logs = this.logs.filter((l) => l.id !== id);
    const deleted = this.logs.length < initialLen;
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  public clearDate(dateStr: string): void {
    this.loadFromStorage();
    this.logs = this.logs.filter((l) => l.dateStr !== dateStr);
    this.saveToStorage();
  }

  public getWaterProgress(dateStr: string, targetMl: number = DEFAULT_NUTRITION_TARGETS.waterMl) {
    const consumed = this.getTotalWaterForDate(dateStr);
    const remaining = Math.max(0, targetMl - consumed);
    const excess = Math.max(0, consumed - targetMl);
    const percent = targetMl > 0 ? Math.min(100, Math.round((consumed / targetMl) * 100)) : 0;

    return {
      target: targetMl,
      consumed,
      remaining,
      excess,
      percentComplete: percent,
    };
  }

  public getUserLogs(userId: string): WaterLogRecord[] {
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

  public getUserWaterForDate(userId: string, dateStr: string): number {
    return this.getUserLogs(userId)
      .filter((l) => l.dateStr === dateStr)
      .reduce((acc, l) => acc + l.amountMl, 0);
  }
}

export const waterService = new WaterService();
