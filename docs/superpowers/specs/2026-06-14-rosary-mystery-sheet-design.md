# Design Spec — Rosary Mystery Sheets (v1.2 B1)

[← Docs index](../../INDEX.md)

**Release label:** `v1.2 B1: rosary mystery sheets with the traditional prayers`
**Version bump:** `package.json` 1.3.0 → **1.4.0** (feature; dev-step bump, mirrors the v1.1 A-step precedent)
**Branch:** `v1.2-daily-soul`
**Spec source:** Feature Design Spec §6 (Today recomposition), card 4 upgrade — deferred item now implemented.
**Date:** 2026-06-14

---

## 1. Purpose

Upgrade the Today page's **card 4 ("The Holy Rosary")** from an inert list of mystery
titles + Scripture links into a quiet, usable prayer surface: tapping a mystery opens a
**bottom-sheet** showing that mystery's **Scripture passage rendered verbatim from the
user's current translation**, and, collapsed beneath it, the **five traditional rosary
prayers** (Pater Noster, Ave Maria, Gloria Patri, the Fatima Prayer, Salve Regina) in
**Latin and English**.

Design north star (from the spec and the user): **a prayer book, not a toy.** No audio,
no beads animation, no motion theater. Static, legible, reverent.

### Acceptance criteria (binding)

1. The mystery passage text **matches the Reader** for the same reference, in the same
   translation. This is guaranteed structurally: both render through one shared pure
   function (`passageText`), not by coincidence.
2. `npm test` green (existing harnesses + new Rosary assertions).
3. `npm run build` green (`tsc --noEmit` + Vite).
4. The Today page **still has exactly five cards** (standing rule 2). The sheet is an
   overlay, not a sixth card.
5. No violation of standing rule 3 (no audio, no animation, no toy).

---

## 2. Architecture & data flow

```
Home.tsx (card 4)
  rosary = mysteriesForDate(today)            ← unchanged pure fn (weekday → set)
  render the day's 5 mysteries as <button>s   ← was inert <li> + Link
        │ onClick(mystery)  → setOpenMystery(mystery)
        ▼
  <Sheet open onClose>                         ← new reusable bottom-sheet primitive
      <MysterySheet mystery translation>       ← new content component
         ├─ header:  ✠  <title>            ✕   (close)
         ├─ citation: e.g. "Luke 1:26–38"
         ├─ passage:  verbatim Scripture (current translation, scripture font)
         ├─ — divider —
         └─ <details> × 5  (collapsed):  the five prayers, Latin + English
```

**Passage parity (the core guarantee).** The Reader renders a chapter by iterating
`data.chapters[chapter-1]` and skipping any verse whose text is empty/whitespace
(grid-empty slots, per P1-4). `VerseQuote` already replicates that slice+filter+join
inline. We extract that one expression into a pure helper:

```ts
// src/lib/passage.ts
export function passageText(
  data: BookData,
  chapter: number,
  verse: number,
  end?: number
): string {
  const ch = data.chapters[chapter - 1] ?? [];
  const last = Math.min(end ?? verse, ch.length);
  return ch.slice(verse - 1, last).filter((s) => s && s.trim()).join(" ");
}
```

`VerseQuote` is refactored to call it (no behavior change), the mystery sheet calls it,
and the test calls it. One source of truth → the sheet cannot drift from the Reader.

---

## 3. Files

### New

| File | Responsibility |
|---|---|
| `src/lib/passage.ts` | Pure `passageText(data, chapter, verse, end?)` — the shared slice+filter+join. |
| `src/lib/prayers.ts` | The five rosary prayers as public-domain Latin+English constants (`Prayer[]`), mirroring the Antiphon `{la, en}` convention. |
| `src/components/Sheet.tsx` | Reusable bottom-sheet primitive (modal semantics, a11y, dismissal). Generic — reusable for the future §4 commentary layer. |
| `src/components/MysterySheet.tsx` | Sheet *content*: title, citation, passage (current translation), 5 collapsed prayer `<details>`. |

### Changed

