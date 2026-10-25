"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { LibraryCard } from "../../components/LibraryCard";
import { useOnlineStatus } from "../../lib/online-status";
import {
  PromptGroup,
  PromptVersion,
  deleteGroupAndVersions,
  listGroups,
  listVersions,
  migrateFromLegacyDocks,
  renameGroup,
} from "../../lib/prompt-store";

type SortMode = "newest" | "oldest" | "alpha";
type FilterMode = "all" | "favorites";

async function loadAllVersions(): Promise<Record<string, PromptVersion[]>> {
  const all = await listGroups();
  const entries = await Promise.all(
    all.map(async (g) => [g.id, await listVersions(g.id)] as const),
  );
  return Object.fromEntries(entries);
}

export default function LibraryPage() {
  const router = useRouter();
  const online = useOnlineStatus();
  const [groups, setGroups] = useState<PromptGroup[]>([]);
  const [versionsByGroup, setVersionsByGroup] = useState<
    Record<string, PromptVersion[]>
  >({});
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("newest");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await migrateFromLegacyDocks();
      const [g, v] = await Promise.all([listGroups(), loadAllVersions()]);
      if (cancelled) return;
      setGroups(g);
      setVersionsByGroup(v);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refresh() {
    const [g, v] = await Promise.all([listGroups(), loadAllVersions()]);
    setGroups(g);
    setVersionsByGroup(v);
  }

  function handleOpen(groupId: string) {
    router.push(`/?group=${encodeURIComponent(groupId)}`);
  }

  async function handleRename(groupId: string, title: string) {
    await renameGroup(groupId, title);
    await refresh();
  }

  async function handleDelete(groupId: string) {
    await deleteGroupAndVersions(groupId);
    await refresh();
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = groups.filter((g) => {
      const versions = versionsByGroup[g.id] ?? [];
      if (filter === "favorites" && !versions.some((v) => v.isFavorite)) {
        return false;
      }
      if (q.length === 0) return true;
      if (g.title.toLowerCase().includes(q)) return true;
      return versions.some((v) => v.body.toLowerCase().includes(q));
    });
    list = [...list].sort((a, b) => {
      if (sort === "alpha") return a.title.localeCompare(b.title);
      if (sort === "oldest") return a.createdAt - b.createdAt;
      return b.updatedAt - a.updatedAt;
    });
    return list;
  }, [groups, versionsByGroup, query, sort, filter]);

  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-fg">
            Library
          </h1>
          <p className="text-xs text-muted">
            Local to this browser — clearing site data removes it.{" "}
            {!online && "Available offline."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="library-search" className="sr-only">
            Search prompts
          </label>
          <input
            id="library-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles and prompt bodies…"
            className="min-w-52 flex-1 rounded-full border border-line bg-panel px-4 py-2 text-sm text-fg placeholder:text-muted focus:border-green focus:outline-none"
          />
          <label htmlFor="library-sort" className="sr-only">
            Sort
          </label>
          <select
            id="library-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortMode)}
            className="rounded-full border border-line bg-panel px-3 py-2 text-xs font-semibold text-fg focus:border-green focus:outline-none"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="alpha">A → Z</option>
          </select>
          <div
            className="flex items-center gap-1"
            role="group"
            aria-label="Filter"
          >
            {(["all", "favorites"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={filter === mode}
                onClick={() => setFilter(mode)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                  filter === mode
                    ? "border-green text-fg"
                    : "border-line text-muted hover:border-green hover:text-fg"
                }`}
              >
                {mode === "all" ? (
                  "All"
                ) : (
                  <>
                    <Star
                      aria-hidden
                      className={`size-3 ${filter === mode ? "fill-current" : ""}`}
                    />
                    Favorites
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        {loaded && visible.length === 0 ? (
          <p className="rounded-2xl border border-line bg-panel px-4 py-8 text-center text-sm text-muted">
            {groups.length === 0
              ? "No prompts yet. Shape an idea on the workspace and it saves here automatically."
              : "Nothing matches that search."}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((group) => (
              <LibraryCard
                key={group.id}
                group={group}
                versions={versionsByGroup[group.id] ?? []}
                onOpen={handleOpen}
                onRename={handleRename}
                onDelete={handleDelete}
                onComingSoon={() => router.push("/library")}
              />
            ))}
          </ul>
        )}
      </main>
    </AppShell>
  );
}
