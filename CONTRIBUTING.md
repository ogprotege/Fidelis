# Contributing to Fidelis

*Welcome — Fidelis is a free Catholic Bible app built to last.*  · [← Docs index](docs/INDEX.md)

## Setup

Node ≥ 22.22.0 is required (react-router 8's runtime floor, declared in
`package.json` `engines`). After cloning:

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
- The Today page never exceeds six cards (raised from five in v1.18.0).
- The §13 refusal list in the design spec is binding.

## PR expectations

- All CI must be green: the Linux [`ci.yml`](.github/workflows/ci.yml) runs `npm test`, `npm run build`, and `npm run check-docs`; [`ios.yml`](.github/workflows/ios.yml) builds the iOS App target for the simulator.
- Bump `package.json` `version` **and** add a `CHANGELOG.md` entry in the same commit — always together. See [RELEASING](docs/guides/RELEASING.md) for the full ordered runbook.
- Data-pipeline changes (`public/data/`) must regenerate via the appropriate script and re-seal the manifest (`npm run manifest` or the pipeline script that already calls it).

## Editing saints & Church history

Both corpora are hand-edited JSON sources under `scripts/`; the emitted
`public/data/{saints,history}/` files are **generated** — never touch them by
hand.

| Corpus | Source of truth | Emit command | Coverage gate |
|--------|-----------------|--------------|---------------|
| Saints | `scripts/saints.corpus.json` | `npm run saints` | every calendar date (366) must have exactly one saint |
| History | `scripts/history.corpus.json` | `npm run history` | every calendar date (366) must have ≥1 event |

### Add or edit a Church-history event

1. Open `scripts/history.corpus.json`.
2. Add (or edit) an object in the `events` array with this shape:

   ```json
   {
     "id": "kebab-case-unique-id",
     "day": "MM-DD",
     "year": 1234,
     "title": "A distinct title",
     "shortBlurb": "One sentence ending with a unicode ellipsis…",
     "body": ["Paragraph one.", "Paragraph two.", "Paragraph three."],
     "sources": [
       {
         "text": "Catholic Encyclopedia (1913), “Article”",
         "license": "public-domain",
         "url": "https://www.newadvent.org/cathen/"
       }
     ],
     "verified": false
   }
   ```

3. Rules the harness enforces (a red `npm test` if broken):
   - `id` unique across the whole corpus
   - `title` must not normalize to the same string as another event (articles/prepositions stripped)
   - no two events may share the same `day` **and** `year` (unless explicitly allowlisted in `scripts/build-history.mjs`)
   - `shortBlurb` must end with the unicode ellipsis `…` (U+2026), not `...`
   - ≥1 source with `license` of `"public-domain"` or `"church-official"`
   - when the day already has a Saint of the Day, prefer a **complementary** subject (not a retelling of that saint's life)
4. Set `verified: false` for new or substantially rewritten entries until you have
   checked them against the named edition (the §3.4 ledger convention).
5. Run:

   ```sh
   npm run history     # regenerates public/data/history/* and reseals the manifest
   npm test            # coverage + integrity gates
   ```

The same pattern applies to saints (`npm run saints`). The v1.23.0 fact-check
audit trail for the full-year history expansion lives under
[`scripts/history-drafts/`](scripts/history-drafts/README.md) — provenance only,
not a build input.

---
[← Docs index](docs/INDEX.md) · Related: [RELEASING](docs/guides/RELEASING.md) · [CLAUDE.md](CLAUDE.md) · [CHANGELOG](CHANGELOG.md)
