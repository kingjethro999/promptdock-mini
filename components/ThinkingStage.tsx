"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

/**
 * Honest thinking-stage indicator for non-streaming AI calls.
 *
 * Animated dots + a stage label. We never fake streaming tokens — the
 * APIs are non-streaming, so we show which stage is in flight and let
 * the dots breathe while we wait.
 */
type ThinkingStageName = "shaping" | "drafting" | "refreshing" | "refining";

interface ThinkingStageProps {
  stage: ThinkingStageName | null;
  className?: string;
}

const LABELS: Record<ThinkingStageName, string> = {
  shaping: "Shaping your thought",
  drafting: "Drafting your prompt",
  refreshing: "Refreshing your prompt",
  refining: "Applying your changes",
};

export function ThinkingStage({ stage, className }: ThinkingStageProps) {
  const [dots, setDots] = useState("");
  useEffect(() => {
    let n = 0;
    const timer = setInterval(() => {
      n = (n + 1) % 4;
      setDots(".".repeat(n));
    }, 350);
    return () => clearInterval(timer);
  }, []);

  if (!stage) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="thinking-stage"
      className={`flex items-center gap-2 text-sm text-muted ${className ?? ""}`}
    >
      <Sparkles aria-hidden className="size-3 animate-pulse text-green" />
      <span className="font-medium">{LABELS[stage]}{dots}</span>
    </div>
  );
}
