"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Sparkles, Star } from "lucide-react";
import { PromptVersion } from "../lib/prompt-store";
import { VersionPicker } from "./VersionPicker";

interface PromptArtifactProps {
  value: string;
  versions: PromptVersion[];
  activeVersionId: string | null;
  busy: boolean;
  canRefine: boolean;
  interpretationChanged: boolean;
  updatedCue: boolean;
  onChange: (next: string) => void;
  onSelectVersion: (versionId: string) => void;
  onToggleFavorite: (versionId: string) => void;
  onUpdatePrompt: () => void;
  onRefine: () => void;
}

/**
 * The versioned prompt artifact card (addendum §4/§6): standalone prompt body
 * with Copy, Favorite, Edit, Refine, and a version selector. The body always
 * holds the reusable prompt only — never chat scaffolding.
 */
export function PromptArtifact({
  value,
  versions,
  activeVersionId,
  busy,
  canRefine,
  interpretationChanged,
  updatedCue,
  onChange,
  onSelectVersion,
  onToggleFavorite,
  onUpdatePrompt,
  onRefine,
}: PromptArtifactProps) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = versions.find((v) => v.id === activeVersionId) ?? null;
  const isFavorite = active?.isFavorite ?? false;

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
      if (editTimer.current) clearTimeout(editTimer.current);
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function handleEdit(next: string) {
    onChange(next);
    // Debounced draft: only the parent decides when a committed version is
    // written — never one version per keystroke (addendum §5).
    if (editTimer.current) clearTimeout(editTimer.current);
    editTimer.current = setTimeout(() => setEditing(false), 1200);
  }

  const outOfSync = interpretationChanged;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-panel px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">
          Your prompt
          {updatedCue && (
            <span
              className="flex items-center gap-1 text-xs font-medium text-green"
              aria-live="polite"
            >
              <Sparkles aria-hidden className="size-3" />
              Updated
            </span>
          )}
        </h2>
        <VersionPicker
          versions={versions}
          activeVersionId={activeVersionId}
          onSelect={onSelectVersion}
          busy={busy}
        />
      </div>

      <textarea
        value={value}
        onChange={(event) => handleEdit(event.target.value)}
        onFocus={() => setEditing(true)}
        rows={12}
        disabled={busy}
        spellCheck={false}
        aria-label="Prompt body"
        className="w-full resize-y rounded-xl border border-line bg-bg px-4 py-3 text-sm leading-relaxed text-fg focus:border-green focus:outline-none disabled:opacity-60"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="flex items-center gap-1.5 rounded-full border border-line bg-panel px-4 py-1.5 text-xs font-semibold text-fg transition-colors hover:border-green"
          >
            {copied ? (
              <>
                <Check aria-hidden className="size-3 text-green" />
                Copied
              </>
            ) : (
              <>
                <Copy aria-hidden className="size-3" />
                Copy
              </>
            )}
          </button>
          <button
            type="button"
            disabled={!active}
            onClick={() => active && onToggleFavorite(active.id)}
            aria-pressed={isFavorite}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
              isFavorite
                ? "border-green bg-green text-bg"
                : "border-line bg-panel text-fg hover:border-green"
            }`}
          >
            <Star
              aria-hidden
              className={`size-3 ${isFavorite ? "fill-current" : ""}`}
            />
            {isFavorite ? "Favorited" : "Favorite"}
          </button>
          {canRefine && (
            <button
              type="button"
              disabled={busy}
              onClick={onRefine}
              className="rounded-full border border-line bg-panel px-4 py-1.5 text-xs font-semibold text-fg transition-colors hover:border-green disabled:opacity-40"
            >
              Refine…
            </button>
          )}
        </div>
        {editing && (
          <span className="text-xs text-muted" aria-live="polite">
            Draft — saves automatically
          </span>
        )}
      </div>

      {outOfSync && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-bg px-4 py-3">
          <span className="text-sm text-fg">Understanding changed.</span>
          <button
            type="button"
            disabled={busy}
            onClick={onUpdatePrompt}
            className="rounded-full bg-green px-4 py-1.5 text-xs font-semibold text-bg transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Building…" : "Update prompt"}
          </button>
        </div>
      )}
    </section>
  );
}
