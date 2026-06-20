"use client";

import { useMemberEndpoint, type MemberCollectionData } from "@/components/member/member-data";
import { MemberEmpty } from "@/components/member/member-empty";

export default function CertificatesPage() {
  const { data, error } = useMemberEndpoint<MemberCollectionData>("/member/certificates");
  if (error) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!data) return <div className="rounded-md border bg-card p-5 text-sm text-muted-foreground">Loading certificates...</div>;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-primary">Certificates</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Certificates</h1>
      </div>
      <MemberEmpty title="No certificates available" body="Certificates issued to your membership will appear here when the certificate module is implemented." />
    </div>
  );
}
