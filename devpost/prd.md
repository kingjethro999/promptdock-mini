---
doc: prd
status: approved
---

# Prompt Dock Mini — Product Requirements

A single-page tool that turns a messy, half-formed thought into a usable prompt by first showing its understanding in editable pieces, asking at most three questions when a wrong guess would matter, and compiling the result. Built for someone who wants a better prompt without learning to write one.
Source: `scope.md > The Unique Kernel`, `scope.md > The Core Loop`.

> **Update (22 Oct 2026):** the shipped app now includes the *Local-First UX & PWA Upgrade* — persistent refinement composer, versioned library on `/library`, PWA/offline library, save-status states. See the amendment at the end of this document; where it and the original text disagree, the amendment wins.

## The Core Journey

1. The user opens the page. There is one large input, a heading — _"What are you trying to get done?"_ — and a quiet line under it: _"Messy is fine."_ Nothing else competes for attention. If they have docks before, they appear below; if not, the page shows nothing there.
2. They type a rough thought. The placeholder and its example copy — _"Describe it however it comes to mind…"_ — tell them they don't need to phrase it well. `Shape this` enables once the input holds at least 3 non-whitespace characters.
3. They press `Shape this` (or Cmd/Ctrl + Enter). The button reads _Shaping…_ and duplicate submissions are blocked. The page grows downward: the thought compacts into an editable field labelled _"Your thought"_, and beneath it a heading — _"What I understood"_ — appears with the interpretation as compact chips.
4. Each chip is marked **known** (plain) or **inferred** (tiny sparkle, dotted underline, _"Inferred from your thought"_ on hover). Only relevant fields appear; no rigid schema. Clicking a chip makes its value editable inline. Manually editing an inferred value makes it known.
5. If a materially important gap remains, one question appears directly under the chips — _"One thing I need to know"_ — one at a time, up to 3. After each answer the interpretation updates and gaps re-evaluate. Unresolved gaps after the third question become visible inferred assumptions. `Build prompt` is not rendered while a question is pending.
6. When no high-impact question remains, `Build prompt` appears as the strongest action on the page. They press it; it reads _Building…_.
7. The page grows downward again: _"Your prompt"_ — a tall, editable text editor containing the generated prompt, with `Copy` as the only always-available action.
8. The dock is written to Recent docks the moment generation succeeds. Copy only copies.
9. They edit an interpretation chip. Because the generated prompt has not been touched by hand, the prompt updates on the spot with a brief _"Updated"_ marker — no second `Build prompt` press.
10. If they _have_ hand-edited the prompt, chip edits never overwrite it. Instead: _"Understanding changed."_ with an `Update prompt` action.
11. They press `Copy` → the button reads _Copied_. The end state is a prompt they understand, can still edit, and can copy.

There is no success screen, no score, no confetti. The proof is the prompt itself, traceable back through the thought.

## Screens and Layout

The product is a working screen that **grows downward as understanding increases** — no wizard, no progress bar, no Back/Next, no sidebars, no separate review page — plus one additional minimal route (`/library`) added in the October upgrade.

Top to bottom:

1. **Header** — `Prompt Dock Mini` wordmark left; `Library` and `Coming soon` plus theme toggle right. No account button or help menu.
2. **Thought** — heading, quiet supporting line, one large multiline input, `Shape this` attached to or inside it, and one subtle reassurance: _"No perfect prompt needed. Start with the rough idea."_ After shaping it compacts and is relabelled _"Your thought"_, still editable; resubmitting recomputes the interpretation rather than preserving stale chips.
3. **What I understood** — quiet heading, then chips grouped into only the fields that apply (Goal, Audience, Context, Requirements, Output — illustrative, not a fixed schema).
4. **Follow-up question** (conditional) — inline beneath the chips, never a modal or chat window.
5. **`Build prompt`** (conditional) — rendered only when no high-impact question is pending.
6. **`Refine prompt`** (conditional) — appears once a prompt exists; applies a change request to the current prompt and saves the result as a new version.
7. **Your prompt** (conditional) — tall editable editor, `Copy`, and `Update prompt` only when the prompt has been hand-edited and the understanding has since changed.
8. **Sticky bottom composer** — hosts `Shape this` / `Refine prompt` as explicit modes so generation stays reachable while the page grows.
9. **Library** — on its own `/library` route: search, sort, All/Favorites filter, rename, confirmed delete; Share opens the honest "Coming soon" dialog.

