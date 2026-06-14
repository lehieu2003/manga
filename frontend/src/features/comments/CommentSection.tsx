import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Laugh, MessageCircle, Pencil, Send, ShieldAlert, Smile, ThumbsUp, Trash2, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "@/api";
import type { CommentItem, CommentReactionType, CommentTargetType, User } from "@/types";

const reactions: Array<{ type: CommentReactionType; label: string; icon: typeof ThumbsUp }> = [
  { type: "LIKE", label: "Like", icon: ThumbsUp },
  { type: "HEART", label: "Heart", icon: Heart },
  { type: "SAD", label: "Sad", icon: ShieldAlert },
  { type: "LAUGH", label: "Laugh", icon: Laugh },
  { type: "ANGRY", label: "Angry", icon: Smile }
];

export function CommentSection({ targetType, targetId, user, compact = false }: { targetType: CommentTargetType; targetId: string; user: User | null; compact?: boolean }) {
  return (
    <section className={`surface rounded-lg ${compact ? "p-4" : "p-5"}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent)]">{targetType === "MANGA" ? "Manga comments" : "Chapter comments"}</p>
          <h2 className="mt-1 text-xl font-black text-[var(--text)]">Reader discussion</h2>
        </div>
        <span className="rounded-md border border-[var(--line)] bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-bold text-[var(--muted)]">Newest first</span>
      </div>
      <CommentComposer targetType={targetType} targetId={targetId} user={user} />
      <CommentList targetType={targetType} targetId={targetId} user={user} />
    </section>
  );
}

function CommentList({ targetType, targetId, parentId, user, depth = 0 }: { targetType: CommentTargetType; targetId: string; parentId?: string; user: User | null; depth?: number }) {
  const query = useInfiniteQuery({
    queryKey: ["comments", targetType, targetId, parentId ?? "root"],
    queryFn: ({ pageParam }) => api.listComments({ targetType, targetId, parentId, cursor: pageParam, limit: parentId ? 10 : 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined
  });
  const comments = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data]);

  if (query.isLoading) return <div className="rounded-lg border border-[var(--line)] p-4 text-sm text-[var(--muted)]">Loading comments...</div>;
  if (query.isError) return <div className="rounded-lg border border-[var(--danger)] p-4 text-sm text-[var(--danger)]">Could not load comments.</div>;
  if (!comments.length && !parentId) return <div className="rounded-lg border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">No comments yet. Start the discussion.</div>;

  return (
    <div className={parentId ? "mt-3 space-y-3" : "mt-5 space-y-4"}>
      {comments.map((comment) => (
        <CommentCard key={comment.id} comment={comment} targetType={targetType} targetId={targetId} user={user} depth={depth} />
      ))}
      {query.hasNextPage ? (
        <button className="btn min-h-9 text-sm" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage} type="button">
          {query.isFetchingNextPage ? "Loading..." : parentId ? "More replies" : "More comments"}
        </button>
      ) : null}
    </div>
  );
}

function CommentCard({ comment, targetType, targetId, user, depth }: { comment: CommentItem; targetType: CommentTargetType; targetId: string; user: User | null; depth: number }) {
  const queryClient = useQueryClient();
  const [showReplies, setShowReplies] = useState(false);
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const canEdit = user?.id === comment.author?.id && comment.status === "VISIBLE";
  const canDelete = (user?.id === comment.author?.id || user?.role === "ADMIN") && comment.status === "VISIBLE";
  const visible = comment.status === "VISIBLE";
  const indent = Math.min(depth, 5) * 18;
  const statusLabel = comment.status === "DELETED" ? "Comment deleted" : comment.status === "HIDDEN" ? "Comment hidden by moderation" : "";
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["comments", targetType, targetId] });
  };
  const remove = useMutation({ mutationFn: () => api.deleteComment(comment.id), onSuccess: invalidate });
  const reaction = useMutation<unknown, Error, CommentReactionType | null>({
    mutationFn: (type) => (type && type !== comment.currentUserReaction ? api.setCommentReaction(comment.id, type) : api.removeCommentReaction(comment.id)),
    onSuccess: invalidate
  });

  return (
    <article className="rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-3" style={{ marginLeft: indent }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm text-[var(--text)]">{comment.author?.displayName ?? "Unknown reader"}</strong>
            {depth > 5 ? <span className="text-xs text-[var(--muted)]">replying in a deep thread</span> : null}
            <time className="text-xs text-[var(--muted)]">{new Date(comment.createdAt).toLocaleDateString()}</time>
          </div>
        </div>
        {canDelete ? (
          <button className="btn min-h-8 px-2 text-xs" onClick={() => remove.mutate()} disabled={remove.isPending} title={user?.role === "ADMIN" && user.id !== comment.author?.id ? "Hide comment" : "Delete comment"} type="button">
            <Trash2 size={14} />
          </button>
        ) : null}
      </div>

      {editing ? (
        <CommentComposer targetType={targetType} targetId={targetId} user={user} editingComment={comment} onDone={() => setEditing(false)} />
      ) : (
        <div className="mt-3">
          {!visible ? (
            <p className="rounded-md border border-dashed border-[var(--line)] p-3 text-sm text-[var(--muted)]">{statusLabel}</p>
          ) : comment.isSpoiler && !revealed ? (
            <button className="w-full rounded-md border border-[var(--line)] bg-[var(--accent-soft)] p-3 text-left text-sm font-bold text-[var(--accent-strong)]" onClick={() => setRevealed(true)} type="button">
              Spoiler hidden. Click to reveal.
            </button>
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[var(--text)]">{comment.content}</p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {reactions.map((item) => {
          const Icon = item.icon;
          const active = comment.currentUserReaction === item.type;
          return (
            <button
              key={item.type}
              className={`btn min-h-8 px-2 text-xs ${active ? "border-[var(--accent)] bg-[var(--accent-tint)] text-[var(--accent-strong)]" : ""}`}
              onClick={() => reaction.mutate(item.type)}
              disabled={!user || reaction.isPending || !visible}
              title={user ? item.label : "Login to react"}
              type="button"
            >
              <Icon size={14} />
              <span>{comment.reactionCounts[item.type] ?? 0}</span>
            </button>
          );
        })}
        <button className="btn min-h-8 px-2 text-xs" onClick={() => setReplying((value) => !value)} disabled={!user || !visible} title={user ? "Reply" : "Login to reply"} type="button">
          <MessageCircle size={14} />
          Reply
        </button>
        {canEdit ? (
          <button className="btn min-h-8 px-2 text-xs" onClick={() => setEditing((value) => !value)} type="button">
            {editing ? <Undo2 size={14} /> : <Pencil size={14} />}
            {editing ? "Cancel" : "Edit"}
          </button>
        ) : null}
        {comment.replyCount ? (
          <button className="btn min-h-8 px-2 text-xs" onClick={() => setShowReplies((value) => !value)} type="button">
            {showReplies ? "Hide replies" : `${comment.replyCount} replies`}
          </button>
        ) : null}
      </div>

      {replying ? <CommentComposer targetType={targetType} targetId={targetId} parentId={comment.id} user={user} onDone={() => setReplying(false)} /> : null}
      {showReplies ? <CommentList targetType={targetType} targetId={targetId} parentId={comment.id} user={user} depth={depth + 1} /> : null}
    </article>
  );
}

function CommentComposer({
  targetType,
  targetId,
  parentId,
  user,
  editingComment,
  onDone
}: {
  targetType: CommentTargetType;
  targetId: string;
  parentId?: string;
  user: User | null;
  editingComment?: CommentItem;
  onDone?: () => void;
}) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState(editingComment?.content ?? "");
  const [isSpoiler, setIsSpoiler] = useState(editingComment?.isSpoiler ?? false);
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["comments", targetType, targetId] });
  };
  const create = useMutation({
    mutationFn: () =>
      editingComment
        ? api.updateComment(editingComment.id, { content, isSpoiler })
        : api.createComment({ targetType, targetId, parentId, content, isSpoiler }),
    onSuccess: async () => {
      setContent("");
      setIsSpoiler(false);
      await invalidate();
      onDone?.();
    }
  });

  if (!user) return <div className="rounded-lg border border-[var(--line)] bg-[var(--accent-soft)] p-3 text-sm text-[var(--muted)]">Login to join the discussion.</div>;

  return (
    <form
      className="mt-3 grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (content.trim()) create.mutate();
      }}
    >
      <textarea className="control min-h-24 resize-y rounded-lg px-3 py-2 text-sm" value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} placeholder={parentId ? "Write a reply..." : "Share a thought for other readers..."} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)]">
          <input type="checkbox" checked={isSpoiler} onChange={(event) => setIsSpoiler(event.target.checked)} />
          Spoiler
        </label>
        <button className="btn btn-primary min-h-9 text-sm" disabled={create.isPending || !content.trim()} type="submit">
          <Send size={15} />
          {editingComment ? "Save" : parentId ? "Reply" : "Comment"}
        </button>
      </div>
    </form>
  );
}
