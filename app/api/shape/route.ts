import { completeParsed } from "../../../lib/ai";
import { MAX_QUESTIONS, MIN_THOUGHT_CHARS, ShapeResponse } from "../../../lib/types";
import { SHAPE_SYSTEM_PROMPT, buildShapeUserMessage } from "../../../lib/prompts/shape";
import { parseShapeResponse } from "../../../lib/validate-shape";

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
        .slice(0, MAX_QUESTIONS)
    : [];

  const questionCount =
    typeof input.questionCount === "number" && Number.isInteger(input.questionCount)
      ? Math.min(Math.max(input.questionCount, 0), MAX_QUESTIONS)
      : answers.length;

  const lastQuestion = typeof input.lastQuestion === "string" ? input.lastQuestion : null;

  let previousFields: { label: string; value: string; provenance: string }[] = [];
  const interp = input.interpretation;
  if (
    typeof interp === "object" &&
    interp !== null &&
    Array.isArray((interp as { fields?: unknown }).fields)
  ) {
    previousFields = ((interp as { fields: unknown[] }).fields)
      .filter((f): f is { label: string; value: string; provenance: string } => {
        if (typeof f !== "object" || f === null) return false;
        const c = f as Record<string, unknown>;
        return typeof c.label === "string" && typeof c.value === "string" && typeof c.provenance === "string";
      })
      .slice(0, 40);
  }

  const user = buildShapeUserMessage({ thought, answers, questionCount, previousFields, lastQuestion });

  let chain;
  try {
    chain = await completeParsed(SHAPE_SYSTEM_PROMPT, user, {
      json: true,
      parse: (text) => {
        const parsed = parseShapeResponse(text);
        if (!parsed.ok) throw new Error(parsed.reason);
        return parsed.value;
      },
    });
  } catch {
    return Response.json({ error: "ai_unavailable" }, { status: 502 });
  }

  const value: ShapeResponse = chain.value;
  if (questionCount >= MAX_QUESTIONS || answers.length >= MAX_QUESTIONS) {
    return Response.json({
      interpretation: value.interpretation,
      needsFollowUp: false,
      question: null,
    } satisfies ShapeResponse);
  }
  return Response.json(value);
}
