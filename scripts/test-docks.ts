import { dockTitle, loadDocks, saveDock } from "../lib/dock-storage";
import { Dock, STORAGE_KEYS } from "../lib/types";

class FakeStorage implements Storage {
  private map = new Map<string, string>();
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
    this.map.set(key, value);
  }
}

(globalThis as Record<string, unknown>).window = { localStorage: new FakeStorage() };

let failures = 0;
function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ok - ${message}`);
  } else {
    failures += 1;
    console.error(`  FAIL - ${message}`);
  }
}

const goalField = { id: "goal", label: "Goal", value: "design a lending tracker", provenance: "known" as const };
const otherField = { id: "users", label: "Users", value: "me", provenance: "known" as const };

assert(
  dockTitle([goalField, otherField], "whatever the thought was") === "design a lending tracker",
  "title prefers the Goal field value",
);
assert(
  dockTitle([{ ...goalField, label: "goal" }, otherField], "whatever") === "design a lending tracker",
  "title finds Goal case-insensitively by id or label",
);
assert(
  dockTitle([otherField], "  an !! app, for tracking ## stuff I lend people   ") ===
    "an app for tracking stuff I",
  "without a Goal: first 6 meaningful words of the thought, punctuation-only tokens skipped",
);
assert(
  dockTitle([otherField], "!!! ...") === "Untitled dock",
  "neither Goal nor usable words falls back to Untitled dock",
);
assert(dockTitle([], "") === "Untitled dock", "empty everything is Untitled dock");

function makeDock(id: string, manually: boolean): Dock {
  return {
    id,
    title: "design a lending tracker",
    thought: "track what I lend people",
    fields: [goalField],
    answers: ["no"],
    questionCount: 1,
    prompt: "You are a helpful assistant.",
    promptEditedManually: manually,
    createdAt: 1000,
    updatedAt: 1000,
  };
}

saveDock(makeDock("manual", true));
assert(loadDocks()[0].promptEditedManually === true, "hand-edited flag persists with the dock");
saveDock(makeDock("generated", false));
assert(loadDocks()[0].promptEditedManually === false, "generated flag persists as false");
const editedTitle = makeDock("retitled", false);
editedTitle.title = dockTitle([goalField], editedTitle.thought);
saveDock(editedTitle);
assert(
  loadDocks().some((d) => d.id === "retitled" && d.title === "design a lending tracker"),
  "saved dock carries its computed title",
);
assert(
  JSON.parse((window.localStorage.getItem(STORAGE_KEYS.docks) ?? "[]")).every(
    (d: unknown) => typeof (d as Dock).promptEditedManually === "boolean",
  ),
  "every stored dock keeps a boolean manual-edit flag",
);

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\ndock title + flag persistence test passed");