Source: `scope.md > The Core Loop`, `scope.md > The Unique Kernel`.

## Look and Feel

_"An editorial writing tool with the calmness of a field notebook and the precision of a developer tool."_

- **Light mode is the primary/reference design.** Warm off-white / ivory-tinted surfaces, never harsh pure white.
- **Dark mode is a deliverable** (theme toggle ships), using near-black / deep neutral, deep green-black surfaces with restrained green accents — same family, not a neutral gray inversion.
- **Accent:** calm, muted green as the single accent. It carries the sparkle, the _inferred_ cue, and the primary button. No second semantic color is introduced for provenance.
- **Type:** Manrope as the primary face. Headings get confidence from spacing, size and weight — not decorative fonts. Monospace appears sparingly for prompt detail or small metadata; the product must not read as a terminal.
- **Hierarchy:** whitespace and typography first, borders and cards second, color third.
- **The thought and the prompt are the loudest things on the screen.**
- **Avoid:** purple/blue AI gradients, glowing borders, glassmorphism, neon, oversized gradient hero text, floating sparkle decorations, excessive rounded cards, dashboard-widget styling everywhere.
- The sparkle on inferred content is **functional, not branding** — tiny and quiet.

The overall feel is related to the main Prompt Dock's restrained ivory-green character, but built from scratch: warmer and less IDE-like than Cursor, which is a reference for restraint and tool-like confidence rather than a target to copy.

## Features and Behavior

### First screen

- Header: wordmark left; `Library`, `Coming soon`, and theme toggle right.
- Centered main content with a slight upper-center bias.
- Heading: _"What are you trying to get done?"_
- Supporting line: _"Messy is fine."_
- One large multiline input — a thought box, not a form field — with placeholder _"Describe it however it comes to mind…"_.
- **Examples are placeholder copy only.** They are never clickable cards, templates, or suggestions.
- Reassurance under the input: _"No perfect prompt needed. Start with the rough idea."_
- `Shape this`: disabled below 3 non-whitespace characters after trimming, enabled at or above. No validation message — the disabled state says enough. No semantic or AI-based judgment of whether input is "good enough"; extremely vague input goes through.
- Cmd/Ctrl + Enter submits.

- [ ] The first screen presents exactly one obvious action: type into the box.
- [ ] `Shape this` is disabled at 0–2 non-whitespace characters and enabled at 3+, with no error text shown at any point.

### Shaping

- On submit: button reads _Shaping…_, thought stays visible, duplicate submission blocked.
- On success: thought compacts to an editable _"Your thought"_ field with the user's exact wording untouched; _"What I understood"_ appears below with chips.
- Editing the thought and resubmitting **recalculates** the interpretation — chips are not preserved from the stale reading.

- [ ] After shaping, the user's original wording is present and unmodified in the thought field.
- [ ] Only fields relevant to the thought are shown; two different thoughts produce visibly different chip sets.

### Interpretation chips

- Each chip: a field label and an editable value.
- **Known:** plain chip, no icon.
- **Inferred:** same chip style, tiny sparkle, dotted underline, hover reveals _"Inferred from your thought"_.
- No loud color difference between known and inferred.
- Clicking turns the value into an inline editable field. Manually editing an inferred value marks it **known**.

- [ ] An inferred value shows a subtle cue (sparkle + dotted underline) and a hover explanation.
- [ ] After the user edits an inferred value by hand, it renders as known with no inferred cue.

### Follow-up questions (the Gap Rule)

- At most one question visible at a time, directly beneath the chips — inline, no modal, no chat, no separate page.
- Header line: _"One thing I need to know"_; a `Continue` action submits the answer.
- After each answer: incorporate it, update the interpretation, re-evaluate remaining gaps, then either ask the next question or reveal `Build prompt`.
- **Hard ceiling: 3 questions per dock.** After the third, unresolved gaps become visible inferred assumptions and the flow continues.
- `Build prompt` is **not rendered** while a question is pending — never shown disabled with unclear reasoning.
- The interpretation stays visible and readable the whole time they are answering.

- [ ] Never two questions on screen at once.
- [ ] A fourth question is never asked; the flow proceeds with the remaining gaps marked inferred.
- [ ] `Build prompt` is absent (not disabled) while a question is pending, and appears once none is.

### Build prompt

- Rendered only when no high-impact question is pending; it is the strongest visual action in that state.
- All chips remain editable before pressing it.
- On press: reads _Building…_, keeps the interpretation visible with editing visually paused, blocks duplicate generation.

