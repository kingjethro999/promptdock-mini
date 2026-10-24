# Devpost submission draft — Prompt Dock Mini

Hackathon: **Build With AI: Basics** — deadline **Oct 26, 2026, 5:00pm EDT**
Fill in `[VIDEO URL]` after the YouTube upload, then paste each block into the
submission form. Keep it short — reviewers watch the video first.

---

## Project name

```
Prompt Dock Mini
```

## One-line summary (also works as the YouTube title)

```
Turn a rough thought into a precise AI prompt — by fixing the misunderstanding first
```

## Demo video (1–3 min)

```
[VIDEO URL]
```

Beat sheet (addendum §13 — one clean take, ~90–120 s):

1. Open the workspace: compact sticky composer + header (Library / Coming soon).
2. Type an imperfect thought → intent chips; edit one inferred chip → it flips to **known**.
3. Build the prompt → **Saved locally** appears automatically (no Save button) → **Copy**.
4. Refine: _"Add an offline requirement without changing the rest"_ → **v2 vs v1** in the version picker.
5. Favorite a version → open **Library** → search → restore.
6. Share → honest **Coming soon** modal with the roadmap.
7. Install/open the PWA, disable network, reload → saved prompts still readable and copyable; generation labeled unavailable (never faked).
8. Back online → refine again, live.

## Short description (what it does, who it's for, what you learned)

```
**What it does.** Prompt Dock Mini turns a rough, half-formed thought into a precise, usable AI prompt — and it does the important part *before* writing the prompt. First it shows you its interpretation: Goal, Audience, Constraints, Output as small editable chips, each labeled "known" (you said this) or "inferred" (I guessed this). You fix the misunderstanding at the source instead of discovering it after you've already run the prompt somewhere else. When a gap would actually change the result, it asks at most three follow-up questions — never a chat, never a fourth. Then it compiles a prompt you can edit, copy, and keep refining: "shorten this, keep the rest" becomes version 2, sitting next to version 1 in a local, versioned library with search, favorites, rename, and restore. It's also a PWA — install it, go offline, and your whole library stays readable and copyable, while generation honestly shows as unavailable rather than pretending to work offline.

**Who it's for.** People who already use AI every day but keep getting mediocre results because their instructions are vague — and who don't want to study prompt engineering to fix that. "Messy is fine" is the promise: bring the thought exactly as it arrives in your head.

**What I learned.** (1) Prompt storage needs to be centralised. These days creators post long prompts inside videos and tutorials, or bury them in post descriptions and captions — and people have to pause, copy them by hand, or rewrite them entirely. Prompt Dock exists to solve exactly that. (2) Structuring and perfecting your prompting up front is what makes an agent understand you at once; the back-and-forth that wastes time and burns AI credits on revision rounds always starts with a misunderstanding you could have fixed before the first send. (3) The future shape of this is a link: instead of long captions and descriptions eating the character limit on social platforms, a creator can focus on the main video and attach a link to reusable prompts — that is where Prompt Dock is heading in its next expansion.
```

## Built with (tags)

```
Next.js, React, TypeScript, Tailwind CSS, IndexedDB, Progressive Web App, Service Worker, Groq, Google Gemini, OpenAI-compatible API
```

## Repository URL

```
https://github.com/kingjethro999/promptdock-mini
```

---

## Reference — how this maps to the judging criteria (do not paste)

- **Design** — complete, coherent product experience: versioned library + composer
  + refinement + PWA offline behavior + save-status states + Coming soon modal;
  the October upgrade turned the POC into a whole product, not a demo script.
- **Innovation/Idea** — the unique kernel: *the interpretation is the product,
  not the prompt.* Editable known/inferred chips + a three-question gap rule fix
  misunderstanding at the source; refinement keeps it conversational-free.
- **Presentation** — video beats: problem (vague input) → interpretation →
  correction → build → refine v2 → library/offline → back online. Each beat
  maps to a judging question; keep it under 3 minutes.
