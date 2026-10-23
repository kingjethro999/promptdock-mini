"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

interface AppHeaderProps {
  onOpenComingSoon: () => void;
}

export function AppHeader({ onOpenComingSoon }: AppHeaderProps) {
  const pathname = usePathname();
  const onLibrary = pathname === "/library";

  return (
    <header className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
      <Link
        href="/"
        className="text-sm font-extrabold tracking-tight text-green"
      >
        Prompt Dock <span className="text-muted">Mini</span>
      </Link>
      <nav className="flex items-center gap-2" aria-label="Primary">
        <Link
          href="/library"
          aria-current={onLibrary ? "page" : undefined}
          className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
            onLibrary
              ? "border-green text-fg"
              : "border-line text-muted hover:border-green hover:text-fg"
          }`}
        >
          Library
        </Link>
        <button
          type="button"
          onClick={onOpenComingSoon}
          className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-green hover:text-fg"
        >
          Coming soon
        </button>
        <ThemeToggle />
      </nav>
    </header>
  );
}
