---
doc: prd
status: approved
---

# Prompt Dock Mini — Product Requirements

A single-page tool that turns a messy, half-formed thought into a usable prompt by first showing its understanding in editable pieces, asking at most three questions when a wrong guess would matter, and compiling the result. Built for someone who wants a better prompt without learning to write one.
Source: `scope.md > The Unique Kernel`, `scope.md > The Core Loop`.

## The Core Journey

1. The user opens the page. There is one large input, a heading — *"What are you trying to get done?"* — and a quiet line under it: *"Messy is fine."* Nothing else competes for attention. If they have docks before, they appear below; if not, the page shows nothing there.
2. They type a rough thought. The placeholder and its example copy — *"Describe it however it comes to mind…"* — tell them they don't need to phrase it well. `Shape this` enables once the input holds at least 3 non-whitespace characters.
3. They press `Shape this` (or Cmd/Ctrl + Enter). The button reads *Shaping…* and duplicate submissions are blocked. The page grows downward: the thought compacts into an editable field labelled *"Your thought"*, and beneath it a heading — *"What I understood"* — appears with the interpretation as compact chips.
4. Each chip is marked **known** (plain) or **inferred** (tiny sparkle, dotted underline, *"Inferred from your thought"* on hover). Only relevant fields appear; no rigid schema. Clicking a chip makes its value editable inline. Manually editing an inferred value makes it known.
5. If a materially important gap remains, one question appears directly under the chips — *"One thing I need to know"* — one at a time, up to 3. After each answer the interpretation updates and gaps re-evaluate. Unresolved gaps after the third question become visible inferred assumptions. `Build prompt` is not rendered while a question is pending.
6. When no high-impact question remains, `Build prompt` appears as the strongest action on the page. They press it; it reads *Building…*.
7. The page grows downward again: *"Your prompt"* — a tall, editable text editor containing the generated prompt, with `Copy` as the only always-available action.
8. The dock is written to Recent docks the moment generation succeeds. Copy only copies.
9. They edit an interpretation chip. Because the generated prompt has not been touched by hand, the prompt updates on the spot with a brief *"Updated"* marker — no second `Build prompt` press.
10. If they *have* hand-edited the prompt, chip edits never overwrite it. Instead: *"Understanding changed."* with an `Update prompt` action.
11. They press `Copy` → the button reads *Copied*. The end state is a prompt they understand, can still edit, and can copy.

There is no success screen, no score, no confetti. The proof is the prompt itself, traceable back through the thought.

## Screens and Layout

One screen, not several. The product is a single page that **grows downward as understanding increases** — there is no navigation, no wizard, no progress bar, no Back/Next, no sidebars, no separate review page.

Top to bottom:

1. **Header** — `Prompt Dock Mini` wordmark left, theme toggle right. No nav links, account button, or help menu.
2. **Thought** — heading, quiet supporting line, one large multiline input, `Shape this` attached to or inside it, and one subtle reassurance: *"No perfect prompt needed. Start with the rough idea."* After shaping it compacts and is relabelled *"Your thought"*, still editable; resubmitting recomputes the interpretation rather than preserving stale chips.
3. **What I understood** — quiet heading, then chips grouped into only the fields that apply (Goal, Audience, Context, Requirements, Output — illustrative, not a fixed schema).
4. **Follow-up question** (conditional) — inline beneath the chips, never a modal or chat window.
5. **`Build prompt`** (conditional) — rendered only when no high-impact question is pending.
6. **Your prompt** (conditional) — tall editable editor, `Copy`, and `Update prompt` only when the prompt has been hand-edited and the understanding has since changed.
7. **Recent docks** (conditional) — beneath everything, rendered only when docks exist.

Source: `scope.md > The Core Loop`, `scope.md > The Unique Kernel`.

## Look and Feel

*"An editorial writing tool with the calmness of a field notebook and the precision of a developer tool."*

- **Light mode is the primary/reference design.** Warm off-white / ivory-tinted surfaces, never harsh pure white.
- **Dark mode is a deliverable** (theme toggle ships), using near-black / deep neutral, deep green-black surfaces with restrained green accents — same family, not a neutral gray inversion.
- **Accent:** calm, muted green as the single accent. It carries the sparkle, the *inferred* cue, and the primary button. No second semantic color is introduced for provenance.
- **Type:** Manrope as the primary face. Headings get confidence from spacing, size and weight — not decorative fonts. Monospace appears sparingly for prompt detail or small metadata; the product must not read as a terminal.
- **Hierarchy:** whitespace and typography first, borders and cards second, color third.
- **The thought and the prompt are the loudest things on the screen.**
- **Avoid:** purple/blue AI gradients, glowing borders, glassmorphism, neon, oversized gradient hero text, floating sparkle decorations, excessive rounded cards, dashboard-widget styling everywhere.
- The sparkle on inferred content is **functional, not branding** — tiny and quiet.

The overall feel is related to the main Prompt Dock's restrained ivory-green character, but built from scratch: warmer and less IDE-like than Cursor, which is a reference for restraint and tool-like confidence rather than a target to copy.

## Features and Behavior

### First screen

