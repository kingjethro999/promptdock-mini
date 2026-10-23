"use client";

import { useState } from "react";
import { AppHeader } from "./AppHeader";
import { ComingSoonDialog } from "./ComingSoonDialog";
import { OfflineIndicator } from "./OfflineIndicator";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [comingSoonOpen, setComingSoonOpen] = useState(false);

  return (
    <>
      <AppHeader onOpenComingSoon={() => setComingSoonOpen(true)} />
      <OfflineIndicator />
      <div className="flex flex-1 flex-col">{children}</div>
      <ComingSoonDialog
        open={comingSoonOpen}
        onClose={() => setComingSoonOpen(false)}
      />
    </>
  );
}
