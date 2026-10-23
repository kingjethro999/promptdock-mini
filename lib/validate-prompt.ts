/**
 * Defensive quality guard for prompt-only extraction (addendum §5).
 *
 * The BUILD/REFINE system prompts already demand a bare prompt. This guard
 * rejects outputs that are obviously a conversational wrapper (so the provider
 * chain can fall through to the next model), but it NEVER strips or rewrites
 * text — if validation is uncertain we return ok so the user can inspect and
 * edit the body themselves.
 */

const OPENERS = [
  /^(sure|certainly|of course|absolutely|here you go|here is|here's)\b/i,
  /^(as an ai|i'm an ai|i am an ai)\b/i,
  /^(i hope (this|that)|let me know if you (need|have))\b/i,
  /^of course[!,.]/i,
];

const CLOSERS = [
  /\b(let me know if you (have any|need) (further|more|additional))\b[.!]?$/i,
  /\b(i hope this helps)\b[.!]?$/i,
  /\b(happy to (help|adjust|refine))\b[.!]?$/i,
  /\b(feel free to (ask|let me know))\b[.!]?$/i,
];

export interface PromptGuardResult {
  ok: boolean;
  reason?: string;
}

export function guardPromptBody(raw: string): PromptGuardResult {
  const text = raw.trim();
  if (text.length === 0) return { ok: false, reason: "empty" };

  // A real prompt here is a handful of sentences to a few hundred words.
  // Multi-thousand-word outputs are almost certainly prose/wrapped output.
  if (text.length > 12_000) return { ok: false, reason: "implausibly long" };

  const lines = text.split("\n");
  const firstLine = lines[0]?.trim() ?? "";
  const lastLine = lines[lines.length - 1]?.trim() ?? "";

  // Reject only when BOTH a wrapper opener and wrapper closer are present, or a
  // single-line reply that reads purely as conversation with no directive shape.
  const hasOpener = OPENERS.some((re) => re.test(firstLine));
  const hasCloser = CLOSERS.some((re) => re.test(lastLine));

  if (hasOpener && hasCloser) {
    return { ok: false, reason: "conversational wrapper" };
  }
  if (hasOpener && lines.length <= 3 && !text.includes("\n-") && text.length < 240) {
    return { ok: false, reason: "conversational reply" };
  }

  return { ok: true };
}
