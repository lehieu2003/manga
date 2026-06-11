import { KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { setAdminToken } from "@/api";

export function AdminGate({ onTokenSaved }: { onTokenSaved: () => void }) {
  const [token, setToken] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!token.trim()) return;
    setAdminToken(token.trim());
    onTokenSaved();
  };

  return (
    <section className="mx-auto grid max-w-xl gap-5">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Admin console</p>
        <h1 className="text-3xl font-black">Operator access</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Enter the admin token for this browser session.</p>
      </div>
      <form className="surface rounded-lg p-5" onSubmit={submit}>
        <label>
          <span className="mb-2 block text-sm font-bold text-[var(--muted)]">Admin token</span>
          <input className="control min-h-11 w-full rounded-lg px-3" value={token} onChange={(event) => setToken(event.target.value)} type="password" autoComplete="off" />
        </label>
        <button className="btn btn-primary mt-5" type="submit">
          <KeyRound size={17} />
          Unlock admin
        </button>
      </form>
    </section>
  );
}
