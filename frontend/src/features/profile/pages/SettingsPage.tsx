import { ShieldCheck } from "lucide-react";
import { useEffect, useReducer, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/stores/auth.store";
import { ProfileSettingsForm } from "../components/ProfileSettingsForm";
import { SecuritySettingsForm } from "../components/SecuritySettingsForm";
import { SessionSettingsSection } from "../components/SessionSettingsSection";
import { createPasswordFormState, createProfileFormState, passwordFormReducer, profileFormReducer } from "../settings/settings.reducers";

export function SettingsPage() {
  const { user, updateProfile, uploadAvatar, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [profileForm, dispatchProfile] = useReducer(profileFormReducer, createProfileFormState(user?.displayName ?? "", user?.avatarUrl ?? ""));
  const [passwordForm, dispatchPassword] = useReducer(passwordFormReducer, createPasswordFormState());
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    dispatchProfile({ type: "loaded", displayName: user?.displayName ?? "", avatarUrl: user?.avatarUrl ?? "" });
  }, [user?.avatarUrl, user?.displayName]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile]);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    dispatchProfile({ type: "saveStarted" });
    try {
      if (avatarFile) await uploadAvatar(avatarFile);
      await updateProfile({ displayName: profileForm.displayName });
      setAvatarFile(null);
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
        <ProfileSettingsForm
          user={user}
          profileForm={profileForm}
          avatarPreviewUrl={avatarPreviewUrl}
          dispatchProfile={dispatchProfile}
          onAvatarChange={setAvatarFile}
          onSubmit={saveProfile}
        />
        <SecuritySettingsForm hasPassword={user?.hasPassword ?? true} passwordForm={passwordForm} dispatchPassword={dispatchPassword} onSubmit={savePassword} />
      </section>

      <SessionSettingsSection isLoggingOut={isLoggingOut} onLogout={endSession} />
    </div>
  );
}
