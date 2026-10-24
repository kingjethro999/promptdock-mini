"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BuildPrompt } from "../components/BuildPrompt";
import { Composer } from "../components/Composer";
import { ExpandedComposer } from "../components/ExpandedComposer";
import { FollowUpQuestion } from "../components/FollowUpQuestion";
import { Interpretation } from "../components/Interpretation";
import { PromptArtifact } from "../components/PromptArtifact";
import { ThoughtInput } from "../components/ThoughtInput";
import { useOnlineStatus } from "../lib/online-status";
import {
  ChatSession,
  PromptVersion,
  SessionState,
  appendVersion,
  createGroupWithVersion,
  findSessionByGroup,
  getGroup,
  getSession,
  listVersions,
  migrateFromLegacyDocks,
  newId,
  saveSession,
  toggleFavorite,
} from "../lib/prompt-store";
import { dockTitle } from "../lib/dock-storage";
import { Field, MAX_QUESTIONS, ShapeResponse } from "../lib/types";
interface ShapePayload {
  thought: string;
  interpretation: { fields: Field[] } | undefined;
  answers: string[];
  questionCount: number;
  lastQuestion: string | null;
}

type ErrorKind = "shape" | "build-first" | "build-regen" | "refine" | null;
type SaveState = "idle" | "saving" | "saved" | "error";
type ComposerMode = "create" | "refine";

const DRAFT_KEY = "pmd.draft";
const SESSION_KEY = "pmd.session";
const LAST_SESSION_KEY = "pmd.session.last";
const DRAFT_SAVE_DELAY = 1500;
const SESSION_SAVE_DELAY = 700;

type LoadedGroup = NonNullable<Awaited<ReturnType<typeof getGroup>>>;

