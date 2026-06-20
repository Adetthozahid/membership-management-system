import { PublicPageHeader } from "@/components/public/public-page-header";

type ManagedPage = {
  title: string;
  layout: "standard" | "landing" | "sidebar" | "custom";
  heroTitle: string | null;
  heroSubtitle: string | null;
  body: string | null;
  contentBlocks: unknown;
};

type ContentBlock = {
  type?: string;
  title?: string;
  body?: string;
  items?: Array<{ title?: string; body?: string }>;
};

function asBlocks(value: unknown): ContentBlock[] {
  return Array.isArray(value) ? (value as ContentBlock[]) : [];
}

export function ManagedPageContent({
  page,
  fallbackTitle,
  fallbackSubtitle,
  fallbackEyebrow,
}: {
  page: ManagedPage | null;
  fallbackTitle?: string;
  fallbackSubtitle?: string;
  fallbackEyebrow?: string;
}) {
  if (!page && !fallbackTitle) return null;
  const blocks = asBlocks(page?.contentBlocks);
  const headerTitle = page?.heroTitle ?? fallbackTitle;
  const headerSubtitle = page?.heroSubtitle ?? fallbackSubtitle;

  return (
    <div className={page?.layout === "landing" ? "space-y-8" : "space-y-6"}>
      {headerTitle ? (
        <PublicPageHeader
          eyebrow={fallbackEyebrow}
          title={headerTitle}
          subtitle={headerSubtitle}
        />
      ) : null}

      {page?.body ? (
        <div className="rounded-md border bg-card p-6 text-sm leading-7 text-muted-foreground">
          {page.body.split(/\n{2,}/).map((paragraph) => (
            <p key={paragraph} className="mb-4 last:mb-0">
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}

      {blocks.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {blocks.map((block, index) => (
            <article
              key={`${block.title ?? block.type ?? "block"}-${index}`}
              className="rounded-md border bg-card p-5"
            >
              {block.title ? (
                <h3 className="text-lg font-semibold tracking-normal">
                  {block.title}
                </h3>
              ) : null}
              {block.body ? (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {block.body}
                </p>
              ) : null}
              {block.items?.length ? (
                <div className="mt-4 grid gap-3">
                  {block.items.map((item, itemIndex) => (
                    <div
                      key={`${item.title ?? "item"}-${itemIndex}`}
                      className="rounded-md bg-muted p-3 text-sm"
                    >
                      {item.title ? (
                        <p className="font-medium">{item.title}</p>
                      ) : null}
                      {item.body ? (
                        <p className="mt-1 text-muted-foreground">
                          {item.body}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
