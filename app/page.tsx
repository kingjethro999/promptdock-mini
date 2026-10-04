"use client";

import { useEffect, useRef, useState } from "react";
import { BuildPrompt } from "../components/BuildPrompt";
import { FollowUpQuestion } from "../components/FollowUpQuestion";
import { Interpretation } from "../components/Interpretation";
import { PromptEditor } from "../components/PromptEditor";
import { RecentDocks } from "../components/RecentDocks";
import { ThoughtInput } from "../components/ThoughtInput";
import { deleteDock, dockTitle, loadDocks, saveDock } from "../lib/dock-storage";
import { Dock, Field, MAX_QUESTIONS, ShapeResponse } from "../lib/types";

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
  const dockIdRef = useRef<string | null>(null);
  const [docks, setDocks] = useState<Dock[]>([]);

  useEffect(() => {
    // localStorage can only be read after hydration; the server snapshot is empty by design.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDocks(loadDocks());
    return () => {
      if (cueTimer.current) clearTimeout(cueTimer.current);
    };
  }, []);

  function flashUpdated() {
    setUpdatedCue(true);
    if (cueTimer.current) clearTimeout(cueTimer.current);
    cueTimer.current = setTimeout(() => setUpdatedCue(false), 2000);
  }

  function persistDock(
    persistThought: string,
    persistFields: Field[],
    persistAnswers: string[],
    persistPrompt: string,
    manuallyEdited: boolean,
  ) {
    const existing = dockIdRef.current
      ? loadDocks().find((d) => d.id === dockIdRef.current)
      : undefined;
    const id = dockIdRef.current ?? crypto.randomUUID();
    dockIdRef.current = id;
    const now = Date.now();
    const ok = saveDock({
      id,
      title: dockTitle(persistFields, persistThought),
      thought: persistThought,
      fields: persistFields,
      answers: persistAnswers,
      questionCount,
      prompt: persistPrompt,
      promptEditedManually: manuallyEdited,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    if (ok) setDocks(loadDocks());
  }

  function restoreDock(dock: Dock) {
    if (busy || promptBusy) return;
    setThought(dock.thought);
    setFields(dock.fields);
    setAnswers(dock.answers);
    setQuestionCount(dock.questionCount);
    setPrompt(dock.prompt);
    setPromptEditedManually(dock.promptEditedManually);
    setPendingSync(false);
    setQuestion(null);
    setErrorKind(null);
    setPending(null);
    dockIdRef.current = dock.id;
    window.scrollTo({ top: 0 });
  }

  function removeDock(id: string) {
    if (!deleteDock(id)) return;
    setDocks(loadDocks());
    if (dockIdRef.current === id) {
      dockIdRef.current = null;
    }
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
      persistDock(buildThought, buildFields, buildAnswers, next, false);
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
      persistDock(thought, fields, answers, next, false);
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
    if (dockIdRef.current !== null && fields !== null) {
      persistDock(thought, fields, answers, next, true);
    }
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
              What are you trying to get done?
            </h1>
            <p className="text-sm text-muted">Messy is fine.</p>
          </section>

          <ThoughtInput
            value={thought}
            onChange={setThought}
            onSubmit={handleSubmit}
            busy={busy}
            labelHidden
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

      <RecentDocks docks={docks} onRestore={restoreDock} onDelete={removeDock} />
    </main>
  );
}
