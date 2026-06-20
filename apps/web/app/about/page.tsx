import type { Metadata } from "next";
import { APP_NAME } from "@mms/shared";
import { Mail, MapPin, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  AboutContentItem,
  AboutOverviewContent,
} from "@/components/public/about-overview-section";
import { AboutOverviewSection } from "@/components/public/about-overview-section";
import { ManagedPageContent } from "@/components/public/managed-page-content";
import type { ServicesContent } from "@/components/public/services-section";
import { ServicesSection } from "@/components/public/services-section";
import { getPublicSite } from "@/lib/api";
import { getPublicPage } from "@/lib/api";

type WebsitePage = {
  title: string;
  layout: "standard" | "landing" | "sidebar" | "custom";
  metaTitle: string | null;
  metaDescription: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  body: string | null;
  contentBlocks: unknown;
};

type AboutBlock = {
  type?: string;
  key?: string;
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
  highlight?: string;
  highlightIcon?: string;
  ctaTitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  items?: AboutContentItem[];
};

const contactIconMap: Record<string, LucideIcon> = {
  email: Mail,
  mail: Mail,
  phone: Phone,
  address: MapPin,
  location: MapPin,
};

function blocksFrom(value: unknown): AboutBlock[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is AboutBlock => Boolean(item) && typeof item === "object",
      )
    : [];
}

function findBlock(blocks: AboutBlock[], ...types: string[]) {
  return blocks.find((block) => {
    const key = block.type ?? block.key;
    return key ? types.includes(key) : false;
  });
}

function itemsFrom(block?: AboutBlock) {
  return Array.isArray(block?.items) ? block.items : [];
}

async function getAboutPage() {
  return getPublicPage<WebsitePage>("about").catch(() => null);
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getAboutPage();
  return {
    title: page?.metaTitle ?? page?.title ?? "About",
    description:
      page?.metaDescription ??
      "About the organization and public membership portal.",
  };
}

