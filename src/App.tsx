import { useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import BookList from "./pages/BookList";
import Reader from "./pages/Reader";
import Readings from "./pages/Readings";
import Search from "./pages/Search";
import Library from "./pages/Library";
import Translations from "./pages/Translations";
import Settings from "./pages/Settings";
import About from "./pages/About";
import WidgetVotd from "./pages/WidgetVotd";
import { getSettings, saveSettings } from "./lib/storage";
import { accentFor, liturgicalDay } from "./lib/liturgical";

export default function App() {
  const [theme, setTheme] = useState(getSettings().theme);
  const [followYear, setFollowYear] = useState(getSettings().followLiturgicalYear);
  const location = useLocation();
  const widgetMode = location.pathname.startsWith("/widget/");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.body.classList.toggle("widget-mode", widgetMode);
    // Keep the browser chrome in step with the active palette; read the
    // resolved token so the hex stays defined only in styles.css.
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg-0").trim();
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && bg) meta.setAttribute("content", bg);
  }, [theme, widgetMode]);

  // Scripture face (spec §1.4): drive the global --scripture token from the
  // saved choice by naming it in <html data-font>. Set once on load (Settings
  // updates the attribute live); the :root default already makes the first
  // paint Garamond, so there is no flash for the default chooser.
  useEffect(() => {
    document.documentElement.dataset.font = getSettings().scriptureFont;
  }, []);

  // Follow the liturgical year (spec §1.3): name the day's color in
  // <html data-accent>, which CSS uses to remap --purple. Off (or in the
  // embeddable widget) clears it, so the brand purple shows.
  useEffect(() => {
    const root = document.documentElement;
    const accent = widgetMode ? null : accentFor(followYear, liturgicalDay().color);
    if (accent) root.dataset.accent = accent;
    else delete root.dataset.accent;
  }, [followYear, widgetMode]);

  const toggleTheme = () => {
    const next = theme === "night" ? "day" : "night";
    setTheme(next);
    saveSettings({ theme: next });
  };

  const toggleFollowYear = () => {
    const next = !followYear;
    setFollowYear(next);
    saveSettings({ followLiturgicalYear: next });
  };

  if (widgetMode) {
    return (
      <Routes>
        <Route path="/widget/votd" element={<WidgetVotd />} />
      </Routes>
    );
  }

  return (
    <div className="app">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        followYear={followYear}
        onToggleFollowYear={toggleFollowYear}
      />
      <main className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/read" element={<BookList />} />
          <Route path="/read/:translation/:book/:chapter" element={<Reader />} />
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
