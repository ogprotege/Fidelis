# Releasing Fidelis

*For: the maintainer cutting a new version.*  · [← Docs index](../INDEX.md)

Follow these steps in order. All commands run from the repo root.

---

## 1. Bump version + changelog

Edit `package.json` — increment `version` (SemVer). Then sync the lockfile without a full install:

```sh
npm install --package-lock-only
```

Add a `CHANGELOG.md` entry in the same commit ([Keep a Changelog](https://keepachangelog.com/) format; follow the project's tradition of a named release). The version bump and the changelog entry **must travel together**.

## 2. Regenerate widget data (if needed)

If any calendar logic, Mass-reading citations, lectionary data, or quotes changed:

```sh
npm run widgets   # = npm run votd-widget && npm run calendar-widget
```

This writes `ios/WidgetExtension/votd.json`, `ios/WidgetExtension/calendar.json`, and the Android counterparts. Commit the regenerated JSON with the other changes.

The calendar snapshot is atomic and profile-aware. It covers the previous year
through five future years and records schema, generation time, expiry, profile
fingerprints, and stable celebration/formulary IDs. Verify both generators
without writing before release:

```sh
npm run verify-widgets
```

## 3. Gate: all checks green

```sh
npm test
npm run build
npm run check-docs
npm run e2e
npm run verify-data
npm audit --omit=dev
npm audit
```

All must pass under Node 22. `npm test` runs the liturgical engine, data
harnesses, no-write widget verification, manifest integrity, and ESLint.
`npm run build` type-checks and produces the production bundle. Playwright runs
against that built app. Both production and full audits must report zero known
vulnerabilities. `npm run check-docs` catches orphaned pages and broken internal
links. Do not proceed with a red gate.

## 4. Reconcile native version strings

Update the version in every native location to match `package.json`:

| Location | Key(s) |
|---|---|
| `android/app/build.gradle` | `versionName "X.Y.Z"` and `versionCode` (integer, e.g. `10000*major + 100*minor + patch`) |
| `ios/App/App.xcodeproj/project.pbxproj` | All four `MARKETING_VERSION` entries |

`scripts/add-ios-widget-target.rb` reads the version from `package.json` when it
creates a target; it contains no release-version literal to edit. The committed
project still needs every app and extension `MARKETING_VERSION` reconciled.

**Deployment targets** — do not let a beta Xcode `cap sync` silently raise these:

| Target | Minimum |
|---|---|
| iOS App (`IPHONEOS_DEPLOYMENT_TARGET`) | 15.0 |
| WidgetKit extension (`IPHONEOS_DEPLOYMENT_TARGET`) | 17.0 (`containerBackground(for:)` requires it) |
| `Package.swift` iOS platform (`platforms: [.iOS(…)]`) | `.v15` — must be ≤ the App target's deployment target, or SPM errors |

If `cap sync` raises them, revert with the exact command `scripts/ios-testflight.sh`
runs after its own sync:

```sh
git checkout -- ios/App/CapApp-SPM/Package.swift
```

The CI build will catch a mismatched App target.

## 5. Sync native shells

```sh
npx cap sync ios
npx cap sync android
```

This copies the built `dist/` into both native projects and applies any Capacitor config changes. Commit any native-project files that changed (`.xcodeproj`, `build.gradle`, etc.).

Re-run both idempotent iOS wiring scripts after adding native bridge or widget
sources, and archive only the committed **App** scheme:

```sh
ruby scripts/add-ios-widget-target.rb
ruby scripts/configure-ios-app-target.rb
xcodebuild -list -project ios/App/App.xcodeproj
```

For Android, use JDK 21 and run the same lint/unit/build gate as CI:

```sh
cd android
./gradlew lintDebug testDebugUnitTest assembleDebug --no-daemon
```

Run the instrumentation test on the required API 24, 26, 31, and 36 emulator
matrix. Build the App scheme on iOS 17 and the current iOS 26 SDK. Neither native
compile substitutes for the physical-device gate in §9.

## 6. Reconcile calendar and signing truth

The 1.24.0 verified profile catalog contains only General Roman, U.S. Sunday
Ascension, and U.S. Thursday Ascension for Boston, Hartford, New York, Omaha,
and Philadelphia. Unsupported jurisdictions must display the explicit General
Roman fallback. Do not describe this as worldwide local-calendar coverage.

The iOS app and extension both request `group.app.fidelis.bible`. Register and
provision it on both signed identifiers before claiming that calendar/theme
preferences reach WidgetKit. Until a distribution build proves the shared
container, record the explicit **Open Fidelis to update** fail-closed state in
device acceptance. The widget must not substitute the bundled default
jurisdiction when shared settings are unavailable.

The TestFlight script unpacks the signed IPA, decodes each code signature's DER
entitlements, and requires that exact App Group as an array member in both
targets. It also verifies bundle identifiers, app/widget version and build
parity, then validates the IPA with App Store Connect before upload. A profile
that strips the shared container therefore stops the release instead of
producing a broken beta. To run only the signed-artifact gate:

```sh
bash scripts/ios-testflight-dispatch.sh --verify-only App.ipa X.Y.Z BUILD
```

## 7. Tag + push

```sh
git tag vX.Y.Z
git push origin <branch>
git push origin vX.Y.Z
```

Open a pull request if on a feature branch; merge to `main`; the tag on `main` marks the release.

## 8. Ship the iOS build to TestFlight

With the version committed, build and upload the signed iOS app in one command:

```sh
bash scripts/ios-testflight.sh
```

It archives unsigned, signs for **distribution** at export (an App Store profile
needs no registered devices), and uploads via the App Store Connect API key — then
`node scripts/asc-build-status.mjs` reports when the build turns `VALID`. See
[iOS guide §7](IOS.md#7-shipping-to-testflight) for the one-time API-key setup and
the full rationale. Add the build to a TestFlight group in App Store Connect
(internal testing needs no Apple review).

**No Mac at hand?** The same pipeline runs in CI: trigger the **TestFlight
release** workflow (GitHub → Actions → *TestFlight release* → *Run workflow*, on
the release commit). It runs `scripts/ios-testflight.sh` verbatim on a macOS
runner and needs four repository Actions secrets set once — `TEAM_ID`,
`ASC_KEY_ID`, `ASC_ISSUER_ID`, and `ASC_KEY_P8` (the *contents* of the `.p8`
key file) — the same values the local env file holds; see
[iOS guide §7](IOS.md#7-shipping-to-testflight).

## 9. Run device acceptance (before the store submission)

From the TestFlight build, work the hardware-only items in
[Device acceptance](DEVICE_ACCEPTANCE.md) — VoiceOver, live Dynamic Type, the
keyboard-vs-docked-bar interaction, widget add/deny/remove/duplicate flows,
terminated/suspended/warm link entry, midnight/DST/reboot/manual-time/time-zone
rollover, Siri, TalkBack, and VoiceOver. The matrix requires a physical iPhone
and physical Pixel/Samsung device and is **not complete merely because CI is
green**. Regenerate the App Store
screenshots if any UI changed (`node scripts/capture-appstore.mjs`, see
[App Store](APP_STORE.md)). Only then submit the update for review.

---
[← Docs index](../INDEX.md) · Related: [CHANGELOG](../../CHANGELOG.md) · [iOS guide](IOS.md) · [Android guide](ANDROID.md)
