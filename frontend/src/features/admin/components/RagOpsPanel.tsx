import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Database, FileText, MessageSquareText, RefreshCw, Search } from "lucide-react";
import { useState } from "react";
import { api } from "@/api";
import type { AdminRagDocumentRow } from "@/types";
import { AdminError, AdminForm, AdminLoading, AdminRows, DataRow, MetricBar, NumberInput, SearchBox, SmallTab, StatCard } from "./adminShared";

type SourceTypeFilter = "ALL" | "MANGA" | "CHAPTER";

export function RagOpsPanel() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ limit: 50, chapters: false });
  const [q, setQ] = useState("");
  const [sourceType, setSourceType] = useState<SourceTypeFilter>("ALL");

  const status = useQuery({ queryKey: ["admin", "rag", "status"], queryFn: api.admin.getRagStatus, retry: false });
  const documents = useQuery({
    queryKey: ["admin", "rag", "documents", q, sourceType],
    queryFn: () => api.admin.listRagDocuments({ q, sourceType: sourceType === "ALL" ? undefined : sourceType, limit: 25 }),
    retry: false
  });
  const reindex = useMutation({
    mutationFn: api.admin.reindexRag,
    onSuccess: (result) => {
      setMessage(`Indexed ${result.summary.created} created, ${result.summary.updated} updated, ${result.summary.skipped} skipped, ${result.summary.failed} failed in ${formatDuration(result.durationMs)}.`);
      void queryClient.invalidateQueries({ queryKey: ["admin", "rag"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
    }
  });

  if (status.isLoading) return <AdminLoading label="Loading RAG operations..." />;
  if (status.error) return <AdminError error={status.error} />;

  return (
    <section className="grid gap-5">
      <section className="admin-stat-grid">
        <StatCard label="Cached manga" value={status.data?.cached.manga ?? 0} icon={Database} tone="amber" />
        <StatCard label="Manga docs" value={status.data?.ragDocuments.manga ?? 0} icon={Bot} tone="green" />
        <StatCard label="Chapter docs" value={status.data?.ragDocuments.chapter ?? 0} icon={FileText} tone="pink" />
        <StatCard label="Chat messages" value={status.data?.chat.messages ?? 0} icon={MessageSquareText} tone="amber" />
      </section>

      <section className="admin-section-grid xl:grid-cols-[0.9fr_1.1fr]">
        <AdminForm title="RAG re-index" icon={RefreshCw} message={message} error={reindex.error} onSubmit={() => reindex.mutate(form)} busy={reindex.isPending} button="Run RAG index">
          <NumberInput label="Limit" value={form.limit} onChange={(limit) => setForm({ ...form, limit })} />
          <label className="chapter-filter">
            <input checked={form.chapters} onChange={(event) => setForm({ ...form, chapters: event.target.checked })} type="checkbox" />
            Include chapter docs
          </label>
          <div className="rounded-lg border border-[var(--line)] p-4 text-sm text-[var(--muted)]">
            <p>Latest index: {status.data?.ragDocuments.latestIndexedAt ? new Date(status.data.ragDocuments.latestIndexedAt).toLocaleString() : "None"}</p>
            <p>Embedding model: {status.data?.ragDocuments.embeddingModel ?? "None"}</p>
          </div>
        </AdminForm>

        <article className="admin-panel">
          <div className="admin-panel-heading">
            <Bot size={19} />
            <div>
              <strong>Coverage</strong>
              <small>Indexed RAG documents compared with cached catalog data</small>
            </div>
          </div>
          <div className="grid gap-4">
            <MetricBar label="Manga coverage" value={toPercent(status.data?.coverage.mangaIndexed ?? 0)} max={100} />
            <MetricBar label="Chapter coverage" value={toPercent(status.data?.coverage.chapterIndexed ?? 0)} max={100} />
            <MetricBar label="Active conversations" value={status.data?.chat.activeConversations ?? 0} max={Math.max(status.data?.chat.activeConversations ?? 0, status.data?.chat.messages ?? 0, 1)} />
          </div>
        </article>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <Search size={19} />
          <div>
            <strong>Document inspector</strong>
            <small>Search indexed rows without loading embeddings</small>
          </div>
        </div>
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <SearchBox value={q} onChange={setQ} placeholder="Search title, content, or source id..." />
          <div className="flex flex-wrap gap-2">
            <SmallTab active={sourceType === "ALL"} label="All" onClick={() => setSourceType("ALL")} />
            <SmallTab active={sourceType === "MANGA"} label="Manga" onClick={() => setSourceType("MANGA")} />
            <SmallTab active={sourceType === "CHAPTER"} label="Chapters" onClick={() => setSourceType("CHAPTER")} />
          </div>
        </div>
        {documents.isLoading ? <p className="text-sm text-[var(--muted)]">Loading documents...</p> : null}
        {documents.error ? <AdminError error={documents.error} /> : null}
        {!documents.isLoading && !documents.error ? <AdminRows rows={documents.data?.data ?? []} render={(document) => <RagDocumentRow key={document.id} document={document} />} /> : null}
      </section>
    </section>
  );
}

function RagDocumentRow({ document }: { document: AdminRagDocumentRow }) {
  return (
    <DataRow title={document.title} meta={`${document.sourceType} · ${document.sourceId} · ${document.indexedAt ? new Date(document.indexedAt).toLocaleString() : "not indexed"}`}>
      <span className="basis-full text-sm text-[var(--muted)]">{document.contentPreview}</span>
    </DataRow>
  );
}

function toPercent(value: number) {
  return Math.round(value * 100);
}

function formatDuration(durationMs: number) {
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(1)}s`;
}
