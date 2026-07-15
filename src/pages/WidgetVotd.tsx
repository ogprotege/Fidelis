import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
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
  // The palette (?theme=night, default day) is applied by App, the single
  // writer of <html data-theme>, so it can't be clobbered by App's own effect.

  const votd = verseOfTheDay();
  const book = getBook(votd.book)!;
  // Even a bundled book can miss offline-uncached; the citation follows the
  // text VerseQuote actually rendered (FID-FUNC-004).
  const [shown, setShown] = useState(translation);

  return (
    <div className="widget-votd">
      <div className="w-title"><span className="cross"><Icon name="cross" /></span> Verse of the Day</div>
      <VerseQuote
        translation={translation}
        book={votd.book}
        chapter={votd.chapter}
        verse={votd.verse}
        endVerse={votd.endVerse}
        className="votd-text"
        onShownTranslation={setShown}
      />
      <div className="votd-ref">
        {formatVotdRef(votd, bookDisplayName(book, shown))} (
        {getTranslation(shown)?.abbrev})
      </div>
    </div>
  );
}
