"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, Star } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface RailToggle {
  open: boolean;
  onClick: () => void;
}

interface AppHeaderProps {
  onOpenComingSoon: () => void;
  sidebarToggle?: RailToggle;
  railToggle?: RailToggle;
}

const iconButton =
  "flex items-center justify-center rounded-lg border border-line px-2 py-1.5 text-muted transition-colors hover:border-green hover:text-fg";

export function AppHeader({
  onOpenComingSoon,
  sidebarToggle,
  railToggle,
}: AppHeaderProps) {
  const pathname = usePathname();
  const onLibrary = pathname === "/library";

  return (
    <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 md:px-6 md:py-4">
      <div className="flex min-w-0 items-center gap-3">
        {sidebarToggle && (
          <button
            type="button"
            onClick={sidebarToggle.onClick}
            data-testid="toggle-sidebar"
            aria-pressed={sidebarToggle.open}
            aria-label={sidebarToggle.open ? "Hide chat history" : "Show chat history"}
            title={sidebarToggle.open ? "Hide chat history" : "Show chat history"}
            className={iconButton}
          >
            {sidebarToggle.open ? (
              <PanelLeftClose aria-hidden className="size-4" />
            ) : (
              <PanelLeftOpen aria-hidden className="size-4" />
            )}
          </button>
        )}
        <Link
          href="/"
          className="truncate text-sm font-extrabold tracking-tight text-green"
        >
          Prompt Dock <span className="text-muted">Mini</span>
        </Link>
      </div>

      <nav className="flex items-center gap-2" aria-label="Primary">
        {railToggle && (
          <button
            type="button"
            onClick={railToggle.onClick}
            data-testid="toggle-rail"
            aria-pressed={railToggle.open}
            aria-label="Saved prompts"
            title="Saved prompts"
            className={`${iconButton} ${railToggle.open ? "border-green text-fg" : ""}`}
          >
            <Star
              aria-hidden
              className={`size-4 ${railToggle.open ? "fill-current text-green" : ""}`}
            />
          </button>
        )}
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
          className="hidden rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-green hover:text-fg sm:block"
        >
          Coming soon
        </button>
        <ThemeToggle />
      </nav>
    </header>
  );
}
