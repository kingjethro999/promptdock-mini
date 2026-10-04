"use client";

import { useEffect, useRef, useState } from "react";

interface PromptEditorProps {
  value: string;
  busy: boolean;
  promptEditedManually: boolean;
  interpretationChanged: boolean;
  updatedCue: boolean;
  onChange: (next: string) => void;
  onUpdatePrompt: () => void;
}

export function PromptEditor({
  value,
  busy,
  promptEditedManually,
  interpretationChanged,
  updatedCue,
  onChange,
  onUpdatePrompt,
}: PromptEditorProps) {
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
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

  const outOfSync = promptEditedManually && interpretationChanged;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">
          Your prompt
          {updatedCue && <span className="text-xs font-medium text-green">✦ Updated</span>}
        </h2>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="rounded-full border border-line bg-panel px-4 py-1.5 text-xs font-semibold text-fg transition-colors hover:border-green"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={14}
        disabled={busy}
        spellCheck={false}
        className="w-full resize-y rounded-xl border border-line bg-panel px-4 py-3 text-sm leading-relaxed text-fg focus:border-green focus:outline-none disabled:opacity-60"
      />

      {outOfSync && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel px-4 py-3">
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
