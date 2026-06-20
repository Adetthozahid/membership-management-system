"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME, type AuthUser } from "@mms/shared";
import {
  ArrowRight,
  Bell,
  BookOpenText,
  CalendarDays,
  LayoutDashboard,
  ClipboardList,
  ExternalLink,
  Globe2,
  Image as ImageIcon,
  LogIn,
  Megaphone,
  Menu,
  Settings,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { MemberFloatingChat } from "@/components/member/member-floating-chat";
import { Button } from "@/components/ui/button";
import { getSiteUrl } from "@/lib/domains";
import { cn } from "@/lib/utils";
import { apiRequest, fetchCurrentUser, refreshSession } from "@/lib/auth-client";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const headerNavKeys = new Set(["home", "about", "members", "gallery", "srithir_patha"]);

const fallbackWebsiteNav = [
  { key: "home", href: "/", label: "Home" },
  { key: "about", href: "/about", label: "About" },
  { key: "members", href: "/members", label: "Members" },
  {
    key: "committees_current",
    href: "/committees/current",
    label: "Current Committees",
  },
  {
    key: "committees_previous",
    href: "/committees/previous",
    label: "Previous Committees",
  },
  { key: "notices", href: "/notices", label: "Notices" },
  { key: "events", href: "/events", label: "Events" },
  { key: "srithir_patha", href: "/smritir-pata", label: "Smritir Pata" },
  { key: "gallery", href: "/gallery", label: "Gallery" },
  { key: "donation", href: "/donation", label: "Donation" },
  {
    key: "election_results",
    href: "/election-results",
    label: "Election Results",
  },
  { key: "registration", href: "/register", label: "Become a member" },
  { key: "login", href: "/login", label: "Login" },
];

function normalizeWebsiteNav(items: WebsiteNavItem[]) {
  return items
    .filter((item) => item.key !== "verify" && item.href !== "/verify")
    .map((item) =>
      item.key === "registration" || item.href === "/register"
        ? { ...item, label: "Become a member" }
        : item,
    );
}

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: ShieldCheck },
  { href: "/admin/website", label: "Website Control", icon: Globe2 },
  { href: "/admin/notices", label: "Notices", icon: Megaphone },
  { href: "/admin/events", label: "Events", icon: CalendarDays },
  { href: "/admin/smritir-pata", label: "Smritir Pata", icon: BookOpenText },
  { href: "/admin/gallery", label: "Gallery", icon: ImageIcon },
  { href: "/admin/members", label: "Members", icon: UsersRound },
  { href: "/admin/applications", label: "Applications", icon: ClipboardList },
  { href: "/admin/form-builder", label: "Forms", icon: Settings },
  { href: "/admin/membership-types", label: "Types", icon: Settings },
  { href: "/admin/renewal-settings", label: "Renewals", icon: Settings },
];

