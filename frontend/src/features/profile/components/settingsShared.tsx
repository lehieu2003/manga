export function PasswordField({ label, value, onChange, autoComplete, minLength }: { label: string; value: string; onChange: (value: string) => void; autoComplete: string; minLength?: number }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-[var(--muted)]">{label}</span>
      <input className="control min-h-11 w-full rounded-lg px-3" value={value} onChange={(event) => onChange(event.target.value)} type="password" minLength={minLength} autoComplete={autoComplete} required />
    </label>
  );
}

export function FormMessage({ error, status }: { error: string; status: string }) {
  if (!error && !status) return null;
  return <p className={`mt-4 rounded-lg border px-3 py-2 text-sm ${error ? "border-[rgba(255,122,168,0.58)] text-[var(--danger)]" : "border-[rgba(255,184,107,0.58)] text-[var(--accent)]"}`}>{error || status}</p>;
}
