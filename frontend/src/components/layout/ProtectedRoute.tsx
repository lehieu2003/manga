import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/stores/auth.store";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="surface rounded-lg p-6 text-[var(--muted)]">Loading session...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
