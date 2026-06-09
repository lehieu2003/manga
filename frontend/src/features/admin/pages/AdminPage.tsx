import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Archive,
  BarChart3,
  Clock3,
  Database,
  Gauge,
  HardDrive,
  KeyRound,
  Library,
  ListChecks,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  Zap,
  type LucideIcon
} from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { api, clearAdminToken, getAdminToken, setAdminToken } from "@/api";
import type { AdminCacheMangaRow, AdminUser, AdminUserLibraryRow, AdminUserProgressRow, AdminSearchHistoryRow } from "@/types";

type AdminTab = "overview" | "catalog" | "users" | "cache";
type UserTab = "profile" | "library" | "progress" | "history";

const libraryStatuses = ["READING", "PLAN_TO_READ", "COMPLETED", "PAUSED", "DROPPED"] as const;

export function AdminPage() {
  const [tokenVersion, setTokenVersion] = useState(0);
  const token = getAdminToken();

  if (!token) {
    return <AdminGate onTokenSaved={() => setTokenVersion((value) => value + 1)} />;
  }

  return <AdminWorkspace key={tokenVersion} onClearToken={() => {
    clearAdminToken();
    setTokenVersion((value) => value + 1);
  }} />;
}

function AdminGate({ onTokenSaved }: { onTokenSaved: () => void }) {
  const [token, setToken] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!token.trim()) return;
    setAdminToken(token.trim());
    onTokenSaved();
  };

  return (
    <section className="mx-auto grid max-w-xl gap-5">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Admin console</p>
        <h1 className="text-3xl font-black">Operator access</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Enter the admin token for this browser session.</p>
      </div>
      <form className="surface rounded-lg p-5" onSubmit={submit}>
        <label>
          <span className="mb-2 block text-sm font-bold text-[var(--muted)]">Admin token</span>
          <input className="control min-h-11 w-full rounded-lg px-3" value={token} onChange={(event) => setToken(event.target.value)} type="password" autoComplete="off" />
        </label>
        <button className="btn btn-primary mt-5" type="submit">
          <KeyRound size={17} />
          Unlock admin
        </button>
      </form>
    </section>
  );
}

