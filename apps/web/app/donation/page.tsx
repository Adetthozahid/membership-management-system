import type { Metadata } from "next";
import { EmptyState } from "@/components/public/empty-state";
import { ManagedPageContent } from "@/components/public/managed-page-content";
import { getPublicCollection, getPublicPage } from "@/lib/api";

export const metadata: Metadata = {
  title: "Donation",
};

export default async function DonationPage() {
  const [donations, page] = await Promise.all([
    getPublicCollection("/public/donations").catch(() => null),
    getPublicPage("donation").catch(() => null),
  ]);
  return (
    <div className="space-y-6">
      <ManagedPageContent
        page={page as Parameters<typeof ManagedPageContent>[0]["page"]}
        fallbackEyebrow="Donation"
        fallbackTitle="Donation of Sociology Alumni Association of SUST"
        fallbackSubtitle="Support association initiatives, alumni welfare, and community development programs."
      />
      {donations?.items?.length ? null : (
        <EmptyState
          title="Donation details not published"
          body="Donation methods are connected through the public API and will appear here when enabled."
        />
      )}
    </div>
  );
}
