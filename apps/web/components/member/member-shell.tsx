"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BookOpenText, Globe2, History, IdCard, LayoutDashboard, Megaphone, Menu, MessageCircle, RefreshCw, UserRound, X } from "lucide-react";
import type { MemberProfileData, MemberRenewalData } from "@/components/member/member-data";
import { useMemberEndpoint } from "@/components/member/member-data";
import { ForcedPasswordChangeModal } from "@/components/member/forced-password-change-modal";
import { cn } from "@/lib/utils";

const memberNav = [
  { href: "/member", label: "Dashboard", icon: LayoutDashboard },
  { href: "/member/profile", label: "Profile", icon: UserRound },
  { href: "/member/renewal", label: "Membership", icon: RefreshCw, membershipOnly: true },
  { href: "/member/id-card", label: "ID Card", icon: IdCard },
  { href: "/member/chat", label: "Chat", icon: MessageCircle },
  { href: "/member/notifications", label: "Notifications", icon: Bell },
  { href: "/member/notices", label: "Notice", icon: Megaphone },
  { href: "/member/payments", label: "Payments", icon: History },
  { href: "/member/smritir-pata", label: "Smritir Pata", icon: BookOpenText }
];

export function MemberShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useMemberEndpoint<MemberProfileData>("/member/profile");
  const renewal = useMemberEndpoint<MemberRenewalData>("/member/renewal-summary");
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mustChangePassword = Boolean(profile.data?.mustChangePassword && !passwordChanged);
  const showMembership = Boolean(profile.data?.membershipType || renewal.data?.renewal.required || renewal.data?.chanda.required);
  const urlMemberId = profile.data?.memberId ?? profile.data?.id;
  const visibleNavItems = memberNav.filter((item) => !item.membershipOnly || showMembership);

  function memberHref(href: string) {
    if (!urlMemberId) return href;
    const params = new URLSearchParams();
    params.set("memberId", urlMemberId);
    return `${href}?${params.toString()}`;
  }

  useEffect(() => {
    if (!urlMemberId) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("memberId") === urlMemberId && !params.has("accountId")) return;
    params.delete("accountId");
    params.set("memberId", urlMemberId);
    router.replace(`${pathname}?${params.toString()}`);
  }, [urlMemberId, pathname, router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      {mustChangePassword ? (
        <ForcedPasswordChangeModal
          onChanged={() => {
            setPasswordChanged(true);
            window.location.assign("/member");
          }}
        />
      ) : null}
      <div className="grid gap-5 lg:grid-cols-[292px_minmax(0,1fr)]" aria-hidden={mustChangePassword ? true : undefined}>
        <div className="flex items-center justify-between rounded-[22px] border border-[#f2dfcb] bg-[#fff8ef] p-3 shadow-[0_12px_30px_rgba(116,80,45,0.08)] lg:hidden">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b66a3c]">Member Portal</p>
            <p className="truncate text-sm font-semibold text-[#25201c]">Dashboard navigation</p>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#f2dfcb] bg-white text-[#5f5349] shadow-sm transition hover:border-[#f6c7aa] hover:bg-[#fff7f0] hover:text-[#f05a28]"
            onClick={() => setMobileMenuOpen((value) => !value)}
            aria-label={mobileMenuOpen ? "Close member menu" : "Open member menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Member navigation">
            <button
              type="button"
              className="absolute inset-0 bg-[#25201c]/45 backdrop-blur-sm"
              aria-label="Close member menu"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="relative flex h-full w-[min(86vw,340px)] flex-col overflow-hidden border-r border-[#f2dfcb] bg-[#fff0dc] shadow-[24px_0_70px_rgba(84,54,31,0.22)]">
              <div className="flex items-center justify-between border-b border-[#f3dfc6]/80 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b66a3c]">Member Portal</p>
                  <p className="text-sm font-semibold text-[#25201c]">Membership menu</p>
                </div>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#f2dfcb] bg-white text-[#5f5349] transition hover:text-[#f05a28]"
                  aria-label="Close member menu"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <nav className="grid gap-1.5 overflow-y-auto p-4">
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = item.href === "/member" ? pathname === item.href : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={memberHref(item.href)}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition",
                        active ? "bg-white text-[#f05a28] shadow-sm" : "text-[#5f5349] hover:bg-white/70 hover:text-[#f05a28]"
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition", active ? "bg-[#fff0dc] text-[#f05a28]" : "bg-white/55 text-[#8a7c70] group-hover:bg-white group-hover:text-[#f05a28]")}>
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">{item.label}</span>
                    </Link>
                  );
                })}
                <Link href="/" className="mt-3 flex items-center gap-3 rounded-2xl border border-white/75 bg-white/55 px-3.5 py-3 text-sm font-semibold text-[#5f5349] shadow-sm transition hover:bg-white hover:text-[#f05a28]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#f05a28]">
                    <Globe2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span>Visit Website</span>
                </Link>
              </nav>
            </aside>
          </div>
        ) : null}

        <aside className="relative hidden overflow-hidden rounded-[28px] border border-[#f2dfcb] bg-[#fff0dc] shadow-[0_22px_60px_rgba(116,80,45,0.10)] lg:sticky lg:top-24 lg:block lg:self-start">
          <div className="pointer-events-none absolute -left-20 bottom-6 h-44 w-44 rounded-[44px] border-[30px] border-white/32" />
          <div className="pointer-events-none absolute -right-16 top-8 h-40 w-40 rotate-12 rounded-[34px] bg-white/28" />
          <div className="relative border-b border-[#f3dfc6]/80 p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#f05a28] shadow-sm">
                <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b66a3c]">Member Portal</p>
                <p className="mt-1 text-sm font-medium text-[#5f5349]">Manage your own membership record.</p>
              </span>
            </div>
          </div>
          <nav className="relative grid gap-1.5 p-4">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/member" ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={memberHref(item.href)}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition",
                    active ? "text-[#f05a28]" : "text-[#5f5349] hover:text-[#f05a28]"
                  )}
                >
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition", active ? "bg-white text-[#f05a28] shadow-sm" : "bg-white/55 text-[#8a7c70] group-hover:bg-white group-hover:text-[#f05a28]")}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">{item.label}</span>
                  {active ? <span className="absolute bottom-1.5 left-[58px] h-0.5 w-8 rounded-full bg-[#f05a28]" /> : null}
                </Link>
              );
            })}
            <Link href="/" className="mt-3 flex items-center gap-3 rounded-2xl border border-white/75 bg-white/55 px-3.5 py-3 text-sm font-semibold text-[#5f5349] shadow-sm transition hover:bg-white hover:text-[#f05a28]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#f05a28]">
                <Globe2 className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>Visit Website</span>
            </Link>
          </nav>
        </aside>
        <section className="min-w-0 rounded-[28px] bg-white/95 p-1 lg:p-2">
          <div className="min-h-[calc(100vh-132px)] rounded-[24px] bg-white p-1 lg:p-2">{children}</div>
        </section>
      </div>
      <footer className="mt-5 rounded-[22px] border border-[#f2dfcb] bg-white/90 px-4 py-3 text-xs font-medium text-[#5f5349] shadow-[0_10px_28px_rgba(116,80,45,0.06)] sm:flex sm:items-center sm:justify-between sm:gap-4">
        <p>© {new Date().getFullYear()} Sociology Alumni Association of SUST. All rights reserved.</p>
        <p className="mt-2 sm:mt-0">
          Developed by{" "}
          <Link href="https://techplus.dev/" className="font-semibold text-[#f05a28] hover:underline">
            Tech Plus
          </Link>
        </p>
      </footer>
    </>
  );
}
