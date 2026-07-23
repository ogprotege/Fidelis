import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import Icon from "../components/Icon";
import SectionNav from "../components/SectionNav";
import {
  ManifestDoc,
  OfflineBundleStatus,
  downloadBundle,
  idbClearCcc,
  idbPutCcc,
  importedTranslations,
  loadBook,
  loadCCCText,
  loadManifest,
  verifyOfflineBundle
} from "../lib/data";
import { parseCccText } from "../lib/import-formats";
import {
  exportMarginalia,
  getOfflineTranslations,
  importMarginalia,
  markOfflineTranslation
} from "../lib/storage";
import {
  SUPPORTED_LECTIONARY_PACKS,
  US_ECCLESIASTICAL_PROVINCES,
  calendarProfile,
  individualChurchProperDateConflicts,
  normalizeIndividualChurchProper,
  profileForJurisdiction,
  type IndividualChurchColor,
  type IndividualChurchProper,
  type MonthDay
} from "../lib/calendarProfile";
import { TRANSLATIONS, getTranslation, languageLabel } from "../lib/translations";
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

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
] as const;
const COMMON_MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

const sameMonthDay = (left: MonthDay, right: MonthDay) =>
  left.month === right.month && left.day === right.day;

function MonthDaySelect({
  label,
  value,
  blockedDates = [],
  onChange
}: {
  label: string;
  value: MonthDay | null;
  blockedDates?: readonly MonthDay[];
  onChange: (value: MonthDay | null) => void;
}) {
  const month = value?.month ?? 0;
  const maxDay = month ? COMMON_MONTH_DAYS[month - 1] : 31;
  const blocked = (candidate: MonthDay) =>
    blockedDates.some((date) => sameMonthDay(date, candidate));
  return (
    <span className="month-day-select" role="group" aria-label={label}>
      <select
        aria-label={`${label} month`}
        value={month || ""}
        onChange={(event) => {
          const nextMonth = Number(event.target.value);
          if (!nextMonth) onChange(null);
          else {
            const preferredDay = Math.min(value?.day ?? 1, COMMON_MONTH_DAYS[nextMonth - 1]);
            const availableDay = [
              preferredDay,
              ...Array.from({ length: COMMON_MONTH_DAYS[nextMonth - 1] }, (_, index) => index + 1)
            ].find((day) => !blocked({ month: nextMonth, day }));
            onChange(availableDay ? { month: nextMonth, day: availableDay } : null);
          }
        }}
      >
        <option value="">Month</option>
        {MONTHS.map((name, index) => (
          <option key={name} value={index + 1}>{name}</option>
        ))}
      </select>{" "}
      <select
        aria-label={`${label} day`}
        value={value?.day ?? ""}
        disabled={!month}
        onChange={(event) => {
          if (month) onChange({ month, day: Number(event.target.value) });
        }}
      >
        <option value="">Day</option>
        {Array.from({ length: maxDay }, (_, index) => index + 1).map((day) => (
          <option key={day} value={day} disabled={blocked({ month, day })}>{day}</option>
        ))}
      </select>
    </span>
  );
}

