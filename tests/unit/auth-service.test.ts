import { describe, it, expect, beforeEach } from "vitest";
import { authService } from "@/lib/services/auth-service";

describe("AuthService & Multi-User Partitioning", () => {
  beforeEach(() => {
    authService.logout();
  });

  it("identifies already-taken usernames and generates unique alternatives", () => {
    // The default "sarveswar" username is pre-seeded
    const isTaken = authService.isUsernameAvailable("sarveswar");
    expect(isTaken).toBe(false);

    const isAvailable = authService.isUsernameAvailable("brand_new_unique_user_99");
    expect(isAvailable).toBe(true);

    const suggested = authService.generateUniqueUsername("Sarveswar");
    expect(suggested).toBeDefined();
    expect(suggested).not.toBe("sarveswar"); // Must be a unique variant
    expect(authService.isUsernameAvailable(suggested)).toBe(true);
  });

  it("signs up a fresh user with display name, unique username, email, and password", () => {
    const uniqueUser = `test_user_${Date.now()}`;
    const result = authService.signup({
      name: "Sarveswar Kumar",
      username: uniqueUser,
      email: "sarveswar.test@example.com",
      password: "securePassword123",
      dailyEmailReportEnabled: true,
    });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user?.name).toBe("Sarveswar Kumar");
    expect(result.user?.username).toBe(uniqueUser);
    expect(result.user?.email).toBe("sarveswar.test@example.com");
    expect(result.user?.isOnboarded).toBe(false);
  });

  it("rejects registration if the username is already taken", () => {
    const result = authService.signup({
      name: "Duplicate User",
      username: "sarveswar", // Already taken
      email: "dup@example.com",
      password: "password123",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("already taken");
  });

  it("allows login with either username or email and validates password", () => {
    // Login with username
    const resUsername = authService.login("sarveswar", "sarveswar123");
    expect(resUsername.success).toBe(true);
    expect(resUsername.user?.username).toBe("sarveswar");

    // Login with wrong password should fail
    const resFail = authService.login("sarveswar", "wrongPassword");
    expect(resFail.success).toBe(false);
    expect(resFail.error).toContain("Incorrect password");

    // Login with email
    const resEmail = authService.login("sarveswar@health.local", "sarveswar123");
    expect(resEmail.success).toBe(true);
    expect(resEmail.user?.username).toBe("sarveswar");
  });

  it("evaluates admin privileges and retrieves administrative metrics", () => {
    // Logging in as admin should have primary_admin role
    authService.login("admin", "admin123");
    expect(authService.isPrimaryAdmin()).toBe(true);
    expect(authService.isAdmin()).toBe(true);
    expect(authService.canViewNutrientDetails()).toBe(true);
    expect(authService.canDeleteUsers()).toBe(true);
    expect(authService.canManageRoles()).toBe(true);

    const stats = authService.getUsageStatistics();
    expect(stats.totalUsers).toBeGreaterThanOrEqual(1);
    expect(stats.primaryAdmins).toBeGreaterThanOrEqual(1);

    const users = authService.getAllUsers();
    expect(Array.isArray(users)).toBe(true);
    expect(users.some((u) => u.username === "admin")).toBe(true);
  });

  it("enforces secondary admin restrictions (no delete, no nutrient details)", () => {
    // Create and promote a user to secondary admin
    const subAdminRes = authService.signup({
      name: "Sub Manager",
      username: `subadmin_${Date.now()}`,
      email: "sub@example.com",
      password: "password123",
      role: "secondary_admin",
    });
    expect(subAdminRes.success).toBe(true);

    // Login as secondary admin
    authService.login(subAdminRes.user!.username, "password123");
    expect(authService.isSecondaryAdmin()).toBe(true);
    expect(authService.isPrimaryAdmin()).toBe(false);
    expect(authService.isAdmin()).toBe(true);

    // Permissions check: Secondary admin CANNOT view nutrient details or delete users
    expect(authService.canViewNutrientDetails()).toBe(false);
    expect(authService.canDeleteUsers()).toBe(false);
    expect(authService.canManageRoles()).toBe(false);

    // Attempting to delete another user as secondary admin must be denied
    const delAttempt = authService.deleteUser("some-user-id");
    expect(delAttempt.success).toBe(false);
    expect(delAttempt.error).toContain("Secondary Admins are not permitted");
  });

  it("prevents deletion of primary administrator but allows deleting custom users", () => {
    // Login as primary admin
    authService.login("admin", "admin123");

    const adminUser = authService.getAllUsers().find((u) => u.username === "admin");
    expect(adminUser).toBeDefined();

    // Attempting to delete primary admin should fail safely
    const delAdminRes = authService.deleteUser(adminUser!.id);
    expect(delAdminRes.success).toBe(false);
    expect(delAdminRes.error).toContain("Cannot delete");

    // Create a temporary user and delete them as primary admin
    const tempUser = authService.signup({
      name: "Temporary User",
      username: `temp_user_${Date.now()}`,
      email: "temp@example.com",
      password: "password123",
    });
    expect(tempUser.success).toBe(true);

    const delTempRes = authService.deleteUser(tempUser.user!.id);
    expect(delTempRes.success).toBe(true);
  });

  it("allows Primary Admin to update credentials and manage user roles", () => {
    authService.login("admin", "admin123");

    // Create a standard user
    const regUser = authService.signup({
      name: "Regular Client",
      username: `client_${Date.now()}`,
      email: "client@example.com",
      password: "password123",
    });
    expect(regUser.success).toBe(true);

    // Primary admin promotes to secondary admin
    const promoteRes = authService.setUserRole(regUser.user!.id, "secondary_admin");
    expect(promoteRes.success).toBe(true);

    const updatedUser = authService.getAllUsers().find((u) => u.id === regUser.user!.id);
    expect(updatedUser?.role).toBe("secondary_admin");

    // Primary admin updates credentials
    const updateCredsRes = authService.updatePrimaryAdminCredentials({
      name: "Sarveswar Chief Admin",
    });
    expect(updateCredsRes.success).toBe(true);
  });

  it("switches active user session correctly for admin inspection", () => {
    const tempUser = authService.signup({
      name: "Inspected User",
      username: `inspect_${Date.now()}`,
      email: "inspect@example.com",
      password: "password123",
    });
    expect(tempUser.success).toBe(true);

    const switched = authService.switchActiveUser(tempUser.user!.id);
    expect(switched).toBeDefined();
    expect(switched?.id).toBe(tempUser.user!.id);
    expect(authService.getCurrentUser()?.id).toBe(tempUser.user!.id);
  });
});
