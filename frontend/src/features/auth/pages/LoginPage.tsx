import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/stores/auth.store";
import { AuthPanel, Field } from "@/features/auth/components";

export { AuthPanel, Field } from "@/features/auth/components";

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
