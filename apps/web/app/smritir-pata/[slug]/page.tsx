import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, UserRound } from "lucide-react";
import { BlogPostComments } from "@/components/public/blog-post-comments";
import { EmptyState } from "@/components/public/empty-state";
import { PublicPageHeader } from "@/components/public/public-page-header";
import { getPublicCollection, getPublicPostComments } from "@/lib/api";

export const metadata: Metadata = {
  title: "Smritir Pata Post",
};

export const dynamic = "force-dynamic";

export default async function SmritirPataDetailsPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPublicCollection(
    `/public/smritir-pata/${params.slug}`,
    { cache: "no-store" },
  ).catch(() => null);
  const item = post?.items?.[0];
  const comments = item?.allowComments === false
    ? null
    : await getPublicPostComments(params.slug, { cache: "no-store" }).catch(() => null);

  if (!item) {
    return (
      <EmptyState
        title="Post not published"
        body="This Smritir Pata route is ready, but no public post exists for this address yet."
      />
    );
  }

  return (
    <article className="mx-auto max-w-4xl space-y-5">
      <PublicPageHeader
        eyebrow="Smritir Pata"
        title={item.title}
        subtitle={undefined}
      />
      <div className="flex flex-wrap gap-3 rounded-md border bg-card p-4 text-sm font-medium text-muted-foreground">
        {item.publishedAt ? (
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
            Published Date
            {new Date(item.publishedAt).toLocaleDateString()}
          </span>
        ) : null}
        <span className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-primary" aria-hidden="true" />
          Written by{" "}
          {item.authorProfileUrl ? (
            <Link href={item.authorProfileUrl} className="font-semibold text-foreground hover:text-primary hover:underline">
              {item.authorName ?? "Admin"}
            </Link>
          ) : (
            <strong className="text-foreground">{item.authorName ?? "Admin"}</strong>
          )}
        </span>
      </div>
      {item.tags?.length ? (
        <div className="flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <span key={tag} className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              #{tag}
            </span>
          ))}
        </div>
      ) : null}
      <div
        className="prose prose-sm max-w-none text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: item.body ?? "" }}
      />
      {item.allowComments !== false ? <BlogPostComments slug={item.slug} initialComments={comments?.items ?? []} /> : null}
    </article>
  );
}
