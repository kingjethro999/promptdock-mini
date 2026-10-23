"use client";

import { useEffect, useRef } from "react";

interface ComingSoonDialogProps {
  open: boolean;
  onClose: () => void;
}

const ROADMAP = [
  {
    title: "Shareable prompt links",
    body: "Send one prompt to someone else with a link. Not functional yet.",
  },
  {
    title: "Cross-device sync & accounts",
    body: "Sign in and pick up your library on another device. Planned.",
  },
  {
    title: "Community & discovery",
    body: "Browse and remix prompts others have shared. Planned.",
  },
  {
    title: "Cloud backup",
    body: "Optional hosted backup of your local library. Planned.",
  },
];

export function ComingSoonDialog({ open, onClose }: ComingSoonDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Move focus into the dialog.
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      // Simple focus trap: keep Tab cycling within the dialog.
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="coming-soon-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-lg rounded-2xl border border-line bg-panel p-6 focus:outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id="coming-soon-title"
            className="text-lg font-extrabold tracking-tight text-fg"
          >
            Coming soon
          </h2>
          <button
            type="button"
            aria-label="Close coming soon dialog"
            onClick={onClose}
            className="rounded-full border border-line px-3 py-1 text-sm text-muted transition-colors hover:border-green hover:text-fg"
          >
            ✕
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">
          A look at what&apos;s planned. None of these are available yet.
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {ROADMAP.map((item) => (
            <li
              key={item.title}
              className="rounded-xl border border-line bg-bg px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-fg">
                  {item.title}
                </span>
                <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] font-semibold tracking-widest text-muted uppercase">
                  Not yet available
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