- [ ] At most one generation request is in flight at a time.

### Prompt editor and interpretation sync

- The prompt appears in a new _"Your prompt"_ section — a tall multiline editor that reads as the final artifact, not a small form field.
- Directly editable. Actions are minimal: **Copy**, plus **Update prompt** only when the prompt has been hand-edited and the understanding has since changed. There is no generic `Rebuild prompt` action in the POC.
- **Copy** copies the current editor contents and briefly reads _Copied_. No toast pile, no modal. Copy has no persistence responsibility.
- **Sync rule — the single internal distinction is _generated prompt untouched_ vs _manually edited prompt_:**
  - _Untouched:_ editing a chip **auto-regenerates** the prompt; the changed portion visibly updates and a brief _"Updated"_ marker appears.
  - _Manually edited:_ chip edits **never** silently overwrite. The prompt is marked out of sync with _"Understanding changed."_ plus an `Update prompt` action that regenerates from the current interpretation.

- [ ] With the prompt untouched: changing a chip updates the prompt with no `Build prompt` press, and an _"Updated"_ cue is briefly visible.
- [ ] After hand-editing the prompt: changing a chip leaves the hand-edited text byte-for-byte intact and shows _"Understanding changed."_ with `Update prompt`.
- [ ] `Copy` returns exactly what is currently in the editor.

### Prompt library (versioned, IndexedDB)

- Browser storage only, on IndexedDB. **No eviction cap**; the legacy localStorage docks migrate in once and stay untouched as a recovery backup.
- **Written on successful generation and on refinement.** Copy does not save. A refinement appends a new immutable version to the same group rather than creating a second entry.
- Each version stores: the body, its source (migration / ai-build / ai-refinement), a base version link, a favorite flag, and a timestamp; the group stores the title and the original thought.
- The library lives on `/library`: search by title, sort (newest / oldest / A→Z), All / Favorites filter, rename, and a confirmed delete. Share opens the honest "Coming soon" dialog — never a fake link.
- **Title rule (locked, carried forward):** use the Goal if one exists → otherwise the first ~6 meaningful words of the original thought → otherwise `Untitled prompt`.
- No folders, tags, pinning, sync, or accounts.

- [ ] With no saved prompts, the library renders an empty state — no fake rows, no suggestions.
- [ ] A prompt appears after the first successful generation; each refinement appends a new version (three refinements → four intact, copyable versions).
- [ ] Reopening a prompt restores the latest version for editing; any earlier version can be restored by selection, never by overwrite.
- [ ] Titles follow the locked fallback rule.

### Loading and processing states

- `Shape this` → _Shaping…_: thought visible, repeat submission blocked.
- `Build prompt` → _Building…_: interpretation visible and editing visually paused, repeat generation blocked.

## States and Boundaries

- **First use (no saved prompts)** — the page is the input; the library shows only an empty state.
- **Empty input** — `Shape this` disabled; no message.
- **Generation fails (first attempt)** — interpretation stays visible; inline _"Couldn't build the prompt."_ with `Try again` and quiet _"Your work is still here."_ No modal, no navigation, no version written.
- **Regeneration fails (prompt already exists)** — the last good prompt stays intact and usable; inline _"Couldn't update the prompt."_ with `Try again`. An error never replaces a working prompt.
- **Processing** — buttons relabel (_Shaping…_ / _Building…_), duplicate actions blocked, nothing the user wrote disappears.
- **Offline** — the library and every saved prompt remain available from the service-worker cache; AI generation is disabled with a clear indicator (_"Offline — your saved prompts are available. Generation needs a connection."_). Offline AI is never faked.
- **Persistence** — the library persists between sessions in browser IndexedDB only, on this device, in this browser; drafts autosave debounced, committed versions save automatically (no Save button). Clearing site data removes them; there is no recovery, no sync, no export. **If a storage write fails, the session continues normally** — everything stays on screen, nothing is lost, the work simply isn't persisted for next time; a save-status line says so plainly.
- **Who sees what** — single user, single device, no accounts and no sharing. Nothing leaves the browser except the request that shapes, builds, or refines the prompt.
- **Locked product rules** — gaps never render as "missing"; 3-question ceiling; save on successful generation only.

