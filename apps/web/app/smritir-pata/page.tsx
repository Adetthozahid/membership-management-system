import type { Metadata } from "next";
import Link from "next/link";
import { Tags } from "lucide-react";
import type { PublicContentItem } from "@mms/shared";
import { EmptyState } from "@/components/public/empty-state";
import { ManagedPageContent } from "@/components/public/managed-page-content";
import { getPublicCollection, getPublicPage } from "@/lib/api";

export const metadata: Metadata = {
  title: "Smritir Pata",
  description: "Member memories, stories, and alumni writings.",
};

export const dynamic = "force-dynamic";

function PostCard({ item }: { item: PublicContentItem }) {
  return (
    <article className="rounded-md border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {item.category ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-primary">
            <Tags className="h-3.5 w-3.5" aria-hidden="true" />
            {item.category}
          </span>
        ) : null}
        <span>{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : "Published"}</span>
      </div>
      <h2 className="mt-3 text-xl font-semibold">
        <Link href={`/smritir-pata/${item.slug}`} className="hover:text-primary">
          {item.title}
        </Link>
      </h2>
      {item.summary ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.summary}</p> : null}
      {item.tags?.length ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span key={tag} className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
              #{tag}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default async function SmritirPataPage() {
  const [posts, page] = await Promise.all([
    getPublicCollection("/public/smritir-pata", { cache: "no-store" }).catch(() => null),
    getPublicPage("srithir_patha").catch(() => null),
  ]);

  return (
    <div className="space-y-6">
      <ManagedPageContent
        page={
          page
            ? ({
                ...(page as object),
                contentBlocks: [],
                heroSubtitle: "Read memories, campus stories, and alumni writings from members.",
              } as Parameters<typeof ManagedPageContent>[0]["page"])
            : null
        }
        fallbackEyebrow="Blog"
        fallbackTitle="Smritir Pata"
        fallbackSubtitle="Read memories, campus stories, and alumni writings from members."
      />
      {posts?.items?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {posts.items.map((item) => (
            <PostCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No posts published"
          body="Published Smritir Pata posts will appear here."
        />
      )}
    </div>
  );
}
