import { Link } from "react-router-dom";
import Icon from "./Icon";
import TabBar from "./TabBar";

// Spec §2.1 / §2.2 and the v1.16.0 collapsing masthead: the header is the brand
// and the five-tab navigation, nothing more. On wide viewports the two share one
// sticky row. On phones the header's boxes dissolve (display: contents in
// styles.css), so the gold brand row sits in normal flow and scrolls off the
// page while <TabBar> pins below the status bar as its own slim sticky row.

export default function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="brand-link" aria-label="Fidelis — home">
          <span className="brand">
            <span className="cross"><Icon name="cross" /></span> Fidelis <small>Catholic Bible</small>
          </span>
        </Link>
        <TabBar />
      </div>
    </header>
  );
}
