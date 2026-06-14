/** SettingsContext (spec §2.2 engineering note): one live source of truth for
 *  user settings, so the Scripture preview, the Reader, and the theme respond
 *  the instant a control is touched — instead of the old scattered, snapshot
 *  reads of getSettings() that only refreshed on remount.
 *
 *  The context holds the parsed Settings object and an `update(patch)` that
 *  persists through saveSettings() and re-renders every consumer. The DOM side
 *  effects (data-theme / data-font / data-accent on <html>) stay in App, which
 *  alone knows widget mode and the OS color-scheme; everything else just reads.
 *
 *  Non-React code (the calendar/lectionary engines, votd, build scripts) keeps
 *  calling getSettings() directly: update() writes localStorage synchronously,
 *  so a lazy currentRegion() read sees the new value on the very next render. */

import { ReactNode, createContext, useCallback, useContext, useState } from "react";
import { Settings, getSettings, saveSettings } from "./lib/storage";

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(getSettings);

  const update = useCallback((patch: Partial<Settings>) => {
    // saveSettings merges over the freshest stored value and returns the whole
    // settings object, which becomes our new state — one write, one re-render.
    setSettings(saveSettings(patch));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, update }}>{children}</SettingsContext.Provider>
  );
}

/** Subscribe to the live settings. Re-renders the caller when any field changes. */
export function useSettings(): Settings {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider");
  return ctx.settings;
}

/** The persist-and-broadcast updater. Stable identity, safe in deps. */
export function useUpdateSettings(): (patch: Partial<Settings>) => void {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useUpdateSettings must be used within a SettingsProvider");
  return ctx.update;
}
