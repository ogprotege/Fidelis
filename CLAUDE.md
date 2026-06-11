# CLAUDE.md — Fidelis

Catholic Bible app (DRB, CPDV, Clementine Vulgate) with liturgical calendar and
daily Mass readings. Companion documents:
`docs/review/Fidelis_Code_Review_V1_2026-06-11.md` (the repair manual) and
`docs/review/Fidelis_Feature_Design_Spec_V1_2026-06-11.md` (the growth plan).

## Commands

```sh
npm run build                          # type-check (tsc) + Vite build
npx tsx scripts/test-liturgical.ts     # liturgical engine harness (trap-year acceptance cases)
npx tsx scripts/test-data.ts           # committed-data harness (bundles, psalm spans, lectionary)
```

## Open review items

### P0 — worship-facing accuracy (all fixed)

- **P0-1:** Fixed (3993dc9) — rank engine with precedence and transfer in `src/lib/liturgical.ts`.
- **P0-2:** Fixed (3993dc9) — day codes derive from the calendar engine's resolved governing celebration.
- **P0-3:** Fixed — `hebrewSpanToVulgate()` in `src/lib/lectionary.ts` maps lectionary psalm spans (modern chapters, English-style verses) onto the Vulgate-versified bundle grid: per-psalm title offsets, the 9/10, 113/114-115, 114-115/116 and 146-147/147 split cases, and nine mid-psalm join/split irregulars. Verse alignment is asserted by incipit in `scripts/test-data.ts`.

### P1 — correctness and integrity (fix before TestFlight)

- **P1-4:** Fixed — grid-empty verse slots are skipped in Reader (both columns), Search, and VerseQuote; fully-empty chapters (the five appendix books, textless in the source corpus in every bundle) show an honest notice. `scripts/build-report.mjs` (run by `npm run data` / `npm run report`) emits the committed `data-report.txt` audit: 1,438 appendix placeholder slots + 17 scattered slots; report↔data sync asserted in `scripts/test-data.ts`. About/BookList/README copy corrected (Clementine appendix attribution, grid honesty). The audit surfaced 3 DRC corpus defects (printed 3 Kings 17:11, Prov 30:19, Bar 6:7 absent outright; their slots hold misfiled verses) — documented in the report and About; correcting the corpus itself folds into P1-10.
- **P1-5:** Fixed — `calendarRegion` setting (`universal` | `usa`, default universal) in `storage.ts`, read lazily by both engines (`currentRegion()`); explicit region params keep them testable. USA: Epiphany on the Sunday of Jan 2–8 (`epiphanyDate`), Baptism to Monday when Epiphany lands Jan 7–8 (OT week 1 then anchors on the Epiphany Sunday), Ascension on the Seventh Sunday of Easter, the Guadalupe Feast, and all six USA obligatory memorials (Seton, Neumann, Kateri, Claver, Brébeuf/Jogues, Cabrini). Epiphany left `FIXED` for `movableDefs` and the label dropped "(traditional date)" (closes P2-5); Guadalupe moved to `USA_FIXED` (was over-ranked universally). Region select on the Readings toolbar; About documents the transfers incl. the five Thursday-Ascension provinces. 30+ acceptance checks in `test-liturgical.ts`; the gospel sweep in `test-data.ts` runs both regions.
- **P1-6:** Memorials with proper readings are never used because the ferial group always wins; the prescribed propers (e.g., St. Barnabas) should surface.
- **P1-7:** Fixed — `displayReadings()` in `src/lib/lectionary.ts` lays out ordered, labeled sections. Easter Vigil (`LW06-6Sat` codes): Reading I–VII / Epistle with each psalm interleaved after its reading, shorter forms as "or (shorter form)", Gospel last, plus a safety net for unclaimed rows. General days: an `x.N1` same-book row is the shorter form of its `x.N` primary; genuine options keep the option labels. `Readings.tsx` renders the helper's sections. Full 21-label Vigil sequence, Palm Sunday short Passion, and option/shorter-form discrimination asserted in `scripts/test-data.ts`.
- **P1-8:** Fixed — once the target text loads, `Reader.tsx` clamps an out-of-range chapter to the translation's real `data.chapters.length` (replace-navigation to the last chapter); the "Loading…" state now shows only while data is genuinely loading, and a chapter absent from the loaded translation gets an honest notice (also covers the degenerate zero-chapter case, where no redirect fires).
- **P1-9:** Fixed — `dayOfYear()` in `src/lib/votd.ts` is now pure calendar-component math (month-offset table + Gregorian leap rule incl. the century exception), exported for tests; the selection formula is unchanged so the cycle never reshuffles. The iOS widget pins `Calendar(identifier: .gregorian)` (was `Calendar.current`, which would diverge on non-Gregorian device calendars). Harness 7a: ordinal sweep over 7 trap years, a no-millisecond-math source guard, and web↔Swift formula/cycle parity checks (`votd.json` length + first entry).
- **P1-10:** The data pipeline fetches unpinned upstream `master` with no integrity manifest — pin commit SHAs and emit/verify a SHA-256 `manifest.json`.

## Standing rules

1. **Never hand-edit any file under `public/data/`.** The texts regenerate only via `scripts/build-data.mjs`.
2. **The Today page never exceeds five cards.** A new feature earns a line inside an existing card or lives on another tab.
3. **Section 13 of the design spec (the refusal list) is binding:** no accounts or cloud sync, no AI summaries/paraphrase/chat, no social layer, no streaks/badges/progress theater, no ads or in-app purchases, no notification pressure, no red-letter text or inspirational stock imagery.
