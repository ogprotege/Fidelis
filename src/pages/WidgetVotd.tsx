import { useSearchParams } from "react-router-dom";
import VerseQuote from "../components/VerseQuote";
import { bookDisplayName, getBook } from "../lib/canon";
import { getTranslation } from "../lib/translations";
import { formatVotdRef, verseOfTheDay } from "../lib/votd";

/**
 * Minimal, chrome-free Verse of the Day — designed to be embedded in an
 * <iframe> on any site. Options: ?t=drc|cpdv|vulgate &theme=night
 */
export default function WidgetVotd() {
  const [params] = useSearchParams();
  const tParam = params.get("t") ?? "drc";
  const translation = getTranslation(tParam)?.bundled ? tParam : "drc";
  const theme = params.get("theme");
  if (theme === "night") document.documentElement.dataset.theme = "night";

  const votd = verseOfTheDay();
  const book = getBook(votd.book)!;

  return (
    <div className="widget-votd">
      <div className="w-title">✠ Verse of the Day</div>
      <VerseQuote
        translation={translation}
        book={votd.book}
        chapter={votd.chapter}
        verse={votd.verse}
        endVerse={votd.endVerse}
        className="votd-text"
      />
      <div className="votd-ref">
        {formatVotdRef(votd, bookDisplayName(book, translation))} (
        {getTranslation(translation)?.abbrev})
      </div>
    </div>
  );
}