export default async function AboutPage() {
  const [site, page] = await Promise.all([
    getPublicSite().catch(() => null),
    getAboutPage(),
  ]);
  const organization = site?.organization;
  const blocks = blocksFrom(page?.contentBlocks);
  const overviewBlock = findBlock(blocks, "aboutOverview", "overview");
  const valuesBlock = findBlock(blocks, "values", "aboutValues");
  const servicesBlock = findBlock(blocks, "services", "whatWeDo");
  const serviceStatsBlock = findBlock(blocks, "serviceStats", "servicesStats");
  const contactBlock = findBlock(blocks, "contact", "contactInfo");
  const events = site?.events.items.slice(0, 3) ?? [];
  const serviceStats = itemsFrom(serviceStatsBlock).length
    ? itemsFrom(serviceStatsBlock).map((item, index) => ({
        label: item.label ?? item.title ?? `Stat ${index + 1}`,
        value: item.value ?? 0,
      }))
    : [
        {
          label: "Public alumni records",
          value: site?.stats.membersTotal ?? 0,
        },
        { label: "Active members", value: site?.stats.activeMembers ?? 0 },
        { label: "Upcoming programs", value: events.length },
      ];
  const overviewContent: AboutOverviewContent = {
    focusCards: itemsFrom(findBlock(blocks, "focusCards", "missionVision")),
    overview: overviewBlock
      ? {
          eyebrow: overviewBlock.eyebrow,
          title: overviewBlock.title,
          body: overviewBlock.body,
          bodySecondary: overviewBlock.bodySecondary,
          imageUrl: overviewBlock.imageUrl,
          imageAlt: overviewBlock.imageAlt,
          primaryLabel: overviewBlock.primaryLabel,
          primaryHref: overviewBlock.primaryHref,
          secondaryLabel: overviewBlock.secondaryLabel,
          secondaryHref: overviewBlock.secondaryHref,
        }
      : undefined,
    stats: itemsFrom(findBlock(blocks, "stats", "aboutStats")),
    valuesEyebrow: valuesBlock?.eyebrow ?? valuesBlock?.title,
    values: itemsFrom(valuesBlock),
  };
  const servicesContent: ServicesContent = {
    eyebrow: servicesBlock?.eyebrow,
    title: servicesBlock?.title,
    body: servicesBlock?.body,
    highlight: servicesBlock?.highlight,
    highlightIcon: servicesBlock?.highlightIcon,
    imageUrl: servicesBlock?.imageUrl,
    ctaTitle: servicesBlock?.ctaTitle,
    ctaLabel: servicesBlock?.ctaLabel,
    ctaHref: servicesBlock?.ctaHref,
    directions: itemsFrom(servicesBlock),
  };
  const publicEmail = organization?.email ?? "info@sustsociologyalumni.com";
  const defaultContactItems = [
    {
      label: "Email",
      value: publicEmail,
      href: `mailto:${publicEmail}`,
      icon: Mail,
    },
    {
      label: "Phone",
      value: organization?.phone ?? "Not published",
      href: organization?.phone ? `tel:${organization.phone}` : null,
      icon: Phone,
    },
    {
      label: "Address",
      value: organization?.address ?? "Not published",
      href: null,
      icon: MapPin,
    },
  ];
  const contactItems = itemsFrom(contactBlock).length
    ? itemsFrom(contactBlock).map((item, index) => ({
        label:
          item.label ??
          item.title ??
          defaultContactItems[index]?.label ??
          "Contact",
        value:
          item.value ?? item.body ?? defaultContactItems[index]?.value ?? "",
        href: item.href ?? defaultContactItems[index]?.href ?? null,
        icon:
          contactIconMap[item.icon ?? ""] ??
          defaultContactItems[index]?.icon ??
          Mail,
      }))
    : defaultContactItems;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <ManagedPageContent
        page={page ? { ...page, contentBlocks: [] } : null}
        fallbackEyebrow="About"
        fallbackTitle={`Legacy and Purpose of ${organization?.name ?? APP_NAME}`}
        fallbackSubtitle={
          "A shared platform for Sociology graduates to preserve academic bonds, celebrate collective achievements, and strengthen lifelong alumni connection."
        }
      />
      <AboutOverviewSection
        memberCount={site?.stats.membersTotal ?? 0}
        organizationName={organization?.name ?? APP_NAME}
        content={overviewContent}
      />
      <ServicesSection stats={serviceStats} content={servicesContent} />
      <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-[linear-gradient(180deg,hsl(var(--cream)),hsl(var(--background)))] py-12">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-stretch">
          <div className="flex flex-col justify-center rounded-md bg-primary p-6 text-[hsl(var(--cream))] shadow-xl shadow-primary/15">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[hsl(var(--cream))]/70">
              {contactBlock?.eyebrow ?? "Contact"}
            </p>
            <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight tracking-normal">
              {contactBlock?.title ?? "Connect with the association"}
            </h2>
            <p className="mt-4 text-sm leading-7 text-[hsl(var(--cream))]/78">
              {contactBlock?.body ??
                "Reach out for membership, alumni records, association updates, or collaboration with the Sociology alumni community."}
            </p>
          </div>

          <dl className="grid gap-4 sm:grid-cols-3">
            {contactItems.map((item) => {
              const Icon = item.icon;
              const content = (
                <>
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <dt className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd className="mt-2 break-words text-base font-semibold leading-6 text-foreground">
                    {item.value}
                  </dd>
                </>
              );

              return item.href ? (
                <a
                  key={item.label}
                  href={item.href}
                  className="group rounded-md border bg-card p-5 shadow-lg shadow-primary/5 transition duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-xl"
                >
                  {content}
                </a>
              ) : (
                <div
                  key={item.label}
                  className="rounded-md border bg-card p-5 shadow-lg shadow-primary/5"
                >
                  {content}
                </div>
              );
            })}
          </dl>
        </div>
      </section>
    </div>
  );
}
