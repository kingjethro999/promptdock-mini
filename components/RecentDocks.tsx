"use client";

import { Dock } from "../lib/types";

interface RecentDocksProps {
  docks: Dock[];
  onRestore: (dock: Dock) => void;
  onDelete: (id: string) => void;
}

function relativeTime(timestamp: number): string {
  const minutes = Math.floor((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return "yesterday";
  return `${Math.floor(hours / 24)}d ago`;
}

export function RecentDocks({ docks, onRestore, onDelete }: RecentDocksProps) {
  if (docks.length === 0) return null;
  return (
    <section className="flex flex-col gap-2" aria-label="Recent docks">
      <h2 className="text-sm font-semibold text-muted">
        Recent docks · local only · newest first · cap 10
      </h2>
      <ul className="flex flex-col gap-2">
        {docks.map((dock) => (
          <li
            key={dock.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-line bg-panel px-4 py-2.5"
          >
            <button
              type="button"
              onClick={() => onRestore(dock)}
              className="min-w-0 flex-1 truncate text-left text-sm text-fg transition-colors hover:text-green"
            >
              {dock.title}
            </button>
            <span className="flex shrink-0 items-center gap-2 font-mono text-xs text-muted">
              {relativeTime(dock.updatedAt)}
              <button
                type="button"
                aria-label={`Delete ${dock.title}`}
                onClick={() => onDelete(dock.id)}
                className="text-muted transition-colors hover:text-fg"
              >
                ✕
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
