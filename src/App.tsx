import { useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import BookList from "./pages/BookList";
import Reader from "./pages/Reader";
import Plans from "./pages/Plans";
import PlanCreator from "./pages/PlanCreator";
import Readings from "./pages/Readings";
import Search from "./pages/Search";
import Library from "./pages/Library";
import Translations from "./pages/Translations";
import Settings from "./pages/Settings";
import About from "./pages/About";
import WidgetVotd from "./pages/WidgetVotd";
import { useSettings } from "./SettingsContext";
import { accentFor, liturgicalDay } from "./lib/liturgical";
import { resolveTheme } from "./lib/theme";

/** A robust read of the OS dark-mode preference; false where matchMedia is
 *  unavailable so the default palette is always defined. */
function prefersDark(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;
}

export default function App() {
  const settings = useSettings();
  const location = useLocation();
  const widgetMode = location.pathname.startsWith("/widget/");

  // Track the OS color scheme so theme "System" (spec §2.2) stays live: a user
  // who flips their device to dark while Fidelis is open sees it follow.
  const [systemDark, setSystemDark] = useState(prefersDark);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme = resolveTheme(settings.theme, systemDark);
  // The embeddable widget is self-contained: its palette comes from its own
  // ?theme param (default day), never the visitor's saved theme or OS. App is
  // the single writer of <html data-theme>, so nothing can clobber it.
  const effectiveTheme = widgetMode
    ? new URLSearchParams(location.search).get("theme") === "night"
      ? "night"
      : "day"
    : resolvedTheme;

  // The resolved palette lands in <html data-theme>; styles.css maps it. Also
  // keep the browser-chrome color in step, reading the token so the hex lives
  // only in styles.css.
  useEffect(() => {
    document.documentElement.dataset.theme = effectiveTheme;
    document.body.classList.toggle("widget-mode", widgetMode);
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg-0").trim();
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && bg) meta.setAttribute("content", bg);
  }, [effectiveTheme, widgetMode]);

  // Scripture face (spec §1.4): drive the global --scripture token from the
  // saved choice by naming it in <html data-font>. Reactive now, so a change on
  // the Settings screen reskins the preview and the Reader instantly.
  useEffect(() => {
    document.documentElement.dataset.font = settings.scriptureFont;
  }, [settings.scriptureFont]);

  // Follow the liturgical year (spec §1.3): name the day's color in
  // <html data-accent>, which CSS uses to remap --purple. Off (or in the
  // embeddable widget) clears it, so the brand purple shows.
  useEffect(() => {
    const root = document.documentElement;
    const accent = widgetMode ? null : accentFor(settings.followLiturgicalYear, liturgicalDay().color);
    if (accent) root.dataset.accent = accent;
    else delete root.dataset.accent;
    // calendarRegion is a dep because today's governing color can differ by
    // region (e.g. a U.S. proper memorial), so the tint must re-derive live.
  }, [settings.followLiturgicalYear, settings.calendarRegion, widgetMode]);

  if (widgetMode) {
    return (
      <Routes>
        <Route path="/widget/votd" element={<WidgetVotd />} />
      </Routes>
    );
  }

  return (
    <div className="app">
      <Header />
      <main className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/read" element={<BookList />} />
          <Route path="/read/:translation/:book/:chapter" element={<Reader />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/plans/new" element={<PlanCreator />} />
          <Route path="/readings" element={<Readings />} />
          <Route path="/search" element={<Search />} />
          <Route path="/library" element={<Library />} />
          <Route path="/translations" element={<Translations />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <footer className="footer">
        <div className="motto">Verbum Domini manet in æternum.</div>
        <div>The Word of the Lord endures for ever. — 1 Peter 1:25</div>
      </footer>
    </div>
  );
}
