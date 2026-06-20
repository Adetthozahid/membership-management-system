import type { Metadata } from "next";
import { EmptyState } from "@/components/public/empty-state";
import { ManagedPageContent } from "@/components/public/managed-page-content";
import { getPublicCollection, getPublicPage } from "@/lib/api";

export const metadata: Metadata = {
  title: "Election Results",
};

export default async function ElectionResultsPage() {
  const [results, page] = await Promise.all([
    getPublicCollection("/public/election-results").catch(() => null),
    getPublicPage("election_results").catch(() => null),
  ]);
  return (
    <div className="space-y-6">
      <ManagedPageContent
        page={page as Parameters<typeof ManagedPageContent>[0]["page"]}
        fallbackEyebrow="Election Results"
        fallbackTitle="Election Results of Sociology Alumni Association of SUST"
        fallbackSubtitle="View published election outcomes, leadership updates, and governance records."
      />
      {results?.items.length ? (
        <div className="grid gap-4">
          {results.items.map((item) => (
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
          title="No election results published"
          body="Election results will appear here when the election module publishes public records."
        />
      )}
    </div>
  );
}
