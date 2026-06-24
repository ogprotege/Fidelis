/**
 * Force the bundled Scripture face (EB Garamond, spec §1.4) to download at
 * startup via the CSS Font Loading API.
 *
 * Why this is needed: in the iOS Capacitor shell the app is served from the
 * `capacitor://localhost` scheme, and WebKit there does not reliably fire the
 * lazy download of a CSS `@font-face` when text first uses it. The result is
 * that EB Garamond never loads and silently falls back to the system serif
 * (`Iowan Old Style`) — which is byte-for-byte what "System serif" already
 * resolves to, so the Settings "Garamond" and "Serif" choices look identical
 * and the face picker appears broken. The font file, MIME, path and
 * unicode-ranges are all fine; only the implicit fetch never fires.
 *
 * `document.fonts.load()` *does* work in that WebView (verified on device), so
 * we trigger it ourselves. Once the face is loaded, `font-display: swap`
 * repaints any text already showing the fallback. A no-op where the Font
 * Loading API is unavailable, and harmless on the web (the font is already
 * loading there).
 */
export function preloadScriptureFonts(): void {
  if (typeof document === "undefined") return;
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts || typeof fonts.load !== "function") return;

  // The reading column uses regular and italic; the latin-ext subset is a
  // separate @font-face, so prime it with an extended-Latin sample too.
  const variants = ['400 1rem "EB Garamond"', 'italic 400 1rem "EB Garamond"'];
  const samples = ["AaEeOo", "\u0100\u1E00\u2C60"]; // latin + latin-extended

  const run = () => {
    for (const variant of variants) {
      for (const sample of samples) {
        fonts.load(variant, sample).catch(() => {
          // best-effort: a missing/disabled face must never break startup
        });
      }
    }
  };

  // The @font-face rules must be parsed first. They are by the time the bundle
  // runs, but call again on `load` as a belt-and-suspenders for slow stylesheet
  // parsing in the native WebView.
  run();
  if (typeof window !== "undefined") {
    window.addEventListener("load", run, { once: true });
  }
}
