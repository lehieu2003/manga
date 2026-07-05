import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/api";
import { useAuth } from "@/features/auth/stores/auth.store";
import { AuthPanel, Field, GoogleSignInButton } from "@/features/auth/components";

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, verifyEmail, loginWithGoogle } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const payload = await register({ displayName, email, password });
      setVerificationEmail(payload.email);
      setExpiresAt(payload.expiresAt);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onVerify(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await verifyEmail({ email: verificationEmail, code });
      navigate("/library");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Verification failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resendCode() {
    setError("");
    setIsSubmitting(true);
    try {
      await api.resendVerification({ email: verificationEmail });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not resend code");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onGoogleLogin() {
    setError("");
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate("/library");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Google sign-in failed");
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <AuthPanel title="Create account" footer={<Link to="/login">Already have an account</Link>}>
      {verificationEmail ? (
        <form className="space-y-4" onSubmit={onVerify}>
          <p className="rounded-lg border border-[var(--line)] bg-[var(--accent-soft)] p-3 text-sm text-[var(--muted)]">
            Enter the 6-digit code sent to {verificationEmail}. {expiresAt ? `It expires at ${new Date(expiresAt).toLocaleTimeString()}.` : null}
          </p>
          <Field label="Verification code" value={code} onChange={setCode} inputMode="numeric" maxLength={6} />
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          <button className="btn btn-primary w-full" type="submit" disabled={isSubmitting || code.length !== 6}>
            {isSubmitting ? "Verifying..." : "Verify account"}
          </button>
          <button className="btn w-full" type="button" onClick={resendCode} disabled={isSubmitting}>
            Resend code
          </button>
        </form>
      ) : (
        <div>
          <div className="space-y-4">
            <GoogleSignInButton isLoading={isGoogleLoading} onClick={onGoogleLogin} />
            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
              <span className="h-px flex-1 bg-[var(--line)]" />
              or
              <span className="h-px flex-1 bg-[var(--line)]" />
            </div>
          </div>
          <form className="mt-4 space-y-4" onSubmit={onSubmit}>
            <Field label="Display name" value={displayName} onChange={setDisplayName} />
            <Field label="Email" value={email} onChange={setEmail} type="email" />
            <Field label="Password" value={password} onChange={setPassword} type="password" />
            {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
            <button className="btn btn-primary w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Register"}
            </button>
          </form>
        </div>
      )}
    </AuthPanel>
  );
}
