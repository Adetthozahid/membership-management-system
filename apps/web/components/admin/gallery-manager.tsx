"use client";

import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, Eye, EyeOff, Grid2X2, Image as ImageIcon, Images, List, Plus, Save, Search, Trash2, Upload, X } from "lucide-react";
import { apiRequest, uploadGalleryPhoto } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageEditTools } from "@/components/admin/image-edit-tools";

type GalleryPhoto = {
  id: string;
  albumId: string;
  title: string;
  caption: string | null;
  imageUrl: string;
  thumbnailUrl: string;
  originalFileName?: string;
  mimeType?: string;
  fileSize: number;
  width: number;
  height: number;
  published: boolean;
  sortOrder: number;
  uploading?: boolean;
};

type GalleryAlbum = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  published: boolean;
  sortOrder: number;
  photos: GalleryPhoto[];
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function mediaUrl(url: string) {
  if (url.startsWith("http") || url.startsWith("blob:") || url.startsWith("data:")) return url;
  return `${apiBaseUrl}${url}`;
}

function fileSize(value: number) {
  if (!value) return "";
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)} MB`;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

function isCommonAlbum(album: GalleryAlbum) {
  return album.slug === "common-photos" || album.title.trim().toLowerCase() === "common photos";
}

type GalleryManagerMode = "gallery" | "albums";

type DeleteRequest =
  | { type: "album"; album: GalleryAlbum }
  | { type: "photos"; ids: string[] };

type PhotoEditHistory = {
  past: GalleryPhoto[];
  future: GalleryPhoto[];
};

export function GalleryManager({ mode = "albums", compact = false }: { mode?: GalleryManagerMode; compact?: boolean }) {
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState("");
  const [newAlbumTitle, setNewAlbumTitle] = useState("");
  const [newAlbumDescription, setNewAlbumDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [albumModalOpen, setAlbumModalOpen] = useState(false);
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [photoView, setPhotoView] = useState<"grid" | "list">("grid");
  const [photoSearch, setPhotoSearch] = useState("");
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [photoImageEditorOpen, setPhotoImageEditorOpen] = useState(false);
  const [photoImageEditing, setPhotoImageEditing] = useState(false);
  const [photoEditHistory, setPhotoEditHistory] = useState<Record<string, PhotoEditHistory>>({});
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(null);
  const commonAlbum = useMemo(() => albums.find(isCommonAlbum) ?? null, [albums]);
  const managedAlbums = useMemo(() => (mode === "gallery" ? (commonAlbum ? [commonAlbum] : []) : albums.filter((album) => !isCommonAlbum(album))), [albums, commonAlbum, mode]);
  const selectedAlbum = useMemo(
    () => (mode === "gallery" ? commonAlbum : managedAlbums.find((album) => album.id === selectedAlbumId) ?? managedAlbums[0] ?? null),
    [commonAlbum, managedAlbums, mode, selectedAlbumId]
  );
  const editingAlbum = useMemo(() => managedAlbums.find((album) => album.id === editingAlbumId) ?? null, [editingAlbumId, managedAlbums]);
  const selectedPhotoSet = useMemo(() => new Set(selectedPhotoIds), [selectedPhotoIds]);
  const filteredGalleryPhotos = useMemo(() => {
    const needle = photoSearch.trim().toLowerCase();
    const photos = selectedAlbum?.photos ?? [];
    if (!needle) return photos;
    return photos.filter(
      (photo) =>
        photo.title.toLowerCase().includes(needle) ||
        (photo.caption ?? "").toLowerCase().includes(needle) ||
        (photo.originalFileName ?? "").toLowerCase().includes(needle)
    );
  }, [photoSearch, selectedAlbum]);
  const editingPhoto = useMemo(() => selectedAlbum?.photos.find((photo) => photo.id === editingPhotoId) ?? null, [editingPhotoId, selectedAlbum]);
  const editingPhotoHistory = editingPhotoId ? photoEditHistory[editingPhotoId] ?? { past: [], future: [] } : { past: [], future: [] };

  useEffect(() => {
    async function load() {
      try {
        let data = await apiRequest<GalleryAlbum[]>("/admin/website/gallery/albums");
        let common = data.find(isCommonAlbum);
        if (mode === "gallery" && !common) {
          common = await apiRequest<GalleryAlbum>("/admin/website/gallery/albums", {
            method: "POST",
            body: JSON.stringify({
              title: "Common Photos",
              description: "General gallery photos.",
              published: true,
              sortOrder: -1000
            })
          });
          data = [common, ...data];
        }
        const visibleAlbums = mode === "gallery" ? data.filter(isCommonAlbum) : data.filter((album) => !isCommonAlbum(album));
        setAlbums(data);
        setSelectedAlbumId(visibleAlbums[0]?.id ?? "");
      } catch {
        setMessage("Could not load gallery albums.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [mode]);

  function updateAlbum(id: string, patch: Partial<GalleryAlbum>) {
    setAlbums((current) => current.map((album) => (album.id === id ? { ...album, ...patch } : album)));
  }

  function updatePhoto(id: string, patch: Partial<GalleryPhoto>) {
    setAlbums((current) =>
      current.map((album) => ({
        ...album,
        photos: album.photos.map((photo) => (photo.id === id ? { ...photo, ...patch } : photo))
      }))
    );
  }

  async function createAlbum(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    try {
      const created = await apiRequest<GalleryAlbum>("/admin/website/gallery/albums", {
        method: "POST",
        body: JSON.stringify({
          title: newAlbumTitle,
          description: newAlbumDescription,
          published: true,
          sortOrder: albums.length * 10
        })
      });
      setAlbums((current) => [...current, created]);
      setSelectedAlbumId(created.id);
      setEditingAlbumId(created.id);
      setNewAlbumTitle("");
      setNewAlbumDescription("");
      setAlbumModalOpen(false);
      setMessage("Gallery album created.");
    } catch {
      setMessage("Could not create gallery album.");
    }
  }

  async function saveAlbum(album: GalleryAlbum) {
    setMessage(null);
    try {
      const updated = await apiRequest<GalleryAlbum>(`/admin/website/gallery/albums/${album.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: album.title,
          description: album.description,
          coverUrl: album.coverUrl,
          published: album.published,
          sortOrder: album.sortOrder
        })
      });
      setAlbums((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedAlbumId(updated.id);
      setMessage("Gallery album saved.");
    } catch {
      setMessage("Could not save gallery album.");
    }
  }

  async function removeAlbum(album: GalleryAlbum) {
    setMessage(null);
    try {
      await apiRequest(`/admin/website/gallery/albums/${album.id}/delete`, { method: "POST" });
      const nextAlbums = albums.filter((item) => item.id !== album.id);
      setAlbums(nextAlbums);
      setSelectedAlbumId(nextAlbums[0]?.id ?? "");
      setEditingAlbumId((current) => (current === album.id ? null : current));
      setMessage("Gallery album removed.");
    } catch {
      setMessage("Could not remove gallery album.");
    }
  }

  function confirmRemoveAlbum(album: GalleryAlbum) {
    setDeleteRequest({ type: "album", album });
  }

  async function uploadFiles(files: File[]) {
    if (!files.length || !selectedAlbum) return;
    const imageFiles = files.filter((file) => ["image/png", "image/jpeg", "image/webp"].includes(file.type));
    if (imageFiles.length !== files.length) {
      setMessage("Gallery accepts PNG, JPG, or WebP photos. Upload videos from the Media tab for now.");
    }
    for (const [index, file] of imageFiles.entries()) {
    const previewUrl = URL.createObjectURL(file);
    const temporaryId = `uploading-${Date.now()}-${index}`;
    const optimisticPhoto: GalleryPhoto = {
      id: temporaryId,
      albumId: selectedAlbum.id,
      title: file.name.replace(/\.[^.]+$/, ""),
      caption: null,
      imageUrl: previewUrl,
      thumbnailUrl: previewUrl,
      originalFileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      width: 0,
      height: 0,
      published: true,
      sortOrder: (selectedAlbum.photos.length + index) * 10,
      uploading: true
    };
    setMessage(null);
    setAlbums((current) =>
      current.map((album) =>
        album.id === selectedAlbum.id
          ? {
              ...album,
              coverUrl: album.coverUrl ?? previewUrl,
              photos: [...album.photos, optimisticPhoto]
            }
          : album
      )
    );
    try {
      const photo = await uploadGalleryPhoto(selectedAlbum.id, file, {
        title: optimisticPhoto.title,
        caption: "",
        published: true,
        sortOrder: optimisticPhoto.sortOrder
      });
      setAlbums((current) =>
        current.map((album) =>
          album.id === selectedAlbum.id
            ? {
                ...album,
                coverUrl: album.coverUrl === previewUrl ? photo.thumbnailUrl : album.coverUrl,
                photos: album.photos.map((item) => (item.id === temporaryId ? photo : item))
              }
            : album
        )
      );
      setMessage("Photo uploaded and compressed.");
    } catch {
      setAlbums((current) =>
        current.map((album) =>
          album.id === selectedAlbum.id
            ? {
                ...album,
                coverUrl: album.coverUrl === previewUrl ? null : album.coverUrl,
                photos: album.photos.filter((item) => item.id !== temporaryId)
              }
            : album
        )
      );
      setMessage("Photo upload failed. Use PNG, JPG, or WebP up to 12MB.");
    } finally {
      URL.revokeObjectURL(previewUrl);
    }
    }
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    await uploadFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    void uploadFiles(Array.from(event.dataTransfer.files));
  }

  async function savePhoto(photo: GalleryPhoto) {
    setMessage(null);
    try {
      const updated = await apiRequest<GalleryPhoto>(`/admin/website/gallery/photos/${photo.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: photo.title,
          caption: photo.caption,
          published: photo.published,
          sortOrder: photo.sortOrder
        })
      });
      updatePhoto(updated.id, updated);
      setMessage("Photo saved.");
    } catch {
      setMessage("Could not save photo.");
    }
  }

  async function removePhoto(photo: GalleryPhoto) {
    setMessage(null);
    try {
      await apiRequest(`/admin/website/gallery/photos/${photo.id}/delete`, { method: "POST" });
      setAlbums((current) =>
        current.map((album) =>
          album.id === photo.albumId
            ? {
                ...album,
                photos: album.photos.filter((item) => item.id !== photo.id)
              }
            : album
        )
      );
      setMessage("Photo removed.");
    } catch {
      setMessage("Could not remove photo.");
    }
  }

  function togglePhotoSelected(id: string) {
    setSelectedPhotoIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function removePhotos(ids: string[]) {
    if (!ids.length) return;
    setDeleteRequest({ type: "photos", ids });
  }

  async function deletePhotosNow(ids: string[]) {
    const photos = selectedAlbum?.photos.filter((photo) => ids.includes(photo.id)) ?? [];
    for (const photo of photos) {
      await removePhoto(photo);
    }
    setSelectedPhotoIds([]);
    setEditingPhotoId(null);
  }

  async function confirmDeleteRequest() {
    const request = deleteRequest;
    if (!request) return;
    setDeleteRequest(null);
    if (request.type === "album") {
      await removeAlbum(request.album);
      return;
    }
    await deletePhotosNow(request.ids);
  }

  async function copyPhotoUrl(photo: GalleryPhoto) {
    const value = mediaUrl(photo.imageUrl);
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        setMessage("Photo URL copied.");
        return;
      } catch {
        // Fallback below.
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
    setMessage("Photo URL copied.");
  }

  async function editGalleryPhotoImage(input: {
    rotate?: number;
    flipHorizontal?: boolean;
    flipVertical?: boolean;
    resizeWidth?: number;
    crop?: { left: number; top: number; width: number; height: number };
    saveAsCopy?: boolean;
  }) {
    if (!editingPhoto || !selectedAlbum) return;
    setPhotoImageEditing(true);
    try {
      const previousPhoto = editingPhoto;
      const updated = await apiRequest<GalleryPhoto>(`/admin/website/gallery/photos/${editingPhoto.id}/edit-image`, {
        method: "POST",
        body: JSON.stringify(input)
      });
      setAlbums((current) =>
        current.map((album) => {
          if (album.id !== updated.albumId) return album;
          const exists = album.photos.some((photo) => photo.id === updated.id);
          return {
            ...album,
            coverUrl: album.coverUrl === editingPhoto.thumbnailUrl ? updated.thumbnailUrl : album.coverUrl,
            photos: exists ? album.photos.map((photo) => (photo.id === updated.id ? updated : photo)) : [...album.photos, updated]
          };
        })
      );
      setEditingPhotoId(updated.id);
      if (!input.saveAsCopy) {
        setPhotoEditHistory((current) => ({
          ...current,
          [updated.id]: {
            past: [...(current[updated.id]?.past ?? []), previousPhoto],
            future: []
          }
        }));
      }
      setMessage("Image updated successfully.");
    } catch {
      setMessage("Image edit failed. Please reload the admin panel and try again.");
    } finally {
      setPhotoImageEditing(false);
    }
  }

  function replacePhotoInState(photo: GalleryPhoto) {
    setAlbums((current) =>
      current.map((album) =>
        album.id === photo.albumId
          ? {
              ...album,
              photos: album.photos.map((item) => (item.id === photo.id ? photo : item))
            }
          : album
      )
    );
    setEditingPhotoId(photo.id);
  }

  async function restorePhotoVersion(photo: GalleryPhoto) {
    const restored = await apiRequest<GalleryPhoto>(`/admin/website/gallery/photos/${photo.id}/restore-image`, {
      method: "POST",
      body: JSON.stringify({
        imageUrl: photo.imageUrl,
        thumbnailUrl: photo.thumbnailUrl,
        mimeType: photo.mimeType,
        fileSize: photo.fileSize,
        width: photo.width,
        height: photo.height
      })
    });
    replacePhotoInState(restored);
    return restored;
  }

  async function undoPhotoEdit() {
    if (!editingPhoto) return;
    const history = photoEditHistory[editingPhoto.id] ?? { past: [], future: [] };
    const previous = history.past[history.past.length - 1];
    if (!previous) return;
    setPhotoImageEditing(true);
    try {
      await restorePhotoVersion(previous);
      setPhotoEditHistory((current) => ({
        ...current,
        [editingPhoto.id]: {
          past: history.past.slice(0, -1),
          future: [editingPhoto, ...history.future]
        }
      }));
      setMessage("Image edit undone.");
    } catch {
      setMessage("Undo failed. Please try again.");
    } finally {
      setPhotoImageEditing(false);
    }
  }

  async function redoPhotoEdit() {
    if (!editingPhoto) return;
    const history = photoEditHistory[editingPhoto.id] ?? { past: [], future: [] };
    const next = history.future[0];
    if (!next) return;
    setPhotoImageEditing(true);
    try {
      await restorePhotoVersion(next);
      setPhotoEditHistory((current) => ({
        ...current,
        [editingPhoto.id]: {
          past: [...history.past, editingPhoto],
          future: history.future.slice(1)
        }
      }));
      setMessage("Image edit redone.");
    } catch {
      setMessage("Redo failed. Please try again.");
    } finally {
      setPhotoImageEditing(false);
    }
  }

  if (loading) {
    return <div className="rounded-md border bg-card p-5 text-sm text-muted-foreground">Loading gallery controls...</div>;
  }

  const totalPhotos = managedAlbums.reduce((sum, album) => sum + album.photos.length, 0);
  const publishedAlbums = managedAlbums.filter((album) => album.published).length;
  const isGalleryMode = mode === "gallery";

  return (
    <div className="space-y-6">
      {!compact ? (
      <section className="overflow-hidden rounded-[28px] border bg-[linear-gradient(135deg,#ffffff_0%,#f8fbfa_54%,hsl(var(--primary)/0.08)_100%)] shadow-[0_22px_70px_rgba(15,23,42,0.07)]">
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-end lg:p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Frontend Gallery</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">{isGalleryMode ? "Gallery Photos" : "Albums and Photo Arrangement"}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {isGalleryMode
                ? "Upload and manage all direct gallery photos."
                : "Create albums, upload photos, set publish status, and control what appears on the public gallery page."}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {(isGalleryMode
              ? [
                  ["Gallery", managedAlbums.length ? 1 : 0],
                  ["Live", selectedAlbum?.photos.filter((photo) => photo.published).length ?? 0],
                  ["Photos", totalPhotos]
                ]
              : [
                  ["Albums", managedAlbums.length],
                  ["Published", publishedAlbums],
                  ["Photos", totalPhotos]
                ]
            ).map(([label, value]) => (
              <div key={label} className="min-w-24 rounded-2xl border bg-white/85 px-4 py-3 shadow-sm">
                <p className="text-2xl font-semibold text-slate-950">{value}</p>
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      ) : (
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{isGalleryMode ? "Direct upload" : "Make album"}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">{isGalleryMode ? "Gallery Photos" : "Create or Edit Albums"}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {isGalleryMode
              ? "Upload single or multiple photos here. These appear under All on the website gallery."
              : "Create a new album or edit an existing album with its own photos."}
          </p>
        </div>
      )}

      {message ? (
        <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm font-medium text-primary">{message}</div>
      ) : null}

      <div className={`grid gap-5 ${isGalleryMode ? "" : "xl:grid-cols-[340px_minmax(0,1fr)]"}`}>
        {!isGalleryMode ? (
        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <Card className="rounded-[24px] border-slate-200/80 bg-white/95">
            <CardContent className="p-4">
              <Button type="button" className="w-full" onClick={() => setAlbumModalOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add album
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border-slate-200/80 bg-white/95">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Images className="h-5 w-5 text-primary" aria-hidden="true" />
                Albums
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {managedAlbums.length ? (
                managedAlbums.map((album) => {
                  const active = album.id === selectedAlbum?.id;
                  return (
                    <div
                      key={album.id}
                      className={`group rounded-2xl border p-3 text-left text-sm transition ${
                        active ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/15" : "bg-white text-slate-600 hover:border-primary/30 hover:bg-primary/5 hover:text-slate-950"
                      }`}
                    >
                      <button
                        type="button"
                        className="block w-full text-left"
                        onClick={() => {
                          setSelectedAlbumId(album.id);
                          setEditingAlbumId(album.id);
                        }}
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{album.title}</span>
                            <span className={`mt-1 block text-xs ${active ? "text-white/72" : "text-muted-foreground"}`}>
                              {album.photos.length} photo{album.photos.length === 1 ? "" : "s"}
                            </span>
                          </span>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${album.published ? active ? "bg-white/18 text-white" : "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500"}`}>
                            {album.published ? "Live" : "Hidden"}
                          </span>
                        </span>
                      </button>
                      <div className={`mt-3 flex items-center justify-between border-t pt-2 ${active ? "border-white/20" : "border-slate-100"}`}>
                        <button
                          type="button"
                          className={`text-xs font-semibold ${active ? "text-white/80 hover:text-white" : "text-primary hover:text-primary/80"}`}
                          onClick={() => {
                            setSelectedAlbumId(album.id);
                            setEditingAlbumId(album.id);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`text-xs font-semibold ${active ? "text-red-100 hover:text-white" : "text-red-600 hover:text-red-700"}`}
                          onClick={() => confirmRemoveAlbum(album)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-2xl border border-dashed bg-slate-50 p-4 text-sm text-muted-foreground">No albums yet.</p>
              )}
            </CardContent>
          </Card>
        </aside>
        ) : null}

        {selectedAlbum ? (
          <section className="space-y-5">
            {!isGalleryMode ? (
              <Card className="rounded-[26px] border-slate-200/80 bg-white/95">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Images className="h-5 w-5 text-primary" aria-hidden="true" />
                    Saved albums
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {managedAlbums.map((album) => (
                    <div
                      key={album.id}
                      className="group overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
                    >
                      <button
                        type="button"
                        className="block w-full text-left"
                        onClick={() => {
                          setSelectedAlbumId(album.id);
                          setEditingAlbumId(album.id);
                        }}
                      >
                      <span className="block overflow-hidden bg-primary/5">
                        {album.coverUrl || album.photos[0]?.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mediaUrl(album.coverUrl ?? album.photos[0].thumbnailUrl)} alt="" className="aspect-[4/3] w-full object-cover transition group-hover:scale-[1.02]" loading="lazy" />
                        ) : (
                          <span className="flex aspect-[4/3] items-center justify-center text-primary">
                            <ImageIcon className="h-9 w-9" aria-hidden="true" />
                          </span>
                        )}
                      </span>
                      <span className="block space-y-2 p-4">
                        <span className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-slate-950">{album.title}</span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {album.photos.length} photo{album.photos.length === 1 ? "" : "s"}
                            </span>
                          </span>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${album.published ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500"}`}>
                            {album.published ? "Live" : "Hidden"}
                          </span>
                        </span>
                      </span>
                      </button>
                      <div className="flex items-center justify-between border-t px-4 py-3">
                        <button
                          type="button"
                          className="text-xs font-semibold text-primary hover:text-primary/80"
                          onClick={() => {
                            setSelectedAlbumId(album.id);
                            setEditingAlbumId(album.id);
                          }}
                        >
                          Edit album
                        </button>
                        <button type="button" className="text-xs font-semibold text-red-600 hover:text-red-700" onClick={() => confirmRemoveAlbum(album)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {isGalleryMode ? (
              <>
            <div className="flex justify-end">
              <Button type="button" onClick={() => document.getElementById("gallery-photo-upload")?.click()}>
                <Upload className="h-4 w-4" aria-hidden="true" />
                Add New
              </Button>
            </div>

            <Card className="rounded-[26px] border-slate-200/80 bg-white/95">
              <CardContent className="p-0">
                <label
                  className={`m-4 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-6 text-center transition ${
                    dragging ? "border-primary bg-primary/5 text-primary" : "border-slate-300 bg-slate-50/80 text-slate-700 hover:border-primary/40 hover:bg-primary/5"
                  }`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                >
                  <Upload className="h-8 w-8" aria-hidden="true" />
                  <span className="mt-3 text-base font-semibold">{isGalleryMode ? "Add gallery photos" : "Add photos to this album"}</span>
                  <span className="mt-1 text-sm text-muted-foreground">Click to upload or drag and drop single/multiple photos</span>
                  <span className="mt-1 text-xs text-muted-foreground">PNG, JPG, WebP</span>
                  <input id="gallery-photo-upload" className="sr-only" type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={(event) => void uploadPhoto(event)} />
                </label>

                <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant={photoView === "grid" ? "default" : "outline"} size="icon" onClick={() => setPhotoView("grid")} aria-label="Grid view">
                      <Grid2X2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button type="button" variant={photoView === "list" ? "default" : "outline"} size="icon" onClick={() => setPhotoView("list")} aria-label="List view">
                      <List className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setSelectedPhotoIds(filteredGalleryPhotos.map((photo) => photo.id))}>
                      Bulk select
                    </Button>
                    {selectedPhotoIds.length ? (
                      <Button type="button" variant="destructive" onClick={() => void removePhotos(selectedPhotoIds)}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Delete selected ({selectedPhotoIds.length})
                      </Button>
                    ) : null}
                  </div>
                  <div className="relative min-w-0 xl:w-80">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Search photos" value={photoSearch} onChange={(event) => setPhotoSearch(event.target.value)} />
                  </div>
                </div>

                <div className="space-y-5 p-5 sm:p-6">
                  <div className="text-xs text-muted-foreground">Showing {filteredGalleryPhotos.length} of {selectedAlbum.photos.length} photos</div>

                  {photoView === "grid" ? (
                    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                      {filteredGalleryPhotos.map((photo) => (
                        <div key={photo.id} className={`group overflow-hidden rounded-md border bg-card ${selectedPhotoSet.has(photo.id) ? "ring-2 ring-primary" : ""}`}>
                          <button type="button" className="relative block aspect-square w-full bg-muted text-left" onClick={() => setEditingPhotoId(photo.id)}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={mediaUrl(photo.thumbnailUrl)} alt={photo.title} className={`h-full w-full object-cover ${photo.uploading ? "opacity-70" : ""}`} loading="lazy" />
                            <span className="absolute left-2 top-2">
                              <input aria-label={`Select ${photo.title}`} type="checkbox" checked={selectedPhotoSet.has(photo.id)} onClick={(event) => event.stopPropagation()} onChange={() => togglePhotoSelected(photo.id)} className="h-4 w-4" />
                            </span>
                            <span className={`absolute right-2 top-2 rounded px-2 py-1 text-[10px] font-bold uppercase ${photo.published ? "bg-primary text-primary-foreground" : "bg-black/60 text-white"}`}>
                              {photo.published ? "Live" : "Hidden"}
                            </span>
                            <span className="absolute inset-x-2 bottom-2 hidden rounded bg-black/70 px-2 py-1 text-xs font-medium text-white group-hover:block">Preview</span>
                          </button>
                          <div className="grid gap-1 p-2 text-xs">
                            <div className="truncate font-medium">{photo.title}</div>
                            <div className="text-muted-foreground">Image · {fileSize(photo.fileSize)}</div>
                            <div className="flex gap-2">
                              <button className="text-primary hover:underline" onClick={() => setEditingPhotoId(photo.id)}>Edit</button>
                              <button className="text-primary hover:underline" onClick={() => void copyPhotoUrl(photo)}>Copy URL</button>
                              <button className="text-red-700 hover:underline" onClick={() => void removePhotos([photo.id])}>Delete</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-md border">
                      <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="border-b bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="w-10 px-3 py-3"></th>
                            <th className="px-3 py-3">Photo</th>
                            <th className="px-3 py-3">Status</th>
                            <th className="px-3 py-3">Size</th>
                            <th className="px-3 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredGalleryPhotos.map((photo) => (
                            <tr key={photo.id} className="border-b last:border-0">
                              <td className="px-3 py-3"><input type="checkbox" checked={selectedPhotoSet.has(photo.id)} onChange={() => togglePhotoSelected(photo.id)} /></td>
                              <td className="px-3 py-3">
                                <button className="flex items-center gap-3 text-left" onClick={() => setEditingPhotoId(photo.id)}>
                                  <span className="h-12 w-12 overflow-hidden rounded border bg-muted">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={mediaUrl(photo.thumbnailUrl)} alt="" className="h-full w-full object-cover" loading="lazy" />
                                  </span>
                                  <span>
                                    <span className="block font-medium">{photo.title}</span>
                                    <span className="block text-xs text-muted-foreground">{photo.originalFileName ?? "Gallery photo"}</span>
                                  </span>
                                </button>
                              </td>
                              <td className="px-3 py-3">{photo.published ? "Live" : "Hidden"}</td>
                              <td className="px-3 py-3">{fileSize(photo.fileSize)}</td>
                              <td className="px-3 py-3">
                                <div className="flex gap-2">
                                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingPhotoId(photo.id)}>Edit</Button>
                                  <Button type="button" variant="outline" size="sm" onClick={() => void copyPhotoUrl(photo)}>Copy URL</Button>
                                  <Button type="button" variant="outline" size="sm" className="border-red-200 text-red-700" onClick={() => void removePhotos([photo.id])}>Delete</Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {!filteredGalleryPhotos.length ? (
                    <div className="rounded-[24px] border border-dashed bg-white/80 p-8 text-center text-sm text-muted-foreground">
                      <ImageIcon className="mx-auto h-10 w-10 text-primary/50" aria-hidden="true" />
                      <p className="mt-3 font-medium text-slate-700">No gallery photos found.</p>
                      <p className="mt-1">Upload photos above to publish them in the frontend gallery.</p>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
              </>
            ) : null}
          </section>
        ) : (
          <div className="rounded-[24px] border border-dashed bg-white/80 p-8 text-center text-sm text-muted-foreground">
            {isGalleryMode ? "Preparing Gallery Photos..." : "Create an album to start arranging frontend gallery photos."}
          </div>
        )}
      </div>
      {albumModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold">Add album</h3>
                <p className="mt-1 text-sm text-muted-foreground">Create a new frontend gallery album.</p>
              </div>
              <button type="button" className="rounded-md p-2 hover:bg-muted" onClick={() => setAlbumModalOpen(false)} aria-label="Close album modal">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <form className="space-y-4 p-5" onSubmit={createAlbum}>
              <label className="block text-sm">
                <span className="font-semibold">Album title</span>
                <input className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" value={newAlbumTitle} onChange={(event) => setNewAlbumTitle(event.target.value)} required />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Description</span>
                <textarea className="mt-2 min-h-24 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" value={newAlbumDescription} onChange={(event) => setNewAlbumDescription(event.target.value)} />
              </label>
              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setAlbumModalOpen(false)}>Cancel</Button>
                <Button type="submit">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Create album
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {deleteRequest ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border bg-background shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Confirm delete</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {deleteRequest.type === "album"
                    ? `Delete "${deleteRequest.album.title}" album permanently? Its photos will be removed from the website.`
                    : `Delete ${deleteRequest.ids.length} photo${deleteRequest.ids.length === 1 ? "" : "s"} permanently?`}
                </p>
              </div>
              <button type="button" className="rounded-md p-2 hover:bg-muted" onClick={() => setDeleteRequest(null)} aria-label="Close delete confirmation">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-wrap justify-end gap-2 px-5 py-4">
              <Button type="button" variant="outline" onClick={() => setDeleteRequest(null)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={() => void confirmDeleteRequest()}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete permanently
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {editingPhoto ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4">
          <div className="grid max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-2xl border bg-background shadow-2xl lg:grid-cols-[minmax(0,1.2fr)_420px]">
            <div className="flex min-h-[320px] items-center justify-center bg-muted p-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(editingPhoto.imageUrl)} alt={editingPhoto.title} className="max-h-[78vh] max-w-full rounded object-contain" />
            </div>
            <div className="min-h-0 overflow-y-auto">
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-background/95 px-5 py-4 backdrop-blur">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold">{photoImageEditorOpen ? "Edit image" : "Photo details"}</h3>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{photoImageEditorOpen ? "Crop, resize, rotate or flip this photo." : editingPhoto.originalFileName ?? editingPhoto.title}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {photoImageEditorOpen ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => setPhotoImageEditorOpen(false)}>
                      Exit edit mode
                    </Button>
                  ) : null}
              <button
                type="button"
                className="rounded-md p-2 hover:bg-muted"
                onClick={() => {
                  setEditingPhotoId(null);
                  setPhotoImageEditorOpen(false);
                }}
                aria-label="Close photo editor"
              >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
                </div>
              </div>
              <div className="space-y-4 p-5">
                {photoImageEditorOpen ? (
                  <>
                    {photoImageEditing ? (
                      <div className="rounded-md border border-primary/10 bg-primary/5 p-3 text-sm font-medium text-primary">Applying image edit...</div>
                    ) : null}
                    <ImageEditTools
                      item={{
                        id: editingPhoto.id,
                        title: editingPhoto.title,
                        width: editingPhoto.width,
                        height: editingPhoto.height,
                        originalUrl: null
                      }}
                      onEdit={editGalleryPhotoImage}
                      disabled={photoImageEditing}
                      onUndo={undoPhotoEdit}
                      onRedo={redoPhotoEdit}
                      canUndo={editingPhotoHistory.past.length > 0}
                      canRedo={editingPhotoHistory.future.length > 0}
                    />
                  </>
                ) : (
                  <>
                <div className="grid gap-3 rounded-md border bg-muted/40 p-3 text-sm">
                  <div className="grid grid-cols-[90px_1fr] gap-3">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium">{editingPhoto.mimeType ?? "image"}</span>
                  </div>
                  <div className="grid grid-cols-[90px_1fr] gap-3">
                    <span className="text-muted-foreground">Size</span>
                    <span>{fileSize(editingPhoto.fileSize)}</span>
                  </div>
                  <div className="grid grid-cols-[90px_1fr] gap-3">
                    <span className="text-muted-foreground">Dimension</span>
                    <span>{editingPhoto.width && editingPhoto.height ? `${editingPhoto.width} x ${editingPhoto.height}` : "Unknown"}</span>
                  </div>
                  <label className="grid gap-1">
                    <span className="text-muted-foreground">File URL</span>
                    <div className="flex gap-2">
                      <input readOnly className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" value={mediaUrl(editingPhoto.imageUrl)} onFocus={(event) => event.currentTarget.select()} />
                      <Button type="button" variant="outline" size="sm" onClick={() => void copyPhotoUrl(editingPhoto)}>
                        <Copy className="h-4 w-4" aria-hidden="true" />
                        Copy
                      </Button>
                    </div>
                  </label>
                </div>

                <label className="block text-sm font-medium">
                  <span>Title</span>
                  <input className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={editingPhoto.title} onChange={(event) => updatePhoto(editingPhoto.id, { title: event.target.value })} />
                </label>
                <label className="block text-sm font-medium">
                  <span>Caption</span>
                  <textarea className="mt-1 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm" value={editingPhoto.caption ?? ""} onChange={(event) => updatePhoto(editingPhoto.id, { caption: event.target.value })} />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium">
                    <span>Order</span>
                    <input className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" type="number" value={editingPhoto.sortOrder} onChange={(event) => updatePhoto(editingPhoto.id, { sortOrder: Number(event.target.value) })} />
                  </label>
                  <label className="flex h-10 items-center gap-2 self-end rounded-md border bg-muted/40 px-3 text-sm font-medium">
                    <input type="checkbox" checked={editingPhoto.published} onChange={(event) => updatePhoto(editingPhoto.id, { published: event.target.checked })} />
                    Published
                  </label>
                </div>

                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <Button type="button" disabled={editingPhoto.uploading} onClick={() => void savePhoto(editingPhoto)}>
                    <Save className="h-4 w-4" aria-hidden="true" />
                    Update details
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void copyPhotoUrl(editingPhoto)}>
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    Copy URL
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setPhotoImageEditorOpen(true)}>
                    Edit image
                  </Button>
                  <Button type="button" variant="outline" className="border-red-200 text-red-700" disabled={editingPhoto.uploading} onClick={() => void removePhotos([editingPhoto.id])}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete
                  </Button>
                </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {editingAlbum ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold">Edit album</h3>
                <p className="mt-1 truncate text-sm text-muted-foreground">{editingAlbum.title}</p>
              </div>
              <button type="button" className="rounded-md p-2 hover:bg-muted" onClick={() => setEditingAlbumId(null)} aria-label="Close album editor">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-5 overflow-y-auto p-5">
              <Card className="overflow-hidden rounded-[26px] border-slate-200/80 bg-white/95">
                <div className="grid gap-5 border-b bg-slate-50/80 p-5 lg:grid-cols-[220px_1fr]">
                  <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                    {editingAlbum.coverUrl || editingAlbum.photos[0]?.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaUrl(editingAlbum.coverUrl ?? editingAlbum.photos[0].thumbnailUrl)} alt="" className="aspect-[4/3] w-full object-cover" />
                    ) : (
                      <div className="flex aspect-[4/3] items-center justify-center bg-primary/5 text-primary">
                        <ImageIcon className="h-10 w-10" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{editingAlbum.photos.length} photos</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${editingAlbum.published ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                        {editingAlbum.published ? "Published on website" : "Hidden from website"}
                      </span>
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950">{editingAlbum.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{editingAlbum.description || "No album description added yet."}</p>
                  </div>
                </div>
                <CardContent className="grid gap-4 p-5 lg:grid-cols-2">
                  <label className="block text-sm">
                    <span className="font-semibold">Title</span>
                    <input className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" value={editingAlbum.title} onChange={(event) => updateAlbum(editingAlbum.id, { title: event.target.value })} />
                  </label>
                  <label className="block text-sm">
                    <span className="font-semibold">Display order</span>
                    <input className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="number" value={editingAlbum.sortOrder} onChange={(event) => updateAlbum(editingAlbum.id, { sortOrder: Number(event.target.value) })} />
                  </label>
                  <label className="block text-sm lg:col-span-2">
                    <span className="font-semibold">Description</span>
                    <textarea className="mt-2 min-h-24 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" value={editingAlbum.description ?? ""} onChange={(event) => updateAlbum(editingAlbum.id, { description: event.target.value })} />
                  </label>
                  <label className="flex h-11 items-center gap-2 rounded-xl border bg-slate-50 px-3 text-sm font-semibold">
                    <input type="checkbox" checked={editingAlbum.published} onChange={(event) => updateAlbum(editingAlbum.id, { published: event.target.checked })} />
                    {editingAlbum.published ? <Eye className="h-4 w-4 text-primary" aria-hidden="true" /> : <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
                    Published
                  </label>
                  <div className="flex flex-wrap gap-2 lg:col-span-2">
                    <Button type="button" onClick={() => void saveAlbum(editingAlbum)}>
                      <Save className="h-4 w-4" aria-hidden="true" />
                      Save album
                    </Button>
                    <Button type="button" variant="outline" className="border-red-200 bg-white text-red-700 hover:bg-red-50" onClick={() => confirmRemoveAlbum(editingAlbum)}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Remove album
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[26px] border-slate-200/80 bg-white/95">
                <CardContent className="p-4">
                  <label
                    className={`flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-6 text-center transition ${
                      dragging ? "border-primary bg-primary/5 text-primary" : "border-slate-300 bg-slate-50/80 text-slate-700 hover:border-primary/40 hover:bg-primary/5"
                    }`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                  >
                    <Upload className="h-7 w-7" aria-hidden="true" />
                    <span className="mt-3 text-base font-semibold">Add photos to this album</span>
                    <span className="mt-1 text-sm text-muted-foreground">Click to upload or drag and drop single/multiple photos</span>
                    <span className="mt-1 text-xs text-muted-foreground">PNG, JPG, WebP</span>
                    <input className="sr-only" type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={(event) => void uploadPhoto(event)} />
                  </label>
                </CardContent>
              </Card>

              <Card className="rounded-[26px] border-slate-200/80 bg-white/95">
                <CardContent className="p-0">
                  <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant={photoView === "grid" ? "default" : "outline"} size="icon" onClick={() => setPhotoView("grid")} aria-label="Grid view">
                        <Grid2X2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button type="button" variant={photoView === "list" ? "default" : "outline"} size="icon" onClick={() => setPhotoView("list")} aria-label="List view">
                        <List className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setSelectedPhotoIds(filteredGalleryPhotos.map((photo) => photo.id))}>
                        Bulk select
                      </Button>
                      {selectedPhotoIds.length ? (
                        <Button type="button" variant="destructive" onClick={() => void removePhotos(selectedPhotoIds)}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          Delete selected ({selectedPhotoIds.length})
                        </Button>
                      ) : null}
                    </div>
                    <div className="relative min-w-0 xl:w-80">
                      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Search album photos" value={photoSearch} onChange={(event) => setPhotoSearch(event.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-5 p-5 sm:p-6">
                    <div className="text-xs text-muted-foreground">Showing {filteredGalleryPhotos.length} of {editingAlbum.photos.length} photos</div>

                    {photoView === "grid" ? (
                      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {filteredGalleryPhotos.map((photo) => (
                          <div key={photo.id} className={`group overflow-hidden rounded-md border bg-card ${selectedPhotoSet.has(photo.id) ? "ring-2 ring-primary" : ""}`}>
                            <button type="button" className="relative block aspect-square w-full bg-muted text-left" onClick={() => setEditingPhotoId(photo.id)}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={mediaUrl(photo.thumbnailUrl)} alt={photo.title} className={`h-full w-full object-cover ${photo.uploading ? "opacity-70" : ""}`} loading="lazy" />
                              <span className="absolute left-2 top-2">
                                <input aria-label={`Select ${photo.title}`} type="checkbox" checked={selectedPhotoSet.has(photo.id)} onClick={(event) => event.stopPropagation()} onChange={() => togglePhotoSelected(photo.id)} className="h-4 w-4" />
                              </span>
                              <span className={`absolute right-2 top-2 rounded px-2 py-1 text-[10px] font-bold uppercase ${photo.published ? "bg-primary text-primary-foreground" : "bg-black/60 text-white"}`}>
                                {photo.published ? "Live" : "Hidden"}
                              </span>
                              <span className="absolute inset-x-2 bottom-2 hidden rounded bg-black/70 px-2 py-1 text-xs font-medium text-white group-hover:block">Preview</span>
                            </button>
                            <div className="grid gap-1 p-2 text-xs">
                              <div className="truncate font-medium">{photo.title}</div>
                              <div className="text-muted-foreground">Image · {fileSize(photo.fileSize)}</div>
                              <div className="flex gap-2">
                                <button className="text-primary hover:underline" onClick={() => setEditingPhotoId(photo.id)}>Edit</button>
                                <button className="text-primary hover:underline" onClick={() => void copyPhotoUrl(photo)}>Copy URL</button>
                                <button className="text-red-700 hover:underline" onClick={() => void removePhotos([photo.id])}>Delete</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-md border">
                        <table className="w-full min-w-[760px] text-left text-sm">
                          <thead className="border-b bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                              <th className="w-10 px-3 py-3"></th>
                              <th className="px-3 py-3">Photo</th>
                              <th className="px-3 py-3">Status</th>
                              <th className="px-3 py-3">Size</th>
                              <th className="px-3 py-3">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredGalleryPhotos.map((photo) => (
                              <tr key={photo.id} className="border-b last:border-0">
                                <td className="px-3 py-3"><input type="checkbox" checked={selectedPhotoSet.has(photo.id)} onChange={() => togglePhotoSelected(photo.id)} /></td>
                                <td className="px-3 py-3">
                                  <button className="flex items-center gap-3 text-left" onClick={() => setEditingPhotoId(photo.id)}>
                                    <span className="h-12 w-12 overflow-hidden rounded border bg-muted">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={mediaUrl(photo.thumbnailUrl)} alt="" className="h-full w-full object-cover" loading="lazy" />
                                    </span>
                                    <span>
                                      <span className="block font-medium">{photo.title}</span>
                                      <span className="block text-xs text-muted-foreground">{photo.originalFileName ?? "Album photo"}</span>
                                    </span>
                                  </button>
                                </td>
                                <td className="px-3 py-3">{photo.published ? "Live" : "Hidden"}</td>
                                <td className="px-3 py-3">{fileSize(photo.fileSize)}</td>
                                <td className="px-3 py-3">
                                  <div className="flex gap-2">
                                    <Button type="button" variant="outline" size="sm" onClick={() => setEditingPhotoId(photo.id)}>Edit</Button>
                                    <Button type="button" variant="outline" size="sm" onClick={() => void copyPhotoUrl(photo)}>Copy URL</Button>
                                    <Button type="button" variant="outline" size="sm" className="border-red-200 text-red-700" onClick={() => void removePhotos([photo.id])}>Delete</Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {!filteredGalleryPhotos.length ? (
                      <div className="rounded-[24px] border border-dashed bg-white/80 p-8 text-center text-sm text-muted-foreground">
                        <ImageIcon className="mx-auto h-10 w-10 text-primary/50" aria-hidden="true" />
                        <p className="mt-3 font-medium text-slate-700">No album photos found.</p>
                        <p className="mt-1">Upload photos above to publish them in the frontend gallery.</p>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
