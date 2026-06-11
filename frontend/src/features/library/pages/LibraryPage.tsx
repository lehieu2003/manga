import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Library } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api";
import type { LibraryItem } from "@/types";
import { LibraryControls, LibraryTabs } from "../components/LibraryControls";
import { LibraryItemCard } from "../components/LibraryItemCard";
import { filterLibraryItems, sortLibraryItems } from "../library.logic";
import type { LibrarySortMode, LibraryTab } from "../library.types";

export function LibraryPage() {
  const [tab, setTab] = useState<LibraryTab>("READING");
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<LibrarySortMode>("lastRead");
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
    const tabbed = tab === "FAVORITES" ? all.filter((item) => item.isFavorite) : all.filter((item) => item.status === tab);
    return sortLibraryItems(filterLibraryItems(tabbed, query), sortMode);
  }, [library.data?.data, query, sortMode, tab]);
  const hasActiveFilters = query.trim().length > 0 || sortMode !== "lastRead";
  const clearFilters = () => {
    setQuery("");
    setSortMode("lastRead");
  };

  if (library.isLoading) return <div className="surface rounded-lg p-6 text-[var(--muted)]">Loading library...</div>;

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Personal shelf</p>
        <h1 className="text-3xl font-black">Library</h1>
      </div>
      <LibraryTabs tab={tab} onTabChange={setTab} />
      <LibraryControls tab={tab} query={query} sortMode={sortMode} shownCount={items.length} hasActiveFilters={hasActiveFilters} onQueryChange={setQuery} onSortModeChange={setSortMode} onClearFilters={clearFilters} />
      {!library.data?.data.length ? (
        <div className="surface rounded-lg p-8 text-center">
          <Library className="mx-auto mb-3 text-[var(--accent)]" />
          <p className="text-[var(--muted)]">Follow a manga to start building your shelf.</p>
          <Link className="btn btn-primary mt-4" to="/search">
            Find manga
          </Link>
        </div>
      ) : !items.length ? (
        <div className="surface rounded-lg p-8 text-center text-[var(--muted)]">No manga matches this shelf view.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <LibraryItemCard key={item.id} item={item} onUpdate={(mangaId, input) => updateLibrary.mutate({ mangaId, input })} onRemove={(mangaId) => removeLibrary.mutate(mangaId)} />
          ))}
        </div>
      )}
    </div>
  );
}
