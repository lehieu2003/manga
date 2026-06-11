import { Save, UserRound } from "lucide-react";
import type { FormEvent } from "react";
import type { User } from "@/types";
import type { ProfileFormAction, ProfileFormState } from "../settings/settings.types";
import { FormMessage } from "./settingsShared";

export function ProfileSettingsForm({
  user,
  profileForm,
  dispatchProfile,
  onSubmit
}: {
  user?: User | null;
  profileForm: ProfileFormState;
  dispatchProfile: (action: ProfileFormAction) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form className="surface rounded-lg p-5" onSubmit={onSubmit}>
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
  );
}
