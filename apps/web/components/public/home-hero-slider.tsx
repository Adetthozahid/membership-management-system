"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  QrCode,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HeroSlide = {
  id?: string;
  eyebrow: string;
  eyebrowIcon?: string | null;
  eyebrowVisible?: boolean | null;
  title: string;
  body: string;
  image: string;
  position: string;
  accent: string;
  primaryLabel?: string | null;
  primaryHref?: string | null;
  secondaryLabel?: string | null;
  secondaryHref?: string | null;
  tertiaryLabel?: string | null;
  tertiaryHref?: string | null;
};

type StatItem = {
  label: string;
  value: number;
  icon: "members" | "active" | "events";
};

const statIcons = {
  members: Users,
  active: BadgeCheck,
  events: CalendarDays,
};

const legacyEyebrowIcons: Record<string, string> = {
  graduation: "fa6-solid:graduation-cap",
  users: "fa6-solid:users",
  calendar: "fa6-solid:calendar-days",
  badge: "fa6-solid:circle-check",
  book: "fa6-solid:book-open",
  handshake: "fa6-solid:handshake",
  star: "fa6-solid:star",
  landmark: "fa6-solid:landmark",
  sparkles: "fa6-solid:wand-magic-sparkles",
};

type HomeHeroSliderProps = {
  slides: HeroSlide[];
  stats: StatItem[];
};

export function HomeHeroSlider({ slides, stats }: HomeHeroSliderProps) {
  const [active, setActive] = useState(0);
  const current = slides[active] ?? slides[0];
  const titleLines = current.title.split("|");
  const eyebrowIcon =
    current.eyebrowIcon === "none"
      ? null
      : legacyEyebrowIcons[current.eyebrowIcon || ""] || current.eyebrowIcon || "fa6-solid:graduation-cap";

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => {
      setActive((value) => (value + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const goToSlide = (nextIndex: number) => {
    setActive((nextIndex + slides.length) % slides.length);
  };
  const actions = [
    {
      label: current.primaryLabel || "Become a member",
      href: current.primaryHref || "/register",
      icon: ArrowRight,
      variant: "primary",
    },
    {
      label: current.secondaryLabel || "Find alumni",
      href: current.secondaryHref || "/members",
      icon: Search,
      variant: "outline",
    },
    {
      label: current.tertiaryLabel,
      href: current.tertiaryHref,
      icon: QrCode,
      variant: "outline",
    },
  ].flatMap((action) =>
    action.label?.trim() && action.href?.trim()
      ? [{ ...action, label: action.label.trim(), href: action.href.trim() }]
      : [],
  );

  return (
    <section className="relative left-1/2 right-1/2 -mx-[50vw] -mt-8 h-[clamp(500px,calc(100vh-72px),580px)] w-screen overflow-hidden bg-[hsl(var(--primary))] text-white sm:h-[clamp(520px,calc(100vh-72px),620px)] xl:h-[clamp(560px,calc(100vh-72px),680px)]">
      {slides.map((slide, index) => (
        <div
          key={slide.title}
          className={cn(
            "absolute inset-0 bg-cover transition-opacity duration-700 ease-out",
            index === active ? "opacity-100" : "opacity-0",
          )}
          style={{
            backgroundImage: `url('${slide.image}')`,
            backgroundPosition: slide.position,
          }}
          aria-hidden={index !== active}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--primary))] via-[hsl(var(--primary))]/88 to-[hsl(var(--primary))]/28" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_34%,hsl(var(--terracotta)/0.24),transparent_28%)]" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-background [clip-path:polygon(0_62%,100%_18%,100%_100%,0_100%)] sm:h-24" />

      <div className="relative mx-auto grid h-full max-w-6xl content-center gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10 lg:py-12">
        <div className="max-w-2xl space-y-5 lg:max-w-3xl">
          {current.eyebrowVisible !== false && current.eyebrow ? (
            <p className="inline-flex max-w-full items-center gap-2 rounded-md border border-white/18 bg-white/10 px-3 py-2 text-xs font-medium text-white/90 sm:text-sm">
              {eyebrowIcon ? <Icon icon={eyebrowIcon} className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
              {current.eyebrow}
            </p>
          ) : null}
          <div className="space-y-3 sm:space-y-4">
            <h1 className="max-w-3xl font-sans text-[clamp(1.9rem,4.2vw,3.1rem)] font-bold leading-[1.12] tracking-normal text-white">
              {titleLines.length > 1
                ? titleLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))
                : current.title}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-white/84 sm:text-lg">
              {current.body}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={`${action.label}-${action.href}`}
                  asChild
                  variant={action.variant === "outline" ? "outline" : "default"}
                  className={action.variant === "outline" ? "border-white/45 bg-transparent text-white hover:bg-white/10" : "bg-[hsl(var(--cream))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--cream))]/90"}
                >
                  <Link href={action.href}>
                    {action.variant !== "primary" ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
                    {action.label}
                    {action.variant === "primary" ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
                  </Link>
                </Button>
              );
            })}
          </div>
          <div className="flex items-center gap-3 pt-0">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/24 bg-white/10 text-white transition hover:bg-white/18 sm:h-10 sm:w-10"
              onClick={() => goToSlide(active - 1)}
              aria-label="Previous hero slide"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/24 bg-white/10 text-white transition hover:bg-white/18 sm:h-10 sm:w-10"
              onClick={() => goToSlide(active + 1)}
              aria-label="Next hero slide"
            >
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.title}
                  type="button"
                  className={cn(
                    "h-2.5 rounded-full transition-all",
                    index === active
                      ? "w-8 bg-white"
                      : "w-2.5 bg-white/40 hover:bg-white/70",
                  )}
                  onClick={() => goToSlide(index)}
                  aria-label={`Go to hero slide ${index + 1}`}
                  aria-current={index === active ? "true" : undefined}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="hidden max-w-2xl grid-cols-3 gap-3 sm:grid lg:max-w-none lg:grid-cols-1 lg:justify-self-end">
          {stats.map((item) => {
            const Icon = statIcons[item.icon];
            return (
              <div
                key={item.label}
                className="w-full rounded-md border border-white/18 bg-white/12 p-3 backdrop-blur sm:p-4 lg:w-60 lg:p-5"
              >
                <Icon
                  className="h-5 w-5 text-white/80 sm:h-6 sm:w-6"
                  aria-hidden="true"
                />
                <p className="mt-3 text-2xl font-semibold sm:text-3xl lg:mt-4 lg:text-4xl">
                  {item.value}
                </p>
                <p className="text-xs leading-4 text-white/74 sm:text-sm">
                  {item.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className={cn(
          "absolute bottom-24 right-8 hidden h-1 w-28 rounded-full lg:block",
          current.accent,
        )}
      />
    </section>
  );
}
