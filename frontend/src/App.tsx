import { Outlet, NavLink } from "react-router-dom";
import { supabase } from "./services/supabase";

export default function App() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <nav
        style={{
          width: 240,
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border)",
          padding: "24px 0",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "0 24px", marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>WealthTracker</h2>
        </div>
        <div style={{ flex: 1 }}>
          <SidebarLink to="/" label="Dashboard" end />
          <SidebarLink to="/accounts" label="Accounts" />
          <SidebarLink to="/properties" label="Real Estate" />
          <SidebarLink to="/calculator" label="Valuation Calculator" />
        </div>
        <div style={{ padding: "0 16px" }}>
          <button
            className="btn-secondary"
            style={{ width: "100%" }}
            onClick={handleLogout}
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, padding: 40, overflow: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}

function SidebarLink({
  to,
  label,
  end,
}: {
  to: string;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        display: "block",
        padding: "10px 24px",
        color: isActive ? "var(--accent)" : "var(--text-secondary)",
        background: isActive ? "rgba(99,102,241,0.1)" : "transparent",
        borderRight: isActive ? "3px solid var(--accent)" : "3px solid transparent",
        fontSize: 14,
        fontWeight: isActive ? 600 : 400,
        transition: "all 0.15s",
      })}
    >
      {label}
    </NavLink>
  );
}
