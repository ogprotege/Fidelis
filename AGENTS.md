# AGENTS.md

[← Docs index](docs/INDEX.md)

## Cursor Cloud specific instructions

Fidelis is a React + TypeScript + Vite single-page Catholic Bible app, with
native Android/iOS shells via Capacitor. The authoritative architecture and
command reference is `CLAUDE.md`; build scripts are in `package.json`.

The Cloud Agent VM is set up by the environment update script (it runs
`npm install`). You do not need to reinstall dependencies.

- **Run (dev):** `npm run dev` starts Vite on `http://localhost:5173/`. This is
  the way to exercise the app in the cloud (web target).
- **Lint / test / build / docs:** `npm run lint`, `npm test`, `npm run build`,
  `npm run check-docs` (these are exactly what the Linux `CI` workflow runs — see
  `.github/workflows/ci.yml`). Node 22 is required and is what the VM provides.
- **`npm test` is custom, not a test framework.** It runs the `tsx` harnesses
  (`scripts/test-liturgical.ts`, `scripts/test-data.ts`), a data-manifest verify,
  and `eslint src`. Hard assertions exit non-zero on failure. After a deliberate
  liturgical-engine change you must re-bless golden snapshots with `npm run golden`
  and review the diff (see `CLAUDE.md`).
- **Never hand-edit files under `public/data/`** — they are generated; regenerate
  via the `npm run data` / `npm run manifest` scripts (standing rule in `CLAUDE.md`).
- **Mobile shells need a full native toolchain** (Android Studio / Xcode) that the
  cloud VM does not have. `npx cap sync`/`open` and device builds are not runnable
  here; do all cloud work against the web target. The iOS App target is, however,
  built in CI by the **`iOS build`** workflow (`.github/workflows/ios.yml`) on a
  macOS runner — so iOS compilation regressions are still caught.
- **Capacitor 8.4.x ships its iOS framework as a binary built with Swift 6.2**, so
  iOS builds require a Swift ≥ 6.2 toolchain (Xcode 17+/26). The macOS CI selects
  the newest installed Xcode for this reason; an older Xcode fails with misleading
  "value of type 'any CAPBridgeProtocol' has no member 'webView'" errors.
