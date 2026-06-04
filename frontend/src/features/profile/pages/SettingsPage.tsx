import { KeyRound, LogOut, Save, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/stores/auth.store";

export function SettingsPage() {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [profileStatus, setProfileStatus] = useState("");
  const [profileError, setProfileError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
    setAvatarUrl(user?.avatarUrl ?? "");
  }, [user?.avatarUrl, user?.displayName]);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setProfileStatus("");
    setProfileError("");
    setIsSavingProfile(true);
    try {
      await updateProfile({ displayName, avatarUrl: avatarUrl.trim() || null });
      setProfileStatus("Profile saved.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to save profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordStatus("");
    setPasswordError("");
    if (newPassword !== confirmPassword) {
      setPasswordError("New password confirmation does not match.");
      return;
    }
    setIsChangingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordStatus("Password changed. Other refresh sessions were revoked.");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Unable to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const endSession = async () => {
    setIsLoggingOut(true);
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Account settings</p>
          <h1 className="text-3xl font-black">Your manga shelf identity</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Manage the profile shown in this reader and keep the current session under control.</p>
        </div>
        <div className="manga-status-badge flex items-center gap-2">
          <ShieldCheck size={15} />
          Signed in
        </div>
      </div>

      <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <form className="surface rounded-lg p-5" onSubmit={saveProfile}>
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--accent)]">
              <UserRound size={20} />
            </span>
            <div>
              <h2 className="text-xl font-black">Profile</h2>
              <p className="text-sm text-[var(--muted)]">Email is read-only for this MVP.</p>
            </div>
          </div>

          <div className="grid gap-4">
            <label>
              <span className="mb-2 block text-sm font-bold text-[var(--muted)]">Email</span>
              <input className="control min-h-11 w-full rounded-lg px-3 text-[var(--muted)]" value={user?.email ?? ""} readOnly />
            </label>
            <label>
              <span className="mb-2 block text-sm font-bold text-[var(--muted)]">Display name</span>
              <input className="control min-h-11 w-full rounded-lg px-3" value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={40} required />
            </label>
            <label>
              <span className="mb-2 block text-sm font-bold text-[var(--muted)]">Avatar URL</span>
              <input className="control min-h-11 w-full rounded-lg px-3" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://example.com/avatar.png" />
            </label>
          </div>

          <FormMessage error={profileError} status={profileStatus} />
          <button className="btn btn-primary mt-5" disabled={isSavingProfile} type="submit">
            <Save size={17} />
            {isSavingProfile ? "Saving..." : "Save profile"}
          </button>
        </form>

        <form className="surface rounded-lg p-5" onSubmit={savePassword}>
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--accent)]">
              <KeyRound size={20} />
            </span>
            <div>
              <h2 className="text-xl font-black">Security</h2>
              <p className="text-sm text-[var(--muted)]">Changing password keeps this browser signed in.</p>
            </div>
          </div>

          <div className="grid gap-4">
            <PasswordField label="Current password" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
            <PasswordField label="New password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" minLength={8} />
            <PasswordField label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" minLength={8} />
          </div>

          <FormMessage error={passwordError} status={passwordStatus} />
          <button className="btn btn-primary mt-5" disabled={isChangingPassword} type="submit">
            <KeyRound size={17} />
            {isChangingPassword ? "Changing..." : "Change password"}
          </button>
        </form>
      </section>

      <section className="surface rounded-lg p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">Session</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Logout revokes this refresh token and clears the local session.</p>
          </div>
          <button className="btn min-h-11" disabled={isLoggingOut} onClick={endSession} type="button">
            <LogOut size={17} />
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </section>
    </div>
  );
}

function PasswordField({ label, value, onChange, autoComplete, minLength }: { label: string; value: string; onChange: (value: string) => void; autoComplete: string; minLength?: number }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-[var(--muted)]">{label}</span>
      <input className="control min-h-11 w-full rounded-lg px-3" value={value} onChange={(event) => onChange(event.target.value)} type="password" minLength={minLength} autoComplete={autoComplete} required />
    </label>
  );
}

function FormMessage({ error, status }: { error: string; status: string }) {
  if (!error && !status) return null;
  return <p className={`mt-4 rounded-lg border px-3 py-2 text-sm ${error ? "border-[rgba(255,122,168,0.58)] text-[var(--danger)]" : "border-[rgba(255,184,107,0.58)] text-[var(--accent)]"}`}>{error || status}</p>;
}
