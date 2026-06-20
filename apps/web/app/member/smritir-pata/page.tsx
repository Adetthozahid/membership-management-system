"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpenText, Edit3, Plus, RotateCcw, Trash2, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MemberPost = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  category: string;
  tags: string[];
  status: "draft" | "pending" | "published" | "trash" | "correction_requested" | "rejected";
  correctionNote?: string | null;
  correctionRequestedAt?: string | null;
  rejectionNote?: string | null;
  rejectedAt?: string | null;
  submittedAt: string;
  publishedAt: string | null;
};

type MemberPostsResponse = {
  items: MemberPost[];
  total: number;
};

type StatusFilter = "all" | MemberPost["status"];
type PendingAction = {
  id: string;
  action: "trash" | "delete";
  title: string;
} | null;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function MemberSmritirPataPage() {
  const [posts, setPosts] = useState<MemberPost[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const filters: Array<{ key: StatusFilter; label: string }> = [
    { key: "all", label: "All" },
    { key: "draft", label: "Draft" },
    { key: "pending", label: "Pending" },
    { key: "correction_requested", label: "Correction" },
    { key: "rejected", label: "Rejected" },
    { key: "published", label: "Published" },
    { key: "trash", label: "Trash" },
  ];
  const activePosts = posts.filter((post) => post.status !== "trash");
  const filteredPosts = filter === "all" ? activePosts : posts.filter((post) => post.status === filter);
  const countFor = (key: StatusFilter) => (key === "all" ? activePosts.length : posts.filter((post) => post.status === key).length);

  function loadPosts() {
    setLoading(true);
    return apiRequest<MemberPostsResponse>("/member/smritir-pata")
      .then((data) => setPosts(data.items))
      .catch(() => setMessage("Could not load your Smritir Pata posts."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const flash = window.sessionStorage.getItem("mms_member_smritir_flash");
    if (flash) {
      window.sessionStorage.removeItem("mms_member_smritir_flash");
      setMessage(flash);
    }

    void loadPosts();
  }, []);

  async function postAction(id: string, action: "trash" | "restore" | "delete") {
    const endpoint =
      action === "delete"
        ? `/member/smritir-pata/${encodeURIComponent(id)}`
        : `/member/smritir-pata/${encodeURIComponent(id)}/${action}`;
    const response = await apiRequest<{ message: string }>(endpoint, {
      method: action === "delete" ? "DELETE" : "POST",
    });
    setMessage(response.message);
    await loadPosts();
  }

  function requestPostAction(post: MemberPost, action: "trash" | "delete") {
    setPendingAction({ id: post.id, action, title: post.title });
  }

  async function confirmPendingAction() {
    if (!pendingAction) return;
    const { id, action } = pendingAction;
    setPendingAction(null);
    await postAction(id, action);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-primary">Smritir Pata</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">My Articles</h1>
        </div>
        <Button asChild>
          <Link href="/member/smritir-pata/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add New
          </Link>
        </Button>
      </div>

      {message ? <div className="rounded-md border bg-muted p-3 text-sm">{message}</div> : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <BookOpenText className="h-5 w-5 text-primary" aria-hidden="true" />
            Submitted posts
          </CardTitle>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{filteredPosts.length} shown</span>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  filter === item.key ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
                }`}
                onClick={() => setFilter(item.key)}
              >
                {item.label} ({countFor(item.key)})
              </button>
            ))}
          </div>
          {loading ? (
            <div className="rounded-md border bg-muted p-4 text-sm text-muted-foreground">Loading posts...</div>
          ) : filteredPosts.length === 0 ? (
            <div className="rounded-md border border-dashed bg-muted/50 p-6 text-sm text-muted-foreground">
              {filter === "trash" ? "Trash is empty." : "No articles found in this view."}
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredPosts.map((post) => (
                <article key={post.id} className="rounded-md border bg-card p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold">{post.title}</h2>
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold capitalize text-primary">{post.status.replace("_", " ")}</span>
                        <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{post.category}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {post.status !== "trash" ? (
                        <>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/member/smritir-pata/${post.id}`}>
                              <Edit3 className="h-4 w-4" aria-hidden="true" />
                              Edit
                            </Link>
                          </Button>
                          <Button size="sm" variant="outline" type="button" onClick={() => requestPostAction(post, "trash")}>
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            Trash
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" type="button" onClick={() => void postAction(post.id, "restore")}>
                            <RotateCcw className="h-4 w-4" aria-hidden="true" />
                            Restore
                          </Button>
                          <Button size="sm" variant="destructive" type="button" onClick={() => requestPostAction(post, "delete")}>
                            <XCircle className="h-4 w-4" aria-hidden="true" />
                            Delete forever
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{post.summary || "No summary added."}</p>
                  {post.status === "correction_requested" && post.correctionNote ? (
                    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      <p className="font-semibold">Admin correction request</p>
                      <p className="mt-1">{post.correctionNote}</p>
                    </div>
                  ) : null}
                  {post.status === "rejected" && post.rejectionNote ? (
                    <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                      <p className="font-semibold">Rejected by admin</p>
                      <p className="mt-1">{post.rejectionNote}</p>
                    </div>
                  ) : null}
                  {post.tags.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {post.tags.map((tag) => (
                        <span key={tag} className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-3 text-xs text-muted-foreground">
                    Submitted {formatDate(post.submittedAt)}
                    {post.status === "published" && post.publishedAt ? ` - Published ${formatDate(post.publishedAt)}` : ""}
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {pendingAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="smritir-action-title">
          <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                {pendingAction.action === "trash" ? <Trash2 className="h-5 w-5" aria-hidden="true" /> : <XCircle className="h-5 w-5" aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <h2 id="smritir-action-title" className="text-lg font-semibold">
                  {pendingAction.action === "trash" ? "Move to trash?" : "Delete forever?"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {pendingAction.action === "trash"
                    ? "This article will move to the Trash tab. You can restore it later."
                    : "This will permanently delete the article and cannot be undone."}
                </p>
                <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm font-medium">{pendingAction.title}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setPendingAction(null)}>
                Cancel
              </Button>
              <Button type="button" variant={pendingAction.action === "delete" ? "destructive" : "default"} onClick={() => void confirmPendingAction()}>
                {pendingAction.action === "trash" ? "Move to trash" : "Delete forever"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
