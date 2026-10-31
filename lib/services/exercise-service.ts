import { getLocalTodayDateString } from "../date/date-service";
import { authService } from "./auth-service";

export type ExerciseType = "strength_training" | "walking" | "running" | "cycling" | "swimming" | "cardio" | "sports";

export interface SetRepRecord {
  setNumber: number;
  weightKg: number;
  reps: number;
}

export interface ExerciseSession {
  id: string;
  sessionDate: string; // YYYY-MM-DD
  exerciseName: string;
  activityType: ExerciseType;
  durationMinutes: number;
  distanceKm?: number;
  steps?: number;
  setsReps?: SetRepRecord[];
  estimatedCaloriesBurned: number;
  isCalorieEstimate: boolean;
  notes?: string;
  loggedAt: string;
}

// Standard MET values for activities
export const ACTIVITY_MET_VALUES: Record<ExerciseType, number> = {
  strength_training: 5.0, // Weight lifting, bodybuilding
  walking: 3.5, // Brisk walking
  running: 8.5, // Moderate pace jog/run
  cycling: 6.8, // Moderate cycling
  swimming: 7.0, // Freestyle laps
  cardio: 6.0, // HIIT / circuit training
  sports: 7.0, // Badminton, football
};

const STORAGE_EXERCISE_KEY = "sarveswar_exercise_sessions";

class ExerciseService {
  private sessions: ExerciseSession[] = [];

  constructor() {
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
      return STORAGE_EXERCISE_KEY;
    }
    return `${STORAGE_EXERCISE_KEY}_${id}`;
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
            this.sessions = parsed;
            return;
          }
        }

        // Only seed Sarveswar's sessions for Sarveswar
        if (id === "usr-sarveswar-primary" || id === "sarveswar") {
          const today = getLocalTodayDateString();
          this.sessions = [
            {
              id: "ex-1",
              sessionDate: today,
              exerciseName: "Upper Body Strength Workout (Chest & Triceps)",
              activityType: "strength_training",
              durationMinutes: 55,
              setsReps: [
                { setNumber: 1, weightKg: 60, reps: 10 },
                { setNumber: 2, weightKg: 70, reps: 8 },
                { setNumber: 3, weightKg: 75, reps: 6 },
                { setNumber: 4, weightKg: 75, reps: 6 },
              ],
              estimatedCaloriesBurned: 344,
              isCalorieEstimate: true,
              notes: "Solid bench press session. Good energy.",
              loggedAt: `${today}T18:00:00+05:30`,
            },
            {
              id: "ex-2",
              sessionDate: today,
              exerciseName: "Evening Campus Walk",
              activityType: "walking",
              durationMinutes: 40,
              distanceKm: 3.2,
              steps: 4500,
              estimatedCaloriesBurned: 175,
              isCalorieEstimate: true,
              notes: "Brisk pace after dinner.",
              loggedAt: `${today}T19:30:00+05:30`,
            },
          ];
          window.localStorage.setItem(key, JSON.stringify(this.sessions));
        } else {
          // Any new user starts with 0 sessions
          this.sessions = [];
        }
      } catch (err) {
        console.warn("Could not load exercises from localStorage:", err);
      }
    } else {
      const today = getLocalTodayDateString();
      this.sessions = [
        {
          id: "ex-1",
          sessionDate: today,
          exerciseName: "Upper Body Strength Workout (Chest & Triceps)",
          activityType: "strength_training",
          durationMinutes: 55,
          setsReps: [
            { setNumber: 1, weightKg: 60, reps: 10 },
            { setNumber: 2, weightKg: 70, reps: 8 },
            { setNumber: 3, weightKg: 75, reps: 6 },
            { setNumber: 4, weightKg: 75, reps: 6 },
          ],
          estimatedCaloriesBurned: 344,
          isCalorieEstimate: true,
          notes: "Solid bench press session. Good energy.",
          loggedAt: `${today}T18:00:00+05:30`,
        },
      ];
    }
  }

  private saveToStorage() {
    if (typeof window !== "undefined") {
      try {
        const key = this.getStorageKey();
        window.localStorage.setItem(key, JSON.stringify(this.sessions));
      } catch (err) {
        console.warn("Could not save exercises to localStorage:", err);
      }
    }
  }

  /**
   * Computes estimated calories burned using MET formula:
   * Calories = MET * weight_kg * (duration_minutes / 60)
   * Clearly labeled as an estimate.
   */
  public estimateCalories(activityType: ExerciseType, durationMinutes: number, bodyWeightKg: number = 75.0): number {
    const met = ACTIVITY_MET_VALUES[activityType] || 4.0;
    const hours = durationMinutes / 60;
    return Math.round(met * bodyWeightKg * hours);
  }

  public getSessionsForDate(dateStr: string): ExerciseSession[] {
    return this.sessions.filter((s) => s.sessionDate === dateStr);
  }

  public getAllSessions(): ExerciseSession[] {
    return this.sessions;
  }

  public logSession(session: Omit<ExerciseSession, "id" | "estimatedCaloriesBurned" | "isCalorieEstimate" | "loggedAt">, bodyWeightKg: number = 75.0): ExerciseSession {
    this.loadFromStorage();
    const estimated = this.estimateCalories(session.activityType, session.durationMinutes, bodyWeightKg);
    const newSession: ExerciseSession = {
      ...session,
      id: `ex-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      estimatedCaloriesBurned: estimated,
      isCalorieEstimate: true,
      loggedAt: new Date().toISOString(),
    };
    this.sessions.unshift(newSession);
    this.saveToStorage();
    return newSession;
  }

  public deleteSession(id: string): boolean {
    this.loadFromStorage();
    const initialLen = this.sessions.length;
    this.sessions = this.sessions.filter((s) => s.id !== id);
    const deleted = this.sessions.length < initialLen;
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  public getDailySummary(dateStr: string) {
    const list = this.getSessionsForDate(dateStr);
    const totalMinutes = list.reduce((acc, s) => acc + s.durationMinutes, 0);
    const totalCalories = list.reduce((acc, s) => acc + s.estimatedCaloriesBurned, 0);
    const totalSteps = list.reduce((acc, s) => acc + (s.steps || 0), 0);

    return {
      sessionCount: list.length,
      totalMinutes,
      totalCalories,
      totalSteps,
    };
  }

  public getUserSessions(userId: string): ExerciseSession[] {
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

  public getUserSessionsForDate(userId: string, dateStr: string): ExerciseSession[] {
    return this.getUserSessions(userId).filter((s) => s.sessionDate === dateStr);
  }
}

export const exerciseService = new ExerciseService();
