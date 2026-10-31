import { describe, it, expect } from "vitest";
import { exerciseService } from "@/lib/services/exercise-service";

describe("ExerciseService (MET-based Calorie Estimation)", () => {
  it("estimates strength training calories for 75kg male", () => {
    // 5.0 MET * 75kg * (60/60 hours) = 375 kcal
    const calories = exerciseService.estimateCalories("strength_training", 60, 75.0);
    expect(calories).toBe(375);
  });

  it("estimates walking calories accurately", () => {
    // 3.5 MET * 75kg * (30/60 hours) = 131.25 -> 131 kcal
    const calories = exerciseService.estimateCalories("walking", 30, 75.0);
    expect(calories).toBe(131);
  });

  it("logs workout session and sets isCalorieEstimate flag", () => {
    const session = exerciseService.logSession(
      {
        sessionDate: "2026-11-02",
        exerciseName: "Squats & Core",
        activityType: "strength_training",
        durationMinutes: 45,
        steps: 1200,
        notes: "Heavy leg day",
      },
      75.0
    );

    expect(session.id).toBeDefined();
    expect(session.isCalorieEstimate).toBe(true);
    expect(session.estimatedCaloriesBurned).toBeGreaterThan(200);
  });
});