| File | Change |
|---|---|
| `src/lib/rosary.ts` | Extend `Mystery` with optional `end?: number`. Re-point + extend all 20 refs to the curated ranges in §6. `mysteriesForDate` untouched. |
| `src/components/VerseQuote.tsx` | Refactor to call `passageText` (identical output). |
| `src/pages/Home.tsx` | Card 4: mysteries become tappable buttons; add `openMystery` state; render `<Sheet>`. Citation label shows the full range (`1:26–38`). Stays one card. |
| `src/styles.css` | `.sheet`, `.sheet-backdrop`, prayer `<details>` (`.prayer`, `.prayer-la`, `.prayer-en`), tappable `.rosary-list button` styling. Tokens only; two-accent rule honored. |
| `scripts/test-data.ts` | New Rosary assertion block (§5). |
| `CHANGELOG.md` | New `1.4.0 — v1.2 B1` entry. |
| `package.json` | `version` 1.3.0 → 1.4.0. |

### Data model change (`rosary.ts`)

```ts
export interface Mystery {
  title: string;
  /** Scripture for meditation: [bookSlug, chapter, startVerse] */
  ref: [string, number, number];
  /** Passage end verse (inclusive). Omit for a single-verse passage. */
  end?: number;
}
```

---

## 4. The Sheet component (UX, a11y, motion)

A single reusable `Sheet` primitive:

- **Layout:** a panel anchored to the bottom of the viewport over a **dimmed backdrop**
  (`.sheet-backdrop`, `var(--bg-0)`-derived translucent overlay). On wide screens it is
  centered with a max-width; on phones it spans full width and respects
  `env(safe-area-inset-bottom)`. Max-height ~85vh with internal scroll for long content.
- **Dismissal:** Escape, backdrop click/tap, and the **✕** button all close it.
- **Focus:** on open, focus moves into the sheet (the close button); a basic focus trap
  keeps Tab within the sheet; on close, focus returns to the triggering mystery button
  (the TabBar "More" popover already establishes this pattern — we reuse it).
