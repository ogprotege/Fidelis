# Rosary Mystery Sheets Implementation Plan

[← Docs index](../../INDEX.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Today card 4 so tapping a mystery opens a bottom-sheet showing its Scripture passage (verbatim, current translation) and, collapsed beneath, the five traditional rosary prayers in Latin and English.

**Architecture:** A pure `passageText` helper becomes the single source of truth for verse-range text (shared by `VerseQuote`, the sheet, and the test). A reusable `Sheet` primitive supplies modal bottom-sheet semantics; `MysterySheet` is its content. `rosary.ts` gains an `end?` verse so each mystery is a fuller passage. All assertions go in the existing `scripts/test-data.ts` harness — there is no DOM test runner.

**Tech Stack:** React + TypeScript + Vite; `tsx`/Node assertion harness; CSS custom-property token system.

**Commit policy:** This repo commits only when the user asks. Each task below lists a commit step for completeness, but at execution the work is staged and the user approves the commit(s). Default: one squashed commit titled `v1.2 B1: rosary mystery sheets with the traditional prayers` after all tests pass.

**Harness gotchas baked in:** `✠` is on the no-emoji `FORBIDDEN` list — never render it. Use `✕` for close (Reader precedent). No raw hex/`rgba` outside the `styles.css` token blocks — the backdrop uses a new `--scrim` token. Golden snapshots are NOT touched (pure weekday lookup, no calendar drift).

---

## File structure

| File | Responsibility | New? |
|---|---|---|
| `src/lib/passage.ts` | Pure `passageText(data, chapter, verse, end?)` — slice + grid-empty filter + join, end clamped. | Create |
| `src/lib/prayers.ts` | `PRAYERS: Prayer[]` — five public-domain Latin/English prayers. | Create |
| `src/components/Sheet.tsx` | Reusable bottom-sheet modal (a11y, dismissal, no motion). | Create |
| `src/components/MysterySheet.tsx` | Sheet content: title, citation, passage, Reader link, 5 prayer disclosures. | Create |
| `src/components/VerseQuote.tsx` | Refactor to call `passageText`. | Modify |
| `src/lib/rosary.ts` | Add `Mystery.end?`; re-curate all 20 ranges. | Modify |
| `src/pages/Home.tsx` | Card 4 mysteries → buttons; sheet open/close state. | Modify |
| `src/styles.css` | `--scrim` token; sheet/prayer/button styles (two-accent). | Modify |
| `scripts/test-data.ts` | Rosary passage + prayer + five-card + two-accent assertions. | Modify |
| `CHANGELOG.md`, `package.json` (+lock) | 1.4.0 entry + version bump. | Modify |

---

## Task 1: `passageText` helper + `VerseQuote` refactor

**Files:**
- Create: `src/lib/passage.ts`
- Modify: `src/components/VerseQuote.tsx:1-35`
- Test: `scripts/test-data.ts` (added in Task 6)

- [ ] **Step 1: Create `src/lib/passage.ts`**

```ts
import { BookData } from "./data";

/**
 * The verbatim text of a verse range from a loaded book, exactly as the Reader
 * renders it: grid-empty slots (see data-report.txt, P1-4) are dropped, the
 * rest joined by a single space. `end` is inclusive and clamped to the chapter
 * length, so a translation with a shorter chapter renders to its last verse
 * rather than erroring. Single source of truth for VerseQuote, the rosary
 * mystery sheet, and the harness — so the sheet can never drift from the Reader.
 */
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

- [ ] **Step 2: Refactor `VerseQuote.tsx` to use it**

Replace the import block and the `.then` body. New top imports:

```ts
import { useEffect, useState } from "react";
import { loadBook } from "../lib/data";
import { passageText } from "../lib/passage";
```

Replace lines 23-29 (`.then((data) => { ... setText(parts.join(" ")); })`) with:

```ts
      .then((data) => {
        if (!alive) return;
        setText(passageText(data, chapter, verse, endVerse));
      })
```

(Behavior is identical — the inline slice/filter/join moved into `passageText`.)

- [ ] **Step 3: Type-check**

Run: `npm run build`
Expected: PASS (`tsc --noEmit` clean, Vite build succeeds).

- [ ] **Step 4: Commit**

```bash
git add src/lib/passage.ts src/components/VerseQuote.tsx
git commit -m "v1.2 B1: extract passageText, the shared verse-range renderer"
```

---

## Task 2: Re-curate the 20 mystery ranges (`rosary.ts`)

**Files:**
- Modify: `src/lib/rosary.ts:3-60`
- Test: `scripts/test-data.ts` (Task 6)

- [ ] **Step 1: Add `end?` to the `Mystery` interface** (lines 3-7)

```ts
export interface Mystery {
  title: string;
  /** Scripture for meditation: [bookSlug, chapter, startVerse]. */
  ref: [string, number, number];
  /** Passage end verse (inclusive). Omit for a single-verse passage. */
  end?: number;
}
```

- [ ] **Step 2: Replace `MYSTERY_SETS` (lines 15-60) with the fuller ranges**

```ts
export const MYSTERY_SETS: Record<MysterySet["name"], MysterySet> = {
  Joyful: {
    name: "Joyful",
    latin: "Mysteria Gaudiosa",
    mysteries: [
      { title: "The Annunciation", ref: ["luke", 1, 26], end: 38 },
      { title: "The Visitation", ref: ["luke", 1, 39], end: 56 },
      { title: "The Nativity", ref: ["luke", 2, 1], end: 20 },
      { title: "The Presentation in the Temple", ref: ["luke", 2, 22], end: 38 },
      { title: "The Finding in the Temple", ref: ["luke", 2, 41], end: 52 }
    ]
  },
  Luminous: {
    name: "Luminous",
    latin: "Mysteria Luminosa",
    mysteries: [
      { title: "The Baptism in the Jordan", ref: ["matthew", 3, 13], end: 17 },
      { title: "The Wedding at Cana", ref: ["john", 2, 1], end: 11 },
      { title: "The Proclamation of the Kingdom", ref: ["mark", 1, 14], end: 20 },
      { title: "The Transfiguration", ref: ["matthew", 17, 1], end: 9 },
      { title: "The Institution of the Eucharist", ref: ["matthew", 26, 26], end: 30 }
    ]
  },
  Sorrowful: {
    name: "Sorrowful",
    latin: "Mysteria Dolorosa",
    mysteries: [
      { title: "The Agony in the Garden", ref: ["matthew", 26, 36], end: 46 },
      { title: "The Scourging at the Pillar", ref: ["matthew", 27, 20], end: 26 },
      { title: "The Crowning with Thorns", ref: ["matthew", 27, 27], end: 31 },
      { title: "The Carrying of the Cross", ref: ["luke", 23, 26], end: 32 },
      { title: "The Crucifixion", ref: ["luke", 23, 33], end: 46 }
    ]
  },
  Glorious: {
    name: "Glorious",
    latin: "Mysteria Gloriosa",
    mysteries: [
      { title: "The Resurrection", ref: ["matthew", 28, 1], end: 10 },
      { title: "The Ascension", ref: ["acts", 1, 6], end: 11 },
      { title: "The Descent of the Holy Spirit", ref: ["acts", 2, 1], end: 11 },
      { title: "The Assumption of Mary", ref: ["psalms", 44, 10], end: 18 },
      { title: "The Coronation of Mary", ref: ["revelation", 12, 1], end: 6 }
    ]
  }
};
```

- [ ] **Step 3: Type-check**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/rosary.ts
git commit -m "v1.2 B1: extend rosary mysteries to fuller meditation passages"
```

---

## Task 3: The five prayers (`prayers.ts`)

**Files:**
- Create: `src/lib/prayers.ts`
- Test: `scripts/test-data.ts` (Task 6)

- [ ] **Step 1: Create `src/lib/prayers.ts`**

```ts
/** The traditional prayers of the Most Holy Rosary, Latin and English.
 *  Public-domain texts; the English follows the customary Catholic
 *  ("thee/thou") form to match the app's voice. Not Scripture — fixed
 *  editorial constants, so they never pass through the translation pipeline. */

export interface Prayer {
  id: string;
  /** Disclosure heading, "Latin · English". */
  title: string;
  la: string;
  en: string;
}

export const PRAYERS: Prayer[] = [
  {
    id: "pater",
    title: "Pater Noster · Our Father",
    la: "Pater noster, qui es in cælis, sanctificétur nomen tuum. Advéniat regnum tuum. Fiat volúntas tua, sicut in cælo et in terra. Panem nostrum quotidiánum da nobis hódie, et dimítte nobis débita nostra, sicut et nos dimíttimus debitóribus nostris. Et ne nos indúcas in tentatiónem, sed líbera nos a malo. Amen.",
    en: "Our Father, who art in heaven, hallowed be thy name; thy kingdom come; thy will be done on earth as it is in heaven. Give us this day our daily bread, and forgive us our trespasses, as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen."
  },
  {
    id: "ave",
    title: "Ave Maria · Hail Mary",
    la: "Ave María, grátia plena, Dóminus tecum. Benedícta tu in muliéribus, et benedíctus fructus ventris tui, Iesus. Sancta María, Mater Dei, ora pro nobis peccatóribus, nunc et in hora mortis nostræ. Amen.",
    en: "Hail Mary, full of grace, the Lord is with thee; blessed art thou amongst women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen."
  },
  {
    id: "gloria",
    title: "Gloria Patri · Glory Be",
    la: "Glória Patri, et Fílio, et Spirítui Sancto. Sicut erat in princípio, et nunc, et semper, et in sǽcula sæculórum. Amen.",
    en: "Glory be to the Father, and to the Son, and to the Holy Ghost. As it was in the beginning, is now, and ever shall be, world without end. Amen."
  },
  {
    id: "fatima",
    title: "Oratio Fatimæ · The Fatima Prayer",
    la: "O mi Iesu, dimítte nobis debíta nostra, líbera nos ab igne inférni, condúc in cælum omnes ánimas, præsértim illas quæ misericórdiæ tuæ máxime indígent. Amen.",
    en: "O my Jesus, forgive us our sins, save us from the fires of hell; lead all souls to heaven, especially those in most need of thy mercy. Amen."
  },
  {
    id: "salve",
    title: "Salve Regina · Hail Holy Queen",
    la: "Salve, Regína, Mater misericórdiæ, vita, dulcédo, et spes nostra, salve. Ad te clamámus, éxsules fílii Hevæ. Ad te suspirámus, geméntes et flentes in hac lacrimárum valle. Eia ergo, advocáta nostra, illos tuos misericórdes óculos ad nos convérte. Et Iesum, benedíctum fructum ventris tui, nobis post hoc exsílium osténde. O clemens, o pia, o dulcis Virgo María. Amen.",
    en: "Hail, holy Queen, Mother of mercy, our life, our sweetness, and our hope. To thee do we cry, poor banished children of Eve. To thee do we send up our sighs, mourning and weeping in this valley of tears. Turn then, most gracious advocate, thine eyes of mercy toward us; and after this our exile, show unto us the blessed fruit of thy womb, Jesus. O clement, O loving, O sweet Virgin Mary. Amen."
  }
];
```

- [ ] **Step 2: Type-check** — `npm run build` → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/prayers.ts
git commit -m "v1.2 B1: add the five traditional rosary prayers (Latin + English)"
```

---

## Task 4: The reusable `Sheet` primitive

**Files:**
- Create: `src/components/Sheet.tsx`

No DOM test runner exists; correctness is verified by `tsc`/build + the source-grep two-accent assertions in Task 6 + manual check. Code is complete below.

- [ ] **Step 1: Create `src/components/Sheet.tsx`**

```tsx
import { ReactNode, useEffect, useRef } from "react";

interface Props {
  /** id of the heading inside `children` that labels the dialog. */
  titleId: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A bottom-sheet modal: dimmed backdrop, Escape / backdrop-click / close button
 * to dismiss, focus moved into the panel and returned to the opener on close,
 * body scroll locked, focus trapped within. No motion — a prayer book, not a
 * toy (standing rule 3). Reusable for future deep surfaces (§4 commentary).
 */
export default function Sheet({ titleId, onClose, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    opener.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current
      ?.querySelector<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])')
      ?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const f = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])'
      );
      if (!f || f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener.current?.focus();
    };
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="sheet-close"
          onClick={onClose}
          aria-label="Close"
          title="Close"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check** — `npm run build` → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/Sheet.tsx
