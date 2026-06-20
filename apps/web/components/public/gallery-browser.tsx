"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicGalleryAlbum, PublicGalleryPhoto } from "@mms/shared";
import { CalendarDays, ChevronLeft, ChevronRight, Grid2X2, Image as ImageIcon, Images, Search, SlidersHorizontal, Video, X } from "lucide-react";
import { EmptyState } from "@/components/public/empty-state";

type GalleryBrowserProps = {
  albums: PublicGalleryAlbum[];
  apiBaseUrl: string;
};

type GalleryPhotoView = PublicGalleryPhoto & {
  albumId: string;
  albumTitle: string;
  albumSlug: string;
};

type Tab = "all" | "albums" | "videos" | "archive";

const tabs: Array<{ id: Tab; label: string; icon: typeof Grid2X2 }> = [
  { id: "all", label: "All", icon: Grid2X2 },
  { id: "albums", label: "Albums", icon: Images },
  { id: "videos", label: "Videos", icon: Video },
  { id: "archive", label: "Year Archive", icon: CalendarDays }
];

function mediaUrl(url: string | null | undefined, apiBaseUrl: string) {
  if (!url) return "";
  return url.startsWith("http") ? url : `${apiBaseUrl}${url}`;
}

function photoYear(photo: PublicGalleryPhoto) {
  const year = new Date(photo.createdAt).getFullYear();
  return Number.isFinite(year) ? String(year) : "Unknown";
}

