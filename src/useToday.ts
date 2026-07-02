import { useEffect, useState } from "react";

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * The current civil day as live React state. In the resident native shell the
 * app can sit open across midnight (or return from background days later), and
 * a render-time `new Date()` would keep showing yesterday's liturgical day,
 * Verse of the Day, and readings. This hook re-renders its consumers when the
 * local day actually changes: a timer armed for the next local midnight (re-armed
 * after each fire), plus a visibilitychange check for foreground resume — the
 * timer alone can be frozen or coalesced while the app is backgrounded.
 *
 * Lives beside SettingsContext, not in src/lib (which stays React-free).
 */
export function useToday(): Date {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () =>
      setToday((prev) => (sameDay(prev, new Date()) ? prev : new Date()));
    const arm = () => {
      const now = new Date();
      // Next local midnight via calendar-component math (DST-safe, matching the
      // engines' convention), with a small cushion past the boundary.
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(() => {
        refresh();
        arm();
      }, next.getTime() - now.getTime() + 1_000);
    };
    arm();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return today;
}
