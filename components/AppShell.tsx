"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "./AppHeader";
import { ComingSoonDialog } from "./ComingSoonDialog";
import { OfflineIndicator } from "./OfflineIndicator";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";

const SIDEBAR_KEY = "pmd.ui.sidebar";
const RAIL_KEY = "pmd.ui.rail";

interface AppShellProps {
  children: React.ReactNode;
  /** Left rail content (home page passes the chat history). */
  sidebar?: React.ReactNode;
  /**
   * Right rail content as a render function, so the content can wire its own
   * close button to the shell's collapse state.
   */
  aside?: (close: () => void) => React.ReactNode;
}

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === "1";
  } catch {
    return fallback;
  }
}

function writeFlag(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // Preference persistence is best-effort.
  }
}

export function AppShell({ children, sidebar, aside }: AppShellProps) {
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  // Left rail starts open; the saved-prompts rail starts collapsed. Both
  // remember the user's choice for next visit.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [railOpen, setRailOpen] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect --
       Stored rail preferences are read after hydration so the first client
       render matches the server-rendered markup. */
    setSidebarOpen(readFlag(SIDEBAR_KEY, true));
    setRailOpen(readFlag(RAIL_KEY, false));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function toggleSidebar() {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    writeFlag(SIDEBAR_KEY, next);
  }

  function toggleRail() {
    const next = !railOpen;
    setRailOpen(next);
    writeFlag(RAIL_KEY, next);
  }

  function closeRail() {
    setRailOpen(false);
    writeFlag(RAIL_KEY, false);
  }

  const showSidebar = Boolean(sidebar) && sidebarOpen;
  const showRail = Boolean(aside) && railOpen;

  return (
    <>
      <ServiceWorkerRegister />
      {/* App shell: header is pinned; only the content region scrolls. */}
      <div className="flex h-dvh overflow-hidden">
        {showSidebar && (
          <aside className="hidden shrink-0 md:block" aria-label="Chat history">
            {sidebar}
          </aside>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="shrink-0">
            <AppHeader
              onOpenComingSoon={() => setComingSoonOpen(true)}
              sidebarToggle={
                sidebar
                  ? {
                      open: sidebarOpen,
                      onClick: toggleSidebar,
                    }
                  : undefined
              }
              railToggle={
                aside
                  ? {
                      open: railOpen,
                      onClick: toggleRail,
                    }
                  : undefined
              }
            />
            <OfflineIndicator />
          </div>

          <div className="flex min-h-0 flex-1">
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
              <div className="flex min-h-full flex-1 flex-col">{children}</div>
            </div>

            {showRail && (
              <aside
                className="hidden shrink-0 md:block"
                aria-label="Saved prompts"
              >
                {aside?.(closeRail)}
              </aside>
            )}
          </div>
        </div>
      </div>

      <ComingSoonDialog
        open={comingSoonOpen}
        onClose={() => setComingSoonOpen(false)}
      />
    </>
  );
}
