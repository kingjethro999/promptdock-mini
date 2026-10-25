"use client";

import { useState } from "react";
import { Check, Copy, Star, X } from "lucide-react";
import { FavoriteCard } from "../lib/prompt-store";
import { relativeTime } from "../lib/relative-time";

interface SavedPromptsRailProps {
  favorites: FavoriteCard[];
  onOpen: (groupId: string) => void;
  onUnfavorite: (versionId: string) => void;
  onClose: () => void;
}

export function SavedPromptsRail({
  favorites,
  onOpen,
  onUnfavorite,
  onClose,
}: SavedPromptsRailProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleCopy(card: FavoriteCard) {
    try {
      await navigator.clipboard.writeText(card.body);
    } catch {
      // Clipboard blocked — fall back to selecting the text manually.
      return;
    }
    setCopiedId(card.versionId);
    window.setTimeout(() => setCopiedId((id) => (id === card.versionId ? null : id)), 1600);
  }

  return (
    <div
      data-testid="saved-rail"
      className="flex h-full min-h-0 w-72 flex-col gap-3 border-l border-line bg-bg px-3 py-4"
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <p
          id="saved-prompts-label"
          className="text-[11px] font-semibold uppercase tracking-wider text-muted"
        >
          Saved prompts
        </p>
        <button
          type="button"
          onClick={onClose}
          data-testid="close-rail"
          aria-label="Close saved prompts"
          title="Close"
          className="rounded-lg p-1 text-muted transition-colors hover:text-fg"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain">
        {favorites.length === 0 && (
          <p className="px-1 text-xs leading-relaxed text-muted">
            Star a prompt and it lands here for one-click copying.
          </p>
        )}

        {favorites.map((card) => (
          <div
            key={card.versionId}
            className="group flex flex-col gap-2 rounded-xl border border-line bg-panel px-3 py-2.5"
          >
            <button
              type="button"
              onClick={() => onOpen(card.groupId)}
              className="text-left"
            >
              <span className="block truncate text-sm font-semibold text-fg transition-colors hover:text-green">
                {card.title}
              </span>
              <span className="mt-0.5 block font-mono text-[11px] text-muted">
                {relativeTime(card.createdAt)}
              </span>
            </button>

            <p className="line-clamp-3 text-xs leading-relaxed text-muted">
              {card.body.slice(0, 140)}
              {card.body.length > 140 ? "…" : ""}
            </p>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => void handleCopy(card)}
                aria-label={`Copy “${card.title}”`}
                title="Copy prompt"
                className="flex items-center gap-1.5 rounded-lg border border-line px-2 py-1 text-[11px] font-semibold text-muted transition-colors hover:border-green hover:text-fg"
              >
                {copiedId === card.versionId ? (
                  <>
                    <Check aria-hidden className="size-3 text-green" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy aria-hidden className="size-3" />
                    Copy
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => onUnfavorite(card.versionId)}
                aria-label={`Remove “${card.title}” from saved prompts`}
                title="Remove from saved"
                className="rounded-lg p-1.5 text-green transition-colors hover:text-fg"
              >
                <Star aria-hidden className="size-3.5 fill-current" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
