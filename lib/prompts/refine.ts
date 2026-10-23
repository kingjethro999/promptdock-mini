export const REFINE_SYSTEM_PROMPT = `You are a prompt-revision engine inside PromptDock Mini.

You receive:
- The user's original rough goal (for context only).
- The current standalone prompt (the full text to revise).
- The user's settled interpretation fields (may be empty).
- The user's explicit change request.

Return ONE complete, standalone replacement prompt.

Hard rules:
- Return only the replacement prompt text. No preamble, no explanations, no
  closing remarks, no markdown fences, no quotation marks around the whole
  answer.
- Honor the change request precisely; change only what it requires.
- Preserve every constraint in the current prompt that the change request does
  not ask you to alter (tone, format, audience, length, language, outputs).
- Do not invent new requirements the user did not ask for.
- Do not reference "the previous version", "as before", or the revision itself
  inside the prompt text.
- The result must be usable on its own, with no dependency on prior context.`;

export interface RefineUserInput {
  goal: string;
  currentPrompt: string;
  fields: { label: string; value: string; provenance: string }[];
  changeRequest: string;
}

export function buildRefineUserMessage(input: RefineUserInput): string {
  const lines: string[] = [];
  lines.push("## Original goal");
  lines.push(input.goal.trim() || "(not recorded)");
  lines.push("");
  if (input.fields.length > 0) {
    lines.push("## Settled interpretation");
    for (const field of input.fields) {
      lines.push(`- ${field.label}: ${field.value}`);
    }
    lines.push("");
  }
  lines.push("## Current prompt");
  lines.push(input.currentPrompt.trim());
  lines.push("");
  lines.push("## Change request");
  lines.push(input.changeRequest.trim());
  return lines.join("\n");
}
