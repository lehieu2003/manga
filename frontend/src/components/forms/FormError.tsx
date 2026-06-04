export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-sm text-[var(--danger)]" role="alert">
      {message}
    </p>
  );
}
