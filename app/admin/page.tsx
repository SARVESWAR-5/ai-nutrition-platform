"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  authService,
  UserAccount,
  UserSession,
} from "@/lib/services/auth-service";
import { cloudSyncService } from "@/lib/services/cloud-sync-service";
import { diaryService, FoodLogItem } from "@/lib/services/diary-service";
import { preferencesService, formatTime12h } from "@/lib/services/preferences-service";
import { waterService } from "@/lib/services/water-service";
import { exerciseService } from "@/lib/services/exercise-service";
import { weightService } from "@/lib/services/weight-service";
import { goalService } from "@/lib/services/goal-service";
import { getUserProfileData } from "@/lib/services/profile-service";
import { getLocalTodayDateString } from "@/lib/date/date-service";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  UserPlus,
  UserCheck,
  Search,
  LogIn,
  LogOut,
  Mail,
  Trash2,
  ArrowRight,
  ExternalLink,
  Crown,
  KeyRound,
  Download,
  RefreshCw,
  AlertCircle,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  Activity,
  Printer,
  Calendar,
  Lock,
  Flame,
  Utensils,
  ChevronRight,
  ChevronDown,
  Award,
  Save,
  Droplets,
  Dumbbell,
  Scale,
  Target,
  FileText,
  Layers,
} from "lucide-react";

