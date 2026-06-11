import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/api";
import { CacheRow, DangerButton, SearchBox } from "./adminShared";

export function CachePanel() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const cache = useQuery({ queryKey: ["admin", "cache", query], queryFn: () => api.admin.listCachedManga({ query, limit: 25 }), retry: false });
  const detail = useQuery({ queryKey: ["admin", "cache-detail", selectedId], queryFn: () => api.admin.getCachedManga(selectedId), enabled: Boolean(selectedId), retry: false });
  const deleteManga = useMutation({ mutationFn: api.admin.deleteCachedManga, onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "cache"] }) });
  const deleteChapters = useMutation({ mutationFn: api.admin.deleteCachedChapters, onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "cache"] }) });

  const rows = cache.data?.data ?? [];
  return (
    <section className="admin-split-grid">
      <div className="admin-panel">
        <SearchBox value={query} onChange={setQuery} placeholder="Search cached manga..." />
        <div className="mt-4 grid gap-2">
          {rows.map((manga) => (
            <CacheRow key={manga.id} manga={manga} selected={selectedId === manga.id} onSelect={() => setSelectedId(manga.id)} />
          ))}
        </div>
      </div>
      <aside className="admin-panel">
        {detail.data?.manga ? (
          <div className="grid gap-3">
            <h2 className="text-xl font-black">{detail.data.manga.title}</h2>
            <p className="text-sm text-[var(--muted)]">{detail.data.manga.chapterCount} cached chapters</p>
            <DangerButton label="Delete chapters" onConfirm={() => deleteChapters.mutate(detail.data.manga!.id)} confirmText={detail.data.manga.id} />
            <DangerButton label="Delete manga cache" onConfirm={() => deleteManga.mutate(detail.data.manga!.id)} confirmText={detail.data.manga.id} />
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">Select cached manga to inspect or delete cache rows.</p>
        )}
      </aside>
    </section>
  );
}
