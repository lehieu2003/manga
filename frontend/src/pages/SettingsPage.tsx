import { useAuth } from "../state/auth";

export function SettingsPage() {
  const { user } = useAuth();
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-black">Settings</h1>
      <section className="surface rounded-lg p-5">
        <p className="text-sm text-[var(--muted)]">Signed in as</p>
        <p className="text-lg font-bold">{user?.displayName}</p>
        <p className="text-sm text-[var(--muted)]">{user?.email}</p>
      </section>
      <section className="surface rounded-lg p-5">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Reader defaults</p>
        <p className="text-[var(--muted)]">Vietnamese and English chapters are prioritized for this MVP.</p>
      </section>
    </div>
  );
}
