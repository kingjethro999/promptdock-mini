import { Dock, Field } from "./types";

/**
 * Versioned prompt library on IndexedDB.
 *
 * PromptGroup = one logical prompt (title + thought lineage).
 * PromptVersion = an immutable snapshot of the prompt body at a point in time.
 * ChatSession = a full workspace snapshot (mid-conversation state) so a
 * refresh restores the chat exactly where it was — see page.tsx.
 *
 * localStorage (`pmd.docks`) remains untouched as a recovery backup after
 * migration — see migrateFromLegacyDocks().
 */

export type VersionSource =
  | "ai-build"
  | "ai-refinement"
  | "manual-edit"
  | "migration";

export interface PromptGroup {
  id: string;
  title: string;
  originalThought: string;
  latestVersionId: string;
  createdAt: number;
  updatedAt: number;
}

export interface PromptVersion {
  id: string;
  groupId: string;
  versionNumber: number;
  body: string;
  source: VersionSource;
  isFavorite: boolean;
  createdAt: number;
  baseVersionId?: string;
  interpretationSnapshot?: Field[];
  answersSnapshot?: string[];
}

/** Everything the workspace needs to resume a chat mid-flight. */
export interface SessionState {
  thought: string;
  fields: Field[] | null;
  question: string | null;
  answers: string[];
  questionCount: number;
  prompt: string | null;
  promptEditedManually: boolean;
  pendingSync: boolean;
  composerText: string;
  composerMode: "create" | "refine";
  activeVersionId: string | null;
}

export interface ChatSession {
  id: string;
  /** Linked prompt group once its first version is committed (nullable). */
  groupId: string | null;
  title: string;
  updatedAt: number;
  state: SessionState;
}

const DB_NAME = "promptdock-mini";
const DB_VERSION = 2;
const STORE_GROUPS = "groups";
const STORE_VERSIONS = "versions";
const STORE_SESSIONS = "sessions";
export const MIGRATION_FLAG = "pmd.migrated.v1";

function indexedDbAvailable(): boolean {
  try {
    return typeof window !== "undefined" && "indexedDB" in window;
  } catch {
    return false;
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!indexedDbAvailable()) {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_GROUPS)) {
        const groups = db.createObjectStore(STORE_GROUPS, { keyPath: "id" });
        groups.createIndex("updatedAt", "updatedAt");
      }
      if (!db.objectStoreNames.contains(STORE_VERSIONS)) {
        const versions = db.createObjectStore(STORE_VERSIONS, {
          keyPath: "id",
        });
        versions.createIndex("groupId", "groupId");
        versions.createIndex("groupId+versionNumber", ["groupId", "versionNumber"]);
      }
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        const sessions = db.createObjectStore(STORE_SESSIONS, {
          keyPath: "id",
        });
        sessions.createIndex("updatedAt", "updatedAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("indexedDB open failed"));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("tx failed"));
    tx.onabort = () => reject(tx.error ?? new Error("tx aborted"));
  });
}

function reqResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("request failed"));
  });
}

export function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/** All groups, newest-updated first. */
export async function listGroups(): Promise<PromptGroup[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_GROUPS, "readonly");
    const store = tx.objectStore(STORE_GROUPS);
    const groups = await reqResult<PromptGroup[]>(store.getAll());
    return groups.sort((a, b) => b.updatedAt - a.updatedAt);
  } finally {
    db.close();
  }
}

export async function getGroup(id: string): Promise<PromptGroup | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_GROUPS, "readonly");
    const group = await reqResult<PromptGroup | undefined>(
      tx.objectStore(STORE_GROUPS).get(id),
    );
    return group ?? null;
  } finally {
    db.close();
  }
}

/** Versions for one group, oldest first (natural build order). */
export async function listVersions(groupId: string): Promise<PromptVersion[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_VERSIONS, "readonly");
    const index = tx.objectStore(STORE_VERSIONS).index("groupId");
    const versions = await reqResult<PromptVersion[]>(index.getAll(groupId));
    return versions.sort((a, b) => a.versionNumber - b.versionNumber);
  } finally {
    db.close();
  }
}

export async function getVersion(id: string): Promise<PromptVersion | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_VERSIONS, "readonly");
    const version = await reqResult<PromptVersion | undefined>(
      tx.objectStore(STORE_VERSIONS).get(id),
    );
    return version ?? null;
  } finally {
    db.close();
  }
}

/**
 * Append an immutable version and bump the group's latest pointer atomically.
 * Never overwrites old versions.
 */
