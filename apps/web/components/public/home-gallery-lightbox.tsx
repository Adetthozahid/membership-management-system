"use client";

import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

type HomeGalleryPhoto = {
  id: string;
  title: string;
  imageUrl: string;
  caption: string | null;
  albumTitle: string;
};

export function HomeGalleryLightbox({ photos }: { photos: HomeGalleryPhoto[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activePhoto = activeIndex === null ? null : photos[activeIndex] ?? null;

  function close() {
    setActiveIndex(null);
  }

  function showNext(direction: 1 | -1) {
    setActiveIndex((current) => {
      if (current === null || !photos.length) return current;
      return (current + direction + photos.length) % photos.length;
    });
  }

  useEffect(() => {
    if (activeIndex === null) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") showNext(1);
      if (event.key === "ArrowLeft") showNext(-1);
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [activeIndex]);

  return (
    <>
      <div className="mt-5 grid grid-cols-2 gap-1.5 sm:grid-cols-6 sm:auto-rows-[72px] lg:auto-rows-[74px] xl:auto-rows-[78px]">
        {photos.map((photo, index) => {
          const tileClass =
            index === 0
              ? "sm:col-span-4 sm:row-span-2"
              : index === 1
                ? "sm:col-span-2 sm:row-span-2"
                : index === 2 || index === 3
                  ? "sm:col-span-3 sm:row-span-2"
                  : "sm:col-span-2 sm:row-span-2";
          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`group relative aspect-[1.45/1] overflow-hidden rounded-md border bg-muted text-left sm:aspect-auto ${tileClass}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.imageUrl}
                alt={photo.caption || photo.title}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                loading={index < 4 ? "eager" : "lazy"}
              />
              <span className="pointer-events-none absolute inset-0 bg-primary/0 transition group-hover:bg-primary/15" />
              <span className="sr-only">View {photo.title}</span>
            </button>
          );
        })}
      </div>

      {activePhoto ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={activePhoto.title}
          onClick={close}
        >
          <div className="relative w-full max-w-6xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-3 text-white">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
                  {activePhoto.albumTitle}
                </p>
                <h3 className="mt-1 truncate text-xl font-semibold">{activePhoto.caption || activePhoto.title}</h3>
              </div>
              <button
                type="button"
                onClick={close}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20"
                aria-label="Close gallery preview"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="relative overflow-hidden rounded-md bg-black shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePhoto.imageUrl}
                alt={activePhoto.caption || activePhoto.title}
                className="max-h-[72vh] w-full object-contain"
              />
              {photos.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => showNext(-1)}
                    className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-primary shadow-lg transition hover:bg-white"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => showNext(1)}
                    className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-primary shadow-lg transition hover:bg-white"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-6 w-6" aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-white/75">
              <span>
                {(activeIndex ?? 0) + 1} / {photos.length}
              </span>
              <Button asChild variant="outline" className="h-10 bg-white text-primary hover:bg-white/90">
                <Link href="/gallery">
                  Open gallery
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
