import { NavLink } from "react-router-dom";

interface Props {
  theme: "day" | "night";
  onToggleTheme: () => void;
}

export default function Header({ theme, onToggleTheme }: Props) {
  return (
    <header className="header">
      <div className="header-inner">
        <NavLink to="/" style={{ textDecoration: "none" }}>
          <span className="brand">
            <span className="cross">✠</span> Fidelis <small>Catholic Bible</small>
          </span>
        </NavLink>
        <nav className="nav">
          <NavLink to="/" end>Today</NavLink>
          <NavLink to="/readings">Mass</NavLink>
          <NavLink to="/read">Read</NavLink>
          <NavLink to="/search">Search</NavLink>
          <NavLink to="/library">Library</NavLink>
          <NavLink to="/translations">Translations</NavLink>
          <NavLink to="/about">About</NavLink>
        </nav>
        <button
          className="icon-btn"
          onClick={onToggleTheme}
          title={theme === "night" ? "Day mode" : "Night mode"}
        >
          {theme === "night" ? "☀" : "☾"}
        </button>
      </div>
    </header>
  );
}
