import bookMeta from "../generated/bookMeta.json";

export type BookGroup =
  | "Pentateuch"
  | "Historical Books"
  | "Wisdom Books"
  | "Prophetic Books"
  | "Maccabees"
  | "Gospels"
  | "Acts of the Apostles"
  | "Pauline Epistles"
  | "Catholic Epistles"
  | "Apocalypse"
  | "Appendix";

export interface Book {
  slug: string;
  /** Modern English name (RSV/NABRE style) */
  name: string;
  /** Traditional Douay-Rheims name */
  douay: string;
  /** Clementine Vulgate Latin name */
  latin: string;
  abbrev: string;
  group: BookGroup;
  /** Deuterocanonical book (in the Catholic canon, absent from Protestant bibles) */
  deutero?: boolean;
  /** Vulgate appendix — not part of the 73-book canon */
  appendix?: boolean;
  chapters: number;
  /** Verse count per chapter (max across bundled translations) */
  verses: number[];
}

interface Meta {
  [slug: string]: { chapters: number; verses: number[] };
}
const meta = bookMeta as Meta;

function b(
  slug: string,
  name: string,
  douay: string,
  latin: string,
  abbrev: string,
  group: BookGroup,
  flags: { deutero?: boolean; appendix?: boolean } = {}
): Book {
  const m = meta[slug];
  return { slug, name, douay, latin, abbrev, group, ...flags, chapters: m.chapters, verses: m.verses };
}

