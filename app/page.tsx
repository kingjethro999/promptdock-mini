"use client";

import { useState } from "react";
import { Interpretation } from "../components/Interpretation";
import { ThoughtInput } from "../components/ThoughtInput";
import { Field, ShapeResponse } from "../lib/types";

export default function Home() {
  const [thought, setThought] = useState("");
  const [fields, setFields] = useState<Field[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [pendingThought, setPendingThought] = useState("");

  async function runShape(next: string) {
    setBusy(true);
    setError(false);
    setPendingThought(next);
    try {
      const res = await fetch("/api/shape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thought: next,
          interpretation: fields ? { fields } : undefined,
          answers: [],
          questionCount: 0,
        }),
      });
      if (!res.ok) throw new Error(`shape failed: ${res.status}`);
      const data = (await res.json()) as ShapeResponse;
      setThought(next);
      setFields(data.interpretation.fields);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(next: string) {
    void runShape(next);
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
            <Interpretation
              fields={fields}
              onChange={setFields}
              disabled={busy}
            />
          </section>
        </>
      )}

      {error && (
        <div className="flex flex-col gap-1 rounded-xl border border-line bg-panel px-4 py-3">
          <p className="text-sm font-semibold text-fg">Couldn&apos;t build the prompt.</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => void runShape(pendingThought)}
              disabled={busy}
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
