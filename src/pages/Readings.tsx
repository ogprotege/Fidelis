import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ReadingText from "../components/ReadingText";
import SectionNav from "../components/SectionNav";
import Skeleton from "../components/Skeleton";
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
import { importedTranslations, loadSaints } from "../lib/data";
import { dayKey, parseLocalISODate } from "../lib/dateKey";
import { SaintDay, saintForCelebration } from "../lib/saints";
import { useSettings } from "../SettingsContext";
import { useToday } from "../useToday";
import {
  EXACT_CALENDAR_CATALOG_FROM,
  EXACT_CALENDAR_CATALOG_THROUGH,
  OFFICIAL_ORDO_VERIFIED_FROM,
  OFFICIAL_ORDO_VERIFIED_THROUGH,
  hasExactCalendarCatalogForDate,
  hasOfficialOrdoVerificationForDate
} from "../lib/calendarProfile";

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function Readings() {
  const [params, setParams] = useSearchParams();
  const dateParam = params.get("date");
  // Live "today" so the no-param default rolls at midnight / foreground resume
  // in the resident native shell instead of pinning yesterday's Mass.
  const today = useToday();
  const date = useMemo(() => {
    return parseLocalISODate(dateParam) ?? today;
  }, [dateParam, today]);

  // The calendar region lives on the Settings screen now (spec §2.2); read it
  // live from context so changing it there re-resolves this page at once. The
  // reading translation stays a local switcher on this toolbar.
  const settings = useSettings();
  const region = settings.calendarProfile;
  // Default to the separately selected Mass-text translation. NABRE is the
  // U.S. liturgical Bible, but it is not bundled with the derived citation table.
  const [translation, setTranslation] = useState(() => massTranslationFor(settings));
  const [imported, setImported] = useState<Set<string>>(new Set());
  useEffect(() => {
    importedTranslations().then(setImported).catch(() => {});
  }, []);
  const [readings, setReadings] = useState<DayReadings | null | "loading">("loading");
  const [saintDay, setSaintDay] = useState<SaintDay | null>(null);
  const lit = liturgicalDay(date, region);
  const dayOfDate = dayKey(date);
  useEffect(() => {
    let alive = true;
    setSaintDay(null);
    loadSaints(dayOfDate)
      .then((s) => alive && setSaintDay(s))
      .catch(() => alive && setSaintDay(null));
    return () => {
      alive = false;
    };
  }, [dayOfDate]);
  // v1.16.0 (spec §5): the Today chip shows only when the visible date is not
  // today; compare by calendar day, not instant.
  const isToday = toISO(date) === toISO(today);

  useEffect(() => {
    let alive = true;
    setReadings("loading");
    readingsForDate(
      date,
      region,
      settings.lectionaryPackId,
      settings.individualChurchProper
    )
      .then((r) => alive && setReadings(r))
      .catch(() => alive && setReadings(null));
    return () => {
      alive = false;
    };
  }, [date, region, settings.lectionaryPackId, settings.individualChurchProper]);

  // Day-stepping is a view change, not a destination — replace the entry so a
  // single Back leaves the Mass page instead of unwinding each day visited.
  const go = (d: Date) => setParams({ date: toISO(d) }, { replace: true });
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
  // The in-page jump bar: one entry per reading (the Vigil runs long), plus the
  // secondary ferial set when present. Each id matches a ReadingText below.
  const navItems = useMemo(() => {
    const items: { id: string; label: string }[] = [];
    sections.forEach((sec, si) =>
      sec.forEach(({ label }, i) => items.push({ id: `r-${si}-${i}`, label }))
    );
    if (readings !== "loading" && readings?.secondary) {
      items.push({ id: "secondary", label: readings.secondary.label });
    }
    if (readings !== "loading" && readings?.formularyOptions?.length) {
      items.push({ id: "permitted-formularies", label: "Permitted formularies" });
    }
    if (readings !== "loading") {
      readings?.massAlternatives?.forEach((option, index) => {
        items.push({ id: `mass-option-${index}`, label: option.label });
      });
      readings?.memorialFormularies?.forEach((option, index) => {
        items.push({ id: `memorial-formulary-${index}`, label: option.label });
      });
      readings?.optionalMemorials?.forEach((option, index) => {
        items.push({ id: `optional-memorial-${index}`, label: option.label });
      });
    }
    return items;
  }, [sections, readings]);

  return (
    <div className="page-narrow" style={{ margin: "0 auto" }}>
      <h1 className="page-title">Daily Mass Readings</h1>
      <div className="readings-toolbar sans">
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous day" title="Previous day">
          ‹
        </button>
        <span className="date-pick">
          <input
            type="date"
            className="date-pick-input"
            value={toISO(date)}
            onChange={(e) => e.target.value && setParams({ date: e.target.value }, { replace: true })}
            aria-label="Choose date"
          />
          <span className="date-pick-label" aria-hidden="true">
            <span className="date-long">
              {date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
            </span>
            <span className="date-short">
              {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
            <svg
              className="icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </span>
        <button className="icon-btn" onClick={() => shift(1)} aria-label="Next day" title="Next day">
          ›
        </button>
        {!isToday && (
          <button className="chip" onClick={() => go(today)}>
            Today
          </button>
        )}
        <select
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
          title="Reading translation"
          aria-label="Reading translation"
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
          <span
            className="lit-color-chip"
            style={{ background: COLOR_HEX[lit.color] }}
            title={`Liturgical color: ${lit.color}`}
            aria-hidden="true"
          />
          <span className="sr-only">Liturgical color: {lit.color}</span>
        </h2>
        <div className="lit-season">
          <strong>{lit.seasonLabel}</strong>
        </div>
        {lit.celebrations.map((c) => {
          const s = saintDay ? saintForCelebration(saintDay.saints, [c.name]) : null;
          return s ? (
            <Link
              className="lit-celebration lit-celebration-link"
              key={c.name}
              to={`/saint/${dayOfDate}/${s.id}`}
            >
              <span className="rank">{c.rank}</span>
              {c.name}
              <span className="lit-celebration-go" aria-hidden="true">›</span>
              <span className="sr-only"> — read the life of {s.name}</span>
            </Link>
          ) : (
            <div className="lit-celebration" key={c.name}>
              <span className="rank">{c.rank}</span>
              {c.name}
            </div>
          );
        })}
        {lit.alternatives.map((c) => {
          const s = saintDay ? saintForCelebration(saintDay.saints, [c.name]) : null;
          const alternativeType = c.rank === "Commemoration" ? "Commemoration" : "Optional";
          return s ? (
            <Link
              className="lit-celebration lit-celebration-link lit-alternative"
              key={`alternative-${c.id}`}
              to={`/saint/${dayOfDate}/${s.id}`}
            >
              <span className="rank">{alternativeType}</span>
              {c.name}
              <span className="lit-celebration-go" aria-hidden="true">›</span>
              <span className="sr-only">
                {c.rank === "Commemoration"
                  ? " — permitted commemoration; read the life of "
                  : " — lawful optional memorial; read the life of "}
                {s.name}
              </span>
            </Link>
          ) : (
            <div className="lit-celebration lit-alternative" key={`alternative-${c.id}`}>
              <span className="rank">{alternativeType}</span>
              {c.name}
            </div>
          );
        })}
        <p className="muted small sans mb-0">
          {cycleLabel}
        </p>
      </div>

      {navItems.length >= 3 && <SectionNav sections={navItems} />}

      {!hasOfficialOrdoVerificationForDate(date) && (
        <div className="notice" role="status">
          The current source catalog has an annual official-ordo cross-check for{" "}
          {OFFICIAL_ORDO_VERIFIED_FROM} through {OFFICIAL_ORDO_VERIFIED_THROUGH}.
          This date applies the promulgated rules and documented amendments as a current-law
          projection. It is not presented as a complete official yearly ordo.
        </div>
      )}

      {!hasExactCalendarCatalogForDate(date) && (
        <div className="notice" role="status">
          The full-year engine goldens cover {EXACT_CALENDAR_CATALOG_FROM} through{" "}
          {EXACT_CALENDAR_CATALOG_THROUGH}. This date is outside that deterministic regression
          window and should be checked against the competent calendar authority.
        </div>
      )}

      {readings !== "loading" && readings?.formularyState?.kind === "missing-local-formulary" && (
        <div className="notice" role="status">
          The selected calendar observes {readings.formularyState.celebrationName}, but this
          lectionary pack does not contain a mapped proper formulary. The seasonal readings
          appear below and are not presented as the celebration&apos;s proper readings.
        </div>
      )}

      {readings !== "loading" && readings?.formularyOptions?.length ? (
        <section className="card card-spaced" aria-labelledby="permitted-formularies">
          <h2 id="permitted-formularies">Permitted Mass formularies</h2>
          <p className="muted small sans">
            The primary readings below remain a valid choice. The selected calendar also permits:
          </p>
          <ul className="plain-list">
            {readings.formularyOptions.map((option) => (
              <li className="lit-celebration" key={option.id}>
                <span
                  className="lit-color-chip"
                  style={{ background: COLOR_HEX[option.color] }}
                  aria-hidden="true"
                />
                <span>
                  {option.label} <span className="muted small sans">(Lectionary {option.lectionaryReference})</span>
                </span>
                <span className="sr-only"> Liturgical color: {option.color}.</span>
              </li>
            ))}
          </ul>
          <p className="muted small sans mb-0">
            This build identifies these official reading tables but does not bundle their selections.
          </p>
        </section>
      ) : null}

      {readings !== "loading" && readings?.unavailableFormularies?.length ? (
        <div className="notice" role="status">
          <strong>Additional formularies are not present in this citation table:</strong>{" "}
          {readings.unavailableFormularies.map((item) => item.celebrationName).join(", ")}.
          The app keeps the seasonal readings visible and does not invent a proper.
        </div>
      ) : null}

      {readings === "loading" && (
        <>
          <p className="loading" role="status">
            Finding the readings…
          </p>
          {/* v1.18.1 (audit FID-PERF-001): reserve roughly a day's readings of
              geometry so the arriving text FILLS the page instead of shoving
              the provenance line and footer down (the page's largest shift). */}
          <Skeleton lines={18} className="readings-skeleton" />
        </>
      )}
      {readings === null && (
        <div className="notice" role="status">
          Readings for this date aren't available here.
          <div className="browse-links">
            <Link className="continue-cta" to="/read">
              Open the Reader →
            </Link>
          </div>
        </div>
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
                id={`r-${si}-${i}`}
                row={row}
                translation={translation}
                label={label}
                showFallbackNotice={si === 0 && i === 0}
              />
            ))}
          </section>
        ))}
      {readings !== "loading" && readings && readings.secondary && (
        <>
          <h2 className="testament-title" id="secondary">{readings.secondary.label}</h2>
          {secondarySections.map((sec, si) => (
            <section key={`f-${si}`} className="reading-group">
              {sec.map(({ label, row }, i) => (
                <ReadingText
                  key={`f-${row.t}-${row.b}-${i}`}
                  row={row}
                  translation={translation}
                  label={label}
                  showFallbackNotice={false}
                />
              ))}
            </section>
          ))}
        </>
      )}

      {readings !== "loading" && readings?.massAlternatives?.map((option, optionIndex) => (
        <details
          className="card card-spaced"
          id={`mass-option-${optionIndex}`}
          key={`${option.label}-${option.code}`}
        >
          <summary className="setting-label">{option.label}</summary>
          {displayReadings({ code: option.code, rows: option.rows }).map((section, sectionIndex) => (
            <section key={`${optionIndex}-${sectionIndex}`} className="reading-group">
              {section.map(({ label, row }, rowIndex) => (
                <ReadingText
                  key={`m-${optionIndex}-${row.t}-${row.b}-${rowIndex}`}
                  row={row}
                  translation={translation}
                  label={label}
                  showFallbackNotice={false}
                />
              ))}
            </section>
          ))}
        </details>
      ))}

      {readings !== "loading" && readings?.memorialFormularies?.map((option, optionIndex) => (
        <details
          className="card card-spaced"
          id={`memorial-formulary-${optionIndex}`}
          key={`${option.label}-${option.code}`}
        >
          <summary className="setting-label">Memorial Formulary: {option.label}</summary>
          {displayReadings({ code: option.code, rows: option.rows }).map((section, sectionIndex) => (
            <section key={`${optionIndex}-${sectionIndex}`} className="reading-group">
              {section.map(({ label, row }, rowIndex) => (
                <ReadingText
                  key={`mf-${optionIndex}-${row.t}-${row.b}-${rowIndex}`}
                  row={row}
                  translation={translation}
                  label={label}
                  showFallbackNotice={false}
                />
              ))}
            </section>
          ))}
        </details>
      ))}

      {readings !== "loading" && readings?.optionalMemorials?.map((option, optionIndex) => (
        <details
          className="card card-spaced"
          id={`optional-memorial-${optionIndex}`}
          key={`${option.label}-${option.code}`}
        >
          <summary className="setting-label">Optional Memorial: {option.label}</summary>
          {displayReadings({ code: option.code, rows: option.rows }).map((section, sectionIndex) => (
            <section key={`${optionIndex}-${sectionIndex}`} className="reading-group">
              {section.map(({ label, row }, rowIndex) => (
                <ReadingText
                  key={`o-${optionIndex}-${row.t}-${row.b}-${rowIndex}`}
                  row={row}
                  translation={translation}
                  label={label}
                  showFallbackNotice={false}
                />
              ))}
            </section>
          ))}
        </details>
      ))}

      {readings !== "loading" && readings && (
        <p className="muted small sans">
          Citations come from Fidelis&rsquo;s pinned, public-domain-derived Roman Mass table;
          they are not a licensed transcription of an official national Lectionary edition.
          Psalms are shown with both modern and Vulgate chapter numbers,
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
