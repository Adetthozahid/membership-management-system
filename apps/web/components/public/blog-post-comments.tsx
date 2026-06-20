"use client";

import { useEffect, useMemo, useState } from "react";
import type { BlogPostCommentSummary } from "@mms/shared";
import { apiRequest, fetchCurrentUser } from "@/lib/auth-client";
import Link from "next/link";

interface CommentNode extends BlogPostCommentSummary {
  replies: CommentNode[];
}

function formatCommentDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function AuthorAvatar({ comment }: { comment: BlogPostCommentSummary }) {
  const avatar = (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-xs font-bold text-primary">
      {comment.authorPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={comment.authorPhoto} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(comment.authorName)
      )}
    </span>
  );

  if (!comment.authorProfileUrl) return avatar;
  return (
    <Link href={comment.authorProfileUrl} className="rounded-full outline-none ring-primary focus-visible:ring-2" aria-label={`${comment.authorName} profile`}>
      {avatar}
    </Link>
  );
}

function AuthorName({ comment }: { comment: BlogPostCommentSummary }) {
  if (!comment.authorProfileUrl) return <strong>{comment.authorName}</strong>;
  return (
    <Link href={comment.authorProfileUrl} className="font-semibold hover:text-primary hover:underline">
      {comment.authorName}
    </Link>
  );
}

function CommentHeader({ comment }: { comment: BlogPostCommentSummary }) {
  return (
    <div className="flex items-start gap-3">
      <AuthorAvatar comment={comment} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <AuthorName comment={comment} />
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {comment.authorRole}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{formatCommentDate(comment.createdAt)}</span>
      </div>
    </div>
  );
}