git commit -m "v1.2 B1: add the reusable bottom-sheet primitive"
```

---

## Task 5: `MysterySheet` content + wire Home card 4

**Files:**
- Create: `src/components/MysterySheet.tsx`
- Modify: `src/pages/Home.tsx` (imports; card 4 block lines 143-159; sheet state + render)

- [ ] **Step 1: Create `src/components/MysterySheet.tsx`**

```tsx
import { Link } from "react-router-dom";
import VerseQuote from "./VerseQuote";
import { getBook, bookDisplayName } from "../lib/canon";
import { Mystery } from "../lib/rosary";
import { PRAYERS } from "../lib/prayers";

interface Props {
  mystery: Mystery;
  translation: string;
  /** Matches the Sheet's aria-labelledby. */
  titleId: string;
}

/** The content of a rosary mystery sheet: the meditation passage in the current
 *  translation, a link into the Reader, then the five traditional prayers,
 *  Latin and English, each collapsed. */
export default function MysterySheet({ mystery, translation, titleId }: Props) {
  const [book, chapter, start] = mystery.ref;
  const end = mystery.end;
  const name = bookDisplayName(getBook(book)!, translation);
  const range = end && end !== start ? `${start}–${end}` : `${start}`;

  return (
    <div className="mystery-sheet">
      <h2 id={titleId} className="mystery-sheet-title">{mystery.title}</h2>
      <div className="mystery-sheet-cite muted small sans">
        {name} {chapter}:{range}
        {book === "psalms" && " · Vulgate Psalm numbering"}
      </div>
      <VerseQuote
        translation={translation}
        book={book}
        chapter={chapter}
        verse={start}
        endVerse={end}
        className="mystery-sheet-passage"
      />
      <Link className="mref" to={`/read/${translation}/${book}/${chapter}?v=${start}`}>
        Read in context →
      </Link>

      <div className="mystery-sheet-prayers-label">Prayers</div>
      {PRAYERS.map((p) => (
        <details className="prayer" key={p.id}>
          <summary className="sans small">{p.title}</summary>
          <div className="prayer-body">
            <p className="prayer-la">{p.la}</p>
            <p className="prayer-en">{p.en}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Update `Home.tsx` imports** (after line 5)

```ts
import Sheet from "../components/Sheet";
import MysterySheet from "../components/MysterySheet";
```

And change line 17 to also import the `Mystery` type:

```ts
import { mysteriesForDate, Mystery } from "../lib/rosary";
```

- [ ] **Step 3: Add sheet state** (inside `Home()`, e.g. after line 34's `mass` state)

```ts
  const [openMystery, setOpenMystery] = useState<Mystery | null>(null);
```

- [ ] **Step 4: Replace card 4's `<ol>` (lines 149-158) with tappable buttons**

```tsx
          <ol className="rosary-list">
            {rosary.mysteries.map((m) => (
              <li key={m.title}>
                <button
                  type="button"
                  className="rosary-mystery"
                  onClick={() => setOpenMystery(m)}
                  aria-haspopup="dialog"
                >
                  <span className="rosary-title">{m.title}</span>
                  <span className="mref">
                    {getBook(m.ref[0])!.abbrev} {m.ref[1]}:{m.ref[2]}
                    {m.end && m.end !== m.ref[2] ? `–${m.end}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ol>
```

- [ ] **Step 5: Render the sheet** — just before the final `</div>` that closes `.widget-grid` (after the Continue Reading card, before line 196 `</div>`):

```tsx
        {openMystery && (
          <Sheet titleId="mystery-sheet-title" onClose={() => setOpenMystery(null)}>
            <MysterySheet
              mystery={openMystery}
              translation={translation}
              titleId="mystery-sheet-title"
            />
          </Sheet>
        )}
```

- [ ] **Step 6: Type-check** — `npm run build` → PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/MysterySheet.tsx src/pages/Home.tsx
git commit -m "v1.2 B1: tappable mysteries open the prayer sheet on Today"
```

---

## Task 6: Styles + harness assertions

**Files:**
- Modify: `src/styles.css` (add `--scrim` token to both theme blocks; append sheet styles)
- Modify: `scripts/test-data.ts` (new Rosary section)

- [ ] **Step 1: Add a `--scrim` token to BOTH theme blocks in `styles.css`**

In the `:root, [data-theme="day"]` block, beside the other tokens:

```css
  --scrim: rgba(38, 36, 31, 0.45); /* modal backdrop (warm dark) */
```

In the `[data-theme="night"]` block:

```css
  --scrim: rgba(0, 0, 0, 0.6);
```

- [ ] **Step 2: Append the sheet styles to `styles.css`**

```css
/* Rosary mystery sheet — Today card 4 (v1.2 B1). Purple acts, gold honors. */
.rosary-list .rosary-mystery {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: 0.15rem 0;
  margin: 0;
  cursor: pointer;
  color: var(--text);
  font: inherit;
  line-height: 1.45;
}
.rosary-list .rosary-title { flex: 1; }
.rosary-list .rosary-mystery:hover .rosary-title,
.rosary-list .rosary-mystery:focus-visible .rosary-title { text-decoration: underline; }
.rosary-list .rosary-mystery .mref { margin-left: 0; }

.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: var(--scrim);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 60;
}
.sheet {
  position: relative;
  width: 100%;
  max-width: 34rem;
  max-height: 85vh;
  overflow-y: auto;
  background: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: 0.9rem 0.9rem 0 0;
  box-shadow: var(--shadow);
  padding: 1.3rem 1.3rem calc(1.3rem + env(safe-area-inset-bottom));
}
.sheet-close {
  position: absolute;
  top: 0.7rem;
  right: 0.8rem;
  background: none;
  border: none;
  font-size: 1.05rem;
  line-height: 1;
  padding: 0.3rem;
  cursor: pointer;
  color: var(--purple);
}
.mystery-sheet-title { margin: 0 2rem 0.2rem 0; }
.mystery-sheet-cite { margin-bottom: 0.7rem; }
.mystery-sheet-passage {
  font-family: var(--scripture);
  font-size: 1.05rem;
  line-height: 1.62;
  margin: 0 0 0.5rem;
}
.mystery-sheet-prayers-label {
  margin: 1.1rem 0 0.2rem;
  font-family: var(--sans);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--gold);
}
.prayer { border-top: 1px solid var(--border); padding: 0.45rem 0; }
.prayer summary { cursor: pointer; color: var(--purple); }
.prayer-body { margin-top: 0.45rem; }
.prayer-la { margin: 0; font-style: italic; color: var(--text); line-height: 1.5; }
.prayer-en { margin: 0.2rem 0 0; line-height: 1.5; }

@media (min-width: 640px) {
  .sheet-backdrop { align-items: center; }
  .sheet { border-radius: 0.9rem; max-height: 80vh; }
}
```

- [ ] **Step 3: Add the Rosary assertion block to `scripts/test-data.ts`**

Add these imports to the top import block (with the other `../src/lib` imports):

```ts
import { MYSTERY_SETS } from "../src/lib/rosary";
import { passageText } from "../src/lib/passage";
import { PRAYERS } from "../src/lib/prayers";
```

Append this block just before the final `console.log(...failures...)` summary line:

```ts
// 11. Rosary mystery sheets (v1.2 B1). Every mystery's meditation passage must
//     resolve to real text in every bundled translation, and passageText must
//     equal the Reader's own verse filter (so the sheet can't drift). The five
//     traditional prayers must be present and complete. Today stays five cards.
console.log("");
const allMysteries = Object.values(MYSTERY_SETS).flatMap((s) => s.mysteries);
check("the four mystery sets hold 20 mysteries", allMysteries.length === 20, `${allMysteries.length}`);

for (const t of ["drc", "cpdv", "vulgate"]) {
  let bad = 0;
  let drift = 0;
  for (const m of allMysteries) {
    const [book, chapter, start] = m.ref;
    try {
      const data = JSON.parse(
        readFileSync(join(ROOT, `public/data/${t}/${book}.json`), "utf8")
      );
      const got = passageText(data, chapter, start, m.end);
      if (!got.trim()) {
        console.log(`  ${t}: empty passage — ${m.title} (${book} ${chapter}:${start})`);
        bad++;
      }
      // Independent recompute of the Reader's own grid-empty filter.
      const ch: string[] = data.chapters[chapter - 1] ?? [];
      const last = Math.min(m.end ?? start, ch.length);
      const reader = ch.slice(start - 1, last).filter((s) => s && s.trim()).join(" ");
      if (got !== reader) {
        console.log(`  ${t}: passage drift — ${m.title}`);
        drift++;
      }
    } catch {
      console.log(`  ${t}: missing book ${book} — ${m.title}`);
      bad++;
    }
  }
  check(`every mystery passage lands on text in ${t}`, bad === 0, `${bad} invalid`);
  check(`passageText matches the Reader filter in ${t}`, drift === 0, `${drift} drift`);
}

check(
  "five rosary prayers carry Latin and English",
  PRAYERS.length === 5 && PRAYERS.every((p) => p.la.trim() && p.en.trim()),
  `${PRAYERS.length}`
);
check(
  "each rosary prayer closes with Amen (Latin and English)",
  PRAYERS.every((p) => /Amen\.?$/.test(p.la.trim()) && /Amen\.?$/.test(p.en.trim()))
);

// Standing rule 2: the Today page renders exactly five cards.
const homeSrc = readFileSync(join(ROOT, "src/pages/Home.tsx"), "utf8");
check(
  "Today page renders exactly five cards (standing rule 2)",
  (homeSrc.match(/className="card"/g) || []).length === 5,
  `${(homeSrc.match(/className="card"/g) || []).length} cards`
);

// Two-accent rule on the new sheet: close acts in purple, label honors in gold.
const sheetCss = readFileSync(join(ROOT, "src/styles.css"), "utf8");
check(
  "sheet close button acts in purple (two-accent §1.2)",
  /\.sheet-close\s*\{[^}]*var\(--purple\)/.test(sheetCss)
);
check(
  "sheet prayers label honors in gold (two-accent §1.2)",
  /\.mystery-sheet-prayers-label\s*\{[^}]*var\(--gold\)/.test(sheetCss)
);
check(
  "modal backdrop uses the --scrim token, no raw color",
  /\.sheet-backdrop\s*\{[^}]*var\(--scrim\)/.test(sheetCss)
);
```

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: all checks pass (incl. the new section 11), `process.exitCode 0`.

- [ ] **Step 5: Run the build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/styles.css scripts/test-data.ts
git commit -m "v1.2 B1: sheet styles + rosary passage/prayer/five-card assertions"
```

---

## Task 7: Version bump + changelog

**Files:**
- Modify: `package.json`, `package-lock.json` (via `npm version`)
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Bump version** (updates package.json + lockfile, no git tag/commit)

Run: `npm version 1.4.0 --no-git-tag-version`
Expected: prints `v1.4.0`; `package.json` and `package-lock.json` now read `1.4.0`.

- [ ] **Step 2: Add the CHANGELOG entry** above the `## [1.3.0]` section

```markdown
## [1.4.0] — 2026-06-14 — v1.2 B1: rosary mystery sheets with the traditional prayers

Design-spec §6, card 4, upgraded one step. Tapping a mystery on the Today page now
opens a quiet bottom-sheet: the mystery's Scripture passage, rendered verbatim from
your current translation, and beneath it — collapsed — the five traditional prayers
of the Rosary in Latin and English. No audio, no beads, no motion. A prayer book.

### Added

- **The mystery sheet** (§6 card 4): each of the day's five mysteries is now tappable,
  opening a reusable bottom-sheet (`Sheet`) over a dimmed backdrop — Escape, tap-outside,
  or close to dismiss, with focus managed and returned. The passage renders through the
  new shared `passageText` helper, the same verse-range path the Reader uses, so the two
  can never disagree (asserted per mystery × DRC/CPDV/Vulgate).
- **Fuller meditation passages**: the twenty mysteries now carry traditional narrative
  ranges (e.g. the Annunciation, Luke 1:26–38; the Visitation with the Magnificat,
  Luke 1:39–56) rather than a single anchor verse.
- **The traditional prayers** (`src/lib/prayers.ts`): Pater Noster, Ave Maria, Gloria
  Patri, the Fatima Prayer, and the Salve Regina — public-domain Latin and English,
  collapsed beneath each mystery's passage.

### Changed

- `VerseQuote` now renders through `passageText` (no behavior change).
- The Today page still holds exactly five cards; the mystery sheet is an overlay, not
  a sixth card.
```

- [ ] **Step 3: Final verification**

Run: `npm test && npm run build`
Expected: both green.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "v1.2 B1: bump to 1.4.0, changelog"
```

---

## Self-review (spec coverage)

- **Acceptance 1 (passage matches Reader):** Task 1 (`passageText`) + Task 6 parity assertion. ✓
- **Acceptance 2 (`npm test` green):** Task 6 Step 4. ✓
- **Acceptance 3 (`npm run build` green):** every task type-checks; Task 7 Step 3. ✓
- **Acceptance 4 (five cards):** Task 6 five-card regex guard. ✓
- **Acceptance 5 / rule 3 (no audio/animation/toy):** `Sheet` has no motion; CSS has no transitions. ✓
- **Spec §4 bottom-sheet (a11y, dismissal, z-index 60, safe-area):** Task 4 + Task 6 CSS. ✓
- **Spec §6 ranges:** Task 2. ✓
- **Spec §7 prayers:** Task 3 + Task 6 integrity assertions. ✓
- **Two-accent:** Task 6 CSS + the purple/gold assertions. ✓
- **`✠` avoided / `--scrim` token:** honor via gold quote-marks (VerseQuote) + gold label; backdrop token. ✓

**Deviation from spec §4 (recorded):** the "gold ✠ honor mark" is replaced — `✠` is on the harness `FORBIDDEN` glyph list. The gold honor is carried by the passage's gold quotation marks and the gold small-caps "Prayers" label instead.

**Not touched:** golden snapshots (no calendar drift), iOS `MARKETING_VERSION` (left for phase-release consolidation, per the v1.1 A-step precedent).
