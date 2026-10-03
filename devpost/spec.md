---
doc: spec
status: approved
---

# Prompt Dock Mini — Technical Spec

## How This Works, In Plain Language

Prompt Dock Mini is one web page with a very small brain attached.

You open the page and see a big empty box. You type a messy thought — *"make something that helps me prepare for a football trial"* — and press **Shape this**. The page sends that sentence off to an AI model, and the model sends back a short structured answer: not a paragraph of chat, but a small list of things it understood — a goal, an audience, an output — each one labelled either **known** (you said this) or **inferred** (I guessed this from what you wrote).

Those labels come back as chips on your screen. You can click any chip and fix it. If the model found a gap that would actually change the result — not a nitpick, a real fork in the road — it returns **one** question. You answer it, it looks again, and it may ask a second. Never a third-plus-one: after **three** questions it stops asking and marks whatever's left as an assumption it can show you.

When it's finished understanding, you press **Build prompt**. The second AI call takes your thought, the understanding, and your answers, and writes the actual prompt — a real, copy-pasteable prompt for another AI. That prompt lands in a tall editor you can edit yourself, with one **Copy** button.

Two things are stored and one thing isn't:

- **The dock** (thought, understanding, answers, prompt) is saved in your browser's local storage the moment a prompt is successfully built — ten of them, newest first. Not on your laptop's hard drive, not on a server. Same browser, same device.
- **Your theme choice** — light or dark — is saved the same way.
- **Your API key never goes anywhere near your browser.** The page talks to *your own* Next.js server, and the server talks to the AI provider. The key lives in one environment variable on the server, and Vercel never exposes it.

**Why this shape and not something bigger?** One page, two AI calls, one storage slot. Every extra service — a database, accounts, a queue — would be a thing that can break in front of a reviewer, and none of them would prove the idea. The idea is *a messy thought becomes a good prompt*. That's it.

## The Core Journey Through the System

Implements `prd.md > The Core Journey`.

1. **The user opens `/`.** The server renders the initial shell — an empty thought box with `Shape this` disabled (fewer than 3 non-whitespace characters). **The server never touches local storage**; it can't. Two client steps happen after: a tiny pre-hydration script reads `pmd.theme` and sets `data-theme` on `<html>` *before* React hydrates, so the correct theme paints first instead of flashing light-then-dark; then, after hydration, Recent docks are read client-side and rendered (or nothing, if there are none).
2. **They type and press `Shape this`** (or Cmd/Ctrl+Enter). The client validates the 3-character guard, sets button text to *Shaping…*, and POSTs the thought to **`/api/shape`**.
3. **`/api/shape` runs on the server.** It reads `APMIX_API_KEY` / `GROQ_API_KEY` / `GEMINI_API_KEY` from `process.env` — never from the client — builds a request with your system prompt, and calls the provider chain: **apmix → groq → gemini**, 12s timeout, at most 2 fallbacks. It parses the JSON, validates it against the contract, and returns it to the browser.
4. **The page grows downward.** The thought compacts to an editable *Your thought* field; chips render under *What I understood*. Known chips are plain; inferred chips get the sparkle and dotted underline. Editing an inferred chip by hand flips it to known in local state.
5. **If a question came back**, it renders inline beneath the chips. The user types an answer, presses **Continue**, and the question — *along with the thought, the current interpretation, and all previous answers* — goes back to `/api/shape`. Gaps re-evaluate; either a new question comes back or `questions` comes back empty and **Build prompt** renders. The counter never exceeds 3; on the 3rd answer the client stops asking and marks remaining gaps inferred.
6. **They press `Build prompt`.** Button reads *Building…*, editing is visually paused, and the settled thought + interpretation + answers POST to **`/api/build`**. Same provider chain, same timeout.
7. **The prompt appears** in a tall editable editor below. **This is also where the dock is written** — a successful response creates/updates a row in local storage. Failure writes nothing.
8. **Copy** reads the editor's live contents to the clipboard and briefly reads *Copied*. It does **not** save.
9. **Sync rule.** A flag tracks whether the generated prompt has been hand-edited:
   - *Untouched* → editing a chip auto-re-calls `/api/build` with the updated interpretation; the prompt visibly changes with an *✦ Updated* cue.
   - *Hand-edited* → chip edits never touch the prompt. The UI shows *"Understanding changed."* with an **Update prompt** button that the user must press.
   This flag is **saved with the dock and restored with it**, so reopening a dock keeps exactly the protection it had when it was closed — a hand-edited prompt is never silently overwritten by an automatic regeneration.
