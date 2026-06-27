import { useEffect, useState } from "react";
import { CCCText, TrentEdition, TrentFile, loadCCCText, loadTrent } from "../lib/data";
import { capParagraphs } from "../lib/ccc";
import { pickEdition, pickTier, TrentEditionId } from "../lib/catechism";

interface Props {
  book: string;
  chapter: number;
  verse: number;
  /** e.g. "John 3:16" — the sheet heading; matches Sheet's aria-labelledby. */
  refLabel: string;
  titleId: string;
  /** The CCC ¶ numbers that cite this verse (from the §5 index). */
  paras: number[];
  /** ¶ → vatican.va page (the §5 url map). */
  urls: Record<string, string>;
  /** The reader's chosen Trent edition. */
  edition: TrentEditionId;
}

/**
 * Spec §5 (text tier) — the inline catechism sheet. Tier 2 (default): the bundled
 * PD Roman Catechism (Trent), browsable by Part → section. Tier 3 (always, when
 * the verse is cited): the precise vatican.va ¶ links, now living INSIDE the sheet
 * rather than a forced redirect. Tier 1 ("imported" supersede) is the P2 seam:
 * `imported` is false here, so pickTier never returns "imported" yet.
 *
 * Two-accent (§8.2): everything interactive/structural is purple; the source
 * credit is plain muted provenance — NO gold in this sheet.
 */
export default function CCCSheet({ refLabel, titleId, paras, urls, edition }: Props) {
  const [trent, setTrent] = useState<TrentFile | null>(null);
  const [cccText, setCccText] = useState<CCCText | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<{ partId: string; secId: string } | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let alive = true;
    loadTrent()
      .then((t) => { if (alive) { setTrent(t); setLoading(false); } })
      .catch(() => { if (alive) { setTrent(null); setLoading(false); } });
    void loadCCCText().then((d) => { if (alive) setCccText(d); });
    return () => { alive = false; };
  }, []);

  const tier = pickTier({ imported: !!cccText, hasParas: paras.length > 0, trent: !!trent });
  const ed: TrentEdition | null = trent ? pickEdition(trent, edition) : null;
  const section =
    ed && open
      ? ed.parts.find((p) => p.id === open.partId)?.sections.find((s) => s.id === open.secId) ?? null
      : null;
  const { shown, more } = capParagraphs(paras);

  return (
    <div className="ccc-sheet">
      <h2 id={titleId} className="ccc-sheet-title">{refLabel}</h2>

      {/* Tier 1 — the owner's imported modern Catechism, superseding Trent for the
          cited ¶. A ¶ the import omits falls back to its precise vatican.va link. */}
      {tier === "imported" && cccText && (
        <div className="ccc-imported">
          {paras.map((n) => {
            const body = cccText.paragraphs[String(n)];
            return (
              <div className="ccc-para" key={n}>
                <span className="ccc-para-num">¶{n}</span>
                {body ? (
                  <p className="ccc-para-text" lang={cccText.language}>{body}</p>
                ) : (
                  <p className="ccc-para-text muted small">
                    Not in your imported copy —{" "}
                    <a href={urls[String(n)]} target="_blank" rel="noopener noreferrer">
                      read ¶{n} on vatican.va
                    </a>.
                  </p>
                )}
              </div>
            );
          })}
          <p className="ccc-credit muted small">{cccText.edition} · imported on this device.</p>
        </div>
      )}

      {/* Tier 2 — the bundled Roman Catechism (Trent), browsable by Part. Gated on
          `tier !== "imported"`, NOT `=== "trent"`: while Trent is still loading,
          `trent` is null, so pickTier returns "links" (and on a failed fetch it stays
          "links"). A `=== "trent"` gate would therefore hide the `loading` spinner and
          the "isn't available" message until/unless the fetch resolved successfully —
          they'd be dead branches. In P1 `imported` is always false, so this block owns
          every non-supersede state and its inner ladder handles loading/null/section/TOC. */}
      {tier !== "imported" &&
        (loading ? (
          <p className="cmt-loading muted small sans">Opening the Catechism…</p>
        ) : !ed ? (
          <p className="muted small sans">The Roman Catechism isn't available on this device.</p>
        ) : section ? (
          <div className="ccc-section">
            <button type="button" className="ccc-back" onClick={() => setOpen(null)}>
              ← All sections
            </button>
            <h3 className="ccc-sec-title">{section.title}</h3>
            <div className="ccc-prose" dangerouslySetInnerHTML={{ __html: section.html }} />
          </div>
        ) : (
          <div className="ccc-toc">
            <p className="ccc-note muted small sans">
              The Roman Catechism is arranged by the Creed, the Sacraments, the
              Commandments, and the Lord's Prayer rather than by verse — browse below.
            </p>
            {ed.parts.map((p) => (
              <div className="ccc-toc-part" key={p.id}>
                <div className="ccc-toc-part-title">{p.title}</div>
                <ul className="ccc-toc-secs">
                  {p.sections.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className="ccc-toc-sec"
                        onClick={() => setOpen({ partId: p.id, secId: s.id })}
                      >
                        {s.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="ccc-credit muted small sans">{ed.edition} · public domain</div>
          </div>
        ))}

      {/* Tier 3 — the §5 vatican.va ¶ links, now inside the sheet (never lost). */}
      {paras.length > 0 && (
        <div className="ccc-row">
          <span className="ccc-label">Read on vatican.va</span>
          {(expanded ? paras : shown).map((p) =>
            urls[String(p)] ? (
              <a
                key={p}
                className="ccc-ref"
                href={urls[String(p)]}
                target="_blank"
                rel="noopener noreferrer"
              >
                ¶{p}
              </a>
            ) : (
              <span key={p} className="ccc-ref muted">¶{p}</span>
            )
          )}
          {!expanded && more > 0 && (
            <button type="button" className="ccc-more" onClick={() => setExpanded(true)}>
              +{more} more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
