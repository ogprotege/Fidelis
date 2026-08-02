# Open follow-ups

*What is known-broken, known-deferred, or known-inert — and what closing it takes.*
· [← Docs index](INDEX.md)

Each item records what was **verified**, not what was assumed, so the next session
starts from evidence instead of re-deriving it. Close an item by deleting it and
writing the outcome into [CHANGELOG.md](../CHANGELOG.md).

---

## 1. `main`'s CI audit gate is red — react-router is pinned in a dead end

**Status:** open. Blocks nothing shipping, fails every PR's `build` job.
**Opened:** 2026-07-31 (red on `main` since 2026-07-24).

`.github/workflows/ci.yml` runs `npm audit --omit=dev` and `npm audit` as the
**first** steps of the `build` job, with no allowlist. They exit non-zero on any
advisory, so lint / test / build never run — every PR reads `build fail 20s`.

One advisory survives: [GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2)
(RSC-mode CSRF bypass), covering `react-router` **7.12.0 – 8.2.0**. We are on
7.18.2, inside it.

**Why npm cannot fix it.** The dependency is `react-router-dom`, whose latest —
and final — version is **7.18.2**. There is no 8.x of that package and there will
not be: since v7 it is a deprecated shim whose entire body is

```js
import { HydratedRouter, RouterProvider } from "react-router/dom";
export * from "react-router";
```

So every `react-router-dom` npm can select drags in a vulnerable `react-router`
7.x, and the only direction it can find is backwards — hence its standing offer to
`--force`-downgrade to 7.11.0.

**Why it is nonetheless fixable.** `react-router` **8.3.0** is published and sits
*outside* the advisory range. npm cannot route there while `react-router-dom` is
in the graph.

**Does the advisory apply to us?** No. It concerns React Server Components mode
with server actions. Fidelis is a static, offline, client-only SPA on
`HashRouter` — no server, no RSC, no server actions, no data router. The
vulnerable code path does not exist in this app. This is why shipping continued;
it is not a reason to leave the gate broken.

**Closing it — migrate `react-router-dom` → `react-router@8.3.0`:**

- 21 import sites in `src/`.
- 10 symbols in use, all verified exported by `react-router`: `HashRouter`,
  `Link`, `NavLink`, `Route`, `Routes`, `useLocation`, `useNavigate`,
  `useNavigationType`, `useParams`, `useSearchParams`.
- The mechanical part is a find-and-replace. The real work is reading the v7 → v8
  breaking changes and proving them against this app.
- **Do not** take `npm audit fix --force`; it downgrades to 7.11.0.

**Safety net:** 1,029 harness checks and 31 Playwright tests, including the
widget-entry and scroll-lock regressions added in v1.24.1.

**Watch out for one thing.** `useNavigate()`'s identity is memoised on
`location.pathname` in v7 (`useNavigateUnstable`). v1.24.1's widget fix does not
depend on that staying true — it mounts once and gates the launch URL — but if v8
changes it, the explanatory comments in `src/App.tsx` and
`src/lib/widgetLinks.ts` must be corrected rather than left to rot.

---

## 2. v1.24.2 has not been confirmed on physical hardware

**Status:** awaiting device testing.
**Opened:** 2026-07-31. Build 304 (v1.24.1) is VALID in TestFlight; v1.24.2 is not yet built.

**New in v1.24.2 — test this first.** The Mass and Quote home-screen widgets were
blank on every device (the App Group entitlement had never shipped; see
CHANGELOG 1.24.2). Both the signing repair and the per-day fallback are
unverified on hardware. Confirm: both widgets render real content; the app's
calendar-profile setting is now actually followed by the widgets (switch
General Roman <-> U.S. and check a day the two differ); and Siri "today's
Gospel" answers again.

The widget-entry navigation freeze was reproduced in real Chrome and fixed with
red-first regression coverage, but the fix has not yet been exercised on the
reporting device (iPhone 16 Pro Max, iOS 26.6).

**What to test, and why it is not obvious:**

- Cold-launch from each of Verse, Quote, and Mass; then tap **every** tab.
- **Wait 3+ seconds before the first tap.** The old defect had a 1,200 ms
  delivery-dedupe window that made a *fast* tap accidentally succeed, so a slow,
  deliberate tap is the sharper test.
- Background the app, tap a widget to re-enter warm, confirm Back returns to the
  page you were on rather than a synthetic launch entry.
- Confirm sheets (Share, Save image) still open and close from a widget
  destination.

Android carries the same defect and the same fix (`Bridge.intentUri` is captured
once in the Bridge constructor and never refreshed) and is likewise unverified on
hardware. See [Device acceptance](guides/DEVICE_ACCEPTANCE.md).

---

## 3. Two false readings taken from unvalidated shell output

**Status:** corrected in-repo; recorded as a method note.
**Opened:** 2026-07-31.

Both were wrong in the same way — a shell variable was trusted without checking
whether the command that filled it had succeeded:

1. **`npm audit` / ASC API.** `GET /v1/bundleIds/{id}/bundleIdCapabilities?limit=50`
   returns **HTTP 400** (`limit` is not allowed on that relationship). Reading
   `.data` off the error body yielded "no capabilities", and the conclusion "the
   App Group was never registered" — false. Query it **without `limit`**.
2. **`plutil -extract … json -`** writes to a **file named `-`**, not stdout, so
   the capturing variable was empty and printed as `NONE`, producing "the
   provisioning profiles do not grant the App Group" — false. Always pass
   **`-o -`**. That bug also left a junk file named `-` in the repo root, which
   `git add -A` committed (removed; `.gitignore` now covers it).

**Method note:** check the status code or exit status before reading a payload,
and prefer asserting a positive (`groups: [...]` present) over inferring from an
absence.
