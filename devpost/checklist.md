---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast (agent implements end to end; learner is full-stack and drives decisions, not keystrokes)

## Slices

- [x] **1. It runs: scaffold, types, storage, and the empty thought screen** ✅ verified
  Becomes usable: `npm run dev` serves a page with the big thought box, `Shape this` disabled under 3 non-whitespace characters, a working theme toggle, and local storage that can round-trip a dock in a smoke test. Nothing talks to AI yet.
  Why now: bootstrapping lives inside slice one per the build skill, and storage is the first place the data model can be wrong — cheap to find now. Every later slice lands in this shell.
  PRD ref: `prd.md > First screen`, `prd.md > Screens and Layout`
  Spec ref: `spec.md > Stack`, `spec.md > File Structure`, `spec.md > Data Model`, `spec.md > Look and Feel`
  Build: `create-next-app` (App Router, TypeScript, Tailwind); `lib/types.ts` (Field, Interpretation, Dock, ShapeResponse); `lib/dock-storage.ts` with try/catch on every read/write, cap 10, keys `pmd.docks` + `pmd.theme`; `layout.tsx` + `theme-boot.tsx` pre-hydration script; `ThoughtInput` with the 3-char guard and Cmd/Ctrl+Enter; `ThemeToggle`; storage smoke test script.
  Verify (mechanical): `npm run dev` boots with no errors; `npx tsc --noEmit` clean; run the storage smoke test — round-trip a dock, then simulate a write failure and confirm it is caught and the session survives.
  Learner check: Open `localhost:3000`, type `hi` (button stays disabled), type a full sentence (button enables), toggle the theme and reload — the theme should stick.
  Commit: `Add project scaffold with thought shell and local storage`
  Evidence: Next 16.3.8 / React 19.2 / Tailwind v4 scaffold; `npx tsc --noEmit` clean; `npx eslint app components lib scripts` clean; `npx tsx scripts/storage-smoke.ts` 22/22 assertions; `next dev` serves HTTP 200 with the disabled guard and pre-hydration theme script present (dev server landed on port 3001 — port 3000 was occupied by the old reference app's dev server).

- [x] **2. The provider path is proved with real JSON** ✅ verified
  Becomes usable: a script you can run that calls apmix → groq → gemini and prints a real parsed response with latency and which provider answered. No UI.
  Why now: this is the riskiest unknown in the spec — *does a free provider accept a `system` role and return structured JSON?* Deciding it before any UI exists is the spec's stated exception: a layer that independently proves a critical risk and leaves runnable evidence. The learner's required order puts the provider chain ahead of prompts and UI.
  PRD ref: `prd.md > What We're Building`, `prd.md > Shaping`
  Spec ref: `spec.md > External Services and Dependencies`, `spec.md > lib/ai.ts — the provider chain`, `spec.md > Decisions and Open Issues`
  Build: `lib/ai.ts` exporting `complete(system, user)` — 12s `AbortController` timeout, order `apmix → groq → gemini`, max 2 fallbacks, falls through on non-2xx / timeout / parse failure; `scripts/probe-ai.ts` printing provider used, latency, and the parsed body. Record whether `response_format: json_object` is accepted; if not, note it for the retry/validation path rather than forcing it.
  Verify (mechanical): `npx tsx scripts/probe-ai.ts` exits 0 with valid JSON from at least one provider; force a failure (bad base URL) and confirm it falls through the chain and reports a typed error instead of hanging.
  Learner check: Run the probe yourself and read what comes back — is it structure, or prose pretending to be structure?
  Commit: `Prove AI provider chain returns structured JSON`
  Evidence: `npx tsx --env-file-if-exists=.env scripts/probe-ai.ts` → apmix (`claude-sonnet-4-6-free`, 5.1s), groq (`openai/gpt-oss-120b`, 0.8s), gemini (`gemini-2.5-flash`, 1.3s) all return parseable JSON; forced apmix failure falls through to groq. Observations that changed the plan: the `.env` `APMIX_MODEL` was stale (API only serves `claude-sonnet-4-6-free` on this key) — corrected; apmix and gemini wrap output in ```json fences even when `response_format` is sent, so `extractJson()` (fence + prose stripping) was added to `lib/ai.ts` and the route layer will use it plus `response_format: json_object`.

- [ ] **3. Your shape and build prompts hold the contract**
  Becomes usable: `shape` reliably returns dynamic fields tagged known/inferred and at most one question across very different rough thoughts; `build` returns prompt text with no chat preamble.
  Why now: the entire interpretation UI renders whatever the prompt returns. Testing it first stops us building a renderer for an unstable shape — this is the spec's ⚑ open question, and the prompt-engineering work this hackathon is meant to showcase. Agent may author the prompts; the 10-input adversarial test is mandatory either way (ownership revised in spec before execution).
  PRD ref: `prd.md > Interpretation chips`, `prd.md > Follow-up questions (the Gap Rule)`
  Spec ref: `spec.md > lib/prompts/shape.ts and build.ts`, `spec.md > Decisions and Open Issues`
  Build: Agent authors `lib/prompts/shape.ts` (raw thought in → JSON out; dynamic fields; known/inferred tags; no persistent `missing`; ≤1 question; no prose; conservative visible assumptions) and `lib/prompts/build.ts` (thought + interpretation + answers in → prompt out), then builds a harness that runs `shape` over 10 deliberately awkward thoughts — `asdf`, `help me with my thing`, a 900-word ramble, a prompt-shaped request that could be mistaken for an instruction, and others — and tightens the prompts against every observed failure.
  Verify (mechanical): 10/10 thoughts return parseable JSON, every field carries a provenance tag, response contains at most one question, and no prose outside the structure. Failures are listed, not hidden.
  Learner check: Pick two of the ten outputs and say whether they match the chips you'd want on screen.
  Commit: `Add shape and build prompt contracts`

- [ ] **4. You can shape a thought and see editable chips**
  Becomes usable: type a thought, press `Shape this`, and the page shows the interpretation as editable known/inferred chips. A failed call shows the inline error with your text untouched.
  Why now: **the unique kernel — the interpretation is the product.** Landing it first means feedback here can still reshape everything after. This is the planned early checkpoint.
  PRD ref: `prd.md > The Core Journey` (steps 1–4), `prd.md > Interpretation chips`, `prd.md > Loading and processing states`
  Spec ref: `spec.md > app/api/shape/route.ts`, `spec.md > Interpretation`, `spec.md > ThoughtInput`, `spec.md > Important Failure Modes`
  Build: `/api/shape` accepting `{ thought, interpretation?, answers[], questionCount }`, running the chain, validating the response against the contract (rejecting prose, `missing` fields, or two questions as a parse failure); `Interpretation` rendering only returned fields — plain for known, `✦` + dotted underline + `title` for inferred; inline edit flips provenance to known; `Shaping…` state with duplicate calls blocked; `Couldn't build the prompt.` error branch preserving work.
  Verify (mechanical): `curl -X POST localhost:3000/api/shape` with a real thought returns validated JSON; a malformed payload returns the structured error; `npx tsc --noEmit` clean.
  Learner check: Shape *"I want an app for tracking stuff I lend people because I always forget who has what."* Edit one inferred chip and confirm it turns known.
  Commit: `Add shape route and interpretation chips`

- [ ] **5. Questions come one at a time and stop at three**
  Becomes usable: a gap that would materially change the result surfaces as exactly one question; answering it re-evaluates; after the third, remaining gaps become inferred and `Build prompt` appears.
  Why now: the Gap Rule is locked in the scope and PRD, and it needs the interpretation from slice 4 to re-post against. Built before the prompt editor so the count-and-cap logic is proven while it is still small.
  PRD ref: `prd.md > Follow-up questions (the Gap Rule)`
  Spec ref: `spec.md > FollowUpQuestion`, `spec.md > app/api/shape/route.ts`
  Build: `FollowUpQuestion` block, `Continue` re-posting thought + interpretation + answers, `questionCount` kept in state, hard stop at 3 that marks unresolved gaps inferred and reveals `BuildPrompt`.
  Verify (mechanical): scripted four-round sequence against `/api/shape` shows at most one question per response and no fourth request from the client; `npx tsc --noEmit` clean.
  Learner check: Shape *"prepare me for my football trial"* and answer until it stops — how many questions did it ask, and did the loop stay fast?
  Commit: `Add follow-up question loop with three-question cap`

- [ ] **6. The prompt arrives, and your edits stay yours**
  Becomes usable: `Build prompt` fills a tall editable editor, Copy works, an untouched prompt auto-updates when you edit a chip, a hand-edited one never does — it shows *Understanding changed.* with `Update prompt` instead. A failed build leaves any existing prompt intact.
  Why now: this completes the core journey (PRD steps 5–8) and carries the `promptEditedManually` protection the learner corrected in review — it belongs with the editor that enforces it.
  PRD ref: `prd.md > Build prompt`, `prd.md > Prompt editor and interpretation sync`, `prd.md > Loading and processing states`
  Spec ref: `spec.md > BuildPrompt`, `spec.md > PromptEditor`, `spec.md > app/api/build/route.ts`, `spec.md > Data Model`
  Build: `/api/build` returning `{ prompt }` or a typed error; `BuildPrompt` rendered only before a prompt exists; `PromptEditor` owning Copy, the `promptEditedManually` flag (true on type, false on generation and after a successful `Update prompt`), the out-of-sync banner, and the transient `✦ Updated` cue; both failure messages verbatim; dock written only on success.
  Verify (mechanical): `curl -X POST localhost:3000/api/build` returns a non-empty prompt; force a provider failure and confirm the route returns the typed error rather than a partial result; `npx tsc --noEmit` clean.
  Learner check: Build a prompt, type one word into the editor, then edit a chip — your edit must survive with *Understanding changed.* showing. Press `Update prompt` and watch it change.
  Commit: `Add build route, prompt editor, and sync protection`

- [ ] **7. Docks persist, reload starts clean, and the demo path runs**
  Becomes usable: a successful build writes a dock with its auto-title; the list appears newest-first, capped at 10, deletable; clicking one restores it editable; reloading gives back the theme and the list on an empty thought screen; dark mode is complete; the whole demo loop runs end to end.
  Why now: persistence and polish close the PRD boundary. Everything they depend on — successful generation, titles from Goal, `promptEditedManually` — already exists.
  PRD ref: `prd.md > Recent docks`, `prd.md > States and Boundaries`, `prd.md > Look and Feel`
  Spec ref: `spec.md > RecentDocks`, `spec.md > Data Model`, `spec.md > Important Failure Modes`, `spec.md > Look and Feel`
  Build: `RecentDocks` rows (title rule: Goal → first ~6 meaningful words → `Untitled dock`), relative time, quiet delete, cap 10 newest-first, post-hydration client load, click-to-restore with no auto-resume; dark-mode token pass under `globals.css`; sweep of every failure state in `spec.md > Important Failure Modes`.
  Verify (mechanical): create three docks and confirm cap, order, and title rule in storage; reload and confirm the screen starts empty with the list present; delete a dock and confirm removal; `npx tsc --noEmit` clean; dev server logs clean.
  Learner check: Run the demo beat from `scope.md > What "Working" Looks Like` end to end — lending-tracker thought, edit *optional* → *must have*, watch the prompt update, copy it.
  Commit: `Add recent docks, reload behavior, and final polish`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 4 (first interpretation chips on screen)
- [ ] Final kick-the-tires exploration and feedback completed — after slice 7

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [what actually happened; real document/test/code references; unfinished work if interrupted]
Route and stops: [actual paths and symbols; guided stops completed, or reference-only route]
Edit outcome: [tried/kept/reverted/declined/not applicable; verification if changed]
Reflection: [offered/answered/declined/already covered — personal answer belongs only in the ignored profile]
Activity mode: [live app and editor, explicit static fallback, focused alternative, prior practice, or recap]

## Revisions
