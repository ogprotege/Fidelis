/* Fidelis service worker: app shell + scripture caching for offline reading. */
const SHELL_CACHE = "fidelis-shell-v1";
const DATA_CACHE = "fidelis-data-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  // Scripture data: cache-first (the texts never change).
  if (url.pathname.includes("/data/")) {
    event.respondWith(
      caches.open(DATA_CACHE).then(async (cache) => {
        const hit = await cache.match(event.request);
        if (hit) return hit;
        const res = await fetch(event.request);
        if (res.ok) cache.put(event.request, res.clone());
        return res;
      })
    );
    return;
  }

  // App shell: network-first with cache fallback (so updates land when online).
  event.respondWith(
    caches.open(SHELL_CACHE).then(async (cache) => {
      try {
        const res = await fetch(event.request);
        if (res.ok) cache.put(event.request, res.clone());
        return res;
      } catch {
        const hit = await cache.match(event.request);
        if (hit) return hit;
        throw new Error("offline and not cached");
      }
    })
  );
});
