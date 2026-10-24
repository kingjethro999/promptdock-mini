"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { setTheme } from "../lib/dock-storage";
import { Theme } from "../lib/types";

function subscribe(onStoreChange: () => void): () => void {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className="flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1.5 text-sm text-fg transition-colors hover:border-green"
    >
      {theme === "dark" ? (
        <>
          <Moon aria-hidden className="size-3.5" />
          dark
        </>
      ) : (
        <>
          <Sun aria-hidden className="size-3.5" />
          light
        </>
      )}
    </button>
  );
}
