import { Save, UserRound } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import type { User } from "@/types";
import type { ProfileFormAction, ProfileFormState } from "../settings/settings.types";
import { FormMessage } from "./settingsShared";

export function ProfileSettingsForm({
  user,
  profileForm,
  avatarPreviewUrl,
  dispatchProfile,
  onAvatarChange,
  onSubmit
}: {
  user?: User | null;
  profileForm: ProfileFormState;
  avatarPreviewUrl?: string | null;
  dispatchProfile: (action: ProfileFormAction) => void;
  onAvatarChange: (file: File | null) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const previewUrl = avatarPreviewUrl ?? user?.avatarUrl;

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    onAvatarChange(event.target.files?.[0] ?? null);
  };

  return (
    <form className="surface rounded-lg p-5" onSubmit={onSubmit}>
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-11 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--accent)]">
          {previewUrl ? <img alt="" className="size-full object-cover" src={previewUrl} /> : <UserRound className="m-auto" size={20} />}
        </span>
        <div>
          <h2 className="text-xl font-black">Profile</h2>
          <p className="text-sm text-[var(--muted)]">Email is read-only. Avatar supports JPG, PNG, WebP, or GIF.</p>
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
          <span className="mb-2 block text-sm font-bold text-[var(--muted)]">Avatar image</span>
          <input
            accept="image/jpeg,image/png,image/webp,image/gif"
            aria-label="Avatar image"
            className="control min-h-11 w-full rounded-lg px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--accent)] file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-white"
            onChange={handleAvatarChange}
            type="file"
          />
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
