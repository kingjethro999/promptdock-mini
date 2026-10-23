"use client";

import { useEffect } from "react";

/**
 * Registers the production service worker (addendum §7). Skipped in dev so
 * stale worker caches never interfere with hot reload.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failure is non-fatal: the app works online without it.
    });
  }, []);
  return null;
}
