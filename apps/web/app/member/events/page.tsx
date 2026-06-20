"use client";

import { useMemberEndpoint, type MemberCollectionData } from "@/components/member/member-data";
import { MemberEmpty } from "@/components/member/member-empty";

export default function EventRegistrationsPage() {
  const { data, error } = useMemberEndpoint<MemberCollectionData>("/member/event-registrations");
  if (error) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!data) return <div className="rounded-md border bg-card p-5 text-sm text-muted-foreground">Loading event registrations...</div>;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-primary">Events</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Event Registrations</h1>
      </div>
      <MemberEmpty title="No event registrations" body="The event registration endpoint is ready. Your registrations will appear here when the event module is implemented." />
    </div>
  );
}
