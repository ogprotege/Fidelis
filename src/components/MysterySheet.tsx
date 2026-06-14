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
