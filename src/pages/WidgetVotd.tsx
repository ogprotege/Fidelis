import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import VerseQuote from "../components/VerseQuote";
import { bookDisplayName, getBook } from "../lib/canon";
import { getTranslation } from "../lib/translations";
import { formatVotdRef, verseOfTheDay } from "../lib/votd";
import { useToday } from "../useToday";

/**
 * Minimal, chrome-free Verse of the Day — designed to be embedded in an
 * <iframe> on any site. Options: ?t=drc|cpdv|vulgate &theme=night
 */
export default function WidgetVotd() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [params] = useSearchParams();
  const tParam = params.get("t") ?? "drc";
  const translation = getTranslation(tParam)?.bundled ? tParam : "drc";
  // The palette (?theme=night, default day) is applied by App, the single
  // writer of <html data-theme>, so it can't be clobbered by App's own effect.

  // A widget iframe can sit open for days on a host page; useToday() re-renders
  // it when the local civil day actually turns (a midnight timer + foreground
  // check), so a long-lived embed rolls to the new verse instead of freezing on
  // the day it was mounted (FID-FUNC-010). verseOfTheDay is pure in its date.
  const today = useToday();
  const votd = verseOfTheDay(today);
  const book = getBook(votd.book)!;
  // Even a bundled book can miss offline-uncached; the citation follows the
  // text VerseQuote actually rendered (FID-FUNC-004).
  const [shown, setShown] = useState(translation);

  // The host owns the iframe height. Report the rendered document whenever the
  // asynchronous verse or responsive wrapping changes it. The message carries
  // only a bounded geometry fact; hosts must still validate origin + source as
  // the About-page example does.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.parent === window) return;
    let parentOrigin = "*";
    if (document.referrer) {
      try {
        parentOrigin = new URL(document.referrer).origin;
      } catch {
        // An embed may suppress or provide an opaque referrer. Height is not
        // sensitive, so the sender can fall back while the receiver validates.
      }
    }
    const report = () => {
      const height = Math.ceil(document.documentElement.scrollHeight);
      window.parent.postMessage(
        { type: "fidelis:widget-resize", version: 1, height },
        parentOrigin
      );
    };
    const observer = new ResizeObserver(report);
    observer.observe(root);
    report();
    return () => observer.disconnect();
  }, []);

  return (
    <div className="widget-votd" ref={rootRef}>
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
