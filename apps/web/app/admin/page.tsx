"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MemberSummary, PaginatedCorrectionSubmissionsResponse, PaginatedMembersResponse } from "@mms/shared";
import {
  ArrowRight,
  BadgeDollarSign,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FilePenLine,
  Image as ImageIcon,
  LayoutDashboard,
  Sparkles,
  TrendingUp,
  UserCheck,
  UsersRound
} from "lucide-react";
import { apiRequest } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MediaLibraryResponse = {
  items: Array<{ id: string; title: string; mediaType: string; createdAt: string }>;
  total: number;
};

type PublicCollection<T = unknown> = {
  items: T[];
  total: number;
};

type DashboardData = {
  allMembers: PaginatedMembersResponse | null;
  pendingMembers: PaginatedMembersResponse | null;
  approvedMembers: PaginatedMembersResponse | null;
  activeMembers: PaginatedMembersResponse | null;
  applications: PaginatedMembersResponse | null;
  corrections: PaginatedCorrectionSubmissionsResponse | null;
  media: MediaLibraryResponse | null;
  notices: PublicCollection | null;
  events: PublicCollection | null;
};

const emptyData: DashboardData = {
  allMembers: null,
  pendingMembers: null,
  approvedMembers: null,
  activeMembers: null,
  applications: null,
  corrections: null,
  media: null,
  notices: null,
  events: null
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

function metricValue(value: number | null | undefined) {
  if (value === null || value === undefined) return "0";
  return new Intl.NumberFormat().format(value);
}

function moneyValue(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0
  }).format(value);
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function MiniGrowthChart({ members }: { members: MemberSummary[] }) {
  const points = useMemo(() => {
    const lastSixMonths = Array.from({ length: 6 }).map((_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        label: date.toLocaleDateString(undefined, { month: "short" }),
        count: 0
      };
    });

    const map = new Map(lastSixMonths.map((item) => [item.key, item]));
    members.forEach((member) => {
      const date = new Date(member.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const bucket = map.get(key);
      if (bucket) bucket.count += 1;
    });
    return lastSixMonths;
  }, [members]);

  const max = Math.max(1, ...points.map((point) => point.count));
  const path = points
    .map((point, index) => {
      const x = (index / Math.max(1, points.length - 1)) * 100;
      const y = 92 - (point.count / max) * 72;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className="rounded-2xl border bg-white p-4">
      <svg viewBox="0 0 100 100" className="h-44 w-full overflow-visible" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="member-growth-line" x1="0" x2="1" y1="0" y2="0">
            <stop stopColor="hsl(var(--primary))" />
            <stop offset="1" stopColor="hsl(var(--terracotta))" />
          </linearGradient>
        </defs>
        <path d={`${path} L 100 100 L 0 100 Z`} fill="hsl(var(--primary) / 0.08)" />
        <path d={path} fill="none" stroke="url(#member-growth-line)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {points.map((point, index) => {
          const x = (index / Math.max(1, points.length - 1)) * 100;
          const y = 92 - (point.count / max) * 72;
          return <circle key={point.key} cx={x} cy={y} r="2.2" fill="hsl(var(--primary))" vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      <div className="mt-2 grid grid-cols-6 gap-2 text-center text-xs text-muted-foreground">
        {points.map((point) => (
          <div key={point.key}>
            <div className="font-semibold text-foreground">{point.count}</div>
            <div>{point.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  href
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof UsersRound;
  href?: string;
}) {
  const content = (
    <Card className="group h-full overflow-hidden rounded-[24px] border-slate-200/80 bg-white/95 shadow-[0_18px_55px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_24px_75px_rgba(15,23,42,0.11)]">
      <CardContent className="p-5 sm:p-6">
        <div className="relative min-h-[4.5rem] pr-14">
          <div className="min-w-0">
            <p className="text-sm font-medium leading-5 text-muted-foreground">{label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">{value}</p>
          </div>
          <div className="absolute right-1 top-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)/0.14),hsl(var(--terracotta)/0.12))] text-primary ring-1 ring-primary/10 sm:h-11 sm:w-11">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-5 flex items-end justify-between gap-3 text-xs leading-5 text-muted-foreground">
          <span className="min-w-0">{hint}</span>
          {href ? <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" /> : null}
        </div>
      </CardContent>
    </Card>
  );

  if (!href) return content;
  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

function QueueList({
  title,
  count,
  items,
  empty,
  href,
  icon: Icon
}: {
  title: string;
  count: number;
  items: Array<{ id: string; href: string; title: string; subtitle: string; meta: string }>;
  empty: string;
  href: string;
  icon: typeof ClipboardList;
}) {
  return (
    <Card className="rounded-[26px] border-slate-200/80 bg-white/95 shadow-[0_22px_70px_rgba(15,23,42,0.07)]">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{count} pending</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={href}>Open</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-slate-50 p-4 text-sm text-muted-foreground">{empty}</div>
        ) : (
          items.map((item) => (
            <Link key={item.id} href={item.href} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-sm shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary ring-1 ring-primary/10">{initials(item.title) || "A"}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-foreground">{item.title}</div>
                <div className="truncate text-muted-foreground">{item.subtitle}</div>
              </div>
              <div className="whitespace-nowrap text-xs text-muted-foreground">{item.meta}</div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function MemberRow({ member }: { member: MemberSummary }) {
  return (
    <Link href={`/admin/members/${member.id}`} className="grid grid-cols-[1fr_auto] gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-sm shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5">
      <div className="min-w-0">
        <div className="truncate font-semibold">{member.fullName}</div>
        <div className="truncate text-muted-foreground">{member.email}</div>
      </div>
      <div className="text-right">
        <div className="font-medium text-primary">{member.memberId ?? "Pending"}</div>
        <div className="text-xs capitalize text-muted-foreground">{statusLabel(member.status)}</div>
      </div>
    </Link>
  );
}

export default function AdminPage() {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setError(null);
        const [allMembers, pendingMembers, approvedMembers, activeMembers, applications, corrections, media, notices, events] = await Promise.all([
          apiRequest<PaginatedMembersResponse>("/members?limit=80"),
          apiRequest<PaginatedMembersResponse>("/members?status=pending&limit=5"),
          apiRequest<PaginatedMembersResponse>("/members?status=approved&limit=5"),
          apiRequest<PaginatedMembersResponse>("/members?status=active&limit=5"),
          apiRequest<PaginatedMembersResponse>("/members/applications/pending?limit=5"),
          apiRequest<PaginatedCorrectionSubmissionsResponse>("/members/corrections/pending?limit=5"),
          apiRequest<MediaLibraryResponse>("/admin/website/media?limit=5"),
          apiRequest<PublicCollection>("/public/notices").catch(() => ({ items: [], total: 0 })),
          apiRequest<PublicCollection>("/public/events").catch(() => ({ items: [], total: 0 }))
        ]);
        setData({ allMembers, pendingMembers, approvedMembers, activeMembers, applications, corrections, media, notices, events });
      } catch {
        setError("Could not load dashboard overview.");
      }
    }

    void loadDashboard();
  }, []);

  const approvedTotal = (data.approvedMembers?.total ?? 0) + (data.activeMembers?.total ?? 0);
  const recentMembers = data.allMembers?.items.slice(0, 5) ?? [];
  const pendingApprovalItems =
    data.applications?.items.map((application) => ({
      id: application.id,
      href: `/admin/applications/${application.id}`,
      title: application.fullName,
      subtitle: application.email,
      meta: formatDate(application.createdAt)
    })) ?? [];
  const correctionItems =
    data.corrections?.items.map((submission) => ({
      id: submission.id,
      href: `/admin/applications/${submission.memberId}`,
      title: submission.member.fullName,
      subtitle: submission.message ?? "Data change request",
      meta: formatDate(submission.createdAt)
    })) ?? [];
  const activePercent = data.allMembers?.total ? Math.round(((data.activeMembers?.total ?? 0) / data.allMembers.total) * 100) : 0;
  const pendingPercent = data.allMembers?.total ? Math.round(((data.pendingMembers?.total ?? 0) / data.allMembers.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbfa_48%,hsl(var(--primary)/0.08)_100%)] shadow-[0_30px_100px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/70">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_360px] lg:p-8">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary shadow-sm">
              <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
              Admin dashboard
            </div>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-normal text-slate-950 md:text-5xl">Operations control center</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Monitor members, approvals, website content, media, and collections from one clean workspace.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/admin/applications">
                  <ClipboardList className="h-4 w-4" aria-hidden="true" />
                  Review applications
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/members">
                  <UsersRound className="h-4 w-4" aria-hidden="true" />
                  Open members
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid content-between gap-4 rounded-3xl border border-primary/10 bg-white/90 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active members</p>
                <p className="mt-2 text-4xl font-semibold text-slate-950">{activePercent}%</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <TrendingUp className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--terracotta)))]" style={{ width: `${activePercent}%` }} />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{metricValue(data.activeMembers?.total)} active</span>
                <span>{pendingPercent}% pending</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <section className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <MetricCard label="Total Members" value={metricValue(data.allMembers?.total)} hint="All records in the system" icon={UsersRound} href="/admin/members" />
        <MetricCard label="Pending Members" value={metricValue(data.pendingMembers?.total)} hint="Waiting for review" icon={Clock3} href="/admin/applications" />
        <MetricCard label="Approved Members" value={metricValue(approvedTotal)} hint="Approved and active profiles" icon={UserCheck} href="/admin/members" />
        <MetricCard label="Gallery Items" value={metricValue(data.media?.total)} hint="Uploaded media assets" icon={ImageIcon} href="/admin/gallery" />
        <MetricCard label="Total Events" value={metricValue(data.events?.total)} hint="Ready for event module data" icon={CalendarDays} href="/admin/events" />
        <MetricCard label="Notices" value={metricValue(data.notices?.total)} hint="Published notice count" icon={Bell} href="/admin/notices" />
        <MetricCard label="Total Collection" value={moneyValue(0)} hint="Payment summary API pending" icon={BadgeDollarSign} href="/admin/renewal-settings" />
        <MetricCard label="Pending Payments" value="0" hint="Awaiting payment review" icon={Sparkles} href="/admin/renewal-settings" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-[28px] border-slate-200/80 bg-white/95 shadow-[0_22px_70px_rgba(15,23,42,0.07)]">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Member Growth</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">New member records across the recent months.</p>
            </div>
            <span className="rounded-full border border-primary/10 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Live members data</span>
          </CardHeader>
          <CardContent>
            <MiniGrowthChart members={data.allMembers?.items ?? []} />
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-slate-200/80 bg-white/95 shadow-[0_22px_70px_rgba(15,23,42,0.07)]">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Recent Members</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">Latest records added to the system.</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/members">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentMembers.length ? recentMembers.map((member) => <MemberRow key={member.id} member={member} />) : <div className="rounded-2xl border border-dashed bg-slate-50 p-4 text-sm text-muted-foreground">No members yet.</div>}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <QueueList title="Pending Approval" count={data.applications?.total ?? 0} items={pendingApprovalItems} empty="No new pending applications." href="/admin/applications" icon={ClipboardList} />
        <QueueList title="Data Change Requests" count={data.corrections?.total ?? 0} items={correctionItems} empty="No data change requests." href="/admin/applications" icon={FilePenLine} />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="rounded-[28px] border-slate-200/80 bg-white/95 shadow-[0_22px_70px_rgba(15,23,42,0.07)]">
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">Payment summary is ready for the admin payments API when it is added.</p>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-dashed bg-slate-50 p-5 text-sm text-muted-foreground">No admin payment feed available yet.</div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-slate-200/80 bg-white/95 shadow-[0_22px_70px_rgba(15,23,42,0.07)]">
          <CardHeader>
            <CardTitle>Latest Notices / Events</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">Content publishing overview.</p>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Link href="/admin/notices" className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 text-sm hover:bg-primary/5">
              <span>Notices</span>
              <span className="font-semibold text-primary">{metricValue(data.notices?.total)}</span>
            </Link>
            <Link href="/admin/events" className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 text-sm hover:bg-primary/5">
              <span>Events</span>
              <span className="font-semibold text-primary">{metricValue(data.events?.total)}</span>
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-slate-200/80 bg-white/95 shadow-[0_22px_70px_rgba(15,23,42,0.07)]">
          <CardHeader>
            <CardTitle>Gallery Upload Summary</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">Latest media activity from the gallery library.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data.media?.items ?? []).length ? (
              data.media!.items.slice(0, 4).map((item) => (
                <Link key={item.id} href={`/admin/gallery/${item.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-3 text-sm hover:bg-primary/5">
                  <span className="truncate font-medium">{item.title}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold capitalize text-primary">{item.mediaType}</span>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed bg-slate-50 p-4 text-sm text-muted-foreground">No media uploaded yet.</div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
