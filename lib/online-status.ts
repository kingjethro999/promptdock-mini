"use client";

import { useSyncExternalStore } from "react";

/**
 * Advisory online/offline signal (addendum §7). Used for status display and to
 * guard generation UX; network errors are still handled on their own.
 *
 * Implemented with useSyncExternalStore so the value is read directly from the
 * platform during render — no setState-in-effect, and the server snapshot is a
 * stable `true` (the app must render the online UI on first paint).
 */

function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
