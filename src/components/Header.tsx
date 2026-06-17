import { Link } from "react-router-dom";
import Icon from "./Icon";
import TabBar from "./TabBar";

// Spec §2.1 / §2.2: the header is the brand and the five-tab navigation, nothing
// more. <TabBar> renders as the header row on wide viewports and is re-laid by
// CSS into a bottom tab bar on phones. The old control cluster (day/night and
// the liturgical-year accent) has folded into the one Settings screen (§2.2),
// reachable via More → Settings.

export default function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" style={{ textDecoration: "none" }} aria-label="Fidelis — home">
          <span className="brand">
            <span className="cross"><Icon name="cross" /></span> Fidelis <small>Catholic Bible</small>
          </span>
        </Link>
        <TabBar />
      </div>
    </header>
  );
}
