import { deleteDock, loadDocks, loadTheme, saveDock, setTheme } from "../lib/dock-storage";
import { Dock, MAX_DOCKS, STORAGE_KEYS } from "../lib/types";

class FakeStorage implements Storage {
  private map = new Map<string, string>();
  failWrites = false;
  get length() {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error("QuotaExceededError (simulated)");
    this.map.set(key, value);
  }
}

const fake = new FakeStorage();
(globalThis as Record<string, unknown>).window = { localStorage: fake };

let failures = 0;
function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ok - ${message}`);
  } else {
    failures += 1;
    console.error(`  FAIL - ${message}`);
  }
}

function makeDock(id: string, updatedAt: number): Dock {
  return {
    id,
    title: `Dock ${id}`,
    thought: "track what I lend people",
    fields: [{ id: "goal", label: "Goal", value: "remember returns", provenance: "known" }],
    answers: ["yes"],
    questionCount: 1,
    prompt: "You are a helpful assistant.",
    promptEditedManually: false,
    createdAt: updatedAt,
    updatedAt,
  };
}

assert(loadDocks().length === 0, "empty storage returns []");

const a = makeDock("a", 1000);
assert(saveDock(a) === true, "saveDock succeeds on healthy storage");
assert(loadDocks().length === 1, "dock round-trips");

const b = makeDock("b", 2000);
saveDock(b);
saveDock({ ...a, updatedAt: 3000 });
const docks = loadDocks();
assert(docks.length === 2, "two docks stored");
assert(docks[0].id === "a" && docks[1].id === "b", "newest first");
assert(loadDocks().filter((d) => d.id === "a").length === 1, "re-saving same id upserts, never duplicates");

const many = Array.from({ length: 15 }, (_, i) => makeDock(`x${i}`, 10_000 + i));
many.forEach(saveDock);
assert(loadDocks().length === MAX_DOCKS, `capped at ${MAX_DOCKS}`);
assert(loadDocks()[0].id === "x14", "cap keeps the newest");

assert(deleteDock("x14") === true, "deleteDock succeeds");
assert(!loadDocks().some((d) => d.id === "x14"), "dock removed");
assert(deleteDock("never-existed") === true, "deleting a missing id does not throw");

assert(loadTheme() === "light", "theme defaults to light");
assert(setTheme("dark") === true, "setTheme writes");
assert(loadTheme() === "dark", "theme round-trips");
fake.removeItem(STORAGE_KEYS.theme);
assert(loadTheme() === "light", "missing theme key falls back to light");

fake.failWrites = true;
assert(saveDock(makeDock("z", 99_999)) === false, "failed write is caught and reported");
assert(loadDocks().some((d) => d.id === "x5"), "failed write preserves existing session data");
assert(deleteDock("a") === false, "failed delete is caught");
assert(setTheme("light") === false, "failed theme write is caught");
fake.failWrites = false;

assert(loadDocks()[0].id !== "z", "unpersisted dock does not leak into storage");
assert(loadDocks().some((d) => d.id === "x5"), "pre-failure docks survive the failed write");
assert(loadTheme() === "light", "failed theme write leaves stored theme untouched");

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nstorage smoke test passed");
