import { describe, it, expect, beforeEach } from "vitest";
import { authService } from "@/lib/services/auth-service";
import { weightService } from "@/lib/services/weight-service";
import { diaryService } from "@/lib/services/diary-service";
import { preferencesService } from "@/lib/services/preferences-service";
import { waterService } from "@/lib/services/water-service";
import { exerciseService } from "@/lib/services/exercise-service";
import { getLocalTodayDateString } from "@/lib/date/date-service";

describe("Multi-User Account Isolation", () => {
  beforeEach(() => {
    authService.logout();
  });

  it("ensures a new account (Krishna) starts with completely fresh and isolated data", () => {
    // 1. Sign up brand new user Krishna
    const krishnaUser = `krishna_${Date.now()}`;
    const signupRes = authService.signup({
      name: "Krishna",
      username: krishnaUser,
      email: `${krishnaUser}@example.com`,
      password: "krishnaPassword123",
    });

    expect(signupRes.success).toBe(true);
    expect(signupRes.user?.id).toBeDefined();

    // Log in as Krishna
    authService.login(krishnaUser, "krishnaPassword123");
    expect(authService.getCurrentUser()?.username).toBe(krishnaUser);

    // 2. Weight measurements must be EMPTY for Krishna (not Sarveswar's 5 entries)
    const krishnaMeasurements = weightService.getAllMeasurements();
    expect(krishnaMeasurements).toHaveLength(0);

    const stats = weightService.getProgressStats();
    expect(stats.isNewUser).toBe(true);
    expect(stats.currentWeight).toBeNull();

    // 3. Food Diary must be EMPTY for Krishna
    const today = getLocalTodayDateString();
    const krishnaDiary = diaryService.getEntriesForDate(today);
    expect(krishnaDiary).toHaveLength(0);

    const krishnaTotals = diaryService.getDailyTotals(today);
    expect(krishnaTotals.calories).toBe(0);
    expect(krishnaTotals.protein).toBe(0);

    // 4. Preferences: Krishna does NOT have Sarveswar's whey protein exclusion by default
    const krishnaPrefs = preferencesService.getPreferences();
    expect(krishnaPrefs.foodsAvoided).toEqual([]);

    // 5. Water logs must be 0 for Krishna
    const krishnaWater = waterService.getWaterLogsForDate(today);
    expect(krishnaWater).toHaveLength(0);

    // 6. Exercise sessions must be 0 for Krishna
    const krishnaExercise = exerciseService.getSessionsForDate(today);
    expect(krishnaExercise).toHaveLength(0);

    // 7. Krishna logs a personal measurement
    weightService.logMeasurement({
      measuredDate: today,
      weightKg: 68.5,
      waistCm: 79.0,
      notes: "Krishna first weigh in",
    });

    expect(weightService.getAllMeasurements()).toHaveLength(1);
    expect(weightService.getAllMeasurements()[0].weightKg).toBe(68.5);

    // 8. Now switch back to Sarveswar: Sarveswar's records must remain intact!
    authService.login("sarveswar", "sarveswar123");
    expect(authService.getCurrentUser()?.username).toBe("sarveswar");

    const sarveswarMeasurements = weightService.getAllMeasurements();
    // Sarveswar still has his original measurements, not Krishna's 68.5kg
    expect(sarveswarMeasurements.length).toBeGreaterThanOrEqual(5);
    expect(sarveswarMeasurements[0].weightKg).toBe(75.0);
  });
});
