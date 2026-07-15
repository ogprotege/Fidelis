/** The Saint of the Day layer (feature: the memory of the just). Text is drawn
 *  from public-domain sources and never AI-paraphrased (design spec §13); each
 *  entry carries its footnote sources and a `verified` flag (the §3.4 ledger).
 *  Keyed by "MM-DD" — the sanctoral calendar — since the liturgical engine's
 *  Celebration carries no stable id. */

export interface SaintSource {
  text: string;
  /** "public-domain" for the primary source(s); "church-official" for an official
   *  Church source (e.g. vatican.va) used, drawn faithfully, where a saint is too
   *  modern to have a public-domain biography; "reference" for calendar notes. The
   *  build gate requires at least one "public-domain" OR "church-official" source. */
  license: string;
  url?: string;
}

export interface Saint {
  id: string;
  day: string; // "MM-DD"
  name: string;
  title: string;
  rank: string;
  bornYear?: string;
  diedYear?: string;
  shortBlurb: string;
  biography: string[];
  knownFor: string;
  patronage?: string[];
  canonization?: { beatified?: string; canonized?: string };
  prayer?: { title: string; text: string; source?: string } | null;
  sources: SaintSource[];
  verified: boolean;
}

export interface SaintDay {
  day: string;
  saints: Saint[];
}

const STOP = new Set([
  "st",
  "saint",
  "pope",
  "the",
  "of",
  "and",
  "de",
  "la",
  "great",
  "venerable",
  "blessed",
  "virgin",
  "martyr",
  "bishop",
  "doctor",
  "abbot",
  "priest"
]);

/** Distinctive lowercase tokens of a saint/celebration name (drops honorifics
 *  and offices), mirroring quotes.celebratesAuthor. */
function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[().,]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/** Pick the day's saint whose name best matches one of the liturgical engine's
 *  celebration names (token overlap) — so the card chip and the page agree with
 *  the day the engine actually resolved, across regions/transfers, without an
 *  engine id. Returns null when none of the day's saints matches a celebration
 *  (the chip then stays a plain label; the page still lists the day's saints). */
export function saintForCelebration(saints: Saint[], celebrationNames: string[]): Saint | null {
  const celebTokens = celebrationNames.map(nameTokens);
  let best: Saint | null = null;
  let bestScore = 0;
  for (const s of saints) {
    const st = nameTokens(s.name);
    for (const ct of celebTokens) {
      const score = st.filter((t) => ct.includes(t)).length;
      if (score > bestScore) {
        bestScore = score;
        best = s;
      }
    }
  }
  return bestScore > 0 ? best : null;
}
