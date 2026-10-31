import { diaryService } from "./diary-service";
import { waterService } from "./water-service";
import { exerciseService } from "./exercise-service";
import { weightService } from "./weight-service";
import { getLocalTodayDateString } from "../date/date-service";

export class ExportService {
  /**
   * Generates CSV string for confirmed food log entries.
   */
  public generateFoodLogsCsv(dateRangeDays = 30): string {
    const today = new Date();
    const headers = [
      "Date",
      "Meal Category",
      "Food Name",
      "Quantity",
      "Unit",
      "Preparation",
      "Calories (kcal)",
      "Protein (g)",
      "Carbs (g)",
      "Fat (g)",
      "Fibre (g)",
      "Consumed At",
    ];

    const rows: string[] = [headers.join(",")];

    for (let i = 0; i < dateRangeDays; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const items = diaryService.getEntriesForDate(dateStr);

      for (const item of items) {
        const cleanName = `"${item.foodName.replace(/"/g, '""')}"`;
        const row = [
          item.diaryDate,
          item.mealCategory,
          cleanName,
          item.quantity,
          item.unit,
          item.preparationMethod,
          item.calories,
          item.proteinG,
          item.carbsG,
          item.fatG,
          item.fibreG,
          item.consumedAt,
        ];
        rows.push(row.join(","));
      }
    }

    return rows.join("\n");
  }

  /**
   * Generates CSV string for daily nutrient and water summaries.
   */
  public generateDailyTotalsCsv(dateRangeDays = 30): string {
    const today = new Date();
    const headers = [
      "Date",
      "Total Calories (kcal)",
      "Protein (g)",
      "Carbs (g)",
      "Fat (g)",
      "Fibre (g)",
      "Water Intake (ml)",
    ];

    const rows: string[] = [headers.join(",")];

    for (let i = 0; i < dateRangeDays; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const totals = diaryService.getDailyTotals(dateStr);
      const water = waterService.getTotalWaterForDate(dateStr);

      if (totals.calories > 0 || water > 0) {
        const row = [
          dateStr,
          totals.calories,
          totals.protein,
          totals.carbs,
          totals.fat,
          totals.fibre,
          water,
        ];
        rows.push(row.join(","));
      }
    }

    return rows.join("\n");
  }

  /**
   * Generates CSV string for exercise sessions.
   */
  public generateExerciseCsv(): string {
    const headers = [
      "Session Date",
      "Activity Name",
      "Type",
      "Duration (mins)",
      "Distance (km)",
      "Steps",
      "Estimated Calories Burned",
      "Notes",
    ];

    const rows: string[] = [headers.join(",")];
    const sessions = exerciseService.getAllSessions();

    for (const s of sessions) {
      const cleanName = `"${s.exerciseName.replace(/"/g, '""')}"`;
      const cleanNotes = `"${(s.notes || "").replace(/"/g, '""')}"`;
      const row = [
        s.sessionDate,
        cleanName,
        s.activityType,
        s.durationMinutes,
        s.distanceKm || "",
        s.steps || "",
        s.estimatedCaloriesBurned,
        cleanNotes,
      ];
      rows.push(row.join(","));
    }

    return rows.join("\n");
  }

  /**
   * Generates CSV string for weight measurements.
   */
  public generateWeightCsv(): string {
    const headers = [
      "Measurement Date",
      "Weight (kg)",
      "Waist Circumference (cm)",
      "Body Fat (%)",
      "Reference BMI",
      "Notes",
    ];

    const rows: string[] = [headers.join(",")];
    const weights = weightService.getAllMeasurements();

    for (const w of weights) {
      const { bmi } = weightService.calculateBmi(w.weightKg);
      const cleanNotes = `"${(w.notes || "").replace(/"/g, '""')}"`;
      const row = [
        w.measuredDate,
        w.weightKg,
        w.waistCm || "",
        w.bodyFatPct || "",
        bmi,
        cleanNotes,
      ];
      rows.push(row.join(","));
    }

    return rows.join("\n");
  }
}

export const exportService = new ExportService();
