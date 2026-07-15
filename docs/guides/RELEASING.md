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

## 3. Gate: all checks green

```sh
npm test && npm run build && npm run check-docs
```

All three must pass. `npm test` runs the liturgical engine, data harnesses, manifest integrity check, and ESLint. `npm run build` type-checks and produces the production bundle. `npm run check-docs` catches orphaned pages and broken internal links. Do not proceed with a red gate.

## 4. Reconcile native version strings

Update the version in every native location to match `package.json`:

| Location | Key(s) |
|---|---|
| `android/app/build.gradle` | `versionName "X.Y.Z"` and `versionCode` (integer, e.g. `10000*major + 100*minor + patch`) |
| `ios/App/App.xcodeproj/project.pbxproj` | All four `MARKETING_VERSION` entries |
| `scripts/add-ios-widget-target.rb` | The `"MARKETING_VERSION"` string |

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

## 6. Tag + push

```sh
git tag vX.Y.Z
git push origin <branch>
git push origin vX.Y.Z
```

Open a pull request if on a feature branch; merge to `main`; the tag on `main` marks the release.

## 7. Ship the iOS build to TestFlight

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

## 8. Run device acceptance (before the store submission)

From the TestFlight build, work the hardware-only items in
[Device acceptance](DEVICE_ACCEPTANCE.md) — VoiceOver, live Dynamic Type, the
keyboard-vs-docked-bar interaction, widgets, Siri. Regenerate the App Store
screenshots if any UI changed (`node scripts/capture-appstore.mjs`, see
[App Store](APP_STORE.md)). Only then submit the update for review.

---
[← Docs index](../INDEX.md) · Related: [CHANGELOG](../../CHANGELOG.md) · [iOS guide](IOS.md) · [Android guide](ANDROID.md)
