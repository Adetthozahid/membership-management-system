"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CalendarDays, Check, Globe2, Image as ImageIcon, Megaphone, Newspaper } from "lucide-react";
import type { MemberNotificationPreferences, MemberNotificationType } from "@mms/shared";
import { useMemberEndpoint, type MemberNotificationsData } from "@/components/member/member-data";
import { MemberEmpty } from "@/components/member/member-empty";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/auth-client";

const notificationTypes: Array<{
  key: keyof Omit<MemberNotificationPreferences, "lastSeenAt">;
  type: MemberNotificationType;
  label: string;
}> = [
  { key: "noticeEnabled", type: "notice", label: "Notice" },
  { key: "eventEnabled", type: "event", label: "Event" },
  { key: "postEnabled", type: "post", label: "Post" },
  { key: "galleryEnabled", type: "gallery", label: "Gallery" },
  { key: "websiteEnabled", type: "website", label: "Website" }
];

const typeIcons = {
  notice: Megaphone,
  event: CalendarDays,
  post: Newspaper,
  gallery: ImageIcon,
  website: Globe2
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function MemberNotificationsPage() {
  const { data, error } = useMemberEndpoint<MemberNotificationsData>("/member/notifications");
  const [preferences, setPreferences] = useState<MemberNotificationPreferences | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setPreferences(data.preferences);
    void apiRequest<MemberNotificationPreferences>("/member/notifications/seen", { method: "POST" }).then(setPreferences).catch(() => undefined);
  }, [data]);

  async function updatePreference(key: keyof Omit<MemberNotificationPreferences, "lastSeenAt">, checked: boolean) {
    if (!preferences) return;
    const next = { ...preferences, [key]: checked };
    setPreferences(next);
    setSavingKey(key);
    try {
      const updated = await apiRequest<MemberNotificationPreferences>("/member/notifications/preferences", {
        method: "PATCH",
        body: JSON.stringify({ [key]: checked })
      });
      setPreferences(updated);
    } finally {
      setSavingKey(null);
    }
  }

  if (error) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!data || !preferences) return <div className="rounded-md border bg-card p-5 text-sm text-muted-foreground">Loading notifications...</div>;

  const enabledTypes = new Set(notificationTypes.filter((item) => preferences[item.key]).map((item) => item.type));
  const visibleItems = data.items.filter((item) => enabledTypes.has(item.type));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-primary">Member notifications</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Notifications</h1>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
          <Bell className="h-4 w-4 text-primary" aria-hidden="true" />
          {data.unreadCount} new
        </div>
      </div>

      <div className="rounded-md border bg-card p-4 shadow-sm">
        <div className="mb-3 text-sm font-semibold">Notification types</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {notificationTypes.map((item) => (
            <label key={item.key} className="flex h-11 items-center gap-3 rounded-md border bg-background px-3 text-sm font-medium">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[hsl(var(--primary))]"
                checked={preferences[item.key]}
                disabled={savingKey === item.key}
                onChange={(event) => void updatePreference(item.key, event.target.checked)}
              />
              {item.label}
              {preferences[item.key] ? <Check className="ml-auto h-4 w-4 text-emerald-600" aria-hidden="true" /> : null}
            </label>
          ))}
        </div>
      </div>

      {visibleItems.length ? (
        <div className="grid gap-3">
          {visibleItems.map((item) => {
            const Icon = typeIcons[item.type];
            return (
              <Link key={item.id} href={item.href} className="group rounded-md border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:bg-muted/40">
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground group-hover:text-primary">{item.title}</span>
                      <span className="rounded-md border bg-background px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">{item.type}</span>
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">{item.message}</span>
                    <span className="mt-2 block text-xs font-medium text-muted-foreground">{formatDate(item.createdAt)}</span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <MemberEmpty title="No notification now :)" body="You are all caught up. New website updates will appear here." />
      )}

      <Button asChild variant="outline">
        <Link href="/member">Back to dashboard</Link>
      </Button>
    </div>
  );
}
