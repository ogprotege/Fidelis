import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import SectionNav from "../components/SectionNav";
import { ManifestDoc, loadManifest } from "../lib/data";

const SECTIONS = [
  { id: "canon", label: "Canon" },
  { id: "texts", label: "Texts" },
  { id: "embed", label: "Embed" },
  { id: "privacy", label: "Privacy" },
  { id: "sources", label: "Sources" }
];

const WIDGET_SNIPPET = `<iframe
  id="fidelis-votd"
  src="https://YOUR-DOMAIN/#/widget/votd"
  style="border:0;width:100%;max-width:30rem;height:12rem"
  title="Verse of the Day"
></iframe>`;

const WIDGET_HEIGHT_MIN = 120;
const WIDGET_HEIGHT_MAX = 1600;

const RESIZE_SNIPPET = `<script>
  const frame = document.getElementById("fidelis-votd");
  const widgetOrigin = new URL(frame.src, window.location.href).origin;
  window.addEventListener("message", (event) => {
    if (event.origin !== widgetOrigin || event.source !== frame.contentWindow) return;
    if (event.data?.type !== "fidelis:widget-resize") return;
    if (event.data?.version !== 1) return;
    const height = Number(event.data.height);
    if (!Number.isFinite(height) || height <= 0) return;
    frame.style.height = Math.min(${WIDGET_HEIGHT_MAX}, Math.max(${WIDGET_HEIGHT_MIN}, Math.ceil(height))) + "px";
  });
</script>`;

