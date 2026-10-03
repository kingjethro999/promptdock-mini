export type Provenance = "known" | "inferred";

export interface Field {
  id: string;
  label: string;
  value: string;
  provenance: Provenance;
}

export interface Interpretation {
  fields: Field[];
}

export interface ShapeResponse {
  interpretation: Interpretation;
  needsFollowUp: boolean;
  question: string | null;
}

export interface BuildResponse {
  prompt: string;
}

export interface Dock {
  id: string;
  title: string;
  thought: string;
  fields: Field[];
  answers: string[];
  questionCount: number;
  prompt: string;
  promptEditedManually: boolean;
  createdAt: number;
  updatedAt: number;
}

export const MIN_THOUGHT_CHARS = 3;
export const MAX_QUESTIONS = 3;
export const MAX_DOCKS = 10;
export const STORAGE_KEYS = {
  docks: "pmd.docks",
  theme: "pmd.theme",
} as const;

export type Theme = "light" | "dark";

export function isUsableThought(thought: string): boolean {
  return thought.replace(/\s/g, "").length >= MIN_THOUGHT_CHARS;
}
