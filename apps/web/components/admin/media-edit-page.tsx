"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, Download, FileText, PlaySquare, RefreshCw, Trash2, Upload, X } from "lucide-react";
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

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
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
    return <img src={mediaUrl(item.fileUrl)} alt={item.altText ?? item.title} className="max-h-[64vh] max-w-full rounded object-contain" />;
  }
  if (item.mediaType === "video") {
    return <video src={mediaUrl(item.fileUrl)} controls className="max-h-[64vh] max-w-full rounded" preload="metadata" />;
  }
  return (
    <a href={mediaUrl(item.fileUrl)} target="_blank" rel="noreferrer" className="flex h-64 w-full max-w-md items-center justify-center gap-3 rounded-md border bg-card text-primary">
      <FileText className="h-8 w-8" aria-hidden="true" />
      Open document
    </a>
  );
}

export function MediaEditPage({ id }: { id: string }) {
  const router = useRouter();
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [item, setItem] = useState<MediaAsset | null>(null);
  const [form, setForm] = useState<MediaAsset | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageEditorOpen, setImageEditorOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await apiRequest<MediaAsset>(`/admin/website/media/${id}`);
      setItem(data);
      setForm(data);
      setImageEditorOpen(false);
      setError(null);
    } catch {
      setError("Media item was not found.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    const updated = await apiRequest<MediaAsset>(`/admin/website/media/${form.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: form.title,
        altText: form.altText,
        caption: form.caption,
        description: form.description
      })
    });
    setItem(updated);
    setForm(updated);
    setMessage("Media details updated successfully.");
  }

  async function copyUrl() {
    if (!item) return;
    await copyTextToClipboard(mediaUrl(item.fileUrl));
    setMessage("URL copied to clipboard.");
  }

  async function replaceMedia(files: FileList | null) {
    if (!item || !files?.[0]) return;
    const file = files[0];
    if (file.size > maxFileSize) {
      setError("Each file must be less than 2MB.");
      return;
    }
    if (!allowedTypes.has(file.type)) {
      setError("Unsupported file type.");
      return;
    }
    const body = new FormData();
    body.append("file", file);
    const token = getAccessToken();
    const response = await fetch(`${apiBaseUrl}/api/admin/website/media/${item.id}/replace`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: "include",
      body
    });
    if (!response.ok) {
      setError("Upload failed. Please try again.");
      return;
    }
    const updated = (await response.json()) as MediaAsset;
    setItem(updated);
    setForm(updated);
    setError(null);
    setMessage("Media replaced successfully.");
  }

  async function regenerateThumbnails() {
    if (!item) return;
    const updated = await apiRequest<MediaAsset>(`/admin/website/media/${item.id}/regenerate-thumbnails`, { method: "POST" });
    setItem(updated);
    setForm(updated);
    setMessage("Thumbnails regenerated successfully.");
  }

  async function editImage(input: { rotate?: number; flipHorizontal?: boolean; flipVertical?: boolean; resizeWidth?: number; crop?: { left: number; top: number; width: number; height: number }; saveAsCopy?: boolean; restoreOriginal?: boolean }) {
    if (!item) return;
    const updated = await apiRequest<MediaAsset>(`/admin/website/media/${item.id}/edit-image`, {
      method: "POST",
      body: JSON.stringify(input)
    });
    setItem(updated);
    setForm(updated);
    setMessage(input.saveAsCopy ? "Edited copy created successfully." : "Image updated successfully.");
  }

  async function deletePermanently() {
    if (!item) return;
    if (!window.confirm("Are you sure you want to delete this media permanently? If this media is used somewhere, it may stop showing there.")) return;
    await apiRequest(`/admin/website/media/${item.id}/delete`, { method: "POST" });
    router.push("/admin/gallery");
  }

  if (loading) return <div className="rounded-md border bg-card p-5 text-sm text-muted-foreground">Loading media details...</div>;
  if (!item || !form) return <div className="rounded-md border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error ?? "Media item was not found."}</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button asChild variant="ghost" className="mb-2 px-0">
            <Link href="/admin/gallery">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to media library
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold tracking-normal">Edit Media</h1>
          <p className="mt-1 text-sm text-muted-foreground">{item.originalName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={copyUrl}>
            <Copy className="h-4 w-4" aria-hidden="true" />
            Copy URL
          </Button>
          <Button asChild type="button" variant="outline">
            <a href={mediaUrl(item.fileUrl)} download>
              <Download className="h-4 w-4" aria-hidden="true" />
              Download
            </a>
          </Button>
        </div>
      </div>

      {message ? <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</div> : null}
      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardContent className="flex min-h-[440px] items-center justify-center bg-muted p-5">
            <MediaPreview item={item} />
          </CardContent>
        </Card>

        <form className="space-y-5" onSubmit={save}>
          <Card>
            <CardContent className="space-y-3 p-5">
              <h2 className="text-lg font-semibold">File information</h2>
              <div className="grid gap-3 rounded-md border bg-muted/40 p-3 text-sm">
                <div className="grid grid-cols-[120px_1fr] gap-3">
                  <span className="text-muted-foreground">Uploaded</span>
                  <span>{dateLabel(item.createdAt)}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-3">
                  <span className="text-muted-foreground">Uploaded by</span>
                  <span className="truncate">{item.uploadedBy ?? "Admin"}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-3">
                  <span className="text-muted-foreground">File name</span>
                  <span className="break-all">{item.originalName}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-3">
                  <span className="text-muted-foreground">File type</span>
                  <span className="font-medium">{item.mimeType}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-3">
                  <span className="text-muted-foreground">File size</span>
                  <span>{fileSize(item.fileSize)}</span>
                </div>
                {item.width && item.height ? (
                  <div className="grid grid-cols-[120px_1fr] gap-3">
                    <span className="text-muted-foreground">Dimensions</span>
                    <span>{item.width} x {item.height}</span>
                  </div>
                ) : null}
                {item.mediaType === "video" ? (
                  <div className="flex items-center gap-2">
                    <PlaySquare className="h-4 w-4" aria-hidden="true" />
                    Video duration: unavailable
                  </div>
                ) : null}
                <label className="grid gap-1">
                  <span className="text-muted-foreground">File URL</span>
                  <div className="flex gap-2">
                    <input readOnly className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" value={mediaUrl(item.fileUrl)} onFocus={(event) => event.currentTarget.select()} />
                    <Button type="button" variant="outline" size="sm" onClick={() => void copyUrl()}>
                      <Copy className="h-4 w-4" aria-hidden="true" />
                      Copy
                    </Button>
                  </div>
                </label>
                <div className="grid grid-cols-[120px_1fr] gap-3">
                  <span className="text-muted-foreground">Used in</span>
                  <span>Not attached</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <label className="block text-sm font-medium">
                <span>Title</span>
                <input className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              </label>
              {form.mediaType === "image" ? (
                <label className="block text-sm font-medium">
                  <span>Alternative Text</span>
                  <input className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.altText ?? ""} onChange={(event) => setForm({ ...form, altText: event.target.value })} />
                </label>
              ) : null}
              <label className="block text-sm font-medium">
                <span>Caption</span>
                <textarea className="mt-1 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.caption ?? ""} onChange={(event) => setForm({ ...form, caption: event.target.value })} />
              </label>
              <label className="block text-sm font-medium">
                <span>Description</span>
                <textarea className="mt-1 min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </label>
              <Button type="submit">
                <Check className="h-4 w-4" aria-hidden="true" />
                Save/update
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="text-lg font-semibold">Media actions</h2>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => replaceInputRef.current?.click()}>
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Replace media
                </Button>
                <input ref={replaceInputRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.mp4,.webm,.pdf" onChange={(event) => void replaceMedia(event.target.files)} />
                {item.mediaType === "image" ? (
                  <>
                    <Button type="button" variant="outline" onClick={() => void regenerateThumbnails()}>
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                      Regenerate thumbnails
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setImageEditorOpen(true)}>Edit image</Button>
                  </>
                ) : null}
                <Button type="button" variant="destructive" onClick={() => void deletePermanently()}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete permanently
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
      {imageEditorOpen && item.mediaType === "image" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold">Edit image</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.originalName}</p>
              </div>
              <button type="button" className="rounded-md p-2 hover:bg-muted" onClick={() => setImageEditorOpen(false)} aria-label="Close image editor">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="max-h-[calc(100vh-9rem)] overflow-y-auto p-5">
              <ImageEditTools item={item} onEdit={editImage} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
