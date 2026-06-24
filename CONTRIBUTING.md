# Contributing to Fidelis

*Welcome — Fidelis is a free Catholic Bible app built to last.*  · [← Docs index](docs/INDEX.md)

## Setup

Node 22 is required. After cloning:

```sh
npm install
```

## Verify

Run all three checks before opening a pull request:

```sh
npm test          # liturgical engine + data harnesses + manifest integrity + ESLint
npm run build     # TypeScript type-check (tsc --noEmit) + Vite production build
npm run check-docs  # orphan-page, broken-link, and anchor checker
```

All three must be green. `npm test` exits 1 on any failure — no print-only expectations exist. `npm run check-docs` fails on an orphaned page (a file reachable from nowhere) or a broken internal link.

## Standing rules

The project has three standing rules that govern every change. They live in [`CLAUDE.md` — "Standing rules"](CLAUDE.md#standing-rules); read them there (single source of truth). The headlines are:

- Never hand-edit any file under `public/data/` — they regenerate from scripts only.
- The Today page never exceeds five cards.
- The §13 refusal list in the design spec is binding.

## PR expectations

- All CI must be green: the Linux [`ci.yml`](.github/workflows/ci.yml) runs `npm test`, `npm run build`, and `npm run check-docs`; [`ios.yml`](.github/workflows/ios.yml) builds the iOS App target for the simulator.
- Bump `package.json` `version` **and** add a `CHANGELOG.md` entry in the same commit — always together. See [RELEASING](docs/guides/RELEASING.md) for the full ordered runbook.
- Data-pipeline changes (`public/data/`) must regenerate via the appropriate script and re-seal the manifest (`npm run manifest` or the pipeline script that already calls it).

---
[← Docs index](docs/INDEX.md) · Related: [RELEASING](docs/guides/RELEASING.md) · [CLAUDE.md](CLAUDE.md) · [CHANGELOG](CHANGELOG.md)
