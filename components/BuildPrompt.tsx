"use client";

interface BuildPromptProps {
  busy: boolean;
  onBuild: () => void;
}

export function BuildPrompt({ busy, onBuild }: BuildPromptProps) {
  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={onBuild}
        className="self-start rounded-full bg-green px-6 py-2.5 text-sm font-semibold text-bg transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Building…" : "Build prompt"}
      </button>
    </section>
  );
}
