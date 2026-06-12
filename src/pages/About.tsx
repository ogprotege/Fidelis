import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface ManifestInfo {
  rootHash: string;
  fileCount: number;
  sources: Record<string, { repo: string; commit: string }>;
}

const WIDGET_SNIPPET = `<iframe
  src="https://YOUR-DOMAIN/#/widget/votd"
  style="border:none;width:100%;max-width:30rem;height:16rem"
  title="Verse of the Day"
></iframe>`;

export default function About() {
  const [integrity, setIntegrity] = useState<ManifestInfo | null>(null);
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/manifest.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => m?.rootHash && m?.sources && setIntegrity(m))
      .catch(() => {});
  }, []);

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
        Vulgate appendix is listed in the book picker, clearly marked as outside
        the canon: printed Clementine editions carried the Prayer of Manasses and
        3–4 Esdras "lest they perish entirely," while Psalm 151 and the Epistle to
        the Laodiceans come down in the wider Vulgate manuscript tradition. The
        bundled source corpus does not yet include the text of these books.
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
        Kings. The book picker shows each translation's own traditional names. The
        three bundles share their source corpus's aligned verse grid, which in a
        few places differs from printed editions' own verse breaks (the printed
        Douay 1 Thessalonians 4:18, for example, sits in the grid at 4:17), and in
        three places the Douay bundle misplaces one printed verse and lacks
        another outright (in 3 Kings 17, Proverbs 30, and Baruch 6). Slots the
        grid leaves empty are skipped in display rather than shown as bare verse
        numbers; every such slot is catalogued in an audit file
        (data-report.txt) maintained with the app's source code.
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
        project (DRC, CPDV, VulgClementine) and reproduced exactly as that corpus
        carries them, with no editorial changes; its shared verse grid and its few
        gaps are described in the note on numbering above. The
        liturgical calendar follows the General Roman Calendar (all solemnities
        and feasts, with a representative selection of memorials); movable feasts
        are computed from the date of Easter, and a calendar-region setting on the
        Readings page applies the United States transfers — Epiphany to the Sunday
        of Jan 2–8, and the Ascension to the Seventh Sunday of Easter, as observed
        in most U.S. ecclesiastical provinces (Boston, Hartford, New York, Omaha,
        and Philadelphia keep Ascension Thursday) — and the U.S. proper days. Daily Mass reading citations follow the
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
      <p className="small">
        The Quote of the Day is drawn from a curated corpus of the Fathers,
        Doctors, and saints in public-domain translations only (NPNF/ANF, Pusey's{" "}
        <em>Confessions</em>, the Dominican Fathers' <em>Summa</em>, Taylor's{" "}
        <em>Story of a Soul</em>, and the like). Every quotation carries its full
        source citation — work, locus, and translation — because the Catholic
        internet is a sea of apocryphal saint quotes, and the attribution is part
        of the gift. Entries are drafted from the named editions and individually
        checked against printed copies before being marked verified; the corpus
        and its verification state live in the repository in the open.
      </p>
      <p className="small muted">
        Both sources are fetched at commits pinned by hash — never a moving
        branch — and every bundled data file is sealed by a SHA-256 manifest
        that the project's data harness verifies on every run.
        {integrity && (
          <>
            {" "}
            Texts verified — manifest root <code>{integrity.rootHash.slice(0, 12)}</code>,{" "}
            {integrity.fileCount} files;{" "}
            {Object.values(integrity.sources)
              .map((s) => `${s.repo}@${s.commit.slice(0, 7)}`)
              .join(", ")}
            . <em>Forma manet.</em>
          </>
        )}
      </p>
    </div>
  );
}
