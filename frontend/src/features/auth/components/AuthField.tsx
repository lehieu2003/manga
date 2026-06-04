export function AuthField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-[var(--muted)]">{label}</span>
      <input className="control min-h-11 w-full rounded-lg px-3" type={type} value={value} onChange={(event) => onChange(event.target.value)} required />
    </label>
  );
}
