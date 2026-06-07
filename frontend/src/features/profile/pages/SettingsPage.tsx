import { KeyRound, LogOut, Save, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useReducer, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/stores/auth.store";

type ProfileFormState = {
  displayName: string;
  avatarUrl: string;
  status: string;
  error: string;
  isSaving: boolean;
};

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  status: string;
  error: string;
  isChanging: boolean;
};

type ProfileFormAction =
  | { type: "loaded"; displayName: string; avatarUrl: string }
  | { type: "displayNameChanged"; value: string }
  | { type: "avatarUrlChanged"; value: string }
  | { type: "saveStarted" }
  | { type: "saveSucceeded" }
  | { type: "saveFailed"; error: string };

type PasswordFormAction =
  | { type: "currentPasswordChanged"; value: string }
  | { type: "newPasswordChanged"; value: string }
  | { type: "confirmPasswordChanged"; value: string }
  | { type: "changeStarted" }
  | { type: "validationFailed"; error: string }
  | { type: "changeSucceeded" }
  | { type: "changeFailed"; error: string };

export function SettingsPage() {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [profileForm, dispatchProfile] = useReducer(profileFormReducer, createProfileFormState(user?.displayName ?? "", user?.avatarUrl ?? ""));
  const [passwordForm, dispatchPassword] = useReducer(passwordFormReducer, createPasswordFormState());
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    dispatchProfile({ type: "loaded", displayName: user?.displayName ?? "", avatarUrl: user?.avatarUrl ?? "" });
  }, [user?.avatarUrl, user?.displayName]);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    dispatchProfile({ type: "saveStarted" });
    try {
      await updateProfile({ displayName: profileForm.displayName, avatarUrl: profileForm.avatarUrl.trim() || null });
      dispatchProfile({ type: "saveSucceeded" });
    } catch (error) {
      dispatchProfile({ type: "saveFailed", error: error instanceof Error ? error.message : "Unable to save profile" });
    }
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      dispatchPassword({ type: "validationFailed", error: "New password confirmation does not match." });
      return;
    }
    dispatchPassword({ type: "changeStarted" });
    try {
      await changePassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      dispatchPassword({ type: "changeSucceeded" });
    } catch (error) {
      dispatchPassword({ type: "changeFailed", error: error instanceof Error ? error.message : "Unable to change password" });
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
              <input className="control min-h-11 w-full rounded-lg px-3" value={profileForm.displayName} onChange={(event) => dispatchProfile({ type: "displayNameChanged", value: event.target.value })} minLength={2} maxLength={40} required />
            </label>
            <label>
              <span className="mb-2 block text-sm font-bold text-[var(--muted)]">Avatar URL</span>
              <input className="control min-h-11 w-full rounded-lg px-3" value={profileForm.avatarUrl} onChange={(event) => dispatchProfile({ type: "avatarUrlChanged", value: event.target.value })} placeholder="https://example.com/avatar.png" />
            </label>
          </div>

          <FormMessage error={profileForm.error} status={profileForm.status} />
          <button className="btn btn-primary mt-5" disabled={profileForm.isSaving} type="submit">
            <Save size={17} />
            {profileForm.isSaving ? "Saving..." : "Save profile"}
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
            <PasswordField label="Current password" value={passwordForm.currentPassword} onChange={(value) => dispatchPassword({ type: "currentPasswordChanged", value })} autoComplete="current-password" />
            <PasswordField label="New password" value={passwordForm.newPassword} onChange={(value) => dispatchPassword({ type: "newPasswordChanged", value })} autoComplete="new-password" minLength={8} />
            <PasswordField label="Confirm new password" value={passwordForm.confirmPassword} onChange={(value) => dispatchPassword({ type: "confirmPasswordChanged", value })} autoComplete="new-password" minLength={8} />
          </div>

          <FormMessage error={passwordForm.error} status={passwordForm.status} />
          <button className="btn btn-primary mt-5" disabled={passwordForm.isChanging} type="submit">
            <KeyRound size={17} />
            {passwordForm.isChanging ? "Changing..." : "Change password"}
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

function createProfileFormState(displayName: string, avatarUrl: string): ProfileFormState {
  return { displayName, avatarUrl, status: "", error: "", isSaving: false };
}

function createPasswordFormState(): PasswordFormState {
  return { currentPassword: "", newPassword: "", confirmPassword: "", status: "", error: "", isChanging: false };
}

function profileFormReducer(state: ProfileFormState, action: ProfileFormAction): ProfileFormState {
  switch (action.type) {
    case "loaded":
      return { ...state, displayName: action.displayName, avatarUrl: action.avatarUrl };
    case "displayNameChanged":
      return { ...state, displayName: action.value };
    case "avatarUrlChanged":
      return { ...state, avatarUrl: action.value };
    case "saveStarted":
      return { ...state, status: "", error: "", isSaving: true };
    case "saveSucceeded":
      return { ...state, status: "Profile saved.", error: "", isSaving: false };
    case "saveFailed":
      return { ...state, status: "", error: action.error, isSaving: false };
    default:
      return state;
  }
}

function passwordFormReducer(state: PasswordFormState, action: PasswordFormAction): PasswordFormState {
  switch (action.type) {
    case "currentPasswordChanged":
      return { ...state, currentPassword: action.value };
    case "newPasswordChanged":
      return { ...state, newPassword: action.value };
    case "confirmPasswordChanged":
      return { ...state, confirmPassword: action.value };
    case "changeStarted":
      return { ...state, status: "", error: "", isChanging: true };
    case "validationFailed":
      return { ...state, status: "", error: action.error, isChanging: false };
    case "changeSucceeded":
      return { ...createPasswordFormState(), status: "Password changed. Other refresh sessions were revoked." };
    case "changeFailed":
      return { ...state, status: "", error: action.error, isChanging: false };
    default:
      return state;
  }
}
