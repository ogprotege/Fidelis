import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import Icon from "../components/Icon";
import SectionNav from "../components/SectionNav";
import {
  ManifestDoc,
  downloadBundle,
  idbClearCcc,
  idbPutCcc,
  importedTranslations,
  loadBook,
  loadCCCText,
  loadManifest
} from "../lib/data";
import { parseCccText } from "../lib/import-formats";
import {
  CalendarRegion,
  exportMarginalia,
  getOfflineTranslations,
  importMarginalia,
  markOfflineTranslation
} from "../lib/storage";
import { TRANSLATIONS, getTranslation } from "../lib/translations";
import { FONT_SIZE_PRESETS, SCRIPTURE_FONTS } from "../lib/typography";
import { THEME_OPTIONS } from "../lib/theme";
import { TRENT_EDITIONS } from "../lib/catechism";
import { formatBytes } from "../lib/format";
import { useSettings, useUpdateSettings } from "../SettingsContext";

/** The one Settings screen (spec §2.2), Catena-style: a live Scripture preview
 *  pinned on top — the living proof of every choice below — then the version,
 *  type, appearance, calendar, and data sections. Every control writes through
 *  the SettingsContext, so the preview (and the Reader, and the theme) react at
 *  once, with no reload. */

// Shown until Genesis 1:1–2 loads (and if it can't): a Vulgate line carrying the
// æ ligature, so the preview always demonstrates the face the spec asks it to.
const SAMPLE =
  "In principio creavit Deus cælum et terram. Terra autem erat inanis et vacua, et tenebræ erant super faciem abyssi.";

