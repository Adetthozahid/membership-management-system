import type { Metadata } from "next";
import { EmptyState } from "@/components/public/empty-state";
import { ManagedPageContent } from "@/components/public/managed-page-content";
import { getPublicCollection, getPublicPage } from "@/lib/api";

export const metadata: Metadata = {
  title: "Current Committees",
};

export default async function CurrentCommitteePage() {
  const [, page] = await Promise.all([
    getPublicCollection("/public/committees/current").catch(() => null),
    getPublicPage("committees_current").catch(() => null),
  ]);
  return (
    <div className="space-y-6">
      <ManagedPageContent
        page={page as Parameters<typeof ManagedPageContent>[0]["page"]}
        fallbackEyebrow="Current Committees"
        fallbackTitle="Current Committees of Sociology Alumni Association of SUST"
        fallbackSubtitle="Meet the current association committee, office bearers, and active leadership team."
      />
      <EmptyState
        title="Committee module pending"
        body="This route is connected to the public committee API. Current committee members will appear here when the module is implemented."
      />
    </div>
  );
}
