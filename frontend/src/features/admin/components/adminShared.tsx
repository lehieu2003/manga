import { Search, Trash2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { AdminCacheMangaRow } from "@/types";

export function AdminForm({
  title,
  icon: Icon,
  children,
  error,
  message,
  onSubmit,
  busy,
  button
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  error?: unknown;
  message?: string;
  onSubmit: () => void;
  busy: boolean;
  button: string;
}) {
  return (
    <form
      className="admin-panel"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--accent)]">
          <Icon size={20} />
        </span>
        <h2 className="text-xl font-black">{title}</h2>
      </div>
      <div className="grid gap-4">{children}</div>
      <FormMessage error={error} message={message} />
      <button className="btn btn-primary mt-5" disabled={busy} type="submit">
        {busy ? "Working..." : button}
      </button>
    </form>
  );
}

export function TextInput({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-[var(--muted)]">{label}</span>
      <input className="control min-h-11 w-full rounded-lg px-3" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} />
    </label>
  );
}

export function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-[var(--muted)]">{label}</span>
      <input className="control min-h-11 w-full rounded-lg px-3" value={value} onChange={(event) => onChange(Number(event.target.value))} type="number" min={0} />
    </label>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="relative block">
      <Search className="absolute left-3 top-3 text-[var(--muted)]" size={18} />
      <input className="control min-h-11 w-full rounded-lg pl-10 pr-3" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function CacheRow({ manga, selected, onSelect }: { manga: AdminCacheMangaRow; selected: boolean; onSelect: () => void }) {
  return (
    <button className={`admin-data-row text-left ${selected ? "admin-data-row-active" : ""}`} onClick={onSelect} type="button">
      <span className="block font-bold">{manga.title}</span>
      <span className="block text-sm text-[var(--muted)]">
        {manga.chapterCount} chapters · {manga.id}
      </span>
    </button>
  );
}

export function DangerButton({ label, confirmText, onConfirm, compact }: { label: string; confirmText: string; onConfirm: () => void; compact?: boolean }) {
  return (
    <button className={`btn border-[rgba(255,107,107,0.45)] text-[var(--danger)] ${compact ? "min-h-9 px-2 text-sm" : ""}`} onClick={() => window.prompt(`Type ${confirmText} to confirm ${label}`) === confirmText && onConfirm()} type="button">
      <Trash2 size={16} />
      {label}
    </button>
  );
}

export function DataRow({ title, meta, children }: { title: string; meta: string; children?: ReactNode }) {
  return (
    <article className="admin-data-row flex flex-wrap items-center justify-between gap-3">
      <span className="min-w-0">
        <span className="block truncate font-bold">{title}</span>
        <span className="block text-sm text-[var(--muted)]">{meta}</span>
      </span>
      <span className="flex flex-wrap gap-2">{children}</span>
    </article>
  );
}

export function AdminRows<T>({ rows, render }: { rows: T[]; render: (item: T) => ReactNode }) {
  if (!rows.length) return <p className="rounded-lg border border-[var(--line)] p-4 text-sm text-[var(--muted)]">No data.</p>;
  return <div className="grid gap-2">{rows.map(render)}</div>;
}

export function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: LucideIcon; tone: string }) {
  return (
    <article className={`admin-stat-card admin-stat-${tone}`}>
      <span className="admin-stat-icon">
        <Icon size={19} />
      </span>
      <span>
        <span className="admin-stat-label">{label}</span>
        <strong>{value}</strong>
      </span>
    </article>
  );
}

export function MetricBar({ label, value, max }: { label: string; value: number; max: number }) {
  const width = `${Math.max(4, Math.min(100, Math.round((value / max) * 100)))}%`;
  return (
    <div className="admin-metric">
      <div>
        <span>{label}</span>
        <strong>{value.toLocaleString()}</strong>
      </div>
      <span className="admin-metric-track">
        <span style={{ width }} />
      </span>
    </div>
  );
}

export function SmallTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button className={`chapter-filter ${active ? "genre-chip-active" : ""}`} onClick={onClick} type="button">
      {label}
    </button>
  );
}

export function AdminLoading({ label }: { label: string }) {
  return <div className="admin-panel text-[var(--muted)]">{label}</div>;
}

export function AdminError({ error }: { error: unknown }) {
  return <div className="admin-panel border-[rgba(255,107,107,0.45)] text-[var(--danger)]">{error instanceof Error ? error.message : "Admin request failed"}</div>;
}

function FormMessage({ error, message }: { error?: unknown; message?: string }) {
  const text = error instanceof Error ? error.message : message;
  if (!text) return null;
  return <p className={`mt-4 rounded-lg border px-3 py-2 text-sm ${error ? "border-[rgba(255,122,168,0.58)] text-[var(--danger)]" : "border-[rgba(255,184,107,0.58)] text-[var(--accent)]"}`}>{text}</p>;
}