- Header: wordmark left, theme toggle right. Nothing else.
- Centered main content with a slight upper-center bias.
- Heading: *"What are you trying to get done?"*
- Supporting line: *"Messy is fine."*
- One large multiline input — a thought box, not a form field — with placeholder *"Describe it however it comes to mind…"*.
- **Examples are placeholder copy only.** They are never clickable cards, templates, or suggestions.
- Reassurance under the input: *"No perfect prompt needed. Start with the rough idea."*
- `Shape this`: disabled below 3 non-whitespace characters after trimming, enabled at or above. No validation message — the disabled state says enough. No semantic or AI-based judgment of whether input is "good enough"; extremely vague input goes through.
- Cmd/Ctrl + Enter submits.

- [ ] The first screen presents exactly one obvious action: type into the box.
- [ ] `Shape this` is disabled at 0–2 non-whitespace characters and enabled at 3+, with no error text shown at any point.

### Shaping

- On submit: button reads *Shaping…*, thought stays visible, duplicate submission blocked.
- On success: thought compacts to an editable *"Your thought"* field with the user's exact wording untouched; *"What I understood"* appears below with chips.
- Editing the thought and resubmitting **recalculates** the interpretation — chips are not preserved from the stale reading.

- [ ] After shaping, the user's original wording is present and unmodified in the thought field.
- [ ] Only fields relevant to the thought are shown; two different thoughts produce visibly different chip sets.

### Interpretation chips

- Each chip: a field label and an editable value.
- **Known:** plain chip, no icon.
- **Inferred:** same chip style, tiny sparkle, dotted underline, hover reveals *"Inferred from your thought"*.
- No loud color difference between known and inferred.
- Clicking turns the value into an inline editable field. Manually editing an inferred value marks it **known**.

- [ ] An inferred value shows a subtle cue (sparkle + dotted underline) and a hover explanation.
- [ ] After the user edits an inferred value by hand, it renders as known with no inferred cue.

### Follow-up questions (the Gap Rule)

- At most one question visible at a time, directly beneath the chips — inline, no modal, no chat, no separate page.
- Header line: *"One thing I need to know"*; a `Continue` action submits the answer.
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
- On press: reads *Building…*, keeps the interpretation visible with editing visually paused, blocks duplicate generation.

- [ ] At most one generation request is in flight at a time.

### Prompt editor and interpretation sync

- The prompt appears in a new *"Your prompt"* section — a tall multiline editor that reads as the final artifact, not a small form field.
- Directly editable. Actions are minimal: **Copy**, plus **Update prompt** only when the prompt has been hand-edited and the understanding has since changed. There is no generic `Rebuild prompt` action in the POC.
- **Copy** copies the current editor contents and briefly reads *Copied*. No toast pile, no modal. Copy has no persistence responsibility.
- **Sync rule — the single internal distinction is *generated prompt untouched* vs *manually edited prompt*:**
  - *Untouched:* editing a chip **auto-regenerates** the prompt; the changed portion visibly updates and a brief *"Updated"* marker appears.
  - *Manually edited:* chip edits **never** silently overwrite. The prompt is marked out of sync with *"Understanding changed."* plus an `Update prompt` action that regenerates from the current interpretation.

- [ ] With the prompt untouched: changing a chip updates the prompt with no `Build prompt` press, and an *"Updated"* cue is briefly visible.
- [ ] After hand-editing the prompt: changing a chip leaves the hand-edited text byte-for-byte intact and shows *"Understanding changed."* with `Update prompt`.
- [ ] `Copy` returns exactly what is currently in the editor.

### Recent docks

- Local storage only. Latest **10**, newest first.
- **Written only on successful generation.** Copy does not save. Regenerating an already-saved dock updates that dock rather than creating a second one.
- Each dock stores: the thought, interpreted fields with provenance, follow-up answers, the prompt, and a timestamp.
- Rows show an auto-generated title and relative time; clicking one **restores the editable state rather than forking a copy**; a quiet per-row delete.
- **Title rule (locked):** use the Goal if one exists → otherwise the first ~6 meaningful words of the original thought → otherwise `Untitled dock`.
- No rename, folders, tags, search, pinning, sync, or accounts.

- [ ] With no docks, no Recent docks section renders at all — no empty state, no "You have no recent docks."
- [ ] A dock appears in the list immediately after the first successful generation, and the same dock updates (no duplicate row) on regeneration.
- [ ] Reopening a dock restores thought, chips, provenance, answers, and prompt as editable.
- [ ] A dock titled from a Goalless thought shows the first ~6 meaningful words of the thought, and reads `Untitled dock` only when neither exists.

### Loading and processing states

- `Shape this` → *Shaping…*: thought visible, repeat submission blocked.
- `Build prompt` → *Building…*: interpretation visible and editing visually paused, repeat generation blocked.

## States and Boundaries