10. **They close the tab and come back** → the theme and the Recent docks list are restored from local storage, and the page starts on the **normal empty thought screen**. Nothing auto-resumes. Clicking a Recent dock restores it into its editable state — not forked. One click gets you back where you were, so there is no `pmd.currentDockId` to keep in sync.

```
┌────────────┐   POST /api/shape    ┌──────────────────┐   chat/completions   ┌─────────┐
│  Browser   │ ───────────────────► │  Next.js server  │ ───────────────────► │ apmix   │
│ (React UI, │ ◄─────────────────── │  route handlers  │ ◄─────────────────── │ groq    │
│  localStorage)   JSON chips /     │  key in process. │     JSON chips /    │ gemini  │
└────────────┘   prompt             │      env         │     prompt         └─────────┘
      │                             └──────────────────┘
      └── local storage: 10 docks + theme   (never sent anywhere)
```

**The key never crosses the left-hand line.** That's the whole security shape of this app in one sentence.

## Stack

| Choice | Version / detail | Why |
|---|---|---|
| **Next.js (App Router)** | v15.x, `create-next-app` default | Your constraint from the PRD: one deployable app, no separate backend. App Router gives route handlers at `app/api/*/route.ts` for free. |
| **TypeScript** | strict mode | Your constraint. Catches contract drift in the JSON the model returns — the exact failure this app is prone to. |
| **React** | bundled with Next 15 | The page is one surface with several conditional blocks. |
| **Tailwind CSS** | v4 | *"tailwind nextjs default"* — your pick. Pairs with `create-next-app`'s `--tailwind` flag; no config file needed in v4. |
| **AI calls** | raw `fetch` to `POST {base}/chat/completions` | All three providers are OpenAI-compatible, so **one** request shape covers apmix, groq, and gemini's OpenAI endpoint. No SDK → fewer dependencies, fewer version surprises. |
| **No DB, no ORM, no auth** | — | Local storage only, per `prd.md > Recent docks`. |
| **Vercel** | optional deploy | Your choice; env vars set in the dashboard, `.env` stays gitignored. |