function AdminWorkspace({ onClearToken }: { onClearToken: () => void }) {
  const [tab, setTab] = useState<AdminTab>("overview");
  const nav = [
    { id: "overview" as const, label: "Overview", detail: "System pulse", icon: Gauge },
    { id: "catalog" as const, label: "Catalog Ops", detail: "Sync and import", icon: RefreshCw },
    { id: "users" as const, label: "Users", detail: "Accounts and data", icon: Users },
    { id: "cache" as const, label: "Cache", detail: "Manga storage", icon: Archive }
  ];

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark"><ShieldCheck size={20} /></span>
          <span>
            <span className="admin-brand-kicker">Manga Shelf</span>
            <span className="admin-brand-title">Admin</span>
          </span>
        </div>

        <nav className="admin-nav" aria-label="Admin sections">
          {nav.map((item) => (
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

function OverviewPanel({ onNavigate }: { onNavigate: (tab: AdminTab) => void }) {
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
          <button onClick={() => onNavigate("catalog")} type="button"><RefreshCw size={17} /> Run a targeted MangaDex sync</button>
          <button onClick={() => onNavigate("cache")} type="button"><HardDrive size={17} /> Inspect or clear cached manga</button>
          <button onClick={() => onNavigate("users")} type="button"><UserRound size={17} /> Open user support tools</button>
        </article>
      </section>
    </div>
  );
}

function CatalogOpsPanel() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const sync = useMutation({ mutationFn: api.admin.syncCatalog, onSuccess: (result) => {
    setMessage(`Synced ${result.summary.mangaCount} manga. Cached total: ${result.summary.cachedTotal}.`);
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
  } });
  const importManga = useMutation({ mutationFn: api.admin.importManga, onSuccess: (result) => setMessage(importSummary(result.summary)) });
  const importChapters = useMutation({ mutationFn: api.admin.importChapters, onSuccess: (result) => setMessage(importSummary(result.summary)) });

  const [syncForm, setSyncForm] = useState({ q: "", limit: 12, languages: "vi,en", includeChapters: false, chaptersLimit: 32 });
  const [mangaForm, setMangaForm] = useState({ mangaId: "", includeChapters: true, languages: "vi,en", chaptersLimit: 100 });
  const [chaptersForm, setChaptersForm] = useState({ mangaId: "", languages: "vi,en", limit: 100, offset: 0 });

  return (
    <section className="admin-section-grid xl:grid-cols-3">
      <AdminForm title="Catalog sync" icon={RefreshCw} message={message} error={sync.error} onSubmit={() => sync.mutate(syncForm)} busy={sync.isPending} button="Run sync">
        <TextInput label="Query" value={syncForm.q} onChange={(q) => setSyncForm({ ...syncForm, q })} />
        <NumberInput label="Limit" value={syncForm.limit} onChange={(limit) => setSyncForm({ ...syncForm, limit })} />
        <TextInput label="Languages" value={syncForm.languages} onChange={(languages) => setSyncForm({ ...syncForm, languages })} />
        <NumberInput label="Chapters limit" value={syncForm.chaptersLimit} onChange={(chaptersLimit) => setSyncForm({ ...syncForm, chaptersLimit })} />
        <label className="chapter-filter">
          <input checked={syncForm.includeChapters} onChange={(event) => setSyncForm({ ...syncForm, includeChapters: event.target.checked })} type="checkbox" />
          Include chapters
        </label>
      </AdminForm>

      <AdminForm title="Import manga" icon={Database} message={message} error={importManga.error} onSubmit={() => importManga.mutate(mangaForm)} busy={importManga.isPending} button="Import manga">
        <TextInput label="Manga ID" value={mangaForm.mangaId} onChange={(mangaId) => setMangaForm({ ...mangaForm, mangaId })} required />
        <TextInput label="Languages" value={mangaForm.languages} onChange={(languages) => setMangaForm({ ...mangaForm, languages })} />
        <NumberInput label="Chapters limit" value={mangaForm.chaptersLimit} onChange={(chaptersLimit) => setMangaForm({ ...mangaForm, chaptersLimit })} />
        <label className="chapter-filter">
          <input checked={mangaForm.includeChapters} onChange={(event) => setMangaForm({ ...mangaForm, includeChapters: event.target.checked })} type="checkbox" />
          Include chapters
        </label>
      </AdminForm>

      <AdminForm title="Import chapters" icon={Archive} message={message} error={importChapters.error} onSubmit={() => importChapters.mutate(chaptersForm)} busy={importChapters.isPending} button="Import chapters">
        <TextInput label="Manga ID" value={chaptersForm.mangaId} onChange={(mangaId) => setChaptersForm({ ...chaptersForm, mangaId })} required />
        <TextInput label="Languages" value={chaptersForm.languages} onChange={(languages) => setChaptersForm({ ...chaptersForm, languages })} />
        <NumberInput label="Limit" value={chaptersForm.limit} onChange={(limit) => setChaptersForm({ ...chaptersForm, limit })} />
        <NumberInput label="Offset" value={chaptersForm.offset} onChange={(offset) => setChaptersForm({ ...chaptersForm, offset })} />
      </AdminForm>
    </section>
  );
}

function CachePanel() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const cache = useQuery({ queryKey: ["admin", "cache", query], queryFn: () => api.admin.listCachedManga({ query, limit: 25 }), retry: false });
  const detail = useQuery({ queryKey: ["admin", "cache-detail", selectedId], queryFn: () => api.admin.getCachedManga(selectedId), enabled: Boolean(selectedId), retry: false });
  const deleteManga = useMutation({ mutationFn: api.admin.deleteCachedManga, onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "cache"] }) });
  const deleteChapters = useMutation({ mutationFn: api.admin.deleteCachedChapters, onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "cache"] }) });

  const rows = cache.data?.data ?? [];
  return (
    <section className="admin-split-grid">
      <div className="admin-panel">
        <SearchBox value={query} onChange={setQuery} placeholder="Search cached manga..." />
        <div className="mt-4 grid gap-2">
          {rows.map((manga) => (
            <CacheRow key={manga.id} manga={manga} selected={selectedId === manga.id} onSelect={() => setSelectedId(manga.id)} />
          ))}
        </div>
      </div>
      <aside className="admin-panel">
        {detail.data?.manga ? (
          <div className="grid gap-3">
            <h2 className="text-xl font-black">{detail.data.manga.title}</h2>
            <p className="text-sm text-[var(--muted)]">{detail.data.manga.chapterCount} cached chapters</p>
            <DangerButton label="Delete chapters" onConfirm={() => deleteChapters.mutate(detail.data.manga!.id)} confirmText={detail.data.manga.id} />
            <DangerButton label="Delete manga cache" onConfirm={() => deleteManga.mutate(detail.data.manga!.id)} confirmText={detail.data.manga.id} />
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">Select cached manga to inspect or delete cache rows.</p>
        )}
      </aside>
    </section>
  );
}

