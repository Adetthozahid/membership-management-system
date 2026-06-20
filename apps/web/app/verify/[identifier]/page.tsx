import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PublicPageHeader } from "@/components/public/public-page-header";
import { VerificationResult } from "@/components/public/verification-result";
import { verifyPublicMember } from "@/lib/api";

export const metadata: Metadata = {
  title: "Member Profile",
};

export default async function VerifyTokenPage({
  params,
}: {
  params: { identifier: string };
}) {
  const verification = await verifyPublicMember(params.identifier).catch(
    () => null,
  );
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PublicPageHeader
        eyebrow="Member Profile"
        title="Sociology Alumni Association of SUST Member Profile"
        subtitle="Verified alumni identity and directory information shared by the association."
      />
      <Link
        href="/members"
        className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:border-primary hover:bg-muted"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to member list
      </Link>
      <VerificationResult member={verification?.member ?? null} />
    </div>
  );
}
