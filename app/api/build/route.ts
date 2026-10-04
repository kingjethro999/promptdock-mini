import { complete } from "../../../lib/ai";
import { MIN_THOUGHT_CHARS } from "../../../lib/types";
import { BUILD_SYSTEM_PROMPT, buildBuildUserMessage } from "../../../lib/prompts/build";

const MAX_THOUGHT_LENGTH = 6000;

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

  const thought = typeof input.thought === "string" ? input.thought.trim() : "";
  if (thought.replace(/\s/g, "").length < MIN_THOUGHT_CHARS || thought.length > MAX_THOUGHT_LENGTH) {
    return invalidBody("thought missing or out of range");
  }

  const answers: string[] = Array.isArray(input.answers)
    ? input.answers
        .filter((a): a is string => typeof a === "string")
        .map((a) => a.trim())
        .filter((a) => a.length > 0)
        .slice(0, 5)
    : [];

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
      .map((f) => ({ label: f.label, value: f.value, provenance: f.provenance ?? "known" }))
      .slice(0, 40);
  }
  if (fields.length === 0 && answers.length === 0) {
    return invalidBody("nothing to build from");
  }

  const user = buildBuildUserMessage({ thought, fields, answers });

  let prompt: string;
  try {
    const result = await complete(BUILD_SYSTEM_PROMPT, user);
    prompt = result.text.trim();
  } catch {
    return Response.json({ error: "ai_unavailable" }, { status: 502 });
  }
  if (prompt.length === 0) {
    return Response.json({ error: "ai_unavailable" }, { status: 502 });
  }
  return Response.json({ prompt });
}
