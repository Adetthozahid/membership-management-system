import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Handshake,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type ServicesSectionProps = {
  stats: Array<{
    label: string;
    value: number | string;
  }>;
  content?: ServicesContent;
};

export type ServicesContent = {
  eyebrow?: string;
  title?: string;
  body?: string;
  highlight?: string;
  highlightIcon?: string;
  imageUrl?: string;
  ctaTitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  directions?: Array<{
    title?: string;
    body?: string;
    href?: string;
    icon?: string;
  }>;
};

const iconMap: Record<string, LucideIcon> = {
  book: BookOpen,
  calendar: CalendarDays,
  handshake: Handshake,
  search: Search,
  shield: ShieldCheck,
  users: Users,
};

function iconFor(value: string | undefined, fallback: LucideIcon) {
  return value ? (iconMap[value] ?? fallback) : fallback;
}

const defaultDirections = [
  {
    title: "Membership",
    body: "Verified registration and member records for Sociology alumni.",
    href: "/register",
    icon: ShieldCheck,
  },
  {
    title: "Alumni Network",
    body: "Reconnect with classmates, seniors, juniors, and the department.",
    href: "/members",
    icon: Search,
  },
  {
    title: "Information Hub",
    body: "Notices, updates, resources, and association announcements.",
    href: "/notices",
    icon: BookOpen,
  },
  {
    title: "Events & Programs",
    body: "Reunions, discussions, academic collaboration, and community events.",
    href: "/events",
    icon: CalendarDays,
  },
];

