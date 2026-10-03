import { MAX_QUESTIONS, ShapeResponse } from "../lib/types";

const BASE = process.env.PMD_BASE_URL ?? "http://localhost:3001";
const THOUGHT = "prepare me for my football trial";

let failures = 0;
function fail(message: string): void {
  failures += 1;
  console.error(`  FAIL ${message}`);
}

function parseRouteShape(text: string): ShapeResponse | null {
  let value: ShapeResponse;
  try {
    value = JSON.parse(text) as ShapeResponse;
  } catch {
    fail(`route response is not JSON — raw: ${text.slice(0, 200)}`);
    return null;
  }
  if (
    typeof value !== "object" ||
    value === null ||
    !value.interpretation ||
    !Array.isArray(value.interpretation.fields) ||
    typeof value.needsFollowUp !== "boolean"
  ) {
    fail(`route response missing structure — raw: ${text.slice(0, 300)}`);
    return null;
  }
  if (value.needsFollowUp && (typeof value.question !== "string" || value.question.trim() === "")) {
    fail("route returned needsFollowUp without a question");
  }
  if (!value.needsFollowUp && value.question) {
    fail("route returned a question with needsFollowUp false");
  }
  return value;
}

async function shapeRound(
  payload: Record<string, unknown>,
): Promise<{ asks: boolean; question: string | null } | null> {
  const res = await fetch(`${BASE}/api/shape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    fail(`round returned HTTP ${res.status}`);
    return null;
  }
  const text = await res.text();
  const value = parseRouteShape(text);
  if (!value) return null;
  const questionCount = Number(payload.questionCount ?? 0);
  console.log(
    `round ${questionCount + 1}: fields=${value.interpretation.fields.length} needsFollowUp=${value.needsFollowUp}` +
      (value.question ? ` q="${value.question}"` : ""),
  );
  if (value.needsFollowUp && questionCount >= MAX_QUESTIONS) {
    fail(`question returned at ceiling (questionCount=${questionCount})`);
  }
  return { asks: value.needsFollowUp, question: value.question };
}

async function main(): Promise<void> {
  console.log(`four-round sequence against ${BASE}/api/shape — "${THOUGHT}"`);
  const answers: string[] = [];
  let asked = 0;
  let requests = 0;
  let lastQuestion: string | null = null;

  const first = await shapeRound({
    thought: THOUGHT,
    answers: [],
    questionCount: 0,
    lastQuestion: null,
  });
  requests += 1;
  if (first?.asks) asked = 1;
  if (first) lastQuestion = first.question;

  while (asked > 0 && asked < MAX_QUESTIONS && requests < MAX_QUESTIONS + 1) {
    answers.push(
      answers.length === 0
        ? "Two weeks to prepare, I play as a winger, trial is with a semi-pro club."
        : answers.length === 1
          ? "I can train most evenings after work."
          : "Mostly fitness and finishing, I already touch well.",
    );
    const next = await shapeRound({
      thought: THOUGHT,
      interpretation: undefined,
      answers,
      questionCount: asked,
      lastQuestion,
    });
    requests += 1;
    if (!next) break;
    asked = next.asks ? asked + 1 : 0;
    if (next.asks) lastQuestion = next.question;
  }

  console.log(`requests=${requests} questions asked=${asked}`);
  if (asked > MAX_QUESTIONS) fail(`asked ${asked} questions (ceiling ${MAX_QUESTIONS})`);
  if (requests > MAX_QUESTIONS + 1) fail(`made ${requests} requests (max ${MAX_QUESTIONS + 1})`);
  if (answers.length > 0 && asked > 0) {
    fail("stopped with answers un-incorporated while still asking");
  }

  // Direct ceiling probe: at questionCount=3 the server must never ask again.
  const ceiling = await shapeRound({
    thought: THOUGHT,
    interpretation: undefined,
    answers: ["Two weeks", "Weeknights", "Fitness"],
    questionCount: MAX_QUESTIONS,
    lastQuestion: null,
  });
  if (ceiling?.asks) fail("ceiling probe: server asked a question at questionCount=3");

  if (failures > 0) {
    console.error(`${failures} failure(s)`);
    process.exit(1);
  }
  console.log("question loop holds the Gap Rule");
}

void main();
