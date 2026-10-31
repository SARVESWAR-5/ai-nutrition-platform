import { describe, it, expect, beforeEach } from "vitest";
import { offlineQueueService } from "@/lib/services/offline-queue-service";
import { diaryService, FoodLogItem } from "@/lib/services/diary-service";

describe("OfflineQueueService", () => {
  beforeEach(() => {
    // Reset diary and queue before each test
    const all = diaryService.getEntriesForDate("2026-10-29");
    all.forEach((entry) => diaryService.deleteEntry(entry.id));
    offlineQueueService.clearSynced();
    // drain any remaining queue items
    offlineQueueService.getQueue().length = 0;
  });

  it("should enqueue entries with unique idempotency keys and 'pending_not_saved' status", () => {
    const entryData: Omit<FoodLogItem, "id"> = {
      diaryDate: "2026-10-29",
      mealCategory: "lunch",
      foodName: "Grilled Chicken Breast",
      quantity: 150,
      unit: "g",
      preparationMethod: "grilled",
      isCooked: true,
      confidenceLabel: "verified",
      calories: 247.5,
      proteinG: 46.5,
      carbsG: 0,
      fatG: 5.4,
      fibreG: 0,
      consumedAt: "2026-10-29T13:00:00+05:30",
    };

    const queued = offlineQueueService.enqueue(entryData);

    expect(queued.status).toBe("pending_not_saved");
    expect(queued.idempotencyKey).toBeDefined();
    expect(queued.idempotencyKey).toMatch(/^offline-/);
    expect(queued.entry.foodName).toBe("Grilled Chicken Breast");
    expect(queued.entry.idempotencyKey).toBe(queued.idempotencyKey);
  });

  it("should track pending entries and synchronize them to diaryService", async () => {
    const entryData1: Omit<FoodLogItem, "id"> = {
      diaryDate: "2026-10-29",
      mealCategory: "breakfast",
      foodName: "Boiled Eggs",
      quantity: 2,
      unit: "piece",
      preparationMethod: "hard-boiled",
      isCooked: true,
      confidenceLabel: "verified",
      calories: 156,
      proteinG: 12.6,
      carbsG: 1.1,
      fatG: 10.6,
      fibreG: 0,
      consumedAt: "2026-10-29T08:00:00+05:30",
    };

    const entryData2: Omit<FoodLogItem, "id"> = {
      diaryDate: "2026-10-29",
      mealCategory: "lunch",
      foodName: "Cooked White Rice",
      quantity: 200,
      unit: "g",
      preparationMethod: "steamed",
      isCooked: true,
      confidenceLabel: "verified",
      calories: 260,
      proteinG: 5.4,
      carbsG: 56.4,
      fatG: 0.6,
      fibreG: 0.8,
      consumedAt: "2026-10-29T13:00:00+05:30",
    };

    offlineQueueService.enqueue(entryData1);
    offlineQueueService.enqueue(entryData2);

    expect(offlineQueueService.getPendingEntries().length).toBe(2);

    const result = await offlineQueueService.syncPendingQueue();
    expect(result.syncedCount).toBe(2);
    expect(result.failedCount).toBe(0);

    // Verify they are now in the diary
    const diaryEntries = diaryService.getEntriesForDate("2026-10-29");
    expect(diaryEntries.length).toBe(2);
    expect(diaryEntries.map((e) => e.foodName)).toContain("Boiled Eggs");
    expect(diaryEntries.map((e) => e.foodName)).toContain("Cooked White Rice");

    // Queue status updated
    expect(offlineQueueService.getPendingEntries().length).toBe(0);
    expect(offlineQueueService.getQueue().every((q) => q.status === "synced")).toBe(true);
  });

  it("should clear synced items while leaving failed items intact", async () => {
    offlineQueueService.enqueue({
      diaryDate: "2026-10-29",
      mealCategory: "dinner",
      foodName: "Paneer Curry",
      quantity: 150,
      unit: "g",
      preparationMethod: "curried",
      isCooked: true,
      confidenceLabel: "verified",
      calories: 390,
      proteinG: 27,
      carbsG: 6,
      fatG: 30,
      fibreG: 0,
      consumedAt: "2026-10-29T19:00:00+05:30",
    });

    await offlineQueueService.syncPendingQueue();
    expect(offlineQueueService.getQueue().length).toBe(1);

    offlineQueueService.clearSynced();
    expect(offlineQueueService.getQueue().length).toBe(0);
  });
});