export async function appendVersion(input: {
  group?: Omit<PromptGroup, "latestVersionId" | "createdAt" | "updatedAt"> & {
    createdAt?: number;
  };
  groupId: string;
  body: string;
  source: VersionSource;
  baseVersionId?: string;
  interpretationSnapshot?: Field[];
  answersSnapshot?: string[];
}): Promise<{ group: PromptGroup; version: PromptVersion }> {
  const db = await openDb();
  const now = Date.now();
  try {
    const tx = db.transaction([STORE_GROUPS, STORE_VERSIONS], "readwrite");
    const groups = tx.objectStore(STORE_GROUPS);
    const versions = tx.objectStore(STORE_VERSIONS);

    let group = await reqResult<PromptGroup | undefined>(groups.get(input.groupId));
    if (!group) {
      if (!input.group) throw new Error(`group ${input.groupId} not found`);
      group = {
        id: input.group.id,
        title: input.group.title,
        originalThought: input.group.originalThought,
        latestVersionId: "",
        createdAt: input.group.createdAt ?? now,
        updatedAt: now,
      };
    }

    const existing = await reqResult<PromptVersion[]>(
      versions.index("groupId").getAll(input.groupId),
    );
    const nextNumber =
      existing.reduce((max, v) => Math.max(max, v.versionNumber), 0) + 1;

    const version: PromptVersion = {
      id: newId(),
      groupId: input.groupId,
      versionNumber: nextNumber,
      body: input.body,
      source: input.source,
      isFavorite: false,
      createdAt: now,
      baseVersionId: input.baseVersionId,
      interpretationSnapshot: input.interpretationSnapshot,
      answersSnapshot: input.answersSnapshot,
    };

    group.latestVersionId = version.id;
    group.updatedAt = now;

    groups.put(group);
    versions.add(version);
    await txDone(tx);

    return { group, version };
  } finally {
    db.close();
  }
}

/** Create a brand-new group seeded with its first version. */
export async function createGroupWithVersion(input: {
  title: string;
  originalThought: string;
  body: string;
  source: VersionSource;
  interpretationSnapshot?: Field[];
  answersSnapshot?: string[];
}): Promise<{ group: PromptGroup; version: PromptVersion }> {
  const groupId = newId();
  return appendVersion({
    group: { id: groupId, title: input.title, originalThought: input.originalThought },
    groupId,
    body: input.body,
    source: input.source,
    interpretationSnapshot: input.interpretationSnapshot,
    answersSnapshot: input.answersSnapshot,
  });
}

export async function renameGroup(id: string, title: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_GROUPS, "readwrite");
    const store = tx.objectStore(STORE_GROUPS);
    const group = await reqResult<PromptGroup | undefined>(store.get(id));
    if (!group) throw new Error(`group ${id} not found`);
    group.title = title;
    group.updatedAt = Date.now();
    store.put(group);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function toggleFavorite(
  versionId: string,
): Promise<PromptVersion | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_VERSIONS, "readwrite");
    const store = tx.objectStore(STORE_VERSIONS);
    const version = await reqResult<PromptVersion | undefined>(
      store.get(versionId),
    );
    if (!version) return null;
    version.isFavorite = !version.isFavorite;
    store.put(version);
    await txDone(tx);
    return version;
  } finally {
    db.close();
  }
}

/** Point the group at an older version (restore) without deleting anything. */
export async function setLatestVersion(
  groupId: string,
  versionId: string,
): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_GROUPS, "readwrite");
    const store = tx.objectStore(STORE_GROUPS);
    const group = await reqResult<PromptGroup | undefined>(store.get(groupId));
    if (!group) throw new Error(`group ${groupId} not found`);
    group.latestVersionId = versionId;
    group.updatedAt = Date.now();
    store.put(group);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function deleteGroupAndVersions(groupId: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction([STORE_GROUPS, STORE_VERSIONS], "readwrite");
    tx.objectStore(STORE_GROUPS).delete(groupId);
    const index = tx.objectStore(STORE_VERSIONS).index("groupId");
    const ids = await reqResult<IDBValidKey[]>(index.getAllKeys(groupId));
    for (const id of ids) tx.objectStore(STORE_VERSIONS).delete(id);
    await txDone(tx);
  } finally {
    db.close();
  }
}

/** All favorite versions across groups, newest first. */
export async function listFavorites(): Promise<PromptVersion[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_VERSIONS, "readonly");
    const all = await reqResult<PromptVersion[]>(
      tx.objectStore(STORE_VERSIONS).getAll(),
    );
    return all
      .filter((v) => v.isFavorite)
      .sort((a, b) => b.createdAt - a.createdAt);
  } finally {
    db.close();
  }
}

