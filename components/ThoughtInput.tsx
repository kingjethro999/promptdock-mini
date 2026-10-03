"use client";

import { isUsableThought } from "../lib/types";

interface ThoughtInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (thought: string) => void;
  busy?: boolean;
}

export function ThoughtInput({ value, onChange, onSubmit, busy = false }: ThoughtInputProps) {
  const ready = isUsableThought(value);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && ready && !busy) {
      event.preventDefault();
      onSubmit(value.trim());
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="thought" className="text-sm font-semibold text-muted">
        What are you trying to do?
      </label>
      <textarea
        id="thought"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={5}
        placeholder="e.g. an app for tracking what I lend people so I stop forgetting who has what"
        className="w-full resize-y rounded-xl border border-line bg-panel px-4 py-3 text-base text-fg placeholder:text-muted focus:border-green focus:outline-none"
      />
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs text-muted">Cmd/Ctrl + Enter to shape</span>
        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => onSubmit(value.trim())}
          className="rounded-full bg-green px-5 py-2.5 text-sm font-semibold text-bg transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Shaping…" : "Shape this"}
        </button>
      </div>
    </div>
  );
}
