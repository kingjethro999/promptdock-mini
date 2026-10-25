"use client";

import { useState } from "react";
import { MessageSquarePlus, Trash2 } from "lucide-react";
import { ChatSession } from "../lib/prompt-store";
import { relativeTime } from "../lib/relative-time";

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onNewChat: () => void;
  onDelete: (sessionId: string) => void;
}

export function ChatSidebar({
  sessions,
  activeSessionId,
  onSelect,
  onNewChat,
  onDelete,
}: ChatSidebarProps) {
  // Destructive actions get one confirmation step (addendum §4).
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div
      data-testid="chat-sidebar"
      className="flex h-full min-h-0 w-64 flex-col gap-3 border-r border-line bg-bg px-3 py-4"
    >
      <button
        type="button"
        onClick={onNewChat}
        data-testid="new-chat"
        className="flex items-center gap-2 rounded-xl border border-green px-3 py-2.5 text-left text-sm font-semibold text-fg transition-colors hover:bg-panel"
      >
        <MessageSquarePlus aria-hidden className="size-4 shrink-0 text-green" />
        New chat
      </button>

      <p
        className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted"
        id="chat-history-label"
      >
        Chats
      </p>

      <nav
        aria-labelledby="chat-history-label"
        data-testid="history-list"
        className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain"
      >
        {sessions.length === 0 && (
          <p className="px-1 py-2 text-xs leading-relaxed text-muted">
            Nothing here yet. Your chats are saved on this device as you go.
          </p>
        )}

        {sessions.map((session) => {
          const active = session.id === activeSessionId;
          const confirming = confirmId === session.id;
          return (
            <div
              key={session.id}
              data-testid="history-row"
              onMouseLeave={() => setConfirmId(null)}
              className={`group relative rounded-xl border transition-colors ${
                active
                  ? "border-green bg-panel"
                  : "border-transparent hover:border-line hover:bg-panel"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setConfirmId(null);
                  onSelect(session.id);
                }}
                aria-current={active ? "page" : undefined}
                className="w-full px-3 py-2 pr-8 text-left"
              >
                <span className="block truncate text-sm font-semibold text-fg">
                  {session.title}
                </span>
                <span className="mt-0.5 block font-mono text-[11px] text-muted">
                  {relativeTime(session.updatedAt)}
                  {session.groupId === null && " · in progress"}
                </span>
              </button>

              {confirming ? (
                <button
                  type="button"
                  data-testid="confirm-delete"
                  onClick={() => {
                    setConfirmId(null);
                    onDelete(session.id);
                  }}
                  className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-lg border border-red-400 px-2 py-1 text-[11px] font-semibold text-red-400 transition-colors hover:bg-red-400/10"
                >
                  <Trash2 aria-hidden className="size-3" />
                  Delete?
                </button>
              ) : (
                <button
                  type="button"
                  aria-label={`Delete chat “${session.title}”`}
                  title="Delete chat"
                  data-testid="delete-chat"
                  onClick={() => setConfirmId(session.id)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <Trash2 aria-hidden className="size-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
