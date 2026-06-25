/** iOS Dynamic Type bridge (spec §9, docs/guides/IOS.md §5).
 *
 *  The native shell (AppDelegate.swift) reads UIApplication.preferredContentSizeCategory
 *  and calls window.__fidelisSetContentSize(token) on launch, on every return to the
 *  foreground, and whenever the device's text-size setting changes. When the reader
 *  is following the system size, that token becomes the reading `fontSize`; the in-app
 *  A−/A+ pills remain the override (touching them turns following off). The pure
 *  token→px mapping lives in typography.ts. A no-op anywhere nothing calls the hook
 *  (the web and Android, today). */
import { contentTokenToPx } from "./typography";

declare global {
  interface Window {
    /** Installed below; called by the native shell with a Dynamic Type token. */
    __fidelisSetContentSize?: (token: string) => void;
    /** The last token the shell reported, so re-enabling "follow system size"
     *  can apply it immediately instead of waiting for the next OS push. */
    __fidelisLastContentSize?: string;
  }
}

/** Install the native→web size hook. `following` is the live setting; `setFontSize`
 *  persists a new reading size. Returns a teardown that removes the hook. */
export function installDynamicTypeBridge(
  following: boolean,
  setFontSize: (px: number) => void
): () => void {
  const apply = (token: string): void => {
    window.__fidelisLastContentSize = token;
    if (following) setFontSize(contentTokenToPx(token));
  };
  window.__fidelisSetContentSize = apply;

  // If the shell already reported a size before this (re)install, and we are now
  // following, apply it at once so toggling the setting on takes effect immediately.
  const last = window.__fidelisLastContentSize;
  if (following && typeof last === "string") setFontSize(contentTokenToPx(last));

  return () => {
    if (window.__fidelisSetContentSize === apply) delete window.__fidelisSetContentSize;
  };
}
