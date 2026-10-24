"use client";

import { useState } from "react";
import { AppHeader } from "./AppHeader";
import { ComingSoonDialog } from "./ComingSoonDialog";
import { OfflineIndicator } from "./OfflineIndicator";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [comingSoonOpen, setComingSoonOpen] = useState(false);

  return (
    <>
      <ServiceWorkerRegister />
      {/* App shell: header is pinned; only the content region scrolls. */}
      <div className="flex h-dvh flex-col overflow-hidden">
        <div className="shrink-0">
          <AppHeader onOpenComingSoon={() => setComingSoonOpen(true)} />
          <OfflineIndicator />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          <div className="flex min-h-full flex-1 flex-col">{children}</div>
        </div>
      </div>
      <ComingSoonDialog
        open={comingSoonOpen}
        onClose={() => setComingSoonOpen(false)}
      />
    </>
  );
}
