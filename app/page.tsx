"use client";

import { useState } from "react";
import { FollowUpQuestion } from "../components/FollowUpQuestion";
import { Interpretation } from "../components/Interpretation";
import { ThoughtInput } from "../components/ThoughtInput";
import { Field, MAX_QUESTIONS, ShapeResponse } from "../lib/types";

interface ShapePayload {
  thought: string;
  interpretation: { fields: Field[] } | undefined;
  answers: string[];
  questionCount: number;
  lastQuestion: string | null;
}

export default function Home() {
  const [thought, setThought] = useState("");
  const [fields, setFields] = useState<Field[] | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState<ShapePayload | null>(null);

  async function runShape(payload: ShapePayload): Promise<boolean> {
    setBusy(true);
    setError(false);
    setPending(payload);
    try {
      const res = await fetch("/api/shape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`shape failed: ${res.status}`);
      const data = (await res.json()) as ShapeResponse;
      setThought(payload.thought);
      setFields(data.interpretation.fields);
      const asksAgain =
        data.needsFollowUp &&
        data.question !== null &&
        payload.questionCount < MAX_QUESTIONS;
      setQuestion(asksAgain ? data.question : null);
      return true;
    } catch {
      setError(true);
      return false;
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(next: string) {
    const isReshape = fields !== null;
    void runShape({
      thought: next,
      interpretation: isReshape && fields ? { fields } : undefined,
      answers: isReshape ? answers : [],
      questionCount: isReshape ? questionCount : 0,
      lastQuestion: isReshape ? question : null,
    });
  }

  async function handleContinue(answer: string): Promise<boolean> {
    if (fields === null || question === null) return false;
    const nextAnswers = [...answers, answer];
    const nextCount = questionCount + 1;
    const sent = await runShape({
      thought,
      interpretation: { fields },
      answers: nextAnswers,
      questionCount: nextCount,
      lastQuestion: question,
    });
    if (sent) {
      setAnswers(nextAnswers);
      setQuestionCount(nextCount);
    }
    return sent;
  }

  function handleFieldChange(next: Field[]) {
    setFields(next);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      {fields === null ? (
        <>
          <section className="flex flex-col gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-fg">
              Drop the rough version of the idea here.
            </h1>
            <p className="text-sm text-muted">
              Half a sentence is fine. You will shape it next.
            </p>
          </section>

          <ThoughtInput
            value={thought}
            onChange={setThought}
            onSubmit={handleSubmit}
            busy={busy}
          />
          <p className="-mt-5 text-xs text-muted">
            No perfect prompt needed. Start with the rough idea.
          </p>
        </>
      ) : (
        <>
          <section className="flex flex-col gap-2">
            <ThoughtInput
              value={thought}
              onChange={setThought}
              onSubmit={handleSubmit}
              busy={busy}
              label="Your thought"
              rows={2}
              placeholder="Your rough thought"
            />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-muted">What I understood</h2>
            <Interpretation fields={fields} onChange={handleFieldChange} disabled={busy} />
          </section>

          {question !== null && (
            <FollowUpQuestion
              question={question}
              questionCount={questionCount}
              busy={busy}
              onContinue={handleContinue}
            />
          )}
        </>
      )}

      {error && (
        <div className="flex flex-col gap-1 rounded-xl border border-line bg-panel px-4 py-3">
          <p className="text-sm font-semibold text-fg">Couldn&apos;t build the prompt.</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                if (pending) void runShape(pending);
              }}
              disabled={busy || !pending}
              className="rounded-full bg-green px-4 py-1.5 text-xs font-semibold text-bg transition-opacity disabled:opacity-40"
            >
              Try again
            </button>
            <span className="text-xs text-muted">Your work is still here.</span>
          </div>
        </div>
      )}
    </main>
  );
}
