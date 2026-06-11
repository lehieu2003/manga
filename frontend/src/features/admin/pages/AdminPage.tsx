import { useState } from "react";
import { clearAdminToken, getAdminToken } from "@/api";
import { AdminGate } from "../components/AdminGate";
import { AdminWorkspace } from "../components/AdminWorkspace";

export function AdminPage() {
  const [tokenVersion, setTokenVersion] = useState(0);
  const token = getAdminToken();

  if (!token) {
    return <AdminGate onTokenSaved={() => setTokenVersion((value) => value + 1)} />;
  }

  return (
    <AdminWorkspace
      key={tokenVersion}
      onClearToken={() => {
        clearAdminToken();
        setTokenVersion((value) => value + 1);
      }}
    />
  );
}
