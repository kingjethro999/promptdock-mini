---
doc: scope
status: approved
---

# Prompt Dock Mini

One line: a tiny tool that turns a messy, half-formed intention into a precise, editable AI prompt — by showing you its interpretation *before* it writes the prompt.

## The Unique Kernel

**The interpretation is the product, not the prompt.**

Anyone can hand you a rewritten prompt. Mini pauses in the middle and shows you what it * thinks you meant* — Goal, Audience, Constraints, Output — as small editable pieces, and lets you correct them before the final prompt exists. You fix the misunderstanding at the source instead of discovering it after you've already run the prompt somewhere else.

If you deleted that middle step, Prompt Dock Mini would be indistinguishable from every other "paste text → get fancy prompt" generator. That's how you know it's the kernel.

> Their framing: *"it's almost a tiny intention compiler. The rough thought is the source language. Mini parses it into meaning. Then it compiles that meaning into a prompt."*

## Who It's For

**Somebody who already uses AI and keeps getting mediocre results — because there's a gap between what they mean and what they type.** Not prompt engineers; they'd never be marketed to.

Picture one of these people mid-task:

- A developer with *"build authentication"* or *"fix this mobile view"* sitting in their head, knowing it's too vague for a coding agent but not knowing what to add.
- A designer who knows the *feeling* they want but hasn't translated it into the vocabulary an image model needs.
- A student thinking *"help me understand this topic,"* a job seeker thinking *"make my CV fit this role but don't lie,"* someone thinking *"help me say this without sounding weird."*

Their shared trait: **they think in intentions, not prompts.**

Today they either hand-type a thin prompt and accept the weak result, or rewrite and retry four or five times until it's good enough.

## The Core Loop

1. **Open it.** Near-empty screen: one large input, the line *"What are you trying to get done?"*, and underneath, quietly: *"Messy is fine."* No welcome tour, no signup.
2. **Dump the thought**, exactly as they'd message a friend — messy is the point.
3. **Mini shows its understanding first**: the raw text shifts into compact editable pieces (Goal, Audience, Style, Constraints, Output, Assumptions). Each piece carries provenance: **known** (the user said it) or **inferred** (Mini filled it in — tiny sparkle / dotted underline, *"Prompt Dock inferred this from your description"*). Click any piece to correct it or add one.
4. **Gaps never appear as a persistent state.** *"Missing" exists only while Mini reasons* — internally — and always resolves to one of two outcomes before the user sees anything:
   - **Infer it.** If a reasonable assumption wouldn't materially change the result, Mini guesses and marks the chip inferred. Safe, invisible-ish, correctable.
   - **Ask.** If a wrong guess *would* materially change the resulting prompt, Mini asks — one question at a time, re-evaluated after each answer, because one answer usually resolves several gaps.
   **Hard ceiling: 3 questions per dock.** After the third, everything unresolved becomes a visible inferred assumption and Mini continues. The loop must stay fast and must never become a questionnaire.
5. **Build prompt** (not a generic "Generate"). The final prompt lands in a real editor — something you own. Read it, edit it directly, copy it.
6. **Recent docks** — local only, latest 10, newest first, written **only after a successful prompt generation**. Stores the original thought, the interpreted fields with their provenance, the follow-up answers, the generated prompt, and a timestamp. Reopening **restores it into an editable state — it does not fork a copy**. Auto-titled from the Goal. One delete button per row. No renaming, folders, tags, search, sync, or accounts.

They come back because the loop is short and the artifact is theirs to keep — not a disposable one-shot generator.

### The Gap Rule (locked)

```text
Missing information (internal, never shown as a state)
        ↓
Would a wrong assumption materially change the result?
        │
   NO ──┴── YES
    ↓        ↓
 Infer it   Ask the user — one at a time,
    ↓       re-evaluate after every answer
 mark as        ↓
 inferred   max 3 questions
                ↓
          infer the remainder,
          mark as inferred
```

Reference cases:

- *"landing page for a bookkeeping app"* → professional tone, responsive layout, common SaaS sections are all safe inferences. **No questions.**
- *"prepare me for my football trial"* with no idea what to actually produce (training plan? nutrition? tactics? schedule?) → that choice changes everything downstream. **Ask.**

## Inspiration & Identity

