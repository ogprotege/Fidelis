import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ReadingText from "../components/ReadingText";
import {
  DayReadings,
  displayReadings,
  readingsForDate,
  sundayCycle,
  weekdayCycle
} from "../lib/lectionary";
import { COLOR_HEX, liturgicalDay } from "../lib/liturgical";
import { CalendarRegion, getSettings, saveSettings } from "../lib/storage";
import { TRANSLATIONS } from "../lib/translations";

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

  const [translation, setTranslation] = useState(getSettings().translation);
  const [region, setRegion] = useState<CalendarRegion>(getSettings().calendarRegion);
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
        <select value={translation} onChange={(e) => setTranslation(e.target.value)}>
          {TRANSLATIONS.filter((t) => t.bundled).map((t) => (
            <option key={t.id} value={t.id}>
              {t.abbrev}
            </option>
          ))}
        </select>
        <select
          value={region}
          onChange={(e) => {
            const v = e.target.value as CalendarRegion;
            saveSettings({ calendarRegion: v });
            setRegion(v);
          }}
          title="Calendar region — governs the dates of Epiphany and the Ascension and the U.S. proper days. (The provinces of Boston, Hartford, New York, Omaha, and Philadelphia keep Ascension Thursday.)"
        >
          <option value="universal">Universal</option>
          <option value="usa">United States</option>
        </select>
      </div>

      <div className="card" style={{ margin: "1rem 0" }}>
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
        <p className="muted small sans" style={{ marginBottom: 0 }}>
          {cycleLabel}
        </p>
      </div>

      {readings === "loading" && <p className="loading">Finding the readings…</p>}
      {readings === null && (
        <p className="notice">
          No readings found for this date — this should not happen; please use the
          reader directly.
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
          verses are shown — the text itself is never altered.
        </p>
      )}
    </div>
  );
}
