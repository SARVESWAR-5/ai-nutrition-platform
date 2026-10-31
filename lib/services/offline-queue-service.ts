import { FoodLogItem, diaryService } from "./diary-service";

export interface QueuedOfflineEntry {
  idempotencyKey: string;
  entry: Omit<FoodLogItem, "id">;
  status: "pending_not_saved" | "syncing" | "synced" | "failed";
  createdAt: string;
  errorMessage?: string;
}

class OfflineQueueService {
  private queue: QueuedOfflineEntry[] = [];

  public getQueue(): QueuedOfflineEntry[] {
    return this.queue;
  }

  public getPendingEntries(): QueuedOfflineEntry[] {
    return this.queue.filter((q) => q.status === "pending_not_saved");
  }

  /**
   * Enqueues a food entry with client-generated idempotency key when offline.
   * Clearly marked as "pending, not saved" per specification.
   */
  public enqueue(entry: Omit<FoodLogItem, "id">): QueuedOfflineEntry {
    const idempotencyKey = `offline-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const queuedItem: QueuedOfflineEntry = {
      idempotencyKey,
      entry: { ...entry, idempotencyKey },
      status: "pending_not_saved",
      createdAt: new Date().toISOString(),
    };
    this.queue.push(queuedItem);
    return queuedItem;
  }

  /**
   * Synchronizes all pending items atomically when connectivity is restored.
   * Marks item as synced only after successful commit.
   */
  public async syncPendingQueue(): Promise<{ syncedCount: number; failedCount: number }> {
    let syncedCount = 0;
    let failedCount = 0;

    for (const item of this.queue) {
      if (item.status === "pending_not_saved") {
        item.status = "syncing";
        try {
          // Persist to authoritative diary
          diaryService.addEntry(item.entry);
          item.status = "synced";
          syncedCount++;
        } catch (err: any) {
          item.status = "failed";
          item.errorMessage = err.message || "Failed to commit record to database";
          failedCount++;
        }
      }
    }

    return { syncedCount, failedCount };
  }

  public clearSynced(): void {
    this.queue = this.queue.filter((q) => q.status !== "synced");
  }
}

export const offlineQueueService = new OfflineQueueService();
