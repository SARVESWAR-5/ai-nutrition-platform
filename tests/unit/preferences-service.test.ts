import { describe, it, expect, beforeEach } from "vitest";
import {
  preferencesService,
  parsePreferencesPrompt,
  parseTimeTo24h,
  formatTime12h,
  DEFAULT_MEAL_CUTOFFS,
} from "@/lib/services/preferences-service";

describe("PreferencesService & Dynamic Meal Cutoffs", () => {
  beforeEach(() => {
    preferencesService.savePreferences({
      cutoffs: { ...DEFAULT_MEAL_CUTOFFS },
      foodsAvoided: ["whey protein", "squid"],
    });
  });

  it("normalizes and converts between 12-hour and 24-hour time strings correctly", () => {
    expect(parseTimeTo24h("7:00pm")).toBe("19:00");
    expect(parseTimeTo24h("7pm")).toBe("19:00");
    expect(parseTimeTo24h("08:30 am")).toBe("08:30");
    expect(parseTimeTo24h("12:00 pm")).toBe("12:00");
    expect(parseTimeTo24h("12:00 am")).toBe("00:00");

    expect(formatTime12h("19:00")).toBe("07:00 PM");
    expect(formatTime12h("08:30")).toBe("08:30 AM");
    expect(formatTime12h("12:00")).toBe("12:00 PM");
    expect(formatTime12h("14:30")).toBe("02:30 PM");
  });

  it("parses conversational prompt with custom meal cutoffs and avoided foods", () => {
    const prompt =
      "My dinner cutoff time is 7:00pm, breakfast cutoff is 9:30am, lunch cutoff is 2:00pm, and I don't take whey protein, squid, and mushrooms";
    const parsed = parsePreferencesPrompt(prompt);

    expect(parsed.cutoffs.dinner).toBe("19:00");
    expect(parsed.cutoffs.breakfast).toBe("09:30");
    expect(parsed.cutoffs.lunch).toBe("14:00");
    expect(parsed.foodsAvoided).toContain("whey protein");
    expect(parsed.foodsAvoided).toContain("squid");
    expect(parsed.foodsAvoided).toContain("mushrooms");
  });

  it("applies natural-language prompt directly and persists updated preferences", () => {
    const res = preferencesService.applyPrompt(
      "dinner cutoff 8:00pm and strictly exclude peanuts"
    );

    expect(res.preferences.cutoffs.dinner).toBe("20:00");
    expect(res.preferences.foodsAvoided).toContain("peanuts");

    const current = preferencesService.getPreferences();
    expect(current.cutoffs.dinner).toBe("20:00");
    expect(current.foodsAvoided).toContain("peanuts");
  });

  it("accurately detects when a meal is logged on time vs past the preferred cutoff", () => {
    // Cutoff set to 19:00 (7:00 PM)
    preferencesService.savePreferences({
      cutoffs: { ...DEFAULT_MEAL_CUTOFFS, dinner: "19:00" },
    });

    // On time (e.g. 18:30 IST)
    const onTimeCheck = preferencesService.checkCutoffCompliance("dinner", "2026-10-31T18:30:00+05:30");
    expect(onTimeCheck.isPastCutoff).toBe(false);
    expect(onTimeCheck.minutesLate).toBe(0);

    // Late (e.g. 19:45 IST -> 45 minutes past cutoff)
    const lateCheck = preferencesService.checkCutoffCompliance("dinner", "2026-10-31T19:45:00+05:30");
    expect(lateCheck.isPastCutoff).toBe(true);
    expect(lateCheck.minutesLate).toBe(45);
    expect(lateCheck.cutoffTime12).toBe("07:00 PM");
    expect(lateCheck.consumedTime12).toBe("07:45 PM");
  });

  it("adds and removes avoided foods dynamically", () => {
    preferencesService.addAvoidedFood("tofu");
    expect(preferencesService.getPreferences().foodsAvoided).toContain("tofu");

    preferencesService.removeAvoidedFood("tofu");
    expect(preferencesService.getPreferences().foodsAvoided).not.toContain("tofu");
  });
});
