"use client";

import { useEffect, useRef, useState } from "react";
import { BuildPrompt } from "../components/BuildPrompt";
import { FollowUpQuestion } from "../components/FollowUpQuestion";
import { Interpretation } from "../components/Interpretation";
import { PromptEditor } from "../components/PromptEditor";
import { ThoughtInput } from "../components/ThoughtInput";
import { Field, MAX_QUESTIONS, ShapeResponse } from "../lib/types";

interface ShapePayload {
  thought: string;
  interpretation: { fields: Field[] } | undefined;
  answers: string[];
  questionCount: number;
  lastQuestion: string | null;
}

type ErrorKind = "shape" | "build-first" | "build-regen" | null;

export default function Home() {
  const [thought, setThought] = useState("");
  const [fields, setFields] = useState<Field[] | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const [prompt, setPrompt] = useState<string | null>(null);
  const [promptEditedManually, setPromptEditedManually] = useState(false);
  const [pendingSync, setPendingSync] = useState(false);
  const [promptBusy, setPromptBusy] = useState(false);
  const [updatedCue, setUpdatedCue] = useState(false);

  const [errorKind, setErrorKind] = useState<ErrorKind>(null);
  const [pending, setPending] = useState<ShapePayload | null>(null);
  const cueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (cueTimer.current) clearTimeout(cueTimer.current);
    };
  }, []);

  function flashUpdated() {
    setUpdatedCue(true);
    if (cueTimer.current) clearTimeout(cueTimer.current);
    cueTimer.current = setTimeout(() => setUpdatedCue(false), 2000);
  }

  async function postBuild(
    buildThought: string,
    buildFields: Field[],
    buildAnswers: string[],
  ): Promise<string> {
    const res = await fetch("/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        thought: buildThought,
        interpretation: { fields: buildFields },
        answers: buildAnswers,
      }),
    });
    if (!res.ok) throw new Error(`build failed: ${res.status}`);
    const data = (await res.json()) as { prompt?: unknown };
    if (typeof data.prompt !== "string" || data.prompt.trim().length === 0) {
      throw new Error("empty prompt");
    }
    return data.prompt;
  }

  async function runRegen(
    buildThought: string,
    buildFields: Field[],
    buildAnswers: string[],
  ): Promise<boolean> {
    setPromptBusy(true);
    setErrorKind(null);
    try {
      const next = await postBuild(buildThought, buildFields, buildAnswers);
      setPrompt(next);
      setPromptEditedManually(false);
      setPendingSync(false);
      flashUpdated();
      return true;
    } catch {
      setErrorKind("build-regen");
      return false;
    } finally {
      setPromptBusy(false);
    }
  }

  async function runShape(payload: ShapePayload): Promise<ShapeResponse | null> {
    setBusy(true);
    setErrorKind(null);
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
      if (prompt !== null) {
        setPendingSync(true);
        if (!promptEditedManually) {
          void runRegen(payload.thought, data.interpretation.fields, payload.answers);
        }
      }
      return data;
    } catch {
      setErrorKind("shape");
      return null;
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(next: string) {
    if (promptBusy) return;
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
    return sent !== null;
  }

  async function handleBuild() {
    if (fields === null) return;
    setPromptBusy(true);
    setErrorKind(null);
    try {
      const next = await postBuild(thought, fields, answers);
      setPrompt(next);
      setPromptEditedManually(false);
      setPendingSync(false);
    } catch {
      setErrorKind("build-first");
    } finally {
      setPromptBusy(false);
    }
  }

  function handleFieldChange(next: Field[]) {
    setFields(next);
    if (prompt === null) return;
    setPendingSync(true);
    if (!promptEditedManually && !promptBusy) {
      void runRegen(thought, next, answers);
    }
  }

  function handlePromptChange(next: string) {
    setPrompt(next);
    setPromptEditedManually(true);
  }

  function handleUpdatePrompt() {
    if (fields === null) return;
    void runRegen(thought, fields, answers);
  }

  function retryError() {
    if (errorKind === "shape" && pending) void runShape(pending);
    else if (errorKind === "build-first") void handleBuild();
    else if (errorKind === "build-regen" && fields !== null) {
      void runRegen(thought, fields, answers);
    }
  }

  const errorCopy =
    errorKind === "build-regen"
      ? { headline: "Couldn't update the prompt.", quiet: null }
      : { headline: "Couldn't build the prompt.", quiet: "Your work is still here." };

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
              onChange={handleFieldChange}
              disabled={busy || promptBusy}
            />
          </section>

          {question !== null && (
            <FollowUpQuestion
              question={question}
              questionCount={questionCount}
              busy={busy}
              onContinue={handleContinue}
            />
          )}

          {question === null && prompt === null && (
            <BuildPrompt busy={busy || promptBusy} onBuild={() => void handleBuild()} />
          )}

          {prompt !== null && (
            <PromptEditor
              value={prompt}
              busy={promptBusy}
              promptEditedManually={promptEditedManually}
              interpretationChanged={pendingSync}
              updatedCue={updatedCue}
              onChange={handlePromptChange}
              onUpdatePrompt={handleUpdatePrompt}
            />
          )}
        </>
      )}

      {errorKind && (
        <div className="flex flex-col gap-1 rounded-xl border border-line bg-panel px-4 py-3">
          <p className="text-sm font-semibold text-fg">{errorCopy.headline}</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={retryError}
              disabled={busy || promptBusy}
              className="rounded-full bg-green px-4 py-1.5 text-xs font-semibold text-bg transition-opacity disabled:opacity-40"
            >
              Try again
            </button>
            {errorCopy.quiet && <span className="text-xs text-muted">{errorCopy.quiet}</span>}
          </div>
        </div>
      )}
    </main>
  );
}
