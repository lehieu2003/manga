import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../state/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await login({ email, password });
      navigate("/library");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login failed");
    }
  }

  return (
    <AuthPanel title="Welcome back" footer={<Link to="/register">Create an account</Link>}>
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="Email" value={email} onChange={setEmail} type="email" />
        <Field label="Password" value={password} onChange={setPassword} type="password" />
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        <button className="btn btn-primary w-full" type="submit">
          Login
        </button>
      </form>
    </AuthPanel>
  );
}

export function AuthPanel({ title, children, footer }: { title: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md">
      <section className="surface rounded-lg p-6">
        <h1 className="mb-6 text-3xl font-black">{title}</h1>
        {children}
        <div className="mt-5 text-center text-sm text-[var(--accent)]">{footer}</div>
      </section>
    </div>
  );
}

export function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-[var(--muted)]">{label}</span>
      <input className="control min-h-11 w-full rounded-lg px-3" type={type} value={value} onChange={(event) => onChange(event.target.value)} required />
    </label>
  );
}