- **First use (no docks)** — the page is the input. Recent docks renders nothing.
- **Empty input** — `Shape this` disabled; no message.
- **Generation fails (first attempt)** — interpretation stays visible; inline *"Couldn't build the prompt."* with `Try again` and quiet *"Your work is still here."* No modal, no navigation, no dock written.
- **Regeneration fails (prompt already exists)** — the last good prompt stays intact and usable; inline *"Couldn't update the prompt."* with `Try again`. An error never replaces a working prompt.
- **Processing** — buttons relabel (*Shaping…* / *Building…*), duplicate actions blocked, nothing the user wrote disappears.
- **Persistence** — docks persist between sessions in browser local storage only, on this device, in this browser. Clearing site data removes them; there is no recovery, no sync, no export. Ten text-only docks are far below any quota that matters. **If a local-storage write fails, the session continues normally** — everything stays on screen, nothing is lost, the dock simply isn't persisted for next time.
- **Who sees what** — single user, single device, no accounts and no sharing. Nothing leaves the browser except the request that shapes and builds the prompt.
- **Locked product rules** — gaps never render as "missing"; 3-question ceiling; save on successful generation only.

**Guiding principle (the learner's):** *AI failure should cost the user time, never their work.*

## Product Decisions

- **Save on successful generation, not on Copy** — *"Copy only copies. It should not control whether work is saved."*
- **Sync breaks at manual prompt edit** — *"Once someone manually fixes the final prompt, changing a chip cannot unexpectedly erase their work."*
- **`Shape this` = 3-character trim guard, no semantic check** — an AI judgment of "meaningful input" would contradict *"Messy is fine."*
- **`Build prompt` withheld rather than disabled while a question is pending** — *"prefer not rendering it yet rather than showing a disabled button with unclear reasoning."*
- **No example cards** — examples live only as placeholder copy inside the input, so the first screen has one action.
- **Two separate actions** — `Shape this` interprets; `Build prompt` compiles. Confirmed explicitly.
- **Single-page growth instead of steps** — *"the page grows downward as understanding increases"*; explicitly no wizard, progress bar, or review page.
- **Chips are a flexible set, not a schema** — only relevant fields render, so two different thoughts look different.
- **Theme toggle ships, light-first** — light is the reference design; dark must keep the same character rather than a neutral inversion.
- **Palette inherits Prompt Dock's ivory-green character, code written from scratch** — calm muted green is the sole accent; *"the sparkle is functional, not branding."*
- **Manrope** as the primary typeface.
- **`Rebuild prompt` cut** — *"It introduces a second concept without a strong reason."* The two existing paths already cover every case.
- **Title fallback locked** — Goal, else ~6 meaningful words of the thought, else `Untitled dock`.
- **Storage failure is graceful, not an error state** — *"preserve the current session and simply don't persist it."*
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
- Recent docks: local storage, cap 10, save on generation, restore editable, auto-title, delete.
- Inline error states for both first generation and regeneration.
- Everything persists across a browser reload in local storage.

## Deferred From the POC

- **Accounts, sync, sharing** — "my saved items" implies auth and a backend; one browser's local storage proves continuity without them.
- **Running the prompt against a provider** — *"Run prompt" is a 1.0 feature*, and it drags in keys, models, and cost.
- **Model/provider selection and BYOK** — unnecessary while there is no execution.
- **Multi-agent pipeline / agent execution view** — a beautiful risk; the Mini is the restraint.
- **Template gallery, onboarding tour, marketing copy** — the app opens on the input.
- **Library management** (rename, folders, tags, search, pinning) — ten rows with a delete button is the whole feature.
- **A visible "missing" chip** — three provenance states is a questionnaire with extra steps; two is a product.

## Possible Later Enhancements

- Manual dock renaming and pinning, once ten rows isn't enough.
- Export a dock as a file, or share by link.
- Alternate generations for one thought (several candidate prompts), which would be the only reason a generic rebuild action might return.
- Multiple dock slots per thought (variants) now that the sync rule exists.
- Running the prompt, with provider choice.

## Non-Goals

- No accounts, auth, or sync — *no infrastructure to maintain for a demo*.
- No executing the prompt — *scope.md > Explicitly Cut*.
- No wizard, progress bar, numbered steps, Back/Next, or sidebars — *the page grows downward instead*.
- No purple/blue AI gradients, glow, glassmorphism, neon, or floating sparkles — *generic AI-app styling is exactly what this avoids*.
- No success screen, score, or completion step — *the prompt is the proof*.
- No AI-based validation of the user's input — *"Messy is fine."*
- No silent overwrite of a hand-edited prompt — *AI failure and user work must not collide*.
- No generic `Rebuild prompt` action — *the untouched path regenerates itself and the edited path has `Update prompt`; a third verb would need alternate generations first*.
- No client-side provider key — *inference goes through server-side routes so the key never ships to the browser*.

## Open Questions

_None. Three candidates were raised during review and all three are now settled:_

- ~~Storage quota~~ — **resolved:** not a product concern at ten text docks; a failed write fails gracefully without losing the session.
- ~~Auto-title fallback~~ — **resolved:** Goal → first ~6 meaningful words of the thought → `Untitled dock`.
- ~~`Rebuild prompt` vs `Update prompt`~~ — **resolved:** `Rebuild prompt` is **cut** from the POC. Untouched prompts regenerate automatically; hand-edited prompts get `Update prompt`. A generic rebuild would only earn its place alongside alternate generations, which are out of scope.
