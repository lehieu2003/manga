import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api";
import { AuthPanel, Field } from "@/features/auth/components";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await api.forgotPassword({ email });
      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not request password reset");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPanel title="Reset password" footer={<Link to="/login">Back to login</Link>}>
      {sent ? (
        <div className="space-y-4">
          <p className="rounded-lg border border-[var(--line)] bg-[var(--accent-soft)] p-3 text-sm text-[var(--muted)]">
            If an account exists for that email, a reset link has been sent.
          </p>
          <button className="btn w-full" type="button" onClick={() => setSent(false)}>
            Send another link
          </button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit}>
          <Field label="Email" value={email} onChange={setEmail} type="email" />
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          <button className="btn btn-primary w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}
    </AuthPanel>
  );
}
