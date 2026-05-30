import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Library, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, assetUrl } from "../lib/api";
import type { LibraryItem } from "../types";

const tabs: Array<{ label: string; value: "READING" | "FAVORITES" | "COMPLETED" | "PAUSED" }> = [
  { label: "Reading", value: "READING" },
  { label: "Favorites", value: "FAVORITES" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Paused", value: "PAUSED" }
];

export function LibraryPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]["value"]>("READING");
  const queryClient = useQueryClient();
  const library = useQuery({ queryKey: ["library"], queryFn: api.getLibrary });
  const updateLibrary = useMutation({
    mutationFn: ({ mangaId, input }: { mangaId: string; input: Partial<Pick<LibraryItem, "status" | "isFavorite">> }) => api.upsertLibrary(mangaId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["library"] })
  });
  const removeLibrary = useMutation({
    mutationFn: api.removeLibrary,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["library"] })
  });
  const items = useMemo(() => {
    const all = library.data?.data ?? [];
    if (tab === "FAVORITES") return all.filter((item) => item.isFavorite);
    return all.filter((item) => item.status === tab);
  }, [library.data?.data, tab]);

  if (library.isLoading) return <div className="surface rounded-lg p-6 text-[var(--muted)]">Loading library...</div>;

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Personal shelf</p>
        <h1 className="text-3xl font-black">Library</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button key={item.value} className={`btn min-h-9 text-sm ${tab === item.value ? "bg-[var(--surface-strong)] text-[var(--accent)]" : ""}`} onClick={() => setTab(item.value)}>
            {item.label}
          </button>
        ))}
      </div>
      {!library.data?.data.length ? (
        <div className="surface rounded-lg p-8 text-center">
          <Library className="mx-auto mb-3 text-[var(--accent)]" />
          <p className="text-[var(--muted)]">Follow a manga to start building your shelf.</p>
          <Link className="btn btn-primary mt-4" to="/search">
            Find manga
          </Link>
        </div>
      ) : !items.length ? (
        <div className="surface rounded-lg p-8 text-center text-[var(--muted)]">No manga in this shelf yet.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="surface grid grid-cols-[74px_1fr] gap-4 rounded-lg p-3">
              <Link to={`/manga/${item.mangaId}`} className="aspect-[2/3] overflow-hidden rounded-md bg-[#101418]">
                {item.manga?.coverUrl ? <img className="h-full w-full object-cover" src={assetUrl(item.manga.coverUrl)} alt={item.manga.title} /> : null}
              </Link>
              <div className="min-w-0 space-y-3">
                <div>
                  <Link to={`/manga/${item.mangaId}`} className="line-clamp-2 font-bold hover:text-[var(--accent)]">
                    {item.manga?.title ?? item.mangaId}
                  </Link>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {item.status} · {item.lastReadAt ? `Last read ${new Date(item.lastReadAt).toLocaleDateString()}` : "Not started"}
                  </p>
                  {item.readingProgress ? (
                    <Link className="mt-2 inline-block text-sm text-[var(--accent)]" to={`/read/${item.readingProgress.chapterId}?mangaId=${item.mangaId}`}>
                      Continue chapter · page {item.readingProgress.pageIndex + 1}
                    </Link>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn min-h-8 px-2 text-xs" onClick={() => updateLibrary.mutate({ mangaId: item.mangaId, input: { isFavorite: !item.isFavorite, status: item.status } })}>
                    <Heart size={14} fill={item.isFavorite ? "currentColor" : "none"} />
                    Favorite
                  </button>
                  <select
                    className="control min-h-8 rounded-md px-2 text-xs"
                    value={item.status}
                    onChange={(event) => updateLibrary.mutate({ mangaId: item.mangaId, input: { status: event.target.value as LibraryItem["status"], isFavorite: item.isFavorite } })}
                  >
                    <option value="READING">Reading</option>
                    <option value="PLAN_TO_READ">Plan</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="PAUSED">Paused</option>
                    <option value="DROPPED">Dropped</option>
                  </select>
                  <button className="btn min-h-8 px-2 text-xs text-[var(--danger)]" onClick={() => removeLibrary.mutate(item.mangaId)}>
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
