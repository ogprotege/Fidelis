# §5 (P2) — Modern CCC Import — LOCAL BUILD RUNBOOK

[← Docs index](../../INDEX.md)

**How to turn a copy of the Catechism you OWN into a `fidelis-ccc-1` import file**, on your
own machine. The design is signed off in
`docs/superpowers/specs/2026-06-27-ccc-inline-catechism-design.md` (§6) — this runbook runs it.

> **The bright line (do not cross):** the modern CCC text is © LEV/USCCB and is **never**
> bundled or committed. This converter reads YOUR owned copy and writes `ccc.local.json`
> (gitignored). That file is imported on-device only — it never enters the repo or `dist/`.

## 0. Prerequisites

- **Node 22.** Poppler `pdftotext` (`/opt/homebrew/bin/pdftotext`, already present).
- **EPUB path (recommended):** Calibre is **not** installed — install it once:
  ```sh
  brew install --cask calibre
  ```
  `ebook-convert` then resolves footnote anchors, so the `.txt` is far cleaner than a PDF crop.
- **Your owned CCC file** (EPUB or the USCCB 2nd-Ed PDF) somewhere on disk.

## 1. EPUB → text → JSON (cleanest)

```sh
ebook-convert "/path/to/ccc.epub" ccc.txt --enable-heuristics --txt-output-formatting plain
node scripts/build-ccc-text.mjs ccc.txt
```

## 2. PDF → JSON (fallback — needs the body-column crop)

```sh
node scripts/build-ccc-text.mjs "/path/to/Catechism_2nd-ED.pdf"
#   or:  CCC_TEXT_PDF="/path/to.pdf" node scripts/build-ccc-text.mjs
```

The PDF carries **marginal cross-reference numbers** (right gutter) and a **page-foot footnote
band** that must not leak into the body. The converter crops to the body column with
`pdftotext -layout -x/-W` (drops the margin) and `-H` (drops the foot), the same region-crop
technique `scripts/build-ccc.mjs` uses for the two-column index. Tune per edition:

| Env var | Meaning | Start |
|---|---|---|
| `CCC_CROP_X` | left edge of the body column (px) | `0` |
| `CCC_CROP_W` | body width — **shrink until the right-margin cross-ref numbers disappear** | `430` |
| `CCC_CROP_H` | body height — **shrink until the page-foot footnotes disappear** | `660` |
| `CCC_FIRST_PAGE` / `CCC_LAST_PAGE` | restrict to Parts One–Four (before the Index of Citations) | unset = whole doc |

```sh
CCC_CROP_W=420 CCC_CROP_H=650 CCC_FIRST_PAGE=20 CCC_LAST_PAGE=700 \
  node scripts/build-ccc-text.mjs "/path/to/Catechism_2nd-ED.pdf"
```

## 3. The known hard case — glued footnote digits

In a PDF, a footnote reference can glue to the word before it (`"life.45"`). The converter
strips a 1–3 digit run glued to the end of a word (`deApparatus`), but this is the genuinely
hard normalization case (it can clip a legitimate trailing number). **EPUB avoids it** — prefer
EPUB. If the PDF route leaves artifacts, spot-check the printed incipits and re-tune.

## 4. The gate — read the printed counts (no copyrighted oracle)

The converter prints **counts only** (never the body):

- **cited-¶ coverage** vs the committed `public/data/ccc/url.json` — every ¶ the §5 index cites
  should be present. A short coverage = re-tune the crop and re-run.
- **Part Four contiguity** — ¶2558–2865 is the last block (308 ¶); the count should be 308.
- **incipits** of ¶1 / ¶1817 / ¶2558 / ¶2865 — eyeball that each starts mid-sentence-free.

A failed coverage check or a wrong section count = stop and re-tune, exactly `build-nabre`'s gate.

## 5. Import it

`ccc.local.json` is gitignored. Open the app → **Settings → Magisterium → Import the Catechism**,
select the file. It is stored only on your device (IndexedDB). A cited verse's Catechism sheet
now shows the ¶ text inline (Tier 1) ahead of the bundled Trent. Remove it anytime from the same
row.

## 6. Definition of done

- [ ] `ccc.local.json` written; **no CCC text anywhere in the repo** (`git status` clean of it — it is gitignored).
- [ ] Printed cited-¶ coverage is complete (or the gaps are understood); Part Four = 308.
- [ ] Imported via Settings → Magisterium; a cited verse shows ¶ text inline; Remove works.
