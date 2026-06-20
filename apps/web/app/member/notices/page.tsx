"use client";

import { useMemberEndpoint, type MemberCollectionData } from "@/components/member/member-data";
import { MemberEmpty } from "@/components/member/member-empty";

export default function MemberNoticesPage() {
  const { data, error } = useMemberEndpoint<MemberCollectionData>("/member/notices");
  if (error) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!data) return <div className="rounded-md border bg-card p-5 text-sm text-muted-foreground">Loading notices...</div>;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-primary">Member notices</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Notices</h1>
      </div>
      <MemberEmpty title="No member notices" body="Member-specific notices will appear here when published." />
    </div>
  );
}