export default function About() {
  const [integrity, setIntegrity] = useState<ManifestDoc | null>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const [previewHeight, setPreviewHeight] = useState(220);
  useEffect(() => {
    loadManifest()
      .then((m) => {
        if (m?.rootHash && m?.sources) setIntegrity(m);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      const frame = previewRef.current;
      if (
        !frame ||
        event.origin !== window.location.origin ||
        event.source !== frame.contentWindow ||
        typeof event.data !== "object" ||
        event.data === null ||
        !("type" in event.data) ||
        event.data.type !== "fidelis:widget-resize" ||
        !("version" in event.data) ||
        event.data.version !== 1 ||
        !("height" in event.data)
      ) {
        return;
      }
      const height = Number(event.data.height);
      if (!Number.isFinite(height) || height <= 0) return;
      setPreviewHeight(
        Math.min(WIDGET_HEIGHT_MAX, Math.max(WIDGET_HEIGHT_MIN, Math.ceil(height)))
      );
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="page-narrow" style={{ margin: "0 auto" }}>
      <h1 className="page-title">About Fidelis</h1>
      <SectionNav sections={SECTIONS} />
      <p>
        <strong>Fidelis</strong> (Latin: <em>faithful</em>) is a Catholic Bible app
        built on one conviction: <em>the text is not ours to edit</em>. Every
        bundled translation is reproduced verbatim from its public-domain source —
        no paraphrasing, no softening of hard sayings, no quiet "updates" to suit
        the fashion of the moment. What the translators wrote is what you read.
      </p>

      <h2 className="testament-title" id="canon">The Canon</h2>
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

      <h2 className="testament-title" id="texts">The Texts</h2>
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
          copy. The NABRE is the translation used by the U.S. lectionary. Fidelis
          keeps three choices separate: the calendar jurisdiction, the lectionary
          edition, and the Bible text used to display each reading. A new install
          selects the verified U.S. calendar profile, the derived Roman Mass citation table, and NABRE display
          preference. Until you import a licensed NABRE copy, reading text falls
          back visibly to the Douay-Rheims. Each choice can be changed in Settings.
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

      <h2 className="testament-title" id="embed">Embed the Verse of the Day</h2>
      <p>
        Every web install of Fidelis exposes an embeddable Verse-of-the-Day widget at{" "}
        <code>/#/widget/votd</code>. This live preview stays inside the About page:
      </p>
      <div className="embed-preview-shell">
        <iframe
          ref={previewRef}
          className="embed-preview"
          src="#/widget/votd?theme=day"
          style={{ height: `${previewHeight}px` }}
          title="Verse of the Day widget preview"
        />
      </div>
      <p className="small muted">
        The resize listener verifies both the widget's origin and its window before
        applying the reported height, so longer passages are not clipped. You can also{" "}
        <Link className="embed-standalone-link" to="/widget/votd">open the standalone view</Link>.
      </p>
      <pre className="embed-snippet">{WIDGET_SNIPPET}</pre>
      <pre className="embed-snippet">{RESIZE_SNIPPET}</pre>

      <h2 className="testament-title" id="privacy">Privacy &amp; Offline</h2>
      <p>
        There is no account, no tracking, and no server: your bookmarks,
        highlights, and notes stay in the app's storage on this device —
        Fidelis transmits nothing. (Your own device backup may include them,
        as with any app.) Once a book has been opened it is cached for offline
        reading, and the app may be installed to your home screen as a PWA.
      </p>

      <h2 className="testament-title" id="sources">Sources</h2>
      <p className="small">
        Scripture texts are drawn from the public-domain corpus collected by the{" "}
        <a href="https://github.com/scrollmapper/bible_databases" target="_blank" rel="noreferrer">
          scrollmapper/bible_databases
        </a>{" "}
        project (DRC, CPDV, VulgClementine) and reproduced exactly as that corpus
        carries them, with no editorial changes; its shared verse grid and its few
        gaps are described in the note on numbering above. The calendar engine
        composes versioned Ordinary Form packs with stable celebration and
        formulary identifiers. Its exact verified catalog is the General Roman
        Calendar and the U.S. particular calendar, with separate profiles for
        provinces that observe Ascension on Sunday or Thursday. Boston, Hartford,
        New York, Omaha, and Philadelphia keep Ascension Thursday. Other countries
        and dioceses receive an explicit General Roman fallback notice, not a claim
        of verified local coverage. The source catalog cites the{" "}
        <a
          href="https://www.vatican.va/content/romancuria/en/dicasteri/dicastero-culto-divino-e-disciplina-sacramenti/documenti.html"
          target="_blank"
          rel="noreferrer"
        >
          Holy See
        </a>{" "}
        and the{" "}
        <a
          href="https://www.usccb.org/prayer-and-worship/liturgical-year-and-calendar/proper-calendar"
          target="_blank"
          rel="noreferrer"
        >
          USCCB proper calendar
        </a>. Daily Mass reading citations use the independently selected lectionary
        pack. The bundled derived Roman citation pack follows Roman Lectionary cycles
        (Sundays A/B/C, weekdays I/II), from the public-domain tables of{" "}
        <a
          href="https://github.com/jayarathina/Tamil-Catholic-Lectionary"
          target="_blank"
          rel="noreferrer"
        >
          jayarathina/Tamil-Catholic-Lectionary
        </a>.
      </p>
      <p className="small">
        The Quote of the Day is drawn from a curated corpus of the Fathers,
        Doctors, and saints in public-domain translations only (NPNF/ANF, Pusey's{" "}
        <em>Confessions</em>, the Dominican Fathers' <em>Summa</em>, Taylor's{" "}
        <em>Story of a Soul</em>, and the like). Every quotation carries its full
        source citation — work, locus, and translation — because the Catholic
        internet is a sea of apocryphal saint quotes, and the attribution is part
        of the gift. Every entry has now been checked against its public-domain
        source and marked verified; the corpus and its verification state live in
        the repository in the open.
      </p>
      <p className="small">
        The <strong>Saint of the Day</strong> and <strong>Today in Church
        History</strong> layers cover every calendar date (366 days, including
        February 29) — one principal saint per day, and at least one sourced
        Church-history event. Pre-1900 lives rest on the Catholic Encyclopedia
        (1913), Butler&rsquo;s <em>Lives</em>, and the Roman Martyrology;
        modern entries use church-official sources (vatican.va) labelled as such.
        Text is drawn from those works, never AI-paraphrased. Every
        Church-history event has been proof-read against its named edition; the
        saints&rsquo; lives are sourced drafts awaiting that pass, and each one
        says so on its own page.
      </p>
      <p className="small">
        The commentary is two public-domain monuments. <strong>Haydock</strong> —
        the classic annotated Douay, notes by Haydock, Challoner, Calmet, Witham,
        and others across the whole canon — is the 1883 Dunigan edition as the{" "}
        <a href="https://github.com/cmahte/ENG-B-Haydock1883-pd-PSFM" target="_blank" rel="noreferrer">
          cmahte
        </a>{" "}
        USFM transcription. The <strong>Catena Aurea</strong> — St. Thomas
        Aquinas's chain of the Church Fathers on the four Gospels, in the
        Newman&nbsp;/&nbsp;Oxford translation (1841–45) that St. John Henry Newman
        edited — is the CC0{" "}
        <a href="https://github.com/Isidore-Guild/catena" target="_blank" rel="noreferrer">
          Isidore-Guild
        </a>{" "}
        OSIS. Both are reproduced verbatim — no summaries, no paraphrase — and
        their per-Father attributions are normalized only to group and label the
        Fathers, never to alter a word. Where the Gospel Catena names a Father
        ambiguously, the historic identity is kept: &ldquo;Isidore&rdquo; is
        Isidore of Pelusium, not the Doctor of Seville; &ldquo;Dionysius&rdquo; the
        Areopagite is the pseudonymous corpus.
      </p>
      <p className="small">
        Where the <strong>Catechism of the Catholic Church</strong> cites a verse,
        the verse actions show a quiet Catechism paragraph row that links to that
        paragraph on{" "}
        <a href="https://www.vatican.va/archive/ENG0015/_INDEX.HTM" target="_blank" rel="noreferrer">
          vatican.va
        </a>
        . The links come from the Catechism's own Index of Citations (Psalm
        references mapped to the Vulgate numbering the bundles use); only the
        citation facts are stored — the Catechism text is never bundled, and the
        links simply open the official text.
      </p>
      <p className="small muted" id="integrity">
        All sources are fetched at commits pinned by hash — never a moving
        branch — and every bundled data file is sealed by a SHA-256 manifest
        that the project's data harness verifies on every build (this is a
        build-time seal, not a live check of your device's cache).
        {integrity && (
          <>
            {" "}
            Verified at build — manifest root <code>{integrity.rootHash.slice(0, 12)}</code>,{" "}
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
