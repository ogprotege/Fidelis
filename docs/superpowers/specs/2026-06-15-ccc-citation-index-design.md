# §5 — Scripture-to-Magisterium Links (the CCC citation index)

**Date:** 2026-06-15
**Spec section:** Feature Design Spec §5 (Scripture-to-Magisterium links)
**Branch:** TBD (proposed: `v1.9-ccc-index`)
**Status:** ✅ **Signed off — decisions resolved 2026-06-15.** No code yet; building
next (step 3) the moment the USCCB 2nd Ed *Index of Citations* is reachable here (§13).
This is step 2 of the agreed order (Android PR #12 merged → **spec §5** → build & verify
vs. the PDF). Resolved decisions are folded into §4 / §7 / §13.

When the Church's Catechism reads a verse, show where. A quiet row in the verse
action bar — **CCC ¶219 · ¶444 · ¶458** — each number opening that paragraph on
vatican.va. This is the §4 "formation" arc continued: the Fathers were one tap away;
now the Catechism is too. Factual citation links, not commentary text.

---

## 1. The bright line (copyright) — stated first, on purpose

The Catechism is two very different things for our purposes, and only one is ours to ship:

| | What | May we bundle it? |
|---|---|---|
| ✅ **The Index of Citations** | the mapping *"this verse → these ¶ numbers"* | **Yes.** It is **fact**, not expression (spec §5: "the mapping is fact… may be compiled freely"). We compile it into our own JSON and seal it like every other data file. |
| ❌ **The paragraph text** | the prose of ¶219, ¶444, … | **No.** © Libreria Editrice Vaticana / USCCB. Never committed, never bundled. The numbers **link out to vatican.va**; that is the entire reason §5 is a link layer, not a text layer. |

- This is **not** on the §13 refusal list, and it is **not** AI/paraphrase — it is a
  deterministic, verifiable citation index. It is clear to build.
- The CCC *text* has a future home, and it is **not here**: the v2.0 "library" roadmap
  item is "CCC **importable**" — a user who owns the Catechism loads their own copy
  locally (like RSV-2CE/NABRE today), never shipped. Out of scope for §5.
- Your USCCB 2nd Ed (with the *Corrigenda*) and Ascension PDFs are the **build input
  and the verification oracle for the index only** — we read the *Index of Citations*
  appendix, never transcribe body paragraphs.

---

## 2. What ships

- **`public/data/ccc/index.json`** — `{ "<book-slug> <ch>:<v>": [219, 444, 458, 706], … }`,
  built from the authoritative print Index of Citations, sealed in `manifest.json`.
- **`public/data/ccc/url.json`** — `{ "219": "https://www.vatican.va/archive/ENG0015/__P…HTM…", … }`,
  the ¶→vatican.va URL **resolved once at build time** so the client never guesses
  (spec §5). Sealed in the manifest too.
- **A CCC row in the verse action bar** — shown only when the open verse has citations:
  `CCC ¶219 · ¶444 · ¶458`, each an external link (`target="_blank" rel="noopener"`).
- **A Settings toggle** — `cccLinksEnabled` (default on), in the existing switch-row
  pattern, beside the Commentary controls.
- **No gold dot, no inline text.** Unlike Haydock, the CCC layer adds **no page mark** —
  it lives only in the action bar (spec §5: "the verse action bar shows, when present, a
  quiet row"). The sacred page is untouched; restraint over discoverability theater.

---

## 3. Data model

### 3.1 Why two files, both small and sealed
- `index.json` — verse → paragraph numbers. ~7–9k keyed verses (the count of distinct
  Scripture verses the CCC cites). Flat JSON ≈ 150–250 KB.
- `url.json` — paragraph → URL. The CCC has 2865 numbered paragraphs; only the cited
  ones need entries (≈ 2,000), but building all 2865 is cheap and future-proofs the
  importable-text feature. ≈ 120–180 KB.
- Splitting URL out of the index avoids repeating a long URL for every verse that cites
  the same paragraph. Both are global (not per-book) and **loaded once, lazily**, on the
  first verse-action-bar open in the Reader, then cached for the session (small enough
  that per-book splitting buys nothing).

### 3.2 Key format — match `parseReference`
Keys use the app's canonical reference form (the harness already pins this:
`'John 3:16' → john 3:16`, `'ps 22' → psalms 22`): **`"<slug> <chapter>:<verse>"`**,
slug = the DRC bundle dir name (`john`, `1-corinthians`, `psalms`, `1-samuel`). So the
Reader looks up `cccIndex["${bookSlug} ${chapter}:${v}"]` with zero transformation.

