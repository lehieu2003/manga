import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/api";
import { AuthPanel, Field } from "@/features/auth/components";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.resetPassword({ token, newPassword });
      setSuccess(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not reset password");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPanel title="Choose new password" footer={<Link to="/login">Back to login</Link>}>
      {!token ? (
        <p className="rounded-lg border border-[var(--danger)] p-3 text-sm text-[var(--danger)]">Password reset link is missing a token.</p>
      ) : success ? (
        <div className="space-y-4">
          <p className="rounded-lg border border-[var(--line)] bg-[var(--accent-soft)] p-3 text-sm text-[var(--muted)]">
            Your password has been reset. Login with your new password.
          </p>
          <button className="btn btn-primary w-full" type="button" onClick={() => navigate("/login")}>
            Go to login
          </button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit}>
          <Field label="New password" value={newPassword} onChange={setNewPassword} type="password" />
          <Field label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} type="password" />
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          <button className="btn btn-primary w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Reset password"}
          </button>
        </form>
      )}
    </AuthPanel>
  );
}