function UsersPanel() {
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const users = useQuery({ queryKey: ["admin", "users", query], queryFn: () => api.admin.listUsers({ query, limit: 25 }), retry: false });
  const rows = users.data?.data ?? [];

  return (
    <section className="admin-split-grid admin-user-grid">
      <div className="admin-panel">
        <SearchBox value={query} onChange={setQuery} placeholder="Search users..." />
        <div className="mt-4 grid gap-2">
          {rows.map((user) => (
            <button key={user.id} className={`w-full rounded-lg border p-3 text-left ${selectedUserId === user.id ? "border-[var(--accent)] bg-[rgba(255,184,107,0.09)]" : "border-[var(--line)] bg-[rgba(255,184,107,0.03)]"}`} onClick={() => setSelectedUserId(user.id)} type="button">
              <span className="block font-bold">{user.displayName}</span>
              <span className="block text-sm text-[var(--muted)]">{user.email}</span>
            </button>
          ))}
        </div>
      </div>
      {selectedUserId ? <UserDetail userId={selectedUserId} /> : <div className="admin-panel text-sm text-[var(--muted)]">Select a user to manage profile, sessions, library, progress, and search history.</div>}
    </section>
  );
}

function UserDetail({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<UserTab>("profile");
  const user = useQuery({ queryKey: ["admin", "user", userId], queryFn: () => api.admin.getUser(userId), retry: false });
  const revoke = useMutation({ mutationFn: () => api.admin.revokeUserSessions(userId), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "user", userId] }) });
  const remove = useMutation({ mutationFn: () => api.admin.deleteUser(userId), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "users"] }) });

  if (user.isLoading) return <AdminLoading label="Loading user..." />;
  if (!user.data?.user) return <AdminError error={user.error ?? new Error("User not found")} />;

  const current = user.data.user;
  return (
    <div className="admin-panel">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">{current.displayName}</h2>
          <p className="text-sm text-[var(--muted)]">{current.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={() => window.confirm("Revoke all active sessions?") && revoke.mutate()} type="button">Revoke sessions</button>
          <DangerButton label="Delete user" confirmText={current.email} onConfirm={() => remove.mutate()} />
        </div>
      </div>
      <nav className="mb-4 flex flex-wrap gap-2">
        <SmallTab active={tab === "profile"} label="Profile" onClick={() => setTab("profile")} />
        <SmallTab active={tab === "library"} label="Library" onClick={() => setTab("library")} />
        <SmallTab active={tab === "progress"} label="Progress" onClick={() => setTab("progress")} />
        <SmallTab active={tab === "history"} label="Search History" onClick={() => setTab("history")} />
      </nav>
      {tab === "profile" ? <UserProfileForm user={current} /> : null}
      {tab === "library" ? <UserLibrary userId={userId} /> : null}
      {tab === "progress" ? <UserProgress userId={userId} /> : null}
      {tab === "history" ? <UserHistory userId={userId} /> : null}
    </div>
  );
}