Paragraph values are integers, **deduplicated and sorted ascending**.

---

## 4. Decisions (proposed — confirm in sign-off)

| # | Decision | Proposed choice |
|---|----------|-----------------|
| **A1** | **Authoritative source for the index** | **Your USCCB 2nd Ed *Index of Citations* PDF** is the build input (it is the print authority and carries the *Corrigenda*). We parse the *Scripture* portion of that appendix only. The Ascension PDF is a **secondary cross-check**, never the primary (it layers Ascension's own copyrighted apparatus). |
| **A2** | **Verification** | The spec's mandated **20-entry random sample** hand-checked against the PDF, **plus** a structural cross-check: every key parses to a real book+verse in `bookMeta.json`, every ¶ is in 1–2865, and a second independent source (the Vatican online citations or a public CCC-index dataset) agrees on a 50-entry sample. A red mismatch fails the build. |
| **A3** | **¶ → vatican.va URL** | Resolve at **build time** by crawling the Vatican English CCC archive (`ENG0015`) to map each ¶ to its page (and intra-page anchor if one exists); **fall back to the containing section/page** when no stable per-¶ anchor exists (spec §5). The build **verifies a sample of URLs return 200** and contain the expected ¶. Stored in `url.json`. |
| **A4** | **Indicator** | **Action-bar row only — no page dot.** (Spec §5 wording; keeps the page bare. Re-open later if you want a marginal mark.) |
| **A5** | **Psalm versification** | **Map at build time.** The CCC indexes Psalms in **Hebrew/modern** numbering; the app's bundles are **Vulgate/Septuagint**. Reuse the existing, tested `hebrewSpanToVulgate()` (`src/lib/lectionary.ts`) so a CCC "Ps 23:1" keys to the app's `psalms 22:1`. This makes §5 *more* correct than the commentary layer (which only documented the offset). Non-Psalm divergences (a few Joel/Malachi/3 Kings chapter splits) are passed through and **documented**. |
| **A6** | **Scope** | **CCC only.** Conciliar documents (Dei Verbum, Lumen Gentium) follow the identical pattern in a **later** PR (spec §5: "explicitly deferred"). |
| **A7** | **What the toggle gates / where it lives** | One setting `cccLinksEnabled` (default on) — off ⇒ no CCC row anywhere. Lives in §5's **own new "Magisterium" reference section** (§7), not folded into Commentary. **✅ confirmed.** |

---

## 5. Build pipeline — `scripts/build-ccc.mjs`

```
node scripts/build-ccc.mjs            # parses the index source → public/data/ccc/{index,url}.json
npm run ccc                           # alias; then re-seal: npm run manifest
```

1. **Parse the Index of Citations** (source per A1) into `{ rawRef → [¶…] }`. The print
   index is grouped under book headers with entries like `3:16 … 219, 444` and ranges
   `26:26-29 … 1337`. A range expands to each verse it covers (matching the commentary
   pipeline's "broadcast a range to each verse" rule), so a single-verse lookup hits.
2. **Normalize refs → app keys**: book name → slug (reuse the alias table behind
   `parseReference`); apply **A5** Psalm mapping; emit `"<slug> <ch>:<v>"`.
3. **Build `url.json`**: crawl `ENG0015`, map ¶→URL (A3), verify a sample.
4. **Write** both files; **`npm run manifest`** re-seals `manifest.json` (SHA-256 per
   file + root) exactly as the texts and commentary are sealed; `npm run verify-data`
   and the harness hash-walk then cover them.
5. **Pins:** if any network source is used (the Vatican crawl), pin the fetch the way
   `scripts/pins.mjs` pins the upstreams, so a rebuild is reproducible.

> The actual parse + crawl run in **step 3 (build)**, once the PDF is reachable here
> (right now `list_pdfs` is empty — you'll drop the *Index of Citations* pages at a path
> or URL the viewer can open, or commit a text/CSV export of just that appendix). This
> spec fixes the shape and the guarantees; it does not transcribe the Catechism.

---

## 6. Reader integration (`src/pages/Reader.tsx`)

- Load `index.json` + `url.json` once (memoized in `src/lib/data.ts`, mirroring
  `loadCommentary`'s promise-deduped cache; a 404 resolves to `{}`), triggered on the
  first action-bar open (or book open — both fine; the files are global + small).
- In the verse action bar (`.verse-actions`), **below** the Commentary action, render
  the CCC row **iff** `settings.cccLinksEnabled` and `cccIndex["${slug} ${ch}:${v}"]`
  is non-empty:

```tsx
<div className="ccc-row">
  <span className="ccc-label">CCC</span>
  {paras.map((n, i) => (
    <a key={n} className="ccc-ref" href={cccUrl[n] ?? CCC_INDEX_URL}
       target="_blank" rel="noopener noreferrer">¶{n}</a>
  ))}
</div>
```

- **Two-accent rule:** the `¶` links are **interactive → purple** (`--purple`), like
  every other tappable thing; the "CCC" label is muted text, not gold. No honor mark
  here — this is an action, not a sacrament.
- Long lists (a few verses cite 8–10 ¶): wrap, with a soft cap of the first ~8 and a
  "+N more" that expands (no truncation of data, just of first paint).

---

## 7. Settings — a new "Magisterium" reference section

§5 gets its **own quiet "Magisterium" section** in Settings (not folded into Commentary)
— a *reference* area the later conciliar-citation tier will also live in. Fidelis stays
**first a Bible app** — the daily readings, the Verse of the Day, the Father/Doctor/
Pope/Saint quote — so this section is understated and additive, never a second center of
gravity (and §5 adds nothing to the Today page; the five-card rule holds).

- `cccLinksEnabled: boolean` (default `true`) added to the `Settings` interface +
  defaults (merge-safe via `...read("settings", {})` — no migration), flowed through
  `SettingsContext` (type-only import where needed).
- The section's one row today: **"Catechism cross-references"** — *"Show CCC paragraph
  links in the verse actions. Links open vatican.va."* The vatican.va note doubles as the
  honest disclosure that the text isn't bundled. (The conciliar tier later adds rows here.)

---

## 8. Accessibility (§10)

- The row is a labeled list of real `<a>` links; each reads "CCC paragraph 219, link."
- External links carry `rel="noopener noreferrer"`; opening a new tab is announced.
- Purple-on-bg link color uses the existing `--purple` token (already AA).
- No motion; `prefers-reduced-motion` honored by construction.

---

## 9. Test plan (`scripts/test-data.ts`, new §19 after §18)

Reading the committed `ccc/{index,url}.json` and importing the pure key helpers:
1. **Shape** — `index.json` values are non-empty integer arrays, sorted+deduped, each
   ¶ ∈ [1, 2865]; `url.json` keys are a superset of every ¶ referenced in the index.
2. **Keys resolve** — every key parses to a real `slug` in `bookMeta.json` and a
   `chapter:verse` within that book's counts (no dangling citations).
3. **Psalm mapping (A5)** — a known CCC Psalm citation lands on the **Vulgate** key
   (e.g. the CCC's "Ps 23" → `psalms 22`), asserted by a fixed sample.
4. **Anchor sample** — a fixed set of famous citations is present and correct
   (e.g. `john 3:16` → includes 219/444; `genesis 1:1` → includes 268/279/290 ish — the
   exact numbers pinned from the PDF during build, not invented here).
5. **URL well-formedness** — every `url.json` value is an `https://www.vatican.va/…`
   URL (string + host check; liveness checked in the build, not the offline harness).
6. **Manifest** — both files are in `manifest.json` and pass the hash-walk.

Then `npm test` + `npm run build` green, and a **manual run** (`/verify`) to see the
CCC row render, wrap, and open the right vatican.va page in a real browser.

---

## 10. Files touched (at build, step 3)

| File | Change |
|------|--------|
| `scripts/build-ccc.mjs` | **new** — parse index + resolve URLs + write JSON |
| `scripts/pins.mjs` | pin the Vatican crawl source (if networked) |
| `public/data/ccc/index.json`, `url.json` | **new** data (sealed) |
| `public/data/manifest.json` | re-sealed (root hash moves) |
| `src/lib/data.ts` | `+ loadCCC()` (index + url), types |
| `src/lib/ccc.ts` | **new** — key builder, the `+N more` cap, pure & tested |
| `src/pages/Reader.tsx` | the action-bar CCC row |
| `src/lib/storage.ts`, `src/SettingsContext.tsx`, `src/pages/Settings.tsx` | `cccLinksEnabled` |
| `src/styles.css` | `.ccc-row`/`.ccc-ref`/`.ccc-label` (purple links) |
| `scripts/test-data.ts` | `+ §19` assertions (§17 reference parser and §18 search group-filters already exist) |
| `package.json` (`ccc` script + version), `CHANGELOG.md`, `CLAUDE.md`, `README.md`, About | record the release |

---

## 11. Versification & data caveats (documented, like the commentary layer)

- **Psalms** are mapped Hebrew→Vulgate (A5), so Psalm citations are *correct*, not
  merely "off by one" — the improvement over §4.2's documented-only offset.
- A handful of non-Psalm books differ between modern and Vulgate chapter/verse splits
  (e.g. Joel 3/4, Malachi 3/4, the 3–4 Kings naming). The build passes these through and
  the report notes any citation key that fails the "resolves to a real verse" check, to
  be hand-mapped or dropped honestly — never silently mis-pointed.
- The CCC also cites the **deuterocanon** and the Greek portions of Esther/Daniel — all
  present in our 73-book canon, so those citations key cleanly (a Catholic-canon win).

---

## 12. The Today page & the five-card rule

Untouched. §5 adds nothing to Today; it lives entirely in the Reader's verse actions and
one Settings row. The five-card invariant and the two-accent rule both hold.

---

## 13. Sign-off — resolved 2026-06-15

1. **Index source / handoff (A1):** ✅ **USCCB 2nd Ed** authoritative; Ascension a
   cross-check. The product owner provides the *Index of Citations* via a **direct HTTPS
   URL the PDF viewer can open** (raw PDF bytes, not a preview page — e.g. a Dropbox
   `?dl=1` link or a no-account temp-host direct link), ideally **only the appendix
   pages** so no body text travels. I read it with the PDF viewer and parse the facts.
2. **URL target (A3):** ✅ **vatican.va** confirmed.
3. **Settings placement (A7):** ✅ §5 gets its **own "Magisterium" reference section** (§7).
4. **Release framing:** ✅ its own **v1.9.0** — proposed name **"the deposit"**
   (*depositum fidei*, the deposit of faith the Catechism guards); trivial to rename.

**Remaining gate before step 3:** the Index-of-Citations handoff (item 1). Everything
else is locked.

---

## 14. Known limitations / deferred

- **CCC text** — never bundled; the future "importable" feature is v2.0, separate.
- **Conciliar / other-Magisterium citations** (A6) — later PR, identical pattern.
- **Per-¶ deep anchors** — only where vatican.va exposes them; otherwise page-level.
- **Offline note** — the SW caches the two JSON files on first use like any `/data/`
  asset; the vatican.va pages themselves require connectivity (they are not ours to cache).
