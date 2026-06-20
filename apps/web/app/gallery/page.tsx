import type { Metadata } from "next";
import type { PublicCollection, PublicGalleryAlbum } from "@mms/shared";
import { GalleryBrowser } from "@/components/public/gallery-browser";
import { ManagedPageContent } from "@/components/public/managed-page-content";
import { getPublicCollection, getPublicPage } from "@/lib/api";

export const metadata: Metadata = {
  title: "Gallery",
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default async function GalleryPage() {
  const [gallery, page] = await Promise.all([
    getPublicCollection("/public/gallery", { cache: "no-store" }).catch(
      () => null,
    ) as Promise<PublicCollection<PublicGalleryAlbum> | null>,
    getPublicPage("gallery").catch(() => null),
  ]);
  const galleryPage = page
    ? {
        ...page,
        heroTitle: "Moments & Memories",
        heroSubtitle:
          "Relive the moments from our programs, events and campus life.",
      }
    : page;

  return (
    <div className="space-y-6">
      <ManagedPageContent
        page={galleryPage as Parameters<typeof ManagedPageContent>[0]["page"]}
        fallbackEyebrow="Gallery"
        fallbackTitle="Moments & Memories"
        fallbackSubtitle="Relive the moments from our programs, events and campus life."
      />
      <GalleryBrowser albums={gallery?.items ?? []} apiBaseUrl={apiBaseUrl} />
    </div>
  );
}
