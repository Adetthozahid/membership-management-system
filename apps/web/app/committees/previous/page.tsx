import type { Metadata } from "next";
import { EmptyState } from "@/components/public/empty-state";
import { ManagedPageContent } from "@/components/public/managed-page-content";
import { getPublicCollection, getPublicPage } from "@/lib/api";

export const metadata: Metadata = {
  title: "Previous Committees",
};

export default async function PreviousCommitteesPage() {
  const [committees, page] = await Promise.all([
    getPublicCollection("/public/committees/previous").catch(() => null),
    getPublicPage("committees_previous").catch(() => null),
  ]);
  return (
    <div className="space-y-6">
      <ManagedPageContent
        page={page as Parameters<typeof ManagedPageContent>[0]["page"]}
        fallbackEyebrow="Previous Committees"
        fallbackTitle="Previous Committees of Sociology Alumni Association of SUST"
        fallbackSubtitle="Explore past committee records, leadership history, and association governance archives."
      />
      {committees?.items.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {committees.items.map((item) => (
            <article key={item.id} className="rounded-md border bg-card p-5">
              <h2 className="text-xl font-semibold">{item.title}</h2>
              {item.summary ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {item.summary}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No previous committees published"
          body="Previous committee records will appear here when the committee module is implemented."
        />
      )}
    </div>
  );
}
