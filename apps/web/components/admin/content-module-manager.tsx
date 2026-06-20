"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bold,
  CalendarDays,
  CheckCircle2,
  Eye,
  FilePenLine,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Megaphone,
  Pencil,
  Plus,
  Quote,
  MapPinned,
  RefreshCw,
  Tags,
  Trash2,
  Underline,
  X,
} from "lucide-react";
import { apiRequest } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ModuleType = "notice" | "event" | "post";

type WebsitePage = {
  id: string;
  key: string;
  title: string;
  route: string;
  status: "draft" | "published" | "hidden";
  layout: "standard" | "landing" | "sidebar" | "custom";
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  body: string | null;
  customTemplate: string | null;
  contentBlocks: unknown;
};

type ContentItem = {
  id: string;
  title: string;
  slug?: string;
  summary: string;
  body?: string;
  date: string;
  time?: string;
  status: "draft" | "pending" | "published" | "trash" | "correction_requested" | "rejected";
  location?: string;
  mapQuery?: string;
  mapUrl?: string;
  category?: string;
  taxonomies?: string[];
  tags?: string[];
  allowComments?: boolean;
  authorUserId?: string;
  authorName?: string;
  authorProfileUrl?: string;
  submittedByMemberId?: string;
  submittedAt?: string;
  correctionNote?: string;
  correctionRequestedAt?: string;
  rejectionNote?: string;
  rejectedAt?: string;
};

function emptyItem(): ContentItem {
  return {
      id: "",
      title: "",
      slug: "",
      summary: "",
    body: "",
    date: new Date().toISOString().slice(0, 10),
    time: "",
    status: "published",
    location: "",
      mapQuery: "",
      mapUrl: "",
      category: "",
      taxonomies: [],
      tags: [],
      allowComments: true,
  };
}

function normalizeItems(value: unknown): ContentItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Partial<ContentItem> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      id: typeof item.id === "string" && item.id ? item.id : crypto.randomUUID(),
      title: typeof item.title === "string" ? item.title : "Untitled",
      slug: typeof item.slug === "string" ? item.slug : "",
      summary: typeof item.summary === "string" ? item.summary : "",
      body: typeof item.body === "string" ? item.body : "",
      date: typeof item.date === "string" ? item.date : new Date().toISOString().slice(0, 10),
      time: typeof item.time === "string" ? item.time : "",
      status:
        item.status === "draft" || item.status === "pending" || item.status === "trash" || item.status === "correction_requested" || item.status === "rejected"
          ? item.status
          : "published",
      location: typeof item.location === "string" ? item.location : "",
      mapQuery: typeof item.mapQuery === "string" ? item.mapQuery : "",
      mapUrl: typeof item.mapUrl === "string" ? item.mapUrl : "",
      category: typeof item.category === "string" ? item.category : "",
      taxonomies: Array.isArray(item.taxonomies) ? item.taxonomies.filter((taxonomy): taxonomy is string => typeof taxonomy === "string") : [],
      tags: Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === "string") : [],
      allowComments: item.allowComments !== false,
      authorUserId: typeof item.authorUserId === "string" ? item.authorUserId : "",
      authorName: typeof item.authorName === "string" ? item.authorName : "",
      authorProfileUrl: typeof item.authorProfileUrl === "string" ? item.authorProfileUrl : "",
      submittedByMemberId: typeof item.submittedByMemberId === "string" ? item.submittedByMemberId : "",
      submittedAt: typeof item.submittedAt === "string" ? item.submittedAt : "",
      correctionNote: typeof item.correctionNote === "string" ? item.correctionNote : "",
      correctionRequestedAt: typeof item.correctionRequestedAt === "string" ? item.correctionRequestedAt : "",
      rejectionNote: typeof item.rejectionNote === "string" ? item.rejectionNote : "",
      rejectedAt: typeof item.rejectedAt === "string" ? item.rejectedAt : "",
    }));
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function moduleCopy(type: ModuleType) {
  if (type === "notice") {
    return { pageKey: "notices", title: "Notices", singleTitle: "Notice", Icon: Megaphone };
  }
  if (type === "event") {
    return { pageKey: "events", title: "Events", singleTitle: "Event", Icon: CalendarDays };
  }
  return { pageKey: "srithir_patha", title: "Smritir Pata", singleTitle: "Post", Icon: Tags };
}

