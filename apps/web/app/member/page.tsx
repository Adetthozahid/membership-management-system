"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { APP_NAME } from "@mms/shared";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CreditCard,
  FileText,
  Globe2,
  IdCard,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  UserRound
} from "lucide-react";
import { useMemberEndpoint, type MemberProfileData, type MemberRenewalData } from "@/components/member/member-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchPublicSite } from "@/services/public-site";

function money(value: number) {
  return `BDT ${value.toFixed(2)}`;
}

function dateValue(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "-";
}

export default function MemberDashboardPage() {
  const profile = useMemberEndpoint<MemberProfileData>("/member/profile");
  const renewal = useMemberEndpoint<MemberRenewalData>("/member/renewal-summary");
  const [siteTitle, setSiteTitle] = useState(APP_NAME);

  useEffect(() => {
    let cancelled = false;
    fetchPublicSite()
      .then((site) => {
        if (!cancelled && site) {
          setSiteTitle(site.website.siteTitle || site.organization.name || APP_NAME);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (profile.error || renewal.error) {
    return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">Could not load member dashboard.</div>;
  }

  if (!profile.data || !renewal.data) {
    return <div className="rounded-md border bg-card p-5 text-sm text-muted-foreground">Loading member dashboard...</div>;
  }

  const renewalStatus = renewal.data.renewal.required ? renewal.data.renewal.status.replaceAll("_", " ") : "Not required";
  const showMembership = Boolean(profile.data.membershipType || renewal.data.renewal.required || renewal.data.chanda.required);
  const quickActions = [
    { label: "View Profile", href: "/member/profile", icon: UserRound },
    showMembership ? { label: "Membership", href: "/member/renewal", icon: RefreshCw } : null,
    { label: "Payments", href: "/member/payments", icon: CreditCard },
    { label: "ID Card", href: "/member/id-card", icon: IdCard },
    { label: "Notice", href: "/member/notices", icon: Megaphone }
  ].filter((item): item is { label: string; href: string; icon: typeof UserRound } => Boolean(item));

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-[#eee5dc] bg-white shadow-[0_18px_55px_rgba(80,58,38,0.07)]">
        <div className="grid gap-6 bg-[linear-gradient(135deg,#fff8ef,#ffffff_46%,#fff2e8)] p-6 text-[#25201c] lg:grid-cols-[1fr_auto] lg:items-end md:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#f05a28]">{siteTitle}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal md:text-4xl">Welcome, {profile.data.fullName}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6f6258]">
              Track your membership status, registration record, renewal position, and member services from one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/member/profile">
                <UserRound className="h-4 w-4" aria-hidden="true" />
                Profile
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">
                <Globe2 className="h-4 w-4" aria-hidden="true" />
                Visit Website
              </Link>
            </Button>
          </div>
        </div>
        <div className="grid divide-y divide-[#eee5dc] bg-white md:grid-cols-3 md:divide-x md:divide-y-0">
          {[
            { label: "Member ID", value: profile.data.memberId ?? "Pending", icon: IdCard },
            { label: "Account Status", value: profile.data.status.replaceAll("_", " "), icon: BadgeCheck },
            { label: "Joined", value: dateValue(profile.data.joinedAt), icon: CalendarDays }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#fff1e8] text-[#f05a28]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-muted-foreground">{item.label}</span>
                  <span className="block truncate text-base font-semibold capitalize">{item.value}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {profile.data.mustChangePassword ? (
        <div className="flex flex-col gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold">Change your temporary password</div>
            <p className="mt-1">Your account is still using the temporary password issued during approval.</p>
          </div>
          <Button asChild className="shrink-0">
            <Link href="/member/change-password?temporary=1">
              Change Password
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Profile", value: profile.data.memberId ?? "Pending ID", icon: UserRound, href: "/member/profile" },
          { title: "Registration Form", value: "View / download", icon: FileText, href: "/member/registration" },
          showMembership ? { title: "Membership", value: profile.data.membershipType?.name ?? renewalStatus, icon: RefreshCw, href: "/member/renewal" } : null,
          { title: "ID Card", value: profile.data.memberId ?? "Pending", icon: IdCard, href: "/member/id-card" }
        ].filter((item): item is { title: string; value: string; icon: typeof UserRound; href: string } => Boolean(item)).map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-2xl font-semibold capitalize">{item.value}</p>
                <Button asChild variant="outline" size="sm">
                  <Link href={item.href}>
                    View
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
              Account overview
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["Email", profile.data.email],
              ["Phone", profile.data.phone ?? "-"],
              ["Membership type", profile.data.membershipType?.name ?? "Not assigned"],
              ["Renewal status", renewalStatus],
              ["Renewal due", renewal.data.renewal.periodEndsAt ? dateValue(renewal.data.renewal.periodEndsAt) : "Not required"],
              ["Subscription fee due", money(renewal.data.chanda.balance)]
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border bg-background/50 p-3">
                <div className="text-xs font-medium text-muted-foreground">{label}</div>
                <div className="mt-1 break-words font-semibold">{value}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {quickActions.map((item) => {
              const Icon = item.icon;
              return (
                <Button key={item.href} asChild variant="outline" className="h-11 justify-between">
                  <Link href={item.href}>
                    <span className="inline-flex items-center gap-2">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border bg-card p-5 text-sm leading-6 text-muted-foreground shadow-sm">
        <div className="font-semibold text-foreground">Profile updates</div>
        <p className="mt-2">{profile.data.editing.message}</p>
      </div>
    </div>
  );
}
