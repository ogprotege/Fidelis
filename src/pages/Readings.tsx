import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ReadingText from "../components/ReadingText";
import {
  DayReadings,
  READING_LABELS,
  readingsForDate,
  sundayCycle,
  weekdayCycle
} from "../lib/lectionary";
import { COLOR_HEX, liturgicalDay } from "../lib/liturgical";
import { getSettings } from "../lib/storage";
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
  const [readings, setReadings] = useState<DayReadings | null | "loading">("loading");
  const lit = liturgicalDay(date);

  useEffect(() => {
    let alive = true;
    setReadings("loading");
    readingsForDate(date)
      .then((r) => alive && setReadings(r))
      .catch(() => alive && setReadings(null));
    return () => {
      alive = false;
    };
  }, [date]);

  const go = (d: Date) => setParams({ date: toISO(d) });
  const shift = (days: number) =>
    go(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));

  const cycleLabel = `Sunday Cycle ${sundayCycle(date)} · Weekday Year ${
    weekdayCycle(date) === "1" ? "I" : "II"
  }`;

  // group options: consecutive fractional rows within the same integer group
  const groups = useMemo(() => {
    if (readings === "loading" || !readings) return [];
    const byGroup = new Map<number, typeof readings.rows>();
    for (const row of readings.rows) {
      const g = Math.floor(row.t);
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g)!.push(row);
    }
    return [...byGroup.entries()].sort((a, b) => a[0] - b[0]);
  }, [readings]);

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
      {readings !== "loading" &&
        readings &&
        groups.map(([g, rows]) => (
          <section key={g} className="reading-group">
            {rows.map((row, i) => (
              <ReadingText
                key={`${row.t}-${row.b}-${i}`}
                row={row}
                translation={translation}
                label={
                  i === 0
                    ? READING_LABELS[g] ?? "Reading"
                    : rows.length > 2
                      ? `${READING_LABELS[g] ?? "Reading"} — option ${i + 1}`
                      : "or (alternative form)"
                }
              />
            ))}
          </section>
        ))}

      {readings !== "loading" && readings && (
        <p className="muted small sans">
          Lectionary day: <code>{readings.code}</code>. Citations follow the Roman
          Lectionary; psalms are shown with both modern and Vulgate chapter numbers,
          e.g. Psalm 23(22), with verse numbers following the Vulgate text as
          rendered. Where the lectionary subdivides verses (e.g. “12b”), whole
          verses are shown — the text itself is never altered.
        </p>
      )}
    </div>
  );
}
