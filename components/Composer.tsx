"use client";

import { useEffect, useRef } from "react";
import { Paperclip, X } from "lucide-react";

import type { Attachment } from "../lib/types";

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  mode: "create" | "refine";
  busy: boolean;
  /** Offline disables generation with an explanation, per addendum §7. */
  online: boolean;
  onExpand: () => void;
  /** Currently attached files (controlled). */
  attachments: Attachment[];
  /** Fires when the attachment list changes (add / remove). */
  onAttachmentsChange: (attachments: Attachment[]) => void;
  placeholder?: string;
}

const MAX_ROWS = 14;
const ACCEPT =
  "image/*,.txt,.md,.json,.csv,.ts,.js,.tsx,.jsx,.py,.html,.css,.xml,.log";

function dataUrlFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

function textFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsText(file);
  });
}

export function Composer({
  value,
  onChange,
  onSubmit,
  mode,
  busy,
  online,
  onExpand,
  attachments,
  onAttachmentsChange,
  placeholder,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canSubmit =
    value.replace(/\s/g, "").length > 0 && !busy && online;
  const actionLabel = mode === "create" ? "Shape idea" : "Refine prompt";

  // Autosize: grow to content up to MAX_ROWS, then scroll internally.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight || "20");
    const max = lineHeight * MAX_ROWS;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, [value]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // IME composition must not submit (avoid trapping IME users).
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit) onSubmit();
    }
  }

  /** Add one file as an attachment (image as data URL, text as plain text). */
  async function addFile(file: File): Promise<void> {
    if (attachments.length >= 5) return;
    if (file.size > 4 * 1024 * 1024) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const isImage = file.type.startsWith("image/");
    const dataUrl = isImage
      ? await dataUrlFromFile(file)
      : await textFromFile(file);
    const attachment: Attachment = {
      id,
      kind: isImage ? "image" : "text",
      name: file.name,
      type: file.type,
      size: file.size,
      dataUrl,
    };
    onAttachmentsChange([...attachments, attachment]);
  }

  function handleFiles(files: FileList | File[]): void {
    const list = Array.from(files);
    const next = [...attachments];
    for (const file of list) {
      if (next.length >= 5) break;
      // Avoid duplicate names in the current session.
      if (next.some((a) => a.name === file.name && a.size === file.size)) continue;
      void addFile(file);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    handleFiles(event.dataTransfer?.files);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function handleRemove(id: string) {
    onAttachmentsChange(attachments.filter((a) => a.id !== id));
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.files) handleFiles(event.target.files);
    event.target.value = "";
  }

  return (
    <div
      className="rounded-2xl border border-line bg-panel px-3 py-2 shadow-sm"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Attachment tray: chips with remove. Images show a thumbnail hint. */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1 pb-1.5">
          {attachments.map((att) => (
            <button
              key={att.id}
              type="button"
              onClick={() => handleRemove(att.id)}
              aria-label={`Remove ${att.name}`}
              className="flex items-center gap-1.5 rounded-full border border-line bg-bg px-2.5 py-1 text-xs text-fg transition-colors hover:bg-panel"
            >
              <Paperclip aria-hidden className="size-3 text-muted" />
              <span className="truncate max-w-[140px]">{att.name}</span>
              <X aria-hidden className="size-2.5 text-muted ml-0.5" />
            </button>
          ))}
        </div>
      )}
      <label htmlFor="composer-input" className="sr-only">
        {mode === "create"
          ? "Describe what you are trying to get done"
          : "Describe the change you want in this prompt"}
      </label>
      <textarea
        id="composer-input"
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder={
          placeholder ??
          (mode === "create"
            ? "Describe it however it comes to mind…"
            : "Describe the change… e.g. shorten it, add an offline requirement")
        }
        className="max-h-none w-full resize-none bg-transparent px-2 py-2 text-base text-fg placeholder:text-muted focus:outline-none"
      />
      <div className="flex items-center justify-between gap-3 px-1 pb-1">
        <button
          type="button"
          onClick={onExpand}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:text-fg"
        >
          Expand
        </button>
        <div className="flex items-center gap-3">
          {!online && (
            <span className="text-xs text-muted">
              Generation needs a connection
            </span>
          )}
          <span className="text-xs text-muted">
            Enter to {mode === "create" ? "shape" : "refine"} · Shift+Enter for
            a new line
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={handleFileInputChange}
          />
          <button
            type="button"
            onClick={openFilePicker}
            aria-label="Attach files"
            title="Attach files"
            disabled={busy}
            className="flex items-center gap-1 rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-fg transition-colors disabled:opacity-40 hover:border-green"
          >
            <Paperclip aria-hidden className="size-3" />
            {attachments.length > 0 && (
              <span className="ml-0.5 text-xs">{attachments.length}</span>
            )}
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={onSubmit}
            className="rounded-full bg-green px-5 py-2 text-sm font-semibold text-bg transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Working…" : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