export default function Settings() {
  const settings = useSettings();
  const update = useUpdateSettings();
  const trans = getTranslation(settings.translation);

  // ── Live preview: Genesis 1:1–2 in the current translation (spec §2.2) ──────
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setPreview(null);
    loadBook(settings.translation, "genesis")
      .then((data) => {
        if (!alive) return;
        const ch = data.chapters[0] ?? [];
        const text = [ch[0], ch[1]].filter((s) => s && s.trim()).join(" ");
        setPreview(text || null);
      })
      .catch(() => alive && setPreview(null));
    return () => {
      alive = false;
    };
  }, [settings.translation]);
  const showingScripture = preview !== null;

  // ── Version cards: which non-bundled texts the user has imported ────────────
  const [imported, setImported] = useState<Set<string>>(new Set());
  useEffect(() => {
    importedTranslations().then(setImported).catch(() => {});
  }, []);

  // ── Data: manifest (for real sizes), offline record, download progress ──────
  const [manifest, setManifest] = useState<ManifestDoc | null>(null);
  useEffect(() => {
    loadManifest().then(setManifest).catch(() => {});
  }, []);
  const [offline, setOffline] = useState<string[]>(getOfflineTranslations);
  const [progress, setProgress] = useState<Record<string, { done: number; total: number }>>({});
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const download = async (id: string) => {
    setDownloadError(null);
    setProgress((p) => ({ ...p, [id]: { done: 0, total: 0 } }));
    try {
      await downloadBundle(id, (done, total) =>
        setProgress((p) => ({ ...p, [id]: { done, total } }))
      );
      markOfflineTranslation(id);
      setOffline(getOfflineTranslations());
    } catch (e) {
      // Only an actually-cached bundle earns the check mark; surface the failure instead.
      setDownloadError(e instanceof Error ? e.message : "Download failed — please try again with a connection.");
    } finally {
      setProgress((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
    }
  };

  // ── Data: export / import the library (P2-6) ────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null);
  const [transfer, setTransfer] = useState<string | null>(null);

  // ── Magisterium: the imported modern Catechism (spec §6, P2) ────────────────
  const cccFileRef = useRef<HTMLInputElement>(null);
  const [cccImported, setCccImported] = useState(false);
  const [cccBusy, setCccBusy] = useState(false);
  const [cccMsg, setCccMsg] = useState<string | null>(null);
  useEffect(() => {
    loadCCCText().then((d) => setCccImported(!!d)).catch(() => {});
  }, []);

  const onCccFile = async (file: File | undefined) => {
    if (!file) return;
    setCccBusy(true);
    setCccMsg(null);
    try {
      const doc = parseCccText(file.name, await file.text());
      await idbPutCcc(doc);
      setCccImported(true);
      setCccMsg(
        `Imported the Catechism on this device (${Object.keys(doc.paragraphs).length} paragraphs). Stored only here.`
      );
    } catch (e) {
      setCccMsg(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setCccBusy(false);
      if (cccFileRef.current) cccFileRef.current.value = "";
    }
  };

  const removeCcc = async () => {
    try {
      await idbClearCcc();
      setCccImported(false);
      setCccMsg("Removed the imported Catechism.");
    } catch (e) {
      setCccMsg(`Remove failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const doExport = () => {
    const data = exportMarginalia();
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fidelis-library-${data.exportedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setTransfer(
      `Exported ${data.bookmarks.length} bookmark(s), ${data.highlights.length} highlight(s), ${data.notes.length} note(s).`
    );
  };
  const doImport = async (file: File) => {
    try {
      const counts = importMarginalia(await file.text());
      setTransfer(
        `Imported ${counts.bookmarks} bookmark(s), ${counts.highlights} highlight(s), ${counts.notes} note(s) — merged with what was here; the newer entry won any conflict.`
      );
    } catch (e) {
      setTransfer(e instanceof Error ? e.message : "Could not read that file.");
    }
  };

  // The version radiogroup uses roving tabindex (ARIA APG): only the checked
  // radio is tabbable; arrow keys move selection + focus across the available
  // versions, wrapping at the ends.
  const availableIds = TRANSLATIONS.filter((t) => t.bundled || imported.has(t.id)).map((t) => t.id);

  return (
    <div className="page-narrow settings">
      <h1 className="page-title">Settings</h1>
      <SectionNav
        sections={[
          { id: "version", label: "Version" },
          { id: "text-size", label: "Text size" },
          { id: "font", label: "Font" },
          { id: "appearance", label: "Appearance" },
          { id: "calendar", label: "Calendar" },
          { id: "commentary", label: "Commentary" },
          { id: "magisterium", label: "Magisterium" },
          { id: "data", label: "Data" }
        ]}
      />

      {/* 1 ── Scripture preview (the living proof of every choice below) */}
      <section className="card preview-card">
        <h2>Scripture preview</h2>
        <p className="scripture-preview" style={{ fontSize: `${settings.fontSize}px` }}>
          {preview ?? SAMPLE}
        </p>
        <p className="preview-ref muted small">
          {showingScripture
            ? `Genesis 1:1–2 · ${trans?.abbrev ?? settings.translation}`
            : "Sample · Clementine Vulgate"}
        </p>
      </section>

      {/* 2 ── Bible version */}
      <section className="card" id="version">
        <h2>Bible version</h2>
        <div className="version-cards" role="radiogroup" aria-label="Bible version">
          {TRANSLATIONS.map((t) => {
            const selected = settings.translation === t.id;
            const available = t.bundled || imported.has(t.id);
            return (
              <div
                key={t.id}
                id={available ? `ver-${t.id}` : undefined}
                className={`version-card ${selected ? "active" : ""} ${available ? "" : "locked"}`}
                role={available ? "radio" : undefined}
                aria-checked={available ? selected : undefined}
                tabIndex={available ? (selected ? 0 : -1) : undefined}
                onClick={available ? () => update({ translation: t.id }) : undefined}
                onKeyDown={
                  available
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          update({ translation: t.id });
                        } else if (
                          e.key === "ArrowDown" ||
                          e.key === "ArrowRight" ||
                          e.key === "ArrowUp" ||
                          e.key === "ArrowLeft"
                        ) {
                          e.preventDefault();
                          const i = availableIds.indexOf(t.id);
                          const delta = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
                          const nextId =
                            availableIds[(i + delta + availableIds.length) % availableIds.length];
                          update({ translation: nextId });
                          document.getElementById(`ver-${nextId}`)?.focus();
                        }
                      }
                    : undefined
                }
              >
                <div className="version-abbrev">
                  {t.abbrev}
                  {selected && <Icon name="check" className="version-check" />}
                </div>
                <div className="version-name">{t.name}</div>
                <div className="version-meta muted small sans">
                  {t.language === "la" ? "Latin" : "English"} · {t.year}
                </div>
                {available ? (
                  <div className="version-prov small sans muted">
                    {t.bundled ? "Public domain · bundled" : "Imported on this device"}
                  </div>
                ) : (
                  <div className="version-lock small sans">
                    <span className="lock-badge">Under copyright</span>{" "}
                    <Link to={`/translations#${t.id}`}>Import a licensed copy →</Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="muted small sans">
          The chosen version is your default everywhere — Today, the book list, search, and
          the Reader. RSV-2CE and NABRE are under copyright; import a licensed copy you own.
        </p>
      </section>

      {/* 3 ── Text size */}
      <section className="card" id="text-size">
        <h2>Text size</h2>
        <div className="pill-row" role="group" aria-label="Text size">
          {FONT_SIZE_PRESETS.map((p) => (
            <button
              key={p.px}
              className={`pill ${settings.fontSize === p.px ? "active" : ""}`}
              aria-pressed={settings.fontSize === p.px}
              onClick={() => update({ fontSize: p.px, followSystemTextSize: false })}
            >
              {p.label}
              <span className="pill-sub">{p.px}</span>
            </button>
          ))}
        </div>
        <p className="muted small">The Reader's A− / A+ buttons fine-tune the size between presets.</p>
        {Capacitor.getPlatform() === "ios" && (
          <div className="setting-row">
            <div>
              <div className="setting-label">Follow the system text size</div>
              <p className="catechesis muted small">
                Match iOS Settings → Display &amp; Brightness → Text Size. Choosing a size above
                turns this off.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.followSystemTextSize}
              aria-label="Follow the system text size"
              className="switch"
              onClick={() => update({ followSystemTextSize: !settings.followSystemTextSize })}
            />
          </div>
        )}
      </section>

      {/* 4 ── Font (each pill rendered in its own face) */}
      <section className="card" id="font">
        <h2>Font</h2>
        <div className="pill-row" role="group" aria-label="Scripture font">
          {SCRIPTURE_FONTS.map((f) => (
            <button
              key={f.id}
              className={`pill ${settings.scriptureFont === f.id ? "active" : ""}`}
              aria-pressed={settings.scriptureFont === f.id}
              style={{ fontFamily: `var(${f.cssVar})` }}
              onClick={() => update({ scriptureFont: f.id })}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="muted small">
          Garamond is bundled with the app; Georgia, Times New Roman, and Sans-serif use your
          device's own fonts.
        </p>
      </section>

      {/* 5 ── Appearance */}
      <section className="card" id="appearance">
        <h2>Appearance</h2>
        <div className="pill-row" role="group" aria-label="Theme">
          {THEME_OPTIONS.map((o) => (
            <button
              key={o.id}
              className={`pill ${settings.theme === o.id ? "active" : ""}`}
              aria-pressed={settings.theme === o.id}
              onClick={() => update({ theme: o.id })}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-label">Follow the liturgical year</div>
            <p className="catechesis muted small">
              Accent color follows the Church's calendar: violet in Advent, rose on Gaudete.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.followLiturgicalYear}
            aria-label="Follow the liturgical year"
            className="switch"
            onClick={() => update({ followLiturgicalYear: !settings.followLiturgicalYear })}
          />
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-label">The reading-time indulgence</div>
            <p className="catechesis muted small">
              Show a quiet line after a half-hour of reading, with the Church's indulgence
              for it. Off hides it entirely.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.showIndulgence}
            aria-label="The reading-time indulgence"
            className="switch"
            onClick={() => update({ showIndulgence: !settings.showIndulgence })}
          />
        </div>
      </section>

      {/* 6 ── Calendar (region moved here from the Readings toolbar, spec §2.2) */}
      <section className="card" id="calendar">
        <h2>Calendar</h2>
        <div className="setting-row">
          <div>
            <div className="setting-label">Region</div>
            <p className="catechesis muted small">
              Governs the dates of Epiphany and the Ascension and the U.S. proper days. The default
              is the <strong>United States</strong> (USCCB), to match the NABRE U.S.-lectionary
              readings. (Boston, Hartford, New York, Omaha, and Philadelphia keep Ascension
              Thursday.)
            </p>
          </div>
          <select
            value={settings.calendarRegion}
            aria-label="Calendar region"
            onChange={(e) => update({ calendarRegion: e.target.value as CalendarRegion })}
          >
            <option value="universal">Universal</option>
            <option value="usa">United States</option>
          </select>
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-label">Mass readings</div>
            <p className="catechesis muted small">
              The translation the Daily Readings screen shows. The default is the{" "}
              <strong>NABRE</strong> — the translation of the U.S. lectionary. <strong>Match
              region</strong> instead follows your calendar region (the NABRE for the United States,
              the Douay-Rheims elsewhere). The NABRE is under copyright and not bundled; import your
              licensed copy on the <Link to="/translations">Translations</Link> page and it appears
              here automatically. Until then the readings fall back to the bundled Douay-Rheims.
            </p>
          </div>
          <select
            value={settings.massTranslation}
            aria-label="Mass readings translation"
            onChange={(e) => update({ massTranslation: e.target.value })}
          >
            <option value="">Match region</option>
            {TRANSLATIONS.filter((t) => t.bundled || t.id === "nabre" || t.id === "rsv2ce").map((t) => (
              <option key={t.id} value={t.id}>
                {t.abbrev}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* 7 ── Commentary (spec §2.2 item 7 / §4.2) */}
      <section className="card" id="commentary">
        <h2>Commentary</h2>
        <div className="setting-row">
          <div>
            <div className="setting-label">Show commentary</div>
            <p className="catechesis muted small">
              Mark verses that carry a Haydock note with a small gold dot, and offer
              commentary from the verse actions. Off leaves the bare page.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.commentaryEnabled}
            aria-label="Show commentary"
            className="switch"
            onClick={() => update({ commentaryEnabled: !settings.commentaryEnabled })}
          />
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-label">Haydock</div>
            <p className="catechesis muted small">
              The classic annotated Douay, across the whole canon. Off also hides the gold
              commentary dots on the page.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.commentaryHaydock}
            aria-label="Haydock commentary"
            className="switch"
            disabled={!settings.commentaryEnabled}
            onClick={() => update({ commentaryHaydock: !settings.commentaryHaydock })}
          />
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-label">Church Fathers</div>
            <p className="catechesis muted small">
              The Catena Aurea — St. Thomas Aquinas's chain of the Church Fathers on the
              four Gospels.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.commentaryCatena}
            aria-label="Church Fathers commentary"
            className="switch"
            disabled={!settings.commentaryEnabled}
            onClick={() => update({ commentaryCatena: !settings.commentaryCatena })}
          />
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-label">Doctors of the Church only</div>
            <p className="catechesis muted small">
              Open the Church Fathers filtered to the Doctors of the Church; you can change
              it within the sheet.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.commentaryDoctorsOnly}
            aria-label="Doctors of the Church only"
            className="switch"
            disabled={!settings.commentaryEnabled || !settings.commentaryCatena}
            onClick={() => update({ commentaryDoctorsOnly: !settings.commentaryDoctorsOnly })}
          />
        </div>
      </section>

      {/* 8 ── Magisterium (spec §5 — the CCC citation links) */}
      <section className="card" id="magisterium">
        <h2>Magisterium</h2>
        <div className="setting-row">
          <div>
            <div className="setting-label">Catechism cross-references</div>
            <p className="catechesis muted small">
              Where the Catechism cites a verse, offer it from the verse actions — the
              bundled Roman Catechism (Trent), shown inline, with the vatican.va links to
              the modern Catechism kept inside the same sheet. No modern Catechism text is
              bundled.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.cccLinksEnabled}
            aria-label="Catechism cross-references"
            className="switch"
            onClick={() => update({ cccLinksEnabled: !settings.cccLinksEnabled })}
          />
        </div>
        {settings.cccLinksEnabled && TRENT_EDITIONS.length > 1 && (
          <div className="setting-row">
            <div>
              <div className="setting-label">Roman Catechism edition</div>
              <p className="catechesis muted small">
                Donovan (1829) is the classic English; McHugh-Callan (1923) reads in
                more modern English. Both are public domain and bundled.
              </p>
            </div>
            <select
              aria-label="Roman Catechism edition"
              value={settings.trentEdition}
              onChange={(e) =>
                update({ trentEdition: e.target.value as (typeof TRENT_EDITIONS)[number]["id"] })
              }
            >
              {TRENT_EDITIONS.map((ed) => (
                <option key={ed.id} value={ed.id}>{ed.label}</option>
              ))}
            </select>
          </div>
        )}
        <hr className="rule" />
        <input
          ref={cccFileRef}
          type="file"
          accept=".json,application/json"
          style={{ display: "none" }}
          onChange={(e) => onCccFile(e.target.files?.[0])}
        />
        <div className="setting-label">Import the modern Catechism (a copy you own)</div>
        <p className="catechesis muted small">
          The Catechism of the Catholic Church is under copyright and is never bundled. If you
          own a digital copy, import it here — it is stored only on this device, and a cited
          verse will then show its paragraph text inline instead of a link out. Accepts a{" "}
          <code>fidelis-ccc-1</code> JSON (from the local converter) or a St. Charles Borromeo
          Catechism export (the <code>ccc.json</code> from scborromeo.org) directly.
        </p>
        <div className="import-zone">
          {cccImported ? (
            <button className="icon-btn" onClick={removeCcc}>
              Remove imported Catechism
            </button>
          ) : (
            <button className="icon-btn" onClick={() => cccFileRef.current?.click()} disabled={cccBusy}>
              {cccBusy ? "Importing…" : "Import the Catechism"}
            </button>
          )}
          {cccMsg && <p className="muted small" style={{ marginTop: "0.4rem" }}>{cccMsg}</p>}
        </div>
      </section>

      {/* 8 ── Data */}
      <section className="card" id="data">
        <h2>Data</h2>

        <div className="setting-label">Download for offline</div>
        <p className="catechesis muted small">
          Save a bundled translation's full text — or the Fathers' commentary — to this device
          so it reads with no connection.
        </p>
        {TRANSLATIONS.filter((t) => t.bundled).map((t) => {
          const bytes = manifest?.bundles?.[t.id]?.bytes;
          const prog = progress[t.id];
          const saved = offline.includes(t.id);
          return (
            <div className="download-row" key={t.id}>
              <span>
                <span className="download-name">{t.abbrev}</span>{" "}
                <span className="muted small sans">{bytes != null ? formatBytes(bytes) : "—"}</span>
              </span>
              {prog ? (
                <span className="muted small sans">
                  {prog.total ? `Saving… ${prog.done}/${prog.total}` : "Saving…"}
                </span>
              ) : (
                <button className="pill" onClick={() => download(t.id)}>
                  {saved ? <>Saved <Icon name="check" /> · Update</> : "Download"}
                </button>
              )}
            </div>
          );
        })}
        {(() => {
          const bytes = manifest?.bundles?.commentary?.bytes;
          const prog = progress.commentary;
          const saved = offline.includes("commentary");
          return (
            <div className="download-row">
              <span>
                <span className="download-name">Commentary</span>{" "}
                <span className="muted small sans">
                  Haydock + Catena · {bytes != null ? formatBytes(bytes) : "—"}
                </span>
              </span>
              {prog ? (
                <span className="muted small sans">
                  {prog.total ? `Saving… ${prog.done}/${prog.total}` : "Saving…"}
                </span>
              ) : (
                <button className="pill" onClick={() => download("commentary")}>
                  {saved ? <>Saved <Icon name="check" /> · Update</> : "Download"}
                </button>
              )}
            </div>
          );
        })()}
        {downloadError && <p className="notice small">{downloadError}</p>}

        <hr className="rule" />

        <div className="setting-label">My notes and highlights</div>
        <p className="catechesis muted small">
          Your bookmarks, highlights, and notes live only in this browser — export them now and
          then so a lost device does not take your marginalia with it.
        </p>
        <div className="pill-row">
          <button className="pill" onClick={doExport}>
            <Icon name="download" /> Export (JSON)
          </button>
          <button className="pill" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" /> Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doImport(f);
              e.target.value = "";
            }}
          />
        </div>
        {transfer && <p className="muted small sans">{transfer}</p>}

        <hr className="rule" />

        <p className="muted small sans" style={{ marginBottom: 0 }}>
          {manifest?.rootHash && (
            <>
              Texts verified · manifest <code>{manifest.rootHash.slice(0, 12)}</code> ·{" "}
            </>
          )}
          <Link to="/about">About &amp; sources →</Link>
        </p>
      </section>
    </div>
  );
}
