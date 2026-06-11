/** The Mysteries of the Most Holy Rosary, by traditional weekday assignment. */

export interface Mystery {
  title: string;
  /** Scripture for meditation: [bookSlug, chapter, verse] */
  ref: [string, number, number];
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
      { title: "The Annunciation", ref: ["luke", 1, 28] },
      { title: "The Visitation", ref: ["luke", 1, 42] },
      { title: "The Nativity", ref: ["luke", 2, 7] },
      { title: "The Presentation in the Temple", ref: ["luke", 2, 22] },
      { title: "The Finding in the Temple", ref: ["luke", 2, 46] }
    ]
  },
  Luminous: {
    name: "Luminous",
    latin: "Mysteria Luminosa",
    mysteries: [
      { title: "The Baptism in the Jordan", ref: ["matthew", 3, 16] },
      { title: "The Wedding at Cana", ref: ["john", 2, 7] },
      { title: "The Proclamation of the Kingdom", ref: ["mark", 1, 15] },
      { title: "The Transfiguration", ref: ["matthew", 17, 2] },
      { title: "The Institution of the Eucharist", ref: ["matthew", 26, 26] }
    ]
  },
  Sorrowful: {
    name: "Sorrowful",
    latin: "Mysteria Dolorosa",
    mysteries: [
      { title: "The Agony in the Garden", ref: ["matthew", 26, 39] },
      { title: "The Scourging at the Pillar", ref: ["john", 19, 1] },
      { title: "The Crowning with Thorns", ref: ["matthew", 27, 29] },
      { title: "The Carrying of the Cross", ref: ["john", 19, 17] },
      { title: "The Crucifixion", ref: ["luke", 23, 46] }
    ]
  },
  Glorious: {
    name: "Glorious",
    latin: "Mysteria Gloriosa",
    mysteries: [
      { title: "The Resurrection", ref: ["matthew", 28, 6] },
      { title: "The Ascension", ref: ["acts", 1, 9] },
      { title: "The Descent of the Holy Spirit", ref: ["acts", 2, 4] },
      { title: "The Assumption of Mary", ref: ["psalms", 44, 10] },
      { title: "The Coronation of Mary", ref: ["revelation", 12, 1] }
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
