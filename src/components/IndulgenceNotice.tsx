import { useEffect, useState } from "react";
import Sheet from "./Sheet";
import { advance } from "../lib/reading";
import { getReading, saveReading } from "../lib/storage";

/** ~15s between ticks: fine enough that the line appears within seconds of the
 *  half-hour, cheap enough to be invisible. */
const TICK_MS = 15 * 1000;

/**
 * Spec §6.1 — the quietest feature in the app. While the Reader is open and the
 * page is visible, accumulate continuous reading time; once it reaches half an
 * hour the day is "earned" and one gold line appears, sticky until local
 * midnight. `enabled` is the user's setting; off runs no timer and shows
 * nothing.
 */
export default function IndulgenceNotice({ enabled }: { enabled: boolean }) {
  const [earned, setEarned] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setEarned(false);
      return;
    }
    let state = advance(getReading(), { type: "resume", at: Date.now() });
    saveReading(state);
    setEarned(state.earned);

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      state = advance(state, { type: "tick", at: Date.now() });
      saveReading(state);
      setEarned(state.earned);
    };
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      state = advance(state, { type: "resume", at: Date.now() });
      saveReading(state);
      setEarned(state.earned);
    };

    const id = window.setInterval(tick, TICK_MS);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      state = advance(state, { type: "resume", at: Date.now() });
      saveReading(state);
    };
  }, [enabled]);

  if (!enabled || !earned) return null;

  return (
    <>
      <button
        type="button"
        className="indulgence-line"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        You have read for half an hour. The Church grants a plenary indulgence for this,
        under the usual conditions (Ench. Ind., conc. 30).
      </button>
      {open && (
        <Sheet titleId="indulgence-conditions-title" onClose={() => setOpen(false)}>
          <div className="conditions-sheet">
            <h2 id="indulgence-conditions-title" className="mystery-sheet-title">
              The usual conditions
            </h2>
            <p>
              A plenary indulgence is granted for the prescribed work — here, the reading
              of Sacred Scripture for at least half an hour — together with:
            </p>
            <ul className="conditions-list">
              <li>Sacramental Confession</li>
              <li>Holy Communion</li>
              <li>Prayer for the intentions of the Holy Father</li>
              <li>Detachment from all sin, even venial</li>
            </ul>
            <p className="muted small">
              The Confession and Communion may be made within several days before or after.
              One plenary indulgence may be gained each day.
            </p>
            <p className="muted small">
              <em>Enchiridion Indulgentiarum, conc. 30.</em>
            </p>
          </div>
        </Sheet>
      )}
    </>
  );
}
