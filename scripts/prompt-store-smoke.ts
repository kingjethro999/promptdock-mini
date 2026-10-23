/**
 * Headless acceptance tests for the IndexedDB prompt store (addendum §12).
 *
 * Covers:
 * - legacy `pmd.docks` migration: all records preserved, no duplicates on
 *   rerun, original localStorage kept as recovery backup
 * - no MAX_DOCKS eviction in the new library (25 groups all survive)
 * - three consecutive refinements produce four intact, copyable versions
 * - per-version favorites toggle and group-level favorite surfacing
 * - delete removes the group and all its versions, nothing else
 *
 * Run: npx tsx scripts/prompt-store-smoke.ts
 */

import "fake-indexeddb/auto";
import * as store from "../lib/prompt-store";

// Minimal browser shims (the store reads window.* at call time, so assigning
// after import is safe).
const g = globalThis as unknown as {
  window?: unknown;
  localStorage?: unknown;
};

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
}

const legacyStorage = new MemoryStorage();
const themeStorage = new MemoryStorage();

g.localStorage = {
  getItem: (key: string) =>
    key === "pmd.theme" ? themeStorage.getItem(key) : legacyStorage.getItem(key),
  setItem: (key: string, value: string) =>
    key === "pmd.theme"
      ? themeStorage.setItem(key, value)
      : legacyStorage.setItem(key, value),
  removeItem: (key: string) =>
    key === "pmd.theme"
      ? themeStorage.removeItem(key)
      : legacyStorage.removeItem(key),
};
g.window = {
  indexedDB: (globalThis as { indexedDB: unknown }).indexedDB,
  localStorage: g.localStorage,
};

let passed = 0;
function assert(condition: boolean, label: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ok  ${label}`);
  } else {
    console.error(`FAIL  ${label}`);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  // --- seed 10 legacy docks (the old cap) ---
  const legacyDocks = Array.from({ length: 10 }, (_, i) => ({
    id: `legacy-${i}`,
    title: `Legacy dock ${i}`,
    thought: `rough thought ${i}`,
    fields: [
      {
        id: "goal",
        label: "Goal",
        value: `goal ${i}`,
        provenance: "known" as const,
      },
    ],
    answers: [`answer ${i}`],
    questionCount: 1,
    prompt: `Prompt body ${i}`,
    promptEditedManually: i % 2 === 0,
    createdAt: 1_000_000 + i,
    updatedAt: 2_000_000 + i,
  }));
  legacyStorage.setItem("pmd.docks", JSON.stringify(legacyDocks));
  themeStorage.setItem("pmd.theme", "dark");

  console.log("migration");
  const first = await store.migrateFromLegacyDocks();
  assert(first.migrated === 10, "migrates all 10 legacy docks");
  assert(first.skipped === false, "first run performs work");

  const groupsAfterFirst = await store.listGroups();
  assert(groupsAfterFirst.length === 10, "10 groups exist after migration");
  assert(
    groupsAfterFirst.every((grp) => grp.title.startsWith("Legacy dock")),
    "titles preserved from legacy records",
  );

  const versionsOfLegacy0 = await store.listVersions("legacy-0");
  assert(versionsOfLegacy0.length === 1, "one version per legacy dock");
  assert(
    versionsOfLegacy0[0].body === "Prompt body 0",
    "prompt body preserved",
  );
  assert(
    versionsOfLegacy0[0].source === "migration",
    "version marked as migration",
  );
  assert(
    legacyStorage.getItem("pmd.docks") !== null,
    "legacy pmd.docks kept as recovery backup",
  );
  assert(themeStorage.getItem("pmd.theme") === "dark", "pmd.theme preserved");

  const rerun = await store.migrateFromLegacyDocks();
  assert(rerun.skipped === true, "rerun is a no-op (migration flag)");
  assert((await store.listGroups()).length === 10, "no duplicates after rerun");

  // --- no MAX_DOCKS eviction ---
  console.log("library growth");
  for (let i = 10; i < 25; i++) {
    await store.createGroupWithVersion({
      title: `New group ${i}`,
      originalThought: `thought ${i}`,
      body: `body ${i}`,
      source: "ai-build",
    });
  }
  assert(
    (await store.listGroups()).length === 25,
    "25 groups survive (no eviction at 10)",
  );

  // --- three refinements => four intact versions ---
  console.log("refinement history");
  const base = await store.createGroupWithVersion({
    title: "Refine target",
    originalThought: "make a plan",
    body: "Version one of the prompt",
    source: "ai-build",
  });
  const targetId = base.group.id;
  let lastVersionId = base.version.id;
  for (let i = 2; i <= 4; i++) {
    const next = await store.appendVersion({
      groupId: targetId,
      body: `Version ${i === 4 ? "four" : i === 3 ? "three" : "two"} of the prompt`,
      source: "ai-refinement",
      baseVersionId: lastVersionId,
    });
    lastVersionId = next.version.id;
  }
  const history = await store.listVersions(targetId);
  assert(history.length === 4, "three refinements create four versions");
  assert(
    history.map((v) => v.versionNumber).join(",") === "1,2,3,4",
    "version numbers are sequential",
  );
  assert(
    history[0].body === "Version one of the prompt",
    "earliest version intact and copyable",
  );
  const groupNow = await store.getGroup(targetId);
  assert(
    groupNow?.latestVersionId === history[3].id,
    "group points at the latest version",
  );

  // --- favorites ---
  console.log("favorites");
  const toggled = await store.toggleFavorite(history[1].id);
  assert(toggled?.isFavorite === true, "favorite toggles on");
  const favorites = await store.listFavorites();
  assert(
    favorites.some((v) => v.id === history[1].id),
    "favorited version appears in favorites query",
  );
  await store.toggleFavorite(history[1].id);
  assert(
    (await store.listFavorites()).every((v) => v.id !== history[1].id),
    "favorite toggles off",
  );

  // --- delete scoped to one group ---
  console.log("delete");
  await store.deleteGroupAndVersions(targetId);
  assert((await store.getGroup(targetId)) === null, "group deleted");
  assert((await store.listVersions(targetId)).length === 0, "versions deleted");
  assert(
    (await store.listGroups()).length === 25,
    "other groups untouched by delete (26 - 1)",
  );

  console.log(`\n${passed} assertions passed`);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
