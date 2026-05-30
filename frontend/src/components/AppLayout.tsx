import { BookOpen, Library, Search, Settings, UserRound } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../state/auth";

const navItems = [
  { to: "/", label: "Home", icon: BookOpen },
  { to: "/search", label: "Search", icon: Search },
  { to: "/library", label: "Library", icon: Library },
  { to: "/settings", label: "Settings", icon: Settings }
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="shell">
      <header className="app-header sticky top-0 z-40">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <button className="flex items-center gap-3" onClick={() => navigate("/")} aria-label="Go home">
            <span className="grid size-9 place-items-center rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] shadow-[0_8px_22px_rgba(255,184,107,0.08)]">
              <BookOpen size={19} color="var(--accent)" />
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-black uppercase tracking-[0.18em] text-[var(--accent)]">Manga Shelf</span>
              <span className="block text-xs text-[var(--muted)]">MangaDex powered</span>
            </span>
          </button>

          <nav className="flex items-center gap-1 rounded-xl border border-[var(--line)] bg-[rgba(18,13,10,0.78)] p-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `btn min-h-9 border-transparent px-2.5 text-sm ${isActive ? "bg-[var(--surface-strong)] text-[var(--accent)]" : "text-[var(--muted)]"}`
                }
              >
                <item.icon size={17} />
                <span className="hidden md:inline">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {user ? (
            <button className="btn min-h-9 text-sm" onClick={logout}>
              <UserRound size={17} />
              <span className="hidden sm:inline">{user.displayName}</span>
            </button>
          ) : (
            <button className="btn btn-primary min-h-9 text-sm" onClick={() => navigate("/login")}>
              Login
            </button>
          )}
        </div>
      </header>
      <main className="container-x py-6">
        <Outlet />
      </main>
    </div>
  );
}
