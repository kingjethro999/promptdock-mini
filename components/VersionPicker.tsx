"use client";

import { PromptVersion } from "../lib/prompt-store";

interface VersionPickerProps {
  versions: PromptVersion[];
  activeVersionId: string | null;
  onSelect: (versionId: string) => void;
  busy?: boolean;
}

function labelFor(version: PromptVersion): string {
  const date = new Date(version.createdAt);
  const stamp = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const source =
    version.source === "ai-refinement"
      ? "refined"
      : version.source === "manual-edit"
        ? "edited"
        : version.source === "migration"
          ? "imported"
          : "built";
  return `v${version.versionNumber} · ${source} · ${stamp}`;
}

export function VersionPicker({
  versions,
  activeVersionId,
  onSelect,
  busy = false,
}: VersionPickerProps) {
  if (versions.length === 0) return null;

  // Show newest first in the menu; keep selection controlled.
  const ordered = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="version-picker" className="sr-only">
        Prompt version
      </label>
      <select
        id="version-picker"
        value={activeVersionId ?? ""}
        disabled={busy}
        onChange={(event) => onSelect(event.target.value)}
        className="rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-fg focus:border-green focus:outline-none disabled:opacity-60"
      >
        {ordered.map((version) => (
          <option key={version.id} value={version.id}>
            {labelFor(version)}
          </option>
        ))}
      </select>
      <span className="font-mono text-xs text-muted">
        {versions.length} version{versions.length === 1 ? "" : "s"}
      </span>
    </div>
  );
}
