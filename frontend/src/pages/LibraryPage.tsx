import { useQuery } from "@tanstack/react-query";
import { Library } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

export function LibraryPage() {
  const library = useQuery({ queryKey: ["library"], queryFn: api.getLibrary });

  if (library.isLoading) return <div className="surface rounded-lg p-6 text-[var(--muted)]">Loading library...</div>;

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Personal shelf</p>
        <h1 className="text-3xl font-black">Library</h1>
      </div>
      {!library.data?.data.length ? (
        <div className="surface rounded-lg p-8 text-center">
          <Library className="mx-auto mb-3 text-[var(--accent)]" />
          <p className="text-[var(--muted)]">Follow a manga to start building your shelf.</p>
          <Link className="btn btn-primary mt-4" to="/search">
            Find manga
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {library.data.data.map((item) => (
            <Link key={item.id} to={`/manga/${item.mangaId}`} className="surface flex items-center justify-between rounded-lg p-4 hover:border-[var(--accent)]">
              <span>
                <span className="block font-bold">{item.mangaId}</span>
                <span className="text-sm text-[var(--muted)]">{item.status}</span>
              </span>
              <span className="text-xs text-[var(--muted)]">{item.lastReadAt ? new Date(item.lastReadAt).toLocaleDateString() : "Not started"}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
