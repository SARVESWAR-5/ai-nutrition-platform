import { describe, it, expect } from "vitest";
import { weightService } from "@/lib/services/weight-service";

describe("WeightService & Reference BMI", () => {
  it("calculates reference BMI accurately for 75kg at 175.5cm", () => {
    // 75 / (1.755^2) = 75 / 3.080025 = 24.35 -> 24.4 BMI
    const { bmi, category } = weightService.calculateBmi(75.0, 175.5);
    expect(bmi).toBe(24.4);
    expect(category).toBe("normal");
  });

  it("identifies progress statistics against target weight", () => {
    const stats = weightService.getProgressStats(75.0);
    expect(stats.currentWeight).toBe(75.0);
    expect(stats.targetWeight).toBe(75.0);
    expect(stats.deltaKg).toBe(0);
    expect(stats.movingAverageKg).toBeGreaterThan(70);
  });
});