**Guiding principle (the learner's):** _AI failure should cost the user time, never their work._

## Product Decisions

- **Save on successful generation, not on Copy** — _"Copy only copies. It should not control whether work is saved."_
- **Sync breaks at manual prompt edit** — _"Once someone manually fixes the final prompt, changing a chip cannot unexpectedly erase their work."_
- **`Shape this` = 3-character trim guard, no semantic check** — an AI judgment of "meaningful input" would contradict _"Messy is fine."_
- **`Build prompt` withheld rather than disabled while a question is pending** — _"prefer not rendering it yet rather than showing a disabled button with unclear reasoning."_
- **No example cards** — examples live only as placeholder copy inside the input, so the first screen has one action.
- **Two separate actions** — `Shape this` interprets; `Build prompt` compiles. Confirmed explicitly.
- **Single-page growth instead of steps** — _"the page grows downward as understanding increases"_; explicitly no wizard, progress bar, or review page.
- **Chips are a flexible set, not a schema** — only relevant fields render, so two different thoughts look different.
- **Theme toggle ships, light-first** — light is the reference design; dark must keep the same character rather than a neutral inversion.
- **Palette inherits Prompt Dock's ivory-green character, code written from scratch** — calm muted green is the sole accent; _"the sparkle is functional, not branding."_
- **Manrope** as the primary typeface.
- **`Rebuild prompt` cut** — _"It introduces a second concept without a strong reason."_ The two existing paths already cover every case.
- **Title fallback locked** — Goal, else ~6 meaningful words of the thought, else `Untitled dock`.
- **Storage failure is graceful, not an error state** — _"preserve the current session and simply don't persist it."_
- **AI inference is a product dependency, not an implementation detail** — `Shape this` and `Build prompt` both call a model; credentials must stay server-side, so the app is one Next.js deployment with no separate backend service.

**Constraints carried forward to `4-spec`** (not open questions — binding): Next.js App Router + TypeScript; one deployable Next.js app with no separate backend service; AI inference only through server-side routes; provider credentials never reach the browser; and the implementation must stay compatible with a **genuinely free / free-tier model option** for the hackathon. Provider choice, exact env var names, route implementation, request/response shapes, and model configuration are all `4-spec` decisions.

## What We're Building

**The product requires AI inference.** Both central operations — `Shape this` (interpret the thought) and `Build prompt` (compile the final prompt) — call a model. This document does not decide how; `4-spec` does. The standing constraint: the app must be lightweight enough to deploy as one Next.js app, and **provider credentials must never reach the browser** — inference goes through server-side routes, with one server-side environment key, so there is no separate backend service to run.

- Single page, header with wordmark + theme toggle, light/dark themes.
- Thought input with 3-character guard, `Shape this`, Cmd/Ctrl+Enter.
- Interpretation section with known/inferred chips, inline editing, inferred→known on manual edit.
- Inline follow-up questions, one at a time, hard ceiling of 3, then inferred assumptions.
- `Build prompt` with processing state and inline failure recovery.
- Tall editable prompt editor with `Copy`, plus `Update prompt` only for the out-of-sync case.
- Chip→prompt sync with the untouched vs manually-edited distinction.
- Prompt library: IndexedDB, versioned, no cap; save on generation and refinement, restore editable, auto-title, rename, favorites, confirmed delete on `/library`.
- Inline error states for both first generation and regeneration.
- Everything persists across a browser reload in browser storage (IndexedDB), with debounced draft autosave and automatic version commits.

## Deferred From the POC

- **Accounts, sync, sharing** — "my saved items" implies auth and a backend; one browser's local storage proves continuity without them.
- **Running the prompt against a provider** — _"Run prompt" is a 1.0 feature_, and it drags in keys, models, and cost.
- **Model/provider selection and BYOK** — unnecessary while there is no execution.
- **Multi-agent pipeline / agent execution view** — a beautiful risk; the Mini is the restraint.
- **Template gallery, onboarding tour, marketing copy** — the app opens on the input.
- **Folders, tags, pinning in the library** — search, sort, rename, and favorites shipped in the October upgrade (see amendment); folders, tags, and pinning remain deferred.
- **Voice capture and file attachments** — deferred P1s from the upgrade spec; not shipped untested.
- **A visible "missing" chip** — three provenance states is a questionnaire with extra steps; two is a product.

## Possible Later Enhancements

- Pinned prompts and folders for larger libraries (rename, search, sort, favorites already ship — see amendment).
- Export a dock as a file, or share by link.
- Alternate generations for one thought (several candidate prompts), which would be the only reason a generic rebuild action might return.
- Multiple dock slots per thought (variants) now that the sync rule exists.
- Running the prompt, with provider choice.

## Non-Goals

- No accounts, auth, or sync — _no infrastructure to maintain for a demo_.
- No executing the prompt — _scope.md > Explicitly Cut_.
- No wizard, progress bar, numbered steps, Back/Next, or sidebars — _the page grows downward instead_.
- No purple/blue AI gradients, glow, glassmorphism, neon, or floating sparkles — _generic AI-app styling is exactly what this avoids_.
- No success screen, score, or completion step — _the prompt is the proof_.
- No AI-based validation of the user's input — _"Messy is fine."_
- No silent overwrite of a hand-edited prompt — _AI failure and user work must not collide_.
- No generic `Rebuild prompt` action — _the untouched path regenerates itself and the edited path has `Update prompt`; a third verb would need alternate generations first_.
- No client-side provider key — _inference goes through server-side routes so the key never ships to the browser_.

## Open Questions

_None. Three candidates were raised during review and all three are now settled:_

- ~~Storage quota~~ — **resolved:** not a product concern at ten text docks; a failed write fails gracefully without losing the session.
- ~~Auto-title fallback~~ — **resolved:** Goal → first ~6 meaningful words of the thought → `Untitled dock`.
- ~~`Rebuild prompt` vs `Update prompt`~~ — **resolved:** `Rebuild prompt` is **cut** from the POC. Untouched prompts regenerate automatically; hand-edited prompts get `Update prompt`. A generic rebuild would only earn its place alongside alternate generations, which are out of scope.

---

## Amendment — Local-First UX & PWA Upgrade (22 Oct 2026)

Status: approved and implemented. Source spec: `PROMPTDOCK_MINI_ADDENDUM.md`. This amendment supersedes the specific requirements it names; everything else in this document stands.

### New and Changed Requirements (shipped)

1. **Persistent composer with explicit modes** — a sticky bottom composer hosts `Shape idea` and `Refine prompt` as separate, explicit modes; the current prompt is never hidden while refining. The workspace keeps the grow-downward model inside the working area.
2. **Continuous refinement** — `Refine prompt` takes the current prompt plus a change request and produces one clean replacement prompt. **Three consecutive refinements produce four intact, copyable versions** (original + three). Refinement preserves prior constraints unless the change request contradicts them. Still not a chatbot: no chat transcript is stored; only prompt artifacts.
3. **Versioned library on `/library`** — replaces Recent docks. IndexedDB groups with immutable versions; **no eviction cap**. Search, sort (newest / oldest / A→Z), All/Favorites filter, rename, and confirmed delete ship. Share opens the honest "Coming soon" dialog.
4. **Data migration, non-destructive** — legacy `pmd.docks` localStorage records migrate once into the library and remain untouched as a recovery backup. **No user data is deleted.**
5. **PWA** — web manifest, icons, and a service worker cache the shell, `/library`, and saved prompts. **Offline, the library and saved prompts remain fully available**; AI generation is guarded with a clear offline indicator and is never faked.
6. **Save behavior preserved** — no Save button after generation; versions commit automatically. Drafts autosave debounced and are distinct from committed versions. A save-status line shows _Saving… / Saved locally / Couldn't save_ honestly.
7. **Async safety** — operation IDs discard stale responses, so a slow shape/build/refine response can never overwrite newer edits.
8. **Manual-edit protection carried forward** — `Understanding changed.` + `Update prompt` still guards hand-edited prompts; a refinement never silently discards manual edits to the current version body.

### Deferred From the Upgrade (P1, not shipped untested)

- Voice capture of a thought.
- Attachments / images / files.
- JSON export/import.

### Acceptance Evidence

- `npx tsx scripts/prompt-store-smoke.ts` → **22 assertions pass**: 10 legacy docks migrate intact with `pmd.docks` retained as backup; rerun is a no-op; 25 groups survive (no cap-10 eviction); three refinements yield four sequential intact versions; favorites toggle; scoped delete leaves other groups untouched.
- Lint, typecheck, and production build pass.
- Live smoke on the dev server: `/`, `/library`, `/manifest.webmanifest` all 200; real `shape → build → refine` round-trips return prompt-only output; refinement honored change requests (e.g. _"shorten to under 100 words, add a move-in date"_) while preserving prior constraints; no conversational wrappers leaked through the prompt-only guard.
