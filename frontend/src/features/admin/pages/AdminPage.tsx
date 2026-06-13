import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAdminToken, getAdminToken } from "@/api";
import { useAuth } from "@/features/auth/stores/auth.store";
import { AdminGate } from "../components/AdminGate";
import { AdminWorkspace } from "../components/AdminWorkspace";

export function AdminPage() {
  const [tokenVersion, setTokenVersion] = useState(0);
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const token = getAdminToken();

  if (isLoading) {
    return <div className="surface rounded-lg p-8 text-[var(--muted)]">Loading admin session...</div>;
  }

  if (user?.role === "ADMIN") {
    return <AdminWorkspace actionLabel="Back to app" onAction={() => navigate("/")} />;
  }

  if (user) {
    return (
      <section className="surface mx-auto max-w-xl rounded-lg p-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Admin console</p>
        <h1 className="text-3xl font-black">Admin role required</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">Your account is signed in, but it does not have admin access.</p>
      </section>
    );
  }

  if (!token) {
    return <AdminGate onTokenSaved={() => setTokenVersion((value) => value + 1)} />;
  }

  return (
    <AdminWorkspace
      key={tokenVersion}
      onAction={() => {
        clearAdminToken();
        setTokenVersion((value) => value + 1);
      }}
    />
  );
}
