import type { Metadata } from "next";
import { EmptyState } from "@/components/public/empty-state";
import { PublicPageHeader } from "@/components/public/public-page-header";
import { getPublicCollection } from "@/lib/api";

export const metadata: Metadata = {
  title: "Notice Details",
};

export const dynamic = "force-dynamic";

export default async function NoticeDetailsPage({
  params,
}: {
  params: { slug: string };
}) {
  const notice = await getPublicCollection(
    `/public/notices/${params.slug}`,
  ).catch(() => null);
  const item = notice?.items?.[0];

  if (!item) {
    return (
      <EmptyState
        title="Notice not published"
        body="This notice route is ready, but no public notice exists for this address yet."
      />
    );
  }

  return (
    <article className="mx-auto max-w-7xl space-y-4">
      <PublicPageHeader
        eyebrow="Notice"
        title={`${item.title} of Sociology Alumni Association of SUST`}
        subtitle={item.summary ?? undefined}
      />
      <div className="prose prose-sm max-w-none text-muted-foreground">
        {item.body ?? item.summary}
      </div>
    </article>
  );
}
