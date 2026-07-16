# Fidelis — security notes

*For: maintainers. The integrity model, and the Content-Security-Policy plan.* · [← Docs index](INDEX.md)

Fidelis is a static, offline-first app: no accounts, no server, and Fidelis
itself sends no user data anywhere. (The operating system may include app
data in the user's own encrypted device backup — disclosed in
[PRIVACY.md](../PRIVACY.md) since v1.21.0, audit FID-PRIV-001.) It renders
scripture and user text through React (which
escapes by default) and bundles the one HTML commentary path build-escaped. This
note records two things the 2026-07-15 audit asked to make explicit.

## Text integrity is build-time (FID-SEC-001)

Every bundled data file under `public/data/` is sealed by a SHA-256 manifest
(`manifest.json`: a hash per file plus a root hash and the source pins). The data
harness and `npm run verify-data` re-walk that manifest on **every build**, so a
corpus that does not match what was pinned is a red build.

The in-app wording — **"Texts verified at build"** (Settings) and **"Verified at
build"** (About) — names exactly that: a build-time seal, proven in CI. It is
**not** a live checksum of the bytes sitting in your device's cache. `loadBook()`
does not re-hash fetched bytes at runtime. Runtime trust comes from elsewhere:

- **Native shells** — the whole `dist/` ships inside a code-signed app bundle.
- **Web / PWA** — the immutable, cache-first corpus is served by `sw.js` from a
  same-origin cache; `manifest.json` itself is served network-first.

Re-hashing fetched bytes against the manifest in the running app is a possible
future hardening, not a claim the current UI makes.

## Content Security Policy — Report-Only first (FID-SEC-002)

A CSP ships today in **Report-Only** mode: it observes and logs violations to the
browser console, and **never blocks a load**. This is the deliberate, non-breaking
first step. It lives in `public/_headers` (copied to `dist/_headers` at build):

```
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self'
  'sha256-…'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;
  font-src 'self'; connect-src 'self'; worker-src 'self' blob:; manifest-src
  'self'; base-uri 'self'; form-action 'self'; object-src 'none'
```

Why a header and not a `<meta>` tag: browsers **ignore** the report-only form in a
`<meta http-equiv>`, so it must be a real response header. `_headers` is honored by
Netlify and Cloudflare Pages, and is simply inert on hosts that do not read it
(e.g. GitHub Pages) and inside the Capacitor shells (code-signed;
`capacitor://localhost` / `https://localhost`). Where the header **is** delivered,
the browser logs each violation to the console (and would POST to a `report-to`
endpoint if one were configured); where it is **not** — the shells, a plain static
host, and `vite dev`/`vite preview` (which serve this file as a static asset, not
as response headers) — no policy is in effect, so **nothing** is reported. To
actually observe violations locally, serve the built app behind a proxy or host
that sets the header.

### The pre-paint script hash

The single inline `<script>` in `index.html` (the pre-paint theme/font resolver,
which must run before first paint to avoid a flash) is allowed by its SHA-256
hash — `'sha256-…'` in `script-src`, not `'unsafe-inline'`. Vite copies that
inline script into `dist/index.html` byte-for-byte, so the source hash matches
what the browser computes. The data harness (`scripts/test-data.ts` §36)
recomputes the hash from `index.html` and asserts it equals the one in
`public/_headers`, so editing the script without updating the header is a red
`npm test`.

### Migrating to an enforcing policy (deferred)

To move from observing to enforcing, deliver an **enforcing**
`Content-Security-Policy` (a `<meta http-equiv="Content-Security-Policy">` works
everywhere, including the shells). Before flipping the switch:

- **Test the Capacitor shells first.** An enforcing policy applies inside the
  iOS WKWebView and the Android WebView too; a missed directive can white-screen
  the app in the field. Verify the Capacitor bridge (its injected scripts), the
  Worker-based import path, the share-card canvas (`blob:`/`data:` images), and
  offline reads.
- **Keep `frame-ancestors` permissive (or omit it).** The embeddable
  `/widget/votd` route is designed to be `<iframe>`'d by third-party sites.
  (`frame-ancestors`, like `report-uri`/`report-to` and `sandbox`, is ignored in
  a `<meta>` tag anyway — those need a real header.)
- **`style-src 'unsafe-inline'` is currently load-bearing** — React writes inline
  `style` attributes (font size, face, layout). Tightening it means removing
  those inline styles or adopting nonces.
- **Add a report endpoint** (`report-to`) if you want violations collected rather
  than only logged to the console.
