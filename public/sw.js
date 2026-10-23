/*
 * PromptDock Mini service worker (addendum §7).
 *
 * Strategy:
 * - App shell + static assets: precached on install, cache-first with
 *   network update in the background (stale-while-revalidate) for navigations,
 *   cache-first for immutable /_next/static chunks.
 * - /api/* is NETWORK-ONLY. AI generation must never be served from cache,
 *   and private request payloads must never be stored.
 * - Offline navigations fall back to the cached shell; the app itself renders
 *   the offline indicator and guards generation.
 *
 * Version bump on every deploy invalidates old caches safely.
 */

const VERSION = "pmd-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const PRECACHE_URLS = ["/", "/library", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Network-only for API routes: never cache generation payloads/results.
  if (url.pathname.startsWith("/api/")) return;

  // Immutable build chunks: cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  // Navigations + everything else: network-first with cached shell fallback so
  // an offline reload still boots the app and library.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            void caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(async () => {
          const cached =
            (await caches.match(request)) ?? (await caches.match("/"));
          return cached ?? new Response("Offline", { status: 503 });
        }),
    );
    return;
  }

  // Static assets (icons, fonts): stale-while-revalidate.
  event.respondWith(
    caches.open(RUNTIME_CACHE).then(async (cache) => {
      const hit = await cache.match(request);
      const network = fetch(request)
        .then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        })
        .catch(() => hit);
      return hit ?? network;
    }),
  );
});