function tagsToInput(tags: string[] | undefined) {
  return (tags ?? []).join(", ");
}

function inputToTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function stripHtml(value: string) {
  if (typeof document === "undefined") return value;
  const div = document.createElement("div");
  div.innerHTML = value;
  return div.textContent?.trim() ?? "";
}

function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  function run(command: string, argument?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, argument);
    onChange(editorRef.current?.innerHTML ?? "");
  }

  function addLink() {
    const url = window.prompt("Paste link URL");
    if (!url) return;
    run("createLink", url);
  }

  const tools = [
    { label: "Heading", icon: Heading2, action: () => run("formatBlock", "h2") },
    { label: "Bold", icon: Bold, action: () => run("bold") },
    { label: "Italic", icon: Italic, action: () => run("italic") },
    { label: "Underline", icon: Underline, action: () => run("underline") },
    { label: "Bulleted list", icon: List, action: () => run("insertUnorderedList") },
    { label: "Numbered list", icon: ListOrdered, action: () => run("insertOrderedList") },
    { label: "Quote", icon: Quote, action: () => run("formatBlock", "blockquote") },
    { label: "Link", icon: Link2, action: addLink },
  ];

  return (
    <div className="overflow-hidden rounded-md border bg-background">
      <div className="flex flex-wrap gap-1 border-b bg-slate-50 p-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.label}
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-700 transition hover:bg-white hover:text-primary hover:shadow-sm"
              onClick={tool.action}
              title={tool.label}
              aria-label={tool.label}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <div
        ref={editorRef}
        className="prose prose-sm min-h-72 max-w-none overflow-y-auto px-4 py-3 text-sm leading-7 outline-none"
        contentEditable
        suppressContentEditableWarning
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
      />
    </div>
  );
}