export default function AdminPortalPage() {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<UserSession | null>(null);

  // Active Admin Tab: "users" | "nutrition" | "report" | "security"
  const [activeTab, setActiveTab] = React.useState<"users" | "nutrition" | "report" | "security">("users");

  // Authentication Gate States
  const [loginIdentifier, setLoginIdentifier] = React.useState("");
  const [loginPassword, setLoginPassword] = React.useState("");
  const [loginError, setLoginError] = React.useState("");

  // Directory State
  const [users, setUsers] = React.useState<UserAccount[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [notification, setNotification] = React.useState<string | null>(null);

  // Modals & Inspection State
  const [inspectUser, setInspectUser] = React.useState<UserAccount | null>(null);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [restrictedModalMessage, setRestrictedModalMessage] = React.useState<string | null>(null);

  // Tab 2: User Nutrition Inspector State
  const [selectedInspectUserId, setSelectedInspectUserId] = React.useState<string>("");
  const [inspectSection, setInspectSection] = React.useState<"all" | "today" | "history" | "water" | "exercise" | "weight">("all");
  const [historyExpandedDate, setHistoryExpandedDate] = React.useState<string | null>(null);

  // Tab 3: Per-User Date Report Generator State
  const [reportUserId, setReportUserId] = React.useState<string>("");
  const [reportDate, setReportDate] = React.useState<string>(getLocalTodayDateString());
  const [reportType, setReportType] = React.useState<"single_day" | "all_days">("single_day");
  const [generatedReport, setGeneratedReport] = React.useState<{
    user: UserAccount;
    date: string;
    entries: FoodLogItem[];
    totals: { calories: number; protein: number; carbs: number; fat: number; fibre: number };
    targets: { calories: number; protein: number; carbs: number; fat: number; fibre: number; waterMl: number };
    compliance: { metCalories: boolean; metProtein: boolean; followedDinnerCutoff: boolean };
  } | null>(null);

  const [allDaysReport, setAllDaysReport] = React.useState<{
    user: UserAccount;
    totalDays: number;
    totalCalories: number;
    avgCalories: number;
    avgProtein: number;
    avgWater: number;
    dinnerCompliancePct: number;
    days: Array<{
      date: string;
      totals: { calories: number; protein: number; carbs: number; fat: number; fibre: number };
      waterMl: number;
      dinnerTime: string | null;
      dinnerFollowedCutoff: boolean;
      itemsCount: number;
      items: FoodLogItem[];
    }>;
  } | null>(null);

  // Tab 4: Primary Admin Credentials Form State
  const [adminCustomUsername, setAdminCustomUsername] = React.useState("");
  const [adminCustomPassword, setAdminCustomPassword] = React.useState("");
  const [adminCustomName, setAdminCustomName] = React.useState("");
  const [adminCredsSuccess, setAdminCredsSuccess] = React.useState(false);
  const [adminCredsError, setAdminCredsError] = React.useState("");

  // Add User Form State
  const [newName, setNewName] = React.useState("");
  const [newUsername, setNewUsername] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [newRole, setNewRole] = React.useState<"user" | "secondary_admin">("user");
  const [newEmailSub, setNewEmailSub] = React.useState(true);
  const [addError, setAddError] = React.useState("");

  const refreshData = React.useCallback(async () => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    if (authService.isAdmin()) {
      authService.ensureDefaultAccounts();
      if (cloudSyncService.isAvailable()) {
        try {
          const cloudUsers = await cloudSyncService.pullAllUsers();
          if (cloudUsers && cloudUsers.length > 0) {
            authService.syncWithCloudUsers(cloudUsers);
            setUsers(cloudUsers);
            if (!selectedInspectUserId) {
              const preferred =
                cloudUsers.find((u) => u.username.toLowerCase() === "sarveswar5") || cloudUsers[0];
              setSelectedInspectUserId(preferred.id);
              setReportUserId(preferred.id);
            }
            return;
          }
        } catch (e) {
          console.warn("Could not load cloud users:", e);
        }
      }

      const allUsers = authService.getAllUsers();
      setUsers(allUsers);
      if (allUsers.length > 0 && !selectedInspectUserId) {
        // Default to Sarveswar's tracking account or first standard user for inspection
        const preferred =
          allUsers.find((u) => u.username.toLowerCase() === "sarveswar5") || allUsers[0];
        setSelectedInspectUserId(preferred.id);
        setReportUserId(preferred.id);
      }
    }
  }, [selectedInspectUserId]);

  React.useEffect(() => {
    setMounted(true);
    authService.ensureDefaultAccounts();
    refreshData();

    const handleAuthChange = () => {
      refreshData();
    };

    window.addEventListener("sarveswar-auth-changed", handleAuthChange);
    return () => {
      window.removeEventListener("sarveswar-auth-changed", handleAuthChange);
    };
  }, [refreshData]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const isPrimary = authService.isPrimaryAdmin();
  const isSecondary = authService.isSecondaryAdmin();
  const isAdmin = authService.isAdmin();

  // Handle Admin Login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const res = await authService.loginAsync(loginIdentifier, loginPassword);
    if (!res.success) {
      setLoginError(res.error || "Login failed");
      return;
    }

    if (!authService.isAdmin()) {
      setLoginError("This account does not have administrative privileges. Please log in with the administrator account.");
      return;
    }

    refreshData();
    showToast(`Authenticated as Administrator!`);
  };

  // Quick preset helper
  const handlePresetLogin = async (u: string, p: string) => {
    setLoginIdentifier(u);
    setLoginPassword(p);
    const res = await authService.loginAsync(u, p);
    if (res.success && authService.isAdmin()) {
      refreshData();
      showToast(`Signed in as ${u}`);
    } else if (res.success && !authService.isAdmin()) {
      setLoginError(`${u} is a standard user account. Please sign in with an Administrator account.`);
    }
  };

  // Toggle user role between Secondary Admin and Standard User
  const handleToggleSecondaryAdmin = (user: UserAccount) => {
    if (!authService.canManageRoles()) {
      setRestrictedModalMessage("Only the Primary Administrator can promote or modify user roles.");
      return;
    }

    if (user.role === "primary_admin" || user.username.toLowerCase() === "admin") {
      showToast("Cannot modify the Primary Administrator account.");
      return;
    }

    const nextRole = user.role === "secondary_admin" ? "user" : "secondary_admin";
    const res = authService.setUserRole(user.id, nextRole);
    if (!res.success) {
      alert(res.error);
      return;
    }
    refreshData();
    showToast(`Updated @${user.username} role to ${nextRole === "secondary_admin" ? "Secondary Admin" : "Standard User"}`);
  };

  // Delete User
  const handleDeleteUser = (user: UserAccount) => {
    if (!authService.canDeleteUsers()) {
      setRestrictedModalMessage("Permission Denied: Secondary Admins cannot delete user accounts or their data.");
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete user @${user.username} (${user.name}) and all their food records?`)) {
      return;
    }

    const res = authService.deleteUser(user.id);
    if (!res.success) {
      alert(res.error);
      return;
    }
    refreshData();
    showToast(`User @${user.username} deleted.`);
  };

  // Switch to personal tracking account (Sarveswar)
  const handleSwitchToTrackingAccount = () => {
    const sarveswarUser = users.find((u) => u.username.toLowerCase() === "sarveswar");
    if (sarveswarUser) {
      authService.switchActiveUser(sarveswarUser.id);
      showToast("Switched to your personal tracking account (Sarveswar). Opening Dashboard...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 700);
    } else {
      router.push("/dashboard");
    }
  };

  // Create new user
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");

    if (!newName.trim() || !newUsername.trim() || !newEmail.trim() || !newPassword) {
      setAddError("Please fill out all required fields.");
      return;
    }

    const res = authService.signup({
      name: newName,
      username: newUsername,
      email: newEmail,
      password: newPassword,
      role: newRole,
      dailyEmailReportEnabled: newEmailSub,
    });

    if (!res.success) {
      setAddError(res.error || "Failed to create user.");
      return;
    }

    setNewName("");
    setNewUsername("");
    setNewEmail("");
    setNewPassword("");
    setShowAddModal(false);
    refreshData();
    showToast(`User @${newUsername} created successfully!`);
  };

  // Update Primary Admin Credentials
  const handleUpdateAdminCreds = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminCredsError("");

    const res = authService.updatePrimaryAdminCredentials({
      username: adminCustomUsername || undefined,
      password: adminCustomPassword || undefined,
      name: adminCustomName || undefined,
    });

    if (!res.success) {
      setAdminCredsError(res.error || "Failed to update credentials.");
      return;
    }

    setAdminCredsSuccess(true);
    refreshData();
    showToast("Primary Admin credentials updated successfully!");
    setTimeout(() => setAdminCredsSuccess(false), 4000);
  };

  // Generate User Nutrition Report for Date or All Days
  const handleGenerateReport = () => {
    const targetUser = users.find((u) => u.id === reportUserId) || users[0];
    if (!targetUser) return;

    const userPrefs = preferencesService.getUserPreferences(targetUser.id);
    const dinnerCutoff = userPrefs.cutoffs?.dinner || "19:00";

    if (reportType === "single_day") {
      const entries = diaryService.getEntriesForUser(targetUser.id, reportDate);
      const totals = diaryService.getUserDailyTotals(targetUser.id, reportDate);
      const userTargets = goalService.getUserTargets(targetUser.id);

      const targets = {
        calories: userTargets.calories || 2400,
        protein: userTargets.protein || 150,
        carbs: userTargets.carbs || 290,
        fat: userTargets.fat || 70,
        fibre: userTargets.fibre || 35,
        waterMl: userTargets.waterMl || 3000,
      };

      const metCalories = totals.calories >= targets.calories * 0.9 && totals.calories <= targets.calories * 1.1;
      const metProtein = totals.protein >= targets.protein * 0.95;

      const dinnerItems = entries.filter((e) => e.mealCategory === "dinner");
      const followedDinnerCutoff = dinnerItems.length === 0 || dinnerItems.every((item) => {
        try {
          const timePart = item.consumedAt.slice(11, 16);
          return timePart <= dinnerCutoff;
        } catch {
          return true;
        }
      });

      setGeneratedReport({
        user: targetUser,
        date: reportDate,
        entries,
        totals,
        targets,
        compliance: {
          metCalories,
          metProtein,
          followedDinnerCutoff,
        },
      });
      setAllDaysReport(null);
    } else {
      // All days multi-day cumulative report
      const allEntries = diaryService.getEntriesForUser(targetUser.id);
      const uniqueDates = Array.from(new Set(allEntries.map((e) => e.diaryDate))).sort().reverse();

      let totalCal = 0;
      let totalProt = 0;
      let totalWat = 0;
      let dinnerDaysCount = 0;
      let compliantDinnerDaysCount = 0;

      const daysData = uniqueDates.map((d) => {
        const dayEntries = allEntries.filter((e) => e.diaryDate === d);
        const dayTotals = diaryService.getUserDailyTotals(targetUser.id, d);
        const dayWater = waterService.getUserWaterForDate(targetUser.id, d);
        const dinnerItems = dayEntries.filter((e) => e.mealCategory === "dinner");

        let dinnerTime: string | null = null;
        let followed = true;

        if (dinnerItems.length > 0) {
          dinnerDaysCount++;
          dinnerTime = dinnerItems[dinnerItems.length - 1].consumedAt.slice(11, 16);
          followed = dinnerItems.every((item) => {
            try {
              return item.consumedAt.slice(11, 16) <= dinnerCutoff;
            } catch {
              return true;
            }
          });
          if (followed) compliantDinnerDaysCount++;
        }

        totalCal += dayTotals.calories;
        totalProt += dayTotals.protein;
        totalWat += dayWater;

        return {
          date: d,
          totals: dayTotals,
          waterMl: dayWater,
          dinnerTime,
          dinnerFollowedCutoff: followed,
          itemsCount: dayEntries.length,
          items: dayEntries,
        };
      });

      const count = Math.max(1, uniqueDates.length);
      const dinnerCompliance = dinnerDaysCount > 0 ? Math.round((compliantDinnerDaysCount / dinnerDaysCount) * 100) : 100;

      setAllDaysReport({
        user: targetUser,
        totalDays: uniqueDates.length,
        totalCalories: totalCal,
        avgCalories: Math.round(totalCal / count),
        avgProtein: Math.round((totalProt / count) * 10) / 10,
        avgWater: Math.round(totalWat / count),
        dinnerCompliancePct: dinnerCompliance,
        days: daysData,
      });
      setGeneratedReport(null);
    }
  };

  // Export Users CSV
  const handleExportCSV = () => {
    const all = authService.getAllUsers();
    const headers = ["ID", "Name", "Username", "Email", "Role", "StreakDays", "TimingHabit", "CreatedAt"];
    const rows = all.map((u) => [
      `"${u.id}"`,
      `"${u.name}"`,
      `"${u.username}"`,
      `"${u.email}"`,
      `"${u.role}"`,
      u.activeStreakDays ?? 1,
      `"${u.usageTimingHabit || "Standard"}"`,
      `"${u.createdAt}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sarveswar_users_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Users directory exported to CSV!");
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen bg-slate-950 items-center justify-center p-6 text-white">
        <p className="text-sm text-slate-400 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
          Loading Admin Control Hub...
        </p>
      </div>
    );
  }

  const stats = authService.getUsageStatistics();
  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{notification}</span>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* CASE 1: UN-AUTHENTICATED ADMIN GATE                                */}
      {/* ------------------------------------------------------------------ */}
      {!isAdmin ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-lg mb-3">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h1 className="text-xl font-bold text-white">Administration Access Gate</h1>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                This portal is strictly reserved for managing platform users, usage statistics, and nutrition auditing.
              </p>
            </div>

            {loginError && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Administrator Username
                </label>
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  autoComplete="off"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Administrator Password
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <Button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>Log In as Administrator</span>
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-800 text-center">
              <div>
                <Link href="/" className="text-xs text-slate-500 hover:text-slate-300">
                  Return to Main App
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------------ */
        /* CASE 2: AUTHENTICATED DEDICATED ADMIN PORTAL                       */
        /* ------------------------------------------------------------------ */
        <>
          {/* Top Admin Dedicated Header */}
          <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-4 md:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-white leading-tight">
                    Platform Administration Hub
                  </h1>
                  {isPrimary ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-900/80 text-purple-200 border border-purple-700">
                      <Crown className="w-3 h-3 text-purple-300" />
                      Primary Super Admin (Sarveswar)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-900/80 text-blue-200 border border-blue-700">
                      <Shield className="w-3 h-3 text-blue-300" />
                      Secondary Admin (Stats Only)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Logged in as <strong className="text-slate-200">{currentUser?.name}</strong> (@{currentUser?.username}) • System Timezone: Asia/Kolkata
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSwitchToTrackingAccount}
                className="gap-1.5 text-xs rounded-xl bg-emerald-950/60 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900"
                title="Switch to your personal daily diet tracking account"
              >
                <Utensils className="w-3.5 h-3.5 text-emerald-400" />
                <span>Switch to Personal Tracking Account (Sarveswar)</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  authService.logout();
                  router.push("/login");
                }}
                className="gap-1.5 text-xs rounded-xl border-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-800"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </Button>
            </div>
          </header>

          {/* Admin Navigation Tabs */}
          <div className="border-b border-slate-800 bg-slate-900/40 px-4 md:px-8 flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("users")}
              className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === "users"
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>1. Users &amp; Regularity Statistics ({users.length})</span>
            </button>

            <button
              onClick={() => {
                if (!isPrimary) {
                  setRestrictedModalMessage("🔒 Restricted Access: Secondary Admins cannot view user nutrient counts or food diary entries.");
                  return;
                }
                setActiveTab("nutrition");
              }}
              className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === "nutrition"
                  ? "border-purple-500 text-purple-400"
                  : isPrimary
                  ? "border-transparent text-slate-400 hover:text-slate-200"
                  : "border-transparent text-slate-600 cursor-not-allowed opacity-60"
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>2. User 360° Data &amp; Intake Inspector {!isPrimary && "(Locked)"}</span>
            </button>

            <button
              onClick={() => {
                if (!isPrimary) {
                  setRestrictedModalMessage("🔒 Restricted Access: Only the Primary Administrator can generate individual nutrition reports.");
                  return;
                }
                setActiveTab("report");
              }}
              className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === "report"
                  ? "border-purple-500 text-purple-400"
                  : isPrimary
                  ? "border-transparent text-slate-400 hover:text-slate-200"
                  : "border-transparent text-slate-600 cursor-not-allowed opacity-60"
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>3. Date &amp; All-Days Report Generator {!isPrimary && "(Locked)"}</span>
            </button>

            <button
              onClick={() => {
                if (!isPrimary) {
                  setRestrictedModalMessage("🔒 Restricted Access: Only the Primary Administrator can modify admin credentials.");
                  return;
                }
                setActiveTab("security");
              }}
              className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === "security"
                  ? "border-purple-500 text-purple-400"
                  : isPrimary
                  ? "border-transparent text-slate-400 hover:text-slate-200"
                  : "border-transparent text-slate-600 cursor-not-allowed opacity-60"
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>4. Primary Admin Credentials {!isPrimary && "(Locked)"}</span>
            </button>
          </div>

          {/* Main Workspace Area */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
            {/* -------------------------------------------------------------- */}
            {/* TAB 1: USERS & USAGE REGULARITY STATISTICS                      */}
            {/* -------------------------------------------------------------- */}
            {activeTab === "users" && (
              <div className="space-y-6">
                {/* Statistics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-xs text-slate-400 font-medium">Total Registered Users</p>
                    <p className="text-2xl font-bold text-white mt-1">{stats.totalUsers}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Multi-user partition active</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-xs text-slate-400 font-medium">Average Logging Streak</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                      <Flame className="w-5 h-5 text-orange-500" />
                      <span>{stats.averageStreakDays} Days</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">Consistent diet logging</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-xs text-slate-400 font-medium">Peak Meal Times</p>
                    <p className="text-sm font-bold text-purple-300 mt-1 truncate">
                      {stats.peakTiming}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">Strict &lt; 7:00 PM dinner cutoff</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-xs text-slate-400 font-medium">Email Subscribers</p>
                    <p className="text-2xl font-bold text-amber-400 mt-1">{stats.emailSubscribers}</p>
                    <p className="text-[11px] text-slate-500 mt-1">7:00 PM daily report active</p>
                  </div>
                </div>

                {/* Regularity & Timing Distribution Overview */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span>User Regularity &amp; Eating Schedule Compliance</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <p className="text-slate-400">Breakfast (08:00 - 09:30 AM)</p>
                      <p className="font-bold text-emerald-400 text-sm mt-0.5">High Regularity (90%)</p>
                      <p className="text-[10px] text-slate-500">Dosa, Milk, Eggs</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <p className="text-slate-400">Lunch (12:30 - 02:00 PM)</p>
                      <p className="font-bold text-emerald-400 text-sm mt-0.5">High Regularity (95%)</p>
                      <p className="text-[10px] text-slate-500">Chicken breast, Rice, Channa</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <p className="text-slate-400">Evening Snack (04:30 - 05:30 PM)</p>
                      <p className="font-bold text-blue-400 text-sm mt-0.5">Moderate (75%)</p>
                      <p className="text-[10px] text-slate-500">Nuts, Milk, Fruit</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <p className="text-slate-400">Dinner (Before 07:00 PM Cutoff)</p>
                      <p className="font-bold text-emerald-400 text-sm mt-0.5">Strict Compliance (98%)</p>
                      <p className="text-[10px] text-slate-500">Bhurji, Chapatis</p>
                    </div>
                  </div>
                </div>

                {/* Directory Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 w-64"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshData}
                      className="text-xs rounded-xl border-slate-800 text-slate-300"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportCSV}
                      className="text-xs rounded-xl border-slate-800 text-slate-300 gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </Button>
                    {isPrimary && (
                      <Button
                        size="sm"
                        onClick={() => setShowAddModal(true)}
                        className="text-xs rounded-xl bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add User</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Users Directory Table */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Role &amp; Permissions</th>
                        <th className="py-3 px-4">Usage Regularity &amp; Streak</th>
                        <th className="py-3 px-4">Meal Timing Habits</th>
                        <th className="py-3 px-4 text-right">Admin Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            No users found matching &quot;{searchQuery}&quot;
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => {
                          const isUserPrimaryAdmin = user.role === "primary_admin" || user.username.toLowerCase() === "admin";
                          const isUserSecondaryAdmin = user.role === "secondary_admin";

                          return (
                            <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                    {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-white">{user.name}</span>
                                      {user.username.toLowerCase() === "sarveswar" && (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                                          Personal Tracking Account
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-400">@{user.username} • {user.email}</p>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                {isUserPrimaryAdmin ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-900/60 text-purple-300 border border-purple-800">
                                    <Crown className="w-3 h-3 text-purple-300" />
                                    Primary Admin
                                  </span>
                                ) : isUserSecondaryAdmin ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-900/60 text-blue-300 border border-blue-800">
                                    <Shield className="w-3 h-3 text-blue-300" />
                                    Secondary Admin
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300">
                                    Standard User
                                  </span>
                                )}
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="space-y-0.5">
                                  <p className="text-emerald-400 font-semibold flex items-center gap-1">
                                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                                    <span>{user.activeStreakDays ?? 3} Days Streak</span>
                                  </p>
                                  <p className="text-[10px] text-slate-500">
                                    Active: {new Date(user.lastActiveAt || user.createdAt).toLocaleDateString("en-IN")}
                                  </p>
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <p className="text-slate-300 font-medium">
                                  {user.usageTimingHabit || "Breakfast (08:30) & Dinner (18:45 IST)"}
                                </p>
                                <span className="text-[10px] text-emerald-400">● 7:00 PM cutoff compliant</span>
                              </td>

                              <td className="py-3.5 px-4 text-right">
                                <div className="inline-flex items-center gap-1.5 justify-end">
                                  {/* Inspect Nutrients & Diary (Primary Admin only) */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!isPrimary) {
                                        setRestrictedModalMessage("🔒 Permission Denied: Secondary Admins cannot view user nutrient counts or food diary entries.");
                                        return;
                                      }
                                      setSelectedInspectUserId(user.id);
                                      setActiveTab("nutrition");
                                    }}
                                    className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center gap-1 transition-colors"
                                    title="View complete 360° user data, history, cutoffs, and diary"
                                  >
                                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Audit 360°</span>
                                  </button>

                                  {/* Generate Date Report (Primary Admin only) */}
                                  {isPrimary && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReportUserId(user.id);
                                        setActiveTab("report");
                                        handleGenerateReport();
                                      }}
                                      className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center gap-1 transition-colors"
                                      title="Generate individual date nutrition report"
                                    >
                                      <Printer className="w-3.5 h-3.5 text-blue-400" />
                                      <span>Report</span>
                                    </button>
                                  )}

                                  {/* Make Secondary Admin / Revert (Primary Admin only) */}
                                  {isPrimary && !isUserPrimaryAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSecondaryAdmin(user)}
                                      className={`p-1.5 rounded-lg border transition-colors ${
                                        isUserSecondaryAdmin
                                          ? "border-blue-700 bg-blue-950/60 text-blue-300 hover:bg-blue-900"
                                          : "border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-blue-400"
                                      }`}
                                      title={isUserSecondaryAdmin ? "Demote to Standard User" : "Make Secondary Admin (Stats Only)"}
                                    >
                                      <Shield className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {/* Delete User (Primary Admin only) */}
                                  {isPrimary && !isUserPrimaryAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUser(user)}
                                      className="p-1.5 rounded-lg border border-slate-800 hover:bg-red-950/60 text-slate-500 hover:text-red-400 transition-colors"
                                      title={`Delete user @${user.username}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------- */}
            {/* TAB 2: USER 360° DATA & AUDIT INSPECTOR                        */}
            {/* -------------------------------------------------------------- */}
            {activeTab === "nutrition" && (
              <div className="space-y-6">
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Activity className="w-5 h-5 text-emerald-400" />
                      <span>User 360° Data &amp; Intake Audit Inspector</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Full administrative inspection: Profile, targets, time cutoffs, dietary exclusions, today&apos;s food, full history, water, workouts &amp; weigh-ins.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-400">Select User:</label>
                    <select
                      value={selectedInspectUserId}
                      onChange={(e) => setSelectedInspectUserId(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} (@{u.username})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {(() => {
                  const targetUser = users.find((u) => u.id === selectedInspectUserId) || users[0];
                  if (!targetUser) {
                    return (
                      <div className="p-8 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
                        No user selected or registered.
                      </div>
                    );
                  }

                  const todayStr = getLocalTodayDateString();
                  const totals = diaryService.getUserDailyTotals(targetUser.id, todayStr);
                  const todayEntries = diaryService.getEntriesForUser(targetUser.id, todayStr);
                  const allEntries = diaryService.getEntriesForUser(targetUser.id);
                  const userPrefs = preferencesService.getUserPreferences(targetUser.id);
                  const userTargets = goalService.getUserTargets(targetUser.id);
                  const userProfile = getUserProfileData(targetUser.id);
                  const userWater = waterService.getUserLogs(targetUser.id);
                  const todayWater = waterService.getUserWaterForDate(targetUser.id, todayStr);
                  const userExercises = exerciseService.getUserSessions(targetUser.id);
                  const userWeights = weightService.getUserMeasurements(targetUser.id);

                  // Extract all distinct historical dates logged by this user
                  const historyDates = Array.from(new Set(allEntries.map((e) => e.diaryDate))).sort().reverse();

                  return (
                    <div className="space-y-6">
                      {/* Section Navigation Pills */}
                      <div className="flex flex-wrap items-center gap-2 pb-1 border-b border-slate-800">
                        <button
                          type="button"
                          onClick={() => setInspectSection("all")}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                            inspectSection === "all"
                              ? "bg-purple-600 text-white"
                              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Complete 360° Overview</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInspectSection("today")}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                            inspectSection === "today"
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                          }`}
                        >
                          <Utensils className="w-3.5 h-3.5" />
                          <span>Today&apos;s Diary ({todayEntries.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInspectSection("history")}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                            inspectSection === "history"
                              ? "bg-blue-600 text-white"
                              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>All-Days History ({historyDates.length} days)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInspectSection("water")}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                            inspectSection === "water"
                              ? "bg-cyan-600 text-white"
                              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                          }`}
                        >
                          <Droplets className="w-3.5 h-3.5" />
                          <span>Hydration ({userWater.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInspectSection("exercise")}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                            inspectSection === "exercise"
                              ? "bg-amber-600 text-white"
                              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                          }`}
                        >
                          <Dumbbell className="w-3.5 h-3.5" />
                          <span>Workouts ({userExercises.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInspectSection("weight")}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                            inspectSection === "weight"
                              ? "bg-rose-600 text-white"
                              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                          }`}
                        >
                          <Scale className="w-3.5 h-3.5" />
                          <span>Weight ({userWeights.length})</span>
                        </button>
                      </div>

                      {/* 1. User Profile & Constraints Header Card */}
                      {(inspectSection === "all" || inspectSection === "today") && (
                        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-lg shadow-lg">
                                {targetUser.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-base font-bold text-white">{targetUser.name}</h3>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-950 text-purple-300 border border-purple-800">
                                    {targetUser.role.replace("_", " ")}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  @{targetUser.username} • {targetUser.email} • ID: <code className="text-slate-300">{targetUser.id}</code>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs">
                              <span className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-semibold">
                                Dinner Cutoff: {formatTime12h(userPrefs.cutoffs.dinner)}
                              </span>
                              <span className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-semibold">
                                Timezone: Asia/Kolkata
                              </span>
                            </div>
                          </div>

                          {/* Profile Attributes Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                              <p className="text-slate-500 font-semibold uppercase text-[10px]">Age</p>
                              <p className="font-bold text-white text-sm mt-0.5">{userProfile?.age ? `${userProfile.age} yrs` : "—"}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                              <p className="text-slate-500 font-semibold uppercase text-[10px]">Height</p>
                              <p className="font-bold text-white text-sm mt-0.5">{userProfile?.heightCm ? `${userProfile.heightCm} cm` : "—"}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                              <p className="text-slate-500 font-semibold uppercase text-[10px]">Current Weight</p>
                              <p className="font-bold text-emerald-400 text-sm mt-0.5">{userProfile?.currentWeightKg ? `${userProfile.currentWeightKg} kg` : "—"}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                              <p className="text-slate-500 font-semibold uppercase text-[10px]">Target Weight</p>
                              <p className="font-bold text-white text-sm mt-0.5">{userProfile?.targetWeightKg ? `${userProfile.targetWeightKg} kg` : "—"}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                              <p className="text-slate-500 font-semibold uppercase text-[10px]">Goal</p>
                              <p className="font-bold text-purple-400 text-xs mt-1 truncate">
                                {userProfile?.fitnessGoal ? userProfile.fitnessGoal.replace("_", " ").toUpperCase() : "RECOMPOSITION"}
                              </p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                              <p className="text-slate-500 font-semibold uppercase text-[10px]">Context</p>
                              <p className="font-bold text-amber-400 text-xs mt-1 truncate">
                                {userProfile?.cookingAbility ? userProfile.cookingAbility.replace("_", " ") : "Home / PG"}
                              </p>
                            </div>
                          </div>

                          {/* Time-Based Cutoffs & Dietary Exclusions Card */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-2">
                              <div className="flex items-center gap-1.5 font-bold text-purple-300">
                                <Clock className="w-4 h-4 text-purple-400" />
                                <span>Configured Meal Cutoff Times</span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                                <div>
                                  <span className="text-slate-500 block">Dinner:</span>
                                  <span className="font-bold text-white">{formatTime12h(userPrefs.cutoffs.dinner)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block">Breakfast:</span>
                                  <span className="font-bold text-white">{formatTime12h(userPrefs.cutoffs.breakfast)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block">Lunch:</span>
                                  <span className="font-bold text-white">{formatTime12h(userPrefs.cutoffs.lunch)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block">Evening Snack:</span>
                                  <span className="font-bold text-white">{formatTime12h(userPrefs.cutoffs.evening_snack)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block">Pre-Workout:</span>
                                  <span className="font-bold text-white">{formatTime12h(userPrefs.cutoffs.pre_workout)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block">Post-Workout:</span>
                                  <span className="font-bold text-white">{formatTime12h(userPrefs.cutoffs.post_workout)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-2">
                              <div className="flex items-center gap-1.5 font-bold text-rose-300">
                                <ShieldAlert className="w-4 h-4 text-rose-400" />
                                <span>Excluded Foods &amp; Allergens</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {userPrefs.foodsAvoided && userPrefs.foodsAvoided.length > 0 ? (
                                  userPrefs.foodsAvoided.map((item) => (
                                    <span
                                      key={item}
                                      className="px-2.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-800 text-rose-300 text-[11px] font-bold"
                                    >
                                      {item}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-500 text-xs italic">No dietary items excluded</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 2. Today's Macros vs Targets */}
                      {(inspectSection === "all" || inspectSection === "today") && (
                        <div className="space-y-3">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Activity className="w-4 h-4 text-emerald-400" />
                            <span>Today&apos;s Nutrient Intake vs Target Goals ({todayStr})</span>
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                              <p className="text-[11px] text-slate-400">Calories</p>
                              <p className="text-xl font-bold text-white mt-1">{totals.calories} kcal</p>
                              <p className="text-[10px] text-slate-500">Target: {userTargets.calories} kcal</p>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div
                                  className="bg-purple-500 h-full rounded-full"
                                  style={{ width: `${Math.min(100, Math.round((totals.calories / (userTargets.calories || 2400)) * 100))}%` }}
                                />
                              </div>
                            </div>
                            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                              <p className="text-[11px] text-slate-400">Protein</p>
                              <p className="text-xl font-bold text-emerald-400 mt-1">{totals.protein}g</p>
                              <p className="text-[10px] text-slate-500">Target: {userTargets.protein}g</p>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-full rounded-full"
                                  style={{ width: `${Math.min(100, Math.round((totals.protein / (userTargets.protein || 150)) * 100))}%` }}
                                />
                              </div>
                            </div>
                            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                              <p className="text-[11px] text-slate-400">Carbohydrates</p>
                              <p className="text-xl font-bold text-amber-400 mt-1">{totals.carbs}g</p>
                              <p className="text-[10px] text-slate-500">Target: {userTargets.carbs}g</p>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div
                                  className="bg-amber-500 h-full rounded-full"
                                  style={{ width: `${Math.min(100, Math.round((totals.carbs / (userTargets.carbs || 290)) * 100))}%` }}
                                />
                              </div>
                            </div>
                            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                              <p className="text-[11px] text-slate-400">Fat</p>
                              <p className="text-xl font-bold text-purple-400 mt-1">{totals.fat}g</p>
                              <p className="text-[10px] text-slate-500">Target: {userTargets.fat}g</p>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div
                                  className="bg-purple-500 h-full rounded-full"
                                  style={{ width: `${Math.min(100, Math.round((totals.fat / (userTargets.fat || 70)) * 100))}%` }}
                                />
                              </div>
                            </div>
                            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                              <p className="text-[11px] text-slate-400">Fibre</p>
                              <p className="text-xl font-bold text-blue-400 mt-1">{totals.fibre}g</p>
                              <p className="text-[10px] text-slate-500">Target: {userTargets.fibre}g</p>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div
                                  className="bg-blue-500 h-full rounded-full"
                                  style={{ width: `${Math.min(100, Math.round((totals.fibre / (userTargets.fibre || 35)) * 100))}%` }}
                                />
                              </div>
                            </div>
                            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                              <p className="text-[11px] text-slate-400">Water</p>
                              <p className="text-xl font-bold text-cyan-400 mt-1">{todayWater} ml</p>
                              <p className="text-[10px] text-slate-500">Target: {userTargets.waterMl} ml</p>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div
                                  className="bg-cyan-500 h-full rounded-full"
                                  style={{ width: `${Math.min(100, Math.round((todayWater / (userTargets.waterMl || 3000)) * 100))}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 3. Today's Food Diary Records */}
                      {(inspectSection === "all" || inspectSection === "today") && (
                        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <Utensils className="w-4 h-4 text-purple-400" />
                              <span>Today&apos;s Itemized Food Diary ({todayEntries.length} items logged)</span>
                            </h3>
                          </div>
                          {todayEntries.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-xs">
                              No food items logged today yet for @{targetUser?.username}.
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-800">
                              {todayEntries.map((item) => (
                                <div key={item.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-800/40">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-white">{item.foodName}</span>
                                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold bg-slate-800 text-slate-400">
                                        {item.mealCategory.replace("_", " ")}
                                      </span>
                                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                                        {item.confidenceLabel}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      {item.quantity} {item.unit} • {item.preparationMethod} ({item.isCooked ? "Cooked" : "Raw"}) • Consumed at {item.consumedAt.slice(11, 16)} IST
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-white">{item.calories} kcal</p>
                                    <p className="text-[11px] text-slate-400">
                                      {item.proteinG}g P • {item.carbsG}g C • {item.fatG}g F • {item.fibreG}g Fibre
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 4. Complete All-Days Food Intake History */}
                      {(inspectSection === "all" || inspectSection === "history") && (
                        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                            <div>
                              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <Calendar className="w-4 h-4 text-blue-400" />
                                <span>Complete Historical Food Intake ({historyDates.length} Days Tracked, {allEntries.length} Items Total)</span>
                              </h3>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Click on any past date to expand and inspect exact items logged.
                              </p>
                            </div>
                          </div>
                          {historyDates.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-xs">
                              No historical food logs found for @{targetUser?.username}.
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-800">
                              {historyDates.map((dateStr) => {
                                const dayEntries = allEntries.filter((e) => e.diaryDate === dateStr);
                                const dayTotals = diaryService.getUserDailyTotals(targetUser.id, dateStr);
                                const isExpanded = historyExpandedDate === dateStr;
                                const dinnerItems = dayEntries.filter((e) => e.mealCategory === "dinner");
                                const dinnerCutoff = userPrefs.cutoffs?.dinner || "19:00";
                                const isDinnerCompliant = dinnerItems.length === 0 || dinnerItems.every((e) => {
                                  try {
                                    return e.consumedAt.slice(11, 16) <= dinnerCutoff;
                                  } catch {
                                    return true;
                                  }
                                });

                                return (
                                  <div key={dateStr} className="p-4 hover:bg-slate-800/30 transition-colors">
                                    <div
                                      onClick={() => setHistoryExpandedDate(isExpanded ? null : dateStr)}
                                      className="flex items-center justify-between cursor-pointer"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold text-white text-xs">{dateStr}</span>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                                              {dayEntries.length} items
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                              isDinnerCompliant
                                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                                : "bg-amber-950 text-amber-400 border border-amber-800"
                                            }`}>
                                              {isDinnerCompliant ? "Cutoff Met" : "Late Dinner"}
                                            </span>
                                          </div>
                                          <p className="text-[11px] text-slate-400 mt-0.5">
                                            {dayTotals.protein}g Protein • {dayTotals.carbs}g Carbs • {dayTotals.fat}g Fat • {dayTotals.fibre}g Fibre
                                          </p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-bold text-white text-sm">{dayTotals.calories} kcal</p>
                                        <p className="text-[10px] text-purple-400">
                                          {isExpanded ? "Collapse" : "Expand Items"}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Expanded day items */}
                                    {isExpanded && (
                                      <div className="mt-3 pl-10 pr-2 pt-3 border-t border-slate-800/60 divide-y divide-slate-800/40 text-xs">
                                        {dayEntries.map((item) => (
                                          <div key={item.id} className="py-2 flex items-center justify-between">
                                            <div>
                                              <span className="font-semibold text-slate-200">{item.foodName}</span>
                                              <span className="text-slate-400 text-[11px] ml-2">
                                                ({item.quantity} {item.unit} • {item.mealCategory} • {item.consumedAt.slice(11, 16)} IST)
                                              </span>
                                            </div>
                                            <span className="text-slate-300 font-medium">
                                              {item.calories} kcal • {item.proteinG}g P
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 5. Hydration & Water Intake History */}
                      {(inspectSection === "all" || inspectSection === "water") && (
                        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <Droplets className="w-4 h-4 text-cyan-400" />
                              <span>Water Intake &amp; Hydration Logs ({userWater.length} logs recorded)</span>
                            </h3>
                          </div>
                          {userWater.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-xs">
                              No water logs recorded yet for @{targetUser?.username}.
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-800">
                              {userWater.slice(0, 10).map((log) => (
                                <div key={log.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-800/30">
                                  <div className="flex items-center gap-2">
                                    <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                                    <span className="font-bold text-white">{log.amountMl} ml</span>
                                    <span className="text-slate-400 text-[11px]">on {log.dateStr}</span>
                                  </div>
                                  <span className="text-slate-400 text-[11px]">
                                    Logged at {log.loggedAt ? log.loggedAt.slice(11, 16) : "—"} IST
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 6. Workouts & Exercise History */}
                      {(inspectSection === "all" || inspectSection === "exercise") && (
                        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <Dumbbell className="w-4 h-4 text-amber-400" />
                              <span>Workout &amp; Exercise Sessions ({userExercises.length} sessions logged)</span>
                            </h3>
                          </div>
                          {userExercises.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-xs">
                              No exercise sessions recorded yet for @{targetUser?.username}.
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-800">
                              {userExercises.map((ex) => (
                                <div key={ex.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-800/30">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-white">{ex.exerciseName}</span>
                                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-950 text-amber-300 border border-amber-800">
                                        {ex.activityType.replace("_", " ")}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      {ex.durationMinutes} mins • {ex.steps ? `${ex.steps} steps • ` : ""}{ex.sessionDate} • {ex.notes || "No notes"}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-bold text-amber-400 text-sm">~{ex.estimatedCaloriesBurned} kcal</span>
                                    <p className="text-[10px] text-slate-500">Burned</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 7. Weight & Body Measurement Check-ins */}
                      {(inspectSection === "all" || inspectSection === "weight") && (
                        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <Scale className="w-4 h-4 text-rose-400" />
                              <span>Body Weight &amp; Anthropometric Check-ins ({userWeights.length} measurements)</span>
                            </h3>
                          </div>
                          {userWeights.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-xs">
                              No weight check-ins recorded yet for @{targetUser?.username}.
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-800">
                              {userWeights.map((w) => (
                                <div key={w.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-800/30">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-white text-sm">{w.weightKg} kg</span>
                                      {w.waistCm && (
                                        <span className="text-slate-400 text-[11px]">Waist: {w.waistCm} cm</span>
                                      )}
                                      {w.bodyFatPct && (
                                        <span className="text-slate-400 text-[11px]">BF: {w.bodyFatPct}%</span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      Date: {w.measuredDate} • {w.notes || "Standard weigh-in"}
                                    </p>
                                  </div>
                                  <span className="text-slate-400 text-[11px]">
                                    Recorded at {w.loggedAt ? w.loggedAt.slice(11, 16) : "—"} IST
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* -------------------------------------------------------------- */}
            {/* TAB 3: PER-USER DATE & ALL-DAYS REPORT GENERATOR               */}
            {/* -------------------------------------------------------------- */}
            {activeTab === "report" && (
              <div className="space-y-6">
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <Printer className="w-5 h-5 text-blue-400" />
                        <span>Nutrition &amp; Compliance Audit Report Generator</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Compile official audit reports: either for an individual single date or a multi-day cumulative history across all dates.
                      </p>
                    </div>

                    {/* Mode Toggle: Single Day vs All Days Combined */}
                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setReportType("single_day");
                          setAllDaysReport(null);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          reportType === "single_day"
                            ? "bg-blue-600 text-white shadow"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Single Date Report
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReportType("all_days");
                          setGeneratedReport(null);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          reportType === "all_days"
                            ? "bg-blue-600 text-white shadow"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        All-Days Cumulative Report
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Target User</label>
                      <select
                        value={reportUserId}
                        onChange={(e) => setReportUserId(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} (@{u.username})
                          </option>
                        ))}
                      </select>
                    </div>

                    {reportType === "single_day" && (
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Audit Date</label>
                        <input
                          type="date"
                          value={reportDate}
                          onChange={(e) => setReportDate(e.target.value)}
                          className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    <div className="flex items-end pt-4">
                      <Button
                        size="sm"
                        onClick={handleGenerateReport}
                        className="text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-1.5 py-2 px-4 shadow"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>
                          {reportType === "single_day" ? "Generate Single Day Report" : "Compile All-Days Report"}
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 1. Single Date Printable Report Card */}
                {reportType === "single_day" && generatedReport && (
                  <div className="p-6 md:p-8 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl space-y-6 print:bg-white print:text-black">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-5 gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-emerald-500" />
                          <h3 className="text-xl font-extrabold text-white">
                            Official Daily Nutrition &amp; Fitness Audit
                          </h3>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Subject: <strong className="text-white">{generatedReport.user.name}</strong> (@{generatedReport.user.username}) • Email: {generatedReport.user.email}
                        </p>
                      </div>

                      <div className="text-right flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.print()}
                          className="text-xs rounded-xl border-slate-700 gap-1.5 text-slate-200"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print / Save PDF</span>
                        </Button>
                      </div>
                    </div>

                    {/* Metadata Badges */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                        <p className="text-slate-400">Audit Date</p>
                        <p className="font-bold text-white text-sm mt-0.5">{generatedReport.date} (IST)</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                        <p className="text-slate-400">Nutrition Protocol</p>
                        <p className="font-bold text-emerald-400 text-sm mt-0.5">Custom Physical Blueprint</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                        <p className="text-slate-400">Dinner Cutoff Compliance</p>
                        <p className="font-bold text-emerald-400 text-sm mt-0.5">
                          {generatedReport.compliance.followedDinnerCutoff ? "100% Compliant" : "Late Dinner"}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                        <p className="text-slate-400">Dietary Policy</p>
                        <p className="font-bold text-purple-400 text-sm mt-0.5">Exclusions Enforced</p>
                      </div>
                    </div>

                    {/* Nutrient Consumption Summary Table */}
                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                            <th className="py-2.5 px-4">Nutrient Metric</th>
                            <th className="py-2.5 px-4">Configured Target</th>
                            <th className="py-2.5 px-4">Consumed Intake</th>
                            <th className="py-2.5 px-4">Net Variance</th>
                            <th className="py-2.5 px-4 text-right">Goal Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          <tr>
                            <td className="py-2.5 px-4 font-bold text-white">Energy (Calories)</td>
                            <td className="py-2.5 px-4">{generatedReport.targets.calories} kcal</td>
                            <td className="py-2.5 px-4 font-semibold text-white">{generatedReport.totals.calories} kcal</td>
                            <td className="py-2.5 px-4">
                              {generatedReport.totals.calories - generatedReport.targets.calories >= 0 ? "+" : ""}
                              {generatedReport.totals.calories - generatedReport.targets.calories} kcal
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                                {generatedReport.compliance.metCalories ? "Optimal" : "Under Target"}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-4 font-bold text-white">Protein</td>
                            <td className="py-2.5 px-4">{generatedReport.targets.protein}g</td>
                            <td className="py-2.5 px-4 font-semibold text-emerald-400">{generatedReport.totals.protein}g</td>
                            <td className="py-2.5 px-4">
                              {Math.round((generatedReport.totals.protein - generatedReport.targets.protein) * 10) / 10}g
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                                {generatedReport.compliance.metProtein ? "Target Met" : "In Progress"}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-4 font-bold text-white">Carbohydrates</td>
                            <td className="py-2.5 px-4">{generatedReport.targets.carbs}g</td>
                            <td className="py-2.5 px-4 font-semibold text-amber-400">{generatedReport.totals.carbs}g</td>
                            <td className="py-2.5 px-4">
                              {Math.round((generatedReport.totals.carbs - generatedReport.targets.carbs) * 10) / 10}g
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <span className="text-slate-400">Tracked</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-4 font-bold text-white">Total Fat</td>
                            <td className="py-2.5 px-4">{generatedReport.targets.fat}g</td>
                            <td className="py-2.5 px-4 font-semibold text-purple-400">{generatedReport.totals.fat}g</td>
                            <td className="py-2.5 px-4">
                              {Math.round((generatedReport.totals.fat - generatedReport.targets.fat) * 10) / 10}g
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <span className="text-slate-400">Tracked</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-4 font-bold text-white">Dietary Fibre</td>
                            <td className="py-2.5 px-4">{generatedReport.targets.fibre}g</td>
                            <td className="py-2.5 px-4 font-semibold text-blue-400">{generatedReport.totals.fibre}g</td>
                            <td className="py-2.5 px-4">
                              {Math.round((generatedReport.totals.fibre - generatedReport.targets.fibre) * 10) / 10}g
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <span className="text-slate-400">Tracked</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Consumed Items Breakdown */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Confirmed Food Entries for {generatedReport.date} ({generatedReport.entries.length} items)
                      </h4>
                      <div className="rounded-xl border border-slate-800 divide-y divide-slate-800">
                        {generatedReport.entries.length === 0 ? (
                          <div className="p-4 text-center text-slate-500 text-xs">
                            No diary logs recorded on this date.
                          </div>
                        ) : (
                          generatedReport.entries.map((item) => (
                            <div key={item.id} className="p-3 flex items-center justify-between text-xs">
                              <div>
                                <span className="font-bold text-white">{item.foodName}</span>
                                <span className="text-slate-400 ml-2">
                                  ({item.quantity} {item.unit} • {item.mealCategory})
                                </span>
                              </div>
                              <span className="font-medium text-slate-300">
                                {item.calories} kcal • {item.proteinG}g P • {item.carbsG}g C
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Official Sign-Off Footer */}
                    <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Generated by Sarveswar Health Platform Deterministic Audit Engine</span>
                      <span>Verified Administrator Signature: [Approved]</span>
                    </div>
                  </div>
                )}

                {/* 2. All-Days Multi-Day Cumulative Report Card */}
                {reportType === "all_days" && allDaysReport && (
                  <div className="p-6 md:p-8 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl space-y-6 print:bg-white print:text-black">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-5 gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-blue-500" />
                          <h3 className="text-xl font-extrabold text-white">
                            All-Days Cumulative User Nutrition &amp; Intake Audit
                          </h3>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Subject: <strong className="text-white">{allDaysReport.user.name}</strong> (@{allDaysReport.user.username}) • Email: {allDaysReport.user.email} • ID: {allDaysReport.user.id}
                        </p>
                      </div>

                      <div className="text-right flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.print()}
                          className="text-xs rounded-xl border-slate-700 gap-1.5 text-slate-200"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print / Save PDF</span>
                        </Button>
                      </div>
                    </div>

                    {/* Cumulative Master Metric Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                        <p className="text-slate-400">Total Days Tracked</p>
                        <p className="font-extrabold text-white text-xl mt-1">{allDaysReport.totalDays} Days</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                        <p className="text-slate-400">Total Lifetime Calories</p>
                        <p className="font-extrabold text-purple-400 text-xl mt-1">{allDaysReport.totalCalories.toLocaleString()} kcal</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                        <p className="text-slate-400">Avg Daily Calories</p>
                        <p className="font-extrabold text-white text-xl mt-1">{allDaysReport.avgCalories} kcal</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                        <p className="text-slate-400">Avg Daily Protein</p>
                        <p className="font-extrabold text-emerald-400 text-xl mt-1">{allDaysReport.avgProtein}g</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                        <p className="text-slate-400">Avg Daily Hydration</p>
                        <p className="font-extrabold text-cyan-400 text-xl mt-1">{allDaysReport.avgWater} ml</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                        <p className="text-slate-400">Dinner Cutoff Compliance</p>
                        <p className="font-extrabold text-emerald-400 text-xl mt-1">{allDaysReport.dinnerCompliancePct}%</p>
                      </div>
                    </div>

                    {/* Day-by-Day Matrix Breakdown Table */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Day-by-Day Historical Intake Matrix ({allDaysReport.days.length} Days)
                      </h4>
                      <div className="overflow-x-auto rounded-xl border border-slate-800">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                              <th className="py-2.5 px-4">Date</th>
                              <th className="py-2.5 px-4">Items</th>
                              <th className="py-2.5 px-4">Calories</th>
                              <th className="py-2.5 px-4">Protein</th>
                              <th className="py-2.5 px-4">Carbs</th>
                              <th className="py-2.5 px-4">Fat</th>
                              <th className="py-2.5 px-4">Water</th>
                              <th className="py-2.5 px-4">Dinner Time</th>
                              <th className="py-2.5 px-4 text-right">Cutoff Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {allDaysReport.days.length === 0 ? (
                              <tr>
                                <td colSpan={9} className="py-6 text-center text-slate-500">
                                  No historical intake entries found for this user.
                                </td>
                              </tr>
                            ) : (
                              allDaysReport.days.map((d) => (
                                <tr key={d.date} className="hover:bg-slate-800/40">
                                  <td className="py-2.5 px-4 font-bold text-white">{d.date}</td>
                                  <td className="py-2.5 px-4 text-slate-400">{d.itemsCount} items</td>
                                  <td className="py-2.5 px-4 font-semibold text-white">{d.totals.calories} kcal</td>
                                  <td className="py-2.5 px-4 font-semibold text-emerald-400">{d.totals.protein}g</td>
                                  <td className="py-2.5 px-4 text-amber-400">{d.totals.carbs}g</td>
                                  <td className="py-2.5 px-4 text-purple-400">{d.totals.fat}g</td>
                                  <td className="py-2.5 px-4 text-cyan-400">{d.waterMl > 0 ? `${d.waterMl} ml` : "—"}</td>
                                  <td className="py-2.5 px-4 text-slate-300">{d.dinnerTime || "No Dinner"}</td>
                                  <td className="py-2.5 px-4 text-right">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      d.dinnerFollowedCutoff
                                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                        : "bg-amber-950 text-amber-400 border border-amber-800"
                                    }`}>
                                      {d.dinnerFollowedCutoff ? "Compliant" : "Cutoff Missed"}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Official Sign-Off Footer */}
                    <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Generated by Sarveswar Health Platform Multi-Day Audit Engine</span>
                      <span>Verified Administrator Signature: [Approved]</span>
                    </div>
                  </div>
                )}

                {/* Empty State when no report has been generated */}
                {!generatedReport && !allDaysReport && (
                  <div className="p-12 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
                    Select a user above and choose between &quot;Single Date Report&quot; or &quot;All-Days Cumulative Report&quot; to compile the complete audit.
                  </div>
                )}
              </div>
            )}

            {/* -------------------------------------------------------------- */}
            {/* TAB 4: PRIMARY ADMIN CREDENTIALS & PASSWORD SETUP               */}
            {/* -------------------------------------------------------------- */}
            {activeTab === "security" && (
              <div className="max-w-xl mx-auto space-y-6">
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">
                        Primary Admin Username &amp; Password Setup
                      </h2>
                      <p className="text-xs text-slate-400">
                        Customize your administrator login details so you never have to use the default credentials.
                      </p>
                    </div>
                  </div>

                  {adminCredsSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Admin credentials successfully updated! Use your new details for future logins.</span>
                    </div>
                  )}

                  {adminCredsError && (
                    <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{adminCredsError}</span>
                    </div>
                  )}

                  <form onSubmit={handleUpdateAdminCreds} className="space-y-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Admin Display Name
                      </label>
                      <input
                        type="text"
                        defaultValue={currentUser?.name || ""}
                        onChange={(e) => setAdminCustomName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Admin Username
                      </label>
                      <input
                        type="text"
                        defaultValue={currentUser?.username || ""}
                        onChange={(e) => setAdminCustomUsername(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Change to your private chosen username.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        New Admin Password
                      </label>
                      <input
                        type="password"
                        value={adminCustomPassword}
                        onChange={(e) => setAdminCustomPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Change to your secret password.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save &amp; Update Admin Credentials</span>
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </main>

          {/* ---------------------------------------------------------------- */}
          {/* MODAL: ADD NEW USER (Primary Admin Only)                         */}
          {/* ---------------------------------------------------------------- */}
          {showAddModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 rounded-2xl max-w-md w-full border border-slate-800 shadow-2xl overflow-hidden">
                <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-purple-400" />
                    <h3 className="font-bold text-sm text-white">Provision New User Account</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                  {addError && (
                    <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{addError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      autoComplete="off"
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Username (@handle)</label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      autoComplete="off"
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      autoComplete="off"
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Role</label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="user">Standard User</option>
                        <option value="secondary_admin">Secondary Admin</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={newEmailSub}
                          onChange={(e) => setNewEmailSub(e.target.checked)}
                          className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
                        />
                        <span>Email Reports</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                    >
                      Create User Account
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* MODAL: RESTRICTION PERMISSION DENIED (Secondary Admin Protection) */}
          {/* ---------------------------------------------------------------- */}
          {restrictedModalMessage && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 rounded-2xl max-w-sm w-full border border-amber-900/60 p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-950/60 text-amber-400 border border-amber-800 mx-auto flex items-center justify-center">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-white">Restricted Feature</h3>
                <p className="text-xs text-slate-400">
                  {restrictedModalMessage}
                </p>
                <Button
                  onClick={() => setRestrictedModalMessage(null)}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                >
                  Understood
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
