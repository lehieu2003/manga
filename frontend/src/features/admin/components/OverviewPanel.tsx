import { useQuery } from "@tanstack/react-query";
import { Activity, BarChart3, Clock3, Database, HardDrive, Library, ListChecks, RefreshCw, Search, Server, UserRound, Users, Zap } from "lucide-react";
import { api } from "@/api";
import type { AdminTab } from "../admin.types";
import { AdminError, AdminLoading, MetricBar, StatCard } from "./adminShared";

export function OverviewPanel({ onNavigate }: { onNavigate: (tab: AdminTab) => void }) {
  const overview = useQuery({ queryKey: ["admin", "overview"], queryFn: api.admin.getOverview, retry: false });
  const items = overview.data
    ? [
        { label: "Users", value: overview.data.users, icon: Users, tone: "amber" },
        { label: "Active sessions", value: overview.data.activeSessions, icon: Activity, tone: "green" },
        { label: "Cached manga", value: overview.data.cachedManga, icon: Database, tone: "pink" },
        { label: "Cached chapters", value: overview.data.cachedChapters, icon: Library, tone: "amber" },
        { label: "Library items", value: overview.data.libraryItems, icon: ListChecks, tone: "green" },
        { label: "Reading progress", value: overview.data.readingProgress, icon: BarChart3, tone: "pink" },
        { label: "Search history", value: overview.data.searchHistory, icon: Search, tone: "amber" },
        { label: "Latest fetch", value: overview.data.latestCatalogFetchAt ? new Date(overview.data.latestCatalogFetchAt).toLocaleString() : "None", icon: Clock3, tone: "green" }
      ]
    : [];

  if (overview.isLoading) return <AdminLoading label="Loading overview..." />;
  if (overview.error) return <AdminError error={overview.error} />;

  return (
    <div className="admin-overview">
      <section className="admin-hero-panel">
        <div>
          <p className="admin-eyebrow">Operational snapshot</p>
          <h2>Cache, readers, and account data in one command surface.</h2>
          <p>Use this dashboard for MangaDex sync, local cache cleanup, and user data support tasks.</p>
        </div>
        <div className="admin-hero-actions">
          <button className="btn btn-primary" onClick={() => onNavigate("catalog")} type="button">
            <RefreshCw size={17} />
            Sync catalog
          </button>
          <button className="btn" onClick={() => onNavigate("users")} type="button">
            <Users size={17} />
            Manage users
          </button>
        </div>
      </section>

      <section className="admin-stat-grid">
        {items.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </section>

      <section className="admin-lower-grid">
        <article className="admin-panel">
          <div className="admin-panel-heading">
            <Server size={18} />
            <span>
              <strong>Data surface</strong>
              <small>Relative cache and reader activity</small>
            </span>
          </div>
          <MetricBar label="Cached chapters" value={overview.data?.cachedChapters ?? 0} max={Math.max(overview.data?.cachedChapters ?? 0, overview.data?.cachedManga ?? 0, 1)} />
          <MetricBar label="Cached manga" value={overview.data?.cachedManga ?? 0} max={Math.max(overview.data?.cachedChapters ?? 0, overview.data?.cachedManga ?? 0, 1)} />
          <MetricBar label="Reading progress" value={overview.data?.readingProgress ?? 0} max={Math.max(overview.data?.libraryItems ?? 0, overview.data?.readingProgress ?? 0, 1)} />
          <MetricBar label="Library items" value={overview.data?.libraryItems ?? 0} max={Math.max(overview.data?.libraryItems ?? 0, overview.data?.readingProgress ?? 0, 1)} />
        </article>

        <article className="admin-panel admin-command-panel">
          <div className="admin-panel-heading">
            <Zap size={18} />
            <span>
              <strong>Fast actions</strong>
              <small>Jump into high-frequency admin work</small>
            </span>
          </div>
          <button onClick={() => onNavigate("catalog")} type="button">
            <RefreshCw size={17} /> Run a targeted MangaDex sync
          </button>
          <button onClick={() => onNavigate("cache")} type="button">
            <HardDrive size={17} /> Inspect or clear cached manga
          </button>
          <button onClick={() => onNavigate("users")} type="button">
            <UserRound size={17} /> Open user support tools
          </button>
        </article>
      </section>
    </div>
  );
}
