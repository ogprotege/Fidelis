# §5 — CCC Citation Index — LOCAL BUILD RUNBOOK

**A paste-and-run prompt + command sheet for building §5 on your own machine**, where
the cloud sandbox's two blockers don't exist: your Catechism PDF is readable, and
vatican.va is reachable. The design is already **signed off** in
`docs/superpowers/specs/2026-06-15-ccc-citation-index-design.md` (PR #13) — this runbook
*executes* it.

> **Why local?** The cloud session can't reach the data: vatican.va and the usual mirrors
> 403-block it, there's no public dataset, and the PDF byte-readers are denied there (a
> good guardrail for a copyrighted book). None of that applies on your laptop.

---

## 0. Non-negotiables (the bright line — do not cross)

1. **Never commit or bundle Catechism text.** Only the **citation facts** (verse → ¶
   numbers) and the **¶ → vatican.va URLs** are shipped. The PDF/text is *input and
   verification only*; the body prose never lands in the repo or `dist/`.
2. **Never hand-edit `public/data/`** — everything there is generated + sealed (standing
   rule 1). The new files come from a build script and are hashed into `manifest.json`.
3. **Honesty about gaps** (the app's ethos): any citation that can't be mapped to a real
   verse is dropped *and reported*, never silently mis-pointed.
4. **Five-card rule + two-accent rule hold.** §5 adds nothing to Today; the CCC links are
   purple (interactive), never gold (honor).

---

## 1. Prerequisites

```sh
# fresh clone (or your existing one), on a branch off the latest main
git clone https://github.com/ogprotege/Fidelis && cd Fidelis
git checkout main && git pull
git checkout -b v1.9-ccc-index
npm install
npm test            # confirm a green baseline before you start
```

- **Node 22** (matches CI).
- **Your USCCB 2nd Ed Catechism PDF** somewhere on disk (note the path). The *Index of
  Citations* appendix starts around **p.689**.
- **Network** to `www.vatican.va` (for the ¶ → URL resolution and the cross-check).

---

## 2. THE PROMPT — paste this into a local Claude Code session

> Open Claude Code in the repo root and paste everything in the block below. It points the
> local agent at the signed-off spec and hands it the data sources the cloud lacked.

```text
You are implementing §5 of Fidelis — the CCC citation index ("Scripture-to-Magisterium
links"). The full, signed-off design is in
docs/superpowers/specs/2026-06-15-ccc-citation-index-design.md — READ IT FIRST and follow
it exactly. Also read CLAUDE.md (standing rules) and the existing commentary layer
(src/lib/commentary.ts, scripts/build-haydock.mjs, src/lib/data.ts loadCommentary) so the
new code mirrors the established patterns.

THE BRIGHT LINE (do not cross): ship only the citation facts (verse → CCC ¶ numbers) and
the ¶ → vatican.va URLs. NEVER commit or bundle Catechism paragraph text. My PDF and
vatican.va are INPUT and VERIFICATION only.

DATA SOURCE (primary = my PDF, the print authority):
- My Catechism PDF is at: <PUT THE ABSOLUTE PATH HERE>. Read ONLY the "Index of Citations"
  appendix (≈ p.689 onward — the list of Scripture references each followed by CCC
  paragraph numbers; an asterisk means a paraphrased citation — keep those, they still
  count as a citation). Parse it into { rawScriptureRef -> [paragraph numbers] }. Expand
  ranges (e.g. "26:26-29") to each verse. Ignore the non-Scripture indices.
- CROSS-CHECK source = vatican.va. Independently confirm a sample by reading the official
  online CCC (https://www.vatican.va/archive/ENG0015/_INDEX.HTM and its __P*.HTM pages).

BUILD (scripts/build-ccc.mjs, new):
1. Parse the Index of Citations (above) → raw mapping.
2. Normalize each ref to the app's key form "<slug> <ch>:<v>" using the same book aliases
   behind parseReference (src/lib/refparse or wherever parseReference lives). Slugs are the
   DRC bundle dir names (john, 1-corinthians, psalms, 1-samuel...).
3. PSALMS: the CCC numbers Psalms in Hebrew/modern numbering; our bundles are
   Vulgate/Septuagint. Map every Psalm citation with the EXISTING tested helper
   hebrewSpanToVulgate() in src/lib/lectionary.ts so "Ps 23:1" keys to "psalms 22:1".
   Document any non-Psalm divergence (Joel/Malachi/3 Kings splits) — map or drop honestly.
4. Write public/data/ccc/index.json = { "<slug> <ch>:<v>": [219,444,...] }, values sorted
   + de-duped integers in [1,2865].
5. Build public/data/ccc/url.json = { "219": "https://www.vatican.va/archive/ENG0015/__P..HTM..." }
   by resolving each ¶ to its vatican.va page (crawl ENG0015 to learn the ¶-range each
   __P*.HTM page covers; add an intra-page #anchor only where the archive exposes one;
   otherwise the page URL is the target). Verify a sample of URLs return HTTP 200.
6. Pin any networked fetch in scripts/pins.mjs (like the existing upstreams) for
   reproducibility, then re-seal: `npm run manifest` (SHA-256 per file + root).

READER UI (src/pages/Reader.tsx, src/lib/data.ts, src/lib/ccc.ts new):
- loadCCC() in data.ts loads index.json + url.json once, memoized like loadCommentary
  (404 -> {}). Trigger on first verse-action open (files are small + global).
- In the verse action bar, BELOW the Commentary action, render a quiet row IFF
  settings.cccLinksEnabled && index["<slug> <ch>:<v>"] is non-empty:
  CCC ¶219 · ¶444 · ¶458 — each an <a target="_blank" rel="noopener noreferrer"> to
  url.json[n]. Links are PURPLE (--purple), the "CCC" label is muted text. NO page dot,
  NO inline text. Soft-cap the first ~8 ¶ with a "+N more" expander.

SETTINGS (its OWN new "Magisterium" reference section — NOT folded into Commentary):
- Add cccLinksEnabled: boolean (default true) to src/lib/storage.ts Settings + defaults
  (merge-safe, no migration); flow through src/SettingsContext.tsx (type-only).
- In src/pages/Settings.tsx add a "Magisterium" section with one row:
  "Catechism cross-references" — "Show CCC paragraph links in the verse actions. Links
  open vatican.va." Off ⇒ no CCC row anywhere. (This section will host the later conciliar
  tier; keep it understated — Fidelis is first a Bible app.)

TESTS (scripts/test-data.ts, new §18 — §17 already exists, the reference parser) — all HARD assertions:
- index values: non-empty, sorted+deduped int arrays, each ¶ in [1,2865].
- every key resolves to a real slug + verse in src/generated/bookMeta.json (no danglers).
- Psalm mapping: a known CCC Psalm citation lands on the VULGATE key.
- a fixed sample of famous citations is present and correct (pin the numbers FROM the PDF,
  not invented): e.g. john 3:16 -> includes 219,444,458.
- url.json keys ⊇ every ¶ used in index; every url is an https://www.vatican.va/... string.
- both files are in manifest.json and pass the hash-walk.

GREEN BAR: `npm test` and `npm run build` must pass. Then run a real browser check
(/verify or npm run dev) to see the CCC row render, wrap, and open the right vatican.va
page. Then bump package.json to 1.9.0, add a CHANGELOG entry named "the deposit"
(Matthew 10:8 is taken by 1.6.0 — use depositum fidei / 2 Timothy 1:14 "Guard the good
deposit"), record it in CLAUDE.md, update the README (Platforms/Highlights as needed and
the version badge), and open a DRAFT PR.

Work in small commits. Do NOT bundle any CCC text. Ask me to eyeball the 20-entry sample
(Step 3 of the runbook) before you finalize.
```

*(Replace `<PUT THE ABSOLUTE PATH HERE>` with your PDF path before pasting.)*

---

## 3. Verification — the spec's mandated 20-sample (you, with the PDF open)

Before merging, the agent prints **20 random `verse → [¶…]` rows** from the freshly built
`index.json`. Open your PDF's *Index of Citations* and confirm each one. A single mismatch
= stop and fix the parser. (Famous anchors to also eyeball: `john 3:16`, `matthew 16:18`,
`genesis 1:1`, `psalms 22(23):1`, `romans 5:12`.)

---

## 4. Commands cheat-sheet

```sh
node scripts/build-ccc.mjs        # parse index + resolve URLs -> public/data/ccc/*.json
npm run manifest                  # re-seal manifest.json (or: npm run data re-seals too)
npm run verify-data               # SHA-256 check
npm test                          # harnesses incl. new §18 + lint + manifest verify
npm run build                     # tsc + vite
npm run dev                       # eyeball the CCC row in a browser
# then: bump version, CHANGELOG "the deposit", README badge, draft PR
```

Add `"ccc": "node scripts/build-ccc.mjs"` to `package.json` scripts while you're in there.

---

## 5. Definition of done

- [ ] `public/data/ccc/{index,url}.json` exist, sealed in `manifest.json`; **no CCC text** anywhere in the repo.
- [ ] Every index key resolves to a real verse; Psalms mapped Hebrew→Vulgate.
- [ ] Verse action bar shows the purple `CCC ¶…` row (no dot, no inline text); links open vatican.va.
- [ ] New **Magisterium** Settings section with `cccLinksEnabled` (default on).
- [ ] `scripts/test-data.ts` §18 added (§17 is the existing reference-parser block); `npm test` + `npm run build` green.
- [ ] 20-sample verified against the PDF; famous anchors correct.
- [ ] v1.9.0 "the deposit" — CHANGELOG, CLAUDE.md, README badge; **draft PR** opened.

---

## 6. If the PDF parse is messy

Two-column index PDFs can interleave columns on text extraction. If so: have the local
agent fall back to **building from vatican.va's footnotes** (reachable locally) and use the
PDF only as the 20-sample oracle — the spec allows either source; the verification step is
what guarantees correctness.
