import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, Database, RefreshCw } from "lucide-react";
import { useState } from "react";
import { api } from "@/api";
import { AdminForm, NumberInput, TextInput } from "./adminShared";

export function CatalogOpsPanel() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const sync = useMutation({
    mutationFn: api.admin.syncCatalog,
    onSuccess: (result) => {
      setMessage(`Synced ${result.summary.mangaCount} manga. Cached total: ${result.summary.cachedTotal}.`);
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    }
  });
  const importManga = useMutation({ mutationFn: api.admin.importManga, onSuccess: (result) => setMessage(importSummary(result.summary)) });
  const importChapters = useMutation({ mutationFn: api.admin.importChapters, onSuccess: (result) => setMessage(importSummary(result.summary)) });

  const [syncForm, setSyncForm] = useState({ q: "", limit: 12, languages: "vi,en", includeChapters: false, chaptersLimit: 32 });
  const [mangaForm, setMangaForm] = useState({ mangaId: "", includeChapters: true, languages: "vi,en", chaptersLimit: 100 });
  const [chaptersForm, setChaptersForm] = useState({ mangaId: "", languages: "vi,en", limit: 100, offset: 0 });

  return (
    <section className="admin-section-grid xl:grid-cols-3">
      <AdminForm title="Catalog sync" icon={RefreshCw} message={message} error={sync.error} onSubmit={() => sync.mutate(syncForm)} busy={sync.isPending} button="Run sync">
        <TextInput label="Query" value={syncForm.q} onChange={(q) => setSyncForm({ ...syncForm, q })} />
        <NumberInput label="Limit" value={syncForm.limit} onChange={(limit) => setSyncForm({ ...syncForm, limit })} />
        <TextInput label="Languages" value={syncForm.languages} onChange={(languages) => setSyncForm({ ...syncForm, languages })} />
        <NumberInput label="Chapters limit" value={syncForm.chaptersLimit} onChange={(chaptersLimit) => setSyncForm({ ...syncForm, chaptersLimit })} />
        <label className="chapter-filter">
          <input checked={syncForm.includeChapters} onChange={(event) => setSyncForm({ ...syncForm, includeChapters: event.target.checked })} type="checkbox" />
          Include chapters
        </label>
      </AdminForm>

      <AdminForm title="Import manga" icon={Database} message={message} error={importManga.error} onSubmit={() => importManga.mutate(mangaForm)} busy={importManga.isPending} button="Import manga">
        <TextInput label="Manga ID" value={mangaForm.mangaId} onChange={(mangaId) => setMangaForm({ ...mangaForm, mangaId })} required />
        <TextInput label="Languages" value={mangaForm.languages} onChange={(languages) => setMangaForm({ ...mangaForm, languages })} />
        <NumberInput label="Chapters limit" value={mangaForm.chaptersLimit} onChange={(chaptersLimit) => setMangaForm({ ...mangaForm, chaptersLimit })} />
        <label className="chapter-filter">
          <input checked={mangaForm.includeChapters} onChange={(event) => setMangaForm({ ...mangaForm, includeChapters: event.target.checked })} type="checkbox" />
          Include chapters
        </label>
      </AdminForm>

      <AdminForm title="Import chapters" icon={Archive} message={message} error={importChapters.error} onSubmit={() => importChapters.mutate(chaptersForm)} busy={importChapters.isPending} button="Import chapters">
        <TextInput label="Manga ID" value={chaptersForm.mangaId} onChange={(mangaId) => setChaptersForm({ ...chaptersForm, mangaId })} required />
        <TextInput label="Languages" value={chaptersForm.languages} onChange={(languages) => setChaptersForm({ ...chaptersForm, languages })} />
        <NumberInput label="Limit" value={chaptersForm.limit} onChange={(limit) => setChaptersForm({ ...chaptersForm, limit })} />
        <NumberInput label="Offset" value={chaptersForm.offset} onChange={(offset) => setChaptersForm({ ...chaptersForm, offset })} />
      </AdminForm>
    </section>
  );
}

function importSummary(summary: { mangaId: string; chaptersFetched: number; readableChaptersSaved: number; zeroPageChaptersSkipped: number }) {
  return `${summary.mangaId}: ${summary.readableChaptersSaved}/${summary.chaptersFetched} readable chapters saved, ${summary.zeroPageChaptersSkipped} skipped.`;
}