export function ServicesSection({ stats, content }: ServicesSectionProps) {
  const directions = content?.directions?.length
    ? content.directions.map((item, index) => ({
        title: item.title ?? defaultDirections[index]?.title ?? "Service",
        body: item.body ?? defaultDirections[index]?.body ?? "",
        href: item.href ?? defaultDirections[index]?.href ?? "/",
        icon: iconFor(item.icon, defaultDirections[index]?.icon ?? Users),
      }))
    : defaultDirections;
  const eyebrow = content?.eyebrow ?? "What We Do";
  const title =
    content?.title ?? "Supporting Sociology alumni through focused services";
  const body =
    content?.body ??
    "Membership, connection, information, and programs brought together in one association platform.";
  const highlight =
    content?.highlight ??
    "Friendship, cooperation, and academic excellence for Sociology graduates.";
  const HighlightIcon = iconFor(content?.highlightIcon, Handshake);
  const imageUrl =
    content?.imageUrl ?? "/images/sust-slider-campus-building.webp";
  const ctaTitle = content?.ctaTitle ?? "Be a part of our journey";
  const ctaLabel = content?.ctaLabel ?? "Join the Association";
  const ctaHref = content?.ctaHref ?? "/register";

  return (
    <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden bg-[linear-gradient(135deg,hsl(var(--cream)),hsl(var(--card))_58%,hsl(var(--muted)))] py-14 sm:py-18">
      <div
        className="absolute inset-x-0 bottom-0 h-28 bg-[hsl(var(--primary))]"
        aria-hidden="true"
      />
      <div
        className="absolute left-[31%] top-8 hidden h-[82%] w-px bg-primary/20 lg:block"
        aria-hidden="true"
      />
      <div
        className="absolute left-[31%] top-20 hidden h-3 w-3 -translate-x-1/2 rounded-sm bg-primary lg:block"
        aria-hidden="true"
      />
      <div
        className="absolute left-[31%] top-1/2 hidden h-3 w-3 -translate-x-1/2 rounded-sm bg-[hsl(var(--terracotta))] lg:block"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.78fr_0.56fr_1.28fr] lg:items-center">
        <div className="services-copy-animate">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">
            {eyebrow}
          </p>
          <h2 className="mt-5 max-w-sm font-serif text-4xl font-semibold leading-tight tracking-normal text-primary sm:text-5xl">
            {title}
          </h2>
          <div className="mt-5 h-0.5 w-16 bg-[hsl(var(--terracotta))]" />
          <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
            {body}
          </p>
          <div className="mt-8 rounded-md bg-primary p-5 text-[hsl(var(--cream))] shadow-xl shadow-primary/15">
            <HighlightIcon
              className="h-7 w-7 text-[hsl(var(--terracotta))]"
              aria-hidden="true"
            />
            <p className="mt-4 text-lg font-semibold leading-7">{highlight}</p>
          </div>
        </div>

        <div
          className="relative hidden min-h-[520px] lg:block"
          aria-hidden="true"
        >
          <div className="services-visual-animate absolute left-1/2 top-8 h-[360px] w-[210px] -translate-x-1/2 overflow-hidden rounded-t-[110px] rounded-b-md border-8 border-[hsl(var(--card))] bg-primary shadow-2xl shadow-primary/20">
            <div
              className="h-full w-full bg-cover bg-center grayscale-[40%] sepia-[18%]"
              style={{ backgroundImage: `url('${imageUrl}')` }}
            />
            <div className="absolute inset-0 bg-primary/20" />
          </div>
          <div className="absolute left-6 top-28 h-24 w-24 border-l-[28px] border-t-[28px] border-[hsl(var(--terracotta))]" />
          <div className="absolute bottom-20 right-5 h-28 w-20 rounded-t-[48px] rounded-b-md bg-primary" />
          <div className="absolute bottom-16 left-10 h-8 w-36 bg-[hsl(var(--terracotta))]" />
          <div className="absolute bottom-24 left-20 h-24 w-24 border-l border-t border-primary/25" />
          <div className="absolute right-8 top-5 grid grid-cols-4 gap-2 opacity-60">
            {Array.from({ length: 16 }).map((_, dotIndex) => (
              <span key={dotIndex} className="h-1 w-1 rounded-sm bg-primary" />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {directions.map((item, index) => {
            const Icon = item.icon;
            const isTerracotta = index % 2 === 1;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="service-row-animate group grid min-h-[112px] grid-cols-[88px_1fr] overflow-hidden rounded-md bg-card shadow-xl shadow-primary/10 ring-1 ring-border transition duration-300 hover:-translate-y-1 hover:shadow-2xl sm:min-h-[118px] sm:grid-cols-[176px_1fr_76px]"
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <span
                  className={`relative flex items-center justify-center text-[hsl(var(--cream))] sm:justify-start sm:gap-4 sm:px-6 sm:[clip-path:polygon(0_0,86%_0,100%_50%,86%_100%,0_100%)] ${
                    isTerracotta ? "bg-[hsl(var(--terracotta))]" : "bg-primary"
                  }`}
                >
                  <span className="font-serif text-3xl font-semibold sm:text-4xl">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="absolute right-8 hidden h-16 w-16 items-center justify-center rounded-md border-2 border-[hsl(var(--card))]/85 bg-white/8 shadow-lg sm:flex">
                    <Icon className="h-7 w-7" aria-hidden="true" />
                  </span>
                </span>
                <span className="flex min-w-0 flex-col justify-center px-4 py-5 sm:px-6 sm:pl-8">
                  <span
                    className={`mb-2 flex h-9 w-9 items-center justify-center rounded-md sm:hidden ${
                      isTerracotta
                        ? "bg-[hsl(var(--terracotta))]/12 text-[hsl(var(--terracotta))]"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span
                    className={`font-serif text-2xl font-semibold tracking-normal ${
                      isTerracotta
                        ? "text-[hsl(var(--terracotta))]"
                        : "text-primary"
                    }`}
                  >
                    {item.title}
                  </span>
                  <span className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                    {item.body}
                  </span>
                </span>
                <span className="hidden items-center justify-center border-l sm:flex">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-md border transition group-hover:text-[hsl(var(--cream))] ${
                      isTerracotta
                        ? "text-[hsl(var(--terracotta))] group-hover:border-[hsl(var(--terracotta))] group-hover:bg-[hsl(var(--terracotta))]"
                        : "text-primary group-hover:border-primary group-hover:bg-primary"
                    }`}
                  >
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="relative mx-auto mt-12 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-5 rounded-md border border-[hsl(var(--cream))]/20 bg-primary px-6 py-7 text-[hsl(var(--cream))] shadow-2xl shadow-primary/25 lg:grid-cols-[1fr_1fr_1fr_1.15fr] lg:items-center">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-4 border-[hsl(var(--cream))]/22 lg:border-r"
            >
              <span className="text-4xl font-semibold">{stat.value}</span>
              <span className="text-sm leading-5 text-[hsl(var(--cream))]/78">
                {stat.label}
              </span>
            </div>
          ))}
          <div className="flex flex-col gap-4 lg:items-end">
            <p className="font-serif text-2xl text-[hsl(var(--cream))]">
              {ctaTitle}
            </p>
            <Button
              asChild
              className="w-fit bg-[hsl(var(--terracotta))] text-[hsl(var(--terracotta-foreground))] hover:bg-[hsl(var(--terracotta))]/90"
            >
              <Link href={ctaHref}>
                {ctaLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
