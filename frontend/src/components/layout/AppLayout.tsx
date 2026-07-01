import { BookOpen, Library, MessageCircle, Moon, Search, Settings, ShieldCheck, Sun, UserRound } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getAdminToken } from "@/api";
import { ScrollToTopButton } from "@/components/layout/ScrollToTopButton";
import { useAuth } from "@/features/auth/stores/auth.store";
import { FloatingChatWidget } from "@/features/chat/components/FloatingChatWidget";
import { NotificationCenter } from "@/features/notifications/NotificationCenter";
import { useTheme } from "@/features/theme/theme.store";

const navItems = [
  { to: "/", label: "Home", icon: BookOpen },
  { to: "/search", label: "Search", icon: Search },
  { to: "/library", label: "Library", icon: Library },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/settings", label: "Settings", icon: Settings }
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isReaderRoute = location.pathname.startsWith("/read/");
  const isMessagesRoute = location.pathname.startsWith("/messages");
  const routeContext = getRouteContext(location.pathname);
  const visibleNavItems = user?.role === "ADMIN" || getAdminToken() ? [...navItems, { to: "/admin", label: "Admin", icon: ShieldCheck }] : navItems;
  const ThemeIcon = theme === "dark" ? Sun : Moon;
  const themeLabel = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <div className={`shell ${isReaderRoute ? "shell-reader" : ""}`}>
      {!isReaderRoute ? (
      <header className="app-header sticky top-0 z-40">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <button className="flex items-center gap-3" onClick={() => navigate("/")} aria-label="Go home" type="button">
            <span className="brand-mark grid size-9 place-items-center rounded-lg border border-[var(--line)] bg-[var(--surface-strong)]">
              <BookOpen size={19} color="var(--accent)" />
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-black uppercase tracking-[0.18em] text-[var(--accent)]">Manga Shelf</span>
              <span className="block text-xs text-[var(--muted)]">MangaDex powered</span>
            </span>
          </button>

          <nav className="app-nav flex items-center gap-1 rounded-xl border border-[var(--line)] p-1">
            {visibleNavItems.map((item) => (
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

          <div className="flex items-center gap-2">
            <NotificationCenter user={user} />
            <button className="btn reader-icon-button min-h-9" onClick={toggleTheme} title={themeLabel} aria-label={themeLabel} type="button">
              <ThemeIcon size={17} />
            </button>
            {user ? (
              <button className="btn min-h-9 text-sm" onClick={logout} type="button">
                <UserRound size={17} />
                <span className="hidden sm:inline">{user.displayName}</span>
              </button>
            ) : (
              <button className="btn btn-primary min-h-9 text-sm" onClick={() => navigate("/login")} type="button">
                Login
              </button>
            )}
          </div>
        </div>
      </header>
      ) : null}
      <main className={isReaderRoute ? "reader-main" : isMessagesRoute ? "container-x messages-main" : "container-x py-6"}>
        <Outlet />
      </main>
      {user && !isMessagesRoute ? (
        <FloatingChatWidget routeContext={routeContext} />
      ) : null}
      <ScrollToTopButton />
    </div>
  );
}

function getRouteContext(pathname: string) {
  const mangaMatch = pathname.match(/^\/manga\/([^/]+)/);
  if (mangaMatch) return { mangaId: mangaMatch[1] };
  const readerMatch = pathname.match(/^\/read\/([^/]+)/);
  if (readerMatch) return { chapterId: readerMatch[1] };
  return undefined;
}
