import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ReadingText from "../components/ReadingText";
import {
  DayReadings,
  displayReadings,
  readingsForDate,
  sundayCycle,
  weekdayCycle
} from "../lib/lectionary";
import { COLOR_HEX, liturgicalDay } from "../lib/liturgical";
import { TRANSLATIONS } from "../lib/translations";
import { massTranslationFor } from "../lib/storage";
import { importedTranslations } from "../lib/data";
import { useSettings } from "../SettingsContext";

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function Readings() {
  const [params, setParams] = useSearchParams();
  const dateParam = params.get("date");
  const date = useMemo(() => {
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const [y, m, d] = dateParam.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [dateParam]);

  // The calendar region lives on the Settings screen now (spec §2.2); read it
  // live from context so changing it there re-resolves this page at once. The
  // reading translation stays a local switcher on this toolbar.
  const settings = useSettings();
  const region = settings.calendarRegion;
  // Default the readings to the Mass translation — the NABRE for the USA region
  // (the U.S. lectionary text) — and let the toolbar swap it for this visit.
  const [translation, setTranslation] = useState(() => massTranslationFor(settings));
  const [imported, setImported] = useState<Set<string>>(new Set());
  useEffect(() => {
    importedTranslations().then(setImported).catch(() => {});
  }, []);
  const [readings, setReadings] = useState<DayReadings | null | "loading">("loading");
  const lit = liturgicalDay(date, region);

  useEffect(() => {
    let alive = true;
    setReadings("loading");
    readingsForDate(date)
      .then((r) => alive && setReadings(r))
      .catch(() => alive && setReadings(null));
    return () => {
      alive = false;
    };
  }, [date, region]);

  const go = (d: Date) => setParams({ date: toISO(d) });
  const shift = (days: number) =>
    go(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));

  const cycleLabel = `Sunday Cycle ${sundayCycle(date)} · Weekday Year ${
    weekdayCycle(date) === "1" ? "I" : "II"
  }`;

  // Ordered, labeled sections — incl. the Easter Vigil ladder (P1-7).
  const sections = useMemo(
    () => (readings === "loading" || !readings ? [] : displayReadings(readings)),
    [readings]
  );
  // P1-6: ferial readings offered alongside a memorial's prescribed propers.
  const secondarySections = useMemo(
    () =>
      readings !== "loading" && readings?.secondary
        ? displayReadings({ code: readings.secondary.code, rows: readings.secondary.rows })
        : [],
    [readings]
  );

  return (
    <div className="page-narrow" style={{ margin: "0 auto" }}>
      <h1 className="page-title">Daily Mass Readings</h1>
      <div className="readings-toolbar sans">
        <button className="icon-btn" onClick={() => shift(-1)}>
          ← Previous
        </button>
        <input
          type="date"
          value={toISO(date)}
          onChange={(e) => e.target.value && setParams({ date: e.target.value })}
        />
        <button className="icon-btn" onClick={() => go(new Date())}>
          Today
        </button>
        <button className="icon-btn" onClick={() => shift(1)}>
          Next →
        </button>
        <select
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
          title="Reading translation"
        >
          {TRANSLATIONS.filter((t) => t.bundled || imported.has(t.id) || t.id === "nabre").map((t) => (
            <option key={t.id} value={t.id}>
              {t.abbrev}
              {!t.bundled && !imported.has(t.id) ? " (import)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="card card-spaced">
        <h2>
          {date.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
          })}
          <span className="spacer" />
          <span className="lit-color-chip" style={{ background: COLOR_HEX[lit.color] }} />
        </h2>
        <div className="lit-season">
          <strong>{lit.seasonLabel}</strong>
        </div>
        {lit.celebrations.map((c) => (
          <div className="lit-celebration" key={c.name}>
            <span className="rank">{c.rank}</span>
            {c.name}
          </div>
        ))}
        <p className="muted small sans mb-0">
          {cycleLabel}
        </p>
      </div>

      {readings === "loading" && <p className="loading">Finding the readings…</p>}
      {readings === null && (
        <p className="notice">
          Readings for this date aren't available here.{" "}
          <Link to="/read">Open the reader</Link>.
        </p>
      )}
      {readings !== "loading" && readings && readings.primaryLabel && (
        <h2 className="testament-title">{readings.primaryLabel}</h2>
      )}
      {readings !== "loading" &&
        readings &&
        sections.map((sec, si) => (
          <section key={si} className="reading-group">
            {sec.map(({ label, row }, i) => (
              <ReadingText
                key={`${row.t}-${row.b}-${i}`}
                row={row}
                translation={translation}
                label={label}
              />
            ))}
          </section>
        ))}
      {readings !== "loading" && readings && readings.secondary && (
        <>
          <h2 className="testament-title">{readings.secondary.label}</h2>
          {secondarySections.map((sec, si) => (
            <section key={`f-${si}`} className="reading-group">
              {sec.map(({ label, row }, i) => (
                <ReadingText
                  key={`f-${row.t}-${row.b}-${i}`}
                  row={row}
                  translation={translation}
                  label={label}
                />
              ))}
            </section>
          ))}
        </>
      )}

      {readings !== "loading" && readings && (
        <p className="muted small sans">
          Lectionary day: <code>{readings.code}</code>
          {readings.secondary && (
            <>
              {" "}
              · {readings.secondary.label}: <code>{readings.secondary.code}</code>
            </>
          )}
          . Citations follow the Roman
          Lectionary; psalms are shown with both modern and Vulgate chapter numbers,
          e.g. Psalm 23(22), with verse numbers following the Vulgate text as
          rendered. Where the lectionary subdivides verses (e.g. “12b”), whole
          verses are shown — the text itself is never altered. The official U.S. daily
          readings (NABRE) are published at the{" "}
          <a href="https://bible.usccb.org/daily-bible-reading" target="_blank" rel="noopener noreferrer">
            USCCB
          </a>
          .
        </p>
      )}
    </div>
  );
}
