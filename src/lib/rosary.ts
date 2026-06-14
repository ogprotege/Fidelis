/** The Mysteries of the Most Holy Rosary, by traditional weekday assignment. */

export interface Mystery {
  title: string;
  /** Scripture for meditation: [bookSlug, chapter, startVerse] */
  ref: [string, number, number];
  /** Passage end verse (inclusive). Omit for a single-verse passage. */
  end?: number;
}

export interface MysterySet {
  name: "Joyful" | "Sorrowful" | "Glorious" | "Luminous";
  latin: string;
  mysteries: Mystery[];
}

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

/** Sun=Glorious, Mon=Joyful, Tue=Sorrowful, Wed=Glorious, Thu=Luminous, Fri=Sorrowful, Sat=Joyful */
const BY_WEEKDAY: MysterySet["name"][] = [
  "Glorious", "Joyful", "Sorrowful", "Glorious", "Luminous", "Sorrowful", "Joyful"
];

export function mysteriesForDate(date: Date = new Date()): MysterySet {
  return MYSTERY_SETS[BY_WEEKDAY[date.getDay()]];
}