type WebsiteNavItem = (typeof fallbackWebsiteNav)[number];
type WebsiteIdentity = { siteTitle: string; logoUrl: string | null };
type NotificationToast = { id: string; title: string; message: string; href: string } | null;
type MemberNotificationSummary = {
  id: string;
  type: "notice" | "event" | "post" | "gallery" | "website";
  title: string;
  message: string;
  href: string;
  createdAt: string;
};
const websiteSubtitle = "সাস্ট সমাজবিজ্ঞান অ্যালামনাই অ্যাসোসিয়েশন";

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  children,
  initialWebsiteNav,
  initialWebsiteIdentity,
}: {
  children: React.ReactNode;
  initialWebsiteNav?: WebsiteNavItem[];
  initialWebsiteIdentity?: WebsiteIdentity;
}) {
  const pathname = usePathname();
  const isAdminLogin = pathname === "/admin/login";
  const isAdmin = pathname.startsWith("/admin") && !isAdminLogin;
  const isMemberLogin = pathname === "/member/login" || pathname === "/login";
  const isMemberPath = pathname === "/member" || pathname.startsWith("/member/");
  const isMemberArea = isMemberPath && !isMemberLogin;
  const [websiteNav, setWebsiteNav] = useState<WebsiteNavItem[] | null>(
    initialWebsiteNav ? normalizeWebsiteNav(initialWebsiteNav) : null,
  );
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationToast, setNotificationToast] = useState<NotificationToast>(null);
  const [websiteIdentity, setWebsiteIdentity] = useState<WebsiteIdentity>(
    initialWebsiteIdentity ?? {
      siteTitle: APP_NAME,
      logoUrl: null,
    },
  );

  useEffect(() => {
    if (isAdmin) return;
    let cancelled = false;
    fetch(`${apiBaseUrl}/api/public/navigation`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { items?: WebsiteNavItem[] } | null) => {
        if (!cancelled)
          setWebsiteNav(
            data?.items?.length
              ? normalizeWebsiteNav(data.items)
              : fallbackWebsiteNav,
          );
      })
      .catch(() => {
        if (!cancelled) setWebsiteNav(fallbackWebsiteNav);
      });
    fetch(`${apiBaseUrl}/api/public/site`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (
          data: {
            website?: { siteTitle?: string; logoUrl?: string | null };
            organization?: { name?: string };
          } | null,
        ) => {
          if (!cancelled && data) {
            setWebsiteIdentity({
              siteTitle:
                data.website?.siteTitle || data.organization?.name || APP_NAME,
              logoUrl: data.website?.logoUrl ?? null,
            });
          }
        },
      )
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    if (isAdminLogin) return;
    fetchCurrentUser()
      .then(({ user }) => {
        if (!cancelled) setAuthUser(user);
      })
      .catch(async () => {
        try {
          const refreshed = await refreshSession();
          const { user } = await fetchCurrentUser(refreshed.accessToken);
          if (!cancelled) setAuthUser(user);
        } catch {
          if (!cancelled) setAuthUser(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAdminLogin, pathname]);

  useEffect(() => {
    let cancelled = false;
    if (!isMemberArea) {
      setNotificationCount(0);
      return;
    }
    apiRequest<{ unreadCount: number; items?: MemberNotificationSummary[] }>("/member/notifications")
      .then((data) => {
        if (cancelled) return;
        setNotificationCount(data.unreadCount);
        const first = data.items?.[0];
        if (!first || data.unreadCount <= 0) return;
        const isActionablePost =
          first.type === "post" &&
          (first.id.startsWith("smritir-correction:") || first.id.startsWith("smritir-rejected:"));
        if (!isActionablePost) return;
        const toastKey = "mms_last_notification_toast";
        if (window.localStorage.getItem(toastKey) === first.id) return;
        window.localStorage.setItem(toastKey, first.id);
        setNotificationToast({ id: first.id, title: first.title, message: first.message, href: first.href });
      })
      .catch(() => {
        if (!cancelled) setNotificationCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [isMemberArea, pathname]);

  if (isAdmin) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f6f8f7] text-slate-950">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/88 shadow-[0_14px_45px_rgba(15,23,42,0.06)] backdrop-blur-xl">
          <div className="flex w-full flex-col gap-4 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
            <Link
              href="/admin"
              className="group flex min-w-0 items-center gap-3"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_16px_35px_hsl(var(--primary)/0.22)] transition group-hover:-translate-y-0.5">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xl font-bold leading-6 tracking-normal text-slate-950">
                  {websiteIdentity.siteTitle}
                </span>
                <span className="block truncate text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Operations workspace
                </span>
              </span>
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-primary/30 hover:bg-primary/5 lg:hidden"
                onClick={() => setMobileMenuOpen((value) => !value)}
                aria-label={mobileMenuOpen ? "Close admin menu" : "Open admin menu"}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Menu className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
              <Button asChild variant="outline" size="sm" className="border-slate-200 bg-white shadow-sm hover:border-primary/30 hover:bg-primary/5">
                <Link href={getSiteUrl("/")}>
                  <Globe2 className="h-4 w-4" aria-hidden="true" />
                  View Website
                </Link>
              </Button>
              <LogoutButton />
            </div>
          </div>
        </header>
        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
              aria-label="Close admin menu"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="relative flex h-full w-[min(86vw,340px)] flex-col overflow-hidden border-r border-slate-200 bg-white shadow-[24px_0_70px_rgba(15,23,42,0.22)]">
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Workspace</p>
                  <p className="text-sm font-semibold text-slate-900">Membership Admin</p>
                </div>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100"
                  aria-label="Close admin menu"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <nav className="grid gap-1.5 overflow-y-auto p-3">
                {adminNav.map((item) => {
                  const Icon = item.icon;
                  const active = isActivePath(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
                        active
                          ? "bg-primary text-primary-foreground shadow-[0_16px_34px_hsl(var(--primary)/0.18)]"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl transition",
                          active ? "bg-white/18 text-white" : "bg-slate-100 text-primary group-hover:bg-white"
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        ) : null}
        <div className="grid w-full flex-1 gap-5 px-3 py-4 sm:px-4 sm:py-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-5 xl:px-6">
          <aside className="hidden rounded-[28px] border border-slate-200/80 bg-white/90 p-3 shadow-[0_22px_65px_rgba(15,23,42,0.07)] lg:sticky lg:top-24 lg:block lg:h-[calc(100vh-7.5rem)] lg:self-start lg:overflow-y-auto">
            <div className="mb-3 rounded-2xl border border-primary/10 bg-primary/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Workspace</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Membership Admin</p>
            </div>
            <nav className="grid gap-1.5">
              {adminNav.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
                      active
                        ? "bg-primary text-primary-foreground shadow-[0_16px_34px_hsl(var(--primary)/0.18)]"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-xl transition",
                        active ? "bg-white/18 text-white" : "bg-slate-100 text-primary group-hover:bg-white"
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <main className="min-w-0 rounded-[24px] bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.09),transparent_24rem),linear-gradient(180deg,#ffffff_0%,#f6f8f7_42%,#eef5f2_100%)] p-3 shadow-inner sm:rounded-[30px] sm:p-4 xl:p-5">
            {children}
          </main>
        </div>
      </div>
    );
  }

  if (isAdminLogin) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="border-b bg-card">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
            <Link
              href="/admin/login"
              className="flex min-w-0 items-center gap-3 text-base font-semibold"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="truncate">{websiteIdentity.siteTitle}</span>
            </Link>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href={getSiteUrl("/")}>
                <Globe2 className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">View Website</span>
                <span className="sm:hidden">Website</span>
              </Link>
            </Button>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-10">
          {children}
        </main>
      </div>
    );
  }

  if (isMemberArea) {
    return (
      <div className="member-dashboard-theme flex min-h-screen flex-col bg-white text-[#25201c]">
        <header className="sticky top-0 z-40 border-b border-[#efe8de] bg-white/92 shadow-[0_10px_32px_rgba(84,54,31,0.06)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1480px] flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
            <Link href="/member" className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f05a28] text-white shadow-[0_12px_24px_rgba(240,90,40,0.22)]">
                <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-semibold tracking-normal text-[#25201c]">{websiteIdentity.siteTitle}</span>
                <span className="block truncate text-xs font-medium text-[#8a7c70]">
                  {authUser?.fullName ? `Signed in as ${authUser.fullName}` : "Member portal"}
                </span>
              </span>
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="icon" className="relative border-[#efe3d6] bg-white text-[#25201c] shadow-sm hover:border-[#f6c7aa] hover:bg-[#fff7f0]" title="Notifications">
                <Link href="/member/notifications" aria-label={`Notifications${notificationCount ? `, ${notificationCount} new` : ""}`}>
                  <Bell className="h-4 w-4" aria-hidden="true" />
                  {notificationCount ? (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f05a28] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white" aria-hidden="true">
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </span>
                  ) : null}
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="border-[#efe3d6] bg-white text-[#25201c] shadow-sm hover:border-[#f6c7aa] hover:bg-[#fff7f0]">
                <Link href="/">
                  <Globe2 className="h-4 w-4" aria-hidden="true" />
                  Visit Website
                </Link>
              </Button>
              <LogoutButton redirectTo="/login" />
            </div>
          </div>
        </header>
        {notificationToast ? (
          <div className="fixed right-4 top-20 z-50 w-[min(92vw,380px)] rounded-2xl border border-[#f2dfcb] bg-white p-4 shadow-2xl shadow-black/15">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0dc] text-[#f05a28]">
                <Bell className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[#25201c]">{notificationToast.title}</p>
                <p className="mt-1 line-clamp-3 text-sm leading-6 text-[#5f5349]">{notificationToast.message}</p>
                <Link href={notificationToast.href} className="mt-2 inline-block text-sm font-semibold text-[#f05a28] hover:underline" onClick={() => setNotificationToast(null)}>
                  View update
                </Link>
              </div>
              <button type="button" className="rounded-lg p-1 text-[#8a7c70] hover:bg-[#fff7f0] hover:text-[#f05a28]" onClick={() => setNotificationToast(null)} aria-label="Close notification">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : null}
        <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-5 lg:px-6">{children}</main>
      </div>
    );
  }

  const navItems = websiteNav ?? fallbackWebsiteNav;
  const registrationItem = navItems.find(
    (item) => item.key === "registration" || item.href === "/register",
  );
  const loginItem = navItems.find(
    (item) => item.key === "login" || item.href === "/login",
  );
  const primaryNavItems = navItems.filter(
    (item) => item !== registrationItem && item !== loginItem,
  );
  const headerNavItems = primaryNavItems.filter((item) => headerNavKeys.has(item.key));
  const isAdminUser = Boolean(
    authUser &&
      (authUser.roles.includes("super-admin") ||
        authUser.roles.includes("admin") ||
        authUser.permissions.includes("admin:access")),
  );
  const isMember = Boolean(authUser?.permissions.includes("member:access") && !isAdminUser);
  const dashboardHref = isAdminUser ? "/admin" : "/member";
  const isSignedIn = Boolean(authUser);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_10px_35px_rgba(23,66,64,0.16)]">
        <div className="h-1 bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--terracotta)),hsl(var(--primary)))]" />
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="group flex min-w-0 items-center gap-3">
            {websiteIdentity.logoUrl ? (
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--terracotta)))] text-primary-foreground shadow-lg shadow-[hsl(var(--primary))]/15 ring-1 ring-[hsl(var(--cream))]/80 transition group-hover:-translate-y-0.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={websiteIdentity.logoUrl}
                  alt=""
                  className="h-9 w-9 rounded object-cover"
                />
                <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[hsl(var(--card))] bg-[hsl(var(--terracotta))]" />
              </span>
            ) : null}
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold leading-5 tracking-normal text-primary sm:text-base">
                {websiteIdentity.siteTitle}
              </span>
              <span className="block truncate text-[11px] font-semibold leading-4 text-foreground/70 sm:text-xs sm:leading-5">
                {websiteSubtitle}
              </span>
            </span>
          </Link>

          <nav
            className="public-nav hidden min-w-0 max-w-[54vw] items-center justify-center gap-1 overflow-x-auto whitespace-nowrap xl:flex"
            aria-label="Primary navigation"
          >
            {headerNavItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-semibold transition",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-primary/80 hover:bg-primary/5 hover:text-primary",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden shrink-0 items-center gap-2 xl:flex">
            {isSignedIn ? (
              <>
                <Button asChild size="sm" className="shadow-lg shadow-[hsl(var(--primary))]/10">
                  <Link href={dashboardHref}>
                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                    Dashboard
                  </Link>
                </Button>
                <LogoutButton redirectTo="/login" />
              </>
            ) : registrationItem ? (
              <Button
                asChild
                size="sm"
                className="shadow-lg shadow-[hsl(var(--primary))]/10"
              >
                <Link href={registrationItem.href}>
                  {registrationItem.label}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            ) : null}
            {!isSignedIn && loginItem ? (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-[hsl(var(--border))] bg-[hsl(var(--card))]/80 shadow-sm hover:bg-[hsl(var(--muted))]"
              >
                <Link href={loginItem.href}>
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  {loginItem.label}
                </Link>
              </Button>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2 xl:hidden">
            {isSignedIn ? (
              <Button asChild size="sm" className="h-10 px-3 shadow-lg shadow-[hsl(var(--primary))]/10">
                <Link href={dashboardHref}>
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  Dashboard
                </Link>
              </Button>
            ) : registrationItem ? (
              <Button asChild size="sm" className="h-9 px-3 shadow-lg shadow-[hsl(var(--primary))]/10">
                <Link href={registrationItem.href}>
                  <span className="hidden sm:inline">{registrationItem.label}</span>
                  <span className="sm:hidden">Join</span>
                </Link>
              </Button>
            ) : null}
            {!isSignedIn && loginItem ? (
              <Button
                asChild
                variant="outline"
                size="icon"
                className="h-9 w-9 border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm hover:bg-[hsl(var(--muted))]"
              >
                <Link href={loginItem.href} aria-label={loginItem.label}>
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            ) : null}
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-foreground shadow-sm transition hover:bg-[hsl(var(--muted))]"
              onClick={() => setMobileMenuOpen((value) => !value)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-[hsl(var(--border))]/80 bg-[hsl(var(--card))] shadow-[0_18px_35px_rgba(23,66,64,0.12)] xl:hidden">
            <nav
              className="mx-auto grid max-w-6xl gap-0.5 px-4 py-2"
              aria-label="Mobile navigation"
            >
              {(isSignedIn
                ? [
                    ...headerNavItems,
                    { key: "dashboard", href: dashboardHref, label: "Dashboard" }
                  ]
                : headerNavItems
              ).map((item) => {
                const active = isActivePath(pathname, item.href);
                const isAction =
                  item === registrationItem || item === loginItem;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-semibold transition",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/78 hover:bg-muted hover:text-foreground",
                      isAction && !active ? "border bg-card shadow-sm" : null,
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <span>{item.label}</span>
                    {item === loginItem ? (
                      <LogIn className="h-4 w-4" aria-hidden="true" />
                    ) : null}
                  </Link>
                );
              })}
              {isSignedIn ? (
                <div className="px-3 py-2">
                  <LogoutButton redirectTo="/login" />
                </div>
              ) : null}
            </nav>
          </div>
        ) : null}
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
      {isMember && !isMemberLogin ? <MemberFloatingChat /> : null}
      <footer className="border-t bg-[hsl(var(--primary))] text-[hsl(var(--cream))]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_0.55fr_0.65fr_0.9fr]">
          <div className="space-y-5">
            <Link href="/" className="flex items-center">
              <span>
                <span className="block text-base font-semibold leading-5">
                  {websiteIdentity.siteTitle}
                </span>
                <span className="text-xs font-medium text-white/55">
                  {websiteSubtitle}
                </span>
              </span>
            </Link>
            <p className="max-w-md text-sm leading-6 text-white/68">
              Connecting the graduates of the Department of Sociology, SUST
              through membership, notices, events, memories, and alumni
              collaboration.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Explore</p>
            <nav
              className="mt-4 grid gap-2 text-sm text-white/64"
              aria-label="Footer navigation"
            >
              {primaryNavItems
                .filter(
                  (item) =>
                    item.key !== "committees_current" &&
                    item.key !== "committees_previous",
                )
                .slice(0, 6)
                .map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="transition hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
            </nav>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Member Services</p>
            <div className="mt-4 grid gap-2 text-sm text-white/64">
              {isSignedIn ? (
                <Link href={dashboardHref} className="inline-flex items-center gap-2 transition hover:text-white">
                  Dashboard
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ) : (
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 transition hover:text-white"
                >
                  Become a member
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
              <Link href="/members" className="transition hover:text-white">
                Member Directory
              </Link>
              {isMember ? null : (
                <Link href="/login" className="transition hover:text-white">
                  Member Login
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-md border border-white/12 bg-white/[0.04] p-4 text-sm lg:justify-self-end">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
              Web &amp; System Sponsored By
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2">
              <a
                href="https://www.jsaimonlaw.co.uk/"
                target="_blank"
                rel="noreferrer"
                aria-label="Visit J Saimon Law Ltd. website"
                className="group inline-flex h-16 items-center justify-center rounded-md border border-white/16 bg-[hsl(var(--cream))] px-4 py-2 shadow-sm transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/sponsor-j-saimon-law.png"
                  alt="J Saimon Law Ltd."
                  className="h-11 w-full max-w-36 object-contain"
                />
              </a>
              <a
                href="https://www.sylhetregency.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="Visit Sylhet Regency Ltd. website"
                className="group inline-flex h-16 items-center justify-center rounded-md border border-white/16 bg-[hsl(var(--cream))] px-4 py-2 shadow-sm transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/sponsor-sylhet-regency.png"
                  alt="Sylhet Regency Ltd."
                  className="h-11 w-full max-w-32 object-contain"
                />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
            <p>
              &copy; {new Date().getFullYear()} {websiteIdentity.siteTitle}. All
              rights reserved.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link href="/notices" className="hover:text-white">
                Notices
              </Link>
              <Link href="/events" className="hover:text-white">
                Events
              </Link>
              <Link href="/donation" className="hover:text-white">
                Donation
              </Link>
              <span className="hidden h-3 w-px bg-white/20 sm:block" />
              <a
                href="https://techplus.dev/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-white"
              >
                Developed by Tech Plus
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