- **Semantics:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby` → the mystery
  title. Body scroll is locked while open.
- **z-index:** 60 — above header (45 mobile / 30 desktop) and the More popover (50).
- **Motion:** **none.** The sheet appears without a slide/animation (standing rule 3,
  and the user's explicit "no brief / prayer book, not a toy" intent extends to no
  motion theater). Any future opacity transition must be gated behind
  `@media (prefers-reduced-motion: no-preference)`; the default is static.

`MysterySheet` is the content placed inside it: the mystery title (gold ✠ honor mark),
the citation, the passage in the scripture font/current translation, a hairline divider,
then the five prayers each in a collapsed `<details>` (▸), Latin italic over English —
reusing the established Antiphon side-by-side text pattern.

### Two-accent rule (binding)

- **Purple acts:** the ✕ close button, the `<details>` disclosure triangles, any link.
- **Gold honors:** the ✠ before the title, the quotation marks around the passage,
  the "Prayers" section label (small-caps).
- No element wears both. No raw hex outside the `styles.css` token blocks.

---

## 5. Testing

Added to `scripts/test-data.ts` (the existing `check(name, ok, detail)` harness — the
codebase has no DOM/component test runner, and this stays consistent with how VOTD,
fonts, and icons are asserted).

1. **Every mystery resolves in every bundled translation.** For all 20 mysteries ×
   {`drc`, `cpdv`, `vulgate`}, load the book and assert `passageText(...)` is non-empty.
   Catches a mistyped ref or a range landing entirely on empty slots — the same strict
   standard the harness already applies to lectionary spans.
2. **Reader parity.** For each mystery, assert `passageText(data, ...)` equals an
   independent inline recompute of the Reader's exact filter
   (`chapters[ch-1].slice(v-1, end).filter(s => s && s.trim()).join(" ")`). Since the
   UI renders through `passageText`, this proves the sheet matches the Reader.
3. **Prayer integrity.** All five prayers present; each has non-empty `la` and `en`;
   each ends in "Amen." (Latin and English).
4. **Five-card guard.** If a lightweight structural assertion on Home's card count is
   feasible without a DOM runtime, add it; otherwise the five-card invariant is verified
   by manual review of `Home.tsx` (the sheet is an overlay, not a card) and recorded here.

**Golden snapshots are untouched.** The Rosary is a pure weekday lookup with zero
calendar-date logic; it does not belong in the calendar golden, and this is a
content/UI release with no engine drift. `npm run golden` is **not** run.

---

## 6. The 20 passage ranges (curated, fuller — no brief)

Vulgate psalm numbering preserved (Assumption). Book slugs are canonical (`getBook`).

### Joyful (Mon, Sat) — *Mysteria Gaudiosa*
| # | Mystery | Passage | ref / end |
|---|---|---|---|
| 1 | The Annunciation | Luke 1:26–38 | `["luke",1,26]` end 38 |
| 2 | The Visitation | Luke 1:39–56 *(incl. Magnificat)* | `["luke",1,39]` end 56 |
| 3 | The Nativity | Luke 2:1–20 | `["luke",2,1]` end 20 |
| 4 | The Presentation in the Temple | Luke 2:22–38 *(Simeon + Anna)* | `["luke",2,22]` end 38 |
| 5 | The Finding in the Temple | Luke 2:41–52 | `["luke",2,41]` end 52 |

### Luminous (Thu) — *Mysteria Luminosa*
| # | Mystery | Passage | ref / end |
|---|---|---|---|
| 1 | The Baptism in the Jordan | Matthew 3:13–17 | `["matthew",3,13]` end 17 |
| 2 | The Wedding at Cana | John 2:1–11 | `["john",2,1]` end 11 |
| 3 | The Proclamation of the Kingdom | Mark 1:14–20 | `["mark",1,14]` end 20 |
| 4 | The Transfiguration | Matthew 17:1–9 | `["matthew",17,1]` end 9 |
| 5 | The Institution of the Eucharist | Matthew 26:26–30 | `["matthew",26,26]` end 30 |

### Sorrowful (Tue, Fri) — *Mysteria Dolorosa*
| # | Mystery | Passage | ref / end |
|---|---|---|---|
| 1 | The Agony in the Garden | Matthew 26:36–46 | `["matthew",26,36]` end 46 |
| 2 | The Scourging at the Pillar | Matthew 27:20–26 *(moved from Jn 19:1 — fuller)* | `["matthew",27,20]` end 26 |
| 3 | The Crowning with Thorns | Matthew 27:27–31 | `["matthew",27,27]` end 31 |
| 4 | The Carrying of the Cross | Luke 23:26–32 *(moved from Jn 19:16 — Simon + the daughters)* | `["luke",23,26]` end 32 |
| 5 | The Crucifixion | Luke 23:33–46 | `["luke",23,33]` end 46 |

### Glorious (Sun, Wed) — *Mysteria Gloriosa*
| # | Mystery | Passage | ref / end |
|---|---|---|---|
| 1 | The Resurrection | Matthew 28:1–10 | `["matthew",28,1]` end 10 |
| 2 | The Ascension | Acts 1:6–11 | `["acts",1,6]` end 11 |
| 3 | The Descent of the Holy Spirit | Acts 2:1–11 | `["acts",2,1]` end 11 |
| 4 | The Assumption of Mary | Psalms 44:10–18 *(Vulgate; royal-bride typology — no NT narrative exists)* | `["psalms",44,10]` end 18 |
| 5 | The Coronation of Mary | Revelation 12:1–6 | `["revelation",12,1]` end 6 |

`passageText` clamps `end` to the chapter length, so any translation whose chapter is
shorter simply renders to its last verse — never an error. Test #1 still requires the
result be non-empty in every bundled translation.

---

## 7. The five prayers (public-domain text, for review)

Stored in `src/lib/prayers.ts` as `Prayer[]` (`{ id, title, la, en }`). Traditional
texts; English in the customary Catholic ("thee/thou") form to match the app's voice.

1. **Pater Noster / Our Father**
   - *LA:* "Pater noster, qui es in cælis, sanctificétur nomen tuum. Advéniat regnum tuum. Fiat volúntas tua, sicut in cælo et in terra. Panem nostrum quotidiánum da nobis hódie, et dimítte nobis débita nostra, sicut et nos dimíttimus debitóribus nostris. Et ne nos indúcas in tentatiónem, sed líbera nos a malo. Amen."
   - *EN:* "Our Father, who art in heaven, hallowed be thy name; thy kingdom come; thy will be done on earth as it is in heaven. Give us this day our daily bread, and forgive us our trespasses, as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen."

2. **Ave Maria / Hail Mary**
   - *LA:* "Ave María, grátia plena, Dóminus tecum. Benedícta tu in muliéribus, et benedíctus fructus ventris tui, Iesus. Sancta María, Mater Dei, ora pro nobis peccatóribus, nunc et in hora mortis nostræ. Amen."
   - *EN:* "Hail Mary, full of grace, the Lord is with thee; blessed art thou amongst women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen."

3. **Gloria Patri / Glory Be**
   - *LA:* "Glória Patri, et Fílio, et Spirítui Sancto. Sicut erat in princípio, et nunc, et semper, et in sǽcula sæculórum. Amen."
   - *EN:* "Glory be to the Father, and to the Son, and to the Holy Ghost. As it was in the beginning, is now, and ever shall be, world without end. Amen."

4. **Oratio Fatimæ / The Fatima Prayer ("O My Jesus")**
   - *LA:* "O mi Iesu, dimítte nobis debíta nostra, líbera nos ab igne inférni, condúc in cælum omnes ánimas, præsértim illas quæ misericórdiæ tuæ máxime índigent. Amen."
   - *EN:* "O my Jesus, forgive us our sins, save us from the fires of hell; lead all souls to heaven, especially those in most need of thy mercy. Amen."

5. **Salve Regina / Hail Holy Queen**
   - *LA:* "Salve, Regína, Mater misericórdiæ, vita, dulcédo, et spes nostra, salve. Ad te clamámus, éxsules fílii Hevæ. Ad te suspirámus, geméntes et flentes in hac lacrimárum valle. Eia ergo, advocáta nostra, illos tuos misericórdes óculos ad nos convérte. Et Iesum, benedíctum fructum ventris tui, nobis post hoc exsílium osténde. O clemens, o pia, o dulcis Virgo María. Amen."
   - *EN:* "Hail, holy Queen, Mother of mercy, our life, our sweetness, and our hope. To thee do we cry, poor banished children of Eve. To thee do we send up our sighs, mourning and weeping in this valley of tears. Turn then, most gracious advocate, thine eyes of mercy toward us; and after this our exile, show unto us the blessed fruit of thy womb, Jesus. O clement, O loving, O sweet Virgin Mary. Amen."

---

## 8. Standing rules honored

- **Rule 1** (never hand-edit `public/data/`): prayers and ranges are editorial TS
  constants in `src/lib`, not generated data. ✓
- **Rule 2** (Today ≤ five cards): the sheet is an overlay; card 4 stays one card. ✓
- **Rule 3** (refusal list): no audio, no animation, no toy; reverent prayer surface. ✓
- **Two-accent rule** (purple acts / gold honors): enforced in §4. ✓

---

## 9. Out of scope (YAGNI)

- No "pray the full rosary" guided flow, decade counter, or beads UI.
- No notifications, no audio, no Latin/English toggle setting (both shown together).
- No new tab or route; no Settings additions.
- The other four Today cards are untouched.
- All 20 mysteries are reachable only via the day's set on the card (no mystery browser).

---

## 10. Open confirmations for the user

1. The **20 ranges** in §6 (especially the moved refs: Scourging → Mt 27:20–26,
   Carrying → Lk 23:26–32; and Assumption → Ps 44:10–18, Coronation → Rev 12:1–6).
2. The **prayer wording** in §7.
3. **Version 1.4.0** for the `package.json` bump under the `v1.2 B1` label.
