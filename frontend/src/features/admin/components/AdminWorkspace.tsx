import { Archive, Gauge, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";
import type { AdminTab } from "../admin.types";
import { CachePanel } from "./CachePanel";
import { CatalogOpsPanel } from "./CatalogOpsPanel";
import { OverviewPanel } from "./OverviewPanel";
import { UsersPanel } from "./UsersPanel";

const adminNav = [
  { id: "overview" as const, label: "Overview", detail: "System pulse", icon: Gauge },
  { id: "catalog" as const, label: "Catalog Ops", detail: "Sync and import", icon: RefreshCw },
  { id: "users" as const, label: "Users", detail: "Accounts and data", icon: Users },
  { id: "cache" as const, label: "Cache", detail: "Manga storage", icon: Archive }
];

export function AdminWorkspace({ onClearToken }: { onClearToken: () => void }) {
  const [tab, setTab] = useState<AdminTab>("overview");

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark">
            <ShieldCheck size={20} />
          </span>
          <span>
            <span className="admin-brand-kicker">Manga Shelf</span>
            <span className="admin-brand-title">Admin</span>
          </span>
        </div>

        <nav className="admin-nav" aria-label="Admin sections">
          {adminNav.map((item) => (
            <button className={`admin-nav-button ${tab === item.id ? "admin-nav-button-active" : ""}`} key={item.id} onClick={() => setTab(item.id)} type="button">
              <item.icon size={18} />
              <span>
                <span>{item.label}</span>
                <small>{item.detail}</small>
              </span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-status">
          <span className="admin-live-dot" />
          <span>
            <strong>Token session</strong>
            <small>Stored until this tab session ends</small>
          </span>
        </div>
      </aside>

      <section className="admin-main">
        <div className="admin-topbar">
          <div>
            <p className="admin-eyebrow">Admin console</p>
            <h1>Data operations</h1>
          </div>
          <button className="btn" onClick={onClearToken} type="button">
            <ShieldCheck size={17} />
            Clear token
          </button>
        </div>

        {tab === "overview" ? <OverviewPanel onNavigate={setTab} /> : null}
        {tab === "catalog" ? <CatalogOpsPanel /> : null}
        {tab === "users" ? <UsersPanel /> : null}
        {tab === "cache" ? <CachePanel /> : null}
      </section>
    </div>
  );
}
