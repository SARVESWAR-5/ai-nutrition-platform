import { supabase, isSupabaseConfigured } from "../db/supabase";
import { UserAccount, UserSession } from "./auth-service";
import { FoodLogItem } from "./diary-service";
import { WeightMeasurement } from "./weight-service";
import { UserPreferences } from "./preferences-service";

class CloudSyncService {
  private isSyncing = false;

  public isAvailable(): boolean {
    return isSupabaseConfigured();
  }

  /**
   * Cloud Authentication Sync:
   * When signing up on device A, saves account to Supabase.
   */
  public async pushUserAccount(account: UserAccount): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const { error } = await supabase.from("platform_users").upsert(
        {
          id: account.id,
          name: account.name,
          username: account.username,
          email: account.email,
          password_hash: account.passwordHash,
          role: account.role || "user",
          is_onboarded: account.isOnboarded || false,
          daily_email_report_enabled: account.dailyEmailReportEnabled !== false,
          active_streak_days: account.activeStreakDays || 0,
          total_food_logs: account.totalFoodLogs || 0,
          usage_timing_habit: account.usageTimingHabit || "Active Tracking",
          last_active_at: account.lastActiveAt || new Date().toISOString(),
          created_at: account.createdAt || new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Cross-Device Login:
   * If a user logs in on a new phone/laptop where localStorage is empty,
   * queries Supabase to authenticate their account seamlessly.
   */
  public async pullUserAccount(identifier: string): Promise<UserAccount | null> {
    if (!this.isAvailable()) return null;
    try {
      const clean = identifier.trim().toLowerCase();
      const { data, error } = await supabase
        .from("platform_users")
        .select("*")
        .or(`username.ilike.${clean},email.ilike.${clean}`)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        name: data.name,
        username: data.username,
        email: data.email,
        passwordHash: data.password_hash,
        role: data.role as any,
        isOnboarded: data.is_onboarded,
        dailyEmailReportEnabled: data.daily_email_report_enabled,
        createdAt: data.created_at,
        lastActiveAt: data.last_active_at,
        activeStreakDays: data.active_streak_days,
        totalFoodLogs: data.total_food_logs,
        usageTimingHabit: data.usage_timing_habit,
      };
    } catch {
      return null;
    }
  }

  /**
   * Pulls all registered users from Supabase for Admin management.
   */
  public async pullAllUsers(): Promise<UserAccount[]> {
    if (!this.isAvailable()) return [];
    try {
      const { data, error } = await supabase.from("platform_users").select("*");
      if (error || !data) return [];
      return data.map((d: any) => ({
        id: d.id,
        name: d.name,
        username: d.username,
        email: d.email,
        passwordHash: d.password_hash,
        role: d.role,
        isOnboarded: d.is_onboarded,
        dailyEmailReportEnabled: d.daily_email_report_enabled,
        createdAt: d.created_at,
        lastActiveAt: d.last_active_at,
        activeStreakDays: d.active_streak_days,
        totalFoodLogs: d.total_food_logs,
        usageTimingHabit: d.usage_timing_habit,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Pushes a single food entry to Supabase cloud.
   */
  public async pushFoodEntry(userId: string, entry: FoodLogItem): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const { error } = await supabase.from("food_log_entries").upsert({
        id: entry.id,
        user_id: userId,
        diary_date: entry.diaryDate,
        meal_category: entry.mealCategory,
        food_name: entry.foodName,
        quantity: entry.quantity,
        unit: entry.unit,
        preparation_method: entry.preparationMethod,
        is_cooked: entry.isCooked,
        is_estimated: entry.confidenceLabel === "estimated",
        confidence_label: entry.confidenceLabel,
        data_source: "sarveswar_nutrition",
        calories: entry.calories,
        protein_g: entry.proteinG,
        carbs_g: entry.carbsG,
        fat_g: entry.fatG,
        fibre_g: entry.fibreG,
        consumed_at: entry.consumedAt,
        notes: entry.notes,
      });
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Deletes a food entry from Supabase cloud.
   */
  public async deleteFoodEntry(id: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const { error } = await supabase.from("food_log_entries").delete().eq("id", id);
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Pulls all food entries for a user from Supabase cloud.
   */
  public async pullFoodEntries(userId: string): Promise<FoodLogItem[]> {
    if (!this.isAvailable()) return [];
    try {
      const { data, error } = await supabase
        .from("food_log_entries")
        .select("*")
        .eq("user_id", userId);

      if (error || !data) return [];

      return data.map((d: any) => ({
        id: d.id,
        diaryDate: d.diary_date,
        mealCategory: d.meal_category,
        foodName: d.food_name,
        quantity: Number(d.quantity),
        unit: d.unit,
        preparationMethod: d.preparation_method,
        isCooked: d.is_cooked,
        confidenceLabel: (d.confidence_label || "verified") as "verified" | "estimated",
        calories: Number(d.calories),
        proteinG: Number(d.protein_g),
        carbsG: Number(d.carbs_g),
        fatG: Number(d.fat_g),
        fibreG: Number(d.fibre_g),
        consumedAt: d.consumed_at,
        notes: d.notes,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Pushes a weight measurement to Supabase cloud.
   */
  public async pushWeightMeasurement(userId: string, m: WeightMeasurement): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const { error } = await supabase.from("weight_measurements").upsert({
        id: m.id,
        user_id: userId,
        measured_date: m.measuredDate,
        weight_kg: m.weightKg,
        waist_cm: m.waistCm,
        body_fat_pct: m.bodyFatPct,
        notes: m.notes,
        logged_at: m.loggedAt,
      });
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Pulls all weight measurements for a user from Supabase.
   */
  public async pullWeightMeasurements(userId: string): Promise<WeightMeasurement[]> {
    if (!this.isAvailable()) return [];
    try {
      const { data, error } = await supabase
        .from("weight_measurements")
        .select("*")
        .eq("user_id", userId)
        .order("measured_date", { ascending: false });

      if (error || !data) return [];

      return data.map((d: any) => ({
        id: d.id,
        measuredDate: d.measured_date,
        weightKg: Number(d.weight_kg),
        waistCm: d.waist_cm ? Number(d.waist_cm) : undefined,
        bodyFatPct: d.body_fat_pct ? Number(d.body_fat_pct) : undefined,
        notes: d.notes,
        loggedAt: d.logged_at,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Pushes user cutoffs and avoided foods to Supabase cloud.
   */
  public async pushPreferences(userId: string, prefs: UserPreferences): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const { error } = await supabase.from("user_preferences").upsert(
        {
          id: `pref-${userId}`,
          user_id: userId,
          cutoffs: prefs.cutoffs,
          foods_avoided: prefs.foodsAvoided,
          dietary_notes: prefs.dietaryNotes || "",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Pulls user preferences from Supabase cloud.
   */
  public async pullPreferences(userId: string): Promise<UserPreferences | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        cutoffs: data.cutoffs,
        foodsAvoided: data.foods_avoided || [],
        dietaryNotes: data.dietary_notes,
      };
    } catch {
      return null;
    }
  }

  /**
   * Bi-directional Synchronization Runner:
   * 1. Pushes any offline/localhost data up to Supabase Cloud so nothing is lost.
   * 2. Pulls any cloud data down to local device so phone and laptop stay in harmony.
   */
  public async fullSync(userId: string): Promise<void> {
    if (this.isSyncing || !this.isAvailable() || !userId) return;
    this.isSyncing = true;

    try {
      const isSarveswar = userId === "usr-sarveswar-primary" || userId === "sarveswar";
      const diaryKey = isSarveswar ? "sarveswar_diary_entries" : `sarveswar_diary_entries_${userId}`;
      const weightKey = isSarveswar ? "sarveswar_weight_logs" : `sarveswar_weight_logs_${userId}`;
      const prefsKey = isSarveswar ? "sarveswar_user_preferences" : `sarveswar_user_preferences_${userId}`;

      // 1. BI-DIRECTIONAL FOOD SYNC
      let localFoods: FoodLogItem[] = [];
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(diaryKey);
          if (raw) localFoods = JSON.parse(raw);
        } catch {}
      }

      const cloudFoods = await this.pullFoodEntries(userId);

      // Upload local items to cloud if missing
      const cloudFoodIds = new Set(cloudFoods.map((f) => f.id));
      for (const item of localFoods) {
        if (!cloudFoodIds.has(item.id)) {
          await this.pushFoodEntry(userId, item);
        }
      }

      // Download cloud items to local if missing
      const localFoodIds = new Set(localFoods.map((f) => f.id));
      let mergedFoods = [...localFoods];
      for (const item of cloudFoods) {
        if (!localFoodIds.has(item.id)) {
          mergedFoods.push(item);
        }
      }
      if (typeof window !== "undefined" && (mergedFoods.length > localFoods.length || (localFoods.length === 0 && cloudFoods.length > 0))) {
        const finalFoods = cloudFoods.length > 0 && localFoods.length === 0 ? cloudFoods : mergedFoods;
        localStorage.setItem(diaryKey, JSON.stringify(finalFoods));
        window.dispatchEvent(new CustomEvent("sarveswar-diary-updated"));
      }

      // 2. BI-DIRECTIONAL WEIGHT SYNC
      let localWeights: WeightMeasurement[] = [];
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(weightKey);
          if (raw) localWeights = JSON.parse(raw);
        } catch {}
      }

      const cloudWeights = await this.pullWeightMeasurements(userId);
      const cloudWeightIds = new Set(cloudWeights.map((w) => w.id));
      for (const w of localWeights) {
        if (!cloudWeightIds.has(w.id)) {
          await this.pushWeightMeasurement(userId, w);
        }
      }

      const localWeightIds = new Set(localWeights.map((w) => w.id));
      let mergedWeights = [...localWeights];
      for (const w of cloudWeights) {
        if (!localWeightIds.has(w.id)) {
          mergedWeights.push(w);
        }
      }
      if (typeof window !== "undefined" && (mergedWeights.length > localWeights.length || (localWeights.length === 0 && cloudWeights.length > 0))) {
        const finalWeights = cloudWeights.length > 0 && localWeights.length === 0 ? cloudWeights : mergedWeights;
        localStorage.setItem(weightKey, JSON.stringify(finalWeights));
        window.dispatchEvent(new CustomEvent("sarveswar-weight-updated"));
      }

      // 3. PREFERENCES & CUTOFFS SYNC
      if (typeof window !== "undefined") {
        const localPrefsRaw = localStorage.getItem(prefsKey);
        const cloudPrefs = await this.pullPreferences(userId);
        if (localPrefsRaw && !cloudPrefs) {
          try {
            const parsedPrefs = JSON.parse(localPrefsRaw);
            await this.pushPreferences(userId, parsedPrefs);
          } catch {}
        } else if (cloudPrefs) {
          localStorage.setItem(prefsKey, JSON.stringify(cloudPrefs));
          window.dispatchEvent(new CustomEvent("sarveswar-preferences-updated"));
        }
      }
    } catch (e) {
      console.warn("Cloud sync error:", e);
    } finally {
      this.isSyncing = false;
    }
  }
}

export const cloudSyncService = new CloudSyncService();
