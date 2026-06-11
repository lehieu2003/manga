import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import { useState } from "react";
import { api } from "@/api";
import type { AdminSearchHistoryRow, AdminUser, AdminUserLibraryRow, AdminUserProgressRow } from "@/types";
import type { UserTab } from "../admin.types";
import { AdminError, AdminForm, AdminLoading, AdminRows, DangerButton, DataRow, SearchBox, SmallTab, TextInput } from "./adminShared";

const libraryStatuses = ["READING", "PLAN_TO_READ", "COMPLETED", "PAUSED", "DROPPED"] as const;

export function UsersPanel() {
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const users = useQuery({ queryKey: ["admin", "users", query], queryFn: () => api.admin.listUsers({ query, limit: 25 }), retry: false });
  const rows = users.data?.data ?? [];

  return (
    <section className="admin-split-grid admin-user-grid">
      <div className="admin-panel">
        <SearchBox value={query} onChange={setQuery} placeholder="Search users..." />
        <div className="mt-4 grid gap-2">
          {rows.map((user) => (
            <button key={user.id} className={`w-full rounded-lg border p-3 text-left ${selectedUserId === user.id ? "border-[var(--accent)] bg-[var(--accent-tint)]" : "border-[var(--line)] bg-[var(--accent-panel)]"}`} onClick={() => setSelectedUserId(user.id)} type="button">
              <span className="block font-bold">{user.displayName}</span>
              <span className="block text-sm text-[var(--muted)]">{user.email}</span>
            </button>
          ))}
        </div>
      </div>
      {selectedUserId ? <UserDetail userId={selectedUserId} /> : <div className="admin-panel text-sm text-[var(--muted)]">Select a user to manage profile, sessions, library, progress, and search history.</div>}
    </section>
  );
}

function UserDetail({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<UserTab>("profile");
  const user = useQuery({ queryKey: ["admin", "user", userId], queryFn: () => api.admin.getUser(userId), retry: false });
  const revoke = useMutation({ mutationFn: () => api.admin.revokeUserSessions(userId), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "user", userId] }) });
  const remove = useMutation({ mutationFn: () => api.admin.deleteUser(userId), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "users"] }) });

  if (user.isLoading) return <AdminLoading label="Loading user..." />;
  if (!user.data?.user) return <AdminError error={user.error ?? new Error("User not found")} />;

  const current = user.data.user;
  return (
    <div className="admin-panel">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">{current.displayName}</h2>
          <p className="text-sm text-[var(--muted)]">{current.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={() => window.confirm("Revoke all active sessions?") && revoke.mutate()} type="button">
            Revoke sessions
          </button>
          <DangerButton label="Delete user" confirmText={current.email} onConfirm={() => remove.mutate()} />
        </div>
      </div>
      <nav className="mb-4 flex flex-wrap gap-2">
        <SmallTab active={tab === "profile"} label="Profile" onClick={() => setTab("profile")} />
        <SmallTab active={tab === "library"} label="Library" onClick={() => setTab("library")} />
        <SmallTab active={tab === "progress"} label="Progress" onClick={() => setTab("progress")} />
        <SmallTab active={tab === "history"} label="Search History" onClick={() => setTab("history")} />
      </nav>
      {tab === "profile" ? <UserProfileForm user={current} /> : null}
      {tab === "library" ? <UserLibrary userId={userId} /> : null}
      {tab === "progress" ? <UserProgress userId={userId} /> : null}
      {tab === "history" ? <UserHistory userId={userId} /> : null}
    </div>
  );
}

function UserProfileForm({ user }: { user: AdminUser }) {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const update = useMutation({ mutationFn: () => api.admin.updateUser(user.id, { displayName, avatarUrl: avatarUrl.trim() || null }), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "user", user.id] }) });
  return (
    <AdminForm title="Profile" icon={UserRound} error={update.error} message={update.isSuccess ? "Profile saved." : ""} onSubmit={() => update.mutate()} busy={update.isPending} button="Save profile">
      <TextInput label="Display name" value={displayName} onChange={setDisplayName} required />
      <TextInput label="Avatar URL" value={avatarUrl} onChange={setAvatarUrl} />
    </AdminForm>
  );
}

function UserLibrary({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const library = useQuery({ queryKey: ["admin", "user", userId, "library"], queryFn: () => api.admin.listUserLibrary(userId), retry: false });
  const update = useMutation({ mutationFn: ({ item, status }: { item: AdminUserLibraryRow; status: string }) => api.admin.updateUserLibrary(userId, item.mangaId, { status }), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "user", userId, "library"] }) });
  const remove = useMutation({ mutationFn: (mangaId: string) => api.admin.deleteUserLibrary(userId, mangaId), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "user", userId, "library"] }) });
  return (
    <AdminRows
      rows={library.data?.data ?? []}
      render={(item) => (
        <DataRow key={item.id} title={item.manga?.title ?? item.mangaId} meta={`${item.status} · favorite: ${item.isFavorite ? "yes" : "no"}`}>
          <select className="control min-h-10 rounded-lg px-2" value={item.status} onChange={(event) => update.mutate({ item, status: event.target.value })} aria-label="Library status">
            {libraryStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <DangerButton label="Remove" confirmText={item.mangaId} onConfirm={() => remove.mutate(item.mangaId)} compact />
        </DataRow>
      )}
    />
  );
}

function UserProgress({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const progress = useQuery({ queryKey: ["admin", "user", userId, "progress"], queryFn: () => api.admin.listUserProgress(userId), retry: false });
  const remove = useMutation({ mutationFn: (chapterId: string) => api.admin.deleteUserProgress(userId, chapterId), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "user", userId, "progress"] }) });
  return (
    <AdminRows
      rows={progress.data?.data ?? []}
      render={(item: AdminUserProgressRow) => (
        <DataRow key={item.id} title={item.manga?.title ?? item.mangaId} meta={`Chapter ${item.chapter?.chapter ?? item.chapterId} · page ${item.pageIndex + 1} · ${item.completed ? "completed" : "in progress"}`}>
          <DangerButton label="Remove" confirmText={item.chapterId} onConfirm={() => remove.mutate(item.chapterId)} compact />
        </DataRow>
      )}
    />
  );
}

function UserHistory({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const history = useQuery({ queryKey: ["admin", "user", userId, "history"], queryFn: () => api.admin.listUserSearchHistory(userId), retry: false });
  const clear = useMutation({ mutationFn: () => api.admin.clearUserSearchHistory(userId), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "user", userId, "history"] }) });
  return (
    <div className="grid gap-3">
      <div className="flex justify-end">
        <DangerButton label="Clear history" confirmText={userId} onConfirm={() => clear.mutate()} />
      </div>
      <AdminRows rows={history.data?.data ?? []} render={(item: AdminSearchHistoryRow) => <DataRow key={item.id} title={item.query} meta={new Date(item.createdAt).toLocaleString()} />} />
    </div>
  );
}
