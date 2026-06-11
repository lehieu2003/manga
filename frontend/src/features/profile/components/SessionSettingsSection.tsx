import { LogOut } from "lucide-react";

export function SessionSettingsSection({ isLoggingOut, onLogout }: { isLoggingOut: boolean; onLogout: () => void }) {
  return (
    <section className="surface rounded-lg p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">Session</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Logout revokes this refresh token and clears the local session.</p>
        </div>
        <button className="btn min-h-11" disabled={isLoggingOut} onClick={onLogout} type="button">
          <LogOut size={17} />
          {isLoggingOut ? "Logging out..." : "Logout"}
        </button>
      </div>
    </section>
  );
}
