"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/services/auth-service";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  UserCheck,
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  User,
  AtSign,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = React.useState<"login" | "signup">("login");

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = React.useState("sarveswar5");
  const [loginPassword, setLoginPassword] = React.useState("sarve$h5");
  const [showLoginPassword, setShowLoginPassword] = React.useState(false);

  // Sign up form state
  const [name, setName] = React.useState("Sarveswar");
  const [username, setUsername] = React.useState("sarveswar_fit");
  const [email, setEmail] = React.useState("sarveswar@gmail.com");
  const [signupPassword, setSignupPassword] = React.useState("");
  const [showSignupPassword, setShowSignupPassword] = React.useState(false);
  const [dailyEmailReport, setDailyEmailReport] = React.useState(true);

  const [usernameStatus, setUsernameStatus] = React.useState<{
    checked: boolean;
    available: boolean;
    suggestion?: string;
  }>({ checked: false, available: true });

  const [error, setError] = React.useState<string | null>(null);

  // Live username uniqueness check
  React.useEffect(() => {
    if (mode === "signup" && username.trim().length >= 3) {
      const isAvailable = authService.isUsernameAvailable(username);
      const suggestion = !isAvailable ? authService.generateUniqueUsername(username) : undefined;
      setUsernameStatus({ checked: true, available: isAvailable, suggestion });
    } else {
      setUsernameStatus({ checked: false, available: true });
    }
  }, [username, mode]);

  const handleSuggestUsername = () => {
    const unique = authService.generateUniqueUsername(name || "sarveswar");
    setUsername(unique);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const res = await authService.loginAsync(loginIdentifier, loginPassword);
    if (res.success && res.user) {
      if (!res.user.isOnboarded) {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    } else {
      setError(res.error || "Login failed. Please check credentials.");
    }
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const res = authService.signup({
      name,
      username,
      email,
      password: signupPassword,
      dailyEmailReportEnabled: dailyEmailReport,
    });

    if (res.success && res.user) {
      router.push("/onboarding");
    } else {
      setError(res.error || "Registration failed.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 mx-auto flex items-center justify-center text-white font-black text-xl shadow-lg mb-3">
            N
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Personal AI Nutrition</h1>
          <p className="text-xs text-slate-500 mt-1">Multi-user safe architecture &amp; individual profile tracking</p>
        </div>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 -mx-6 px-6 pb-3">
              <div className="flex gap-5">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                  className={`text-sm font-bold pb-1 transition-all ${
                    mode === "login"
                      ? "text-emerald-600 border-b-2 border-emerald-600"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                  className={`text-sm font-bold pb-1 transition-all ${
                    mode === "signup"
                      ? "text-emerald-600 border-b-2 border-emerald-600"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Create Fresh Account
                </button>
              </div>

              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800 transition-colors shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Admin Page</span>
              </Link>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. SIGN IN FORM */}
            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Username or Email</span>
                  </label>
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="e.g. sarveswar or sarveswar@health.local"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Password</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5">
                  Sign In &amp; Open Diary
                </Button>

                <div className="pt-2 text-center">
                  <p className="text-xs text-slate-500">
                    Need a fresh start?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("signup")}
                      className="text-emerald-600 font-bold hover:underline"
                    >
                      Create fresh profile
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* 2. CREATE FRESH ACCOUNT FORM */}
            {mode === "signup" && (
              <form onSubmit={handleSignup} className="space-y-4">
                {/* 1. Normal Name to address user */}
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Normal Name (To Address You)</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sarveswar"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium"
                    required
                  />
                  <span className="text-[11px] text-slate-400">Used inside app headers and greetings</span>
                </div>

                {/* 2. Unique Username */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold uppercase text-slate-500 flex items-center gap-1">
                      <AtSign className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Unique Username</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSuggestUsername}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-0.5"
                    >
                      <Sparkles className="w-3 h-3" /> Auto-suggest
                    </button>
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                    placeholder="e.g. sarveswar_75"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-semibold"
                    required
                  />

                  {/* Availability feedback */}
                  {usernameStatus.checked && (
                    <div className="mt-1 text-[11px]">
                      {usernameStatus.available ? (
                        <p className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> &quot;{username}&quot; is unique &amp; available
                        </p>
                      ) : (
                        <div>
                          <p className="text-rose-600 font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Username &quot;{username}&quot; is already taken!
                          </p>
                          {usernameStatus.suggestion && (
                            <button
                              type="button"
                              onClick={() => setUsername(usernameStatus.suggestion!)}
                              className="text-emerald-700 dark:text-emerald-400 underline font-bold mt-0.5"
                            >
                              Use suggested unique username: {usernameStatus.suggestion}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Email ID for end-of-day reports */}
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Email ID (For End-of-Day Reports)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. sarveswar@gmail.com"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium"
                    required
                  />
                  <span className="text-[11px] text-slate-400">
                    Used to deliver your automated daily macro &amp; calorie breakdown report at day end.
                  </span>
                </div>

                {/* 4. Password */}
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Password</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showSignupPassword ? "text" : "password"}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium pr-10"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 5. End of Day Email Report Opt-in */}
                <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="dailyReport"
                    checked={dailyEmailReport}
                    onChange={(e) => setDailyEmailReport(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="dailyReport" className="text-xs text-slate-700 dark:text-slate-300 leading-tight">
                    <strong>Daily End-of-Day Report:</strong> Send an automated PDF / email summary of my calories, protein, carbs, fat, water, and dinner cutoff compliance every evening.
                  </label>
                </div>

                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5">
                  Register &amp; Start Onboarding
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Dedicated Admin Portal Access Section */}
        <div className="mt-4 p-4 rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/30 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-purple-900 dark:text-purple-300">
                Administrator Section
              </h2>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Manage all platform users, view usage regularity &amp; generate reports
              </p>
            </div>
          </div>
          <Link href="/admin">
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-1 text-xs shadow">
              <span>Go to Admin Page</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        <p className="text-[11px] text-center text-slate-400 mt-4 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Encrypted Password Storage • Separate Local &amp; Database Partitioning</span>
        </p>
      </div>
    </div>
  );
}