// ---------------------------------------------------------------------------
// Chat sessions (mid-conversation snapshots; survive refresh)
// ---------------------------------------------------------------------------

/** Upsert one session snapshot. */
export async function saveSession(session: ChatSession): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_SESSIONS, "readwrite");
    tx.objectStore(STORE_SESSIONS).put(session);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function getSession(id: string): Promise<ChatSession | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_SESSIONS, "readonly");
    const session = await reqResult<ChatSession | undefined>(
      tx.objectStore(STORE_SESSIONS).get(id),
    );
    return session ?? null;
  } finally {
    db.close();
  }
}

/** The session linked to a group (deep links), or null. */
export async function findSessionByGroup(
  groupId: string,
): Promise<ChatSession | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_SESSIONS, "readonly");
    const all = await reqResult<ChatSession[]>(
      tx.objectStore(STORE_SESSIONS).getAll(),
    );
    return all.find((s) => s.groupId === groupId) ?? null;
  } finally {
    db.close();
  }
}

/** All sessions, newest-updated first (sidebar order). */
export async function listSessions(): Promise<ChatSession[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_SESSIONS, "readonly");
    const sessions = await reqResult<ChatSession[]>(
      tx.objectStore(STORE_SESSIONS).getAll(),
    );
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  } finally {
    db.close();
  }
}

export async function deleteSession(id: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_SESSIONS, "readwrite");
    tx.objectStore(STORE_SESSIONS).delete(id);
    await txDone(tx);
  } finally {
    db.close();
  }
}

// ---------------------------------------------------------------------------
// Legacy migration
// ---------------------------------------------------------------------------

function legacyStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function migrationDone(): boolean {
  try {
    return legacyStorage()?.getItem(MIGRATION_FLAG) === "1";
  } catch {
    return true;
  }
}

/**
 * One-time migration from localStorage `pmd.docks` (legacy Dock[]) into
 * IndexedDB groups + versions. Idempotent (flag-guarded), and the legacy
 * localStorage entry is intentionally left in place as a recovery backup —
 * we never delete it.
 */
export async function migrateFromLegacyDocks(): Promise<{
  migrated: number;
  skipped: boolean;
}> {
  if (migrationDone()) return { migrated: 0, skipped: true };
  if (!indexedDbAvailable()) return { migrated: 0, skipped: true };

  const s = legacyStorage();
  if (!s) return { migrated: 0, skipped: true };

  let docks: Dock[] = [];
  try {
    const raw = s.getItem("pmd.docks");
    if (!raw) {
      s.setItem(MIGRATION_FLAG, "1");
      return { migrated: 0, skipped: true };
    }
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      docks = parsed.filter(
        (d): d is Dock =>
          typeof d === "object" &&
          d !== null &&
          typeof (d as Dock).id === "string" &&
          typeof (d as Dock).prompt === "string",
      );
    }
  } catch {
    // Corrupt legacy data — mark done so we don't loop, leave data in place.
    s.setItem(MIGRATION_FLAG, "1");
    return { migrated: 0, skipped: true };
  }

  const db = await openDb();
  try {
    const tx = db.transaction([STORE_GROUPS, STORE_VERSIONS], "readwrite");
    const groups = tx.objectStore(STORE_GROUPS);
    const versions = tx.objectStore(STORE_VERSIONS);

    for (const dock of docks) {
      // Skip docks already migrated (idempotency within a partial run).
      const existing = await reqResult<PromptGroup | undefined>(
        groups.get(dock.id),
      );
      if (existing) continue;

      const versionId = newId();
      const group: PromptGroup = {
        id: dock.id,
        title: dock.title,
        originalThought: dock.thought,
        latestVersionId: versionId,
        createdAt: dock.createdAt,
        updatedAt: dock.updatedAt,
      };
      const version: PromptVersion = {
        id: versionId,
        groupId: dock.id,
        versionNumber: 1,
        body: dock.prompt,
        source: "migration",
        isFavorite: false,
        createdAt: dock.updatedAt,
        interpretationSnapshot: dock.fields,
        answersSnapshot: dock.answers,
      };
      groups.add(group);
      versions.add(version);
    }
    await txDone(tx);
    s.setItem(MIGRATION_FLAG, "1");
    return { migrated: docks.length, skipped: false };
  } catch {
    // Migration failed — do NOT set the flag, so a retry can happen.
    return { migrated: 0, skipped: true };
  } finally {
    db.close();
  }
}
