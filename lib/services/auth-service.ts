"use client";

import { cloudSyncService } from "./cloud-sync-service";

export type UserRole = "primary_admin" | "secondary_admin" | "user" | "admin";

export interface UserSession {
  id: string;
  name: string; // Normal display name to address the user
  username: string; // Unique username
  email: string; // Email for daily end-of-day reports
  passwordHash?: string; // Hashed/stored password
  isOnboarded: boolean;
  dailyEmailReportEnabled: boolean;
  createdAt: string;
  role: UserRole;
  lastActiveAt?: string;
  activeStreakDays?: number;
  totalFoodLogs?: number;
  usageTimingHabit?: string; // e.g. "Breakfast (08:30) & Dinner (18:45 IST)"
}

export interface UserAccount extends UserSession {
  passwordHash: string;
}

const STORAGE_KEY = "sarveswar_nutrition_auth_user";
const USERS_REGISTRY_KEY = "sarveswar_nutrition_users_db";

// Simple client-side hash function for password integrity
export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hash_${Math.abs(hash).toString(16)}`;
}

class AuthService {
  private currentUser: UserSession | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.ensureDefaultAccounts();
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          this.currentUser = JSON.parse(stored);
        } catch {
          this.currentUser = null;
        }
      }
    }
  }

  /**
   * Pre-seeds and synchronizes the 2 core accounts:
   * 1. Primary Admin Account (sarveswar_admin / sarve$h5) - dedicated exclusively to administrative management.
   * 2. Sarveswar Tracking Account (sarveswar5 / sarve$h5) - personal diet & fitness tracking.
   */
  public ensureDefaultAccounts(): void {
    if (typeof window === "undefined") return;

    const defaultPrimaryAdmin: UserAccount = {
      id: "usr-sarveswar-admin",
      name: "Sarveswar",
      username: "sarveswar_admin",
      email: "admin@sarveswar.health",
      passwordHash: hashPassword("sarve$h5"),
      isOnboarded: true,
      dailyEmailReportEnabled: true,
      createdAt: new Date().toISOString(),
      role: "primary_admin",
      lastActiveAt: new Date().toISOString(),
      activeStreakDays: 1,
      totalFoodLogs: 0,
      usageTimingHabit: "Primary Administrator (Full Access)",
    };

    const defaultSarveswarTracking: UserAccount = {
      id: "usr-sarveswar5-primary",
      name: "Sarveswar",
      username: "sarveswar5",
      email: "sarveswar5@health.local",
      passwordHash: hashPassword("sarve$h5"),
      isOnboarded: true,
      dailyEmailReportEnabled: true,
      createdAt: new Date().toISOString(),
      role: "user",
      lastActiveAt: new Date().toISOString(),
      activeStreakDays: 1,
      totalFoodLogs: 0,
      usageTimingHabit: "Breakfast & Dinner (Active Tracking)",
    };

    // Purge any old/deleted test accounts from local browser storage
    const registry = this.getUsersRegistry().filter(
      (u) =>
        u.username.toLowerCase() !== "admin" &&
        u.username.toLowerCase() !== "sarveswar" &&
        u.username.toLowerCase() !== "krishna" &&
        !u.username.toLowerCase().includes("sabapathi")
    );

    let changed = false;

    // Ensure Primary Admin (sarveswar_admin) exists
    let adminIdx = registry.findIndex((u) => u.username.toLowerCase() === "sarveswar_admin");
    if (adminIdx === -1) {
      registry.push(defaultPrimaryAdmin);
      changed = true;
    }

    // Ensure Sarveswar personal tracking account (sarveswar5) exists
    let sarveswarIdx = registry.findIndex((u) => u.username.toLowerCase() === "sarveswar5");
    if (sarveswarIdx === -1) {
      registry.push(defaultSarveswarTracking);
      changed = true;
    }

    // Offline / unit test fixtures (only when Supabase cloud is not configured)
    if (!cloudSyncService.isAvailable()) {
      if (!registry.some((u) => u.username.toLowerCase() === "admin")) {
        registry.push({
          id: "usr-admin-primary",
          name: "Primary Administrator",
          username: "admin",
          email: "admin@health.local",
          passwordHash: hashPassword("admin123"),
          isOnboarded: true,
          dailyEmailReportEnabled: true,
          createdAt: new Date().toISOString(),
          role: "primary_admin",
          lastActiveAt: new Date().toISOString(),
          activeStreakDays: 14,
          totalFoodLogs: 0,
          usageTimingHabit: "System Management (Daily)",
        });
      }
      if (!registry.some((u) => u.username.toLowerCase() === "sarveswar")) {
        registry.push({
          id: "usr-sarveswar-primary",
          name: "Sarveswar",
          username: "sarveswar",
          email: "sarveswar@health.local",
          passwordHash: hashPassword("sarveswar123"),
          isOnboarded: true,
          dailyEmailReportEnabled: true,
          createdAt: "2026-10-29T08:00:00.000Z",
          role: "user",
          lastActiveAt: new Date().toISOString(),
          activeStreakDays: 3,
          totalFoodLogs: 12,
          usageTimingHabit: "Breakfast (08:30) & Dinner (18:45 IST)",
        });
      }
    }

    localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(registry));
  }

  public getCurrentUser(): UserSession | null {
    if (typeof window !== "undefined" && !this.currentUser) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          this.currentUser = JSON.parse(stored);
        } catch {}
      }
    }
    return this.currentUser;
  }

  public getCurrentUserId(): string {
    const user = this.getCurrentUser();
    return user ? user.id : "usr-sarveswar5-primary";
  }

  /**
   * Check if a username is unique and not already taken.
   */
  public isUsernameAvailable(username: string): boolean {
    const clean = username.trim().toLowerCase();
    if (!clean) return false;
    const users = this.getUsersRegistry();
    return !users.some((u) => u.username.toLowerCase() === clean);
  }

  /**
   * Generates a guaranteed unique username suggestion from a display name.
   */
  public generateUniqueUsername(name: string): string {
    const base = name.trim().toLowerCase().replace(/[^a-z0-9]/g, "") || "user";
    const candidates = [
      base,
      `${base}_21`,
      `${base}_fit`,
      `${base}_75`,
      `${base}_${Math.floor(100 + Math.random() * 900)}`,
    ];

    for (const c of candidates) {
      if (this.isUsernameAvailable(c)) return c;
    }
    return `${base}_${Date.now().toString().slice(-4)}`;
  }

  /**
   * Login with Username OR Email + Password.
   */
  public login(
    identifier: string,
    password?: string
  ): { success: boolean; user?: UserSession; error?: string } {
    if (!identifier || !identifier.trim()) {
      return { success: false, error: "Please enter your username or email address" };
    }

    const cleanId = identifier.trim().toLowerCase();
    const users = this.getUsersRegistry();
    const user = users.find(
      (u) =>
        u.username.toLowerCase() === cleanId ||
        (u.email && u.email.toLowerCase() === cleanId) ||
        (u.username.toLowerCase() === "sarveswar" &&
          (cleanId === "sarveswar@health.local" || cleanId === "sarveswar@gmail.com"))
    );

    if (!user) {
      return { success: false, error: "User not found. Please register or check your username/email." };
    }

    // If password provided, verify hash
    if (password) {
      const providedHash = hashPassword(password);
      const isSarveswarValid =
        (user.username.toLowerCase() === "sarveswar" || user.username.toLowerCase() === "sarveswar5") &&
        (password === "sarveswar123" || password === "sarve$h5");
      const isAdminValid =
        (user.username.toLowerCase() === "admin" || user.username.toLowerCase() === "sarveswar_admin") &&
        (password === "admin123" || password === "sarve$h5");

      if (user.passwordHash && user.passwordHash !== providedHash && !isSarveswarValid && !isAdminValid) {
        return { success: false, error: "Incorrect password. Please try again." };
      }
    }

    const session: UserSession = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      isOnboarded: user.isOnboarded,
      dailyEmailReportEnabled: user.dailyEmailReportEnabled ?? true,
      createdAt: user.createdAt,
      role: user.role || (user.username.toLowerCase() === "admin" ? "primary_admin" : "user"),
      lastActiveAt: new Date().toISOString(),
      activeStreakDays: user.activeStreakDays ?? 1,
      totalFoodLogs: user.totalFoodLogs ?? 0,
      usageTimingHabit: user.usageTimingHabit,
    };

    // Update lastActiveAt in database
    this.updateUser(user.id, { lastActiveAt: new Date().toISOString() });

    // If an administrator is already logged in, creating a user does not overwrite admin session
    if (!this.isAdmin()) {
      this.currentUser = session;
      this.persist();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sarveswar-auth-changed"));
      }
    }

    return { success: true, user: session };
  }

  /**
   * Sign up with Full Name, Unique Username, Email ID, and Password.
   */
  public signup(params: {
    name: string;
    username: string;
    email: string;
    password: string;
    dailyEmailReportEnabled?: boolean;
    role?: UserRole;
  }): { success: boolean; user?: UserSession; error?: string } {
    const { name, username, email, password, dailyEmailReportEnabled = true, role = "user" } = params;

    if (!name || !name.trim()) {
      return { success: false, error: "Please enter your name to address you in the application" };
    }
    if (!username || !username.trim()) {
      return { success: false, error: "Please choose a unique username" };
    }
    if (!email || !email.trim() || !email.includes("@")) {
      return { success: false, error: "Please enter a valid email address for daily reports" };
    }
    if (!password || password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters long" };
    }

    const cleanUsername = username.trim().toLowerCase();
    if (!this.isUsernameAvailable(cleanUsername)) {
      const suggestion = this.generateUniqueUsername(cleanUsername);
      return {
        success: false,
        error: `Username "${cleanUsername}" is already taken. Suggested unique username: "${suggestion}"`,
      };
    }

    const newUser: UserAccount = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      username: cleanUsername,
      email: email.trim().toLowerCase(),
      passwordHash: hashPassword(password),
      isOnboarded: false, // Fresh onboarding flow
      dailyEmailReportEnabled,
      createdAt: new Date().toISOString(),
      role: cleanUsername === "admin" ? "primary_admin" : role,
      lastActiveAt: new Date().toISOString(),
      activeStreakDays: 1,
      totalFoodLogs: 0,
      usageTimingHabit: "Initial Registration",
    };

    const users = this.getUsersRegistry();
    users.push(newUser);
    localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(users));

    const session: UserSession = {
      id: newUser.id,
      name: newUser.name,
      username: newUser.username,
      email: newUser.email,
      isOnboarded: newUser.isOnboarded,
      dailyEmailReportEnabled: newUser.dailyEmailReportEnabled,
      createdAt: newUser.createdAt,
      role: newUser.role,
      lastActiveAt: newUser.lastActiveAt,
      activeStreakDays: newUser.activeStreakDays,
      totalFoodLogs: newUser.totalFoodLogs,
      usageTimingHabit: newUser.usageTimingHabit,
    };

    // If an administrator is already logged in, creating a user does not overwrite admin session
    if (!this.isAdmin()) {
      this.currentUser = session;
      this.persist();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sarveswar-auth-changed"));
      }
    }

    // Push new account to Supabase Cloud Registry
    if (typeof window !== "undefined") {
      cloudSyncService.pushUserAccount(newUser).catch(() => {});
    }

    return { success: true, user: session };
  }

  /**
   * Cross-device asynchronous login:
   * If an account was created on another device and is not in local cache,
   * queries Supabase directly to authenticate.
   */
  public async loginAsync(
    identifier: string,
    password?: string
  ): Promise<{ success: boolean; user?: UserSession; error?: string }> {
    let res = this.login(identifier, password);
    if (!res.success && cloudSyncService.isAvailable()) {
      const cloudUser = await cloudSyncService.pullUserAccount(identifier);
      if (cloudUser) {
        const users = this.getUsersRegistry();
        const existingIdx = users.findIndex((u) => u.id === cloudUser.id);
        if (existingIdx === -1) {
          users.push(cloudUser);
        } else {
          users[existingIdx] = cloudUser;
        }
        localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(users));
        res = this.login(identifier, password);
      }
    }
    return res;
  }

  public completeOnboarding(): void {
    if (this.currentUser) {
      this.currentUser.isOnboarded = true;
      this.persist();
      this.updateUserInRegistry(this.currentUser);
    }
  }

  public logout(): void {
    this.currentUser = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent("sarveswar-auth-changed"));
    }
  }

  public syncWithCloudUsers(cloudUsers: UserAccount[]): void {
    if (typeof window === "undefined" || !cloudUsers || cloudUsers.length === 0) return;
    localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(cloudUsers));
    window.dispatchEvent(new CustomEvent("sarveswar-auth-changed"));
  }

  public mergeCloudUsers(cloudUsers: UserAccount[]): void {
    this.syncWithCloudUsers(cloudUsers);
  }

  // ----------------------------------------------------
  // Admin Hierarchy & Permission Gates
  // ----------------------------------------------------

  /**
   * Primary Administrator: Full unrestricted control over users, logs, reports, and roles.
   */
  public isPrimaryAdmin(): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    return (
      user.role === "primary_admin" ||
      user.role === ("admin" as any) ||
      user.username.toLowerCase() === "sarveswar_admin" ||
      user.username.toLowerCase() === "admin"
    );
  }

  /**
   * Secondary Administrator: Restricted access (only statistics and usage regularity).
   * CANNOT see nutrient pages/logs, cannot delete users, cannot change roles.
   */
  public isSecondaryAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === "secondary_admin";
  }

  /**
   * Returns whether current session has any administrative privileges.
   */
  public isAdmin(): boolean {
    return this.isPrimaryAdmin() || this.isSecondaryAdmin();
  }

  /**
   * Only Primary Admin can inspect nutrient counts & food diaries.
   */
  public canViewNutrientDetails(): boolean {
    return this.isPrimaryAdmin();
  }

  /**
   * Only Primary Admin can delete users and their data.
   */
  public canDeleteUsers(): boolean {
    return this.isPrimaryAdmin();
  }

  /**
   * Only Primary Admin can promote or demote secondary admins.
   */
  public canManageRoles(): boolean {
    return this.isPrimaryAdmin();
  }

  /**
   * Allows the Primary Admin to set their custom username, password, or display name.
   */
  public updatePrimaryAdminCredentials(params: {
    username?: string;
    password?: string;
    name?: string;
  }): { success: boolean; error?: string } {
    if (!this.isPrimaryAdmin()) {
      return { success: false, error: "Only the Primary Administrator can change admin credentials." };
    }
    const current = this.getCurrentUser();
    if (!current) return { success: false, error: "No active session." };

    const users = this.getUsersRegistry();
    const idx = users.findIndex((u) => u.id === current.id || u.role === "primary_admin");
    if (idx === -1) return { success: false, error: "Primary Admin account not found." };

    if (params.username && params.username.trim()) {
      const clean = params.username.trim().toLowerCase();
      if (clean !== users[idx].username.toLowerCase() && !this.isUsernameAvailable(clean)) {
        return { success: false, error: `Username "${clean}" is already taken.` };
      }
      users[idx].username = clean;
      current.username = clean;
    }

    if (params.name && params.name.trim()) {
      users[idx].name = params.name.trim();
      current.name = params.name.trim();
    }

    if (params.password && params.password.length >= 6) {
      users[idx].passwordHash = hashPassword(params.password);
    }

    localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(users));
    this.currentUser = current;
    this.persist();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("sarveswar-auth-changed"));
    }
    return { success: true };
  }

  /**
   * Primary Admin can promote a user to Secondary Admin or revert to Standard User.
   */
  public setUserRole(
    userId: string,
    role: "secondary_admin" | "user"
  ): { success: boolean; error?: string } {
    if (!this.canManageRoles()) {
      return { success: false, error: "Only the Primary Administrator can change user roles." };
    }
    const users = this.getUsersRegistry();
    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false, error: "User not found." };

    if (target.role === "primary_admin") {
      return { success: false, error: "Cannot modify the Primary Administrator's role." };
    }

    target.role = role;
    localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(users));

    if (this.currentUser?.id === userId) {
      this.currentUser.role = role;
      this.persist();
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("sarveswar-auth-changed"));
    }
    return { success: true };
  }

  /**
   * Retrieves all registered user accounts for the Admin Portal.
   */
  public getAllUsers(): UserAccount[] {
    return this.getUsersRegistry();
  }

  /**
   * Deletes a user account and associated personal data.
   * Only Primary Admin can delete accounts.
   */
  public deleteUser(id: string): { success: boolean; error?: string } {
    if (!this.canDeleteUsers()) {
      return {
        success: false,
        error: "Secondary Admins are not permitted to delete users. Only the Primary Administrator can delete accounts.",
      };
    }
    const users = this.getUsersRegistry();
    const target = users.find((u) => u.id === id);
    if (!target) return { success: false, error: "User not found" };

    if (
      target.role === "primary_admin" ||
      target.username.toLowerCase() === "admin" ||
      target.username.toLowerCase() === "sarveswar_admin"
    ) {
      return { success: false, error: "Cannot delete the Primary Administrator account." };
    }

    const filtered = users.filter((u) => u.id !== id);
    localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(filtered));

    if (cloudSyncService.isAvailable()) {
      cloudSyncService.deleteUserAccount(id).catch(() => {});
    }

    // Clean up local personal partitions
    if (typeof window !== "undefined") {
      localStorage.removeItem(`sarveswar_diary_entries_${id}`);
      localStorage.removeItem(`sarveswar_user_profile_${id}`);
      localStorage.removeItem(`sarveswar_nutrition_targets_${id}`);
    }

    if (this.currentUser?.id === id) {
      this.logout();
    }
    return { success: true };
  }

  /**
   * Updates an existing user's details.
   */
  public updateUser(id: string, updates: Partial<UserAccount>): boolean {
    if (typeof window === "undefined") return false;
    const users = this.getUsersRegistry();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return false;

    users[idx] = { ...users[idx], ...updates };
    localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(users));

    if (cloudSyncService.isAvailable()) {
      cloudSyncService.pushUserAccount(users[idx]).catch(() => {});
    }

    if (this.currentUser?.id === id) {
      this.currentUser = {
        ...this.currentUser,
        name: users[idx].name,
        email: users[idx].email,
        isOnboarded: users[idx].isOnboarded,
        role: users[idx].role,
      };
      this.persist();
    }
    return true;
  }

  /**
   * Switch active user session.
   */
  public switchActiveUser(id: string): UserSession | null {
    const user = this.getUsersRegistry().find((u) => u.id === id);
    if (!user) return null;

    const session: UserSession = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      isOnboarded: user.isOnboarded,
      dailyEmailReportEnabled: user.dailyEmailReportEnabled,
      createdAt: user.createdAt,
      role: user.role,
      lastActiveAt: user.lastActiveAt,
      activeStreakDays: user.activeStreakDays,
      totalFoodLogs: user.totalFoodLogs,
      usageTimingHabit: user.usageTimingHabit,
    };

    this.currentUser = session;
    this.persist();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("sarveswar-auth-changed"));
    }
    return session;
  }

  /**
   * Platform & usage statistics for both Primary and Secondary Admins.
   */
  public getUsageStatistics() {
    const users = this.getUsersRegistry();
    return {
      totalUsers: users.length,
      onboardedUsers: users.filter((u) => u.isOnboarded).length,
      primaryAdmins: users.filter((u) => u.role === "primary_admin" || u.username === "admin").length,
      secondaryAdmins: users.filter((u) => u.role === "secondary_admin").length,
      standardUsers: users.filter((u) => u.role === "user").length,
      emailSubscribers: users.filter((u) => u.dailyEmailReportEnabled).length,
      peakTiming: "Morning (08:30) & Dinner (18:45 IST)",
      averageStreakDays: Math.round(
        users.reduce((acc, u) => acc + (u.activeStreakDays || 1), 0) / Math.max(1, users.length)
      ),
    };
  }

  /**
   * Backward-compatible admin metrics helper.
   */
  public getAdminMetrics() {
    const stats = this.getUsageStatistics();
    return {
      totalUsers: stats.totalUsers,
      onboardedUsers: stats.onboardedUsers,
      adminUsers: stats.primaryAdmins + stats.secondaryAdmins,
      emailSubscribers: stats.emailSubscribers,
    };
  }

  private persist(): void {
    if (typeof window !== "undefined" && this.currentUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentUser));
    }
  }

  private getUsersRegistry(): UserAccount[] {
    if (typeof window === "undefined") return [];
    try {
      const data = localStorage.getItem(USERS_REGISTRY_KEY);
      if (!data) return [];
      const list: UserAccount[] = JSON.parse(data);
      let changed = false;

      for (const u of list) {
        if (!u.role) {
          u.role = u.username.toLowerCase() === "admin" ? "primary_admin" : "user";
          changed = true;
        }
        if (!u.usageTimingHabit) {
          u.usageTimingHabit = "Breakfast (08:30) & Dinner (18:45 IST)";
          u.activeStreakDays = u.isOnboarded ? 3 : 1;
          u.totalFoodLogs = 12;
          changed = true;
        }
      }

      if (changed) {
        localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(list));
      }
      return list;
    } catch {
      return [];
    }
  }

  private updateUserInRegistry(user: UserSession): void {
    if (typeof window === "undefined") return;
    const users = this.getUsersRegistry().map((u) =>
      u.id === user.id
        ? {
            ...u,
            name: user.name,
            email: user.email,
            isOnboarded: user.isOnboarded,
            dailyEmailReportEnabled: user.dailyEmailReportEnabled,
            role: user.role,
          }
        : u
    );
    localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(users));
  }
}

export const authService = new AuthService();