- **Cursor IDE** — named by the learner as the thing that made them think *"I'd love to make something like that."* Reference: https://cursor.com
- **Calm writing surface, not an AI product.** Explicitly rejected: purple-blue gradients, glowing neural-network imagery, five floating cards, *"Supercharge your productivity with AI."*
- Lots of whitespace, strong typography, **one primary surface**. The user's thought is dominant at the start; the interpretation takes over next; the finished prompt takes over last. *The interface changes state as the thought becomes concrete.*
- Underlying progression is **Think → Shape → Prompt** — not shown as a stepper, but felt in the UI.
- **Speed is a design property.** One strong structured generation request returning a JSON understanding + prompt draft. No multi-agent architecture — *"if Mini takes thirty seconds because it runs six agents, the magic disappears."*
- Subtle, imperfect example thoughts (*"Try: I need help planning…"*), never a template gallery.
- Posture: **"Messy is fine."**

## Why This Matters to the Learner

Their stated learning goal: *"properly understand / master prompt engineering in order to get tasks done efficiently without much revisions or hitting back and forth when working."*

Building a tool whose entire job is structuring intent is the most direct route to that. They also build with agents all day (Codex, Claude Code, Cursor, Antigravity) and know the cost of a vague instruction firsthand — they've written `AGENTS.md` briefs in 47 files because they've felt this pain.

And they chose **"for other people"** as the hackathon goal: they want strangers to use it, not just themselves.

## What "Working" Looks Like

**The demo beat (their words, confirmed):**

1. Type: *"I want an app for tracking stuff I lend people because I always forget who has what."*
2. Mini shows its interpretation — Goal: design a lightweight personal lending tracker. Users: individuals lending everyday items to friends/family. Core behavior: record item, borrower, date, **optional** return date. Priority: extremely fast entry. Avoid: inventory-management complexity.
3. The user edits **"optional return date" → "must have expected return date."**
4. **The final prompt visibly updates.**
5. Copy it — it's a genuinely good coding-agent prompt.

That sequence — **thought → understanding → correction → usable prompt** — is the whole video. No accounts, no settings, no provider selection.

The "oh, that's cool" beat: watching *"make me a portfolio"* sharpen into a real, specific, usable prompt, and realizing the tool caught something you hadn't said out loud.

Finished state: running on **Vercel** with a live URL, public repo containing `scope.md`, `prd.md`, and `spec.md`, and a 1–3 minute screen recording of that loop end to end.

## The POC Boundary

In, tightly:

- One screen, three states: **thought → interpretation → prompt**.
- One AI call per step: structured generation returning JSON understanding + prompt draft; gated follow-up questions that regenerate.
- Editable interpretation pieces with **known / inferred** provenance marking (gaps resolve before display — see the Gap Rule).
- One primary action button: **Build prompt**.
- Follow-up questions: **one at a time, max 3 per dock**, re-evaluated after each answer.
- Full-height prompt editor with **copy**.
- **Recent docks** in browser local storage: last 10, newest first, saved only on successful generation, restores editable, auto-titled from Goal, deletable. No accounts, no sync.
- Deployed to Vercel.
- Planning docs in the repo.

## Later

Worth doing, not now:

- Regenerating the same understanding for a different target (*"Make this for ChatGPT / a coding agent / an image model / shorter / as a system instruction"*) — they already see the architecture supports it: *"the generated prompt is just one representation of that object."*
- Voice capture of a thought.
- Accounts + cross-device sync of docks.
- Prompt version history / restore / compare.
- Structure-strength control (how structured the output prompt is).
- Running the prompt against a provider from inside Mini.
- Template/example library, tags, search.
- The full Prompt Dock product: sharing, public links, referrals, usage rewards, teams.

## Explicitly Cut

- **Accounts, auth, email verification, sessions** — history is local only. Reason: the demo must open straight into the input; auth is a whole second product.
- **Public sharing / prompt links / referrals / invite rewards** — social growth mechanics. Reason: nothing about the kernel needs another person to see it.
- **Provider selection and BYOK settings** — one backend AI path. Reason: settings are not the argument; the argument is *thought → understanding → prompt*.
- **Template galleries and category browsing** — replaced by a few imperfect example thoughts. Reason: a gallery teaches the user to shop instead of think.
- **Multi-agent / multi-step generation pipeline** — one structured request (+ gated follow-ups). Reason: latency kills the magic, and the architecture doesn't need it.
- **"Run prompt" / in-app chat with the result** — reason: it pulls the demo toward a chatbot, which is the opposite of the point.
- **Onboarding tour and marketing copy** — the app opens on the input. Reason: *"No 'Welcome to Prompt Dock Mini, your AI-powered prompt optimization companion.'"*
- **Library management in Recent docks** — renaming, folders, tags, search, pinning. Reason: ten rows with a delete button is the whole feature; anything more is the Prompt Dock product sneaking back in.
- **A "missing" chip as a visible state** — gaps resolve to inferred or question before the user sees them. Reason: three provenance states is a questionnaire with extra steps; two is a product.