export default function Settings() {
  const settings = useSettings();
  const update = useUpdateSettings();
  const trans = getTranslation(settings.translation);
  const [choosingUnsupportedCountry, setChoosingUnsupportedCountry] = useState(
    settings.calendarCountryCode !== "" && settings.calendarCountryCode !== "US"
  );
  const [churchProperNotice, setChurchProperNotice] = useState<string | null>(null);
  const jurisdiction = profileForJurisdiction(
    settings.calendarCountryCode,
    settings.calendarEcclesiasticalProvince
  );
  const updateChurchProper = (patch: Partial<IndividualChurchProper>) => {
    const candidate = { ...settings.individualChurchProper, ...patch };
    const conflicts = individualChurchProperDateConflicts(candidate);
    if (conflicts.length) {
      setChurchProperNotice(
        `Each local solemnity needs a different date. ${conflicts.join("; ")}.`
      );
      return;
    }
    setChurchProperNotice(null);
    update({
      individualChurchProper: normalizeIndividualChurchProper(candidate)
    });
  };
  const colorSelect = (
    label: string,
    value: IndividualChurchColor,
    onChange: (value: IndividualChurchColor) => void
  ) => (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value as IndividualChurchColor)}
    >
      <option value="white">White</option>
      <option value="red">Red, for a martyr or the Lord&apos;s Passion</option>
    </select>
  );

  const selectCountry = (value: string) => {
    if (value === "other") {
      setChoosingUnsupportedCountry(true);
      update({
        calendarCountryCode: "",
        calendarEcclesiasticalProvince: "",
        calendarProfile: profileForJurisdiction(null).profile.id
      });
      return;
    }
    setChoosingUnsupportedCountry(false);
    const resolved = profileForJurisdiction(value || null);
    update({
      calendarCountryCode: value,
      calendarEcclesiasticalProvince: "",
      calendarProfile: resolved.profile.id
    });
  };

  const selectProvince = (province: string) => {
    const resolved = profileForJurisdiction("US", province);
    update({
      calendarCountryCode: "US",
      calendarEcclesiasticalProvince: province,
      calendarProfile: resolved.profile.id
    });
  };

  const setUnsupportedCountry = (value: string) => {
    const code = value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
    update({
      calendarCountryCode: code,
      calendarEcclesiasticalProvince: "",
      calendarProfile: profileForJurisdiction(code || null).profile.id
    });
  };

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

  // The native shells bundle the whole corpus inside the app binary: every
  // bundled text already reads with no connection from first launch, and
  // there is no service worker to persist a download into. The save-for-
  // offline action exists for the web only — offering it on device was a
  // false affordance that flashed progress and snapped back to "Download".
  const native = Capacitor.isNativePlatform();

  // FID-FUNC-008 (v1.18.0): "Saved" is CACHE truth. The probe checks Cache
  // Storage for every file the manifest lists under each bundle — the browser
  // can evict the data cache while the localStorage record still says yes.
  const [cacheStatus, setCacheStatus] = useState<Record<string, OfflineBundleStatus | null>>({});
  const probeOffline = useCallback(async () => {
    const ids = [...TRANSLATIONS.filter((t) => t.bundled).map((t) => t.id), "commentary"];
    const entries = await Promise.all(
      ids.map(async (id) => [id, await verifyOfflineBundle(id)] as const)
    );
    setCacheStatus(Object.fromEntries(entries));
  }, []);
  useEffect(() => {
    if (manifest) void probeOffline();
  }, [manifest, probeOffline]);

  /** What the row may claim. The probe is TRUTH about completeness; the
   *  localStorage record is the user's INTENT (presentation metadata only):
   *  "Saved" needs a cache-complete bundle; "Repair" needs intent AND a
   *  partly-evicted cache (ordinary reading incidentally caches a few files —
   *  that is not a broken download); a fully evicted bundle plainly reads
   *  "Download" again. Probe null (no manifest / no CacheStorage / not yet
   *  run) falls back to the record alone. */
  const offlineState = (id: string): { state: "saved" | "partial" | "none"; missing: number } => {
    const s = cacheStatus[id];
    const intended = offline.includes(id);
    if (s == null) return { state: intended ? "saved" : "none", missing: 0 };
    if (s.complete) return { state: "saved", missing: 0 };
    if (intended && s.present > 0) return { state: "partial", missing: s.total - s.present };
    return { state: "none", missing: 0 };
  };

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
      // Whatever happened, the row shows what the cache now actually holds —
      // a partial download honestly reads "Repair", not "Saved".
      await probeOffline();
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
        `Imported ${counts.bookmarks} bookmark(s), ${counts.highlights} highlight(s), ${counts.notes} note(s) — merged with what was here; the newer entry won any conflict.` +
          (counts.persisted
            ? ""
            : " But this device is not saving changes — the import is kept for this session only.")
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
                  {languageLabel(t)} · {t.year}
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

      {/* 6 ── Calendar jurisdiction, lectionary edition, and displayed text */}
      <section className="card" id="calendar">
        <h2>Calendar</h2>
        <div className="setting-row">
          <div>
            <div className="setting-label">Country calendar</div>
            <p className="catechesis muted small">
              Choose the lawful territorial calendar. The verified catalog currently contains the
              General Roman Calendar and the U.S. proper only.
            </p>
          </div>
          <select
            value={choosingUnsupportedCountry ? "other" : settings.calendarCountryCode}
            aria-label="Calendar country"
            onChange={(event) => selectCountry(event.target.value)}
          >
            <option value="">General Roman only</option>
            <option value="US">United States</option>
            <option value="other">Another country</option>
          </select>
        </div>
        {choosingUnsupportedCountry && (
          <div className="setting-row nested">
            <div>
              <label className="setting-label" htmlFor="calendar-country-code">
                Country code
              </label>
              <p className="catechesis muted small">
                Enter the two-letter code. Unsupported countries use General Roman explicitly.
              </p>
            </div>
            <input
              id="calendar-country-code"
              aria-label="Unsupported calendar country code"
              inputMode="text"
              maxLength={2}
              value={settings.calendarCountryCode}
              onChange={(event) => setUnsupportedCountry(event.target.value)}
              placeholder="GB"
            />
          </div>
        )}
        {settings.calendarCountryCode === "US" && (
          <div className="setting-row nested">
            <div>
              <label className="setting-label" htmlFor="calendar-province">
                Ecclesiastical province
              </label>
              <p className="catechesis muted small">
                Boston, Hartford, New York, Omaha, and Philadelphia keep Ascension Thursday.
              </p>
            </div>
            <select
              id="calendar-province"
              value={settings.calendarEcclesiasticalProvince}
              aria-label="Ecclesiastical province"
              onChange={(event) => selectProvince(event.target.value)}
            >
              <option value="">Select a province</option>
              {US_ECCLESIASTICAL_PROVINCES.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="setting-row nested">
          <div>
            <label className="setting-label" htmlFor="calendar-diocese">
              Diocese
            </label>
            <p className="catechesis muted small">
              Optional reference only. Fidelis does not invent a diocesan proper from this name.
            </p>
          </div>
          <input
            id="calendar-diocese"
            aria-label="Diocese"
            maxLength={120}
            value={settings.calendarDiocese}
            onChange={(event) => update({ calendarDiocese: event.target.value.slice(0, 120) })}
            placeholder="Your diocese"
          />
        </div>
        <p className="muted small calendar-support-notice" role="status">
          {jurisdiction.notice ??
            `Using ${calendarProfile(settings.calendarProfile).jurisdictionLabel}.`}{" "}
          Fidelis will not claim a local proper until its official calendar is sourced and verified.
        </p>
        <div className="setting-row">
          <div>
            <div className="setting-label">Individual church proper</div>
            <p className="catechesis muted small">
              Add only the title, dedication anniversary, and principal patron of the church where
              you worship. Complete entries are proper solemnities on this device. Fidelis cannot
              supply their local Mass formulary, so it will say so plainly on that day.
            </p>
          </div>
        </div>
        <div className="setting-row nested">
          <div>
            <label className="setting-label" htmlFor="church-title">Title of the church</label>
            <p className="catechesis muted small">Enter the saint, mystery, or sacred title.</p>
          </div>
          <input
            id="church-title"
            maxLength={120}
            value={settings.individualChurchProper.churchTitle}
            onChange={(event) => updateChurchProper({ churchTitle: event.target.value.slice(0, 120) })}
            placeholder="St. Joseph"
          />
        </div>
        <div className="setting-row nested">
          <div className="setting-label">Title celebration</div>
          <div className="church-proper-controls">
            <MonthDaySelect
              label="Title celebration"
              value={settings.individualChurchProper.titleDate}
              blockedDates={[
                settings.individualChurchProper.dedicationAnniversary,
                settings.individualChurchProper.principalPatronDate
              ].filter((date): date is MonthDay => date !== null)}
              onChange={(titleDate) => updateChurchProper({ titleDate })}
            />{" "}
            {colorSelect(
              "Title celebration color",
              settings.individualChurchProper.titleColor,
              (titleColor) => updateChurchProper({ titleColor })
            )}
          </div>
        </div>
        <div className="setting-row nested">
          <div>
            <div className="setting-label">Dedication anniversary</div>
            <p className="catechesis muted small">Use the anniversary of this church&apos;s dedication.</p>
          </div>
          <MonthDaySelect
            label="Dedication anniversary"
            value={settings.individualChurchProper.dedicationAnniversary}
            blockedDates={[
              settings.individualChurchProper.titleDate,
              settings.individualChurchProper.principalPatronDate
            ].filter((date): date is MonthDay => date !== null)}
            onChange={(dedicationAnniversary) => updateChurchProper({ dedicationAnniversary })}
          />
        </div>
        <div className="setting-row nested">
          <div>
            <label className="setting-label" htmlFor="principal-patron">Principal patron</label>
            <p className="catechesis muted small">Leave blank unless the church has one.</p>
          </div>
          <input
            id="principal-patron"
            maxLength={120}
            value={settings.individualChurchProper.principalPatronTitle}
            onChange={(event) => updateChurchProper({
              principalPatronTitle: event.target.value.slice(0, 120)
            })}
            placeholder="St. Thomas Aquinas"
          />
        </div>
        <div className="setting-row nested">
          <div className="setting-label">Principal patron celebration</div>
          <div className="church-proper-controls">
            <MonthDaySelect
              label="Principal patron celebration"
              value={settings.individualChurchProper.principalPatronDate}
              blockedDates={[
                settings.individualChurchProper.titleDate,
                settings.individualChurchProper.dedicationAnniversary
              ].filter((date): date is MonthDay => date !== null)}
              onChange={(principalPatronDate) => updateChurchProper({ principalPatronDate })}
            />{" "}
            {colorSelect(
              "Principal patron celebration color",
              settings.individualChurchProper.principalPatronColor,
              (principalPatronColor) => updateChurchProper({ principalPatronColor })
            )}
          </div>
        </div>
        {churchProperNotice && (
          <p className="notice small sans" role="status">{churchProperNotice}</p>
        )}
        <div className="setting-row">
          <div>
            <div className="setting-label">Lectionary edition</div>
            <p className="catechesis muted small">
              This selects citation and formulary data, independently from the calendar and the Bible
              text shown below. The installed table is derived from a pinned public-domain community
              dataset. It is not a licensed transcription of an official national Lectionary edition.
            </p>
          </div>
          <select
            value={settings.lectionaryPackId}
            aria-label="Lectionary edition"
            onChange={(event) =>
              update({
                lectionaryPackId: event.target.value as typeof settings.lectionaryPackId
              })
            }
          >
            {SUPPORTED_LECTIONARY_PACKS.map((pack) => (
              <option key={pack.id} value={pack.id}>
                {pack.title}
              </option>
            ))}
          </select>
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-label">Displayed Mass Bible</div>
            <p className="catechesis muted small">
              This changes only the text shown for Daily Readings. The NABRE is under copyright and
              not bundled. Import a licensed copy on the <Link to="/translations">Translations</Link>{" "}
              page. Until then Fidelis shows the bundled Douay-Rheims fallback clearly.
            </p>
          </div>
          <select
            value={settings.massTranslation}
            aria-label="Displayed Mass Bible translation"
            onChange={(event) => update({ massTranslation: event.target.value })}
          >
            {TRANSLATIONS.filter(
              (translation) =>
                translation.bundled || translation.id === "nabre" || translation.id === "rsv2ce"
            ).map((translation) => (
              <option key={translation.id} value={translation.id}>
                {translation.abbrev}
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
        <div className="setting-row nested">
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
        <div className="setting-row nested">
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
        <div className="setting-row nested">
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
          own a digital copy, import it here — it is kept in the app on this device, never
          uploaded, and a cited
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
          {native
            ? "Every bundled text and the Fathers' commentary ship inside this app — the whole corpus already reads with no connection."
            : "Save a bundled translation's full text — or the Fathers' commentary — to this device so it reads with no connection."}
        </p>
        {TRANSLATIONS.filter((t) => t.bundled).map((t) => {
          const bytes = manifest?.bundles?.[t.id]?.bytes;
          const prog = progress[t.id];
          const st = offlineState(t.id);
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
              ) : native ? (
                <span className="muted small">On this device</span>
              ) : (
                <button className="pill" onClick={() => download(t.id)}>
                  {st.state === "saved" ? (
                    <>Saved <Icon name="check" /> · Update</>
                  ) : st.state === "partial" ? (
                    `Repair (${st.missing} missing)`
                  ) : (
                    "Download"
                  )}
                </button>
              )}
            </div>
          );
        })}
        {(() => {
          const bytes = manifest?.bundles?.commentary?.bytes;
          const prog = progress.commentary;
          const st = offlineState("commentary");
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
              ) : native ? (
                <span className="muted small">On this device</span>
              ) : (
                <button className="pill" onClick={() => download("commentary")}>
                  {st.state === "saved" ? (
                    <>Saved <Icon name="check" /> · Update</>
                  ) : st.state === "partial" ? (
                    `Repair (${st.missing} missing)`
                  ) : (
                    "Download"
                  )}
                </button>
              )}
            </div>
          );
        })()}
        {downloadError && <p className="notice small">{downloadError}</p>}

        <hr className="rule" />

        <div className="setting-label">My notes and highlights</div>
        <p className="catechesis muted small">
          Your bookmarks, highlights, and notes stay in this app's storage — export them now and
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
          Texts verified at build · <Link to="/about">About &amp; sources →</Link>
        </p>
      </section>
    </div>
  );
}
