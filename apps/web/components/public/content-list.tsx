import Link from "next/link";
import type { PublicContentItem } from "@mms/shared";
import { Clock, MapPin } from "lucide-react";
import { EmptyState } from "./empty-state";

export function ContentList({
  items,
  basePath,
  emptyTitle,
  emptyBody
}: {
  items: PublicContentItem[];
  basePath: string;
  emptyTitle: string;
  emptyBody: string;
}) {
  if (!items.length) return <EmptyState title={emptyTitle} body={emptyBody} />;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => {
        const dateValue = item.publishedAt ?? item.startsAt;
        const time = item.startsAt ? new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(new Date(item.startsAt)) : null;
        return (
          <article key={item.id} className="rounded-md border bg-card p-5">
            <h2 className="text-xl font-semibold">
              <Link href={`${basePath}/${item.slug}`} className="hover:text-primary">
                {item.title}
              </Link>
            </h2>
            {item.summary ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.summary}</p> : null}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>{dateValue ? new Date(dateValue).toLocaleDateString() : "Published"}</span>
              {time ? (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {time}
                </span>
              ) : null}
              {item.location ? (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {item.location}
                </span>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
