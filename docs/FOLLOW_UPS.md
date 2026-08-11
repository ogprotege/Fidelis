# Open follow-ups

*What is known-broken, known-deferred, or known-inert — and what closing it takes.*
· [← Docs index](INDEX.md)

Each item records what was **verified**, not what was assumed, so the next session
starts from evidence instead of re-deriving it. Close an item by deleting it and
writing the outcome into [CHANGELOG.md](../CHANGELOG.md).

---

## 1. The physical-device gate — CLOSED 2026-08-11

**Status:** CLOSED — verified on hardware by the maintainer.
**Opened:** 2026-07-31. **Closed:** 2026-08-11.

The maintainer ran the full checklist below directly on device (TestFlight
build 328/322 lineage — same app code): tab navigation, cold/warm launch from
the Verse/Quote/Mass widgets, Share and Save image, VoiceOver, and Siri
("today's Gospel") all confirmed working. This is the first release in the
project's history to pass the physical-device gate.

Supporting evidence gathered the same day, separately: while fixing an
unrelated Xcode Cloud CI failure (see CHANGELOG/PR #99) a device had to be
connected for the first time, and a local Debug build was installed and
launched on it — the native `WidgetStatus` plugin reported
`sharedSettingsAvailable: true` on real hardware, an independent confirmation
that the App Group entitlement (the v1.24.2 blank-widget defect) resolves
on-device.

**Store state at close.** The public store sells **1.24.4** (approved / live
2026-08-09). **1.24.5 (build 328)** — the store-page fix for captioned
screenshots + mission-led listing — was **WAITING_FOR_REVIEW**, release type
AFTER_APPROVAL: approval publishes the product-page change by itself. App code
in 1.24.5 is the same product as 1.24.4 (listing only).

**What was confirmed, for the record:**

- Cold-launch from each of Verse, Quote, and Mass; every tab.
- Background the app, tap a widget to re-enter warm; Back returns to the page
  that was open rather than a synthetic launch entry.
- Sheets (Share, Save image) open and close from a widget destination.
- Both home-screen widgets (Mass, Quote) render real content; the
  calendar-profile setting is followed by the widgets; Siri "today's Gospel"
  answers.
- Tab navigation, Back, and a widget cold-launch behave correctly under the
  v1.24.4 router swap.

Android carries the same widget-entry fix (`Bridge.intentUri` captured once in
the Bridge constructor) and remains unverified on Android hardware — if that
matters going forward, open a fresh follow-up item for it specifically. See
[Device acceptance](guides/DEVICE_ACCEPTANCE.md) for the full checklist this
was run against.

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
