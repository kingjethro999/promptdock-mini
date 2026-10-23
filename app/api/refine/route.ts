import { complete } from "../../../lib/ai";
import { MIN_THOUGHT_CHARS } from "../../../lib/types";
import {
  REFINE_SYSTEM_PROMPT,
  buildRefineUserMessage,
} from "../../../lib/prompts/refine";
import { guardPromptBody } from "../../../lib/validate-prompt";

const MAX_PROMPT_LENGTH = 20_000;
const MAX_CHANGE_REQUEST_LENGTH = 2_000;

function invalidBody(detail: string): Response {
  return Response.json({ error: "invalid_body", detail }, { status: 400 });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidBody("request is not JSON");
  }
  if (typeof body !== "object" || body === null) {
    return invalidBody("body is not an object");
  }
  const input = body as Record<string, unknown>;

  const goal = typeof input.goal === "string" ? input.goal.trim() : "";
  const currentPrompt =
    typeof input.prompt === "string" ? input.prompt.trim() : "";
  const changeRequest =
    typeof input.changeRequest === "string" ? input.changeRequest.trim() : "";

  if (currentPrompt.length === 0 || currentPrompt.length > MAX_PROMPT_LENGTH) {
    return invalidBody("prompt missing or out of range");
  }
  if (
    changeRequest.replace(/\s/g, "").length < MIN_THOUGHT_CHARS ||
    changeRequest.length > MAX_CHANGE_REQUEST_LENGTH
  ) {
    return invalidBody("changeRequest missing or out of range");
  }

  let fields: { label: string; value: string; provenance: string }[] = [];
  const interp = input.interpretation;
  if (
    typeof interp === "object" &&
    interp !== null &&
    Array.isArray((interp as { fields?: unknown }).fields)
  ) {
    fields = ((interp as { fields: unknown[] }).fields)
      .filter((f): f is { label: string; value: string; provenance: string } => {
        if (typeof f !== "object" || f === null) return false;
        const c = f as Record<string, unknown>;
        return typeof c.label === "string" && typeof c.value === "string";
      })
      .map((f) => ({
        label: f.label,
        value: f.value,
        provenance: f.provenance ?? "known",
      }))
      .slice(0, 40);
  }

  const user = buildRefineUserMessage({ goal, currentPrompt, fields, changeRequest });

  let prompt: string;
  try {
    const result = await complete(REFINE_SYSTEM_PROMPT, user);
    prompt = result.text.trim();
  } catch {
    return Response.json({ error: "ai_unavailable" }, { status: 502 });
  }
  if (!guardPromptBody(prompt).ok) {
    return Response.json({ error: "ai_unavailable" }, { status: 502 });
  }
  return Response.json({ prompt });
}