**Docs:** [Next.js App Router](https://nextjs.org/docs/app) · [Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) · [Next.js + TypeScript](https://nextjs.org/docs/app/building-your-application/typescript) · [Tailwind CSS v4](https://tailwindcss.com/docs) · [Vercel env vars](https://vercel.com/docs/environment-variables)

**Unverified — check early in the build:** exact current Next.js and Tailwind major versions at install time, and confirm `deepseek-v4-flash-free` on APMIX accepts the standard OpenAI `/chat/completions` shape with a `system` role message. First build step, before any UI.

## Where It Runs and How Someone Tries It

**Runtime:** Node.js 20+ for the dev server and server routes; the UI is a normal browser page. Requires Node 24.18.0 (installed: ✓) and one AI provider key.

**Environment:** a `.env` file at the project root, already gitignored:

```
APMIX_API_KEY=
APMIX_BASE_URL=https://api.apmix.ai/v1
APMIX_MODEL=deepseek-v4-flash-free
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-120b
GEMINI_API_KEY=
```

Only keys used by Mini are listed. The existing root `.env` already carries all three — copy the ones you need into the project, do not commit them.

**Start it:**

```bash
cd /home/king/Documents/promptdock-mini
npm install
npm run dev        # http://localhost:3000
```

**Open:** <http://localhost:3000>

**For the required demo recording:** record against `localhost:3000`. Submission needs a **1–3 minute video** plus a **public GitHub repository**; neither requires a live deployment. Record the beats from the PRD — thought → interpretation → edit one chip → prompt visibly updates → Copy.

**Optional deploy:** `vercel` with the same env vars set in Project → Settings → Environment Variables. Never paste a key into the repo.

## Look and Feel

Carried forward from `prd.md > Look and Feel` — no re-interviewing.

- **Light mode is the reference design.** Warm off-white/ivory surfaces (`#f7f8f3`), never pure white. Dark mode is a deliverable: deep green-black (`#12291d`), not neutral gray.
- **One accent:** calm muted green. It carries the sparkle, the inferred cue, and the primary button. No second semantic color.
- **Tailwind constraint:** everything above is expressed as CSS custom properties in `globals.css` mapped to Tailwind theme tokens, so `[data-theme="dark"]` swaps the values without touching components. Tailwind *can* honor this; it does not need a fork of the design system.
- **Type:** Manrope (Google Fonts, self-hostable via `next/font`), loaded once. Monospace (`font-mono`) only for small metadata — timestamps, the `✦` provenance note.
- **Hierarchy:** whitespace and type first, borders and cards second, color third. The thought and the prompt are the loudest things on screen.
- **Avoid:** purple/blue AI gradients, glow, glassmorphism, neon, floating sparkles, dashboard-widget grids.
- Interface copy tone: quiet, plain, never congratulatory. The UI strings are already written in `prd.md` — use them verbatim.

## Components

Each has its own heading because `5-build` builds and verifies them one at a time.

### `ThemeToggle`
Header-right button, cycles light/dark. Writes `theme` to local storage and sets `data-theme` on `<html>`. It does **not** read the stored value itself during render — that job belongs to the pre-hydration script from journey step 1, which applies the saved theme before React mounts. The toggle simply re-writes it on click.
PRD ref: `prd.md > Screens and Layout` (item 1).

### `ThoughtInput`
The large multiline box. Emits its value; enforces the **3 non-whitespace character guard** (trim, then count) with *no* validation message — disabled state only. Supports Cmd/Ctrl+Enter. Submitting sets the button label to *Shaping…* and blocks duplicates. After shaping, re-renders as the compact, relabelled *Your thought* field; resubmitting **discards old chips and re-shapes** rather than merging.
PRD ref: `prd.md > First screen`, `prd.md > Shaping`.

### `Interpretation`
Renders the chip set returned by `/api/shape`. **Only fields the model returned** — no fixed schema, no empty placeholders. Each chip: label, value, and provenance.
- known → plain
- inferred → `✦` + dotted underline + `title="Inferred from your thought"`
Click swaps the value to an inline input; a manual edit flips provenance to **known** in client state.
PRD ref: `prd.md > Interpretation chips`.

### `FollowUpQuestion`
Inline block under the chips. Shows at most **one** question. *Continue* sends thought + interpretation + answers back to `/api/shape`. Keeps a `questionCount` in state: at `3`, never request again — mark unresolved gaps inferred and reveal `BuildPrompt`. Renders nothing when no question is pending (in which case `BuildPrompt` is rendered instead).
PRD ref: `prd.md > Follow-up questions — the Gap Rule`.

### `BuildPrompt`
Primary action, rendered **only** before a prompt exists — no question pending and no prompt on screen. There is no "rebuild is needed" state: an existing untouched prompt updates automatically when a chip changes, and an existing hand-edited prompt updates only via **Update prompt**, which lives in `PromptEditor`, not here. On press: *Building…*, interpretive editing visually paused, duplicate calls blocked. Handles both failure branches — first build vs. regeneration — with their distinct messages.
PRD ref: `prd.md > Build prompt`.

### `PromptEditor`
Tall multiline editor holding the generated prompt. Owns:
- **Copy** → clipboard + *Copied*; no persistence.
- **the `promptEditedManually` flag** — set the moment the user types in the editor; cleared by a successful explicit **Update prompt**. **Persisted with the dock** (see Data Model) so a restored dock re-arms the same protection.
- **the out-of-sync banner** — *"Understanding changed."* + **Update prompt**, shown when `promptEditedManually && interpretationHasChanged`.
- **the transient *✦ Updated* cue** after an auto-regeneration.
No generic `Rebuild prompt` action.
PRD ref: `prd.md > Prompt editor and interpretation sync`.

### `RecentDocks`
Renders **only** when docks exist. Rows: auto-title + relative time + quiet delete. Click → restore that dock into the page as an editable state (no fork).
Title rule: Goal → first ~6 meaningful words of the thought → `Untitled dock`.
PRD ref: `prd.md > Recent docks`.

### `app/api/shape/route.ts`
**Server-side.** Accepts `{ thought, interpretation?, answers[], questionCount }`. Builds the `shape` system prompt (see below) + the user message, runs the provider chain, parses and validates the response, returns `{ fields[], question? }` or a structured error.
Implements `prd.md > Follow-up questions` and `prd.md > Interpretation chips`.

### `app/api/build/route.ts`
**Server-side.** Accepts `{ thought, interpretation, answers[] }`. Returns `{ prompt: string }` or a structured error. Writes nothing — the client owns persistence.
Implements `prd.md > Build prompt` and `prd.md > Prompt editor and interpretation sync`.

### `lib/ai.ts` — the provider chain
One exported `complete(system, user)` that tries **apmix → groq → gemini**, 12s timeout (`AbortController`), max 2 fallbacks, all via `POST {base}/chat/completions` using `response_format: { type: "json_object" }` **only if the verification step confirms the provider accepts it** — otherwise structured output is obtained purely by prompt contract plus schema validation (see *Open issues*). Falls through on non-2xx, timeout, or JSON parse failure. Throws one typed error the route turns into the PRD's inline message.
**Never imported by a client component.** Add a build-time guard comment and keep all key reads inside route handlers.
Doc: [OpenAI Chat Completions](https://platform.openai.com/docs/api-reference/chat)

### `lib/prompts/shape.ts` and `lib/prompts/build.ts`
Explicit build step (see *Build Order*, step 4). They export plain template strings. **Either the agent or the learner may author them** (the agent will, in fast build mode) — but whoever writes them, they are adversarially tested against 10 deliberately awkward thoughts and tightened against observed failures before any UI renders their output. The contract below is binding regardless of author.

`shape` must define the contract:

- raw user thought in → structured JSON out
- **dynamic** interpretation fields; irrelevant fields simply absent
- every returned field tagged `known` or `inferred`
- **no persistent `missing` state anywhere in the response**
- a flag for whether a materially important follow-up is required
- **at most one** question in the response
- no prose outside the JSON structure
- conservative, *visible* assumptions — never silently invented facts

`build` must define: thought + settled interpretation + answers in → final prompt text out, with no chat preamble.

### `lib/dock-storage.ts`
Thin wrapper over `localStorage`. Keys: `pmd.docks` (array, capped at 10, newest first), `pmd.theme`. All reads/writes wrapped in `try/catch` — **a failed write preserves the session and simply doesn't persist** (`prd.md > States and Boundaries`).
Implements `prd.md > Recent docks`.

## Data Model

| Datum | Where it lives | Updated when | On return |
|---|---|---|---|
| `thought` | React state → localStorage on successful build | user types / reshapes | restored editable |
| `interpretation.fields[]` | React state → localStorage | model returns it, or user edits a chip | restored with provenance intact |
| `answers[]` | React state → localStorage | each *Continue* press | restored; re-send to `/api/shape` if reshaped |
| `questionCount` | React state (also persisted per dock) | each question shown | restored so the 3-cap survives reload |
| `prompt` | React state → localStorage | `/api/build` returns it | restored |
| `promptEditedManually` | React state → **localStorage, saved with the dock** | `true` on user typing in the editor; `false` on generation and again after a successful **Update prompt** | **restored as-is** — a reopened hand-edited prompt is still protected |
| `dockId` | localStorage | assigned on first successful build | same row updated on regeneration, never duplicated |
| `theme` | localStorage | toggle | restored |

**The dock object** (what's written under `pmd.docks`):

```
{ id, title, thought, fields[], answers[], questionCount, prompt, promptEditedManually, createdAt, updatedAt }
```

**`promptEditedManually` lifecycle:** generated → `false`; user types into the prompt editor → `true`; successful explicit **Update prompt** → `false`. Saved and restored with the dock, so the reopened dock re-enters the exact sync state it left in. This is not an optimisation — omitting it reintroduces the one failure the sync rule exists to prevent: *generated → hand-edited → saved → reopened → flag reads untouched → chip edit auto-regenerates → the user's edit is overwritten*.

**All "restored" entries above mean *restored by clicking a Recent dock*.** On page load only the theme and the dock list come back; the screen starts empty (journey step 10).

**What travels over the network:** the thought, the interpretation, the answers. **What never does:** the API keys, the saved dock list, anything from local storage other than the current request's payload.

## File Structure

```
promptdock-mini/
├── app/
│   ├── api/
│   │   ├── shape/route.ts        # POST: thought → chips + ≤1 question
│   │   └── build/route.ts        # POST: thought + interpretation → prompt
│   ├── globals.css               # CSS vars → Tailwind theme tokens; light/dark
│   ├── layout.tsx                # Manrope via next/font + shell markup
│   ├── theme-boot.tsx            # tiny pre-hydration script: sets data-theme
│   └── page.tsx                  # the single screen; owns top-level state
├── components/
│   ├── ThemeToggle.tsx
│   ├── ThoughtInput.tsx
│   ├── Interpretation.tsx
│   ├── FollowUpQuestion.tsx
│   ├── BuildPrompt.tsx
│   ├── PromptEditor.tsx
│   └── RecentDocks.tsx
├── lib/
│   ├── ai.ts                     # provider chain: apmix → groq → gemini
│   ├── prompts/
│   │   ├── shape.ts              # ⚑ first draft (agent or learner), tested against 10 inputs
│   │   └── build.ts              # ⚑ first draft (agent or learner), tested against 10 inputs
│   ├── dock-storage.ts           # localStorage wrapper, try/catch everywhere
│   └── types.ts                  # Field, Interpretation, Dock, ShapeResponse
├── devpost/                      # planning docs (scope, prd, spec, checklist)
├── .env                          # gitignored; keys live here
├── .gitignore
├── next.config.ts
├── tailwind / postcss config     # created by create-next-app --tailwind
├── package.json
└── README.md
```

`create-next-app` scaffolds the config files and `public/`; their contents aren't enumerated here.

## External Services and Dependencies

| Service | Call | Keys | Cost | Docs |
|---|---|---|---|---|
| **APMIX** (primary) | `POST https://api.apmix.ai/v1/chat/completions`, model `deepseek-v4-flash-free` | `APMIX_API_KEY` | free-named model — **verify at build** | [apmix.ai](https://api.apmix.ai/v1) |
| **Groq** (fallback 1) | `POST https://api.groq.com/openai/v1/chat/completions`, model `openai/gpt-oss-120b` | `GROQ_API_KEY` | free tier, rate-limited | [console.groq.com/docs](https://console.groq.com/docs/overview) |
| **Google Gemini** (fallback 2) | via the OpenAI-compatible endpoint | `GEMINI_API_KEY` | free tier, rate-limited | [ai.google.dev/gemini-api/docs](https://ai.google.dev/gemini-api/docs) |
| **Vercel** (optional) | deploy + env vars | — | free tier | [vercel.com/docs/environment-variables](https://vercel.com/docs/environment-variables) |

**Provider chain, learner's choice:** `apmix → groq → gemini`, 12s timeout, max 2 fallbacks — reused from their existing configuration. *Tradeoff accepted:* three keys to configure on Vercel, in exchange for a demo that survives one provider being down.

**Nothing else external.** No database, no auth provider, no analytics, no CDN dependency — the spec's HTML/MD companions render offline.

**Verify early, before any UI:** that APMIX's `/chat/completions` accepts a `system` role message, and that its free model returns valid JSON for a ~500-token instruction. Test `response_format` support at the same time — **if it's unsupported, decide the schema-validation/retry strategy from what you observe rather than assuming it now.** If APMIX fails the base check, Groq is already wired as fallback #1.

## Important Failure Modes

The three places this realistically breaks in front of a reviewer:

- **First `/api/build` fails** (timeout, provider error, unparseable JSON) → interpretation stays on screen; inline *"Couldn't build the prompt."* + **Try again** + *"Your work is still here."* No dock written. (`prd.md > Loading and failure states`)
- **Regeneration fails after a good prompt exists** → the previous prompt stays intact and editable; inline *"Couldn't update the prompt."* + **Try again**. An error never replaces a working prompt.
- **Model returns prose instead of JSON** → `lib/ai.ts` fails parse, moves to the next provider; if all three fail, the same inline error path as above. User's text is never cleared.
- **localStorage write throws** (quota, private mode) → caught, session continues, dock isn't persisted for next time. No error UI.
- **Reopened dock loses its manual-edit protection** → prevented by persisting `promptEditedManually` with the dock. Without it, the reopen sequence silently overwrites a hand-edited prompt on the next chip edit — automation costing the user their work. A *false* on restore is only ever set by an explicit, successful **Update prompt**.
- **Model returns a `missing`-style field or two questions** → schema validation in the route rejects the response and treats it as a parse failure (falls through the chain). This is why the contract is validated, not trusted.

## What Was Simplified and Why

- **No database** → localStorage, capped at 10 text docks. *Why:* accounts and a hosted store would add an account, a key, and a failure mode without proving the kernel.
- **No fallback UI in the provider chain** → a silent provider switch buys nothing when the PRD already gives the user a working **Try again**. *Why:* one request path is one thing to debug.
- **No streaming responses** → wait for the complete JSON/prompt. *Why:* streaming is a UX nicety; it complicates both the parse and the sync rule for zero demo value.
- **No SDK (`openai`, `ai`)** → raw `fetch`. *Why:* one request shape covers all three providers; fewer dependencies, fewer surprises.
- **No separate `Rebuild prompt` action** → untouched regenerates automatically, hand-edited gets **Update prompt**. *Why:* your decision in `4-spec` review of the PRD — a third verb needed alternate generations first.
- **No onboarding, example cards, template gallery** → the box. *Why:* `prd.md > Non-Goals`."

## Decisions and Open Issues

**Learner decisions (consequential, chosen):**
- Next.js App Router + TypeScript, one deployable app, no separate backend — carried as a binding constraint from `prd.md`.
- AI only through server-side routes; credentials never reach the browser — same source.
- **Tailwind** as the styling system (*"tailwind nextjs default"*).
- **Provider chain `apmix → groq → gemini`, 12s timeout, max 2 fallbacks** — *"keep fallbacks"*; reused rather than invented.
- **`npm run dev` locally for the recording; Vercel optional.**
- **`shape` and `build` system prompts may be authored by either party** (revised during build planning: the agent may write them too). Ownership was never a product requirement; the 10-input adversarial test and contract below are.

**Implementation details derived from those choices (not learner decisions):** route-handler file layout, `lib/ai.ts` as a single `complete()` helper, `promptEditedManually` as the persisted sync flag, CSS custom properties under Tailwind tokens, and schema validation before returning to the client. Whether `response_format: json_object` is used at all is an open verification result, not an assumption.

**The one useful unknown — and it's the right one:** *does a hand-written system prompt actually return a stable contract?* The whole interpretation UI depends on getting dynamic fields, correct `known`/`inferred` tags, at most one question, and zero prose back from a model — every time, across very different thoughts. That can't be reasoned into existence; it has to be **tested against deliberately awkward inputs** ("asdf", "help me with my thing", a 900-word ramble, a prompt-shaped request that could be mistaken for an instruction) and tightened. That test-and-tighten loop is scheduled as an explicit build step and is squarely the prompt-engineering skill this hackathon is meant to teach. Agreed evidence of done: ten varied rough thoughts all return parseable, correctly-tagged JSON with ≤1 question.

**Open issues:** none carried from `prd.md > Open Questions` — it has none. Two things to verify early in the build, neither blocking spec approval: current Next/Tailwind versions at install time, and APMIX's `/chat/completions` accepting a `system` role message — plus whether it accepts `response_format: { type: "json_object" }`. **That last one is deliberately left open:** whatever the answer, the response is schema-validated before it reaches the client, and the validation/retry path is chosen from the observed behaviour rather than assumed here.

## Build Order (what `5-build` will slice)

1. Scaffold `create-next-app` (App Router, TS, Tailwind) → runs on `npm run dev`.
2. `lib/types.ts` + `lib/dock-storage.ts` with a smoke test.
3. **`lib/ai.ts` provider chain** — prove a real JSON response comes back from APMIX/Groq/Gemini *before* any UI exists.
4. **⚑ Write `shape.ts` and `build.ts`.** Test `shape` against 10 varied rough thoughts; inspect failures; tighten. Agent may author them; the test-and-tighten loop is mandatory either way.
5. `/api/shape` and `/api/build` route handlers + schema validation.
6. Static page shell: `layout.tsx`, `globals.css`, `ThemeToggle`, `ThoughtInput` with the 3-char guard.
7. `Interpretation` + `FollowUpQuestion` + the 3-question cap.
8. `BuildPrompt` + `PromptEditor` + the `promptEditedManually` sync rule, persisted and restored with the dock.
9. `RecentDocks` + post-hydration client load + auto-title rule + click-to-restore (no auto-resume on reload).
10. Failure states, dark mode pass, and the full demo path end to end.
