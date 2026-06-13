import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadBook } from "../lib/data";
import { getSettings, saveSettings } from "../lib/storage";
import { getTranslation } from "../lib/translations";
import { FONT_SIZE_PRESETS, SCRIPTURE_FONTS, ScriptureFont } from "../lib/typography";

/** Typography settings (spec §1.4), with the live Scripture preview pinned at
 *  the top (spec §2.2). The fuller Settings screen — versions, appearance,
 *  calendar, notifications — folds into this page when §2.2 ships; theme and
 *  the liturgical-year accent stay in the header until then. */

// Shown until Genesis 1:1–2 loads (and if it can't): a Vulgate line carrying the
// æ ligature, so the preview always demonstrates the face the spec asks it to.
const SAMPLE =
  "In principio creavit Deus cælum et terram. Terra autem erat inanis et vacua, et tenebræ erant super faciem abyssi.";

export default function Settings() {
  // Read settings once per mount, not per render (P2-8).
  const [settings] = useState(getSettings);
  const translation = settings.translation;
  const trans = getTranslation(translation);

  const [fontSize, setFontSize] = useState(settings.fontSize);
  const [scriptureFont, setScriptureFont] = useState<ScriptureFont>(settings.scriptureFont);
  const [preview, setPreview] = useState<string | null>(null);

  // Genesis 1:1–2 in the current translation (spec §2.2). Falls back to the
  // Latin sample if the text isn't bundled or fails to load.
  useEffect(() => {
    let alive = true;
    setPreview(null);
    loadBook(translation, "genesis")
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
  }, [translation]);

  // The preview and Reader pick up the face from the global --scripture custom
  // property; setting <html data-font> here re-skins both instantly.
  const chooseFont = (f: ScriptureFont) => {
    setScriptureFont(f);
    saveSettings({ scriptureFont: f });
    document.documentElement.dataset.font = f;
  };
  const chooseSize = (px: number) => {
    setFontSize(px);
    saveSettings({ fontSize: px });
  };

  const showingScripture = preview !== null;

  return (
    <div className="page-narrow settings">
      <h1 className="page-title">Settings</h1>

      <section className="card preview-card">
        <h2>Scripture preview</h2>
        <p className="scripture-preview" style={{ fontSize: `${fontSize}px` }}>
          {preview ?? SAMPLE}
        </p>
        <p className="preview-ref muted small">
          {showingScripture
            ? `Genesis 1:1–2 · ${trans?.abbrev ?? translation}`
            : "Sample · Clementine Vulgate"}
        </p>
      </section>

      <section className="card">
        <h2>Text size</h2>
        <div className="pill-row" role="group" aria-label="Text size">
          {FONT_SIZE_PRESETS.map((p) => (
            <button
              key={p.px}
              className={`pill ${fontSize === p.px ? "active" : ""}`}
              aria-pressed={fontSize === p.px}
              onClick={() => chooseSize(p.px)}
            >
              {p.label}
              <span className="pill-sub">{p.px}</span>
            </button>
          ))}
        </div>
        <p className="muted small">The Reader's A− / A+ buttons fine-tune the size between presets.</p>
      </section>

      <section className="card">
        <h2>Font</h2>
        <div className="pill-row" role="group" aria-label="Scripture font">
          {SCRIPTURE_FONTS.map((f) => (
            <button
              key={f.id}
              className={`pill ${scriptureFont === f.id ? "active" : ""}`}
              aria-pressed={scriptureFont === f.id}
              style={{ fontFamily: `var(${f.cssVar})` }}
              onClick={() => chooseFont(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="muted small">
          Garamond is bundled with the app; serif and sans use your device's own fonts.
        </p>
      </section>

      <p className="muted small settings-foot">
        Theme and the liturgical-year accent live in the header for now.{" "}
        <Link to="/about">About Fidelis →</Link>
      </p>
    </div>
  );
}