function UserProfileForm({ user }: { user: AdminUser }) {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const update = useMutation({ mutationFn: () => api.admin.updateUser(user.id, { displayName, avatarUrl: avatarUrl.trim() || null }), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "user", user.id] }) });
  return (
    <AdminForm title="Profile" icon={UserRound} error={update.error} message={update.isSuccess ? "Profile saved." : ""} onSubmit={() => update.mutate()} busy={update.isPending} button="Save profile">
      <TextInput label="Display name" value={displayName} onChange={setDisplayName} required />
      <TextInput label="Avatar URL" value={avatarUrl} onChange={setAvatarUrl} />
    </AdminForm>
  );
}

function UserLibrary({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const library = useQuery({ queryKey: ["admin", "user", userId, "library"], queryFn: () => api.admin.listUserLibrary(userId), retry: false });
  const update = useMutation({ mutationFn: ({ item, status }: { item: AdminUserLibraryRow; status: string }) => api.admin.updateUserLibrary(userId, item.mangaId, { status }), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "user", userId, "library"] }) });
  const remove = useMutation({ mutationFn: (mangaId: string) => api.admin.deleteUserLibrary(userId, mangaId), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "user", userId, "library"] }) });
  return <AdminRows rows={library.data?.data ?? []} render={(item) => (
    <DataRow key={item.id} title={item.manga?.title ?? item.mangaId} meta={`${item.status} · favorite: ${item.isFavorite ? "yes" : "no"}`}>
      <select className="control min-h-10 rounded-lg px-2" value={item.status} onChange={(event) => update.mutate({ item, status: event.target.value })} aria-label="Library status">
        {libraryStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
      </select>
      <DangerButton label="Remove" confirmText={item.mangaId} onConfirm={() => remove.mutate(item.mangaId)} compact />
    </DataRow>
  )} />;
}

function UserProgress({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const progress = useQuery({ queryKey: ["admin", "user", userId, "progress"], queryFn: () => api.admin.listUserProgress(userId), retry: false });
  const remove = useMutation({ mutationFn: (chapterId: string) => api.admin.deleteUserProgress(userId, chapterId), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "user", userId, "progress"] }) });
  return <AdminRows rows={progress.data?.data ?? []} render={(item: AdminUserProgressRow) => (
    <DataRow key={item.id} title={item.manga?.title ?? item.mangaId} meta={`Chapter ${item.chapter?.chapter ?? item.chapterId} · page ${item.pageIndex + 1} · ${item.completed ? "completed" : "in progress"}`}>
      <DangerButton label="Remove" confirmText={item.chapterId} onConfirm={() => remove.mutate(item.chapterId)} compact />
    </DataRow>
  )} />;
}

function UserHistory({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const history = useQuery({ queryKey: ["admin", "user", userId, "history"], queryFn: () => api.admin.listUserSearchHistory(userId), retry: false });
  const clear = useMutation({ mutationFn: () => api.admin.clearUserSearchHistory(userId), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "user", userId, "history"] }) });
  return (
    <div className="grid gap-3">
      <div className="flex justify-end"><DangerButton label="Clear history" confirmText={userId} onConfirm={() => clear.mutate()} /></div>
      <AdminRows rows={history.data?.data ?? []} render={(item: AdminSearchHistoryRow) => <DataRow key={item.id} title={item.query} meta={new Date(item.createdAt).toLocaleString()} />} />
    </div>
  );
}

function AdminForm({ title, icon: Icon, children, error, message, onSubmit, busy, button }: { title: string; icon: LucideIcon; children: ReactNode; error?: unknown; message?: string; onSubmit: () => void; busy: boolean; button: string }) {
  return (
    <form className="admin-panel" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--accent)]"><Icon size={20} /></span>
        <h2 className="text-xl font-black">{title}</h2>
      </div>
      <div className="grid gap-4">{children}</div>
      <FormMessage error={error} message={message} />
      <button className="btn btn-primary mt-5" disabled={busy} type="submit">{busy ? "Working..." : button}</button>
    </form>
  );
}

