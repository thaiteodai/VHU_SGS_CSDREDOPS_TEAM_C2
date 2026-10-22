import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { Button } from "./ui.jsx";

const NAV = [
  { to: "/", label: "My targets", end: true },
  { to: "/shame", label: "Wall of Shame" },
  { to: "/log", label: "Public log" },
  { to: "/help", label: "Help" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="topbar">
        <NavLink to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            !
          </span>
          <span>
            Panic Plan
            <small>absurdly accountable deadlines</small>
          </span>
        </NavLink>

        <nav className="top-nav" aria-label="Primary">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="top-actions">
          {user ? (
            <>
              <span className="who">
                <strong>{user.name}</strong>
                <small>{user.role.toLowerCase()}</small>
              </span>
              {user.role === "ADMIN" ? (
                <NavLink to="/admin" className="nav-link">
                  Admin
                </NavLink>
              ) : null}
              <NavLink to="/settings" className="nav-link">
                Settings
              </NavLink>
              <Button variant="quiet" onClick={handleLogout}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="nav-link">
                Sign in
              </NavLink>
              <NavLink to="/register" className="button dark">
                Get started
              </NavLink>
            </>
          )}
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="site-footer">
        <span>Panic Plan · deadlines with consequences (emotional ones)</span>
        <nav aria-label="Legal">
          <NavLink to="/privacy">Privacy</NavLink>
          <NavLink to="/terms">Terms</NavLink>
          <NavLink to="/feedback">Feedback</NavLink>
        </nav>
      </footer>
    </div>
  );
}
