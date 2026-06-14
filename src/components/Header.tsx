import { NavLink } from "react-router-dom";
import Icon from "./Icon";
import TabBar from "./TabBar";

// Spec §2.1: the five-tab navigation (Today · Read · Search · Mass · More) lives
// in <TabBar>, rendered here as the header row on wide viewports and re-laid by
// CSS into a bottom tab bar on phones. The type/theme controls sit beside the
// liturgical-year and day/night toggles in the header's control cluster (the
// §2.2 Settings redesign will fold them into the one Settings screen).

interface Props {
  theme: "day" | "night";
  onToggleTheme: () => void;
  followYear: boolean;
  onToggleFollowYear: () => void;
}

export default function Header({ theme, onToggleTheme, followYear, onToggleFollowYear }: Props) {
  return (
    <header className="header">
      <div className="header-inner">
        <NavLink to="/" style={{ textDecoration: "none" }}>
          <span className="brand">
            <span className="cross"><Icon name="cross" /></span> Fidelis <small>Catholic Bible</small>
          </span>
        </NavLink>
        <TabBar />
        <button
          className="icon-btn"
          onClick={onToggleFollowYear}
          aria-pressed={followYear}
          aria-label="Follow the liturgical year"
          title={followYear ? "Following the liturgical year" : "Liturgical colors off — brand purple"}
        >
          <span className="accent-dot" aria-hidden="true">{followYear ? "●" : "○"}</span>
        </button>
        <button
          className="icon-btn"
          onClick={onToggleTheme}
          aria-pressed={theme === "night"}
          aria-label={theme === "night" ? "Day mode" : "Night mode"}
          title={theme === "night" ? "Day mode" : "Night mode"}
        >
          <Icon name={theme === "night" ? "sun" : "moon"} />
        </button>
        <NavLink className="icon-btn" to="/settings" title="Settings" aria-label="Settings">
          ⚙
        </NavLink>
      </div>
    </header>
  );
}