function TextInput({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean }) {
  return <label><span className="mb-2 block text-sm font-bold text-[var(--muted)]">{label}</span><input className="control min-h-11 w-full rounded-lg px-3" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} /></label>;
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label><span className="mb-2 block text-sm font-bold text-[var(--muted)]">{label}</span><input className="control min-h-11 w-full rounded-lg px-3" value={value} onChange={(event) => onChange(Number(event.target.value))} type="number" min={0} /></label>;
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="relative block"><Search className="absolute left-3 top-3 text-[var(--muted)]" size={18} /><input className="control min-h-11 w-full rounded-lg pl-10 pr-3" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function CacheRow({ manga, selected, onSelect }: { manga: AdminCacheMangaRow; selected: boolean; onSelect: () => void }) {
  return <button className={`admin-data-row text-left ${selected ? "admin-data-row-active" : ""}`} onClick={onSelect} type="button"><span className="block font-bold">{manga.title}</span><span className="block text-sm text-[var(--muted)]">{manga.chapterCount} chapters · {manga.id}</span></button>;
}

function DangerButton({ label, confirmText, onConfirm, compact }: { label: string; confirmText: string; onConfirm: () => void; compact?: boolean }) {
  return <button className={`btn border-[rgba(255,107,107,0.45)] text-[var(--danger)] ${compact ? "min-h-9 px-2 text-sm" : ""}`} onClick={() => window.prompt(`Type ${confirmText} to confirm ${label}`) === confirmText && onConfirm()} type="button"><Trash2 size={16} />{label}</button>;
}

function DataRow({ title, meta, children }: { title: string; meta: string; children?: ReactNode }) {
  return <article className="admin-data-row flex flex-wrap items-center justify-between gap-3"><span className="min-w-0"><span className="block truncate font-bold">{title}</span><span className="block text-sm text-[var(--muted)]">{meta}</span></span><span className="flex flex-wrap gap-2">{children}</span></article>;
}

function AdminRows<T>({ rows, render }: { rows: T[]; render: (item: T) => ReactNode }) {
  if (!rows.length) return <p className="rounded-lg border border-[var(--line)] p-4 text-sm text-[var(--muted)]">No data.</p>;
  return <div className="grid gap-2">{rows.map(render)}</div>;
}

function TabButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: LucideIcon; label: string; onClick: () => void }) {
  return <button className={`btn ${active ? "bg-[var(--surface-strong)] text-[var(--accent)]" : "text-[var(--muted)]"}`} onClick={onClick} type="button"><Icon size={17} />{label}</button>;
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: LucideIcon; tone: string }) {
  return (
    <article className={`admin-stat-card admin-stat-${tone}`}>
      <span className="admin-stat-icon"><Icon size={19} /></span>
      <span>
        <span className="admin-stat-label">{label}</span>
        <strong>{value}</strong>
      </span>
    </article>
  );
}

function MetricBar({ label, value, max }: { label: string; value: number; max: number }) {
  const width = `${Math.max(4, Math.min(100, Math.round((value / max) * 100)))}%`;
  return (
    <div className="admin-metric">
      <div>
        <span>{label}</span>
        <strong>{value.toLocaleString()}</strong>
      </div>
      <span className="admin-metric-track"><span style={{ width }} /></span>
    </div>
  );
}

function SmallTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button className={`chapter-filter ${active ? "genre-chip-active" : ""}`} onClick={onClick} type="button">{label}</button>;
}

function AdminLoading({ label }: { label: string }) {
  return <div className="admin-panel text-[var(--muted)]">{label}</div>;
}

function AdminError({ error }: { error: unknown }) {
  return <div className="admin-panel border-[rgba(255,107,107,0.45)] text-[var(--danger)]">{error instanceof Error ? error.message : "Admin request failed"}</div>;
}

function FormMessage({ error, message }: { error?: unknown; message?: string }) {
  const text = error instanceof Error ? error.message : message;
  if (!text) return null;
  return <p className={`mt-4 rounded-lg border px-3 py-2 text-sm ${error ? "border-[rgba(255,122,168,0.58)] text-[var(--danger)]" : "border-[rgba(255,184,107,0.58)] text-[var(--accent)]"}`}>{text}</p>;
}

function importSummary(summary: { mangaId: string; chaptersFetched: number; readableChaptersSaved: number; zeroPageChaptersSkipped: number }) {
  return `${summary.mangaId}: ${summary.readableChaptersSaved}/${summary.chaptersFetched} readable chapters saved, ${summary.zeroPageChaptersSkipped} skipped.`;
}
