/* Fidelis service worker: app shell + scripture caching for offline reading.
 *
 * Note: service workers do not run inside Capacitor's iOS webview; offline
 * behavior there comes from dist/ shipping in the app bundle (see docs/IOS.md).
 */
const SHELL_CACHE = "fidelis-shell-v3";
// Cache-first store for the immutable corpus. Bump ONLY when an existing data
// file's bytes change (a deliberate pin bump to scripture/lectionary). On
// activate the prior data cache is migrated forward first, so a bump never
// discards the translations a user downloaded for offline reading. Adding new
// files (e.g. the commentary layer) or re-sealing manifest.json needs NO bump:
// new files miss and fetch fresh, and manifest.json is served network-first.
const DATA_CACHE = "fidelis-data-v2";

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

/** Copy entries from any older data cache into the current one before the
 *  stale-cache sweep deletes them, so bumping DATA_CACHE never discards the
 *  scripture a user explicitly downloaded for offline reading (Settings → Data).
 *  A current entry is never overwritten. */
async function migrateDataCache() {
  const dest = await caches.open(DATA_CACHE);
  for (const name of await caches.keys()) {
    if (name === DATA_CACHE || !name.startsWith("fidelis-data-")) continue;
    const src = await caches.open(name);
    for (const req of await src.keys()) {
      if (await dest.match(req)) continue;
      const res = await src.match(req);
      if (res) await dest.put(req, res);
    }
  }
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Preserve downloaded offline bundles across a data-cache name change.
      try {
        await migrateDataCache();
      } catch {
        // best effort — a failed migration must not block activation
      }
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
  // The manifest is the one exception — it is re-sealed every release, so it is
  // served network-first (cache fallback when offline). That lets a new seal
  // land without bumping — and wiping — the whole data cache.
  if (url.pathname.includes("/data/")) {
    const isManifest = url.pathname.endsWith("/data/manifest.json");
    event.respondWith(
      caches.open(DATA_CACHE).then(async (cache) => {
        if (isManifest) {
          try {
            const res = await fetch(event.request);
            if (res.ok) cache.put(event.request, res.clone());
            return res;
          } catch {
            const hit = await cache.match(event.request);
            if (hit) return hit;
            throw new Error("offline and manifest not cached");
          }
        }
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
