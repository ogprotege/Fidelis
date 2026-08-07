# Open follow-ups

*What is known-broken, known-deferred, or known-inert — and what closing it takes.*
· [← Docs index](INDEX.md)

Each item records what was **verified**, not what was assumed, so the next session
starts from evidence instead of re-deriving it. Close an item by deleting it and
writing the outcome into [CHANGELOG.md](../CHANGELOG.md).

---

## 1. No release has ever passed the physical-device gate — run it now, in the 1.24.4 review window

**Status:** awaiting device testing — the review clock is running again.
**Opened:** 2026-07-31. **Updated:** 2026-08-07.

The store now sells **1.24.3** (approved 2026-08-07; its app code is identical
to 1.24.2, so the v1.24.2 widget repair sits in production unverified), and
**1.24.4 (build 322)** — the router swap — is **WAITING_FOR_REVIEW** with
release type AFTER_APPROVAL: approval publishes it by itself. Every release so
far has shipped without this pass. Run it from **TestFlight build 322** now,
during the review window, so the router swap is hardware-verified before — or
as soon as — it goes live. **CI being green is not this gate.** The v1.24.4
release-runbook item that used to sit above this one is closed: tags, GitHub
releases, TestFlight build 322, and the ASC staging + submission are all done
(see CHANGELOG 1.24.4 for the record).

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

**The v1.24.4 router swap — what its smoke test should touch.** The
routing-sensitive paths are covered by the green e2e suite (ScrollManager
restoring on browser Back, cross-page anchors, the widget deep-link anchors,
Back-with-a-sheet-open releasing the scroll lock), so on hardware confirm tab
navigation, Back, and a widget cold-launch behave. One seam no CI gate covers:
`src/lib/widgetLinks.ts` reads React Router's undocumented `history.state`
shape (`idx`/`usr`) on native-only paths — 8.3.0 still writes it (verified
against the installed package), but no test pins it, so exercise iOS edge-swipe
Back and a warm widget re-entry specifically.

---

## 2. Two false readings taken from unvalidated shell output

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