export default function Home() {
  const online = useOnlineStatus();

  // --- shaping phase ---
  const [thought, setThought] = useState("");
  const [fields, setFields] = useState<Field[] | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [busy, setBusy] = useState(false);

  // --- prompt phase ---
  const [prompt, setPrompt] = useState<string | null>(null);
  const [promptEditedManually, setPromptEditedManually] = useState(false);
  const [pendingSync, setPendingSync] = useState(false);
  const [promptBusy, setPromptBusy] = useState(false);
  const [updatedCue, setUpdatedCue] = useState(false);

  // --- versioned library state ---
  const [groupId, setGroupId] = useState<string | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  // --- composer state ---
  const [composerText, setComposerText] = useState("");
  const [composerMode, setComposerMode] = useState<ComposerMode>("create");
  const [expandOpen, setExpandOpen] = useState(false);

  const [errorKind, setErrorKind] = useState<ErrorKind>(null);
  const [pending, setPending] = useState<ShapePayload | null>(null);
  const cueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic operation id: any async response whose id is stale is discarded
  // so a slow request can never overwrite newer edits (addendum §5).
  const opIdRef = useRef(0);
  const groupIdRef = useRef<string | null>(null);
  const activeVersionRef = useRef<string | null>(null);
  // Chat-session snapshot: id once a chat has content, timer for the
  // debounced save, and the last payload so we can flush on page hide.
  const sessionIdRef = useRef<string | null>(null);
  const sessionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionReady = useRef(false);
  const sessionSnapshot = useRef<ChatSession | null>(null);

  useEffect(() => {
    return () => {
      if (cueTimer.current) clearTimeout(cueTimer.current);
      if (draftTimer.current) clearTimeout(draftTimer.current);
      if (sessionTimer.current) clearTimeout(sessionTimer.current);
    };
  }, []);

  // --- bootstrap: migrate, then resume the open chat (deep link or last) ---
  useEffect(() => {
    let cancelled = false;

    function restoreGroup(group: LoadedGroup, loaded: PromptVersion[]): string {
      const active =
        loaded.find((v) => v.id === group.latestVersionId) ??
        loaded[loaded.length - 1];
      groupIdRef.current = group.id;
      activeVersionRef.current = active.id;
      setGroupId(group.id);
      setVersions(loaded);
      setActiveVersionId(active.id);
      setPrompt(active.body);
      setThought(group.originalThought);
      setPromptEditedManually(active.source === "manual-edit");
      setFields(active.interpretationSnapshot ?? null);
      setAnswers(active.answersSnapshot ?? []);
      return active.body;
    }

    function restoreSessionState(st: SessionState) {
      setThought(st.thought);
      setFields(st.fields);
      setQuestion(st.question);
      setAnswers(st.answers);
      setQuestionCount(st.questionCount);
      setPrompt(st.prompt);
      setPromptEditedManually(st.promptEditedManually);
      setPendingSync(st.pendingSync);
      setComposerText(st.composerText);
      setComposerMode(st.composerMode);
      if (st.activeVersionId) {
        activeVersionRef.current = st.activeVersionId;
        setActiveVersionId(st.activeVersionId);
      }
    }

    function restoreDraftFor(groupIdOfDraft: string, currentBody: string | null) {
      const draft = readDraft();
      if (draft && draft.groupId === groupIdOfDraft && draft.body !== currentBody) {
        setPrompt(draft.body);
        setPromptEditedManually(true);
      }
    }

    void (async () => {
      await migrateFromLegacyDocks();
      if (cancelled) return;

      const params = new URLSearchParams(window.location.search);
      const deepLink = params.get("group");

      // 1) Deep link: open that prompt's chat, resuming its conversation.
      if (deepLink) {
        const group = await getGroup(deepLink);
        if (cancelled || !group) return;
        const loaded = await listVersions(deepLink);
        if (cancelled || loaded.length === 0) return;
        const existing = await findSessionByGroup(deepLink);
        if (cancelled) return;
        const restoredBody = restoreGroup(group, loaded);
        if (existing) {
          sessionIdRef.current = existing.id;
          restoreSessionState(existing.state);
          restoreDraftFor(deepLink, existing.state.prompt);
          writeLastSessionId(existing.id);
        } else {
          sessionIdRef.current = newId();
          restoreDraftFor(deepLink, restoredBody);
        }
        setSaveState("saved");
        sessionReady.current = true;
        return;
      }

      // 2) No deep link: restore the full snapshot of the last open chat.
      const lastId = readLastSessionId();
      const session = lastId ? await getSession(lastId) : null;
      if (cancelled) return;
      if (session) {
        sessionIdRef.current = session.id;
        if (session.groupId) {
          const group = await getGroup(session.groupId);
          if (cancelled) return;
          const loaded = group ? await listVersions(group.id) : [];
          if (cancelled) return;
          if (group && loaded.length > 0) restoreGroup(group, loaded);
        }
        restoreSessionState(session.state);
        if (session.groupId) {
          restoreDraftFor(session.groupId, session.state.prompt);
          setSaveState("saved");
        }
        sessionReady.current = true;
        return;
      }

      // 3) Legacy fallback: a prompt group remembered by the old pointer.
      const legacyId = readSessionGroupId();
      if (!legacyId) {
        sessionReady.current = true;
        return;
      }
      const group = await getGroup(legacyId);
      if (cancelled || !group) {
        sessionReady.current = true;
        return;
      }
      const loaded = await listVersions(legacyId);
      if (cancelled || loaded.length === 0) return;
      const restoredBody = restoreGroup(group, loaded);
      restoreDraftFor(legacyId, restoredBody);
      sessionIdRef.current = newId();
      writeLastSessionId(sessionIdRef.current);
      setSaveState("saved");
      sessionReady.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Session pointer: remember the open group for reload restoration.
  useEffect(() => {
    try {
      if (groupId) {
        window.localStorage.setItem(SESSION_KEY, groupId);
      }
    } catch {
      // Storage unavailable — session restore is best-effort.
    }
  }, [groupId]);

  // --- session snapshot: the whole workspace survives a refresh ---
  const snapshot = useMemo<SessionState>(
    () => ({
      thought,
      fields,
      question,
      answers,
      questionCount,
      prompt,
      promptEditedManually,
      pendingSync,
      composerText,
      composerMode,
      activeVersionId,
    }),
    [
      thought,
      fields,
      question,
      answers,
      questionCount,
      prompt,
      promptEditedManually,
      pendingSync,
      composerText,
      composerMode,
      activeVersionId,
    ],
  );

  const snapshotEmpty =
    snapshot.thought.trim() === "" &&
    snapshot.fields === null &&
    snapshot.prompt === null &&
    snapshot.composerText.trim() === "" &&
    snapshot.answers.length === 0;

  useEffect(() => {
    if (!sessionReady.current || snapshotEmpty) return;
    const id = sessionIdRef.current ?? newId();
    sessionIdRef.current = id;
    const payload: ChatSession = {
      id,
      groupId,
      title: fields
        ? dockTitle(fields, thought)
        : thought.trim() || snapshot.composerText.trim() || "New chat",
      updatedAt: Date.now(),
      state: snapshot,
    };
    sessionSnapshot.current = payload;
    if (sessionTimer.current) clearTimeout(sessionTimer.current);
    sessionTimer.current = setTimeout(() => {
      sessionTimer.current = null;
      void saveSession(payload)
        .then(() => writeLastSessionId(payload.id))
        .catch(() => {
          // Persistence is best-effort; the workspace keeps working without it.
        });
    }, SESSION_SAVE_DELAY);
  }, [snapshot, snapshotEmpty, groupId, fields, thought]);

  // Flush the pending snapshot when the tab is hidden or closing.
  useEffect(() => {
    const flush = () => {
      if (!sessionReady.current) return;
      const payload = sessionSnapshot.current;
      if (!payload) return;
      if (sessionTimer.current) {
        clearTimeout(sessionTimer.current);
        sessionTimer.current = null;
      }
      void saveSession({ ...payload, updatedAt: Date.now() }).catch(() => {});
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  function flashUpdated() {
    setUpdatedCue(true);
    if (cueTimer.current) clearTimeout(cueTimer.current);
    cueTimer.current = setTimeout(() => setUpdatedCue(false), 2000);
  }

  // --- draft persistence (uncommitted work survives reloads) ---
  const scheduleDraftSave = useCallback(
    (body: string) => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
      if (groupIdRef.current === null) return;
      draftTimer.current = setTimeout(() => {
        try {
          window.localStorage.setItem(
            DRAFT_KEY,
            JSON.stringify({ groupId: groupIdRef.current, body }),
          );
        } catch {
          // Draft persistence is best-effort; committed versions are in IDB.
        }
      }, DRAFT_SAVE_DELAY);
    },
    [],
  );

  function clearDraft() {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
  }

  function updateGroupVersions(next: PromptVersion[], nextActiveId: string) {
    setVersions(next);
    setActiveVersionId(nextActiveId);
    activeVersionRef.current = nextActiveId;
  }

  // --- shaping ---

  async function runShape(
    payload: ShapePayload,
  ): Promise<ShapeResponse | null> {
    const opId = ++opIdRef.current;
    setBusy(true);
    setErrorKind(null);
    setPending(payload);
    try {
      const res = await fetch("/api/shape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (opId !== opIdRef.current) return null; // superseded
      if (!res.ok) throw new Error(`shape failed: ${res.status}`);
      const data = (await res.json()) as ShapeResponse;
      setThought(payload.thought);
      setComposerText("");
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
      if (opId === opIdRef.current) setErrorKind("shape");
      return null;
    } finally {
      if (opId === opIdRef.current) setBusy(false);
    }
  }

  function handleSubmit(next: string) {
    if (promptBusy) return;
    const isReshape = fields !== null;
    // Keep the text in the composer until the request succeeds: a refresh
    // mid-flight then restores the input instead of dropping it.
    setThought(next);
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

  // --- versioned persistence ---

  async function persistVersion(input: {
    body: string;
    source: "ai-build" | "ai-refinement" | "manual-edit";
    currentFields: Field[] | null;
    currentAnswers: string[];
  }): Promise<PromptVersion | null> {
    setSaveState("saving");
    try {
      const existingId = groupIdRef.current;
      const result = existingId
        ? await appendVersion({
            groupId: existingId,
            body: input.body,
            source: input.source,
            baseVersionId: activeVersionRef.current ?? undefined,
            interpretationSnapshot: input.currentFields ?? undefined,
            answersSnapshot: input.currentAnswers,
          })
        : await createGroupWithVersion({
            title: dockTitle(input.currentFields ?? [], thought),
            originalThought: thought,
            body: input.body,
            source: input.source,
            interpretationSnapshot: input.currentFields ?? undefined,
            answersSnapshot: input.currentAnswers,
          });

      groupIdRef.current = result.group.id;
      setGroupId(result.group.id);
      const loaded = await listVersions(result.group.id);
      updateGroupVersions(loaded, result.version.id);
      setSaveState("saved");
      clearDraft();
      return result.version;
    } catch {
      setSaveState("error");
      return null;
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
    const opId = ++opIdRef.current;
    setPromptBusy(true);
    setErrorKind(null);
    try {
      const next = await postBuild(buildThought, buildFields, buildAnswers);
      if (opId !== opIdRef.current) return false;
      setPrompt(next);
      setPromptEditedManually(false);
      setPendingSync(false);
      await persistVersion({
        body: next,
        source: "ai-build",
        currentFields: buildFields,
        currentAnswers: buildAnswers,
      });
      flashUpdated();
      return true;
    } catch {
      if (opId === opIdRef.current) setErrorKind("build-regen");
      return false;
    } finally {
      if (opId === opIdRef.current) setPromptBusy(false);
    }
  }

  async function handleBuild() {
    if (fields === null) return;
    const opId = ++opIdRef.current;
    setPromptBusy(true);
    setErrorKind(null);
    try {
      const next = await postBuild(thought, fields, answers);
      if (opId !== opIdRef.current) return;
      setPrompt(next);
      setPromptEditedManually(false);
      setPendingSync(false);
      await persistVersion({
        body: next,
        source: "ai-build",
        currentFields: fields,
        currentAnswers: answers,
      });
      setComposerMode("refine");
    } catch {
      if (opId === opIdRef.current) setErrorKind("build-first");
    } finally {
      if (opId === opIdRef.current) setPromptBusy(false);
    }
  }

  // --- refinement ---

  async function handleRefine(changeRequest: string): Promise<boolean> {
    if (prompt === null || !online) return false;
    const opId = ++opIdRef.current;
    setPromptBusy(true);
    setErrorKind(null);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: thought,
          prompt,
          interpretation: fields ? { fields } : undefined,
          changeRequest,
        }),
      });
      if (opId !== opIdRef.current) return false;
      if (!res.ok) throw new Error(`refine failed: ${res.status}`);
      const data = (await res.json()) as { prompt?: unknown };
      if (typeof data.prompt !== "string" || data.prompt.trim().length === 0) {
        throw new Error("empty prompt");
      }
      const next = data.prompt;
      // Render the new version only on success; keep the old one intact until
      // the new version is durably stored.
      const saved = await persistVersion({
        body: next,
        source: "ai-refinement",
        currentFields: fields,
        currentAnswers: answers,
      });
      if (saved === null) return false;
      setPrompt(next);
      setPromptEditedManually(false);
      setPendingSync(false);
      setComposerText("");
      flashUpdated();
      return true;
    } catch {
      // Retain the user's change request text for retry: restore it.
      if (opId === opIdRef.current) {
        setErrorKind("refine");
        setComposerText(changeRequest);
      }
      return false;
    } finally {
      if (opId === opIdRef.current) setPromptBusy(false);
    }
  }

  function handleComposerSubmit() {
    const text = composerText.trim();
    if (text.length === 0) return;
    if (prompt === null || composerMode === "create") {
      handleSubmit(text);
    } else {
      void handleRefine(text);
    }
  }

  function openRefine() {
    setComposerMode("refine");
    setComposerText("");
    // Focus the composer textarea after the state settles.
    requestAnimationFrame(() => {
      document.getElementById("composer-input")?.focus();
    });
  }

  // --- prompt editing & interpretation sync ---

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
    scheduleDraftSave(next);
  }

  function handleUpdatePrompt() {
    if (fields === null) return;
    void runRegen(thought, fields, answers);
  }

  function handleSelectVersion(versionId: string) {
    const version = versions.find((v) => v.id === versionId);
    if (!version) return;
    setPrompt(version.body);
    setActiveVersionId(versionId);
    activeVersionRef.current = versionId;
    setPromptEditedManually(version.source === "manual-edit");
    setPendingSync(false);
    clearDraft();
  }

  function handleToggleFavorite(versionId: string) {
    void (async () => {
      const updated = await toggleFavorite(versionId);
      if (!updated) return;
      setVersions((prev) =>
        prev.map((v) => (v.id === versionId ? updated : v)),
      );
    })();
  }

  // --- errors ---

  function retryError() {
    if (errorKind === "shape" && pending) void runShape(pending);
    else if (errorKind === "build-first") void handleBuild();
    else if (errorKind === "build-regen" && fields !== null) {
      void runRegen(thought, fields, answers);
    }
  }

  const errorCopy: Record<
    Exclude<ErrorKind, null>,
    { headline: string; quiet: string | null }
  > = {
    shape: { headline: "Couldn't understand that yet.", quiet: "Try again." },
    "build-first": {
      headline: "Couldn't build the prompt.",
      quiet: "Your work is still here.",
    },
    "build-regen": { headline: "Couldn't update the prompt.", quiet: null },
    refine: {
      headline: "Couldn't refine the prompt.",
      quiet: "Your change request is still here.",
    },
  };

  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved locally"
        : saveState === "error"
          ? "Could not save"
          : null;

  const activeVersion = useMemo(
    () => versions.find((v) => v.id === activeVersionId) ?? null,
    [versions, activeVersionId],
  );

  const effectiveMode: ComposerMode = prompt === null ? "create" : composerMode;
  const busyGenerating = busy || promptBusy;

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col justify-center gap-8 px-6 py-10">
        {fields === null ? (
          <section className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-fg">
              What are you trying to get done?
            </h1>
            <p className="text-sm text-muted">
              Messy is fine. No perfect prompt needed.
            </p>
          </section>
        ) : (
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-muted">Your thought</h2>
              <ThoughtInput
                value={thought}
                onChange={setThought}
                onSubmit={handleSubmit}
                busy={busy}
                labelHidden
                rows={2}
                placeholder="Your rough thought"
              />
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-muted">
                What I understood
              </h2>
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
              <BuildPrompt
                busy={busy || promptBusy}
                onBuild={() => void handleBuild()}
              />
            )}

            {prompt !== null && (
              <PromptArtifact
                value={prompt}
                versions={versions}
                activeVersionId={activeVersionId}
                busy={promptBusy}
                canRefine={online && !busyGenerating}
                interpretationChanged={pendingSync}
                updatedCue={updatedCue}
                onChange={handlePromptChange}
                onSelectVersion={handleSelectVersion}
                onToggleFavorite={handleToggleFavorite}
                onUpdatePrompt={handleUpdatePrompt}
                onRefine={openRefine}
              />
            )}

            {activeVersion && saveLabel && (
              <p
                role="status"
                className={`text-xs ${
                  saveState === "error" ? "text-fg" : "text-muted"
                }`}
              >
                {saveLabel}
                {activeVersion.source === "manual-edit" &&
                  saveState === "saved" && " · draft committed"}
              </p>
            )}

            {errorKind && (
              <div className="flex flex-col gap-1 rounded-xl border border-line bg-panel px-4 py-3">
                <p className="text-sm font-semibold text-fg">
                  {errorCopy[errorKind].headline}
                </p>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={retryError}
                    disabled={busyGenerating}
                    className="rounded-full bg-green px-4 py-1.5 text-xs font-semibold text-bg transition-opacity disabled:opacity-40"
                  >
                    Try again
                  </button>
                  {errorCopy[errorKind].quiet && (
                    <span className="text-xs text-muted">
                      {errorCopy[errorKind].quiet}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky composer: pinned near the bottom, safe-area aware. */}
      <div className="sticky bottom-0 z-10 border-t border-line bg-bg px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
          {prompt !== null && (
            <div
              className="flex items-center gap-1"
              role="group"
              aria-label="Composer mode"
            >
              <button
                type="button"
                aria-pressed={effectiveMode === "create"}
                onClick={() => setComposerMode("create")}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  effectiveMode === "create"
                    ? "border-green text-fg"
                    : "border-line text-muted hover:border-green hover:text-fg"
                }`}
              >
                Reshape
              </button>
              <button
                type="button"
                aria-pressed={effectiveMode === "refine"}
                onClick={() => setComposerMode("refine")}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  effectiveMode === "refine"
                    ? "border-green text-fg"
                    : "border-line text-muted hover:border-green hover:text-fg"
                }`}
              >
                Refine
              </button>
            </div>
          )}
          <Composer
            value={composerText}
            onChange={setComposerText}
            onSubmit={handleComposerSubmit}
            mode={effectiveMode}
            busy={busyGenerating}
            online={online}
            onExpand={() => setExpandOpen(true)}
            placeholder={
              effectiveMode === "create"
                ? "Describe it however it comes to mind…"
                : "Describe the change… e.g. shorten it, add an offline requirement"
            }
          />
        </div>
      </div>

      <ExpandedComposer
        open={expandOpen}
        value={composerText}
        onChange={setComposerText}
        onSubmit={handleComposerSubmit}
        onClose={() => setExpandOpen(false)}
        mode={effectiveMode}
        busy={busyGenerating}
        online={online}
      />
    </main>
  );
}

// --- tiny local-storage helpers (session & draft) ---

function readSessionGroupId(): string | null {
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function readLastSessionId(): string | null {
  try {
    return window.localStorage.getItem(LAST_SESSION_KEY);
  } catch {
    return null;
  }
}

function writeLastSessionId(id: string): void {
  try {
    window.localStorage.setItem(LAST_SESSION_KEY, id);
  } catch {
    // Pointer is a convenience; the snapshot itself lives in IndexedDB.
  }
}

function readDraft(): { groupId: string; body: string } | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { groupId?: unknown; body?: unknown };
    if (typeof parsed.groupId !== "string" || typeof parsed.body !== "string") {
      return null;
    }
    return { groupId: parsed.groupId, body: parsed.body };
  } catch {
    return null;
  }
}
