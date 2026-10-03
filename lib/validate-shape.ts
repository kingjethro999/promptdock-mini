import { extractJson } from "./ai";
import { Field, ShapeResponse } from "./types";

const PLACEHOLDER = /\b(missing|unknown|tbd|n\/a)\b/i;

export type ShapeParseResult =
  | { ok: true; value: ShapeResponse }
  | { ok: false; reason: string };

export function parseShapeResponse(text: string): ShapeParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(text));
  } catch {
    return { ok: false, reason: "not parseable JSON" };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, reason: "top level is not an object" };
  }
  const obj = parsed as Record<string, unknown>;

  if (Array.isArray(obj.questions)) {
    return { ok: false, reason: "emitted a questions[] array" };
  }
  if (!Array.isArray(obj.fields)) {
    return { ok: false, reason: "fields missing" };
  }

  const fields: Field[] = [];
  for (let i = 0; i < obj.fields.length; i += 1) {
    const raw = obj.fields[i];
    if (typeof raw !== "object" || raw === null) {
      return { ok: false, reason: `field ${i} is not an object` };
    }
    const f = raw as Partial<Field>;
    if (typeof f.id !== "string" || f.id.trim() === "") {
      return { ok: false, reason: `field ${i} has no id` };
    }
    if (typeof f.label !== "string" || f.label.trim() === "") {
      return { ok: false, reason: `field ${i} has no label` };
    }
    if (typeof f.value !== "string" || f.value.trim() === "") {
      return { ok: false, reason: `field ${i} has an empty value` };
    }
    if (f.provenance !== "known" && f.provenance !== "inferred") {
      return { ok: false, reason: `field ${i} has bad provenance "${String(f.provenance)}"` };
    }
    const haystack = `${f.id} ${f.label} ${f.value}`;
    if (PLACEHOLDER.test(haystack)) {
      return { ok: false, reason: `field ${i} carries placeholder state: "${haystack.slice(0, 80)}"` };
    }
    fields.push({ id: f.id, label: f.label, value: f.value, provenance: f.provenance });
  }

  if (typeof obj.needsFollowUp !== "boolean") {
    return { ok: false, reason: "needsFollowUp is not a boolean" };
  }
  if (fields.length === 0 && !obj.needsFollowUp) {
    return { ok: false, reason: "empty interpretation with no question to ask" };
  }
  const question = obj.question;
  if (obj.needsFollowUp) {
    if (typeof question !== "string" || question.trim() === "") {
      return { ok: false, reason: "needsFollowUp true without a question" };
    }
    const marks = (question.match(/\?/g) ?? []).length;
    if (marks !== 1) {
      return { ok: false, reason: `question contains ${marks} question marks` };
    }
    return {
      ok: true,
      value: { interpretation: { fields }, needsFollowUp: true, question },
    };
  }
  if (question !== null && question !== undefined && question !== "") {
    return { ok: false, reason: "question present while needsFollowUp is false" };
  }
  return {
    ok: true,
    value: { interpretation: { fields }, needsFollowUp: false, question: null },
  };
}
