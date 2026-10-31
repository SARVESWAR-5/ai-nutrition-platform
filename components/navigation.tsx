"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { authService, UserSession } from "@/lib/services/auth-service";
import {
  LayoutDashboard,
  PlusCircle,
  BookOpen,
  Sparkles,
  Calendar,
  Bookmark,
  Dumbbell,
  Droplet,
  Scale,
  LineChart,
  FileText,
  UserCheck,
  Settings,
  LogIn,
  LogOut,
  User,
  Shield,
} from "lucide-react";
import { cn } from "./ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/add-food", label: "Add Food", icon: PlusCircle, highlight: true },
  { href: "/diary", label: "Food Diary", icon: BookOpen },
  { href: "/recommendations", label: "AI Recommendations", icon: Sparkles },
  { href: "/recipes", label: "Saved Recipes", icon: Bookmark },
  { href: "/exercise", label: "Exercise", icon: Dumbbell },
  { href: "/water", label: "Water", icon: Droplet },
  { href: "/weight", label: "Weight & Progress", icon: Scale },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/profile", label: "Profile & Goals", icon: UserCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = React.useState<UserSession | null>(null);

  React.useEffect(() => {
    const update = () => {
      setCurrentUser(authService.getCurrentUser());
    };
    update();
    window.addEventListener("sarveswar-auth-changed", update);
    return () => window.removeEventListener("sarveswar-auth-changed", update);
  }, []);

  const isAdmin = authService.isAdmin() || currentUser?.role === "primary_admin" || currentUser?.role === "secondary_admin";

  const handleLogout = () => {
    authService.logout();
    router.push("/login");
  };

  // Dedicated Admin layout: do not render the personal consumer tracking sidebar on /admin
  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-screen sticky top-0 overflow-y-auto p-4">
        <div className="flex items-center gap-3 px-3 py-4 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            N
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">AI Nutrition</h1>
            <p className="text-xs text-slate-500">{currentUser ? currentUser.name : "Personal"} • Asia/Kolkata</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60",
                  item.highlight && !isActive && "text-emerald-600 dark:text-emerald-400"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-emerald-600 dark:text-emerald-400" : "")} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors mt-2 border border-purple-200/60 dark:border-purple-900/60",
                pathname === "/admin"
                  ? "bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-200"
                  : "bg-purple-50/60 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60"
              )}
            >
              <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Admin Portal</span>
            </Link>
          )}
        </nav>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
          {currentUser && (
            <div className="px-3 py-1.5 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">@{currentUser.username}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <Link
            href="/login"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
          >
            <LogIn className="w-4 h-4 text-emerald-600" />
            <span>Switch Account / Sign In</span>
          </Link>
        </div>
      </aside>

      {/* Mobile Bottom Navigation (Prompt 4.1: Fast access to Add Food, Goals, Ask AI, Diary, Water) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 px-2 py-2 flex items-center justify-around">
        <Link
          href="/dashboard"
          className={cn(
            "flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-2 rounded-md",
            pathname === "/dashboard" ? "text-emerald-600" : "text-slate-500"
          )}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Home</span>
        </Link>
        <Link
          href="/diary"
          className={cn(
            "flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-2 rounded-md",
            pathname === "/diary" ? "text-emerald-600" : "text-slate-500"
          )}
        >
          <BookOpen className="w-5 h-5" />
          <span>Diary</span>
        </Link>
        <Link
          href="/add-food"
          className="flex flex-col items-center gap-1 -mt-4"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-lg">
            <PlusCircle className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">Add Food</span>
        </Link>
        <Link
          href="/recommendations"
          className={cn(
            "flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-2 rounded-md",
            pathname === "/recommendations" ? "text-purple-600" : "text-slate-500"
          )}
        >
          <Sparkles className="w-5 h-5" />
          <span>Ask AI</span>
        </Link>
        <Link
          href="/profile"
          className={cn(
            "flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-2 rounded-md",
            pathname === "/profile" ? "text-emerald-600" : "text-slate-500"
          )}
        >
          <UserCheck className="w-5 h-5" />
          <span>Goals</span>
        </Link>
      </nav>
    </>
  );
}
