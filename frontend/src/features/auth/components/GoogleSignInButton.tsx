import { Chrome } from "lucide-react";

export function GoogleSignInButton({
  isLoading,
  onClick,
}: {
  isLoading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="btn w-full border-[var(--line)] bg-[var(--surface-soft)] font-bold"
      disabled={isLoading}
      onClick={onClick}
      type="button"
    >
      <Chrome size={18} />
      {isLoading ? "Connecting..." : "Continue with Google"}
    </button>
  );
}
