export interface Translation {
  id: string;
  /** Short label, e.g. "DRB" */
  abbrev: string;
  name: string;
  language: "en" | "la" | "es";
  year: string;
  /** Bundled = full text ships with the app (public domain). */
  bundled: boolean;
  /** For non-bundled translations: who holds the copyright. */
  copyright?: string;
  description: string;
}

/** Human label for a translation's language (Settings, Translations page). */
export function languageLabel(t: Translation): string {
  return { en: "English", la: "Latin", es: "Español" }[t.language];
}

/** BCP-47 `lang` attribute for a translation's TEXT nodes, so screen readers
 *  pick the right voice — undefined for English (the page language). */
export function langAttr(id: string): string | undefined {
  const l = TRANSLATION_BY_ID.get(id)?.language;
  return l && l !== "en" ? l : undefined;
}

export const TRANSLATIONS: Translation[] = [
  {
    id: "drc",
    abbrev: "DRB",
    name: "Douay-Rheims Bible (Challoner Revision)",
    language: "en",
    year: "1582–1610, rev. 1749–1752",
    bundled: true,
    description:
      "The venerable English Catholic translation from the Latin Vulgate, revised by Bishop Richard Challoner. Public domain; presented unaltered."
  },
  {
    id: "cpdv",
    abbrev: "CPDV",
    name: "Catholic Public Domain Version",
    language: "en",
    year: "2009",
    bundled: true,
    description:
      "A modern English translation of the Latin Vulgate by Ronald L. Conte Jr., released into the public domain. Presented unaltered."
  },
  {
    id: "vulgate",
    abbrev: "VUL",
    name: "Biblia Sacra Vulgata (Clementine)",
    language: "la",
    year: "1592",
    bundled: true,
    description:
      "The Clementine edition of St. Jerome's Latin Vulgate, the official Bible of the Latin Church for four centuries. Public domain; presented unaltered."
  },
  {
    id: "rsv2ce",
    abbrev: "RSV-2CE",
    name: "Revised Standard Version, Second Catholic Edition",
    language: "en",
    year: "2006",
    bundled: false,
    copyright: "© Division of Christian Education of the NCC; Ignatius Press",
    description:
      "The Ignatius Bible. Under copyright, so its text cannot be distributed with this app — but you may import a licensed copy you own from the Translations page."
  },
  {
    id: "straubinger",
    abbrev: "Platense",
    name: "Biblia Platense (Straubinger)",
    language: "es",
    year: "1948–1951",
    bundled: false,
    copyright: "Trad. Mons. Juan Straubinger († 1956) — not verifiably public domain in the U.S.",
    description:
      "La Biblia comentada de Mons. Juan Straubinger (La Plata) — the classic Spanish Catholic translation, made from the original languages against the Vulgate. Its U.S. copyright term has not clearly expired, so its text is not bundled; import a copy you may lawfully use from the Translations page and the whole app — Reader, parallel view, sharing — works in Spanish.",
  },
  {
    id: "nabre",
    abbrev: "NABRE",
    name: "New American Bible, Revised Edition",
    language: "en",
    year: "2011",
    bundled: false,
    copyright: "© Confraternity of Christian Doctrine (USCCB)",
    description:
      "The translation used by the U.S. lectionary. Calendar jurisdiction, lectionary edition, and displayed Bible text are separate settings. Under copyright, so its text cannot be distributed with this app; import a licensed copy you own from the Translations page. When NABRE is your Mass-text preference but is unavailable, readings fall back visibly to the Douay-Rheims."
  }
];

export const TRANSLATION_BY_ID = new Map(TRANSLATIONS.map((t) => [t.id, t]));

export function getTranslation(id: string): Translation | undefined {
  return TRANSLATION_BY_ID.get(id);
}

export const DEFAULT_TRANSLATION = "drc";
