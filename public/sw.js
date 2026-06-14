/* Fidelis service worker: app shell + scripture caching for offline reading.
 *
 * Note: service workers do not run inside Capacitor's iOS webview; offline
 * behavior there comes from dist/ shipping in the app bundle (see docs/IOS.md).
 */
const SHELL_CACHE = "fidelis-shell-v3";
const DATA_CACHE = "fidelis-data-v1";

const ASSET_RE = /(?:src|href)="([^"]*assets\/[^"]+)"/g;
const FONT_RE = /url\(\s*["']?([^"')]+\.woff2?)["']?\s*\)/g;

/** Hashed asset URLs (JS, CSS) referenced by an index.html body, absolutized. */
function indexAssets(html) {
  return [...html.matchAll(ASSET_RE)].map((m) => new URL(m[1], self.location.href).href);
}

/** woff/woff2 URLs a stylesheet pulls in, resolved against the stylesheet. */
function fontAssets(css, cssUrl) {
  return [...css.matchAll(FONT_RE)].map((m) => new URL(m[1], cssUrl).href);
}

/**
 * Every hashed asset the current shell legitimately needs: the JS and CSS that
 * index.html names, plus the EB Garamond woff2 those stylesheets reference. The
 * fonts are pulled from CSS url() (spec §1.4), so they never appear in
 * index.html and the bare attribute scan would treat them as stale. `fetcher`
 * resolves a URL to a Response — network at install time, cache-first at purge.
 */
async function shellAssets(html, fetcher) {
  const top = indexAssets(html);
  const fonts = [];
  for (const url of top) {
    if (!url.endsWith(".css")) continue;
    const res = await fetcher(url);
    if (res && res.ok) fonts.push(...fontAssets(await res.text(), url));
  }
  return [...top, ...fonts];
}

/** Drop hashed assets that no longer belong to the current shell (keeping the
 *  fonts the current stylesheets still reference). */
async function purgeStaleAssets(cache, html) {
  const current = new Set(
    await shellAssets(html, async (u) => (await cache.match(u)) || fetch(u))
  );
  for (const req of await cache.keys()) {
    if (req.url.includes("/assets/") && !current.has(req.url)) await cache.delete(req);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // Precache the shell all-or-nothing: index.html, every hashed asset it
      // references, and the fonts those stylesheets pull in — HTML put last so
      // a partial precache never looks complete. A failure fails the install:
      // the old worker and its populated cache stay in charge, and the browser
      // retries.
      const cache = await caches.open(SHELL_CACHE);
      const res = await fetch("index.html", { cache: "no-cache" });
      if (!res.ok) throw new Error(`shell precache: HTTP ${res.status}`);
      const html = await res.clone().text();
      await cache.addAll(await shellAssets(html, (u) => fetch(u, { cache: "no-cache" })));
      await cache.put("index.html", res);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE).map((k) => caches.delete(k))
      );
      try {
        const cache = await caches.open(SHELL_CACHE);
        const index = await cache.match("index.html");
        if (index) await purgeStaleAssets(cache, await index.text());
      } catch {
        // best effort
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  // Scripture data: cache-first (the texts never change between pin bumps).
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

  // App shell: network-first with cache fallback (so updates land when
  // online). A fresh navigation response also triggers a purge of stale
  // hashed assets — deploys change index.html but not this file, so the
  // activate-time purge alone would never see them.
  event.respondWith(
    caches.open(SHELL_CACHE).then(async (cache) => {
      try {
        const res = await fetch(event.request);
        if (res.ok) {
          cache.put(event.request, res.clone());
          if (event.request.mode === "navigate") {
            // Keep the canonical "index.html" entry tracking the current
            // deploy (navigations are keyed by their own URL, e.g. "/"),
            // and purge assets the new shell no longer references.
            cache.put("index.html", res.clone());
            const html = await res.clone().text();
            event.waitUntil(purgeStaleAssets(cache, html));
          }
        }
        return res;
      } catch {
        const hit = await cache.match(event.request);
        if (hit) return hit;
        // Offline navigation to any route: serve the precached shell.
        if (event.request.mode === "navigate") {
          const shell = await cache.match("index.html");
          if (shell) return shell;
        }
        throw new Error("offline and not cached");
      }
    })
  );
});
