"use client";

import { DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy, Download, FileText, Grid2X2, Image as ImageIcon, List, PlaySquare, RefreshCw, Search, Trash2, Upload, X } from "lucide-react";
import { apiRequest, getAccessToken } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ImageEditTools } from "@/components/admin/image-edit-tools";

type MediaType = "image" | "video" | "document";

type MediaAsset = {
  id: string;
  fileName: string;
  originalName: string;
  fileUrl: string;
  mimeType: string;
  mediaType: MediaType;
  fileSize: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  title: string;
  caption: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  mediumUrl: string | null;
  largeUrl: string | null;
  originalUrl: string | null;
  uploadedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

type MediaLibraryResponse = {
  items: MediaAsset[];
  total: number;
  months: string[];
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const maxFiles = 20;
const maxFileSize = 2 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "application/pdf"]);

function mediaUrl(url: string | null) {
  if (!url) return "";
  return url.startsWith("http") ? url : `${apiBaseUrl}${url}`;
}

function fileSize(value: number) {
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)} MB`;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function mediaTypeLabel(type: MediaType) {
  if (type === "image") return "Image";
  if (type === "video") return "Video";
  return "PDF";
}

async function copyTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall back when the browser exposes Clipboard API but blocks writes.
    }
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "true");
  input.style.position = "fixed";
  input.style.left = "-9999px";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

function MediaPreview({ item }: { item: MediaAsset }) {
  if (item.mediaType === "image") {
    return <img src={mediaUrl(item.thumbnailUrl ?? item.fileUrl)} alt={item.altText ?? item.title} className="h-full w-full object-cover" loading="lazy" />;
  }
  if (item.mediaType === "video") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-500">
        <PlaySquare className="h-12 w-12" aria-hidden="true" />
      </div>
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-red-50 text-red-600">
      <FileText className="h-12 w-12" aria-hidden="true" />
    </div>
  );
}

export function MediaLibrary() {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [type, setType] = useState("all");
  const [month, setMonth] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<MediaAsset | null>(null);
  const [editingItem, setEditingItem] = useState<MediaAsset | null>(null);
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  async function load() {
    const query = new URLSearchParams();
    query.set("limit", "200");
    if (type !== "all") query.set("type", type);
    if (month !== "all") query.set("month", month);
    if (search.trim()) query.set("search", search.trim());
    const data = await apiRequest<MediaLibraryResponse>(`/admin/website/media?${query.toString()}`);
    setItems(data.items);
    setMonths(data.months);
    setTotal(data.total);
    setSelectedIds([]);
  }

  useEffect(() => {
    void load().catch(() => setError("Upload failed. Please try again."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, month]);

  function validateFiles(files: File[]) {
    if (files.length > maxFiles) return "Maximum 20 files allowed per upload.";
    if (files.some((file) => file.size > maxFileSize)) return "Each file must be less than 2MB.";
    if (files.some((file) => !allowedTypes.has(file.type))) return "Unsupported file type.";
    return null;
  }

  async function uploadFiles(files: File[]) {
    const validationError = validateFiles(files);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setMessage(null);
    setUploading(true);
    setUploadProgress(18);
    try {
      const form = new FormData();
      files.forEach((file) => form.append("files", file));
      const token = getAccessToken();
      setUploadProgress(45);
      const response = await fetch(`${apiBaseUrl}/api/admin/website/media`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
        body: form
      });
      setUploadProgress(85);
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
        throw new Error(Array.isArray(body?.message) ? body.message.join(" ") : body?.message ?? "Upload failed. Please try again.");
      }
      setUploadProgress(100);
      setMessage("Media uploaded and optimized successfully.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed. Please try again.");
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  }

  function onFileSelect(files: FileList | null) {
    if (!files) return;
    void uploadFiles(Array.from(files));
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void uploadFiles(Array.from(event.dataTransfer.files));
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function deleteItems(ids: string[]) {
    if (!ids.length) return;
    if (!window.confirm("Are you sure you want to delete this media permanently? If this media is used somewhere, it may stop showing there.")) return;
    await apiRequest("/admin/website/media/delete", {
      method: "POST",
      body: JSON.stringify({ ids })
    });
    setMessage(`${ids.length} media item${ids.length === 1 ? "" : "s"} deleted.`);
    setSelectedItem(null);
    await load();
  }

  async function saveSelectedItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingItem) return;
    const updated = await apiRequest<MediaAsset>(`/admin/website/media/${editingItem.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: editingItem.title,
        altText: editingItem.altText,
        caption: editingItem.caption,
        description: editingItem.description
      })
    });
    setSelectedItem(updated);
    setEditingItem(updated);
    setMessage("Media details updated successfully.");
    await load();
  }

  async function copyUrl(url: string) {
    await copyTextToClipboard(mediaUrl(url));
    setMessage("URL copied to clipboard.");
  }

  async function replaceSelectedMedia(files: FileList | null) {
    if (!selectedItem || !files?.[0]) return;
    const validationError = validateFiles([files[0]]);
    if (validationError) {
      setError(validationError);
      return;
    }
    const form = new FormData();
    form.append("file", files[0]);
    const token = getAccessToken();
    const response = await fetch(`${apiBaseUrl}/api/admin/website/media/${selectedItem.id}/replace`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: "include",
      body: form
    });
    if (!response.ok) {
      setError("Upload failed. Please try again.");
      return;
    }
    const updated = (await response.json()) as MediaAsset;
    setSelectedItem(updated);
    setEditingItem(updated);
    setMessage("Media replaced successfully.");
    await load();
  }

  async function regenerateSelectedMedia() {
    if (!selectedItem) return;
    const updated = await apiRequest<MediaAsset>(`/admin/website/media/${selectedItem.id}/regenerate-thumbnails`, { method: "POST" });
    setSelectedItem(updated);
    setEditingItem(updated);
    setMessage("Thumbnails regenerated successfully.");
    await load();
  }

  async function editSelectedImage(input: { rotate?: number; flipHorizontal?: boolean; flipVertical?: boolean; resizeWidth?: number; crop?: { left: number; top: number; width: number; height: number }; saveAsCopy?: boolean; restoreOriginal?: boolean }) {
    if (!selectedItem) return;
    const updated = await apiRequest<MediaAsset>(`/admin/website/media/${selectedItem.id}/edit-image`, {
      method: "POST",
      body: JSON.stringify(input)
    });
    setSelectedItem(updated);
    setEditingItem(updated);
    setMessage("Image updated successfully.");
    await load();
  }

  function openItem(item: MediaAsset) {
    setSelectedItem(item);
    setEditingItem(item);
    setImageEditorOpen(false);
  }

  function moveSelection(direction: -1 | 1) {
    if (!selectedItem) return;
    const index = items.findIndex((item) => item.id === selectedItem.id);
    const next = items[index + direction];
    if (next) openItem(next);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-primary">Media</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Media Library</h1>
        </div>
        <Button type="button" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4" aria-hidden="true" />
          Add New
        </Button>
        <input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.mp4,.webm,.pdf" className="hidden" onChange={(event) => onFileSelect(event.target.files)} />
      </div>

      <div
        className={`rounded-md border border-dashed p-5 text-center text-sm transition ${dragging ? "border-primary bg-primary/5" : "bg-card text-muted-foreground"}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        Drop files here or use Add New. Maximum 20 files, 2MB each. Images are optimized to WebP automatically.
        {uploading ? (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
        ) : null}
      </div>

      {message ? <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</div> : null}
      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant={view === "grid" ? "default" : "outline"} size="icon" onClick={() => setView("grid")} aria-label="Grid view">
                <Grid2X2 className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button type="button" variant={view === "list" ? "default" : "outline"} size="icon" onClick={() => setView("list")} aria-label="List view">
                <List className="h-4 w-4" aria-hidden="true" />
              </Button>
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={type} onChange={(event) => setType(event.target.value)}>
                <option value="all">All media</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
                <option value="document">Documents/PDF</option>
              </select>
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={month} onChange={(event) => setMonth(event.target.value)}>
                <option value="all">All dates</option>
                {months.map((item) => (
                  <option key={item} value={item}>
                    {monthLabel(item)}
                  </option>
                ))}
              </select>
              <Button type="button" variant="outline" onClick={() => setSelectedIds(items.map((item) => item.id))}>
                Bulk select
              </Button>
              {selectedIds.length ? (
                <Button type="button" variant="destructive" onClick={() => void deleteItems(selectedIds)}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete selected ({selectedIds.length})
                </Button>
              ) : null}
            </div>
            <form
              className="relative min-w-0 xl:w-80"
              onSubmit={(event) => {
                event.preventDefault();
                void load();
              }}
            >
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Search media" value={search} onChange={(event) => setSearch(event.target.value)} />
            </form>
          </div>

          <div className="space-y-5 p-5 sm:p-6">
          <div className="text-xs text-muted-foreground">Showing {items.length} of {total} media items</div>

          {view === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {items.map((item) => (
                <div key={item.id} className={`group overflow-hidden rounded-md border bg-card ${selectedSet.has(item.id) ? "ring-2 ring-primary" : ""}`}>
                  <button type="button" className="relative block aspect-square w-full bg-muted text-left" onClick={() => openItem(item)}>
                    <MediaPreview item={item} />
                    <span className="absolute left-2 top-2">
                      <input
                        aria-label={`Select ${item.title}`}
                        type="checkbox"
                        checked={selectedSet.has(item.id)}
                        onClick={(event) => event.stopPropagation()}
                        onChange={() => toggleSelected(item.id)}
                        className="h-4 w-4"
                      />
                    </span>
                    <span className="absolute inset-x-2 bottom-2 hidden gap-1 group-hover:flex">
                      <span className="rounded bg-black/70 px-2 py-1 text-xs font-medium text-white">Preview</span>
                    </span>
                  </button>
                  <div className="grid gap-1 p-2 text-xs">
                    <div className="truncate font-medium">{item.title}</div>
                    <div className="text-muted-foreground">{mediaTypeLabel(item.mediaType)} · {fileSize(item.fileSize)}</div>
                    <div className="flex gap-2">
                      <Link className="text-primary hover:underline" href={`/admin/gallery/${item.id}`}>Edit</Link>
                      <button className="text-primary hover:underline" onClick={() => void copyUrl(item.fileUrl)}>Copy URL</button>
                      <button className="text-red-700 hover:underline" onClick={() => void deleteItems([item.id])}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="w-10 px-3 py-3"></th>
                    <th className="px-3 py-3">File</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Size</th>
                    <th className="px-3 py-3">Uploaded</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-3 py-3"><input type="checkbox" checked={selectedSet.has(item.id)} onChange={() => toggleSelected(item.id)} /></td>
                      <td className="px-3 py-3">
                        <button className="flex items-center gap-3 text-left" onClick={() => openItem(item)}>
                          <span className="h-12 w-12 overflow-hidden rounded border bg-muted"><MediaPreview item={item} /></span>
                          <span>
                            <span className="block font-medium">{item.title}</span>
                            <span className="block text-xs text-muted-foreground">{item.originalName}</span>
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-3">{item.mimeType}</td>
                      <td className="px-3 py-3">{fileSize(item.fileSize)}</td>
                      <td className="px-3 py-3">{dateLabel(item.createdAt)}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <Button asChild type="button" variant="outline" size="sm">
                            <Link href={`/admin/gallery/${item.id}`}>Edit</Link>
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => void copyUrl(item.fileUrl)}>Copy URL</Button>
                          <Button type="button" variant="outline" size="sm" className="border-red-200 text-red-700" onClick={() => void deleteItems([item.id])}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </CardContent>
      </Card>

      {selectedItem && editingItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <form className="grid h-[calc(100vh-2rem)] w-full max-w-7xl overflow-hidden rounded-md border bg-background shadow-xl lg:grid-cols-[minmax(0,1.25fr)_minmax(420px,0.75fr)]" onSubmit={saveSelectedItem}>
            <div className="flex min-h-0 items-center justify-center bg-muted p-5">
              {selectedItem.mediaType === "image" ? (
                <img src={mediaUrl(selectedItem.fileUrl)} alt={selectedItem.altText ?? selectedItem.title} className="max-h-full max-w-full rounded object-contain" />
              ) : selectedItem.mediaType === "video" ? (
                <video src={mediaUrl(selectedItem.fileUrl)} controls className="max-h-full max-w-full rounded" preload="metadata" />
              ) : (
                <a href={mediaUrl(selectedItem.fileUrl)} target="_blank" rel="noreferrer" className="rounded-md border bg-card px-5 py-4 font-medium text-primary">Open PDF</a>
              )}
            </div>
            <div className="min-h-0 overflow-y-auto p-5">
              <div className="sticky top-0 z-10 -mx-5 -mt-5 flex items-start justify-between gap-4 border-b bg-background/95 px-5 py-4 backdrop-blur">
                <div>
                  <h2 className="text-xl font-semibold">Attachment details</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedItem.originalName}</p>
                </div>
                <button type="button" className="rounded-md p-2 hover:bg-muted" onClick={() => setSelectedItem(null)} aria-label="Close">
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-4 grid gap-3 rounded-md border bg-muted/40 p-3 text-sm">
                <div className="grid grid-cols-[112px_1fr] gap-3">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">{selectedItem.mimeType}</span>
                </div>
                <div className="grid grid-cols-[112px_1fr] gap-3">
                  <span className="text-muted-foreground">Size</span>
                  <span>{fileSize(selectedItem.fileSize)}</span>
                </div>
                <div className="grid grid-cols-[112px_1fr] gap-3">
                  <span className="text-muted-foreground">Uploaded</span>
                  <span>{dateLabel(selectedItem.createdAt)}</span>
                </div>
                <div className="grid grid-cols-[112px_1fr] gap-3">
                  <span className="text-muted-foreground">Uploaded by</span>
                  <span className="truncate">{selectedItem.uploadedBy ?? "Admin"}</span>
                </div>
                <div className="grid grid-cols-[112px_1fr] gap-3">
                  <span className="text-muted-foreground">File name</span>
                  <span className="break-all">{selectedItem.originalName}</span>
                </div>
                {selectedItem.width && selectedItem.height ? (
                  <div className="grid grid-cols-[112px_1fr] gap-3">
                    <span className="text-muted-foreground">Dimensions</span>
                    <span>{selectedItem.width} x {selectedItem.height}</span>
                  </div>
                ) : null}
                <label className="grid gap-1">
                  <span className="text-muted-foreground">File URL</span>
                  <div className="flex gap-2">
                    <input readOnly className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" value={mediaUrl(selectedItem.fileUrl)} onFocus={(event) => event.currentTarget.select()} />
                    <Button type="button" variant="outline" size="sm" onClick={() => void copyUrl(selectedItem.fileUrl)}>
                      <Copy className="h-4 w-4" aria-hidden="true" />
                      Copy
                    </Button>
                  </div>
                </label>
                <div className="grid grid-cols-[112px_1fr] gap-3">
                  <span className="text-muted-foreground">Used in</span>
                  <span>Not attached</span>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <label className="block text-sm font-medium">
                  <span>Title</span>
                  <input className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={editingItem.title} onChange={(event) => setEditingItem({ ...editingItem, title: event.target.value })} />
                </label>
                {editingItem.mediaType === "image" ? (
                  <label className="block text-sm font-medium">
                    <span>Alt text</span>
                    <input className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={editingItem.altText ?? ""} onChange={(event) => setEditingItem({ ...editingItem, altText: event.target.value })} />
                  </label>
                ) : null}
                <label className="block text-sm font-medium">
                  <span>Caption</span>
                  <textarea className="mt-1 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm" value={editingItem.caption ?? ""} onChange={(event) => setEditingItem({ ...editingItem, caption: event.target.value })} />
                </label>
                <label className="block text-sm font-medium">
                  <span>Description</span>
                  <textarea className="mt-1 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm" value={editingItem.description ?? ""} onChange={(event) => setEditingItem({ ...editingItem, description: event.target.value })} />
                </label>
              </div>

              <div className="mt-5 grid gap-3 rounded-md border bg-muted/30 p-3">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" disabled={!items[items.findIndex((item) => item.id === selectedItem.id) - 1]} onClick={() => moveSelection(-1)}>
                    Previous
                  </Button>
                  <Button type="button" variant="outline" disabled={!items[items.findIndex((item) => item.id === selectedItem.id) + 1]} onClick={() => moveSelection(1)}>
                    Next
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void copyUrl(selectedItem.fileUrl)}>
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    Copy URL
                  </Button>
                  <Button asChild type="button" variant="outline">
                    <a href={mediaUrl(selectedItem.fileUrl)} download>
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Download
                    </a>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 border-t pt-3">
                  <Button type="submit">
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Update details
                  </Button>
                  <Button asChild type="button" variant="outline">
                    <Link href={`/admin/gallery/${selectedItem.id}`}>Edit more details</Link>
                  </Button>
                  <Button type="button" variant="outline" onClick={() => replaceInputRef.current?.click()}>Replace media</Button>
                  <input ref={replaceInputRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.mp4,.webm,.pdf" onChange={(event) => void replaceSelectedMedia(event.target.files)} />
                </div>
                {selectedItem.mediaType === "image" ? (
                  <div className="flex flex-wrap gap-2 border-t pt-3">
                    <Button type="button" variant="outline" onClick={() => void regenerateSelectedMedia()}>
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                      Regenerate thumbnails
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setImageEditorOpen(true)}>
                      Edit image
                    </Button>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2 border-t pt-3">
                  <Button type="button" variant="destructive" onClick={() => void deleteItems([selectedItem.id])}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete permanently
                  </Button>
                </div>
              </div>
            </div>
          </form>
          {imageEditorOpen && selectedItem.mediaType === "image" ? (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4">
              <div className="w-full max-w-3xl overflow-hidden rounded-2xl border bg-background shadow-2xl">
                <div className="flex items-center justify-between border-b px-5 py-4">
                  <div>
                    <h3 className="text-lg font-semibold">Edit image</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedItem.originalName}</p>
                  </div>
                  <button type="button" className="rounded-md p-2 hover:bg-muted" onClick={() => setImageEditorOpen(false)} aria-label="Close image editor">
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
                <div className="max-h-[calc(100vh-9rem)] overflow-y-auto p-5">
                  <ImageEditTools item={selectedItem} onEdit={editSelectedImage} />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