export function ContentModuleManager({ type }: { type: ModuleType }) {
  const { pageKey, title, singleTitle, Icon } = moduleCopy(type);
  const isPost = type === "post";
  const [pages, setPages] = useState<WebsitePage[]>([]);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [draft, setDraft] = useState<ContentItem>(emptyItem());
  const [tagInput, setTagInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<ContentItem | null>(null);
  const [correctionItem, setCorrectionItem] = useState<ContentItem | null>(null);
  const [correctionNote, setCorrectionNote] = useState("");
  const [rejectItem, setRejectItem] = useState<ContentItem | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const page = useMemo(() => pages.find((item) => item.key === pageKey) ?? null, [pageKey, pages]);
  const visibleItems = useMemo(
    () => (isPost ? items.filter((item) => isMemberSubmitted(item) && item.status !== "trash") : items),
    [isPost, items]
  );

  async function loadItems() {
    setLoading(true);
    try {
      const data = await apiRequest<WebsitePage[]>("/admin/website/pages");
      const selected = data.find((item) => item.key === pageKey);
      setPages(data);
      setItems(normalizeItems(selected?.contentBlocks));
    } catch {
      setMessage(`Could not load ${title.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  function openAddModal() {
    const next = emptyItem();
    setDraft(next);
    setTagInput("");
    setEditingId(null);
    setModalOpen(true);
  }

  function openEditModal(item: ContentItem) {
    setDraft(item);
    setTagInput(tagsToInput(item.tags));
    setEditingId(item.id);
    setModalOpen(true);
  }

  async function persist(nextItems: ContentItem[], successMessage: string) {
    if (!page) return;
    const updated = await apiRequest<WebsitePage[]>("/admin/website/pages", {
      method: "PATCH",
      body: JSON.stringify({ items: [{ ...page, contentBlocks: nextItems }] }),
    });
    setPages(updated);
    const nextPage = updated.find((item) => item.key === page.key);
    setItems(normalizeItems(nextPage?.contentBlocks));
    setMessage(successMessage);
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) {
      setMessage(`${singleTitle} title is required.`);
      return;
    }
    const body = draft.body?.trim() ?? "";
    const summary = draft.summary.trim() || (isPost ? stripHtml(body).slice(0, 180) : "");
    const item = {
      ...draft,
      id: editingId ?? crypto.randomUUID(),
      title: draft.title.trim(),
      summary,
      body,
      time: draft.time?.trim() ?? "",
      location: draft.location?.trim() ?? "",
      mapQuery: draft.mapQuery?.trim() ?? "",
      mapUrl: draft.mapUrl?.trim() ?? "",
      category: draft.category?.trim() ?? "",
      tags: inputToTags(tagInput),
    };
    const nextItems = editingId ? items.map((current) => (current.id === editingId ? item : current)) : [item, ...items];
    await persist(nextItems, `${singleTitle} saved.`);
    setModalOpen(false);
  }

  async function deleteItem(id: string) {
    if (!window.confirm(`Delete this ${singleTitle.toLowerCase()}?`)) return;
    await persist(items.filter((item) => item.id !== id), `${singleTitle} deleted.`);
  }

  async function approvePost(id: string) {
    const nextItems = items.map((item) => (item.id === id ? { ...item, status: "published" as const } : item));
    await persist(nextItems, "Post approved and published.");
    setPreviewItem(null);
  }

  function isMemberSubmitted(item: ContentItem) {
    return Boolean(item.submittedByMemberId || item.authorUserId);
  }

  function openCorrectionRequest(item: ContentItem) {
    setPreviewItem(null);
    setCorrectionItem(item);
    setCorrectionNote(item.correctionNote ?? "");
  }

  async function requestCorrectionPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!correctionItem) return;
    const note = correctionNote.trim();
    if (!note) {
      setMessage("Correction note is required.");
      return;
    }
    const now = new Date().toISOString();
    const nextItems = items.map((item) =>
      item.id === correctionItem.id
        ? {
            ...item,
            status: "correction_requested" as const,
            correctionNote: note,
            correctionRequestedAt: now
          }
        : item
    );
    await persist(nextItems, "Correction request sent to member.");
    setCorrectionItem(null);
    setCorrectionNote("");
  }

  function openRejectRequest(item: ContentItem) {
    setPreviewItem(null);
    setRejectItem(item);
    setRejectionNote(item.rejectionNote ?? "");
  }

  async function rejectPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rejectItem) return;
    const note = rejectionNote.trim();
    if (!note) {
      setMessage("Rejection reason is required.");
      return;
    }
    const now = new Date().toISOString();
    const nextItems = items.map((item) =>
      item.id === rejectItem.id
        ? {
            ...item,
            status: "rejected" as const,
            rejectionNote: note,
            rejectedAt: now
          }
        : item
    );
    await persist(nextItems, "Post rejected.");
    setRejectItem(null);
    setRejectionNote("");
  }

  if (loading) return <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">Loading {title.toLowerCase()}...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-primary">Content module</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">{title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {isPost ? (
            <Button type="button" variant="outline" onClick={() => void loadItems()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh
            </Button>
          ) : null}
        {isPost ? null : (
          <Button type="button" onClick={openAddModal}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add {singleTitle}
          </Button>
        )}
        </div>
      </div>

      {message ? <div className="rounded-2xl border bg-muted p-3 text-sm">{message}</div> : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
            {title} list
          </CardTitle>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{visibleItems.length} total</span>
        </CardHeader>
        <CardContent>
          {visibleItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-slate-50 p-6 text-sm text-muted-foreground">
              {isPost ? "No member Smritir Pata requests yet." : `No ${title.toLowerCase()} added yet.`}
            </div>
          ) : (
            <div className="grid gap-3">
              {visibleItems.map((item) => (
                <div key={item.id} className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-semibold">{item.title}</h2>
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold capitalize text-primary">{item.status.replace("_", " ")}</span>
                      {!isPost && item.category ? <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{item.category}</span> : null}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.summary || "No summary added."}</p>
                    {isPost ? (
                      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                        <span>
                          <strong className="text-foreground">Written by:</strong> {item.authorName || "Member"}
                        </span>
                        <span>
                          <strong className="text-foreground">Submitted by:</strong> {item.authorName || "Member"}
                        </span>
                        <span>
                          <strong className="text-foreground">Submitted date:</strong> {formatDate(item.submittedAt || item.date)}
                        </span>
                      </div>
                    ) : null}
                    {!isPost && item.tags?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {isPost ? `Last status: ${item.status.replace("_", " ")}` : formatDate(item.date)}
                      {type === "event" && item.time ? ` - ${item.time}` : ""}
                      {type === "event" && item.location ? ` - ${item.location}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isPost ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => setPreviewItem(item)}>
                        <Eye className="h-4 w-4" aria-hidden="true" />
                        Preview
                      </Button>
                    ) : null}
                    {isPost && !isMemberSubmitted(item) && item.status !== "published" && item.status !== "trash" ? (
                      <Button type="button" variant="outline" size="sm" className="border-green-200 text-green-700" onClick={() => void approvePost(item.id)}>
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        Approve
                      </Button>
                    ) : null}
                    {isPost && isMemberSubmitted(item) ? null : isPost ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/smritir-pata/${item.id}`}>
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          Edit
                        </Link>
                      </Button>
                    ) : (
                      <Button type="button" variant="outline" size="sm" onClick={() => openEditModal(item)}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        Edit
                      </Button>
                    )}
                    {isPost && isMemberSubmitted(item) ? null : (
                      <Button type="button" variant="outline" size="sm" className="border-red-200 text-red-700" onClick={() => void deleteItem(item.id)}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {modalOpen && !isPost ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <form className="w-full max-w-5xl overflow-hidden rounded-3xl border bg-background shadow-2xl" onSubmit={saveItem}>
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-semibold">{editingId ? `Edit ${singleTitle}` : `Add ${singleTitle}`}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Create and manage {title.toLowerCase()} without opening page settings.</p>
              </div>
              <button type="button" className="rounded-xl p-2 hover:bg-muted" onClick={() => setModalOpen(false)} aria-label="Close">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="grid max-h-[70vh] gap-4 overflow-y-auto p-5">
              <label className="grid gap-2 text-sm font-medium">
                Title
                <input className="h-11 rounded-md border bg-background px-3 text-sm" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium">
                  {type === "event" ? "Event date" : "Publish date"}
                  <input className="h-11 rounded-md border bg-background px-3 text-sm" type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} />
                </label>
                {type === "event" ? (
                  <label className="grid gap-2 text-sm font-medium">
                    Event time
                    <input className="h-11 rounded-md border bg-background px-3 text-sm" type="time" value={draft.time ?? ""} onChange={(event) => setDraft((current) => ({ ...current, time: event.target.value }))} />
                  </label>
                ) : (
                  <label className="grid gap-2 text-sm font-medium">
                    Status
                    <select className="h-11 rounded-md border bg-background px-3 text-sm" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as ContentItem["status"] }))}>
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                      {isPost ? <option value="pending">Pending Review</option> : null}
                      {isPost ? <option value="trash">Trash</option> : null}
                    </select>
                  </label>
                )}
              </div>
              {type === "event" ? (
                <>
                  <label className="grid gap-2 text-sm font-medium">
                    Location
                    <input className="h-11 rounded-md border bg-background px-3 text-sm" placeholder="SUST Campus, Sylhet" value={draft.location ?? ""} onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium">
                      Map search or coordinates
                      <input className="h-11 rounded-md border bg-background px-3 text-sm" placeholder="24.9172, 91.8310 or venue name" value={draft.mapQuery ?? ""} onChange={(event) => setDraft((current) => ({ ...current, mapQuery: event.target.value }))} />
                    </label>
                    <label className="grid gap-2 text-sm font-medium">
                      Map link
                      <input className="h-11 rounded-md border bg-background px-3 text-sm" placeholder="https://maps.google.com/..." value={draft.mapUrl ?? ""} onChange={(event) => setDraft((current) => ({ ...current, mapUrl: event.target.value }))} />
                    </label>
                  </div>
                  <div className="rounded-md border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                      <MapPinned className="h-3.5 w-3.5" aria-hidden="true" />
                      Map preview
                    </span>{" "}
                    Public event page will show an embedded map from coordinates/search text and use the map link for directions.
                  </div>
                  <label className="grid gap-2 text-sm font-medium">
                    Status
                    <select className="h-11 rounded-md border bg-background px-3 text-sm" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as ContentItem["status"] }))}>
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                    </select>
                  </label>
                </>
              ) : null}
              {isPost ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium">
                    Category
                    <input className="h-11 rounded-md border bg-background px-3 text-sm" placeholder="Memory, Campus life, Reunion" value={draft.category ?? ""} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Tags
                    <input className="h-11 rounded-md border bg-background px-3 text-sm" placeholder="Batch, campus, friendship" value={tagInput} onChange={(event) => setTagInput(event.target.value)} />
                  </label>
                </div>
              ) : null}
              <label className="grid gap-2 text-sm font-medium">
                {isPost ? "Excerpt" : "Description"}
                <textarea className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm" value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} />
              </label>
              {isPost || type === "event" ? (
                <label className="grid gap-2 text-sm font-medium">
                  {type === "event" ? "Event details" : "Body"}
                  <RichTextEditor value={draft.body ?? ""} onChange={(body) => setDraft((current) => ({ ...current, body }))} />
                </label>
              ) : null}
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t p-5">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save {singleTitle}</Button>
            </div>
          </form>
        </div>
      ) : null}

      {previewItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border bg-background shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b p-5">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-primary">Review request</p>
                <h2 className="mt-1 text-xl font-semibold">{previewItem.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Submitted by {previewItem.authorName || "Member"} · {formatDate(previewItem.submittedAt || previewItem.date)}
                </p>
              </div>
              <button type="button" className="rounded-xl p-2 hover:bg-muted" onClick={() => setPreviewItem(null)} aria-label="Close preview">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {previewItem.status !== "published" && previewItem.status !== "trash" ? (
              <div className="flex flex-wrap justify-end gap-2 border-b bg-muted/30 px-5 py-3">
                <Button type="button" variant="outline" className="border-green-200 text-green-700" onClick={() => void approvePost(previewItem.id)}>
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Approve
                </Button>
                {isMemberSubmitted(previewItem) ? (
                  <Button type="button" variant="outline" className="border-amber-200 text-amber-700" onClick={() => openCorrectionRequest(previewItem)}>
                    <FilePenLine className="h-4 w-4" aria-hidden="true" />
                    Request correction
                  </Button>
                ) : null}
                <Button type="button" variant="destructive" onClick={() => openRejectRequest(previewItem)}>
                  Reject
                </Button>
              </div>
            ) : null}
            <article className="overflow-y-auto p-6">
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold capitalize text-primary">{previewItem.status.replace("_", " ")}</span>
                {previewItem.category ? <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{previewItem.category}</span> : null}
              </div>
              {isPost && previewItem.tags?.length ? (
                <div className="mb-5 flex flex-wrap gap-1.5">
                  {previewItem.tags.map((tag) => (
                    <span key={tag} className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}
              {previewItem.summary ? <p className="mb-5 rounded-2xl border bg-muted/40 p-4 text-sm text-muted-foreground">{previewItem.summary}</p> : null}
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: previewItem.body ?? "" }} />
              {previewItem.correctionNote ? (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-semibold">Correction note</p>
                  <p className="mt-1">{previewItem.correctionNote}</p>
                </div>
              ) : null}
              {previewItem.rejectionNote ? (
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                  <p className="font-semibold">Rejection reason</p>
                  <p className="mt-1">{previewItem.rejectionNote}</p>
                </div>
              ) : null}
            </article>
          </div>
        </div>
      ) : null}

      {correctionItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <form className="w-full max-w-lg rounded-3xl border bg-background p-5 shadow-2xl" onSubmit={requestCorrectionPost}>
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <FilePenLine className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">Request member update</h2>
                <p className="mt-1 text-sm text-muted-foreground">Send a correction note. The member will edit and resubmit this article.</p>
                <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm font-medium">{correctionItem.title}</p>
              </div>
            </div>
            <label className="mt-5 grid gap-2 text-sm font-medium">
              Correction message
              <textarea
                className="min-h-28 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                value={correctionNote}
                onChange={(event) => setCorrectionNote(event.target.value)}
                placeholder="Example: Please add the batch year and correct the image caption."
                required
              />
            </label>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setCorrectionItem(null)}>Cancel</Button>
              <Button type="submit">Send request</Button>
            </div>
          </form>
        </div>
      ) : null}

      {rejectItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <form className="w-full max-w-lg rounded-3xl border bg-background p-5 shadow-2xl" onSubmit={rejectPost}>
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700">
                <X className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">Reject article</h2>
                <p className="mt-1 text-sm text-muted-foreground">Add a reason so the member understands why this article was rejected.</p>
                <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm font-medium">{rejectItem.title}</p>
              </div>
            </div>
            <label className="mt-5 grid gap-2 text-sm font-medium">
              Rejection reason
              <textarea
                className="min-h-28 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                value={rejectionNote}
                onChange={(event) => setRejectionNote(event.target.value)}
                placeholder="Example: This article is not suitable for publication in its current form."
                required
              />
            </label>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setRejectItem(null)}>Cancel</Button>
              <Button type="submit" variant="destructive">Reject</Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