function buildCommentTree(comments: BlogPostCommentSummary[]) {
  const sorted = [...comments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const nodes = new Map<string, CommentNode>();
  for (const comment of sorted) {
    nodes.set(comment.id, { ...comment, replies: [] });
  }

  const roots: CommentNode[] = [];
  for (const comment of sorted) {
    const node = nodes.get(comment.id);
    if (!node) continue;
    const parent = comment.parentId ? nodes.get(comment.parentId) : null;
    if (parent) {
      parent.replies.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export function BlogPostComments({
  slug,
  initialComments,
}: {
  slug: string;
  initialComments: BlogPostCommentSummary[];
}) {
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [managingId, setManagingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ id: string; action: "hide" | "delete" } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSubmitting = status === "submitting";
  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

  useEffect(() => {
    let cancelled = false;
    fetchCurrentUser()
      .then(({ user }) => {
        if (!cancelled) setCurrentUserId(user.id);
      })
      .catch(() => {
        if (!cancelled) setCurrentUserId(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function removeCommentFromList(id: string) {
    setComments((current) => current.filter((comment) => comment.id !== id && comment.parentId !== id));
    if (replyingTo === id) setReplyingTo(null);
  }

  async function manageComment(id: string, action: "hide" | "delete") {
    setManagingId(id);
    setError(null);
    setMessage(null);
    try {
      await apiRequest<{ success: true }>(`/public/smritir-pata/comments/${encodeURIComponent(id)}/${action}`, {
        method: "POST",
      });
      removeCommentFromList(id);
      setMessage(action === "hide" ? "Comment hidden." : "Comment deleted.");
    } catch (manageError) {
      setError(manageError instanceof Error ? manageError.message : "Comment could not be updated.");
    } finally {
      setManagingId(null);
      setPendingAction(null);
    }
  }

  async function submitComment(parentId?: string) {
    const isReply = Boolean(parentId);
    const comment = (isReply ? replyBody : body).trim();
    if (!comment) {
      setError(isReply ? "Please write a reply first." : "Please write a comment first.");
      return;
    }

    setStatus("submitting");
    setError(null);
    setMessage(null);
    try {
      const { user } = await fetchCurrentUser();
      const isAdmin = user.roles.includes("admin") || user.roles.includes("super-admin") || user.permissions.includes("admin:access");
      const isMember = user.permissions.includes("member:access");
      if (!isAdmin && !isMember) {
        throw new Error("Only members and admins can comment.");
      }
      const saved = await apiRequest<BlogPostCommentSummary>(`/public/smritir-pata/${encodeURIComponent(slug)}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: comment, parentId }),
      });
      setComments((current) => [...current, saved]);
      if (isReply) {
        setReplyBody("");
        setReplyingTo(null);
      } else {
        setBody("");
      }
      setMessage(isReply ? "Reply published." : "Comment published.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Comment could not be published.");
    } finally {
      setStatus("idle");
    }
  }

  function renderComment(comment: CommentNode, depth = 0) {
    const isOwner = Boolean(currentUserId && comment.authorUserId === currentUserId);
    return (
      <article key={comment.id} className={depth ? "rounded-md border bg-card p-3" : "rounded-md border bg-background p-4"}>
        <CommentHeader comment={comment} />
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{comment.body}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => {
              setReplyingTo((current) => (current === comment.id ? null : comment.id));
              setReplyBody("");
              setError(null);
              setMessage(null);
            }}
          >
            {replyingTo === comment.id ? "Cancel reply" : "Reply"}
          </button>
          {isOwner ? (
            <>
              <button
                type="button"
                className="font-medium text-muted-foreground hover:text-primary hover:underline disabled:opacity-60"
                      onClick={() => setPendingAction({ id: comment.id, action: "hide" })}
                      disabled={managingId === comment.id}
              >
                Hide
              </button>
              <button
                type="button"
                className="font-medium text-red-600 hover:underline disabled:opacity-60"
                      onClick={() => setPendingAction({ id: comment.id, action: "delete" })}
                disabled={managingId === comment.id}
              >
                Delete
              </button>
            </>
          ) : null}
        </div>
        {replyingTo === comment.id ? (
          <div className="mt-3 grid gap-2 border-l-2 border-primary/30 pl-3">
            <textarea
              className="min-h-24 rounded-md border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder={`Reply to ${comment.authorName}`}
              value={replyBody}
              maxLength={1500}
              onChange={(event) => setReplyBody(event.target.value)}
            />
            <button
              type="button"
              className="w-fit rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void submitComment(comment.id)}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Publishing..." : "Submit Reply"}
            </button>
          </div>
        ) : null}
        {comment.replies.length ? (
          <div className="mt-4 space-y-3 border-l-2 border-border pl-4">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <section className="rounded-md border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Comments</h2>
        <p className="text-sm text-muted-foreground">{comments.length} published</p>
      </div>

      <div className="mt-4 space-y-3">
        {commentTree.length ? (
          commentTree.map((comment) => renderComment(comment))
        ) : (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No comments yet.
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-3">
        <textarea
          className="min-h-28 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          placeholder="Write a comment"
          value={body}
          maxLength={1500}
          onChange={(event) => setBody(event.target.value)}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Only logged-in members and admins can publish comments and replies.{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Member login
            </Link>{" "}
            or{" "}
            <Link href="/admin/login" className="font-medium text-primary hover:underline">
              admin login
            </Link>
          </p>
          <button
            type="button"
            className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void submitComment()}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Publishing..." : "Submit Comment"}
          </button>
        </div>
        {message ? <p className="text-sm font-medium text-green-700">{message}</p> : null}
        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      </div>

      {pendingAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-md border bg-card p-5 shadow-2xl">
            <h3 className="text-lg font-semibold">
              {pendingAction.action === "hide" ? "Hide comment?" : "Delete comment?"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {pendingAction.action === "hide"
                ? "This comment will be removed from the public page."
                : "This comment will be permanently deleted."}
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-md border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                onClick={() => setPendingAction(null)}
                disabled={Boolean(managingId)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={pendingAction.action === "delete" ? "rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60" : "rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"}
                onClick={() => void manageComment(pendingAction.id, pendingAction.action)}
                disabled={Boolean(managingId)}
              >
                {managingId ? "Working..." : pendingAction.action === "hide" ? "Hide" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
