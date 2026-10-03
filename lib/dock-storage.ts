import { Dock, MAX_DOCKS, STORAGE_KEYS, Theme } from "./types";

function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadDocks(): Dock[] {
  try {
    const s = storage();
    if (!s) return [];
    const raw = s.getItem(STORAGE_KEYS.docks);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isDock);
  } catch {
    return [];
  }
}

export function saveDock(dock: Dock): boolean {
  try {
    const s = storage();
    if (!s) return false;
    const docks = loadDocks().filter((d) => d.id !== dock.id);
    const next = [dock, ...docks]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_DOCKS);
    s.setItem(STORAGE_KEYS.docks, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

export function deleteDock(id: string): boolean {
  try {
    const s = storage();
    if (!s) return false;
    const next = loadDocks().filter((d) => d.id !== id);
    s.setItem(STORAGE_KEYS.docks, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

export function loadTheme(): Theme {
  try {
    const s = storage();
    const raw = s?.getItem(STORAGE_KEYS.theme);
    return raw === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function setTheme(theme: Theme): boolean {
  try {
    const s = storage();
    if (!s) return false;
    s.setItem(STORAGE_KEYS.theme, theme);
    return true;
  } catch {
    return false;
  }
}

function isDock(value: unknown): value is Dock {
  if (typeof value !== "object" || value === null) return false;
  const d = value as Partial<Dock>;
  return (
    typeof d.id === "string" &&
    typeof d.title === "string" &&
    typeof d.thought === "string" &&
    Array.isArray(d.fields) &&
    Array.isArray(d.answers) &&
    typeof d.prompt === "string"
  );
}
