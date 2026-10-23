# Prompt Dock Mini

Turn a rough, half-formed thought into a usable AI prompt. Type what you're trying to get done; the app shows its understanding back to you as editable chips, asks at most three follow-up questions when a wrong guess would matter, and compiles a final prompt you can edit and copy.

Built as a proof of concept for the Devpost Learn hackathon. A focused workspace plus a local prompt library (`/library`), no accounts — everything except AI calls happens in your browser. It's a PWA: the library and your saved prompts keep working offline; only generation needs a connection.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5**
- **Tailwind CSS 4**
- AI providers behind a server-side fallback chain (defaults: APMIX → Groq → Gemini)
- `tsx` for test scripts (see `scripts/`)

## Getting started

```bash
npm install
npm run dev
```

Open the URL shown in the terminal. If port 3000 is already occupied, Next.js automatically uses the next available port (3001, 3002, …) and prints it — use whichever URL it reports.

Other scripts:

```bash
npm run build   # production build
npm run lint    # eslint
npx tsc --noEmit
```

## Environment variables

Create a `.env` in the repo root (never commit it — `.env` is gitignored). At least one provider key is required for the app to do anything; the chain falls back in order when a provider fails.

See `.env.example` for a fillable template.

| Variable                                      | Required         | Default             | Purpose                           |
| --------------------------------------------- | ---------------- | ------------------- | --------------------------------- |
| `APMIX_API_KEY`                               | one of the three | —                   | APMIX provider key                |
| `GROQ_API_KEY`                                | one of the three | —                   | Groq provider key                 |
| `GEMINI_API_KEY`                              | one of the three | —                   | Google Gemini provider key        |
| `AI_PROVIDER_ORDER`                           | no               | `apmix,groq,gemini` | Fallback order, comma-separated   |
| `AI_MAX_FALLBACKS`                            | no               | `2`                 | Max provider attempts per request |
| `AI_REQUEST_TIMEOUT_MS`                       | no               | `12000`             | Per-provider timeout              |
| `APMIX_BASE_URL`                              | no               | APMIX default       | Override APMIX endpoint           |
| `APMIX_MODEL` / `GROQ_MODEL` / `GEMINI_MODEL` | no               | built-in defaults   | Override per-provider model       |

Provider credentials are read on the server only (`lib/ai.ts`, API routes) — they never reach the browser.

## How it works

```
rough thought → /api/shape → editable chips + ≤1 follow-up question
             → /api/build  → final prompt (saved as v1 in your library)
             → /api/refine → revised prompt (appended as v2, v3, …)
```

- **`lib/prompts/shape.ts`** — prompt contract: structured interpretation (chips) + optional question
- **`lib/prompts/build.ts`** — prompt contract: final prose prompt
- **`lib/prompts/refine.ts`** — prompt contract: apply a change request to the current prompt
- **`lib/ai.ts`** — provider chain with JSON extraction and fallback
- **`lib/validate-prompt.ts`** — prompt-only guard on the build and refine routes (no conversational wrappers)
- **`app/page.tsx`** — workspace state machine/orchestration; **`app/library/page.tsx`** — the versioned library (search, sort, favorites, rename, delete)
- **`lib/prompt-store.ts`** — IndexedDB versioned library: prompt groups with immutable versions, one-time migration of the legacy `pmd.docks` (kept as a recovery backup), no eviction cap
- **`public/sw.js` + `app/manifest.ts`** — service worker and web manifest; AI routes stay network-only

## Planning documents

The full planning trail lives in [`devpost/`](devpost/):

- [`scope.md`](devpost/scope.md) — what's in and out of the proof of concept
- [`prd.md`](devpost/prd.md) — product requirements and locked decisions
- [`spec.md`](devpost/spec.md) — technical design
- [`checklist.md`](devpost/checklist.md) — build slices and verification evidence
- [`app-map.html`](devpost/app-map.html) — code tour of the finished app (open in a browser)

## Tests

```bash
# prompt store acceptance tests (no API key needed; 22 assertions)
npx tsx scripts/prompt-store-smoke.ts

# legacy storage + live AI route probes (need at least one provider key)
npx tsx --env-file-if-exists=.env scripts/storage-smoke.ts
npx tsx --env-file-if-exists=.env scripts/test-docks.ts
npx tsx --env-file-if-exists=.env scripts/test-shape.ts
npx tsx --env-file-if-exists=.env scripts/test-build.ts
npx tsx --env-file-if-exists=.env scripts/test-question-loop.ts
npx tsx --env-file-if-exists=.env scripts/test-build-route.ts
```

## Data & privacy

No backend storage, no accounts. Your prompt library lives in your browser's IndexedDB; your theme choice in `localStorage` (`pmd.theme`). The legacy `pmd.docks` records were migrated once into the library and **kept untouched as a recovery backup** — nothing is ever deleted for you. Neither store ever leaves the machine. Thoughts, interpretations, answers, and change requests are sent to the configured AI provider to generate results; provider keys stay server-side and never reach the browser. Offline, the library and saved prompts keep working from the service-worker cache — generation is simply disabled until you're back online.
