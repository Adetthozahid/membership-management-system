import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Eye,
  Globe2,
  GraduationCap,
  HandHeart,
  Handshake,
  Lightbulb,
  Target,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type AboutOverviewSectionProps = {
  memberCount: number;
  organizationName: string;
  content?: AboutOverviewContent;
};

export type AboutContentItem = {
  label?: string;
  title?: string;
  body?: string;
  value?: string;
  icon?: string;
  href?: string;
};

export type AboutOverviewContent = {
  focusCards?: AboutContentItem[];
  overview?: {
    eyebrow?: string;
    title?: string;
    body?: string;
    bodySecondary?: string;
    imageUrl?: string;
    imageAlt?: string;
    primaryLabel?: string;
    primaryHref?: string;
    secondaryLabel?: string;
    secondaryHref?: string;
  };
  stats?: AboutContentItem[];
  valuesEyebrow?: string;
  values?: AboutContentItem[];
};

const iconMap: Record<string, LucideIcon> = {
  book: BookOpen,
  calendar: CalendarDays,
  check: CheckCircle2,
  eye: Eye,
  globe: Globe2,
  graduation: GraduationCap,
  heart: HandHeart,
  handshake: Handshake,
  idea: Lightbulb,
  target: Target,
  users: Users,
};

function iconFor(value: string | undefined, fallback: LucideIcon) {
  return value ? (iconMap[value] ?? fallback) : fallback;
}

const defaultFocusCards = [
  {
    title: "Our Mission",
    body: "To build a strong and supportive alumni community that fosters lifelong connections, professional growth, and gives back to the department and society.",
    icon: Target,
  },
  {
    title: "Our Vision",
    body: "To be a leading alumni network that empowers graduates to create positive impact and uphold the values of Sociology and SUST worldwide.",
    icon: Eye,
  },
  {
    title: "Our Purpose",
    body: "To connect alumni, encourage knowledge sharing, support current students, and contribute to the development of the Department of Sociology, SUST.",
    icon: Users,
  },
];

const defaultValues = [
  {
    title: "Unity",
    body: "Together we are stronger. We believe in the power of community.",
    icon: Handshake,
  },
  {
    title: "Integrity",
    body: "We uphold honesty, transparency, and accountability in everything we do.",
    icon: Lightbulb,
  },
  {
    title: "Excellence",
    body: "We strive for excellence in professional and personal endeavors.",
    icon: BookOpen,
  },
  {
    title: "Service",
    body: "We are committed to giving back to our alma mater and society.",
    icon: HandHeart,
  },
  {
    title: "Inclusivity",
    body: "We welcome and respect every alumni, regardless of location or background.",
    icon: Globe2,
  },
];

function formatCount(value: number) {
  if (value >= 1000) return `${Math.floor(value / 50) * 50}+`;
  if (value > 0) return `${value}+`;
  return "0";
}

