import { Link } from "react-router-dom";

const WIDGET_SNIPPET = `<iframe
  src="https://YOUR-DOMAIN/#/widget/votd"
  style="border:none;width:100%;max-width:30rem;height:16rem"
  title="Verse of the Day"
></iframe>`;

export default function About() {
  return (
    <div className="page-narrow" style={{ margin: "0 auto" }}>
      <h1 className="page-title">About Fidelis</h1>
      <p>
        <strong>Fidelis</strong> (Latin: <em>faithful</em>) is a Catholic Bible app
        built on one conviction: <em>the text is not ours to edit</em>. Every
        bundled translation is reproduced verbatim from its public-domain source —
        no paraphrasing, no softening of hard sayings, no quiet "updates" to suit
        the fashion of the moment. What the translators wrote is what you read.
      </p>

      <h2 className="testament-title">The Canon</h2>
      <p>
        Fidelis carries the complete Catholic canon of <strong>73 books</strong>,
        including the seven deuterocanonical books (Tobit, Judith, Wisdom,
        Ecclesiasticus/Sirach, Baruch, and 1–2 Machabees) and the Greek portions of
        Esther and Daniel — books affirmed at the Councils of Hippo (393), Carthage
        (397), Florence (1442), and definitively at Trent (1546). The traditional
        appendix of the Clementine Vulgate (Prayer of Manasses, 3–4 Esdras, Psalm
        151, Laodiceans) is preserved as in printed editions, clearly marked as
        outside the canon.
      </p>

      <h2 className="testament-title">The Texts</h2>
      <ul>
        <li>
          <strong>Douay-Rheims (Challoner)</strong> — the historic English Catholic
          Bible, translated from the Vulgate at Douai and Rheims (1582–1610) and
          revised by Bishop Richard Challoner (1749–1752). Public domain.
        </li>
        <li>
          <strong>Catholic Public Domain Version</strong> — a modern English
          translation of the Vulgate (2009), released into the public domain.
        </li>
        <li>
          <strong>Clementine Vulgate</strong> — the 1592 Latin edition promulgated
          by Pope Clement VIII, the official Bible of the Latin Church for four
          centuries.
        </li>
        <li>
          <strong>RSV-2CE and NABRE</strong> — supported, but under copyright; see{" "}
          <Link to="/translations">Translations</Link> for how to import a licensed
          copy.
        </li>
      </ul>
      <p className="muted small">
        Note on numbering: the bundled translations follow the Vulgate, so the
        Psalms use the traditional Septuagint numbering (the "Lord is my shepherd"
        psalm is Psalm 22, not 23), and 1–2 Samuel appear in the Douay text as 1–2
        Kings. The book picker shows each translation's own traditional names.
      </p>

      <h2 className="testament-title">Embed the Verse of the Day</h2>
      <p>
        Every install of Fidelis exposes an embeddable Verse-of-the-Day widget at{" "}
        <Link to="/widget/votd">/#/widget/votd</Link>. Drop it into any site:
      </p>
      <pre className="embed-snippet">{WIDGET_SNIPPET}</pre>

      <h2 className="testament-title">Privacy &amp; Offline</h2>
      <p>
        There is no account, no tracking, and no server: your bookmarks,
        highlights, and notes live only in your browser. Once a book has been
        opened it is cached for offline reading, and the app may be installed to
        your home screen as a PWA.
      </p>

      <h2 className="testament-title">Sources</h2>
      <p className="small">
        Scripture texts are drawn from the public-domain corpus collected by the{" "}
        <a href="https://github.com/scrollmapper/bible_databases" target="_blank" rel="noreferrer">
          scrollmapper/bible_databases
        </a>{" "}
        project (DRC, CPDV, VulgClementine) and reproduced without alteration. The
        liturgical calendar follows the General Roman Calendar; movable feasts are
        computed from the date of Easter. Daily Mass reading citations follow the
        Roman Lectionary cycles (Sundays A/B/C, weekdays I/II), derived from the
        public-domain tables of{" "}
        <a
          href="https://github.com/jayarathina/Tamil-Catholic-Lectionary"
          target="_blank"
          rel="noreferrer"
        >
          jayarathina/Tamil-Catholic-Lectionary
        </a>
        .
      </p>
    </div>
  );
}
