import type { Metadata } from "next";
import { ContentList } from "@/components/public/content-list";
import { ManagedPageContent } from "@/components/public/managed-page-content";
import { getPublicCollection, getPublicPage } from "@/lib/api";

export const metadata: Metadata = {
  title: "Notices",
  description: "Public notices and announcements.",
};

export const dynamic = "force-dynamic";

export default async function NoticesPage() {
  const [notices, page] = await Promise.all([
    getPublicCollection("/public/notices").catch(() => null),
    getPublicPage("notices").catch(() => null),
  ]);
  return (
    <div className="space-y-6">
      <ManagedPageContent
        page={page ? ({ ...(page as object), contentBlocks: [], heroSubtitle: "Read official updates, announcements, and important messages from the association." } as Parameters<typeof ManagedPageContent>[0]["page"]) : null}
        fallbackEyebrow="Notices"
        fallbackTitle="Notices of Sociology Alumni Association of SUST"
        fallbackSubtitle="Read official updates, announcements, and important messages from the association."
      />
      <ContentList
        items={notices?.items ?? []}
        basePath="/notices"
        emptyTitle="No notices published"
        emptyBody="The notices API is connected. Published notices will appear here when the content module is populated."
      />
    </div>
  );
}