export function AboutOverviewSection({
  memberCount,
  organizationName,
  content,
}: AboutOverviewSectionProps) {
  const focusCards = content?.focusCards?.length
    ? content.focusCards.map((card, index) => ({
        title: card.title ?? defaultFocusCards[index]?.title ?? "Focus",
        body: card.body ?? defaultFocusCards[index]?.body ?? "",
        icon: iconFor(card.icon, defaultFocusCards[index]?.icon ?? Target),
      }))
    : defaultFocusCards;
  const overview = {
    eyebrow: content?.overview?.eyebrow ?? "About the Association",
    title: content?.overview?.title ?? "Building Connections, Creating Impact",
    body:
      content?.overview?.body ??
      `The ${organizationName} is a voluntary, non-political and non-profit organization of proud graduates of the Department of Sociology, Shahjalal University of Science and Technology.`,
    bodySecondary:
      content?.overview?.bodySecondary ??
      "We aim to strengthen bonds among alumni, support the academic and professional journey of current students, and contribute to the advancement of the department and society at large.",
    imageUrl:
      content?.overview?.imageUrl ?? "/images/sust-slider-campus-building.jpg",
    imageAlt: content?.overview?.imageAlt ?? "SUST campus",
    primaryLabel: content?.overview?.primaryLabel ?? "Become a member",
    primaryHref: content?.overview?.primaryHref ?? "/register",
    secondaryLabel: content?.overview?.secondaryLabel ?? "View members",
    secondaryHref: content?.overview?.secondaryHref ?? "/members",
  };
  const defaultStats = [
    { label: "Alumni Members", value: formatCount(memberCount), icon: Users },
    { label: "Years of Journey", value: "15+", icon: GraduationCap },
    { label: "Events Organized", value: "50+", icon: HandHeart },
    { label: "Countries Connected", value: "10+", icon: Globe2 },
  ];
  const stats = content?.stats?.length
    ? content.stats.map((stat, index) => ({
        label: stat.title ?? stat.label ?? defaultStats[index]?.label ?? "Stat",
        value: stat.value ?? defaultStats[index]?.value ?? "0",
        icon: iconFor(stat.icon, defaultStats[index]?.icon ?? CheckCircle2),
      }))
    : defaultStats;
  const values = content?.values?.length
    ? content.values.map((value, index) => ({
        title: value.title ?? defaultValues[index]?.title ?? "Value",
        body: value.body ?? defaultValues[index]?.body ?? "",
        icon: iconFor(value.icon, defaultValues[index]?.icon ?? Handshake),
      }))
    : defaultValues;

  return (
    <section className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        {focusCards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.title}
              className="rounded-md border bg-card p-5 shadow-lg shadow-primary/5"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-serif text-xl font-semibold tracking-normal text-primary">
                    {card.title}
                  </h2>
                  <div className="mt-2 h-0.5 w-10 bg-[hsl(var(--terracotta))]" />
                </div>
              </div>
              <p className="mt-5 text-sm leading-6 text-muted-foreground">
                {card.body}
              </p>
            </article>
          );
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[hsl(var(--terracotta))]">
            {overview.eyebrow}
          </p>
          <h2 className="mt-3 max-w-md font-serif text-3xl font-semibold leading-tight tracking-normal text-primary">
            {overview.title}
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            {overview.body}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {overview.bodySecondary}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              asChild
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link href={overview.primaryHref}>
                {overview.primaryLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="text-primary hover:bg-primary/10 hover:text-primary"
            >
              <Link href={overview.secondaryHref}>
                {overview.secondaryLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-md border bg-primary shadow-xl shadow-primary/15">
          <div
            className="aspect-[1.72/1] bg-cover bg-center"
            style={{ backgroundImage: `url('${overview.imageUrl}')` }}
            aria-label={overview.imageAlt}
            role="img"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-md border bg-card p-3 shadow-sm sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`rounded-md border bg-[hsl(var(--cream))]/55 p-3 text-center shadow-sm lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none ${
                index === stats.length - 1 ? "lg:border-r-0" : ""
              }`}
            >
              <Icon className="mx-auto h-6 w-6 text-primary" aria-hidden="true" />
              <div className="mt-2">
                <p className="font-serif text-2xl font-semibold leading-none text-primary sm:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-[11px] font-semibold leading-4 text-muted-foreground sm:text-xs">
                  {stat.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary sm:text-sm">
            {content?.valuesEyebrow ?? "Our Values"}
          </p>
          <div
            className="mx-auto mt-3 flex max-w-44 items-center justify-center gap-2 text-[hsl(var(--terracotta))]"
            aria-hidden="true"
          >
            <span className="h-px flex-1 bg-[hsl(var(--terracotta))]/45" />
            <Handshake className="h-4 w-4" />
            <span className="h-px flex-1 bg-[hsl(var(--terracotta))]/45" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {values.map((value) => {
            const Icon = value.icon;
            return (
              <article key={value.title} className="rounded-md border bg-card p-3 text-center shadow-sm sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-14 sm:w-14">
                  <Icon className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
                </span>
                <h3 className="mt-2 font-serif text-base font-semibold tracking-normal text-primary sm:mt-3 sm:text-lg">
                  {value.title}
                </h3>
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground sm:mt-2 sm:text-xs">
                  {value.body}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
