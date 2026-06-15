import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BOOKS, OT_GROUPS, NT_GROUPS, bookDisplayName, BookGroup } from "../lib/canon";
import { PRESETS, chaptersForBooks, targetDateToPerDay } from "../lib/plans";
import { addPlan } from "../lib/storage";
import { useSettings } from "../SettingsContext";

export default function PlanCreator() {
  const translation = useSettings().translation;
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paceMode, setPaceMode] = useState<"perDay" | "date">("perDay");
  const [perDay, setPerDay] = useState(3);
  const [targetDate, setTargetDate] = useState("");
  const [name, setName] = useState("");

  const toggle = (slug: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(slug)) n.delete(slug);
      else n.add(slug);
      return n;
    });

  const startPreset = (id: string) => {
    const preset = PRESETS.find((p) => p.id === id)!;
    const { chapters, perDay } = preset.build();
    addPlan({ name: preset.name, chapters, perDay });
    void navigate("/plans");
  };

  const total = chaptersForBooks([...selected]).length;

  const startCustom = () => {
    const chapters = chaptersForBooks([...selected]);
    if (chapters.length === 0) return;
    let pd = Math.max(1, perDay);
    if (paceMode === "date" && targetDate) {
      pd = targetDateToPerDay(chapters.length, Date.now(), new Date(`${targetDate}T00:00:00`).getTime());
    }
    addPlan({ name: name.trim() || "My reading plan", chapters, perDay: pd });
    void navigate("/plans");
  };

  const group = (g: BookGroup) => {
    const books = BOOKS.filter((b) => b.group === g);
    if (!books.length) return null;
    return (
      <div key={g}>
        <div className="group-title">{g}</div>
        <div className="plan-book-grid">
          {books.map((b) => (
            <label key={b.slug} className="plan-book">
              <input type="checkbox" checked={selected.has(b.slug)} onChange={() => toggle(b.slug)} />
              {bookDisplayName(b, translation)}
            </label>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <h1 className="page-title">New Reading Plan</h1>

      <div className="card">
        <h2>Start from a preset</h2>
        <div className="preset-list">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className="preset-btn" onClick={() => startPreset(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Or build your own</h2>
        {OT_GROUPS.map(group)}
        {NT_GROUPS.map(group)}
        <p className="muted small sans">{total} chapters selected</p>

        <div className="plan-pace">
          <label>
            <input type="radio" name="pace" checked={paceMode === "perDay"} onChange={() => setPaceMode("perDay")} />{" "}
            Chapters per day
          </label>
          {paceMode === "perDay" && (
            <input
              type="number"
              min={1}
              value={perDay}
              aria-label="Chapters per day"
              onChange={(e) => setPerDay(Math.max(1, Number(e.target.value) || 1))}
            />
          )}
          <label>
            <input type="radio" name="pace" checked={paceMode === "date"} onChange={() => setPaceMode("date")} />{" "}
            Finish by a date
          </label>
          {paceMode === "date" && (
            <input
              type="date"
              value={targetDate}
              aria-label="Target end date"
              onChange={(e) => setTargetDate(e.target.value)}
            />
          )}
        </div>

        <input
          type="text"
          className="plan-name"
          placeholder="Name your plan"
          value={name}
          aria-label="Plan name"
          onChange={(e) => setName(e.target.value)}
        />
        <button type="button" className="continue-cta" disabled={total === 0} onClick={startCustom}>
          Start →
        </button>
      </div>
    </>
  );
}
