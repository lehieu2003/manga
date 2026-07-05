import { KeyRound } from "lucide-react";
import type { FormEvent } from "react";
import type { PasswordFormAction, PasswordFormState } from "../settings/settings.types";
import { FormMessage, PasswordField } from "./settingsShared";

export function SecuritySettingsForm({
  hasPassword,
  passwordForm,
  dispatchPassword,
  onSubmit
}: {
  hasPassword: boolean;
  passwordForm: PasswordFormState;
  dispatchPassword: (action: PasswordFormAction) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  if (!hasPassword) {
    return (
      <section className="surface rounded-lg p-5">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--accent)]">
            <KeyRound size={20} />
          </span>
          <div>
            <h2 className="text-xl font-black">Security</h2>
            <p className="text-sm text-[var(--muted)]">This account signs in with Google.</p>
          </div>
        </div>
        <p className="rounded-lg border border-[var(--line)] bg-[var(--accent-soft)] p-3 text-sm text-[var(--muted)]">
          Password changes are handled by Google for this account. You can still manage your profile and app session here.
        </p>
      </section>
    );
  }

  return (
    <form className="surface rounded-lg p-5" onSubmit={onSubmit}>
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
  );
}
