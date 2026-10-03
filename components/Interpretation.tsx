"use client";

import { useState } from "react";
import { Field } from "../lib/types";

interface InterpretationProps {
  fields: Field[];
  onChange: (fields: Field[]) => void;
  disabled?: boolean;
}

export function Interpretation({ fields, onChange, disabled = false }: InterpretationProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function startEdit(field: Field) {
    if (disabled) return;
    setEditingId(field.id);
    setDraft(field.value);
  }

  function commit() {
    if (editingId === null) return;
    const value = draft.trim();
    const original = fields.find((f) => f.id === editingId);
    setEditingId(null);
    if (!value || !original || value === original.value) return;
    onChange(
      fields.map((f) =>
        f.id === editingId ? { ...f, value, provenance: "known" as const } : f,
      ),
    );
  }

  function cancel() {
    setEditingId(null);
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {fields.map((field) => {
        const inferred = field.provenance === "inferred";
        if (editingId === field.id) {
          return (
            <li key={field.id}>
              <input
                autoFocus
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commit}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commit();
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    cancel();
                  }
                }}
                className="min-w-40 rounded-xl border border-green bg-panel px-3 py-2 text-sm text-fg focus:outline-none"
              />
            </li>
          );
        }
        return (
          <li key={field.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => startEdit(field)}
              title={inferred ? "Inferred from your thought" : undefined}
              className={`flex max-w-full flex-col items-start gap-0.5 rounded-xl border border-line bg-panel px-3 py-2 text-left transition-colors hover:border-green disabled:cursor-default ${
                inferred ? "border-b-2 border-dotted border-b-muted" : ""
              }`}
            >
              <span className="font-mono text-[10px] font-semibold tracking-widest text-muted uppercase">
                {field.label}
                {inferred && (
                  <span className="ml-1 text-green" aria-hidden>
                    ✦
                  </span>
                )}
              </span>
              <span
                className={`text-sm text-fg ${inferred ? "underline decoration-muted decoration-dotted underline-offset-4" : ""}`}
              >
                {field.value}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
