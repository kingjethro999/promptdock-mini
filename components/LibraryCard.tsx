"use client";

import { PromptGroup, PromptVersion } from "../lib/prompt-store";

interface LibraryCardProps {
  group: PromptGroup;
  versions: PromptVersion[];
  onOpen: (groupId: string) => void;
  onRename: (groupId: string, title: string) => void;
  onDelete: (groupId: string) => void;
  onComingSoon: () => void;
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

export function LibraryCard({
  group,
  versions,
  onOpen,
  onRename,
  onDelete,
  onComingSoon,
}: LibraryCardProps) {
  const latest =
    versions.find((v) => v.id === group.latestVersionId) ??
    versions[versions.length - 1];
  const anyFavorite = versions.some((v) => v.isFavorite);
  const excerpt = (latest?.body ?? "").slice(0, 160);

  function handleRename() {
    const next = window.prompt("Rename prompt", group.title);
    if (next === null) return;
    const trimmed = next.trim();
    if (trimmed.length === 0 || trimmed === group.title) return;
    onRename(group.id, trimmed);
  }

  function handleDelete() {
    // Destructive ops need confirmation (addendum §4).
    if (window.confirm(`Delete “${group.title}” and all its versions?`)) {
      onDelete(group.id);
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-line bg-panel px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => onOpen(group.id)}
          className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-fg transition-colors hover:text-green"
        >
          {anyFavorite && (
            <span aria-hidden className="mr-1 text-green">
              ★
            </span>
          )}
          {group.title}
        </button>
        <span className="shrink-0 font-mono text-xs text-muted">
          v{latest?.versionNumber ?? 1} · {versions.length} ver
        </span>
      </div>

      <p className="line-clamp-3 text-xs leading-relaxed text-muted">
        {excerpt}
        {(latest?.body ?? "").length > 160 ? "…" : ""}
      </p>

      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-muted">
          {relativeTime(group.updatedAt)}
        </span>
        <div className="flex items-center gap-2">
          {/* Share is intentionally unavailable — no real link is generated. */}
          <button
            type="button"
            aria-disabled="true"
            title="Coming soon"
            onClick={onComingSoon}
            className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted transition-colors hover:border-green hover:text-fg"
          >
            Share
          </button>
          <button
            type="button"
            onClick={handleRename}
            className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted transition-colors hover:border-green hover:text-fg"
          >
            Rename
          </button>
          <button
            type="button"
            aria-label={`Delete ${group.title}`}
            onClick={handleDelete}
            className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted transition-colors hover:border-green hover:text-fg"
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}
