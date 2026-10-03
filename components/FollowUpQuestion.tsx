"use client";

import { useState } from "react";

interface FollowUpQuestionProps {
  question: string;
  questionCount: number;
  busy: boolean;
  onContinue: (answer: string) => Promise<boolean>;
}

export function FollowUpQuestion({
  question,
  questionCount,
  busy,
  onContinue,
}: FollowUpQuestionProps) {
  const [answer, setAnswer] = useState("");
  const ready = answer.replace(/\s/g, "").length > 0;

  async function handleContinue() {
    if (!ready || busy) return;
    const sent = await onContinue(answer.trim());
    if (sent) setAnswer("");
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-panel px-4 py-4">
      <h2 className="text-sm font-semibold text-fg">One thing I need to know</h2>
      <p className="text-sm text-fg">{question}</p>
      <textarea
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        rows={2}
        placeholder="Your answer"
        className="w-full resize-y rounded-xl border border-line bg-bg px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-green focus:outline-none"
      />
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs text-muted">
          Question {questionCount + 1} of at most 3 · interpretation stays visible
        </span>
        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => void handleContinue()}
          className="rounded-full bg-green px-5 py-2 text-sm font-semibold text-bg transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Shaping…" : "Continue"}
        </button>
      </div>
    </section>
  );
}