function formatBytes(bytes: number) {
  if (!bytes) return "";
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function isCommonAlbum(album: PublicGalleryAlbum) {
  return album.slug === "common-photos" || album.title.trim().toLowerCase() === "common photos";
}

export function GalleryBrowser({ albums, apiBaseUrl }: GalleryBrowserProps) {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("all");
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const publishedAlbums = useMemo(
    () =>
      albums
        .filter((album) => album.published)
        .map((album) => ({
          ...album,
          photos: album.photos.filter((photo) => photo.published)
        })),
    [albums]
  );

  const photos = useMemo<GalleryPhotoView[]>(
    () =>
      publishedAlbums.flatMap((album) =>
        album.photos.map((photo) => ({
          ...photo,
          albumId: album.id,
          albumTitle: album.title,
          albumSlug: album.slug
        }))
      ),
    [publishedAlbums]
  );

  const years = useMemo(() => Array.from(new Set(photos.map(photoYear))).sort((a, b) => b.localeCompare(a)), [photos]);

  const filteredPhotos = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return photos.filter((photo) => {
      const matchesQuery =
        !needle ||
        photo.title.toLowerCase().includes(needle) ||
        photo.albumTitle.toLowerCase().includes(needle) ||
        (photo.caption ?? "").toLowerCase().includes(needle);
      const matchesYear = year === "all" || photoYear(photo) === year;
      const matchesAlbum = !selectedAlbumId || photo.albumId === selectedAlbumId;
      return matchesQuery && matchesYear && matchesAlbum;
    });
  }, [photos, query, selectedAlbumId, year]);

  const visibleAlbums = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return publishedAlbums.filter((album) => !isCommonAlbum(album) && (!needle || album.title.toLowerCase().includes(needle) || (album.description ?? "").toLowerCase().includes(needle)));
  }, [publishedAlbums, query]);

  const selectedAlbum = selectedAlbumId ? publishedAlbums.find((album) => album.id === selectedAlbumId) ?? null : null;
  const selectedPhoto = selectedIndex === null ? null : filteredPhotos[selectedIndex] ?? null;

  function openAlbum(album: PublicGalleryAlbum) {
    setSelectedAlbumId(album.id);
    setActiveTab("albums");
    setQuery("");
    setSelectedIndex(null);
  }

  function changeTab(tab: Tab) {
    setActiveTab(tab);
    setSelectedAlbumId(null);
    setSelectedIndex(null);
  }

  useEffect(() => {
    if (!selectedPhoto || selectedIndex === null) return;
    const nearby = [selectedPhoto, filteredPhotos[selectedIndex + 1], filteredPhotos[selectedIndex - 1]].filter(Boolean);
    const preloaders = nearby.map((photo) => {
      const image = new Image();
      image.src = mediaUrl(photo.imageUrl, apiBaseUrl);
      return image;
    });
    return () => {
      preloaders.forEach((image) => {
        image.onload = null;
      });
    };
  }, [apiBaseUrl, filteredPhotos, selectedIndex, selectedPhoto]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (selectedIndex === null) return;
      if (event.key === "Escape") setSelectedIndex(null);
      if (event.key === "ArrowRight") setSelectedIndex((current) => (current === null ? current : Math.min(filteredPhotos.length - 1, current + 1)));
      if (event.key === "ArrowLeft") setSelectedIndex((current) => (current === null ? current : Math.max(0, current - 1)));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filteredPhotos.length, selectedIndex]);

  if (!publishedAlbums.length) {
    return <EmptyState title="No gallery albums published" body="Albums and compressed photos will appear here after they are added from Website Control." />;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-md border bg-card/90 p-3 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`flex h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition ${
                    activeTab === tab.id ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => changeTab(tab.id)}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                className="h-11 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                placeholder="Search photos..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label className="relative block">
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <select className="h-11 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-ring" value={year} onChange={(event) => setYear(event.target.value)}>
                <option value="all">All Years</option>
                {years.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        <div className="space-y-7">
          {!selectedAlbum && visibleAlbums.length > 0 && activeTab === "albums" ? (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="border-l-2 border-terracotta pl-3 text-lg font-semibold tracking-normal">Program Albums</h2>
                <button type="button" className="text-sm font-medium text-primary" onClick={() => changeTab("albums")}>
                  View All Albums
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {visibleAlbums.slice(0, activeTab === "albums" ? visibleAlbums.length : 4).map((album, index) => (
                  <article key={album.id} className="overflow-hidden rounded-md border bg-card shadow-sm">
                    <button type="button" className="group block w-full text-left" onClick={() => openAlbum(album)}>
                      <div className="relative aspect-[4/2.4] overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={mediaUrl(album.coverUrl ?? album.photos[0]?.thumbnailUrl, apiBaseUrl)} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" loading={index < 4 ? "eager" : "lazy"} />
                        {index === 0 ? <span className="absolute left-3 top-3 rounded bg-terracotta px-2 py-1 text-[10px] font-bold uppercase text-terracotta-foreground">Featured</span> : null}
                        <span className="absolute bottom-3 right-3 rounded bg-black/60 px-2 py-1 text-xs font-medium text-white">{album.photos.length}</span>
                      </div>
                      <div className="space-y-2 p-3">
                        <h3 className="line-clamp-1 font-semibold">{album.title}</h3>
                        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{album.description || "Association album"}</p>
                      </div>
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activeTab !== "albums" || selectedAlbum ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="border-l-2 border-terracotta pl-3 text-lg font-semibold tracking-normal">
                {selectedAlbum ? selectedAlbum.title : activeTab === "archive" && year !== "all" ? `${year} Photos` : "All Photos"}
              </h2>
              <div className="flex items-center gap-3">
                {selectedAlbum ? (
                  <button type="button" className="text-sm font-medium text-primary" onClick={() => setSelectedAlbumId(null)}>
                    Back to albums
                  </button>
                ) : null}
                <p className="text-sm text-muted-foreground">{filteredPhotos.length} photos</p>
              </div>
            </div>
            {filteredPhotos.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {filteredPhotos.map((photo, index) => (
                  <button key={photo.id} type="button" className="group relative aspect-[4/2.45] overflow-hidden rounded-md border bg-muted text-left shadow-sm" onClick={() => setSelectedIndex(index)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaUrl(photo.thumbnailUrl, apiBaseUrl)}
                      alt={photo.caption || photo.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                      loading={index < 10 ? "eager" : "lazy"}
                      decoding="async"
                    />
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-2 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">{photo.title}</span>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState title="No photos matched" body="Try another search keyword or year filter." />
            )}
          </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="rounded-md border bg-card p-4 shadow-sm">
            <h2 className="font-semibold">Albums</h2>
            <div className="mt-3 divide-y">
              {visibleAlbums.slice(0, 7).map((album) => (
                <button key={album.id} type="button" className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm" onClick={() => openAlbum(album)}>
                  <span className="flex min-w-0 items-center gap-2">
                    <ImageIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="truncate">{album.title}</span>
                  </span>
                  <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">{album.photos.length}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {selectedPhoto ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4" role="dialog" aria-modal="true" onClick={() => setSelectedIndex(null)}>
          <div className="relative max-h-[92vh] w-full max-w-6xl" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="absolute right-2 top-2 z-10 rounded-md bg-black/60 p-2 text-white" onClick={() => setSelectedIndex(null)} aria-label="Close photo">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <button type="button" className="absolute left-2 top-1/2 z-10 rounded-md bg-black/60 p-2 text-white disabled:opacity-30" disabled={selectedIndex === 0} onClick={() => setSelectedIndex((current) => (current === null ? current : Math.max(0, current - 1)))} aria-label="Previous photo">
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
            </button>
            <button type="button" className="absolute right-2 top-1/2 z-10 rounded-md bg-black/60 p-2 text-white disabled:opacity-30" disabled={selectedIndex === filteredPhotos.length - 1} onClick={() => setSelectedIndex((current) => (current === null ? current : Math.min(filteredPhotos.length - 1, current + 1)))} aria-label="Next photo">
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </button>
            <div className="overflow-hidden rounded-md bg-card shadow-2xl">
              <div className="grid max-h-[92vh] lg:grid-cols-[1fr_300px]">
                <div className="flex min-h-[280px] items-center justify-center bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaUrl(selectedPhoto.imageUrl, apiBaseUrl)} alt={selectedPhoto.caption || selectedPhoto.title} className="max-h-[78vh] w-full object-contain" decoding="async" />
                </div>
                <div className="space-y-3 p-5">
                  <p className="text-xs font-medium uppercase text-primary">{selectedPhoto.albumTitle}</p>
                  <h2 className="text-xl font-semibold tracking-normal">{selectedPhoto.title}</h2>
                  {selectedPhoto.caption ? <p className="text-sm leading-6 text-muted-foreground">{selectedPhoto.caption}</p> : null}
                  <p className="text-xs text-muted-foreground">
                    {selectedPhoto.width} x {selectedPhoto.height}
                    {selectedPhoto.fileSize ? `, ${formatBytes(selectedPhoto.fileSize)}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedIndex ?? 0) + 1} of {filteredPhotos.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
