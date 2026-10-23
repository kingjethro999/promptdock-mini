"use client";

import { useOnlineStatus } from "../lib/online-status";

/**
 * Quiet, non-blocking status line shown only when offline (addendum §7).
 * Offline library access is real; offline AI generation is not.
 */
export function OfflineIndicator() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 border-b border-line bg-panel px-4 py-2 text-xs font-semibold text-fg"
    >
      <span aria-hidden>●</span>
      <span>
        Offline — your saved prompts are available. Generation needs a
        connection.
      </span>
    </div>
  );
}
