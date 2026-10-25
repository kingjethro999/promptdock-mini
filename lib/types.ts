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

export type AttachmentKind = "image" | "text";

export interface Attachment {
  id: string;
  kind: AttachmentKind;
  name: string;
  type: string; // mime type
  size: number;
  dataUrl: string; // base64 data URL
}

export const MIN_THOUGHT_CHARS = 3;
export const MAX_QUESTIONS = 3;
export const MAX_DOCKS = 10;
export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024; // 4 MiB per file
export const STORAGE_KEYS = {
  docks: "pmd.docks",
  theme: "pmd.theme",
} as const;

export type Theme = "light" | "dark";

export function isUsableThought(thought: string): boolean {
  return thought.replace(/\s/g, "").length >= MIN_THOUGHT_CHARS;
}
