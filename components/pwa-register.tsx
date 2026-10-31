"use client";

import React, { useEffect, useState } from "react";
import { offlineQueueService } from "@/lib/services/offline-queue-service";
import { WifiOff, Download, CheckCircle2, RefreshCw } from "lucide-react";

export function PWARegister() {
  const [mounted, setMounted] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    // Check initial online status
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);

      // Register Service Worker
      if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
          navigator.serviceWorker
            .register("/sw.js")
            .then((registration) => {
              // Ensure immediate update check
              registration.update();
              console.log("PWA Service Worker registered:", registration.scope);
            })
            .catch((error) => {
              console.warn("PWA Service Worker registration failed:", error);
            });
        });
      }

      // Online / Offline listeners
      const handleOnline = async () => {
        setIsOffline(false);
        const { syncedCount } = await offlineQueueService.syncPendingQueue();
        if (syncedCount > 0) {
          setSyncStatus(`Synced ${syncedCount} offline entry(ies) successfully.`);
          setTimeout(() => setSyncStatus(null), 4000);
        }
      };

      const handleOffline = () => {
        setIsOffline(true);
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // PWA Install Prompt
      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowInstallBanner(true);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstall);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      console.log("User accepted PWA installation");
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  if (!mounted) return null;

  return (
    <>
      {/* Offline Status Pill / Banner */}
      {isOffline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 font-medium text-xs md:text-sm text-center flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>You are offline. Food entries will be marked <strong>&quot;pending, not saved&quot;</strong> and synchronized automatically when connection resumes.</span>
        </div>
      )}

      {/* Sync Success Pill */}
      {syncStatus && (
        <div className="bg-emerald-600 text-white px-4 py-2 font-medium text-xs md:text-sm text-center flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md">
          <CheckCircle2 className="w-4 h-4" />
          <span>{syncStatus}</span>
        </div>
      )}

      {/* Install App Banner (shown when eligible) */}
      {showInstallBanner && (
        <div className="fixed bottom-20 md:bottom-4 right-4 z-40 bg-white dark:bg-slate-900 border border-emerald-500/30 p-3 rounded-xl shadow-lg flex items-center gap-3 text-xs md:text-sm">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">Install Health Tracker</p>
            <p className="text-slate-500 text-xs">Fast offline-first experience</p>
          </div>
          <button
            onClick={handleInstallClick}
            className="ml-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-xs transition-colors"
          >
            Install
          </button>
          <button
            onClick={() => setShowInstallBanner(false)}
            className="text-slate-400 hover:text-slate-600 text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
