import { ClipboardList, Search } from "lucide-react";
import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/compliance/watchlist", label: "Morning Watchlist", icon: ClipboardList },
  { to: "/compliance/investigator", label: "Investigator Search", icon: Search },
];

export default function ComplianceTabs() {
  return (
    <nav
      aria-label="Compliance workflows"
      className="glass rounded-xl p-1 flex gap-1 self-start shrink-0"
    >
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
              isActive
                ? "bg-tavily-orange text-white shadow-sm"
                : "text-ink-400 hover:bg-white/45 hover:text-ink-100"
            }`
          }
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
