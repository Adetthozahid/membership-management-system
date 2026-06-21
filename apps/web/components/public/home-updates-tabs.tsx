"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, MapPin, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";

type HomeContentItem = {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  publishedAt?: string | null;
  startsAt?: string | null;
  location?: string | null;
  demo?: boolean;
};

export function HomeUpdatesTabs({ events, notices }: { events: HomeContentItem[]; notices: HomeContentItem[] }) {
  const [activeTab, setActiveTab] = useState<"events" | "updates">("events");
  const visibleNotices = notices.slice(0, 3);

  function formatDate(value: string | null | undefined) {
    if (!value) return null;
    return new Intl.DateTimeFormat("en", {
      day: "2-digit",
      month: "short",
      timeZone: "Asia/Dhaka",
      year: "numeric",
    }).format(new Date(value));
  }

  function formatTime(value: string | null | undefined) {
    if (!value) return null;
    return new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Dhaka",
    }).format(new Date(value));
  }

  return (
    <div className="overflow-hidden rounded-md border bg-card shadow-sm">
      <div className="grid grid-cols-2 border-b">
        <button
          type="button"
          className={`flex h-16 items-center justify-center gap-2 border-b-2 text-sm font-semibold transition ${
            activeTab === "events" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-primary"
          }`}
          onClick={() => setActiveTab("events")}
        >
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
          Events
        </button>
        <button
          type="button"
          className={`flex h-16 items-center justify-center gap-2 border-b-2 text-sm font-semibold transition ${
            activeTab === "updates" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-primary"
          }`}
          onClick={() => setActiveTab("updates")}
        >
          <Megaphone className="h-5 w-5" aria-hidden="true" />
          Association Updates
        </button>
      </div>

      {activeTab === "events" ? (
        <div className="p-5 sm:p-6">
          <h2 className="text-xl font-semibold tracking-normal text-primary">Upcoming Events</h2>
          <div className="mt-5 divide-y">
            {events.map((item) => {
              const date = formatDate(item.startsAt ?? item.publishedAt);
              const time = formatTime(item.startsAt);
              return (
                <article key={item.id} className="grid gap-4 py-4 first:pt-0 last:pb-0 sm:grid-cols-[74px_1fr_auto] sm:items-center">
                  <div className="flex h-[92px] w-[74px] flex-col items-center justify-center rounded-md border bg-background text-center shadow-sm">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">{date?.slice(0, 3) ?? "Date"}</span>
                    <span className="text-3xl font-bold leading-none text-primary">{date?.slice(4, 6) ?? "--"}</span>
                    <span className="mt-1 text-xs font-medium text-muted-foreground">{date?.slice(-4) ?? ""}</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-primary">{item.title}</h3>
                    {item.summary ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.summary}</p> : null}
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-muted-foreground">
                      {time ? (
                        <span className="flex items-center gap-2">
                          <Clock className="h-4 w-4" aria-hidden="true" />
                          {time}
                        </span>
                      ) : null}
                      {item.location ? (
                        <span className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" aria-hidden="true" />
                          {item.location}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <Button asChild variant="outline" className="h-9 w-full px-4 sm:w-auto">
                    <Link href={item.demo ? "/events" : `/events/${item.slug}`}>View Details</Link>
                  </Button>
                </article>
              );
            })}
          </div>
          <Button asChild variant="outline" className="mt-5 h-10 w-full justify-between">
            <Link href="/events">
              View all events
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="p-5 sm:p-6">
          <h2 className="text-xl font-semibold tracking-normal text-primary">Association Updates</h2>
          {visibleNotices.length ? (
            <div className="mt-5 divide-y">
              {visibleNotices.map((item) => {
                const date = formatDate(item.publishedAt);
                return (
                  <article key={item.id} className="grid gap-3 py-5 first:pt-0 last:pb-0">
                    <Link href={`/notices/${item.slug}`} className="font-semibold text-primary hover:text-[hsl(var(--terracotta))]">
                      {item.title}
                    </Link>
                    {item.summary ? <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{item.summary}</p> : null}
                    {date ? <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{date}</p> : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-md border bg-background p-6 text-sm leading-6 text-muted-foreground">
              No association updates are published yet.
            </div>
          )}
          <Button asChild variant="outline" className="mt-5 h-10 w-full justify-between">
            <Link href="/notices">
              View all updates
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
