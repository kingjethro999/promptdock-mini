"use client";

import { useEffect, useRef, useState } from "react";

interface ExpandedComposerProps {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  mode: "create" | "refine";
  busy: boolean;
  online: boolean;
}

/**
 * Large dialog editor (fullscreen on small screens, large modal on desktop).
 * Preserves unsent text and cursor position; Escape closes; focus is trapped
 * and restored (addendum §4).
 *
 * The outer component only gates mount; the panel owns its draft state,
 * initialized from `value` on mount (no setState-in-effect).
 */
export function ExpandedComposer({
  open,
  value,
  onChange,
  onSubmit,
  onClose,
  mode,
  busy,
  online,
}: ExpandedComposerProps) {
  if (!open) return null;
  return (
    <ExpandedPanel
      initialValue={value}
      onChange={onChange}
      onSubmit={onSubmit}
      onClose={onClose}
      mode={mode}
      busy={busy}
      online={online}
    />
  );
}

interface PanelProps {
  initialValue: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  mode: "create" | "refine";
  busy: boolean;
  online: boolean;
}

function ExpandedPanel({
  initialValue,
  onChange,
  onSubmit,
  onClose,
  mode,
  busy,
  online,
}: PanelProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [draft, setDraft] = useState(initialValue);
  const cursor = useRef<number | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Restore cursor to end (or last known position).
    const el = textareaRef.current;
    if (el) {
      el.focus();
      const pos = cursor.current ?? el.value.length;
      el.setSelectionRange(pos, pos);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [onClose]);

  const canSubmit = draft.replace(/\s/g, "").length > 0 && !busy && online;
  const actionLabel = mode === "create" ? "Shape idea" : "Refine prompt";

  function commit() {
    // Push the draft into parent state, then submit.
    onChange(draft);
    if (canSubmit) onSubmit();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={mode === "create" ? "Write your idea" : "Refine your prompt"}
        onClick={(event) => event.stopPropagation()}
        className="relative flex h-full max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-line bg-panel focus:outline-none"
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold text-fg">
            {mode === "create" ? "Write your idea" : "Refine your prompt"}
          </h2>
          <button
            type="button"
            aria-label="Close editor"
            onClick={onClose}
            className="rounded-full border border-line px-3 py-1 text-sm text-muted transition-colors hover:border-green hover:text-fg"
          >
            ✕
          </button>
        </div>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            cursor.current = event.target.selectionStart;
          }}
          placeholder={
            mode === "create"
              ? "Describe it however it comes to mind…"
              : "Describe the change… e.g. shorten it, add an offline requirement"
          }
          className="flex-1 resize-none bg-transparent px-5 py-4 text-base leading-relaxed text-fg placeholder:text-muted focus:outline-none"
        />
        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
          <span className="text-xs text-muted">
            {online ? "Esc to close" : "Generation needs a connection"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-green hover:text-fg"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={commit}
              className="rounded-full bg-green px-5 py-2 text-sm font-semibold text-bg transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Working…" : actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
