import type { Metadata } from "next";
import Link from "next/link";
import type { PublicMemberSummary } from "@mms/shared";
import { Archive, ArrowRight, BriefcaseBusiness, ChevronRight, GraduationCap, Search, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/public/empty-state";
import { MemberCard } from "@/components/public/member-card";
import { PublicPageHeader } from "@/components/public/public-page-header";
import { Button } from "@/components/ui/button";
import { getPublicDirectory } from "@/lib/api";

export const metadata: Metadata = {
  title: "Member Directory",
  description: "Search the public member directory.",
};

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    const file = value as { fileName?: string; fileUrl?: string };
    return file.fileName ?? file.fileUrl ?? null;
  }
  return String(value);
}

function normalized(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function memberBatch(member: PublicMemberSummary) {
  const batchField = member.publicFields.find((field) => {
    const key = normalized(field.key);
    const label = normalized(field.label);
    return ["batch", "barch", "session", "year", "passingyear"].some((name) => key.includes(name) || label.includes(name));
  });
  return displayValue(batchField?.value) ?? (member.joinedAt ? new Date(member.joinedAt).getFullYear().toString() : null);
}

export default async function MemberDirectoryPage({
  searchParams,
}: {
  searchParams: { search?: string; membershipTypeId?: string; page?: string; tab?: string };
}) {
  const activeTab = searchParams.tab === "executive" ? "executive" : "all";
  const directory = await getPublicDirectory({
    search: searchParams.search,
    membershipTypeId: searchParams.membershipTypeId,
    page: searchParams.page ?? 1,
    limit: 12,
  }).catch(() => null);
  const page = directory?.page ?? 1;
  const archives = ["2023 - 2024", "2022 - 2023", "2021 - 2022", "2020 - 2021", "2019 - 2020"];
  const executiveMembers = directory?.items.slice(0, 6) ?? [];
  const batchCounts = new Map<string, number>();
  for (const member of directory?.items ?? []) {
    const batch = memberBatch(member);
    if (batch) batchCounts.set(batch, (batchCounts.get(batch) ?? 0) + 1);
  }
  const batches = Array.from(batchCounts.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  const visibleMembers = activeTab === "all" ? directory?.items ?? [] : executiveMembers;

  return (
    <div className="space-y-6">
      <PublicPageHeader
        eyebrow="Members"
        title="Member of Sociology Alumni Association of SUST"
        subtitle="Explore approved alumni profiles and stay connected with the verified members of the association."
      />
      <div className="space-y-6">
        <div className="space-y-6">
          <div className="grid overflow-hidden rounded-md border bg-card shadow-sm md:grid-cols-2">
            {[
              {
                id: "all",
                title: "All Members",
                body: "View all verified alumni members",
                icon: UsersRound,
                query: { ...searchParams, tab: undefined, page: 1 }
              },
              {
                id: "executive",
                title: "Executive Members",
                body: "View executive committee and archive",
                icon: BriefcaseBusiness,
                query: { ...searchParams, tab: "executive", page: 1 }
              }
            ].map((item) => {
              const Icon = item.icon;
              const selected = activeTab === item.id;
              return (
                <Link
                  key={item.id}
                  href={{ pathname: "/members", query: item.query }}
                  className={`flex min-h-20 items-center gap-4 border-b p-4 transition last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 ${
                    selected ? "bg-background shadow-[inset_0_-3px_0_hsl(var(--primary))]" : "hover:bg-muted/60"
                  }`}
                >
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${selected ? "bg-primary text-primary-foreground" : "bg-[hsl(var(--terracotta))] text-white"}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{item.title}</span>
                    <span className="block truncate text-sm text-muted-foreground">{item.body}</span>
                  </span>
                </Link>
              );
            })}
          </div>

          {activeTab === "all" ? (
            <form
              className="grid gap-3 rounded-md border bg-card p-4 md:grid-cols-[1fr_220px_auto]"
              action="/members"
            >
              <label className="relative block">
                <Search
                  className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  name="search"
                  defaultValue={searchParams.search ?? ""}
                  className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm"
                  placeholder="Search by name, member number, or type"
                />
              </label>
              <select
                name="membershipTypeId"
                defaultValue={searchParams.membershipTypeId ?? ""}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">All member types</option>
                {(directory?.filters.membershipTypes ?? []).map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              <Button type="submit">Search</Button>
            </form>
          ) : (
            <div className="rounded-md border bg-card p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-[hsl(var(--terracotta))]">Executive Committee</p>
              <h2 className="mt-2 font-serif text-2xl font-bold text-primary">Current executive members</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Browse current executive profiles here. Archive terms are available from the card on the right.
              </p>
            </div>
          )}

          {visibleMembers.length ? (
            <div className="relative left-1/2 grid w-[calc(100vw-2rem)] -translate-x-1/2 gap-5 sm:w-[calc(100vw-3rem)] lg:w-[calc(100vw-4rem)] lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {visibleMembers.map((member) => (
                    <MemberCard key={member.id} member={member} />
                  ))}
                </div>
                {activeTab === "all" ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Page {page} of {directory?.totalPages || 1}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className={
                          page <= 1 ? "pointer-events-none opacity-50" : undefined
                        }
                      >
                        <Link
                          href={{
                            pathname: "/members",
                            query: { ...searchParams, page: Math.max(1, page - 1) },
                          }}
                        >
                          Previous
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className={
                          directory && page >= directory.totalPages
                            ? "pointer-events-none opacity-50"
                            : undefined
                        }
                      >
                        <Link
                          href={{
                            pathname: "/members",
                            query: { ...searchParams, page: page + 1 },
                          }}
                        >
                          Next
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
              {activeTab === "executive" ? (
                <ExecutiveArchiveSidebar archives={archives} />
              ) : (
                <BatchSidebar batches={batches} />
              )}
            </div>
          ) : (
            <EmptyState
              title={activeTab === "all" ? "No public members found" : "No executive members found"}
              body="Try another search, or check back after memberships are approved and visible under renewal rules."
            />
          )}
        </div>

      </div>
    </div>
  );
}

function BatchSidebar({ batches }: { batches: Array<[string, number]> }) {
  return (
    <aside className="self-start rounded-md border bg-card shadow-sm">
      <div className="flex items-center gap-4 border-b p-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <GraduationCap className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Batch / Year</span>
          <span className="block text-sm text-muted-foreground">Browse regular members by batch</span>
        </span>
      </div>
      <div className="divide-y px-5">
        {batches.length ? (
          batches.map(([batch, count]) => (
            <div key={batch} className="flex items-center gap-3 py-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <GraduationCap className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{batch}</span>
                <span className="block text-xs text-muted-foreground">{count} member{count === 1 ? "" : "s"} on this page</span>
              </span>
            </div>
          ))
        ) : (
          <div className="py-5 text-sm text-muted-foreground">No batch data available.</div>
        )}
      </div>
    </aside>
  );
}

function ExecutiveArchiveSidebar({ archives }: { archives: string[] }) {
  return (
    <aside className="self-start rounded-md border bg-card shadow-sm">
      <Link href="/committees/previous" className="flex items-center gap-4 border-b p-5 hover:bg-muted/50">
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Archive className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Executive Archive</span>
          <span className="block text-sm text-muted-foreground">Browse past executive committees</span>
        </span>
        <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </Link>
      <div className="divide-y px-5">
        {archives.map((term) => (
          <Link key={term} href="/committees/previous" className="flex items-center gap-3 py-4 hover:text-primary">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
              <UsersRound className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{term}</span>
              <span className="block text-xs text-muted-foreground">Executive Committee</span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </Link>
        ))}
      </div>
      <div className="p-5">
        <Button asChild variant="outline" className="w-full justify-between">
          <Link href="/committees/previous">
            View All Archives
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </aside>
  );
}
