"use client";

import { useEffect, useRef } from "react";

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  mode: "create" | "refine";
  busy: boolean;
  /** Offline disables generation with an explanation, per addendum §7. */
  online: boolean;
  onExpand: () => void;
  placeholder?: string;
}

const MAX_ROWS = 14;

export function Composer({
  value,
  onChange,
  onSubmit,
  mode,
  busy,
  online,
  onExpand,
  placeholder,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const canSubmit =
    value.replace(/\s/g, "").length > 0 && !busy && online;
  const actionLabel = mode === "create" ? "Shape idea" : "Refine prompt";

  // Autosize: grow to content up to MAX_ROWS, then scroll internally.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight || "20");
    const max = lineHeight * MAX_ROWS;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, [value]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // IME composition must not submit (avoid trapping IME users).
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit) onSubmit();
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-panel px-3 py-2 shadow-sm">
      <label htmlFor="composer-input" className="sr-only">
        {mode === "create"
          ? "Describe what you are trying to get done"
          : "Describe the change you want in this prompt"}
      </label>
      <textarea
        id="composer-input"
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder={
          placeholder ??
          (mode === "create"
            ? "Describe it however it comes to mind…"
            : "Describe the change… e.g. shorten it, add an offline requirement")
        }
        className="max-h-none w-full resize-none bg-transparent px-2 py-2 text-base text-fg placeholder:text-muted focus:outline-none"
      />
      <div className="flex items-center justify-between gap-3 px-1 pb-1">
        <button
          type="button"
          onClick={onExpand}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:text-fg"
        >
          Expand
        </button>
        <div className="flex items-center gap-3">
          {!online && (
            <span className="text-xs text-muted">
              Generation needs a connection
            </span>
          )}
          <span className="text-xs text-muted">
            Enter to {mode === "create" ? "shape" : "refine"} · Shift+Enter for
            a new line
          </span>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={onSubmit}
            className="rounded-full bg-green px-5 py-2 text-sm font-semibold text-bg transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Working…" : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
