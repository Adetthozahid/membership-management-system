import type { Metadata } from "next";
import { CalendarDays, Clock, ExternalLink, MapPin } from "lucide-react";
import { EmptyState } from "@/components/public/empty-state";
import { PublicPageHeader } from "@/components/public/public-page-header";
import { getPublicCollection } from "@/lib/api";

export const metadata: Metadata = {
  title: "Event Details",
};

export const dynamic = "force-dynamic";

function mapSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function mapEmbedUrl(query: string) {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

function safeMapUrl(url: string | null | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export default async function EventDetailsPage({
  params,
}: {
  params: { slug: string };
}) {
  const event = await getPublicCollection(
    `/public/events/${params.slug}`,
  ).catch(() => null);
  const item = event?.items?.[0];

  if (!item) {
    return (
      <EmptyState
        title="Event not published"
        body="This event route is ready, but no public event exists for this address yet."
      />
    );
  }
  const mapQuery = item.mapQuery || item.location || "";
  const mapUrl = safeMapUrl(item.mapUrl) ?? (mapQuery ? mapSearchUrl(mapQuery) : null);
  const mapEmbed = mapQuery ? mapEmbedUrl(mapQuery) : null;

  return (
    <article className="mx-auto max-w-7xl space-y-4">
      <PublicPageHeader
        eyebrow="Event"
        title={`${item.title} of Sociology Alumni Association of SUST`}
        subtitle={item.summary ?? undefined}
      />
      <div className="flex flex-wrap gap-3 rounded-md border bg-card p-4 text-sm font-medium text-muted-foreground">
        {item.startsAt ? (
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
            {new Date(item.startsAt).toLocaleDateString()}
          </span>
        ) : null}
        {item.startsAt ? (
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
            {new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(new Date(item.startsAt))}
          </span>
        ) : null}
        {item.location ? (
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
            {item.location}
          </span>
        ) : null}
        {mapUrl ? (
          <a href={mapUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline">
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Open map
          </a>
        ) : null}
      </div>
      <div
        className="prose prose-sm max-w-none text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: item.body ?? item.summary ?? "" }}
      />
      {mapEmbed ? (
        <section className="overflow-hidden rounded-md border bg-card">
          <iframe
            title={`${item.title} location map`}
            src={mapEmbed}
            className="h-80 w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </section>
      ) : null}
    </article>
  );
}
