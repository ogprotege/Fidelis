/** Appearance choice (spec §2.2): System / Day / Night.
 *
 *  "System" defers to the OS `prefers-color-scheme`; Day and Night pin the
 *  palette regardless. The stored choice is one of these three; what actually
 *  lands in `<html data-theme>` is always the *resolved* "day" | "night", so
 *  styles.css never needs a system branch. `resolveTheme` is pure so the
 *  harness can assert the resolution without a DOM. */

export type ThemeChoice = "system" | "day" | "night";
export type ResolvedTheme = "day" | "night";

export interface ThemeOption {
  id: ThemeChoice;
  label: string;
}

/** In selection order — System first, since it is the default (spec §2.2). */
export const THEME_OPTIONS: readonly ThemeOption[] = [
  { id: "system", label: "System" },
  { id: "day", label: "Day" },
  { id: "night", label: "Night" }
];

export const DEFAULT_THEME: ThemeChoice = "system";

export function isThemeChoice(x: unknown): x is ThemeChoice {
  return x === "system" || x === "day" || x === "night";
}

/** Resolve a stored choice to the concrete palette `<html data-theme>` carries.
 *  System follows the OS; Day/Night are themselves. */
export function resolveTheme(choice: ThemeChoice, systemPrefersDark: boolean): ResolvedTheme {
  if (choice === "system") return systemPrefersDark ? "night" : "day";
  return choice;
}
