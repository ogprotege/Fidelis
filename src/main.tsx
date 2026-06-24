import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { SettingsProvider } from "./SettingsContext";
import { preloadScriptureFonts } from "./lib/fontLoader";
import "./styles.css";

// The app's ScrollManager owns scroll position on navigation (top on forward,
// restore on Back); turn off the browser's own restoration so the two don't fight.
if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

// iOS WKWebView (capacitor://) doesn't auto-fetch the bundled EB Garamond
// @font-face; force it so the Scripture face actually renders (see fontLoader).
preloadScriptureFonts();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </HashRouter>
  </React.StrictMode>
);

// Offline support: cache the app shell and visited scripture on demand.
if ("serviceWorker" in navigator && !import.meta.env.DEV) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // offline support is best-effort
    });
  });
}
