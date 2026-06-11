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

### P0 — worship-facing accuracy (fix before anyone else uses this)

- **P0-1:** The liturgical engine (`src/lib/liturgical.ts`) has no precedence or transfer logic — impeded solemnities vanish instead of transferring, conflicting celebrations both display, and Good Friday can render white under the Annunciation.
- **P0-2:** The lectionary resolver (`src/lib/lectionary.ts`) applies no season gate on weekdays, so solemnity propers defeat Holy Week and the Triduum — the Annunciation Mass would display instead of the Passion on Good Friday 2016.
- **P0-3:** Responsorial Psalms render the wrong verses on most days because Hebrew lectionary verse numbers are applied chapter-only to Vulgate-versified text — Ash Wednesday shows the Miserere's superscription instead of "Have mercy on me, O God."

### P1 — correctness and integrity (fix before TestFlight)

- **P1-4:** The bundles share one forced verse grid that drifts from printed Douay versification, and ~1,450 grid-empty verses per translation render as blank numbered spans.
- **P1-5:** No calendar region setting — United States transfers (Epiphany to Sunday, Ascension to the Seventh Sunday of Easter) are absent, so the app disagrees with American parishes twice a year.
- **P1-6:** Memorials with proper readings are never used because the ferial group always wins; the prescribed propers (e.g., St. Barnabas) should surface.
- **P1-7:** The Easter Vigil renders its nine readings all labeled "First Reading — option N" instead of the Reading I–VII / Epistle / Gospel ladder with interleaved psalms.
- **P1-8:** The Reader can hang forever on "Loading the sacred text…" when switching to a translation with fewer chapters, because the chapter clamps against the cross-translation max.
- **P1-9:** Verse-of-the-day drifts between web and the iOS widget for the first hour after a DST spring-forward (millisecond day-of-year arithmetic vs. `Calendar.ordinality`).
- **P1-10:** The data pipeline fetches unpinned upstream `master` with no integrity manifest — pin commit SHAs and emit/verify a SHA-256 `manifest.json`.

## Standing rules

1. **Never hand-edit any file under `public/data/`.** The texts regenerate only via `scripts/build-data.mjs`.
2. **The Today page never exceeds five cards.** A new feature earns a line inside an existing card or lives on another tab.
3. **Section 13 of the design spec (the refusal list) is binding:** no accounts or cloud sync, no AI summaries/paraphrase/chat, no social layer, no streaks/badges/progress theater, no ads or in-app purchases, no notification pressure, no red-letter text or inspirational stock imagery.
