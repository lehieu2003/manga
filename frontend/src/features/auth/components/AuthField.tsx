export function AuthField({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  maxLength
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-[var(--muted)]">{label}</span>
      <input className="control min-h-11 w-full rounded-lg px-3" type={type} value={value} onChange={(event) => onChange(event.target.value)} inputMode={inputMode} maxLength={maxLength} required />
    </label>
  );
}
import type { HTMLAttributes } from "react";