/** The canon in traditional Vulgate order (73 books + Clementine appendix). */
export const BOOKS: Book[] = [
  b("genesis", "Genesis", "Genesis", "Liber Genesis", "Gen", "Pentateuch"),
  b("exodus", "Exodus", "Exodus", "Liber Exodus", "Ex", "Pentateuch"),
  b("leviticus", "Leviticus", "Leviticus", "Liber Leviticus", "Lev", "Pentateuch"),
  b("numbers", "Numbers", "Numbers", "Liber Numeri", "Num", "Pentateuch"),
  b("deuteronomy", "Deuteronomy", "Deuteronomy", "Liber Deuteronomii", "Deut", "Pentateuch"),
  b("joshua", "Joshua", "Josue", "Liber Josue", "Josh", "Historical Books"),
  b("judges", "Judges", "Judges", "Liber Judicum", "Judg", "Historical Books"),
  b("ruth", "Ruth", "Ruth", "Liber Ruth", "Ruth", "Historical Books"),
  b("1-samuel", "1 Samuel", "1 Kings", "Liber I Regum", "1 Sam", "Historical Books"),
  b("2-samuel", "2 Samuel", "2 Kings", "Liber II Regum", "2 Sam", "Historical Books"),
  b("1-kings", "1 Kings", "3 Kings", "Liber III Regum", "1 Kgs", "Historical Books"),
  b("2-kings", "2 Kings", "4 Kings", "Liber IV Regum", "2 Kgs", "Historical Books"),
  b("1-chronicles", "1 Chronicles", "1 Paralipomenon", "Liber I Paralipomenon", "1 Chr", "Historical Books"),
  b("2-chronicles", "2 Chronicles", "2 Paralipomenon", "Liber II Paralipomenon", "2 Chr", "Historical Books"),
  b("ezra", "Ezra", "1 Esdras", "Liber I Esdræ", "Ezra", "Historical Books"),
  b("nehemiah", "Nehemiah", "2 Esdras (Nehemias)", "Liber Nehemiæ", "Neh", "Historical Books"),
  b("tobit", "Tobit", "Tobias", "Liber Tobiæ", "Tob", "Historical Books", { deutero: true }),
  b("judith", "Judith", "Judith", "Liber Judith", "Jdt", "Historical Books", { deutero: true }),
  b("esther", "Esther", "Esther", "Liber Esther", "Esth", "Historical Books"),
  b("job", "Job", "Job", "Liber Job", "Job", "Wisdom Books"),
  b("psalms", "Psalms", "Psalms", "Liber Psalmorum", "Ps", "Wisdom Books"),
  b("proverbs", "Proverbs", "Proverbs", "Liber Proverbiorum", "Prov", "Wisdom Books"),
  b("ecclesiastes", "Ecclesiastes", "Ecclesiastes", "Liber Ecclesiastes", "Eccl", "Wisdom Books"),
  b("song-of-songs", "Song of Songs", "Canticle of Canticles", "Canticum Canticorum", "Song", "Wisdom Books"),
  b("wisdom", "Wisdom", "Wisdom", "Liber Sapientiæ", "Wis", "Wisdom Books", { deutero: true }),
  b("sirach", "Sirach", "Ecclesiasticus", "Liber Ecclesiasticus", "Sir", "Wisdom Books", { deutero: true }),
  b("isaiah", "Isaiah", "Isaias", "Liber Isaiæ", "Isa", "Prophetic Books"),
  b("jeremiah", "Jeremiah", "Jeremias", "Liber Jeremiæ", "Jer", "Prophetic Books"),
  b("lamentations", "Lamentations", "Lamentations", "Lamentationes Jeremiæ", "Lam", "Prophetic Books"),
  b("baruch", "Baruch", "Baruch", "Liber Baruch", "Bar", "Prophetic Books", { deutero: true }),
  b("ezekiel", "Ezekiel", "Ezechiel", "Liber Ezechielis", "Ezek", "Prophetic Books"),
  b("daniel", "Daniel", "Daniel", "Liber Danielis", "Dan", "Prophetic Books"),
  b("hosea", "Hosea", "Osee", "Liber Osee", "Hos", "Prophetic Books"),
  b("joel", "Joel", "Joel", "Liber Joël", "Joel", "Prophetic Books"),
  b("amos", "Amos", "Amos", "Liber Amos", "Amos", "Prophetic Books"),
  b("obadiah", "Obadiah", "Abdias", "Liber Abdiæ", "Obad", "Prophetic Books"),
  b("jonah", "Jonah", "Jonas", "Liber Jonæ", "Jon", "Prophetic Books"),
  b("micah", "Micah", "Micheas", "Liber Michææ", "Mic", "Prophetic Books"),
  b("nahum", "Nahum", "Nahum", "Liber Nahum", "Nah", "Prophetic Books"),
  b("habakkuk", "Habakkuk", "Habacuc", "Liber Habacuc", "Hab", "Prophetic Books"),
  b("zephaniah", "Zephaniah", "Sophonias", "Liber Sophoniæ", "Zeph", "Prophetic Books"),
  b("haggai", "Haggai", "Aggeus", "Liber Aggæi", "Hag", "Prophetic Books"),
  b("zechariah", "Zechariah", "Zacharias", "Liber Zachariæ", "Zech", "Prophetic Books"),
  b("malachi", "Malachi", "Malachias", "Liber Malachiæ", "Mal", "Prophetic Books"),
  b("1-maccabees", "1 Maccabees", "1 Machabees", "Liber I Machabæorum", "1 Macc", "Maccabees", { deutero: true }),
  b("2-maccabees", "2 Maccabees", "2 Machabees", "Liber II Machabæorum", "2 Macc", "Maccabees", { deutero: true }),
  b("matthew", "Matthew", "Matthew", "Evangelium secundum Matthæum", "Matt", "Gospels"),
  b("mark", "Mark", "Mark", "Evangelium secundum Marcum", "Mark", "Gospels"),
  b("luke", "Luke", "Luke", "Evangelium secundum Lucam", "Luke", "Gospels"),
  b("john", "John", "John", "Evangelium secundum Joannem", "John", "Gospels"),
  b("acts", "Acts", "Acts of the Apostles", "Actus Apostolorum", "Acts", "Acts of the Apostles"),
  b("romans", "Romans", "Romans", "Epistola ad Romanos", "Rom", "Pauline Epistles"),
  b("1-corinthians", "1 Corinthians", "1 Corinthians", "Epistola I ad Corinthios", "1 Cor", "Pauline Epistles"),
  b("2-corinthians", "2 Corinthians", "2 Corinthians", "Epistola II ad Corinthios", "2 Cor", "Pauline Epistles"),
  b("galatians", "Galatians", "Galatians", "Epistola ad Galatas", "Gal", "Pauline Epistles"),
  b("ephesians", "Ephesians", "Ephesians", "Epistola ad Ephesios", "Eph", "Pauline Epistles"),
  b("philippians", "Philippians", "Philippians", "Epistola ad Philippenses", "Phil", "Pauline Epistles"),
  b("colossians", "Colossians", "Colossians", "Epistola ad Colossenses", "Col", "Pauline Epistles"),
  b("1-thessalonians", "1 Thessalonians", "1 Thessalonians", "Epistola I ad Thessalonicenses", "1 Thess", "Pauline Epistles"),
  b("2-thessalonians", "2 Thessalonians", "2 Thessalonians", "Epistola II ad Thessalonicenses", "2 Thess", "Pauline Epistles"),
  b("1-timothy", "1 Timothy", "1 Timothy", "Epistola I ad Timotheum", "1 Tim", "Pauline Epistles"),
  b("2-timothy", "2 Timothy", "2 Timothy", "Epistola II ad Timotheum", "2 Tim", "Pauline Epistles"),
  b("titus", "Titus", "Titus", "Epistola ad Titum", "Titus", "Pauline Epistles"),
  b("philemon", "Philemon", "Philemon", "Epistola ad Philemonem", "Phlm", "Pauline Epistles"),
  b("hebrews", "Hebrews", "Hebrews", "Epistola ad Hebræos", "Heb", "Pauline Epistles"),
  b("james", "James", "James", "Epistola Jacobi", "Jas", "Catholic Epistles"),
  b("1-peter", "1 Peter", "1 Peter", "Epistola I Petri", "1 Pet", "Catholic Epistles"),
  b("2-peter", "2 Peter", "2 Peter", "Epistola II Petri", "2 Pet", "Catholic Epistles"),
  b("1-john", "1 John", "1 John", "Epistola I Joannis", "1 Jn", "Catholic Epistles"),
  b("2-john", "2 John", "2 John", "Epistola II Joannis", "2 Jn", "Catholic Epistles"),
  b("3-john", "3 John", "3 John", "Epistola III Joannis", "3 Jn", "Catholic Epistles"),
  b("jude", "Jude", "Jude", "Epistola Judæ", "Jude", "Catholic Epistles"),
  b("revelation", "Revelation", "Apocalypse", "Apocalypsis Joannis", "Rev", "Apocalypse"),
  b("prayer-of-manasseh", "Prayer of Manasseh", "Prayer of Manasses", "Oratio Manassæ", "Pr Man", "Appendix", { appendix: true }),
  b("3-esdras", "3 Esdras", "3 Esdras", "Liber III Esdræ", "3 Esd", "Appendix", { appendix: true }),
  b("4-esdras", "4 Esdras", "4 Esdras", "Liber IV Esdræ", "4 Esd", "Appendix", { appendix: true }),
  b("psalm-151", "Psalm 151", "Psalm 151", "Psalmus CLI", "Ps 151", "Appendix", { appendix: true }),
  b("laodiceans", "Laodiceans", "Laodiceans", "Epistola ad Laodicenses", "Laod", "Appendix", { appendix: true })
];

export const BOOK_BY_SLUG = new Map(BOOKS.map((bk) => [bk.slug, bk]));

export function getBook(slug: string): Book | undefined {
  return BOOK_BY_SLUG.get(slug);
}

export function bookIndex(slug: string): number {
  return BOOKS.findIndex((bk) => bk.slug === slug);
}

/** Display name of a book in the style of the given translation. */
export function bookDisplayName(book: Book, translation: string): string {
  if (translation === "vulgate") return book.latin;
  if (translation === "drc" || translation === "cpdv") return book.douay;
  return book.name;
}

export const GROUPS: BookGroup[] = [
  "Pentateuch",
  "Historical Books",
  "Wisdom Books",
  "Prophetic Books",
  "Maccabees",
  "Gospels",
  "Acts of the Apostles",
  "Pauline Epistles",
  "Catholic Epistles",
  "Apocalypse",
  "Appendix"
];

export const OT_GROUPS: BookGroup[] = [
  "Pentateuch",
  "Historical Books",
  "Wisdom Books",
  "Prophetic Books",
  "Maccabees"
];
export const NT_GROUPS: BookGroup[] = [
  "Gospels",
  "Acts of the Apostles",
  "Pauline Epistles",
  "Catholic Epistles",
  "Apocalypse"
];
