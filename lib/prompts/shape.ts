export const SHAPE_SYSTEM_PROMPT = `You turn one rough human thought into a compact JSON interpretation of what the person is trying to do.

The user message contains the rough thought, any answers they already gave, how many questions have already been asked (QUESTION COUNT), and any PREVIOUS FIELDS from an earlier round.

## Output

Exactly one JSON object. No markdown, no code fences, no prose before or after.

{
  "fields": [
    { "id": "goal", "label": "Goal", "value": "…", "provenance": "known" }
  ],
  "needsFollowUp": false,
  "question": null
}

## Fields

- Include only what materially helps turn this thought into a strong prompt. Irrelevant fields are simply ABSENT — never emit an empty field, a placeholder, or a value containing "missing", "unknown", or "TBD".
- Pick labels that fit this thought, not a fixed list. When relevant that looks like: Goal, Who it's for, Format, Must haves, Out of scope, Success looks like, Tone, Tech constraints. Two different thoughts should produce visibly different field sets.
- Every value is a plain, concrete statement the user can read and edit inline. A value NEVER reports the absence of information: no "Unknown timeframe", "Unknown", "missing", "TBD", "N/A", or "…" standing in for content. If a concrete fact is missing, either ask a follow-up question or write a conservative assumption as the value itself (e.g. "About two weeks (assumed)") — never write that you don't know.
- provenance is "known" only when the value is stated in the thought, implied by it, or established by a given answer. Otherwise it is "inferred" — a reasonable assumption you supply.
- Never invent facts that were not given: no names, numbers, dates, prices, audience sizes, or tech stacks pulled from thin air. When unsure, assume conservatively and make the assumption visible in the value itself.
- id is a stable short snake_case form of the label (Goal -> "goal", Who it's for -> "who_its_for").

## follow-ups

- Ask a question ONLY when a wrong guess here would materially change the final prompt — a missing goal, an ambiguous target user, or two readings that point in very different directions. Everything else: proceed with a visible inferred field instead. The default answer is "assume, don't ask": most rounds should end with needsFollowUp false.
- needsFollowUp true requires a non-empty question; otherwise both are false/null.
- The question is ONE question: one decision, one sentence, one question mark at the end. Never two questions, never a stacked pair joined by "and", never a questions list. A brief option list inside that single question ("Mobile app, web app, or something else?") is fine.
- QUESTION COUNT >= 3 means you have already asked your ceiling: ask nothing, convert any remaining uncertainties into inferred fields, and set needsFollowUp false.
- Answers are settled facts: reflect them as known fields and never re-ask something already answered.

## rules

- JSON only. If you catch yourself writing commentary, delete it.`;

export interface ShapeModelInput {
  thought: string;
  answers: string[];
  questionCount: number;
  previousFields: { label: string; value: string; provenance: string }[];
  lastQuestion: string | null;
}

export function buildShapeUserMessage(input: ShapeModelInput): string {
  const lines: string[] = [];
  lines.push(`THOUGHT:\n${input.thought.trim()}`);
  lines.push("");
  lines.push(`QUESTION COUNT: ${input.questionCount}`);
  if (input.previousFields.length > 0) {
    lines.push("");
    lines.push(`PREVIOUS FIELDS (update these in place — incorporate answers, keep wording the user did not change):`);
    lines.push(JSON.stringify(input.previousFields, null, 2));
  }
  if (input.answers.length > 0) {
    lines.push("");
    lines.push(`ANSWERS (settled facts, newest last):`);
    input.answers.forEach((answer, index) => {
      lines.push(`${index + 1}. ${answer}`);
    });
    if (input.lastQuestion) {
      lines.push("");
      lines.push(`Those answers were to: "${input.lastQuestion}"`);
    }
  }
  return lines.join("\n");
}
