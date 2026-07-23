# Building Fidelis for iOS

*For: developers building or testing the native iOS shell.*  · [← Docs index](../INDEX.md)

Fidelis ships as a [Capacitor](https://capacitorjs.com) app: the same web code
runs inside a native iOS shell, with native WidgetKit home-screen widgets on
top. Building requires a Mac with **Xcode 17+ (Swift 6.2+)** — Capacitor 8.4.x
distributes its iOS framework as a binary `xcframework` built with Swift 6.2, and
an older Xcode cannot read it (it fails with misleading "value of type 'any
CAPBridgeProtocol' has no member 'webView'" errors).

## 1. Build the app

```bash
npm install
npm run build          # builds the web app into dist/
npx cap sync ios       # copies dist/ + plugins into the Xcode project
npx cap open ios       # opens ios/App/App.xcodeproj in Xcode
```

In Xcode select the **App** scheme, pick a simulator or device, and Run.
Everything works offline — all three translations and the lectionary data are
bundled inside the app.

### iOS chrome & safe areas (v1.10.0)

The WebView paints **edge-to-edge**: `index.html` sets `viewport-fit=cover` and
`capacitor.config.ts` sets `ios.contentInset: "never"`, so the app's own CSS
`env(safe-area-inset-*)` insets (header, tab bar, sheets, page gutters) are the
single source of truth — there is no doubled native + CSS inset. The status-bar
glyphs follow the theme via the `@capacitor/status-bar` plugin (driven from
`App.tsx`): light in Night, dark in Day. When verifying on a notched simulator,
confirm the header clears the status bar exactly once and, on scroll, the brand
row folds away while the slim tab row stays pinned below the status bar — the
fixed backdrop strip keeps the notch painted during rubber-band overscroll
(the collapsing masthead, v1.16.0; the bottom tab bar is retired).

### Run it in the Simulator (step by step)

*Verified:* `npm run build && npx cap sync ios` runs clean and copies the web
bundle into `ios/App/App/public`; the project targets **iOS 15.0+**, so any modern
simulator works.

GUI route (simplest):

1. `npx cap open ios` opens the project in Xcode.
2. In the toolbar's device menu pick a simulator (e.g. **iPhone 15**).
3. Press **⌘R** (or the ▶ Run button). The app boots in the Simulator.

Terminal route (no Xcode window needed):

```bash
xcrun simctl list devices available     # see installed simulators
npx cap run ios                         # interactive: pick a target, builds + launches
# or pin one explicitly:
npx cap run ios --target="<UDID-from-the-list>"
```

No simulators listed? Install an iOS runtime in **Xcode ▸ Settings ▸ Components**,
or create a device in **Xcode ▸ Window ▸ Devices and Simulators**.

After any web change, re-sync before running again:

```bash
npm run build && npx cap sync ios
```

Common gotchas:

- **"No such module 'Capacitor'"** — let Swift Package Manager finish resolving
  (watch Xcode's status bar) before building. This project uses **SPM, not
  CocoaPods**, so there is no `pod install` step.
- **Stale content** — you skipped `npx cap sync ios` after `npm run build`.
- **Signing prompts** appear only for a *physical device*; the Simulator needs none.

Before shipping to TestFlight/App Store, set your own bundle identifier and
signing team in the App target (the default id is `app.fidelis.bible`).

## 2. Add the home-screen widgets

The widget sources live in `ios/WidgetExtension/`. The extension *target* is now
created by a script (it used to be a manual Xcode step):

```bash
gem install xcodeproj          # once, if not already installed
ruby scripts/add-ios-widget-target.rb
```

This adds the `FidelisWidgetExtension` app-extension target to `App.xcodeproj`,
compiles `FidelisWidget.swift` + `CalendarWidgets.swift` +
`WidgetSharedSettings.swift`, bundles `votd.json` + `calendar.json` + `Info.plist`
(extension point `com.apple.widgetkit-extension`),
and embeds the `.appex` in the `App` target. It is idempotent — re-running once
the target exists is a no-op. Then build/run the `App` scheme and add a widget
from the home screen (long-press ▸ ➕ ▸ Fidelis): Verse of the Day, Today at Mass,
and Quote of the Day, each in small / medium / large.

> If you prefer the manual route: **File ▸ New ▸ Target… ▸ Widget Extension**,
> product name `FidelisWidget`, untick "Include Configuration App Intent", embed
> in `App`, delete the template Swift file, then drag in the four
> `ios/WidgetExtension/*` files with **Target membership** checked.

The widget computes the same daily verse as the web app
(`index = (dayOfYear + year) mod cycleLength`) and refreshes itself at
midnight, seven days ahead at a time, fully offline.

After editing the curated cycle in `src/lib/votd.ts`, regenerate the widget's
bundled data with:

```bash
node scripts/build-votd-widget.mjs
```

Fidelis cannot install an iOS widget or open Apple's widget gallery. **More ▸
Widgets** therefore gives numbered Home Screen instructions and uses the
`WidgetStatus` bridge only to report configurations already known to
`WidgetCenter`, including each family. An empty successful result means none are
configured; a bridge error is reported as unavailable, never as “not added.”

The app and extension contain an App Group settings seam for calendar profile,
theme, and translation. Both committed targets request
`group.app.fidelis.bible`. Register that group for both signed identifiers and
verify that both distribution profiles grant it. If the signed container is not
available, the bridge returns `sharedSettingsAvailable: false`, the Widgets page
says calendar widgets cannot read the app's selection, and calendar-derived
WidgetKit surfaces show **Open Fidelis to update**. They never substitute a
plausible bundled-default jurisdiction. System appearance remains a harmless
visual fallback for the Verse widget.

The app's custom `fidelis` URL scheme is registered in `Info.plist`. Verse,
Mass, and Quote widgets open `fidelis://verse`, `fidelis://mass`, and
`fidelis://quote`; `src/App.tsx` owns the cold/warm history and destination-focus
rules.

## 3. Updating the web content

Whenever you change web code, re-run:

```bash
npm run build && npx cap sync ios
```

`ios/App/App/public/` is generated by the sync and is gitignored — only the
Xcode project and the widget sources are tracked.

## 4. Service worker note

`public/sw.js` (shell precache + offline data cache) is a web/PWA concern
only: service workers do not run inside Capacitor's iOS webview. That costs
nothing on iOS — the entire `dist/` output ships inside the app bundle, so
the shell and the bundled texts are offline by construction. Only books a
user *imports* (RSV-2CE/NABRE via IndexedDB) and the lectionary fetches go
through the webview, and those read from local bundle paths as well.

## 5. The Mass & Quote widgets, App Intents, Dynamic Type

*Shipped in v1.13.3:* the App Intent (`ios/App/App/TodaysGospelIntent.swift`) and
the Dynamic Type bridge (`ios/App/App/AppDelegate.swift` ↔ `src/lib/dynamicType.ts`)
are now in the tree; the notes below remain as the design rationale.

The Android counterparts of these ship in v1.8.4 "the doorposts" (the data
pipeline + `CalendarWidget`/`QuoteWidget` are fully committed). The iOS side now
ships in the same `FidelisWidgetExtension` target, added by
`scripts/add-ios-widget-target.rb` (§2) — no manual Xcode step. This is the runbook.

**Shared data — already generated.** `scripts/build-calendar-widget.ts`
(`npm run calendar-widget`, also part of `npm run widgets`) pre-resolves, from
the *same* `resolveReadings()` / `liturgicalDay()` / `quoteOfTheDay()` the web
app uses, every supported profile from the previous civil year through five
future years to:

- `ios/WidgetExtension/calendar.json`

It is an atomic, versioned snapshot. The root carries `schemaVersion`,
`generatedAt`, `expiresAt`, the covered window, and the default profile. Each
profile carries its exact engine fingerprint and an object keyed by local ISO
date (`"YYYY-MM-DD"`); each day value has this shape:

```json
{
  "season": "Ordinary Time",
  "seasonLabel": "Tuesday of the Eleventh Week in Ordinary Time",
  "colorHex": "#2e7d32",
  "celebration": "",
  "celebrationId": null,
  "formularyId": null,
  "readings": [{ "label": "First Reading", "cite": "3 Kings 21:17-29" }, … ],
  "quote": { "text": "…", "author": "St. Polycarp of Smyrna" }
}
```

So no engine is ported: the widget reads the selected profile and device-local
date, validates schema, expiry, fingerprint, and day, then renders. Any invalid
or out-of-window data shows **Open Fidelis to update**, never plausible generic
content. Regenerate after a calendar, lectionary, or quote change, then run the
no-write parity check:

```bash
npm run calendar-widget
npm run verify-widgets
```

**Two new widgets (in the existing `FidelisWidget` extension) — Swift now written.**
The `MassWidget` and `QuoteWidget` are implemented in
`ios/WidgetExtension/CalendarWidgets.swift`, and `FidelisWidget.swift`'s
`@main FidelisWidgetBundle` already registers all three
(`FidelisWidget()` + `MassWidget()` + `QuoteWidget()`). `scripts/add-ios-widget-target.rb`
(§2) already compiles `CalendarWidgets.swift` and bundles `calendar.json` into the
`FidelisWidgetExtension` target, so there is no manual Xcode wiring:

1. Run `ruby scripts/add-ios-widget-target.rb` (idempotent) if the target is not yet
   in your checkout, then `npx cap open ios`.
2. Build the `App` scheme, or run the app and add the widgets from the home screen
   (long-press ▸ ➕ ▸ Fidelis ▸ "Today at Mass" / "Quote of the Day").

What the implemented Swift does (for reference): it loads `calendar.json`, keys
it by `DateFormatter` (`yyyy-MM-dd`, `Calendar(identifier: .gregorian)`, device
`TimeZone.current` — matching the Android `GregorianCalendar` key exactly), shows
`celebration` (else `seasonLabel`) plus the `readings` citations for Mass and the
`quote.text` / `quote.author` for the Quote. Decorative gold remains the sacred
mark; small gold text uses the darker readable token that clears 4.5:1. Timelines
emit one entry per day for the next week (`.atEnd`), fully offline.

**App Intent — "What's today's Gospel?" (Siri / Shortcuts):**

`ios/App/App/TodaysGospelIntent.swift` (App Intents framework, in the **app**
target) reads the same `calendar.json`, finds today's `Gospel` reading, and
returns its `cite` as the dialog without opening the app
(`openAppWhenRun = false`); an `AppShortcutsProvider` exposes it under the
phrase "today's Gospel in Fidelis." AppIntents is iOS 16+, so it is gated
behind `@available(iOS 16.0, *)` — on iOS 15 the shortcut simply isn't offered.

**Dynamic Type:** the shell reads `UIApplication.preferredContentSizeCategory`
(the bridge lives in `ios/App/App/AppDelegate.swift`) and passes it to the web
layer (`src/lib/dynamicType.ts`), which maps the iOS content-size categories
onto the four in-app size presets (`src/lib/typography.ts` → 17/19/22/25) and
tracks live category changes. The in-app pills remain the override.

All three remain offline and pin `Calendar(identifier: .gregorian)` so a
non-Gregorian device calendar can never skew the date key the widgets, Siri,
and Android all look up.

**Calendar-profile policy:** the verified catalog is exact and deliberately
small: **General Roman**, **United States with Ascension on Sunday**, and
**United States with Ascension on Thursday** for Boston, Hartford, New York,
Omaha, and Philadelphia. The snapshot contains all three. Legacy `universal`
and `usa` settings migrate to General Roman and U.S. Sunday Ascension without
changing their behavior. Unsupported countries and dioceses receive an
explicit General Roman fallback notice; Fidelis does not claim a local proper
that has not been sourced and verified.

The app, widget, and Siri settings paths keep calendar jurisdiction, lectionary
edition, and displayed Bible translation distinct. Once the requested App Group
is granted by both signed profiles, WidgetKit reads the selected profile and
reloads timelines after a settings change. Without a usable signed container,
calendar-derived WidgetKit surfaces fail closed with **Open Fidelis to update**;
this limitation must be called out during TestFlight acceptance.

## 6. macOS CI (builds the iOS App target)

`.github/workflows/ios.yml` runs on `macos-latest` and builds the **App** target
for the iOS Simulator (signing disabled — no Apple account or secrets needed),
after `npm ci && npm run build && npx cap sync ios`. It **selects the newest
installed Xcode** first, because Capacitor 8.4.x's binary framework requires a
Swift ≥ 6.2 toolchain (see above). It is the native counterpart to the Linux `CI`
workflow and proves the Capacitor iOS shell still compiles after a web or native
change. It builds the **Release** configuration — the one
`scripts/ios-testflight.sh` archives. It triggers on demand (`workflow_dispatch`)
and on push/PR that touch `ios/**`, `src/**`, `public/**`, `capacitor.config.ts`,
the lockfile, or the native tooling scripts (project wiring, widget data
builders, the TestFlight pipeline).

The `FidelisWidgetExtension` target now lives in the committed project (added by
`scripts/add-ios-widget-target.rb`, §2) and is embedded in the `App` target, so
the App-target CI build compiles and embeds the widgets as a dependency — the App
build is the gate for the widgets too.

The shared **App** scheme is committed at
`ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme`; do not archive an
auto-selected widget-extension scheme. The Node harness separately exercises the
widget-link coordinator and profile/snapshot contracts. The physical iOS 17 and
current iOS 26 widget-navigation and VoiceOver matrix remains mandatory because
an unsigned simulator compile cannot prove WidgetCenter, signing entitlements,
timeline rollover, or assistive-technology behavior.

## 7. Shipping to TestFlight

Once you have an Apple Developer membership, the entire archive → sign → upload
runs from **one command** — no Xcode GUI, no Organizer:

```bash
bash scripts/ios-testflight.sh
```

**One-time setup.** Generate an **App Store Connect API key** (App Store Connect ▸
Users and Access ▸ Integrations ▸ App Store Connect API ▸ generate a key with
**Admin** access; download the `.p8` — it is downloadable only once). Then copy
`scripts/ios-release.local.env.example` to `scripts/ios-release.local.env` (which
is gitignored) and fill in your `TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, and the
`.p8` path. The app record must also exist once: App Store Connect ▸ Apps ▸ ➕ ▸
New App, bundle id `app.fidelis.bible`.

**What the script does, and why it's shaped this way.** A brand-new developer
account has **no registered devices**, and Xcode's *automatic* signing demands a
*development* provisioning profile at archive time — which requires a device.
(Forcing `Apple Distribution` with automatic style instead errors with
"conflicting provisioning settings.") The pipeline sidesteps this entirely:

1. **Build + sync** the web bundle into the shell, then revert the `Package.swift`
   `.v15` → `.v17` bump that `cap sync` re-applies each time (see §4 of
   [Releasing](RELEASING.md)).
2. **Archive UNSIGNED** (`CODE_SIGNING_ALLOWED=NO`) — so the no-device wall never
   comes up. A monotonic `CURRENT_PROJECT_VERSION` (the git commit count) is
   injected so each upload's `CFBundleVersion` is unique; both Info.plists read
   `$(CURRENT_PROJECT_VERSION)`, so the app and widget stay in lockstep.
3. **Sign at EXPORT** with the API key (`-allowProvisioningUpdates`): this is where
   the **distribution** certificate and an **App Store** provisioning profile are
   created — and App Store profiles need **zero** devices.
4. **Upload** the signed `.ipa` via `xcrun altool --upload-app`.

**From CI, no Mac needed.** The `.github/workflows/testflight.yml` workflow runs
this same script on a macOS GitHub runner — trigger it manually from the Actions
tab (**TestFlight release** → *Run workflow*, choosing the release branch/commit).
One-time setup: create four repository **Actions secrets** (GitHub → Settings →
Secrets and variables → Actions) mirroring the local env file — `TEAM_ID`,
`ASC_KEY_ID`, `ASC_ISSUER_ID`, and `ASC_KEY_P8`, where `ASC_KEY_P8` is the full
*contents* of the `AuthKey_<KEYID>.p8` file (open it in a text editor and paste
everything, `BEGIN`/`END` lines included). The workflow fails fast with a named
list if any secret is missing, and prints Apple's ingestion state after upload.

**Check processing** without refreshing the browser:

```bash
node scripts/asc-build-status.mjs   # PROCESSING -> VALID
```

When the build reads `VALID`, add it in App Store Connect ▸ Fidelis ▸ **TestFlight**
▸ **Internal Testing** (add yourself as a tester, assign the build — internal
testing needs **no** Apple review), then install via the TestFlight app on your
phone.

> **Export compliance** is already answered: `ITSAppUsesNonExemptEncryption` is
> `false` in `Info.plist` (the app does no first-party cryptography — only
> OS-provided HTTPS), so the upload skips the encryption questionnaire.

---
[← Docs index](../INDEX.md) · Related: [Android guide](ANDROID.md) · [Releasing](RELEASING.md) · [CLAUDE.md](../../CLAUDE.md)
