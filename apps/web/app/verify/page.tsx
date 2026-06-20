import type { Metadata } from "next";
import { PublicPageHeader } from "@/components/public/public-page-header";
import { VerificationResult } from "@/components/public/verification-result";
import { Button } from "@/components/ui/button";
import { verifyPublicMember } from "@/lib/api";

export const metadata: Metadata = {
  title: "Member QR Verification",
  description: "Verify a public member by QR token or member ID.",
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: { identifier?: string };
}) {
  const identifier = searchParams.identifier?.trim();
  const verification = identifier
    ? await verifyPublicMember(identifier).catch(() => null)
    : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PublicPageHeader
        eyebrow="Verification"
        title="Membership Verification of Sociology Alumni Association of SUST"
        subtitle="Confirm a member record using a member number or QR token with safe public information."
      />
      <form
        className="grid gap-3 rounded-md border bg-card p-4 sm:grid-cols-[1fr_auto]"
        action="/verify"
      >
        <input
          name="identifier"
          defaultValue={identifier ?? ""}
          className="h-10 rounded-md border bg-background px-3 text-sm"
          placeholder="Member ID or verification token"
        />
        <Button type="submit">Verify</Button>
      </form>
      {identifier ? (
        <VerificationResult member={verification?.member ?? null} />
      ) : null}
    </div>
  );
}
