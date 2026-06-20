import type { Metadata } from "next";
import { ContentList } from "@/components/public/content-list";
import { ManagedPageContent } from "@/components/public/managed-page-content";
import { getPublicCollection, getPublicPage } from "@/lib/api";

export const metadata: Metadata = {
  title: "Events",
  description: "Public events.",
};

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const [events, page] = await Promise.all([
    getPublicCollection("/public/events").catch(() => null),
    getPublicPage("events").catch(() => null),
  ]);
  return (
    <div className="space-y-6">
      <ManagedPageContent
        page={page ? ({ ...(page as object), contentBlocks: [], heroSubtitle: "Explore upcoming programs, reunions, seminars, and alumni community activities." } as Parameters<typeof ManagedPageContent>[0]["page"]) : null}
        fallbackEyebrow="Events"
        fallbackTitle="Events of Sociology Alumni Association of SUST"
        fallbackSubtitle="Explore upcoming programs, reunions, seminars, and alumni community activities."
      />
      <ContentList
        items={events?.items ?? []}
        basePath="/events"
        emptyTitle="No events scheduled"
        emptyBody="The events API is connected. Published events will appear here when the event module is populated."
      />
    </div>
  );
}
