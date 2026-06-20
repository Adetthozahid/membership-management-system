"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { LayoutTemplate, Save } from "lucide-react";
import { apiRequest } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type WebsitePage = {
  id: string;
  key: string;
  title: string;
  route: string;
  status: "draft" | "published" | "hidden";
  layout: "standard" | "landing" | "sidebar" | "custom";
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  body: string | null;
  customTemplate: string | null;
  contentBlocks: unknown;
};

function formatBlocks(value: unknown) {
  try {
    return JSON.stringify(value ?? [], null, 2);
  } catch {
    return "[]";
  }
}

function parseBlocks(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return [];
  return JSON.parse(trimmed) as unknown;
}

export function PageContentManager({ pageKey, heading, eyebrow }: { pageKey: string; heading: string; eyebrow: string }) {
  const [pages, setPages] = useState<WebsitePage[]>([]);
  const [blocksText, setBlocksText] = useState("[]");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const page = useMemo(() => pages.find((item) => item.key === pageKey) ?? null, [pageKey, pages]);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiRequest<WebsitePage[]>("/admin/website/pages");
        setPages(data);
        const selected = data.find((item) => item.key === pageKey);
        setBlocksText(formatBlocks(selected?.contentBlocks ?? []));
      } catch {
        setMessage(`Could not load ${heading.toLowerCase()} settings.`);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [heading, pageKey]);

  function updatePage(patch: Partial<WebsitePage>) {
    setPages((current) => current.map((item) => (item.key === pageKey ? { ...item, ...patch } : item)));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!page) return;
    setMessage(null);
    try {
      const pageWithBlocks = { ...page, contentBlocks: parseBlocks(blocksText) };
      const updated = await apiRequest<WebsitePage[]>("/admin/website/pages", {
        method: "PATCH",
        body: JSON.stringify({ items: [pageWithBlocks] })
      });
      setPages(updated);
      const nextPage = updated.find((item) => item.key === page.key);
      setBlocksText(formatBlocks(nextPage?.contentBlocks ?? []));
      setMessage(`${heading} settings saved.`);
    } catch (error) {
      setMessage(error instanceof SyntaxError ? "Content blocks must be valid JSON." : `Could not save ${heading.toLowerCase()} settings.`);
    }
  }

  if (loading) {
    return <div className="rounded-md border bg-card p-5 text-sm text-muted-foreground">Loading {heading.toLowerCase()} controls...</div>;
  }

  if (!page) {
    return <div className="rounded-md border bg-card p-5 text-sm text-muted-foreground">{heading} page settings were not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">{heading}</h1>
      </div>

      {message ? <div className="rounded-md border bg-muted p-3 text-sm">{message}</div> : null}

      <form className="space-y-5" onSubmit={save}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5" aria-hidden="true" />
              Page Content
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium">Page title</span>
              <input className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm" value={page.title} onChange={(event) => updatePage({ title: event.target.value })} />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Route</span>
              <input className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm" value={page.route} onChange={(event) => updatePage({ route: event.target.value })} />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Status</span>
              <select className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm" value={page.status} onChange={(event) => updatePage({ status: event.target.value as WebsitePage["status"] })}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="hidden">Hidden</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium">Template/layout</span>
              <select className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm" value={page.layout} onChange={(event) => updatePage({ layout: event.target.value as WebsitePage["layout"] })}>
                <option value="standard">Standard content</option>
                <option value="landing">Landing page</option>
                <option value="sidebar">Sidebar layout</option>
                <option value="custom">Custom template</option>
              </select>
            </label>
            <label className="block text-sm lg:col-span-2">
              <span className="font-medium">Hero title</span>
              <input className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm" value={page.heroTitle ?? ""} onChange={(event) => updatePage({ heroTitle: event.target.value })} />
            </label>
            <label className="block text-sm lg:col-span-2">
              <span className="font-medium">Hero subtitle</span>
              <textarea className="mt-2 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm" value={page.heroSubtitle ?? ""} onChange={(event) => updatePage({ heroSubtitle: event.target.value })} />
            </label>
            <label className="block text-sm lg:col-span-2">
              <span className="font-medium">Dynamic page content</span>
              <textarea className="mt-2 min-h-40 w-full rounded-md border bg-background px-3 py-2 text-sm" value={page.body ?? ""} onChange={(event) => updatePage({ body: event.target.value })} />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SEO and Content Blocks</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium">Meta title</span>
              <input className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm" value={page.metaTitle ?? ""} onChange={(event) => updatePage({ metaTitle: event.target.value })} />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Meta keywords</span>
              <input className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm" value={page.metaKeywords ?? ""} onChange={(event) => updatePage({ metaKeywords: event.target.value })} />
            </label>
            <label className="block text-sm lg:col-span-2">
              <span className="font-medium">Meta description</span>
              <textarea className="mt-2 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm" value={page.metaDescription ?? ""} onChange={(event) => updatePage({ metaDescription: event.target.value })} />
            </label>
            <label className="block text-sm lg:col-span-2">
              <span className="font-medium">Content blocks JSON</span>
              <textarea className="mt-2 min-h-40 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs" value={blocksText} onChange={(event) => setBlocksText(event.target.value)} />
            </label>
          </CardContent>
        </Card>

        <Button type="submit">
          <Save className="h-4 w-4" aria-hidden="true" />
          Save {heading.toLowerCase()}
        </Button>
      </form>
    </div>
  );
}
